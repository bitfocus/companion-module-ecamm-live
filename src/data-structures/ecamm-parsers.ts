/**
 * The only place that knows how Ecamm Live actually formats things. Everything here is pure, so
 * it can be tested against captured fixtures without a network or a Companion instance.
 */
import { ALL_AUDIO_BUSES, AUDIO_BUS_INFO_SUFFIX, AudioBus, ConnectionPermission, SourceMode } from './ecamm-enums.js'
import type {
	RawAudioFilter,
	RawCamera,
	RawChannel,
	RawInfo,
	RawListEnvelope,
	RawOverlay,
	RawProfile,
	RawScene,
	RawSound,
	RawVideo,
} from './ecamm-wire-types.js'
import type {
	EcammAudioFilter,
	EcammCamera,
	EcammChannel,
	EcammInfo,
	EcammOverlay,
	EcammProfile,
	EcammScene,
	EcammSound,
	EcammSoundFolder,
	EcammVideo,
	EcammZoomState,
} from './ecamm-domain-types.js'

/** getInfo keys handled explicitly; anything else is reported as unmapped. */
const KNOWN_INFO_KEYS = new Set([
	'ButtonLabel',
	'PauseButtonLabel',
	'CurrentScene',
	'CurrentSceneOrig',
	'Viewers',
	'Mute',
	'PreviewMode',
	'HidingUI',
	'LiveDemo',
	'ZoomInMeeting',
	'ZoomMuted',
	'ZoomHandRaised',
	'ZoomCamOn',
	'ZoomCloudRecording',
	'ZoomLocalRecording',
	'ZoomRecordingPaused',
	'ZoomHosting',
])

/** Ecamm sends "yes"/"no"; anything else (including absence) is treated as false. */
export function yesNo(value: unknown): boolean {
	return typeof value === 'string' && value.toLowerCase() === 'yes'
}

/**
 * Scalar endpoints answer with a one-element array, e.g. ["no"]. A bare string is accepted too,
 * so a future firmware that drops the wrapper does not break every read.
 */
export function unwrapScalar(payload: unknown): string {
	if (Array.isArray(payload)) return payload.length > 0 ? unwrapScalar(payload[0]) : ''
	if (typeof payload === 'string') return payload
	if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload)
	// Anything else (an object, null, undefined) has no sensible scalar reading.
	return ''
}

/**
 * Volumes come back as numeric strings, but unavailable buses answer "N/A", so this returns
 * undefined rather than NaN for anything non-numeric.
 */
export function parseNumeric(value: unknown): number | undefined {
	if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	if (trimmed === '' || !/^-?\d+(\.\d+)?$/.test(trimmed)) return undefined
	const n = Number(trimmed)
	return Number.isFinite(n) ? n : undefined
}

/** Unwraps {items: [...]}, tolerating a bare array or a keyed map. */
function itemsOf<T>(payload: unknown): T[] {
	if (Array.isArray(payload)) return payload as T[]
	if (payload && typeof payload === 'object') {
		const envelope = payload as RawListEnvelope<T> & Record<string, unknown>
		if (Array.isArray(envelope.items)) return envelope.items
		// getChannels is documented as a dictionary; fall back to its values.
		const values = Object.values(envelope).filter((v) => v && typeof v === 'object')
		if (values.length > 0) return values as T[]
	}
	return []
}

/**
 * Ecamm pads empty lists with a placeholder carrying no id (getVideoList returns
 * "-No recent items-" with UUID ""). Those must never reach a dropdown.
 */
function toListItem(raw: { title?: string; UUID?: string; name?: string }): { id: string; label: string } | undefined {
	const id = raw.UUID?.trim()
	if (!id) return undefined
	return { id, label: raw.title?.trim() || raw.name?.trim() || id }
}

