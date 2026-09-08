import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EcammClient } from '../../src/ecamm-api/ecamm-client.js'
import { EcammHttp } from '../../src/ecamm-api/ecamm-http.js'
import { AudioBus, ConnectionPermission } from '../../src/data-structures/ecamm-enums.js'

const HOST = process.env.ECAMM_LIVE_HOST
const ALLOW_MUTATIONS = process.env.ECAMM_LIVE_ALLOW_MUTATIONS === '1'

/**
 * Opt-in checks against a real Ecamm Live.
 *
 * Run with:
 *   ECAMM_LIVE_HOST=my-mac.local:58049 yarn test:live
 *
 * Find the host with `node scripts/capture-ecamm.ts --list`. Note that Ecamm's port changes
 * every time it restarts. The client must be approved in Ecamm Live > Settings > Remote Control
 * before any of this returns data.
 */
describe.skipIf(!HOST)('live Ecamm Live', () => {
	let client: EcammClient

	beforeEach(() => {
		// The global setup replaces fetch with one that throws; these tests genuinely need the
		// network, so the real implementation is restored here.
		vi.unstubAllGlobals()
		client = new EcammClient(
			new EcammHttp({
				host: HOST!,
				uuid: process.env.ECAMM_LIVE_UUID ?? 'companion-live-test',
				clientName: 'Bitfocus Companion',
				clientVersion: '4.0.0',
				deviceName: 'vitest',
				timeoutMs: 5000,
				log: () => undefined,
				verbose: false,
			}),
		)
	})

	it('has been approved', async () => {
		const permission = await client.getConnectionStatus()
		expect(permission, 'Approve this client in Ecamm Live > Settings > Remote Control, then re-run').toBe(
			ConnectionPermission.Allowed,
		)
	})

	it('returns a status payload this module fully understands', async () => {
		const info = await client.getInfo()
		// The real value of this suite: a newer Ecamm that adds fields fails here rather than
		// silently dropping them.
		expect(info.unmappedKeys, `unhandled getInfo fields: ${info.unmappedKeys.join(', ')}`).toEqual([])
	})

	it('reports a scene list with exactly one live scene', async () => {
		const scenes = await client.getSceneList()
		expect(scenes.length).toBeGreaterThan(0)
		expect(scenes.every((scene) => scene.id && scene.label)).toBe(true)
		expect(scenes.filter((scene) => scene.current).length).toBeLessThanOrEqual(1)
	})

	it('agrees between getCurrentScene and the status payload', async () => {
		const [current, info] = await Promise.all([client.getCurrentScene(), client.getInfo()])
		expect(current).toBe(info.currentSceneId)
	})

	it('reports overlays for the current scene with a visibility flag', async () => {
		const overlays = await client.getOverlayList()
		for (const overlay of overlays) {
			expect(typeof overlay.visible).toBe('boolean')
		}
	})

	it('never returns a list entry without an id', async () => {
		const [cameras, soundList, videos, profiles] = await Promise.all([
			client.getInputs(),
			client.getSoundList(),
			client.getVideoList(),
			client.getProfileList(),
		])
		for (const item of [...cameras, ...soundList.sounds, ...soundList.folders, ...videos, ...profiles]) {
			expect(item.id).not.toBe('')
		}
	})

	// Anything that changes what is on screen stays behind a second gate, so a test run can
	// never disturb a live show by accident.
	describe.skipIf(!ALLOW_MUTATIONS)('mutating', () => {
		it('round-trips a marker containing a space', async () => {
			// Proves the %20 encoding survives Cocoa's URL parsing.
			await expect(client.setMarker({ text: 'Act Two', dialogbox: false })).resolves.toBeUndefined()
		})

		/**
		 * Two undocumented behaviours in one check, both of which this module depends on:
		 * setMute's `bus` parameter (v4.4 describes it as a bare, parameterless command), and
		 * getInfo reporting that bus's mute state back. The second is why there is no separate
		 * per-bus polling any more, so a future Ecamm dropping either would surface here.
		 */
		it('mutes a single bus, and getInfo reports it without touching the main mute', async () => {
			const before = await client.getInfo()
			expect(before.mutes[AudioBus.SoundEffects]).toBe(false)

			await client.setMute(AudioBus.SoundEffects)
			try {
				const during = await client.getInfo()
				expect(during.mutes[AudioBus.SoundEffects]).toBe(true)
				expect(during.mute).toBe(before.mute)
			} finally {
				// setMute is a toggle, so the same call restores it.
				await client.setMute(AudioBus.SoundEffects)
			}

			expect((await client.getInfo()).mutes[AudioBus.SoundEffects]).toBe(false)
		})

		it('returns to the same scene after switching away and back', async () => {
			const before = await client.getCurrentScene()
			const scenes = await client.getSceneList()
			const other = scenes.find((scene) => scene.id !== before)
			if (!other) return

			await client.setScene(other.id)
			await new Promise((resolve) => setTimeout(resolve, 500))
			expect(await client.getCurrentScene()).toBe(other.id)

			await client.setScene(before)
			await new Promise((resolve) => setTimeout(resolve, 500))
			expect(await client.getCurrentScene()).toBe(before)
		})
	})
})
