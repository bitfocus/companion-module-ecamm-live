import { describe, expect, it, vi } from 'vitest'
import { EcammApi } from '../../src/ecamm-api/ecamm-api.js'
import { createMockInstance } from '../helpers/mock-instance.js'
import { installFetchMock } from '../helpers/mock-fetch.js'
import { fixtureText, loadFixture } from '../helpers/fixture.js'
import { parseSceneList } from '../../src/data-structures/ecamm-parsers.js'
import { UpdatePresets } from '../../src/presets.js'
import type { ModuleInstance } from '../../src/main.js'

/** The ids the fixed overlay presets are currently built against. */
function fixedOverlayIds(instance: ModuleInstance): string[] {
	UpdatePresets(instance)
	const calls = (instance.setPresetDefinitions as unknown as { mock: { calls: unknown[][] } }).mock.calls
	const presets = calls[calls.length - 1][0] as Record<
		string,
		{ steps: Array<{ down: Array<{ options: { id?: unknown } }> }> }
	>
	return Object.entries(presets)
		.filter(([id]) => id.startsWith('overlay_fixed_'))
		.map(([, preset]) => String(preset.steps[0].down[0].options.id))
}

/**
 * Ecamm only ever reports the overlays belonging to the live scene, so the moment the scene
 * changes the cached list describes the wrong scene. It has to be re-read, and the overlay
 * variables and dropdowns rebuilt from it.
 */