export function parseInfo(payload: unknown): EcammInfo {
	const raw = (payload && typeof payload === 'object' ? payload : {}) as RawInfo

	const volumes: Partial<Record<AudioBus, number>> = {}
	const mutes: Partial<Record<AudioBus, boolean>> = {}
	const consumed = new Set<string>()

	for (const bus of ALL_AUDIO_BUSES) {
		const suffix = AUDIO_BUS_INFO_SUFFIX[bus]
		const volumeKey = `VOLUME_${suffix}`
		const muteKey = `MUTE_${suffix}`

		if (raw[volumeKey] !== undefined) {
			const parsed = parseNumeric(raw[volumeKey])
			if (parsed !== undefined) volumes[bus] = parsed
			consumed.add(volumeKey)
		}
		if (raw[muteKey] !== undefined) {
			mutes[bus] = yesNo(raw[muteKey])
			consumed.add(muteKey)
		}
	}

	const unmappedKeys = Object.keys(raw).filter((key) => !KNOWN_INFO_KEYS.has(key) && !consumed.has(key))

	return {
		buttonLabel: raw.ButtonLabel ?? '',
		pauseButtonLabel: raw.PauseButtonLabel ?? '',
		currentSceneId: raw.CurrentScene ?? '',
		currentSceneOrigId: raw.CurrentSceneOrig ?? '',
		viewers: parseNumeric(raw.Viewers) ?? 0,
		mute: yesNo(raw.Mute),
		previewMode: yesNo(raw.PreviewMode),
		hidingUi: yesNo(raw.HidingUI),
		liveDemo: yesNo(raw.LiveDemo),
		volumes,
		mutes,
		zoom: parseZoom(raw),
		unmappedKeys,
	}
}

/**
 * Zoom keys are absent unless a meeting is running. Outside a meeting every flag is forced
 * false, so a button cannot light up from a stale value.
 */
function parseZoom(raw: RawInfo): EcammZoomState {
	const inMeeting = yesNo(raw.ZoomInMeeting)
	if (!inMeeting) {
		return {
			inMeeting: false,
			muted: false,
			handRaised: false,
			camOn: false,
			cloudRecording: false,
			localRecording: false,
			recordingPaused: false,
			hosting: false,
		}
	}
	return {
		inMeeting: true,
		muted: yesNo(raw.ZoomMuted),
		handRaised: yesNo(raw.ZoomHandRaised),
		camOn: yesNo(raw.ZoomCamOn),
		cloudRecording: yesNo(raw.ZoomCloudRecording),
		localRecording: yesNo(raw.ZoomLocalRecording),
		recordingPaused: yesNo(raw.ZoomRecordingPaused),
		hosting: yesNo(raw.ZoomHosting),
	}
}

/**
 * Flattens the scene list, lifting grouped scenes out of their group.
 *
 * A group is a container carrying `Group: true` with its scenes in `Children`. It is not itself
 * switchable - setScene against a group UUID does nothing - but it has a title and a UUID, so
 * without this it would appear as a scene that cannot be pressed while the real scenes inside it
 * went missing entirely.
 *
 * Children are lifted in place, so the order matches what Ecamm shows and the slot numbering
 * follows it. The walk recurses even though only one level has been observed.
 */
export function parseSceneList(payload: unknown): EcammScene[] {
	const scenes: EcammScene[] = []

	const walk = (items: RawScene[], groupName?: string): void => {
		for (const raw of items) {
			const base = toListItem(raw)
			if (!base) continue

			if (raw.Group === true) {
				// Scenes are attributed to the group directly containing them.
				walk(Array.isArray(raw.Children) ? raw.Children : [], base.label)
				continue
			}

			scenes.push({
				...base,
				current: raw.CURRENT === true,
				locked: raw.Locked === true,
				...(groupName ? { groupName } : {}),
			})
		}
	}

	walk(itemsOf<RawScene>(payload))
	return scenes
}

/** "New Group - New Scene" for a grouped scene, or just the name for an ungrouped one. */
export function sceneLabel(scene: EcammScene): string {
	return scene.groupName ? `${scene.groupName} - ${scene.label}` : scene.label
}

