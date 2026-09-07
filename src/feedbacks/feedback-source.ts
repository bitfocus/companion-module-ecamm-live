import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { SOURCE_MODE_CHOICES, SourceMode } from '../data-structures/ecamm-enums.js'
import { deviceIdOptions, resolveId } from '../actions/action-utils.js'
import { StyleActive, StyleReady } from './feedback-utils.js'

export enum FeedbackIdSource {
	sourceModeIs = 'source_mode_is',
	cameraIsDefault = 'source_camera_is_default',
}

export function GetFeedbacksSource(self: ModuleInstance): {
	[id in FeedbackIdSource]: CompanionFeedbackDefinition | undefined
} {
	const state = self.ecammApi?.state

	return {
		[FeedbackIdSource.sourceModeIs]: {
			type: 'boolean',
			name: 'Source mode is',
			defaultStyle: StyleActive,
			options: [{ type: 'dropdown', id: 'mode', label: 'Mode', choices: SOURCE_MODE_CHOICES, default: SourceMode.Cam }],
			callback: (feedback) => self.ecammApi?.state.sourceMode === (String(feedback.options.mode ?? '') as SourceMode),
		},

		[FeedbackIdSource.cameraIsDefault]: {
			type: 'boolean',
			name: 'Camera is the default camera',
			description:
				'This is Ecamm’s *default* camera, not the one currently on screen. The v4.4 API has no way to ask ' +
				'which camera is live, so a genuine "camera is active" tally is not possible.',
			defaultStyle: StyleReady,
			options: deviceIdOptions('Camera', state?.cameras ?? []),
			callback: (feedback) => {
				const id = resolveId(feedback.options)
				if (!id) return false
				return self.ecammApi?.state.defaultCameraId === id
			},
		},
	}
}
