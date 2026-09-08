import type { EcammInfo, EcammZoomState } from './ecamm-domain-types.js'

export function defaultZoomState(): EcammZoomState {
	return {
		inMeeting: false,
		muted: false,
		handRaised: false,
		camOn: false,
		cloudRecording: false,
		localRecording: false,
		recordingPaused: false,
		hosting: false,
	}
}

/** Pre-connection values, chosen so nothing reads as "on" before Ecamm has answered. */
export function defaultInfo(): EcammInfo {
	return {
		buttonLabel: '',
		pauseButtonLabel: '',
		currentSceneId: '',
		currentSceneOrigId: '',
		viewers: 0,
		mute: false,
		previewMode: false,
		hidingUi: false,
		liveDemo: false,
		volumes: {},
		mutes: {},
		zoom: defaultZoomState(),
		unmappedKeys: [],
	}
}
