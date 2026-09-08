import { ActionIdPreview } from '../actions/action-preview.js'
import { ActionIdSource } from '../actions/action-source.js'
import { ActionIdUtility } from '../actions/action-utility.js'
import { FeedbackIdUtility } from '../feedbacks/feedback-utility.js'
import { ColorBlack, ColorGreen, ColorOrange, ColorRed, ColorWhite } from '../feedbacks/feedback-utils.js'
import type { CompanionPresetExt } from './preset-utils.js'

export enum PresetIdUtility {
	previewMode = 'utility_previewMode',
	publish = 'utility_publish',
	togglePip = 'utility_togglePip',
	liveDemo = 'utility_liveDemo',
	connection = 'utility_connection',
}

export function GetPresetsUtility(): {
	[id in PresetIdUtility]: CompanionPresetExt | undefined
} {
	return {
		[PresetIdUtility.previewMode]: {
			type: 'button',
			category: 'User Interface',
			name: 'Toggle preview mode',
			style: { text: 'Preview', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdPreview.togglePreviewMode, options: {} }], up: [] }],
			feedbacks: [
				{
					feedbackId: FeedbackIdUtility.previewModeActive,
					options: {},
					style: { color: ColorWhite, bgcolor: ColorRed },
				},
			],
		},

		[PresetIdUtility.publish]: {
			type: 'button',
			category: 'User Interface',
			name: 'Publish preview',
			style: { text: 'Publish', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdPreview.publishPreview, options: {} }], up: [] }],
			feedbacks: [],
		},

		[PresetIdUtility.togglePip]: {
			type: 'button',
			category: 'User Interface',
			name: 'Toggle PIP',
			style: { text: 'PIP', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdSource.togglePip, options: {} }], up: [] }],
			feedbacks: [],
		},

		[PresetIdUtility.liveDemo]: {
			type: 'button',
			category: 'User Interface',
			name: 'Toggle Live Demo mode',
			style: { text: 'Live\\nDemo', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdUtility.toggleLiveDemo, options: {} }], up: [] }],
			feedbacks: [
				{
					feedbackId: FeedbackIdUtility.liveDemoActive,
					options: {},
					style: { color: ColorWhite, bgcolor: ColorRed },
				},
			],
		},

		[PresetIdUtility.connection]: {
			type: 'button',
			// Display only - grouped with the other read-only buttons rather than the controls.
			category: 'Status',
			// Shows amber while Ecamm is waiting for someone to approve Companion.
			name: 'Connection status',
			style: { text: `Ecamm\\n$(ecamm-live:connection_status)`, size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [], up: [] }],
			feedbacks: [
				{
					feedbackId: FeedbackIdUtility.connectionOk,
					options: {},
					style: { color: ColorWhite, bgcolor: ColorGreen },
				},
				{
					feedbackId: FeedbackIdUtility.awaitingApproval,
					options: {},
					style: { color: ColorBlack, bgcolor: ColorOrange },
				},
			],
		},
	}
}
