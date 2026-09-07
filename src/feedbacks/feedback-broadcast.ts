import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { StyleActive, StyleReady, StyleWarning } from './feedback-utils.js'

export enum FeedbackIdBroadcast {
	buttonLabelMatches = 'broadcast_button_label_matches',
	isBroadcasting = 'broadcast_is_broadcasting',
	isPaused = 'broadcast_is_paused',
	viewersAtOrAbove = 'broadcast_viewers_at_or_above',
}

/**
 * Ecamm's Remote API v4.4 exposes no boolean for "recording" or "streaming". The only signal is
 * the wording of the main button, which reads "Record" when idle and changes once running. These
 * feedbacks are therefore label-derived, and say so, rather than pretending to a certainty the
 * API does not offer.
 */
export function GetFeedbacksBroadcast(self: ModuleInstance): {
	[id in FeedbackIdBroadcast]: CompanionFeedbackDefinition | undefined
} {
	return {
		[FeedbackIdBroadcast.buttonLabelMatches]: {
			type: 'boolean',
			name: 'Start button label contains',
			description:
				'The honest primitive: matches Ecamm’s own button wording. Use this if the convenience feedbacks ' +
				'below do not match your Ecamm’s language.',
			defaultStyle: StyleActive,
			options: [{ type: 'textinput', id: 'text', label: 'Text to look for', default: 'Stop', useVariables: true }],
			callback: (feedback) => {
				// Companion substitutes the variable and tracks the dependency, so this feedback
				// still re-evaluates when the referenced variable changes.
				const needle = String(feedback.options.text ?? '').trim()
				if (!needle) return false
				return (self.ecammApi?.state.info.buttonLabel ?? '').toLowerCase().includes(needle.toLowerCase())
			},
		},

		[FeedbackIdBroadcast.isBroadcasting]: {
			type: 'boolean',
			name: 'Recording or streaming (from button label)',
			description:
				'Inferred from the main button changing away from its idle wording. Ecamm offers no direct status, ' +
				'so if your install uses different wording, use the label feedback above instead.',
			defaultStyle: StyleActive,
			options: [],
			callback: () => {
				const label = (self.ecammApi?.state.info.buttonLabel ?? '').toLowerCase()
				if (!label) return false
				return label.includes('stop') || label.includes('end')
			},
		},

		[FeedbackIdBroadcast.isPaused]: {
			type: 'boolean',
			name: 'Paused (from pause button label)',
			description: 'Inferred the same way as above, from the pause button’s wording.',
			defaultStyle: StyleWarning,
			options: [],
			callback: () => {
				const label = (self.ecammApi?.state.info.pauseButtonLabel ?? '').toLowerCase()
				// "None" is what Ecamm reports when there is nothing to pause.
				if (!label || label === 'none') return false
				return label.includes('resume') || label.includes('continue')
			},
		},

		[FeedbackIdBroadcast.viewersAtOrAbove]: {
			type: 'boolean',
			name: 'Viewers at or above',
			defaultStyle: StyleReady,
			options: [{ type: 'number', id: 'threshold', label: 'At or above', min: 0, max: 1000000, default: 1 }],
			callback: (feedback) => {
				const viewers = self.ecammApi?.state.info.viewers ?? 0
				return viewers >= Number(feedback.options.threshold ?? 0)
			},
		},
	}
}
