import { InstanceStatus } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { POLL_FLOOR_MS } from '../config.js'
import { ConnectionPermission } from '../data-structures/ecamm-enums.js'
import type { StateChangeSet } from '../data-structures/ecamm-domain-types.js'
import { emptyChangeSet, mergeChangeSets } from '../data-structures/ecamm-domain-types.js'
import { EcammClient } from './ecamm-client.js'
import { isAbortError, mapErrorToStatus, permissionToStatus } from './ecamm-errors.js'
import { EcammHttp } from './ecamm-http.js'
import { EcammPoller } from './ecamm-poller.js'
import { EcammState } from './ecamm-state.js'
import {
	DISCOVERY_WINDOW_MS,
	type DiscoverFn,
	discoverEcammInstances,
	matchInstance,
	splitHost,
} from './ecamm-discovery.js'

const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
import { FeedbackIdUtility } from '../feedbacks/feedback-utility.js'

const CLIENT_NAME = 'Bitfocus Companion'
const CLIENT_VERSION = '4.0.0'
const REQUEST_TIMEOUT_MS = 4000
const MAX_BACKOFF_MS = 30000

/**
 * How often, and for how long, to ask Ecamm which scene is live after requesting a switch.
 *
 * setScene is asynchronous: it returns in about 30 ms, but the scene has not changed yet, and
 * getOverlayList still returns the *previous* scene's overlays for a while afterwards. Measured
 * on a Mac Studio, the switch completes about 400 ms after the request, consistently.
 *
 * The timeout is therefore set well clear of that, since it costs nothing in the normal case -
 * the loop exits as soon as the switch lands - and a machine under load could easily take longer
 * than a tight bound would allow. getCurrentScene carries none of the rate-limit guidance that
 * getInfo does, so polling it briefly is free.
 */
/** How often to look for a moved Ecamm while disconnected. */
const REDISCOVER_INTERVAL_MS = 10000

const SCENE_CONFIRM_POLL_MS = 50
const SCENE_CONFIRM_TIMEOUT_MS = 2500

/** Every fifth tick (~10 s at the default cadence). */
const MEDIUM_TIER_EVERY = 5
/** Every fifteenth tick (~30 s at the default cadence). */
const SLOW_TIER_EVERY = 15

/**
 * Owns the connection: transport, device state, and the poll loop that keeps them in step.
 *
 * The instance is only reached through the thin update* wrappers on ModuleInstance, so this file
 * never imports an action, feedback or preset module and no import cycle is possible.
 */
export class EcammApi {
	readonly state = new EcammState()
	private readonly http: EcammHttp
	readonly client: EcammClient
	private readonly poller: EcammPoller
	/** Forces the slow tier on the next tick after something invalidates the lists. */
	private slowTierDue = true
	/** Increments per overlay request so a superseded reply can be discarded. */
	private overlayEpoch = 0
	/** Set when an immediate overlay read failed, so the next tick retries it. */
	private overlaysStale = false

	private rediscoverTimer: NodeJS.Timeout | undefined
	private rediscovering = false
	/** learnIdentity is attempted at most once per api instance; a browse is not cheap. */
	private identityLearned = false
	private readonly discover: DiscoverFn

	constructor(
		private readonly instance: ModuleInstance,
		options: { discover?: DiscoverFn } = {},
	) {
		this.discover = options.discover ?? discoverEcammInstances
		this.http = new EcammHttp({
			host: instance.config.ecammHost,
			uuid: instance.config.uuid,
			clientName: CLIENT_NAME,
			clientVersion: CLIENT_VERSION,
			deviceName: instance.deviceName,
			timeoutMs: REQUEST_TIMEOUT_MS,
			log: (level, message) => instance.log(level, message),
			verbose: instance.config.verboseLogging === true,
		})
		this.state.host = instance.config.ecammHost
		this.client = new EcammClient(this.http)
		this.poller = new EcammPoller({
			intervalMs: this.pollInterval(),
			floorMs: POLL_FLOOR_MS,
			maxBackoffMs: MAX_BACKOFF_MS,
			run: async (tick) => this.pollTick(tick),
			onFailure: (error, failures) => this.handlePollFailure(error, failures),
			onRecovered: () => this.handleRecovery(),
		})
	}

	/**
	 * Ecamm ignores an unapproved client, so permission is established before anything else and
	 * the user is told precisely what to do about it.
	 */
	async init(): Promise<void> {
		await this.connect()
		this.poller.start()
	}

