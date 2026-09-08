import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { sceneLabel } from '../data-structures/ecamm-parsers.js'
import { deviceIdOptions, resolveId } from '../actions/action-utils.js'
import { StyleActive } from './feedback-utils.js'

export enum FeedbackIdScene {
	sceneActive = 'scene_active',
}

export function GetFeedbacksScene(self: ModuleInstance): {
	[id in FeedbackIdScene]: CompanionFeedbackDefinition | undefined
} {
	const state = self.ecammApi?.state

	return {
		[FeedbackIdScene.sceneActive]: {
			type: 'boolean',
			name: 'Scene is live',
			description: 'True when the selected scene is the one Ecamm is currently showing.',
			defaultStyle: StyleActive,
			options: deviceIdOptions(
				'Scene',
				(state?.scenes ?? []).map((scene) => ({ id: scene.id, label: sceneLabel(scene) })),
			),
			callback: (feedback) => {
				const id = resolveId(feedback.options)
				if (!id) return false
				// Ecamm reports the live scene by UUID, confirmed against a live capture.
				return self.ecammApi?.state.info.currentSceneId === id
			},
		},
	}
}
