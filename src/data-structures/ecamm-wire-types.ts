/**
 * Shapes exactly as Ecamm Live sends them. Nothing outside ecamm-parsers.ts should import from
 * this file - the rest of the module consumes the normalised types in ecamm-domain-types.ts.
 *
 * Field sets here were taken from a live capture of Ecamm Live (see scripts/capture-ecamm.ts).
 * Anything not present in that capture is optional, because Ecamm omits keys rather than sending
 * nulls, and omits whole groups of keys when a feature is inactive.
 */

/** Ecamm's yes/no strings. */
export type RawYesNo = 'yes' | 'no'

/**
 * Every scalar endpoint returns a single-element JSON array, e.g. getMute -> ["no"],
 * getViewers -> ["0"], getCurrentScene -> ["8A1DB264-..."]. Confirmed across all 19 scalar
 * endpoints in the capture.
 */
export type RawScalar = [string]

/** List endpoints wrap their payload in an items array. */
export interface RawListEnvelope<T> {
	items: T[]
}

/**
 * getInfo. Only 17 keys were present on an idle install; the document also promises Zoom fields
 * and guest names, which appear only while a Zoom meeting is running. Every field is therefore
 * optional and the parser treats absence as "not reported".
 */
export interface RawInfo {
	ButtonLabel?: string
	PauseButtonLabel?: string
	/** UUID of the live scene. */
	CurrentScene?: string
	/**
	 * Undocumented. Observed alongside CurrentScene holding a different UUID - Ecamm appears to
	 * track the scene that was live before an automatic switch (for example a comment overlay).
	 */
	CurrentSceneOrig?: string
	Viewers?: string
	Mute?: RawYesNo
	PreviewMode?: RawYesNo
	HidingUI?: RawYesNo
	LiveDemo?: RawYesNo

	/** Zoom fields, present only during a meeting. */
	ZoomInMeeting?: RawYesNo
	ZoomMuted?: RawYesNo
	ZoomHandRaised?: RawYesNo
	ZoomCamOn?: RawYesNo
	ZoomCloudRecording?: RawYesNo
	ZoomLocalRecording?: RawYesNo
	ZoomRecordingPaused?: RawYesNo
	ZoomHosting?: RawYesNo

	/**
	 * Per-bus mute and volume arrive as MUTE_<SUFFIX> / VOLUME_<SUFFIX> keys, and only for buses
	 * the machine actually has. Handled by pattern in the parser, so they are indexed rather than
	 * enumerated here.
	 */
	[key: string]: string | undefined
}

/**
 * getSceneList item.
 *
 * Scenes can be collected into a group, which is another entry in the same list carrying
 * `Group: true` with its members in `Children`. A group is a container only - it cannot be
 * switched to, confirmed by setScene against a group UUID doing nothing - and its rule is that
 * only one scene inside it may be live at a time.
 */
export interface RawScene {
	title?: string
	UUID?: string
	/**
	 * Present and true only on the live scene, and omitted on all others. Note Ecamm omits it
	 * everywhere while a *grouped* scene is live, so it cannot be relied on alone.
	 */
	CURRENT?: boolean
	Locked?: boolean
	/** True when this entry is a group rather than a scene. */
	Group?: boolean
	/** Whether the group is expanded in Ecamm's UI. Presentation only; ignored here. */
	Expanded?: boolean
	/** Scenes inside a group. Empty on an ordinary scene. */
	Children?: RawScene[]
	LastAspect?: number
	AutoGroup?: boolean
	AutoGroupRandom?: boolean
	AutoGroupTimeInterval?: number
	SceneSoundVolume?: number
	SceneSoundStop?: boolean
}

/**
 * getOverlayList item - the CURRENT SCENE'S overlays only. Ecamm has no endpoint that reports
 * overlays for any other scene.
 */
export interface RawOverlay {
	title?: string
	UUID?: string
	/** Real boolean, confirmed in the capture. This is what the overlay feedback reads. */
	Visible?: boolean
	Locked?: boolean
	/** Marks the auto-generated social comment overlay. */
	IsComment?: boolean
	CachePath?: string
	OrigPath?: string
}

/**
 * getInputs item. Note the id is NOT a UUID in general: the capture returned values such as
 * "PLACEHOLDER_CAMERA_000001", "GUEST_1", "ZOOM_ACTIVE_SPEAKER", "0x0000000019f7006b" and a bare
 * device name. Never validate these with a UUID pattern.
 */
export interface RawCamera {
	title?: string
	UUID?: string
}

/**
 * getVideoList item. When there is no history Ecamm returns a single placeholder entry with an
 * empty UUID and the title "-No recent items-"; the parser drops entries with no id.
 */
export interface RawVideo {
	title?: string
	UUID?: string
}

/**
 * getSoundList item. Sound effects can be grouped into folders, and a folder is just another
 * entry in the same list carrying `Group: true` and its members in `Children` - it has no
 * OrigPath or CachePath of its own. Ecamm plays a folder by the folder's own UUID.
 */
export interface RawSound {
	title?: string
	UUID?: string
	/** True when this entry is a folder rather than a playable sound. */
	Group?: boolean
	/** Members of a folder. Empty on a plain sound. */
	Children?: RawSound[]
	/** Whether the folder is expanded in Ecamm's UI. Presentation only; ignored here. */
	Expanded?: boolean
	Volume?: number
	Duration?: number
	Action?: string
	Locked?: boolean
	OrigPath?: string
	CachePath?: string
}

/**
 * getAudioFilterList item. The capture returned an empty list, so only the two fields every
 * other Ecamm list shares are assumed.
 */
export interface RawAudioFilter {
	title?: string
	UUID?: string
}

/** getProfileList item. */
export interface RawProfile {
	title?: string
	UUID?: string
}

/**
 * getChannels. Documented as "a dictionary of streaming destinations", but the live capture
 * returned the usual {"items": []} envelope. Empty on the captured machine, so the item shape is
 * assumed to match every other list; the parser tolerates both an envelope and a bare map.
 */
export interface RawChannel {
	title?: string
	UUID?: string
	name?: string
}