	/**
	 * Establishes the connection and brings every cached list up to date.
	 *
	 * Shared by startup and by rediscovery, so the two cannot drift. Rediscovery in particular
	 * must come through here rather than just scheduling a poll tick: a relaunched Ecamm can have
	 * forgotten this client, and an unapproved getInfo answers with an empty `{}` rather than an
	 * error, which would leave the module looking connected while holding nothing.
	 *
	 * @returns whether the connection is established and approved.
	 */
	private async connect(): Promise<boolean> {
		try {
			this.state.permission = await this.client.getConnectionStatus()

			if (this.state.permission === ConnectionPermission.NotFound) {
				// Register straight away so the approval prompt appears as soon as the connection
				// is saved, rather than up to one poll interval later.
				await this.requestRegistration()
				this.state.permission = await this.client.getConnectionStatus()
			}
		} catch (error) {
			this.reportError(error)
			// The caller still polls: the usual cause is Ecamm not being up yet, and the poller's
			// backoff reconnects on its own once it is.
			return false
		}

		const report = permissionToStatus(this.state.permission, this.http.host)
		this.instance.updateStatus(report.status, report.message || undefined)

		if (this.state.permission !== ConnectionPermission.Allowed) {
			// A pending client becomes allowed the moment a human clicks approve, which the poll
			// loop notices without the user having to touch Companion.
			return false
		}

		this.state.connected = true
		// Everything, not just the status: after a restart the scenes, overlays and sounds can
		// all have changed, and registerAll republishes the dropdowns and slot variables built
		// from them. Leaving it to the poller would mean a tick of stale lists first.
		await this.refreshAll()
		this.instance.registerAll()
		// Not awaited: a browse costs three seconds, and nothing here depends on the result.
		void this.learnIdentity()
		this.instance.log('info', `Connected to Ecamm Live at ${this.http.host}`)
		this.instance.updateStatus(InstanceStatus.Ok)
		return true
	}

	/**
	 * Works out which machine we are actually talking to, so a future restart can be followed even
	 * if the Mac's address has changed too.
	 *
	 * Companion's Bonjour picker hands back an address and a port and nothing else - the mDNS
	 * hostname is discarded before it reaches the module - so the only way to recover the machine's
	 * identity is to browse once ourselves and match what we are connected on. Address plus port is
	 * unambiguous; the port alone is the fallback for a configuration holding an address Bonjour
	 * never advertised, since ephemeral ports are effectively unique at any moment. An ambiguous
	 * match records nothing: reconnecting to somebody else's Mac later would be far worse.
	 */
	private async learnIdentity(): Promise<void> {
		if (this.identityLearned || this.instance.config.ecammHostname) return
		// Latched so a Bonjour-blocked network does not pay for a browse on every reconnect.
		this.identityLearned = true

		const { address, port } = splitHost(this.http.host)
		if (port === undefined) return

		try {
			const found = await this.discover(DISCOVERY_WINDOW_MS)
			const exact = found.filter((item) => item.port === port && item.addresses.includes(address))
			const candidates = exact.length > 0 ? exact : found.filter((item) => item.port === port)
			if (candidates.length !== 1) return

			const match = candidates[0]
			this.instance.log('debug', `Recognised ${this.http.host} as ${match.hostname}`)
			this.instance.persistDiscoveredHost(this.http.host, match.hostname, match.name)
		} catch (error) {
			if (this.instance.config.verboseLogging) {
				this.instance.log('debug', `Discovery failed: ${String(error)}`)
			}
		}
	}

	async destroy(): Promise<void> {
		this.stopRediscovery()
		this.poller.stop()
		this.http.abortAll()
		this.state.connected = false
		this.checkConnectionFeedbacks()
	}

	/** Applies a changed poll interval without tearing down the connection. */
	retime(): void {
		this.poller.retime(this.pollInterval())
	}

	/** Called after a command so its effect shows up without waiting a whole interval. */
	requestFastRefresh(): void {
		this.poller.requestFastRefresh()
	}

