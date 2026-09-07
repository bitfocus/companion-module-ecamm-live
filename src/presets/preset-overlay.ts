import { ActionIdOverlay } from '../actions/action-overlay.js'
import { ColorBlack, ColorWhite } from '../feedbacks/feedback-utils.js'
import type { CompanionPresetExt } from './preset-utils.js'

export enum PresetIdOverlay {
	showComment = 'overlay_showComment',
	hideComment = 'overlay_hideComment',
}

/** Static comment-overlay controls. Per-slot toggles come from buildSlotPresets in presets.ts. */
export function GetPresetsOverlay(): {
	[id in PresetIdOverlay]: CompanionPresetExt | undefined
} {
	const presets: { [id in PresetIdOverlay]: CompanionPresetExt | undefined } = {
		[PresetIdOverlay.showComment]: {
			type: 'button',
			category: 'Overlays',
			name: 'Show most recent comment',
			style: { text: 'Show\\nComment', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdOverlay.showComment, options: {} }], up: [] }],
			feedbacks: [],
		},

		[PresetIdOverlay.hideComment]: {
			type: 'button',
			category: 'Overlays',
			name: 'Hide most recent comment',
			style: { text: 'Hide\\nComment', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdOverlay.hideComment, options: {} }], up: [] }],
			feedbacks: [],
		},
	}

	return presets
}
