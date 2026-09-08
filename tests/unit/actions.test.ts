import { describe, expect, it, vi } from 'vitest'
import type { CompanionActionDefinition } from '@companion-module/base'
import { GetActionsScene } from '../../src/actions/action-scene.js'
import { GetActionsOverlay } from '../../src/actions/action-overlay.js'
import { GetActionsAudio } from '../../src/actions/action-audio.js'
import { GetActionsSource } from '../../src/actions/action-source.js'
import { GetActionsProfile } from '../../src/actions/action-profile.js'
import { ActionIdScene } from '../../src/actions/action-scene.js'
import { ActionIdOverlay } from '../../src/actions/action-overlay.js'
import { ActionIdAudio } from '../../src/actions/action-audio.js'
import { ActionIdSource } from '../../src/actions/action-source.js'
import { ActionIdProfile } from '../../src/actions/action-profile.js'
import { AudioBus, SourceMode } from '../../src/data-structures/ecamm-enums.js'
import { createMockInstance, mockContext } from '../helpers/mock-instance.js'
import { populatedState } from '../helpers/populated-state.js'

/** Invokes a definition's callback with a fake event. */
async function fire(definition: CompanionActionDefinition | undefined, options: Record<string, unknown> = {}) {
	await (definition as unknown as { callback: (e: unknown, c: unknown) => Promise<void> }).callback(
		{ options },
		mockContext(),
	)
}

describe('scene actions', () => {
	it('sends the selected scene id', async () => {
		const mock = createMockInstance({ state: populatedState() })
		const actions = GetActionsScene(mock.instance)

		await fire(actions[ActionIdScene.setScene], { id: 'scene-9' })
		expect(mock.client.setScene).toHaveBeenCalledWith('scene-9')
	})

	it('pulls the next poll forward so the button updates promptly', async () => {
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsScene(mock.instance)[ActionIdScene.setScene], { id: 'scene-9' })
		expect(mock.requestFastRefresh).toHaveBeenCalled()
	})

	it('warns instead of sending an empty id', async () => {
		const mock = createMockInstance()
		await fire(GetActionsScene(mock.instance)[ActionIdScene.setScene], { id: '' })

		expect(mock.client.setScene).not.toHaveBeenCalled()
		expect(mock.instance.log).toHaveBeenCalledWith('warn', expect.stringContaining('nothing selected'))
	})

	it('resolves a scene by its name', async () => {
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsScene(mock.instance)[ActionIdScene.setSceneByName], { name: 'Speaker Stage' })
		expect(mock.client.setScene).toHaveBeenCalledWith('6D68813C-3145-4999-B51C-718A997CAE46')
	})

	it('warns when no scene has that name', async () => {
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsScene(mock.instance)[ActionIdScene.setSceneByName], { name: 'Nope' })

		expect(mock.client.setScene).not.toHaveBeenCalled()
		expect(mock.instance.log).toHaveBeenCalledWith('warn', expect.stringContaining('no scene called'))
	})

	it('reports a failed command rather than swallowing it', async () => {
		const mock = createMockInstance({ state: populatedState() })
		vi.mocked(mock.client.setNext).mockRejectedValueOnce(new Error('boom'))

		// Previously these were fire-and-forget, so a failure became an unhandled rejection.
		await fire(GetActionsScene(mock.instance)[ActionIdScene.nextScene])
		expect(mock.instance.log).toHaveBeenCalledWith('error', expect.stringContaining('boom'))
	})
})