	/**
	 * Brings the module in line with a scene switch straight away, without waiting for a poll.
	 *
	 * Overlays belong to whichever scene is live, so the cached list is wrong the instant the
	 * scene changes. Going through the poller would mean waiting out the getInfo floor - up to two
	 * seconds - before even starting to look. Nothing requires that: the two-second guidance in
	 * Ecamm's documentation applies to getInfo alone, and neither getCurrentScene nor
	 * getOverlayList carries it.
	 *
	 * @param expectedId the scene we asked for, when we know it. Next/previous do not, so those
	 * settle for "any scene other than the one that was live".
	 */
	async applySceneChange(options: { expectedId?: string } = {}): Promise<void> {
		const previousId = this.state.info.currentSceneId

		try {
			const liveId = await this.confirmSceneChange(previousId, options.expectedId)
			let changes = this.state.setCurrentScene(liveId)
			changes = mergeChangeSets(changes, await this.fetchAndApplyOverlays())
			this.applyChanges(changes)
		} catch (error) {
			// The switch itself already succeeded, so this must not be reported as a failed
			// command. Mark the overlays stale instead and let the next tick pick them up.
			this.overlaysStale = true
			if (!isAbortError(error)) {
				this.instance.log('warn', `Could not refresh overlays after the scene change: ${String(error)}`)
			}
		}
	}

	/**
	 * Polls getCurrentScene briefly until the switch has visibly landed.
	 *
	 * Reading overlays before Ecamm has finished switching would cache the previous scene's
	 * overlays, which is the exact failure this whole path exists to avoid.
	 */
	private async confirmSceneChange(previousId: string, expectedId?: string): Promise<string> {
		const deadline = Date.now() + SCENE_CONFIRM_TIMEOUT_MS
		let liveId = previousId
		let first = true

		while (first || Date.now() < deadline) {
			if (!first) await sleep(SCENE_CONFIRM_POLL_MS)
			first = false

			liveId = await this.client.getCurrentScene()
			const settled = expectedId ? liveId === expectedId : liveId !== previousId
			if (settled) return liveId
		}

		// Never confirmed - use whatever Ecamm last reported and let the poll correct it.
		this.overlaysStale = true
		return liveId
	}

	/**
	 * The single place overlays are read.
	 *
	 * A poll tick can be midway through its own request when a scene change starts one. Tagging
	 * each request means the older reply is dropped rather than overwriting the newer list with
	 * the previous scene's overlays.
	 */
	private async fetchAndApplyOverlays(): Promise<StateChangeSet> {
		const epoch = ++this.overlayEpoch
		try {
			const overlays = await this.client.getOverlayList()
			if (epoch !== this.overlayEpoch) return emptyChangeSet()
			this.overlaysStale = false
			return this.state.applyList('overlays', overlays)
		} catch (error) {
			this.overlaysStale = true
			throw error
		}
	}

	/** Marks the structural lists stale, e.g. after switching profile. */
	invalidateLists(): void {
		this.slowTierDue = true
		this.poller.requestFastRefresh()
	}

	private pollInterval(): number {
		// Clamped here as well as in the config field, because an imported configuration bypasses
		// the field's minimum.
		return Math.max(POLL_FLOOR_MS, this.instance.config.pollInterval || POLL_FLOOR_MS)
	}

	private async pollTick(tickCount: number): Promise<void> {
		if (this.state.permission !== ConnectionPermission.Allowed) {
			await this.recheckPermission()
			return
		}

		let changes = emptyChangeSet()

		const previousSceneId = this.state.info.currentSceneId
		changes = mergeChangeSets(changes, this.state.applyInfo(await this.client.getInfo()))
		const sceneChanged = this.state.info.currentSceneId !== previousSceneId

		// Overlays belong to whichever scene is live, so a scene change invalidates the whole list.
		// It is re-read here, after the new scene has been confirmed by getInfo rather than when
		// the switch was requested, so the answer cannot race the switch itself.
		//
		// This happens even when overlay polling is turned off: that setting is about not paying
		// for a request every tick, not about tolerating a list that is known to be wrong. It also
		// covers scene changes this module did not make - next/previous, or someone clicking in
		// Ecamm directly.
		if (this.instance.config.pollOverlays || sceneChanged || this.overlaysStale) {
			changes = mergeChangeSets(changes, await this.fetchAndApplyOverlays())
		}

		if (tickCount % MEDIUM_TIER_EVERY === 0) {
			changes = mergeChangeSets(changes, this.state.setSourceMode(await this.client.getCurrentMode()))
			changes = mergeChangeSets(changes, this.state.setDefaultCamera(await this.client.getDefaultCamera()))
		}

		const slowTierDue = this.slowTierDue || tickCount % SLOW_TIER_EVERY === 0
		if (slowTierDue) {
			this.slowTierDue = false
			changes = mergeChangeSets(changes, await this.refreshLists())
		}

		this.reportUnmappedKeys()
		this.applyChanges(changes)
	}

