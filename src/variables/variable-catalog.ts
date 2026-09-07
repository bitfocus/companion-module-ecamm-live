import type { CompanionVariableValue } from '@companion-module/base'
import { ALL_AUDIO_BUSES, AUDIO_BUS_LABELS, busKey } from '../data-structures/ecamm-enums.js'
import type { EcammOverlay, EcammScene, EcammSound } from '../data-structures/ecamm-domain-types.js'
import { sceneLabel, soundLabel } from '../data-structures/ecamm-parsers.js'
import type { EcammState } from '../ecamm-api/ecamm-state.js'
import { SLOT_FAMILIES, buildSlotVariables } from './variable-slots.js'

/**
 * A variable and how to compute it, in one place.
 *
 * Definitions and values are both derived from this single list, which is what stops the two
 * drifting apart - the previous implementation defined fourteen variables but set fifteen, so
 * one value was written for a variable that had never been declared.
 */
export interface VariableSpec {
	variableId: string
	name: string
	value: CompanionVariableValue
}

export function buildVariableCatalog(state: EcammState): VariableSpec[] {
	const info = state.info
	const specs: VariableSpec[] = [
		{ variableId: 'connection_status', name: 'Connection permission', value: state.permission },
		{ variableId: 'host', name: 'Ecamm Live address (ip:port)', value: state.host },
		{ variableId: 'connected', name: 'Connected', value: state.connected },
		{ variableId: 'last_error', name: 'Last error', value: state.lastError ?? '' },

		{ variableId: 'button_label', name: 'Start button label', value: info.buttonLabel },
		{ variableId: 'pause_button_label', name: 'Pause button label', value: info.pauseButtonLabel },
		{ variableId: 'current_scene_id', name: 'Current scene UUID', value: info.currentSceneId },
		{ variableId: 'current_scene_name', name: 'Current scene name', value: state.currentSceneName() },
		{
			variableId: 'current_scene_orig_id',
			name: 'Scene UUID before automatic switch',
			value: info.currentSceneOrigId,
		},
		{ variableId: 'viewers', name: 'Concurrent viewers', value: info.viewers },
		{ variableId: 'mute', name: 'Muted', value: info.mute },
		{ variableId: 'preview_mode', name: 'Preview mode active', value: info.previewMode },
		{ variableId: 'ui_hidden', name: 'Main window controls hidden', value: info.hidingUi },
		{ variableId: 'live_demo', name: 'Live Demo mode active', value: info.liveDemo },
		{ variableId: 'source_mode', name: 'Current source mode', value: state.sourceMode ?? '' },
		{ variableId: 'default_camera_id', name: 'Default camera id', value: state.defaultCameraId },
		{
			variableId: 'default_camera_name',
			name: 'Default camera name',
			value: state.cameras.find((camera) => camera.id === state.defaultCameraId)?.label ?? '',
		},

		{ variableId: 'scene_count', name: 'Number of scenes', value: state.scenes.length },
		{ variableId: 'overlay_count', name: 'Overlays in the current scene', value: state.overlays.length },
		{ variableId: 'camera_count', name: 'Number of camera inputs', value: state.cameras.length },
		{ variableId: 'video_count', name: 'Number of recent videos', value: state.videos.length },
		{ variableId: 'sound_count', name: 'Number of sound effects', value: state.sounds.length },
		{ variableId: 'sound_folder_count', name: 'Number of sound folders', value: state.soundFolders.length },
		{ variableId: 'audio_filter_count', name: 'Number of audio filters', value: state.audioFilters.length },
		{ variableId: 'profile_count', name: 'Number of profiles', value: state.profiles.length },
		{ variableId: 'channel_count', name: 'Number of streaming destinations', value: state.channels.length },

		{ variableId: 'zoom_in_meeting', name: 'Zoom: in a meeting', value: info.zoom.inMeeting },
		{ variableId: 'zoom_muted', name: 'Zoom: muted', value: info.zoom.muted },
		{ variableId: 'zoom_hand_raised', name: 'Zoom: hand raised', value: info.zoom.handRaised },
		{ variableId: 'zoom_cam_on', name: 'Zoom: camera on', value: info.zoom.camOn },
		{ variableId: 'zoom_cloud_recording', name: 'Zoom: cloud recording', value: info.zoom.cloudRecording },
		{ variableId: 'zoom_local_recording', name: 'Zoom: local recording', value: info.zoom.localRecording },
		{ variableId: 'zoom_recording_paused', name: 'Zoom: recording paused', value: info.zoom.recordingPaused },
		{ variableId: 'zoom_hosting', name: 'Zoom: hosting', value: info.zoom.hosting },
	]

	// Ecamm only reports the buses a given machine actually has, so the rest stay empty rather
	// than reading as zero - an empty string is honest about "not reported".
	for (const bus of ALL_AUDIO_BUSES) {
		const key = busKey(bus)
		const label = AUDIO_BUS_LABELS[bus]
		specs.push({
			variableId: `volume_${key}`,
			name: `${label} volume`,
			value: state.volumeOf(bus) ?? '',
		})
		specs.push({
			variableId: `mute_${key}`,
			name: `${label} muted`,
			value: state.muteOf(bus) ?? '',
		})
	}

	// Fixed numbered slots for every device list. These are what make a generic, reusable button
	// possible - see variable-slots.ts for why they are padded and why they exist beyond the end
	// of the current lists.
	specs.push(
		...buildSlotVariables(SLOT_FAMILIES.scene, state.scenes, {
			label: (item) => sceneLabel(item as EcammScene),
		}),
	)
	specs.push(
		...buildSlotVariables(SLOT_FAMILIES.overlay, state.overlays, {
			visible: (item) => (item as EcammOverlay).visible === true,
		}),
	)
	specs.push(
		...buildSlotVariables(SLOT_FAMILIES.sound, state.sounds, { label: (item) => soundLabel(item as EcammSound) }),
	)
	specs.push(...buildSlotVariables(SLOT_FAMILIES.soundFolder, state.soundFolders))
	specs.push(...buildSlotVariables(SLOT_FAMILIES.camera, state.cameras))
	specs.push(...buildSlotVariables(SLOT_FAMILIES.profile, state.profiles))

	return specs
}
