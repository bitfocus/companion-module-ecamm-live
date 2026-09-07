import { ActionIdBroadcast } from '../actions/action-broadcast.js'
import { FeedbackIdBroadcast } from '../feedbacks/feedback-broadcast.js'
import { ColorBlack, ColorGreen, ColorRed, ColorWhite } from '../feedbacks/feedback-utils.js'
import type { CompanionPresetExt } from './preset-utils.js'

export enum PresetIdBroadcast {
	startStop = 'broadcast_startStop',
	pause = 'broadcast_pause',
	newRecording = 'broadcast_newRecording',
	viewers = 'broadcast_viewers',
}

export function GetPresetsBroadcast(): {
	[id in PresetIdBroadcast]: CompanionPresetExt | undefined
} {
	return {
		[PresetIdBroadcast.startStop]: {
			type: 'button',
			category: 'Broadcast',
			name: 'Start / stop, showing Ecamm’s own button label',
			style: { text: `$(ecamm-live:button_label)`, size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdBroadcast.clickButton, options: {} }], up: [] }],
			feedbacks: [
				{
					feedbackId: FeedbackIdBroadcast.isBroadcasting,
					options: {},
					style: { color: ColorWhite, bgcolor: ColorRed },
				},
			],
		},

		[PresetIdBroadcast.pause]: {
			type: 'button',
			category: 'Broadcast',
			name: 'Pause / resume',
			style: { text: `$(ecamm-live:pause_button_label)`, size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdBroadcast.clickPauseButton, options: {} }], up: [] }],
			feedbacks: [
				{ feedbackId: FeedbackIdBroadcast.isPaused, options: {}, style: { color: ColorBlack, bgcolor: ColorGreen } },
			],
		},

		[PresetIdBroadcast.newRecording]: {
			type: 'button',
			category: 'Broadcast',
			name: 'Start a new recording',
			style: { text: 'New\\nRec', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdBroadcast.startNewRecording, options: {} }], up: [] }],
			feedbacks: [],
		},

		[PresetIdBroadcast.viewers]: {
			type: 'button',
			// Display only, but it belongs with the broadcast controls: the count only means
			// anything while you are live, which is what the rest of this category is for.
			category: 'Broadcast',
			name: 'Viewer count',
			style: { text: `Viewers\\n$(ecamm-live:viewers)`, size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [], up: [] }],
			feedbacks: [
				{
					feedbackId: FeedbackIdBroadcast.viewersAtOrAbove,
					options: { threshold: 1 },
					style: { color: ColorBlack, bgcolor: ColorGreen },
				},
			],
		},
	}
}