	/**
	 * While unapproved, the only useful request is the permission check itself; polling anything
	 * else would just accumulate rejections.
	 */
	private async recheckPermission(): Promise<void> {
		if (this.state.permission === ConnectionPermission.NotFound) {
			await this.requestRegistration()
		}

		const permission = await this.client.getConnectionStatus()
		if (permission === this.state.permission) return

		this.state.permission = permission
		this.checkConnectionFeedbacks()
		const report = permissionToStatus(permission, this.http.host)
		this.instance.updateStatus(report.status, report.message || undefined)

		if (permission === ConnectionPermission.Allowed) {
			this.instance.log('info', `Ecamm Live at ${this.http.host} approved this client`)
			this.state.connected = true
			await this.refreshAll()
			this.instance.registerAll()
			this.instance.updateStatus(InstanceStatus.Ok)
		}
	}

	/**
	 * Makes Ecamm Live list this client so a human can approve it.
	 *
	 * getConnectionStatus only inspects Ecamm's permission table; it never adds to it, and answers
	 * "Not Found" indefinitely for a client Ecamm has never heard from. It is an actual data
	 * request that causes Ecamm to create the pending entry and raise its approval prompt, so
	 * polling the status alone would wait forever for a dialog that is never shown.
	 *
	 * Only sent while the permission is "Not Found". A client that was explicitly denied must not
	 * keep poking the user.
	 */
	private async requestRegistration(): Promise<void> {
		try {
			await this.client.getInfo()
		} catch {
			// Expected while unapproved - the side effect is the point, not the response.
		}
	}

	private async refreshAll(): Promise<void> {
		this.state.applyInfo(await this.client.getInfo())
		await this.refreshLists()
		this.state.setSourceMode(await this.client.getCurrentMode())
		this.state.setDefaultCamera(await this.client.getDefaultCamera())
		// Read once on connect regardless of the polling setting, so the overlay slots and
		// dropdowns are populated from the start rather than staying empty until a scene change.
		await this.fetchAndApplyOverlays()
		this.reportUnmappedKeys()
	}

	/**
	 * allSettled rather than all: an Ecamm build that does not implement one of these should cost
	 * that single list, not the whole refresh.
	 */
	private async refreshLists(): Promise<StateChangeSet> {
		const [scenes, cameras, videos, sounds, audioFilters, profiles, channels] = await Promise.allSettled([
			this.client.getSceneList(),
			this.client.getInputs(),
			this.client.getVideoList(),
			this.client.getSoundList(),
			this.client.getAudioFilterList(),
			this.client.getProfileList(),
			this.client.getChannels(),
		])

		let changes = emptyChangeSet()
		if (scenes.status === 'fulfilled') changes = mergeChangeSets(changes, this.state.applyList('scenes', scenes.value))
		if (cameras.status === 'fulfilled')
			changes = mergeChangeSets(changes, this.state.applyList('cameras', cameras.value))
		if (videos.status === 'fulfilled') changes = mergeChangeSets(changes, this.state.applyList('videos', videos.value))
		if (sounds.status === 'fulfilled') {
			changes = mergeChangeSets(changes, this.state.applyList('sounds', sounds.value.sounds))
			changes = mergeChangeSets(changes, this.state.applyList('soundFolders', sounds.value.folders))
		}
		if (audioFilters.status === 'fulfilled')
			changes = mergeChangeSets(changes, this.state.applyList('audioFilters', audioFilters.value))
		if (profiles.status === 'fulfilled')
			changes = mergeChangeSets(changes, this.state.applyList('profiles', profiles.value))
		if (channels.status === 'fulfilled')
			changes = mergeChangeSets(changes, this.state.applyList('channels', channels.value))
		return changes
	}

	/**
	 * A changed list means every dropdown built from it is stale, and Companion only re-reads
	 * choices when definitions are registered again - so that case rebuilds everything, while the
	 * common case of a moved value stays cheap.
	 */
	private applyChanges(changes: StateChangeSet): void {
		if (changes.definitions) {
			// registerAll re-checks every feedback anyway, since their options were rebuilt.
			this.instance.registerAll()
			return
		}
		if (!changes.values) return

		this.instance.updateVariableValues()

		// Only the feedbacks whose inputs actually moved. A tick where nothing a feedback reads
		// has changed - the common case - costs no callbacks at all.
		if (changes.feedbacks.size > 0) {
			this.instance.checkFeedbacks(...changes.feedbacks)
		}
	}

