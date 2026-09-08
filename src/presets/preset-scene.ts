import { ActionIdScene } from '../actions/action-scene.js'
import { ColorBlack, ColorWhite } from '../feedbacks/feedback-utils.js'
import type { CompanionPresetExt } from './preset-utils.js'

export enum PresetIdScene {
	nextScene = 'scene_next',
	prevScene = 'scene_prev',
}

/** Static scene controls. Per-slot switch buttons come from buildSlotPresets in presets.ts. */
export function GetPresetsScene(): {
	[id in PresetIdScene]: CompanionPresetExt | undefined
} {
	const presets: { [id in PresetIdScene]: CompanionPresetExt | undefined } = {
		[PresetIdScene.nextScene]: {
			type: 'button',
			category: 'Scenes',
			name: 'Next scene',
			style: { text: 'Next\\nScene', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdScene.nextScene, options: {} }], up: [] }],
			feedbacks: [],
		},

		[PresetIdScene.prevScene]: {
			type: 'button',
			category: 'Scenes',
			name: 'Previous scene',
			style: { text: 'Prev\\nScene', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdScene.prevScene, options: {} }], up: [] }],
			feedbacks: [],
		},
	}

	return presets
}
