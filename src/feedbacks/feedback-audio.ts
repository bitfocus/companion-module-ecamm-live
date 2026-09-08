import type { CompanionFeedbackDefinition, DropdownChoice } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { ALL_AUDIO_BUSES, AUDIO_BUS_LABELS, AudioBus } from '../data-structures/ecamm-enums.js'
import { StyleActive, StyleReady } from './feedback-utils.js'

export enum FeedbackIdAudio {
	muted = 'audio_muted',
	busMuted = 'audio_bus_muted',
	volumeAtOrAbove = 'audio_volume_at_or_above',
}

const BUS_CHOICES: DropdownChoice[] = ALL_AUDIO_BUSES.map((bus) => ({ id: bus, label: AUDIO_BUS_LABELS[bus] }))

export function GetFeedbacksAudio(self: ModuleInstance): {
	[id in FeedbackIdAudio]: CompanionFeedbackDefinition | undefined
} {
	return {
		[FeedbackIdAudio.muted]: {
			type: 'boolean',
			name: 'Muted',
			description: 'True when Ecamm’s main mute is on.',
			defaultStyle: StyleActive,
			options: [],
			callback: () => self.ecammApi?.state.info.mute === true,
		},

		[FeedbackIdAudio.busMuted]: {
			type: 'boolean',
			name: 'Audio bus is muted',
			description:
				'Ecamm reports mute per bus in its status payload, for every bus the machine actually has - the ' +
				'Zoom and Interview guest buses appear once a guest is connected. A bus this Mac does not have ' +
				'reads as not muted.',
			defaultStyle: StyleActive,
			options: [{ type: 'dropdown', id: 'bus', label: 'Bus', choices: BUS_CHOICES, default: AudioBus.Mic }],
			callback: (feedback) => {
				const bus = String(feedback.options.bus ?? AudioBus.Mic) as AudioBus
				return self.ecammApi?.state.muteOf(bus) === true
			},
		},

		[FeedbackIdAudio.volumeAtOrAbove]: {
			type: 'boolean',
			name: 'Audio bus volume is at or above',
			description: 'False when Ecamm has not reported a level for the bus.',
			defaultStyle: StyleReady,
			options: [
				{ type: 'dropdown', id: 'bus', label: 'Bus', choices: BUS_CHOICES, default: AudioBus.Mic },
				{ type: 'number', id: 'threshold', label: 'At or above', min: 0, max: 100, default: 50 },
			],
			callback: (feedback) => {
				const bus = String(feedback.options.bus ?? AudioBus.Mic) as AudioBus
				const level = self.ecammApi?.state.volumeOf(bus)
				if (level === undefined) return false
				return level >= Number(feedback.options.threshold ?? 0)
			},
		},
	}
}