	private startRediscovery(): void {
		if (this.rediscoverTimer) return
		this.rediscoverTimer = setTimeout(() => void this.rediscoverTick(), REDISCOVER_INTERVAL_MS)
	}

	private stopRediscovery(): void {
		if (this.rediscoverTimer) clearTimeout(this.rediscoverTimer)
		this.rediscoverTimer = undefined
	}

	/**
	 * Self-rescheduling, like the poller: the next attempt is only booked once this one has
	 * settled, so a slow browse cannot stack up.
	 */
	private async rediscoverTick(): Promise<void> {
		this.rediscoverTimer = undefined
		if (this.rediscovering) return

		this.rediscovering = true
		try {
			await this.attemptRediscovery()
		} catch (error) {
			// A blocked multicast network is not worth shouting about on every attempt.
			if (this.instance.config.verboseLogging) {
				this.instance.log('debug', `Discovery failed: ${String(error)}`)
			}
		} finally {
			this.rediscovering = false
			// Only keep looking while still disconnected.
			if (!this.state.connected) this.startRediscovery()
		}
	}

	/**
	 * Looks for the machine this connection belongs to and follows it to its new address.
	 *
	 * Matching prefers the hostname recorded when the device was picked, because Ecamm's Bonjour
	 * instance names collide - every install is "Ecamm Live Remote" - and the address can change
	 * too. Without a match nothing happens: reconnecting to somebody else's Mac would be far
	 * worse than staying down.
	 */
	private async attemptRediscovery(): Promise<void> {
		const current = splitHost(this.instance.config.ecammHost)
		const found = await this.discover(DISCOVERY_WINDOW_MS)

		const match = matchInstance(found, {
			hostname: this.instance.config.ecammHostname,
			address: current.address,
		})
		if (!match) return

		// Prefer the address already configured if the machine still answers on it, so a
		// multi-homed Mac is not silently moved onto a different interface.
		const address = match.addresses.includes(current.address) ? current.address : match.addresses[0]
		const nextHost = `${address}:${match.port}`
		if (nextHost === this.http.host) return

		this.instance.log('info', `Ecamm Live moved to ${nextHost}, reconnecting`)
		this.http.setHost(nextHost)
		this.state.host = nextHost
		this.instance.persistDiscoveredHost(nextHost, match.hostname, match.name)

		// A full connect, not just a poll tick: re-checks permission in case the relaunched Ecamm
		// forgot this client, and refreshes every list so the recovered connection is correct
		// immediately rather than after the slow tier comes round.
		if (await this.connect()) this.stopRediscovery()
	}

	/** The connection feedbacks are driven by fields no change set covers. */
	private checkConnectionFeedbacks(): void {
		this.instance.checkFeedbacks(FeedbackIdUtility.connectionOk, FeedbackIdUtility.awaitingApproval)
	}

	private reportUnmappedKeys(): void {
		const keys = this.state.takeUnreportedKeys()
		if (keys.length > 0) {
			this.instance.log(
				'debug',
				`Ecamm Live reported fields this module does not use: ${keys.join(', ')}. ` +
					'Please open an issue if any of these would be useful.',
			)
		}
	}

	private handlePollFailure(error: unknown, failures: number): void {
		if (isAbortError(error)) return
		this.state.connected = false
		this.checkConnectionFeedbacks()
		// Ecamm may simply have moved to a new port. Look for it on its own cadence rather than
		// the poller's, which backs off to 30s and would make reconnection feel broken.
		this.startRediscovery()

		// Logged on the first failure, then again only at milestones: a Mac that is asleep should
		// not fill the log with one identical line every couple of seconds.
		if (failures === 1 || failures === 10 || failures === 60 || this.instance.config.verboseLogging) {
			this.reportError(error)
		}
	}

	private handleRecovery(): void {
		this.stopRediscovery()
		this.instance.log('info', 'Reconnected to Ecamm Live')
		this.state.connected = true
		this.checkConnectionFeedbacks()
		this.state.lastError = undefined
		this.instance.updateStatus(InstanceStatus.Ok)
		// Anything could have changed while the connection was down.
		this.slowTierDue = true
	}

	private reportError(error: unknown): void {
		const report = mapErrorToStatus(error, this.http.host)
		this.state.lastError = report.message
		this.instance.log('warn', report.message)
		this.instance.updateStatus(report.status, report.message)
	}
}