export function parseOverlayList(payload: unknown): EcammOverlay[] {
	const overlays: EcammOverlay[] = []
	for (const raw of itemsOf<RawOverlay>(payload)) {
		const base = toListItem(raw)
		if (!base) continue
		overlays.push({
			...base,
			visible: raw.Visible === true,
			locked: raw.Locked === true,
			isComment: raw.IsComment === true,
		})
	}
	return overlays
}

function parseSimpleList<T extends { title?: string; UUID?: string; name?: string }>(
	payload: unknown,
): Array<{ id: string; label: string }> {
	const out: Array<{ id: string; label: string }> = []
	for (const raw of itemsOf<T>(payload)) {
		const item = toListItem(raw)
		if (item) out.push(item)
	}
	return out
}

export const parseCameraList = (p: unknown): EcammCamera[] => parseSimpleList<RawCamera>(p)
export const parseVideoList = (p: unknown): EcammVideo[] => parseSimpleList<RawVideo>(p)
export const parseAudioFilterList = (p: unknown): EcammAudioFilter[] => parseSimpleList<RawAudioFilter>(p)
export const parseProfileList = (p: unknown): EcammProfile[] => parseSimpleList<RawProfile>(p)
export const parseChannelList = (p: unknown): EcammChannel[] => parseSimpleList<RawChannel>(p)

/**
 * Splits getSoundList into the sounds you can play and the folders you can play.
 *
 * Folders are entries carrying `Group: true` with their members nested in `Children`. Without
 * this, a folder looks like an ordinary sound - it has a title and a UUID - so it would appear in
 * the sound dropdown while the sounds inside it went missing entirely.
 *
 * The walk is recursive even though only one level of nesting has been observed, so a deeper
 * hierarchy still yields every playable sound.
 */
export function parseSoundList(payload: unknown): { sounds: EcammSound[]; folders: EcammSoundFolder[] } {
	const sounds: EcammSound[] = []
	const folders: EcammSoundFolder[] = []

	const walk = (items: RawSound[], folderName?: string): void => {
		for (const raw of items) {
			const base = toListItem(raw)
			if (!base) continue

			if (raw.Group === true) {
				const children = Array.isArray(raw.Children) ? raw.Children : []
				folders.push({ ...base, soundCount: countPlayable(children) })
				// Nested sounds are attributed to the folder they are directly inside.
				walk(children, base.label)
				continue
			}

			sounds.push({
				...base,
				duration: typeof raw.Duration === 'number' ? raw.Duration : 0,
				...(folderName ? { folderName } : {}),
			})
		}
	}

	walk(itemsOf<RawSound>(payload))
	return { sounds, folders }
}

function countPlayable(items: RawSound[]): number {
	let total = 0
	for (const item of items) {
		if (item.Group === true) total += countPlayable(Array.isArray(item.Children) ? item.Children : [])
		else if (item.UUID?.trim()) total++
	}
	return total
}

/** "Test Group / Triangle" for a nested sound, or just the name for a loose one. */
export function soundLabel(sound: EcammSound): string {
	return sound.folderName ? `${sound.folderName} / ${sound.label}` : sound.label
}

export function parseConnectionPermission(payload: unknown): ConnectionPermission {
	const value = unwrapScalar(payload).trim()
	// Anything unrecognised is treated as "not registered", which is the safe reading: it keeps
	// the module in its waiting-for-approval state rather than assuming access.
	return Object.values(ConnectionPermission).find((known) => String(known) === value) ?? ConnectionPermission.NotFound
}

/**
 * The document promises cam | screen | video, but a live install also answers "blank", so
 * unrecognised values are passed through rather than coerced.
 */
export function parseSourceMode(payload: unknown): SourceMode | undefined {
	const value = unwrapScalar(payload).trim().toLowerCase()
	return value === '' ? undefined : (value as SourceMode)
}
