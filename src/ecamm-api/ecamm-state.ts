import type { AudioBus } from '../data-structures/ecamm-enums.js'
import { ConnectionPermission, SourceMode } from '../data-structures/ecamm-enums.js'
import type {
	EcammAudioFilter,
	EcammCamera,
	EcammChannel,
	EcammInfo,
	EcammListItem,
	EcammOverlay,
	EcammProfile,
	EcammScene,
	EcammSound,
	EcammSoundFolder,
	EcammVideo,
	ListKey,
	StateChangeSet,
} from '../data-structures/ecamm-domain-types.js'
import { emptyChangeSet } from '../data-structures/ecamm-domain-types.js'
import { defaultInfo } from '../data-structures/ecamm-defaults.js'
import { sceneLabel } from '../data-structures/ecamm-parsers.js'
import { FeedbackIdAudio } from '../feedbacks/feedback-audio.js'
import { FeedbackIdBroadcast } from '../feedbacks/feedback-broadcast.js'
import { FeedbackIdOverlay } from '../feedbacks/feedback-overlay.js'
import { FeedbackIdScene } from '../feedbacks/feedback-scene.js'
import { FeedbackIdSource } from '../feedbacks/feedback-source.js'
import { FeedbackIdUtility } from '../feedbacks/feedback-utility.js'
import { FeedbackIdZoom } from '../feedbacks/feedback-zoom.js'

/**
 * Everything the module knows about the connected Ecamm Live, plus the change detection that
 * decides how expensively to react.
 *
 * Companion captures a dropdown's `choices` when a definition is registered, so new device data
 * only becomes visible if definitions are rebuilt. That is costly, so it must happen when a list
 * genuinely changed rather than on every poll - hence the signature comparison below.
 */
export class EcammState {
	info: EcammInfo = defaultInfo()

	scenes: EcammScene[] = []
	/** Current scene only. Ecamm exposes no way to list another scene's overlays. */
	overlays: EcammOverlay[] = []
	cameras: EcammCamera[] = []
	videos: EcammVideo[] = []
	/** Playable sounds only, flattened out of their folders. */
	sounds: EcammSound[] = []
	/** The folders themselves, which Ecamm can play as a unit. */
	soundFolders: EcammSoundFolder[] = []
	audioFilters: EcammAudioFilter[] = []
	profiles: EcammProfile[] = []
	channels: EcammChannel[] = []

	/**
	 * The "ip:port" Companion handed us. Worth exposing, because Companion's Bonjour list labels
	 * every machine with the service name only - two Macs both running Ecamm appear as
	 * "Ecamm Live Remote" and "Ecamm Live Remote (2)", which says nothing about which is which.
	 */
	host = ''

	sourceMode: SourceMode | undefined
	defaultCameraId = ''
	permission: ConnectionPermission = ConnectionPermission.NotFound
	connected = false
	lastError: string | undefined

	/** Guards the one-time report of unrecognised getInfo keys. */
	private reportedUnmappedKeys = false

	applyInfo(next: EcammInfo): StateChangeSet {
		const changes = emptyChangeSet()
		const previous = this.info
		this.info = next

		/** Records that a field moved, along with the feedbacks that read it. */
		const moved = (didChange: boolean, ...feedbacks: string[]): void => {
			if (!didChange) return
			changes.values = true
			for (const id of feedbacks) changes.feedbacks.add(id)
		}

		moved(
			previous.buttonLabel !== next.buttonLabel,
			FeedbackIdBroadcast.buttonLabelMatches,
			FeedbackIdBroadcast.isBroadcasting,
		)
		moved(previous.pauseButtonLabel !== next.pauseButtonLabel, FeedbackIdBroadcast.isPaused)
		moved(previous.currentSceneId !== next.currentSceneId, FeedbackIdScene.sceneActive)
		// Exposed as a variable only; no feedback reads it, so nothing needs re-evaluating.
		moved(previous.currentSceneOrigId !== next.currentSceneOrigId)
		moved(previous.viewers !== next.viewers, FeedbackIdBroadcast.viewersAtOrAbove)
		moved(previous.mute !== next.mute, FeedbackIdAudio.muted)
		moved(previous.previewMode !== next.previewMode, FeedbackIdUtility.previewModeActive)
		moved(previous.hidingUi !== next.hidingUi, FeedbackIdUtility.uiHidden)
		moved(previous.liveDemo !== next.liveDemo, FeedbackIdUtility.liveDemoActive)
		moved(!sameRecord(previous.volumes, next.volumes), FeedbackIdAudio.volumeAtOrAbove)
		moved(!sameRecord(previous.mutes, next.mutes), FeedbackIdAudio.busMuted)
		moved(!sameZoom(previous, next), ...Object.values(FeedbackIdZoom))

		// The live scene is also flagged inside the scene list, so keep the two consistent
		// without waiting for the much slower list refresh.
		if (previous.currentSceneId !== next.currentSceneId) {
			this.reflagCurrentScene(next.currentSceneId)
		}

		return changes
	}

	/**
	 * Records the live scene without a full status payload.
	 *
	 * Used by the immediate path after a scene command, where getCurrentScene has already told us
	 * the answer - there is no reason to make the tally wait for the next getInfo.
	 *
	 * Callers must pair this with an overlay refetch. It reports no `definitions` change of its
	 * own, and the fixed overlay presets describe the live scene's overlays, so a caller that
	 * moves the scene without refetching would leave them describing the previous one.
	 */
	setCurrentScene(id: string): StateChangeSet {
		const changes = emptyChangeSet()
		if (this.info.currentSceneId === id) return changes

		this.info = { ...this.info, currentSceneId: id }
		this.reflagCurrentScene(id)
		changes.values = true
		changes.feedbacks.add(FeedbackIdScene.sceneActive)
		return changes
	}