describe('refreshing overlays when the scene changes', () => {
	const SCENE_A = '8A1DB264-FD68-4B20-973D-62B051A87E0E'
	const SCENE_B = '6D68813C-3145-4999-B51C-718A997CAE46'

	function setup(config: Partial<{ pollOverlays: boolean }> = {}) {
		const info = loadFixture<Record<string, string>>('getInfo')
		let currentScene = SCENE_A

		// Ecamm reports only the live scene's overlays, so the mock has to as well - otherwise a
		// scene switch would look like a no-op to every signature comparison downstream.
		const overlaysForSceneB = JSON.stringify({
			items: [{ title: 'Lower third', UUID: 'SCENE-B-OVERLAY-1', Visible: false, Locked: false }],
		})

		const routes: Record<string, { body: string }> = {
			getConnectionStatus: { body: '["Allowed"]' },
			get getInfo() {
				return { body: JSON.stringify({ ...info, CurrentScene: currentScene }) }
			},
			getSceneList: { body: fixtureText('getSceneList') },
			get getOverlayList() {
				return { body: currentScene === SCENE_A ? fixtureText('getOverlayList') : overlaysForSceneB }
			},
			getInputs: { body: fixtureText('getInputs') },
			getVideoList: { body: fixtureText('getVideoList') },
			getSoundList: { body: fixtureText('getSoundList') },
			getAudioFilterList: { body: fixtureText('getAudioFilterList') },
			getProfileList: { body: fixtureText('getProfileList') },
			getChannels: { body: fixtureText('getChannels') },
			getCurrentMode: { body: fixtureText('getCurrentMode') },
			getDefaultCamera: { body: fixtureText('getDefaultCamera') },
		}

		const { calls } = installFetchMock(routes)
		const { instance } = createMockInstance({ config })
		const api = new EcammApi(instance)
		;(instance as unknown as { ecammApi: EcammApi }).ecammApi = api

		return { api, instance, calls, switchScene: () => (currentScene = SCENE_B) }
	}

	const overlayFetches = (calls: URL[]) => calls.filter((url) => url.pathname === '/getOverlayList').length

	it('reads the overlay list on connect even when polling is off', async () => {
		const { api, calls } = setup({ pollOverlays: false })
		await api.init()
		await api.destroy()

		// Otherwise the overlay slots would sit empty until something happened to change scene.
		expect(overlayFetches(calls)).toBeGreaterThanOrEqual(1)
		expect(api.state.overlays.length).toBeGreaterThan(0)
	})

	it('re-reads overlays when the scene changes, even with polling off', async () => {
		const { api, calls, switchScene } = setup({ pollOverlays: false })
		await api.init()

		const before = overlayFetches(calls)
		switchScene()
		await (api as unknown as { pollTick: (n: number) => Promise<void> }).pollTick(1)

		expect(overlayFetches(calls)).toBe(before + 1)
		expect(api.state.info.currentSceneId).toBe(SCENE_B)
		await api.destroy()
	})

	it('rebuilds the fixed overlay presets to match the new scene', async () => {
		const { api, instance, switchScene } = setup({ pollOverlays: false })
		await api.init()

		const before = fixedOverlayIds(instance)
		expect(before).toEqual(api.state.overlays.map((overlay) => overlay.id))

		const registerCalls = (instance.registerAll as unknown as { mock: { calls: unknown[] } }).mock.calls.length
		switchScene()
		await (api as unknown as { pollTick: (n: number) => Promise<void> }).pollTick(1)

		// Two halves of the same chain: the tick asked for a re-register (registerAll is a spy on
		// the mock instance, so it does not actually run), and re-registering now yields the new
		// scene's overlays rather than the old scene's.
		expect((instance.registerAll as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(
			registerCalls,
		)
		const after = fixedOverlayIds(instance)
		expect(after).not.toEqual(before)
		expect(after).toEqual(api.state.overlays.map((overlay) => overlay.id))
		await api.destroy()
	})

	it('does not re-read overlays on a tick where the scene did not move', async () => {
		const { api, calls } = setup({ pollOverlays: false })
		await api.init()

		const before = overlayFetches(calls)
		await (api as unknown as { pollTick: (n: number) => Promise<void> }).pollTick(1)

		// With polling off and a stable scene there is nothing to re-read.
		expect(overlayFetches(calls)).toBe(before)
		await api.destroy()
	})

	it('rebuilds definitions when the overlay list changes, which is what republishes the slots', async () => {
		const { api, instance } = setup({ pollOverlays: true })
		await api.init()

		const registerCalls = (instance.registerAll as unknown as { mock: { calls: unknown[] } }).mock.calls.length
		// Swapping the overlay list to a different scene's contents must re-register, because
		// dropdown choices and the overlay_NNN_* variables are captured at registration time.
		api.state.applyList('overlays', [{ id: 'other-scene-overlay', label: 'Elsewhere' }])
		await (api as unknown as { pollTick: (n: number) => Promise<void> }).pollTick(2)

		expect((instance.registerAll as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(
			registerCalls,
		)
		await api.destroy()
	})
})

/**
 * The point of this path is that it does not touch the poller. Every test here leaves the poller
 * stopped, so anything that happens has to have come from the immediate path.
 */
describe('the immediate path after a scene command', () => {
	const SCENE_A = '8A1DB264-FD68-4B20-973D-62B051A87E0E'
	const SCENE_B = '6D68813C-3145-4999-B51C-718A997CAE46'

	/** Routes with a controllable getCurrentScene, so a lagging switch can be simulated. */
	function setup(sceneReplies: string[]) {
		let call = 0
		const routes: Record<string, { body: string }> = {
			get getCurrentScene() {
				const id = sceneReplies[Math.min(call++, sceneReplies.length - 1)]
				return { body: JSON.stringify([id]) }
			},
			getOverlayList: { body: fixtureText('getOverlayList') },
			setScene: { body: 'Done' },
		}
		const { calls } = installFetchMock(routes)
		const { instance } = createMockInstance()
		const api = new EcammApi(instance)
		;(instance as unknown as { ecammApi: EcammApi }).ecammApi = api
		api.state.applyList('scenes', parseSceneList(loadFixture('getSceneList')))
		api.state.setCurrentScene(SCENE_A)
		return { api, instance, calls, sceneCalls: () => call }
	}

	const pathsOf = (calls: URL[]) => calls.map((url) => url.pathname)

	it('fetches overlays without any poll tick running', async () => {
		const { api, calls } = setup([SCENE_B])
		await api.applySceneChange({ expectedId: SCENE_B })

		// The poller was never started, so this can only have come from the direct path.
		expect(pathsOf(calls)).toEqual(['/getCurrentScene', '/getOverlayList'])
	})

	it('re-registers, so the fixed overlay presets follow the immediate path too', async () => {
		// setCurrentScene reports no definitions change of its own; this passes only because
		// applySceneChange pairs it with an overlay refetch.
		const { api, instance } = setup([SCENE_B])
		await api.applySceneChange({ expectedId: SCENE_B })

		expect(instance.registerAll).toHaveBeenCalled()
	})

	it('updates the scene tally from the same round trip', async () => {
		const { api } = setup([SCENE_B])
		await api.applySceneChange({ expectedId: SCENE_B })

		expect(api.state.info.currentSceneId).toBe(SCENE_B)
		expect(api.state.currentSceneName()).toBe('Speaker Stage')
		expect(api.state.sceneById(SCENE_B)?.current).toBe(true)
		expect(api.state.sceneById(SCENE_A)?.current).toBe(false)
	})

	it('retries while Ecamm still reports the old scene', async () => {
		// Two stale replies, then the switch lands.
		const { api, calls, sceneCalls } = setup([SCENE_A, SCENE_A, SCENE_B])
		await api.applySceneChange({ expectedId: SCENE_B })

		expect(sceneCalls()).toBe(3)
		expect(api.state.info.currentSceneId).toBe(SCENE_B)
		// Overlays are only read once the switch has actually been confirmed.
		expect(pathsOf(calls).filter((p) => p === '/getOverlayList')).toHaveLength(1)
	})

	it('keeps trying well past the measured switch time', async () => {
		// setScene is asynchronous - a real switch was measured at roughly 400ms, so confirmation
		// has to survive comfortably more attempts than that would need.
		const stale = Array.from({ length: 12 }, () => SCENE_A)
		const { api, sceneCalls } = setup([...stale, SCENE_B])

		await api.applySceneChange({ expectedId: SCENE_B })

		expect(sceneCalls()).toBe(13)
		expect(api.state.info.currentSceneId).toBe(SCENE_B)
	})

	it('settles on "any different scene" for next and previous', async () => {
		const { api, sceneCalls } = setup([SCENE_B])
		// No expectedId: the resulting scene is not known in advance.
		await api.applySceneChange()

		expect(sceneCalls()).toBe(1)
		expect(api.state.info.currentSceneId).toBe(SCENE_B)
	})

	it('gives up quietly rather than failing the command', async () => {
		// Ecamm never reports the switch; the command itself still succeeded.
		const { api, instance } = setup([SCENE_A])
		await expect(api.applySceneChange({ expectedId: SCENE_B })).resolves.toBeUndefined()
		expect(instance.log).not.toHaveBeenCalledWith('error', expect.anything())
	})

	it('discards an overlay reply that a newer request has superseded', async () => {
		const { instance } = createMockInstance()
		const api = new EcammApi(instance)
		;(instance as unknown as { ecammApi: EcammApi }).ecammApi = api

		const older = [{ id: 'from-old-scene', label: 'Stale' }]
		const newer = [{ id: 'from-new-scene', label: 'Fresh' }]
		let resolveOlder: (v: unknown) => void = () => {}

		let call = 0
		vi.spyOn(api.client, 'getOverlayList').mockImplementation(async () => {
			if (call++ === 0) return new Promise((resolve) => (resolveOlder = resolve)) as never
			return newer as never
		})

		const first = (api as unknown as { fetchAndApplyOverlays: () => Promise<unknown> }).fetchAndApplyOverlays()
		await (api as unknown as { fetchAndApplyOverlays: () => Promise<unknown> }).fetchAndApplyOverlays()
		resolveOlder(older)
		await first

		// The reply that started first arrived last; it must not overwrite the newer list.
		expect(api.state.overlays.map((o) => o.id)).toEqual(['from-new-scene'])
	})
})
