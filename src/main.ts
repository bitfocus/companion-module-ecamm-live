import { InstanceBase, InstanceStatus, runEntrypoint, type SomeCompanionConfigField } from '@companion-module/base'
import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
import { GetConfigFields, type ModuleConfig, normalizeConfig } from './config.js'
import { EcammApi } from './ecamm-api/ecamm-api.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { initVariableDefinitions } from './variables/variable-definitions.js'
import { resetVariableValueCache, updateVariableValues } from './variables/variable-values.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	/** Seeded from the normalizer so the defaults have exactly one definition, in config.ts. */
	config: ModuleConfig = normalizeConfig(undefined)
	ecammApi: EcammApi | undefined
	/** Sent as EcammLive-DeviceName so the entry in Ecamm's approval list is recognisable. */
	readonly deviceName = hostname()

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = normalizeConfig(config)

		// Identifies this installation in Ecamm's Remote Control list. It has to survive
		// restarts, otherwise Ecamm treats every launch as a brand new client and the user is
		// asked to approve Companion again.
		if (!this.config.uuid) {
			this.config.uuid = randomUUID()
			this.saveConfig(this.config)
		}

		if (!this.config.ecammHost) {
			this.updateStatus(InstanceStatus.BadConfig, 'Pick an Ecamm Live machine in this connection’s settings')
			return
		}

		this.updateStatus(InstanceStatus.Connecting)
		this.ecammApi = new EcammApi(this)
		// Definitions are registered up front so the action and feedback pickers are populated
		// even while the connection is still pending approval.
		this.registerAll()
		await this.ecammApi.init()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	/**
	 * Records an address the module found for itself, without provoking a reconnect.
	 *
	 * configUpdated decides whether to rebuild by comparing against this.config, so updating it
	 * in place *before* saving makes that comparison false and skips the rebuild. That is what we
	 * want here: the api has already been pointed at the new address, and tearing it down to
	 * recreate it with the address it is already using would drop the connection we just fixed.
	 */
	persistDiscoveredHost(host: string, discoveredHostname: string, serviceName?: string): void {
		this.config.ecammHost = host
		if (discoveredHostname) this.config.ecammHostname = discoveredHostname
		if (serviceName) this.config.ecammServiceName = serviceName
		this.saveConfig(this.config)
	}

	/**
	 * Only a changed host warrants a reconnect. Rebuilding on every save would also fire when
	 * init() persists the generated uuid, which would loop.
	 */
	async configUpdated(config: ModuleConfig): Promise<void> {
		const next = normalizeConfig(config)

		const hostChanged = next.ecammHost !== this.config.ecammHost
		if (hostChanged) {
			// Anything reaching here is a human editing the picker: the module's own port-follow
			// goes through persistDiscoveredHost, which updates this.config first so the comparison
			// above is false. So the machine we learned is no longer the one we were asked for -
			// keeping it would let rediscovery follow the *old* Mac back. The api relearns it on
			// its next successful connect.
			next.ecammHostname = ''
			next.ecammServiceName = ''
		}

		const verbosityChanged = next.verboseLogging !== this.config.verboseLogging
		const intervalChanged = next.pollInterval !== this.config.pollInterval
		this.config = next

		if (hostChanged || verbosityChanged) {
			// Verbosity is captured by the transport at construction, so it needs a rebuild too.
			await this.ecammApi?.destroy()
			this.ecammApi = undefined
			await this.init(next)
			return
		}

		if (intervalChanged) this.ecammApi?.retime()
		this.registerAll()
	}

	async destroy(): Promise<void> {
		await this.ecammApi?.destroy()
		this.ecammApi = undefined
	}

	/**
	 * Re-registers everything. Required whenever a device list changes, because Companion copies
	 * a dropdown's choices at registration time and will not pick up new entries otherwise.
	 */
	registerAll(): void {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdatePresets(this)
		initVariableDefinitions(this)
		// Re-declaring definitions clears Companion's values, so the next write must be complete
		// rather than a diff against what was sent before.
		resetVariableValueCache(this)
		updateVariableValues(this)
		this.checkFeedbacks()
	}

	updateVariableValues(): void {
		updateVariableValues(this)
	}
}

runEntrypoint(ModuleInstance, [])
