import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import type { EcammZoomState } from '../data-structures/ecamm-domain-types.js'
import { StyleActive, StyleReady, StyleWarning } from './feedback-utils.js'

export enum FeedbackIdZoom {
	inMeeting = 'zoom_in_meeting',
	muted = 'zoom_muted',
	handRaised = 'zoom_hand_raised',
	camOn = 'zoom_cam_on',
	cloudRecording = 'zoom_cloud_recording',
	localRecording = 'zoom_local_recording',
	recordingPaused = 'zoom_recording_paused',
	hosting = 'zoom_hosting',
}

/**
 * Ecamm omits every Zoom field unless a meeting is running, and the parser forces them all false
 * in that case, so none of these can light up from a stale value between meetings.
 */
export function GetFeedbacksZoom(self: ModuleInstance): {
	[id in FeedbackIdZoom]: CompanionFeedbackDefinition | undefined
} {
	const zoomFlag = (
		name: string,
		style: { color: number; bgcolor: number },
		read: (zoom: EcammZoomState) => boolean,
		description?: string,
	): CompanionFeedbackDefinition => ({
		type: 'boolean',
		name,
		description,
		defaultStyle: style,
		options: [],
		callback: () => {
			const zoom = self.ecammApi?.state.info.zoom
			return zoom ? read(zoom) : false
		},
	})

	return {
		[FeedbackIdZoom.inMeeting]: zoomFlag('Zoom: in a meeting', StyleReady, (z) => z.inMeeting),
		[FeedbackIdZoom.muted]: zoomFlag('Zoom: muted', StyleActive, (z) => z.muted),
		[FeedbackIdZoom.handRaised]: zoomFlag('Zoom: hand raised', StyleWarning, (z) => z.handRaised),
		[FeedbackIdZoom.camOn]: zoomFlag('Zoom: camera on', StyleReady, (z) => z.camOn),
		[FeedbackIdZoom.cloudRecording]: zoomFlag('Zoom: cloud recording', StyleActive, (z) => z.cloudRecording),
		[FeedbackIdZoom.localRecording]: zoomFlag('Zoom: local recording', StyleActive, (z) => z.localRecording),
		[FeedbackIdZoom.recordingPaused]: zoomFlag('Zoom: recording paused', StyleWarning, (z) => z.recordingPaused),
		[FeedbackIdZoom.hosting]: zoomFlag('Zoom: hosting', StyleReady, (z) => z.hosting),
	}
}
