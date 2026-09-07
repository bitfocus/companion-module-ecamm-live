import { ActionIdZoom } from '../actions/action-zoom.js'
import { ZoomPanel } from '../data-structures/ecamm-enums.js'
import { FeedbackIdZoom } from '../feedbacks/feedback-zoom.js'
import { ColorBlack, ColorGreen, ColorRed, ColorWhite } from '../feedbacks/feedback-utils.js'
import type { CompanionPresetExt } from './preset-utils.js'

export enum PresetIdZoom {
	newMeeting = 'zoom_newMeeting',
	leaveMeeting = 'zoom_leaveMeeting',
	toggleAudio = 'zoom_toggleAudio',
	toggleVideo = 'zoom_toggleVideo',
	muteAll = 'zoom_muteAll',
	raiseHand = 'zoom_raiseHand',
	fullScreen = 'zoom_fullScreen',
	cloudRecord = 'zoom_cloudRecord',
	localRecord = 'zoom_localRecord',
	pauseRecord = 'zoom_pauseRecord',
	prevGallery = 'zoom_prevGallery',
	nextGallery = 'zoom_nextGallery',
	gallerySpeaker = 'zoom_gallerySpeaker',
	spotlightSelf = 'zoom_spotlightSelf',
	panelMeeting = 'zoom_panelMeeting',
	panelChat = 'zoom_panelChat',
	panelParticipants = 'zoom_panelParticipants',
	panelShare = 'zoom_panelShare',
}

const CATEGORY = 'Zoom'

/**
 * Buttons for Ecamm's Zoom integration.
 *
 * Where Ecamm reports a matching state, the feedback is attached so the button shows what is
 * happening rather than only firing a command - a mute button that cannot tell you whether you
 * are muted is of limited use live. Six of these have no corresponding state in the v4.4 API
 * (mute everyone, full screen, the gallery controls, spotlight) and are plain action buttons.
 */
export function GetPresetsZoom(): { [id in PresetIdZoom]: CompanionPresetExt | undefined } {
	/** The common shape: one action, no options, optionally one state feedback. */
	const button = (
		name: string,
		text: string,
		actionId: CompanionPresetExt['steps'][0]['down'][0]['actionId'],
		feedback?: { id: CompanionPresetExt['feedbacks'][0]['feedbackId']; bgcolor: number },
	): CompanionPresetExt => ({
		type: 'button',
		category: CATEGORY,
		name,
		style: { text, size: 12, color: ColorWhite, bgcolor: ColorBlack },
		steps: [{ down: [{ actionId, options: {} }], up: [] }],
		feedbacks: feedback
			? [{ feedbackId: feedback.id, options: {}, style: { color: ColorWhite, bgcolor: feedback.bgcolor } }]
			: [],
	})

	/** Each panel gets its own button so every choice is visible in the picker. */
	const panel = (name: string, text: string, which: ZoomPanel): CompanionPresetExt => ({
		type: 'button',
		category: CATEGORY,
		name,
		style: { text, size: 12, color: ColorWhite, bgcolor: ColorBlack },
		steps: [{ down: [{ actionId: ActionIdZoom.zoomPanel, options: { panel: which } }], up: [] }],
		feedbacks: [],
	})

	return {
		[PresetIdZoom.newMeeting]: {
			type: 'button',
			category: CATEGORY,
			name: 'Start a new meeting',
			style: { text: 'Zoom\\nNew', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdZoom.zoomNew, options: { pmi: true } }], up: [] }],
			feedbacks: [
				{ feedbackId: FeedbackIdZoom.inMeeting, options: {}, style: { color: ColorWhite, bgcolor: ColorGreen } },
			],
		},

		[PresetIdZoom.leaveMeeting]: {
			type: 'button',
			category: CATEGORY,
			name: 'Leave meeting',
			style: { text: 'Zoom\\nLeave', size: 12, color: ColorWhite, bgcolor: ColorBlack },
			steps: [{ down: [{ actionId: ActionIdZoom.zoomLeave, options: { end: true } }], up: [] }],
			feedbacks: [
				{ feedbackId: FeedbackIdZoom.inMeeting, options: {}, style: { color: ColorWhite, bgcolor: ColorGreen } },
			],
		},

		// Muted and hand-raised are the states you want to notice, so they go red.
		[PresetIdZoom.toggleAudio]: button('Toggle microphone', 'Zoom\\nMic', ActionIdZoom.zoomAudio, {
			id: FeedbackIdZoom.muted,
			bgcolor: ColorRed,
		}),
		[PresetIdZoom.toggleVideo]: button('Toggle video', 'Zoom\\nCam', ActionIdZoom.zoomVideo, {
			id: FeedbackIdZoom.camOn,
			bgcolor: ColorGreen,
		}),
		[PresetIdZoom.raiseHand]: button('Raise or lower hand', 'Zoom\\nHand', ActionIdZoom.zoomRaiseHand, {
			id: FeedbackIdZoom.handRaised,
			bgcolor: ColorRed,
		}),
		[PresetIdZoom.cloudRecord]: button('Toggle cloud recording', 'Zoom\\nCloud Rec', ActionIdZoom.zoomCloudRecord, {
			id: FeedbackIdZoom.cloudRecording,
			bgcolor: ColorRed,
		}),
		[PresetIdZoom.localRecord]: button('Toggle local recording', 'Zoom\\nLocal Rec', ActionIdZoom.zoomLocalRecord, {
			id: FeedbackIdZoom.localRecording,
			bgcolor: ColorRed,
		}),
		[PresetIdZoom.pauseRecord]: button('Pause or resume recording', 'Zoom\\nPause Rec', ActionIdZoom.zoomPauseRecord, {
			id: FeedbackIdZoom.recordingPaused,
			bgcolor: ColorRed,
		}),

		// No state exists for these in the v4.4 API, so they stay plain action buttons.
		[PresetIdZoom.muteAll]: button('Mute everyone else', 'Zoom\\nMute All', ActionIdZoom.zoomMuteAll),
		[PresetIdZoom.fullScreen]: button('Toggle full screen', 'Zoom\\nFull', ActionIdZoom.zoomFullScreen),
		[PresetIdZoom.prevGallery]: button('Previous gallery page', 'Zoom\\nGal Prev', ActionIdZoom.zoomPrevGallery),
		[PresetIdZoom.nextGallery]: button('Next gallery page', 'Zoom\\nGal Next', ActionIdZoom.zoomNextGallery),
		[PresetIdZoom.gallerySpeaker]: button(
			'Switch gallery / speaker view',
			'Zoom\\nGal/Spkr',
			ActionIdZoom.zoomGallerySpeaker,
		),
		[PresetIdZoom.spotlightSelf]: button(
			'Toggle spotlight on yourself',
			'Zoom\\nSpotlight',
			ActionIdZoom.zoomSpotlightSelf,
		),

		[PresetIdZoom.panelMeeting]: panel('Show or hide the meeting panel', 'Zoom\\nMeeting', ZoomPanel.Meeting),
		[PresetIdZoom.panelChat]: panel('Show or hide the chat panel', 'Zoom\\nChat', ZoomPanel.Chat),
		[PresetIdZoom.panelParticipants]: panel(
			'Show or hide the participants panel',
			'Zoom\\nPeople',
			ZoomPanel.Participants,
		),
		[PresetIdZoom.panelShare]: panel('Show or hide the share panel', 'Zoom\\nShare', ZoomPanel.Share),
	}
}
