/**
 * Normalised shapes consumed by actions, feedbacks, variables and presets. Nothing here carries
 * an Ecamm wire quirk: yes/no strings are booleans, numeric strings are numbers, and every list
 * entry has been reduced to a stable id/label pair plus whatever extra it genuinely needs.
 */
import type { AudioBus, ConnectionPermission, SourceMode } from './ecamm-enums.js'

/** Common shape for anything that populates a dropdown. */
export interface EcammListItem {
	id: string
	label: string
}

export interface EcammScene extends EcammListItem {
	/** True for the scene Ecamm reports as live. */
	current: boolean
	locked: boolean
	/** Set when the scene lives inside a group, so it can be labelled "Group - Scene". */
	groupName?: string
}

export interface EcammOverlay extends EcammListItem {
	visible: boolean
	locked: boolean
	/** The auto-generated social comment overlay, driven by setShowComment/setHideComment. */
	isComment: boolean
}

export type EcammCamera = EcammListItem
export type EcammVideo = EcammListItem
export type EcammAudioFilter = EcammListItem
export type EcammProfile = EcammListItem
export type EcammChannel = EcammListItem

export interface EcammSound extends EcammListItem {
	/** Seconds. Zero when Ecamm did not report a duration. */
	duration: number
	/** Set when the sound lives inside a folder, so it can be labelled "Folder / Sound". */
	folderName?: string
}

/** A sound-effect folder. Ecamm plays every sound in one by sending the folder's own id. */
export interface EcammSoundFolder extends EcammListItem {
	soundCount: number
}

/**
 * Normalised getInfo. Fields Ecamm did not report are undefined rather than defaulted, so a
 * feedback can tell "off" apart from "not reported by this machine".
 */
export interface EcammInfo {
	buttonLabel: string
	pauseButtonLabel: string
	currentSceneId: string
	/** Undocumented: the scene that was live before an automatic switch. */
	currentSceneOrigId: string
	viewers: number
	mute: boolean
	previewMode: boolean
	hidingUi: boolean
	liveDemo: boolean

	/** Per-bus values getInfo happened to include. Absent buses need getVolume. */
	volumes: Partial<Record<AudioBus, number>>
	mutes: Partial<Record<AudioBus, boolean>>

	/** Present only during a Zoom meeting; all false when not in one. */
	zoom: EcammZoomState

	/** Keys getInfo returned that this module does not map. Logged once, never auto-exposed. */
	unmappedKeys: string[]
}

export interface EcammZoomState {
	inMeeting: boolean
	muted: boolean
	handRaised: boolean
	camOn: boolean
	cloudRecording: boolean
	localRecording: boolean
	recordingPaused: boolean
	hosting: boolean
}

/** Lists that back dropdowns; a change to any of these forces definitions to be re-registered. */
export type ListKey =
	'scenes' | 'overlays' | 'cameras' | 'videos' | 'sounds' | 'soundFolders' | 'audioFilters' | 'profiles' | 'channels'

export const ALL_LIST_KEYS: ListKey[] = [
	'scenes',
	'overlays',
	'cameras',
	'videos',
	'sounds',
	'soundFolders',
	'audioFilters',
	'profiles',
	'channels',
]

/**
 * What changed after applying a poll result.
 *
 * The split matters: `definitions` means a dropdown's choices are stale and every definition has
 * to be rebuilt, which is expensive and must not happen on a routine tick. `values` means only
 * variables and feedbacks need refreshing, which is the common case at a 2 second cadence.
 */
export interface StateChangeSet {
	definitions: boolean
	values: boolean
	/**
	 * Exactly the feedbacks whose inputs moved. Checking all of them on every tick would re-run
	 * two dozen callbacks to discover that one number changed, so each field reports only what
	 * actually reads it.
	 */
	feedbacks: Set<string>
}

export function emptyChangeSet(): StateChangeSet {
	return { definitions: false, values: false, feedbacks: new Set() }
}

export function mergeChangeSets(a: StateChangeSet, b: StateChangeSet): StateChangeSet {
	return {
		definitions: a.definitions || b.definitions,
		values: a.values || b.values,
		feedbacks: new Set([...a.feedbacks, ...b.feedbacks]),
	}
}

/** Connection view used by the status feedback and the connection variables. */
export interface EcammConnection {
	permission: ConnectionPermission
	connected: boolean
	sourceMode?: SourceMode
	defaultCameraId: string
	lastError?: string
}
