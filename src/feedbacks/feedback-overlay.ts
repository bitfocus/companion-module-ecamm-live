import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { deviceIdOptions, resolveId } from '../actions/action-utils.js'
import { StyleActive } from './feedback-utils.js'

export enum FeedbackIdOverlay {
	overlayVisible = 'overlay_visible',
}

/**
 * How the visibility tally should read for an overlay Ecamm cannot report on.
 *
 * An enum rather than bare strings because presets set this option by hand: the dynamic and the
 * fixed overlay presets both have to say "off", and a typo in either would silently ship a
 * feedback with an unrecognised option value.
 */
export enum OverlayUnknownBehavior {
	Off = 'off',
	On = 'on',
}

export const OVERLAY_UNKNOWN_CHOICES = [
	{ id: OverlayUnknownBehavior.Off, label: 'Treat as not visible' },
	{ id: OverlayUnknownBehavior.On, label: 'Treat as visible' },
]

export function GetFeedbacksOverlay(self: ModuleInstance): {
	[id in FeedbackIdOverlay]: CompanionFeedbackDefinition | undefined
} {
	const state = self.ecammApi?.state

	return {
		[FeedbackIdOverlay.overlayVisible]: {
			type: 'boolean',
			name: 'Overlay is visible',
			description:
				'Ecamm can only report the overlays belonging to the scene that is currently live. For an overlay in ' +
				'any other scene its visibility is genuinely unknown, not off - choose below how that should look.',
			defaultStyle: StyleActive,
			options: [
				...deviceIdOptions('Overlay', state?.overlays ?? []),
				{
					type: 'dropdown',
					id: 'unknownBehavior',
					label: 'When the overlay is not in the current scene',
					choices: OVERLAY_UNKNOWN_CHOICES,
					default: OverlayUnknownBehavior.Off,
				},
			],
			callback: (feedback) => {
				const id = resolveId(feedback.options)
				if (!id) return false

				const overlay = self.ecammApi?.state.overlayById(id)
				// Absent means "belongs to another scene", which Ecamm cannot report on. A
				// confidently wrong tally light is worse than an honest dark one, so the default
				// is off and the choice is the user's.
				if (!overlay) return feedback.options.unknownBehavior === OverlayUnknownBehavior.On
				return overlay.visible
			},
		},
	}
}