describe('actions that previously ignored their own options', () => {
	it('setMode sends the mode', async () => {
		const mock = createMockInstance()
		await fire(GetActionsSource(mock.instance)[ActionIdSource.setMode], { mode: SourceMode.Screen })
		expect(mock.client.setMode).toHaveBeenCalledWith(SourceMode.Screen)
	})

	it('toggleOverlay sends the overlay id', async () => {
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsOverlay(mock.instance)[ActionIdOverlay.toggleOverlay], { id: 'ov-7' })
		expect(mock.client.setOverlay).toHaveBeenCalledWith('ov-7')
	})

	it('toggleMute sends the chosen bus', async () => {
		const mock = createMockInstance()
		await fire(GetActionsAudio(mock.instance)[ActionIdAudio.toggleMute], { bus: AudioBus.Movie })
		expect(mock.client.setMute).toHaveBeenCalledWith(AudioBus.Movie)
	})

	it('toggleMute falls back to the main mute for a button saved before the bus option', async () => {
		// Those buttons carry no options at all. Defaulting to a bus would silently repoint them:
		// Ecamm tracks the main mute separately from every bus.
		const mock = createMockInstance()
		await fire(GetActionsAudio(mock.instance)[ActionIdAudio.toggleMute], {})
		expect(mock.client.setMute).toHaveBeenCalledWith(undefined)
	})

	it('reads nothing back itself, leaving the tally to the status payload', async () => {
		// There is no per-bus read any more: getInfo reports every bus the machine has, and
		// runCommand's fast refresh re-runs it. A getVolume here would be a request for nothing.
		const mock = createMockInstance()
		const actions = GetActionsAudio(mock.instance)

		await fire(actions[ActionIdAudio.toggleMute], { bus: AudioBus.Movie })
		await fire(actions[ActionIdAudio.setVolume], { bus: AudioBus.Zoom, volume: 42 })
		expect(mock.client.getVolume).not.toHaveBeenCalled()
	})

	it('setVolume sends both the bus and the level', async () => {
		const mock = createMockInstance()
		await fire(GetActionsAudio(mock.instance)[ActionIdAudio.setVolume], { bus: AudioBus.Movie, volume: 42 })
		expect(mock.client.setVolume).toHaveBeenCalledWith(AudioBus.Movie, 42)
	})

	it('clamps an out-of-range volume', async () => {
		const mock = createMockInstance()
		const actions = GetActionsAudio(mock.instance)

		await fire(actions[ActionIdAudio.setVolume], { bus: AudioBus.Mic, volume: 250 })
		expect(mock.client.setVolume).toHaveBeenCalledWith(AudioBus.Mic, 100)

		await fire(actions[ActionIdAudio.setVolume], { bus: AudioBus.Mic, volume: -30 })
		expect(mock.client.setVolume).toHaveBeenCalledWith(AudioBus.Mic, 0)
	})
})

describe('adjust volume', () => {
	it('reads the level first so it is correct for un-polled buses', async () => {
		const mock = createMockInstance()
		vi.mocked(mock.client.getVolume).mockResolvedValueOnce(40)

		await fire(GetActionsAudio(mock.instance)[ActionIdAudio.adjustVolume], { bus: AudioBus.Mic, delta: 15 })

		expect(mock.client.getVolume).toHaveBeenCalledWith(AudioBus.Mic)
		expect(mock.client.setVolume).toHaveBeenCalledWith(AudioBus.Mic, 55)
	})

	it('does nothing when Ecamm reports no level for the bus', async () => {
		const mock = createMockInstance()
		vi.mocked(mock.client.getVolume).mockResolvedValueOnce(undefined)

		await fire(GetActionsAudio(mock.instance)[ActionIdAudio.adjustVolume], { bus: AudioBus.Guest4, delta: 5 })

		expect(mock.client.setVolume).not.toHaveBeenCalled()
		expect(mock.instance.log).toHaveBeenCalledWith('warn', expect.stringContaining('did not report'))
	})
})

describe('profile actions', () => {
	it('invalidates every cached list, because a profile brings its own', async () => {
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsProfile(mock.instance)[ActionIdProfile.setProfile], { id: 'p-2' })

		expect(mock.client.setProfile).toHaveBeenCalledWith('p-2')
		expect(mock.invalidateLists).toHaveBeenCalled()
	})
})

describe('switching to a scene by name', () => {
	it('matches the bare title', async () => {
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsScene(mock.instance)[ActionIdScene.setSceneByName], { name: 'New Scene' })
		expect(mock.client.setScene).toHaveBeenCalledWith('33F22C16-1224-484D-9B0E-5095D671D018')
	})

	it('also matches the qualified form shown in the dropdown', async () => {
		// Someone copying a name out of the picker gets "New Group - New Scene".
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsScene(mock.instance)[ActionIdScene.setSceneByName], { name: 'New Group - New Scene' })
		expect(mock.client.setScene).toHaveBeenCalledWith('33F22C16-1224-484D-9B0E-5095D671D018')
	})
})
