import { ActionIdAudio } from '../actions/action-audio.js'
import { ActionIdSound } from '../actions/action-sound.js'
import { FeedbackIdAudio } from '../feedbacks/feedback-audio.js'
import { ColorBlack, ColorRed, ColorWhite } from '../feedbacks/feedback-utils.js'
import { AUDIO_BUS_LABELS, AudioBus, busKey } from '../data-structures/ecamm-enums.js'
import type { CompanionPresetExt } from './preset-utils.js'

/**
 * Three buttons per bus - mute, up, down - declared bus by bus.
 *
 * The order is the point: Companion lists a category in the order the module supplies it, so
 * keeping a bus's three ids together is what puts its three buttons side by side in the picker.
 * The names sort the same way, in case a future Companion build orders them alphabetically.
 */
export enum PresetIdAudio {
	muteMic = 'audio_mic_mute',
	micUp = 'audio_mic_up',
	micDown = 'audio_mic_down',

	muteMic2 = 'audio_mic2_mute',
	mic2Up = 'audio_mic2_up',
	mic2Down = 'audio_mic2_down',

	muteSkype = 'audio_skype_mute',
	skypeUp = 'audio_skype_up',
	skypeDown = 'audio_skype_down',

	muteSystemAudio = 'audio_systemAudio_mute',
	systemAudioUp = 'audio_systemAudio_up',
	systemAudioDown = 'audio_systemAudio_down',

	muteInterview = 'audio_interview_mute',
	interviewUp = 'audio_interview_up',
	interviewDown = 'audio_interview_down',

	muteZoom = 'audio_zoom_mute',
	zoomUp = 'audio_zoom_up',
	zoomDown = 'audio_zoom_down',

	muteSoundEffects = 'audio_soundEffects_mute',
	soundEffectsUp = 'audio_soundEffects_up',
	soundEffectsDown = 'audio_soundEffects_down',

	muteMovie = 'audio_movie_mute',
	movieUp = 'audio_movie_up',
	movieDown = 'audio_movie_down',

	muteGuest1 = 'audio_guest1_mute',
	guest1Up = 'audio_guest1_up',
	guest1Down = 'audio_guest1_down',

	muteGuest2 = 'audio_guest2_mute',
	guest2Up = 'audio_guest2_up',
	guest2Down = 'audio_guest2_down',

	muteGuest3 = 'audio_guest3_mute',
	guest3Up = 'audio_guest3_up',
	guest3Down = 'audio_guest3_down',

	muteGuest4 = 'audio_guest4_mute',
	guest4Up = 'audio_guest4_up',
	guest4Down = 'audio_guest4_down',

	setVolume = 'audio_setVolume',
	stopSound = 'audio_stopSound',
}

/** How much one press moves a level. */
const VOLUME_STEP = 5

