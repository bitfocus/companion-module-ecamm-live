import { vi } from 'vitest'
import type { ModuleConfig } from '../../src/config.js'
import type { EcammClient } from '../../src/ecamm-api/ecamm-client.js'
import { EcammState } from '../../src/ecamm-api/ecamm-state.js'
import type { ModuleInstance } from '../../src/main.js'

/** Every write method on the client, stubbed. Reads are added per-test where needed. */
function createMockClient(): EcammClient {
	const names = [
		'setScene',
		'setNext',
		'setPrev',
		'setInput',
		'setMode',
		'setVideo',
		'setPIP',
		'setOverlay',
		'setMute',
		'setVolume',
		'setAudioFilter',
		'setSound',
		'setSoundVolume',
		'setSoundStop',
		'setSoundPause',
		'setPreviewMode',
		'setPublish',
		'setProfile',
		'setLiveDemo',
		'setHideShowUI',
		'setClickButton',
		'setClickPauseButton',
		'setStartNewRecording',
		'setComment',
		'setShowComment',
		'setHideComment',
		'setMarker',
		'setZoomNew',
		'setZoomLeave',
		'setZoomPanel',
		'setZoomVideo',
		'setZoomAudio',
		'setZoomMuteAll',
		'setZoomRaiseHand',
		'setZoomFullScreen',
		'setZoomCloudRecord',
		'setZoomLocalRecord',
		'setZoomPauseRecord',
		'setZoomPrevGallery',
		'setZoomNextGallery',
		'setZoomGallerySpeaker',
		'setSpotlightSelf',
		'raw',
	]
	const client: Record<string, unknown> = {}
	for (const name of names) client[name] = vi.fn(async () => undefined)
	client.getVolume = vi.fn(async () => 50)
	return client as unknown as EcammClient
}

export interface MockInstance {
	instance: ModuleInstance
	state: EcammState
	client: EcammClient
	requestFastRefresh: ReturnType<typeof vi.fn>
	invalidateLists: ReturnType<typeof vi.fn>
	applySceneChange: ReturnType<typeof vi.fn>
}

/**
 * A stand-in for the module instance.
 *
 * The state is a real EcammState rather than a literal, so tests exercise the actual change
 * detection instead of a simplified copy of it. Only the transport is faked.
 */
export function createMockInstance(
	overrides: { state?: EcammState | Partial<EcammState>; config?: Partial<ModuleConfig> } = {},
): MockInstance {
	// A real EcammState is used as-is rather than copied, so a test can keep mutating the same
	// object it passed in and have the instance observe those changes.
	const state =
		overrides.state instanceof EcammState ? overrides.state : Object.assign(new EcammState(), overrides.state)
	const client = createMockClient()
	const requestFastRefresh = vi.fn()
	const invalidateLists = vi.fn()
	const applySceneChange = vi.fn(async () => undefined)

	const instance = {
		config: {
			ecammHost: '127.0.0.1:1234',
			ecammHostname: '',
			ecammServiceName: '',
			uuid: 'test-uuid',
			pollInterval: 2000,
			pollOverlays: true,
			verboseLogging: false,
			...overrides.config,
		},
		deviceName: 'test-device',
		ecammApi: { state, client, requestFastRefresh, invalidateLists, applySceneChange },
		log: vi.fn(),
		updateStatus: vi.fn(),
		saveConfig: vi.fn(),
		checkFeedbacks: vi.fn(),
		setVariableValues: vi.fn(),
		setVariableDefinitions: vi.fn(),
		setActionDefinitions: vi.fn(),
		setFeedbackDefinitions: vi.fn(),
		setPresetDefinitions: vi.fn(),
		parseVariablesInString: vi.fn(async (s: string) => s),
		registerAll: vi.fn(),
		persistDiscoveredHost: vi.fn(),
		updateVariableValues: vi.fn(),
	} as unknown as ModuleInstance

	return { instance, state, client, requestFastRefresh, invalidateLists, applySceneChange }
}

/**
 * Stand-in for the context object Companion passes as a callback's second argument.
 *
 * Nothing in the module calls its parseVariablesInString any more - Companion substitutes
 * variables in useVariables textinputs itself, and records the referenced ids so feedbacks still
 * re-evaluate. It is kept here only so the tests invoke callbacks with the real arity.
 */
export function mockContext(): { parseVariablesInString: (s: string) => Promise<string> } {
	return { parseVariablesInString: async (s: string) => s }
}