	private reflagCurrentScene(id: string): void {
		for (const scene of this.scenes) {
			scene.current = scene.id === id
		}
	}

	/**
	 * Replaces a list and reports whether anything a dropdown would show actually moved. A poll
	 * returning the same entries in the same order costs nothing.
	 */
	applyList(key: ListKey, next: EcammListItem[]): StateChangeSet {
		const changes = emptyChangeSet()
		const before = signatureOf(this[key])
		const after = signatureOf(next)

		if (key === 'overlays' && before === after && visibilityChanged(this.overlays, next as EcammOverlay[])) {
			// Toggling an overlay changes only its visible flag, which the identity signature
			// deliberately ignores - but the overlay feedback depends on it.
			changes.values = true
			changes.feedbacks.add(FeedbackIdOverlay.overlayVisible)
		}

		assignList(this, key, next)

		// Ecamm omits CURRENT entirely while a grouped scene is live, so the flag from the list
		// cannot be trusted. The status payload is authoritative about which scene is live.
		if (key === 'scenes') this.reflagCurrentScene(this.info.currentSceneId)

		if (before !== after) {
			changes.definitions = true
			changes.values = true
		}
		return changes
	}

	setSourceMode(mode: SourceMode | undefined): StateChangeSet {
		const changes = emptyChangeSet()
		if (this.sourceMode !== mode) {
			this.sourceMode = mode
			changes.values = true
			changes.feedbacks.add(FeedbackIdSource.sourceModeIs)
		}
		return changes
	}

	setDefaultCamera(id: string): StateChangeSet {
		const changes = emptyChangeSet()
		if (this.defaultCameraId !== id) {
			this.defaultCameraId = id
			changes.values = true
			changes.feedbacks.add(FeedbackIdSource.cameraIsDefault)
		}
		return changes
	}

	/**
	 * The status payload is the only source. It reports every bus the machine actually has - the
	 * Zoom and Interview guest buses included, once a guest is connected - so undefined means the
	 * bus is not there, not that nothing has read it yet.
	 */
	volumeOf(bus: AudioBus): number | undefined {
		return this.info.volumes[bus]
	}

	/** See volumeOf: undefined means the machine does not have this bus. */
	muteOf(bus: AudioBus): boolean | undefined {
		return this.info.mutes[bus]
	}

	sceneById(id: string): EcammScene | undefined {
		return this.scenes.find((scene) => scene.id === id)
	}

	overlayById(id: string): EcammOverlay | undefined {
		return this.overlays.find((overlay) => overlay.id === id)
	}

	currentSceneName(): string {
		const scene = this.sceneById(this.info.currentSceneId)
		return scene ? sceneLabel(scene) : ''
	}

	/**
	 * getInfo keys this module does not understand, returned once. A future Ecamm release that
	 * adds fields surfaces here instead of being silently dropped.
	 */
	takeUnreportedKeys(): string[] {
		if (this.reportedUnmappedKeys || this.info.unmappedKeys.length === 0) return []
		this.reportedUnmappedKeys = true
		return this.info.unmappedKeys
	}
}

/** Keeps the ListKey-to-array-type relationship in one place instead of at every call site. */
function assignList(state: EcammState, key: ListKey, next: EcammListItem[]): void {
	switch (key) {
		case 'scenes':
			state.scenes = next as EcammScene[]
			return
		case 'overlays':
			state.overlays = next as EcammOverlay[]
			return
		case 'cameras':
			state.cameras = next
			return
		case 'videos':
			state.videos = next
			return
		case 'sounds':
			state.sounds = next as EcammSound[]
			return
		case 'soundFolders':
			state.soundFolders = next as EcammSoundFolder[]
			return
		case 'audioFilters':
			state.audioFilters = next
			return
		case 'profiles':
			state.profiles = next
			return
		case 'channels':
			state.channels = next
			return
	}
}

/**
 * Identity and label only. Ordering counts, because a dropdown shows entries in order; volatile
 * per-item flags such as an overlay's visibility deliberately do not, or every overlay toggle
 * would force a full re-registration.
 */
export function signatureOf(items: EcammListItem[]): string {
	return items.map((item) => `${item.id}=${item.label}`).join('|')
}

function visibilityChanged(previous: EcammOverlay[], next: EcammOverlay[]): boolean {
	if (previous.length !== next.length) return true
	return next.some((overlay, index) => previous[index]?.visible !== overlay.visible)
}

function sameRecord<T>(a: Partial<Record<AudioBus, T>>, b: Partial<Record<AudioBus, T>>): boolean {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<AudioBus>
	for (const key of keys) {
		if (a[key] !== b[key]) return false
	}
	return true
}

function sameZoom(a: EcammInfo, b: EcammInfo): boolean {
	const left = a.zoom
	const right = b.zoom
	return (
		left.inMeeting === right.inMeeting &&
		left.muted === right.muted &&
		left.handRaised === right.handRaised &&
		left.camOn === right.camOn &&
		left.cloudRecording === right.cloudRecording &&
		left.localRecording === right.localRecording &&
		left.recordingPaused === right.recordingPaused &&
		left.hosting === right.hosting
	)
}