export function GetPresetsAudio(): {
	[id in PresetIdAudio]: CompanionPresetExt | undefined
} {
	/** A nudge button that also shows the bus's current level. */
	const adjust = (bus: AudioBus, delta: number): CompanionPresetExt => {
		const label = AUDIO_BUS_LABELS[bus]
		const sign = delta < 0 ? '-' : '+'
		return {
			type: 'button',
			category: 'Audio',
			name: `${label} volume ${delta < 0 ? 'down' : 'up'}`,
			style: {
				text: `${label} ${sign}\\n$(ecamm-live:volume_${busKey(bus)})`,
				size: 12,
				color: ColorWhite,
				bgcolor: ColorBlack,
			},
			steps: [{ down: [{ actionId: ActionIdAudio.adjustVolume, options: { bus, delta } }], up: [] }],
			feedbacks: [],
		}
	}

	/** Mute state comes from the feedback rather than a variable, so the label stays readable. */
	const muteButton = (bus: AudioBus): CompanionPresetExt => ({
		type: 'button',
		category: 'Audio',
		name: `${AUDIO_BUS_LABELS[bus]} mute`,
		style: { text: `${AUDIO_BUS_LABELS[bus]}\\nMute`, size: 12, color: ColorWhite, bgcolor: ColorBlack },
		steps: [{ down: [{ actionId: ActionIdAudio.toggleMute, options: { bus } }], up: [] }],
		feedbacks: [
			{ feedbackId: FeedbackIdAudio.busMuted, options: { bus }, style: { color: ColorWhite, bgcolor: ColorRed } },
		],
	})

	return {
		// Every bus the API accepts gets a button. Ecamm only reports the buses a given machine
		// actually has, so one it lacks renders a blank level rather than a wrong one - which is the
		// right outcome for a preset the user may never place.
		[PresetIdAudio.muteMic]: muteButton(AudioBus.Mic),
		[PresetIdAudio.micUp]: adjust(AudioBus.Mic, VOLUME_STEP),
		[PresetIdAudio.micDown]: adjust(AudioBus.Mic, -VOLUME_STEP),

		[PresetIdAudio.muteMic2]: muteButton(AudioBus.Mic2),
		[PresetIdAudio.mic2Up]: adjust(AudioBus.Mic2, VOLUME_STEP),
		[PresetIdAudio.mic2Down]: adjust(AudioBus.Mic2, -VOLUME_STEP),

		[PresetIdAudio.muteSkype]: muteButton(AudioBus.Skype),
		[PresetIdAudio.skypeUp]: adjust(AudioBus.Skype, VOLUME_STEP),
		[PresetIdAudio.skypeDown]: adjust(AudioBus.Skype, -VOLUME_STEP),

		[PresetIdAudio.muteSystemAudio]: muteButton(AudioBus.SystemAudio),
		[PresetIdAudio.systemAudioUp]: adjust(AudioBus.SystemAudio, VOLUME_STEP),
		[PresetIdAudio.systemAudioDown]: adjust(AudioBus.SystemAudio, -VOLUME_STEP),

		[PresetIdAudio.muteInterview]: muteButton(AudioBus.Interview),
		[PresetIdAudio.interviewUp]: adjust(AudioBus.Interview, VOLUME_STEP),
		[PresetIdAudio.interviewDown]: adjust(AudioBus.Interview, -VOLUME_STEP),

		[PresetIdAudio.muteZoom]: muteButton(AudioBus.Zoom),
		[PresetIdAudio.zoomUp]: adjust(AudioBus.Zoom, VOLUME_STEP),
		[PresetIdAudio.zoomDown]: adjust(AudioBus.Zoom, -VOLUME_STEP),

		[PresetIdAudio.muteSoundEffects]: muteButton(AudioBus.SoundEffects),
		[PresetIdAudio.soundEffectsUp]: adjust(AudioBus.SoundEffects, VOLUME_STEP),
		[PresetIdAudio.soundEffectsDown]: adjust(AudioBus.SoundEffects, -VOLUME_STEP),

		[PresetIdAudio.muteMovie]: muteButton(AudioBus.Movie),
		[PresetIdAudio.movieUp]: adjust(AudioBus.Movie, VOLUME_STEP),
		[PresetIdAudio.movieDown]: adjust(AudioBus.Movie, -VOLUME_STEP),

		[PresetIdAudio.muteGuest1]: muteButton(AudioBus.Guest1),
		[PresetIdAudio.guest1Up]: adjust(AudioBus.Guest1, VOLUME_STEP),
		[PresetIdAudio.guest1Down]: adjust(AudioBus.Guest1, -VOLUME_STEP),

		[PresetIdAudio.muteGuest2]: muteButton(AudioBus.Guest2),
		[PresetIdAudio.guest2Up]: adjust(AudioBus.Guest2, VOLUME_STEP),
		[PresetIdAudio.guest2Down]: adjust(AudioBus.Guest2, -VOLUME_STEP),

		[PresetIdAudio.muteGuest3]: muteButton(AudioBus.Guest3),
		[PresetIdAudio.guest3Up]: adjust(AudioBus.Guest3, VOLUME_STEP),
		[PresetIdAudio.guest3Down]: adjust(AudioBus.Guest3, -VOLUME_STEP),

		[PresetIdAudio.muteGuest4]: muteButton(AudioBus.Guest4),
		[PresetIdAudio.guest4Up]: adjust(AudioBus.Guest4, VOLUME_STEP),
		[PresetIdAudio.guest4Down]: adjust(AudioBus.Guest4, -VOLUME_STEP),

		[PresetIdAudio.setVolume]: {
			type: 'button',
			category: 'Audio',
			name: 'Set a volume to a fixed level',
			style: { text: `Mic\\n100`, size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [
				{
					down: [{ actionId: ActionIdAudio.setVolume, options: { bus: AudioBus.Mic, volume: 100 } }],
					up: [],
				},
			],
			feedbacks: [],
		},

		[PresetIdAudio.stopSound]: {
			type: 'button',
			category: 'Audio',
			name: 'Stop sound effect',
			style: { text: 'Stop\\nSound', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdSound.stopSound, options: {} }], up: [] }],
			feedbacks: [],
		},
	}
}
