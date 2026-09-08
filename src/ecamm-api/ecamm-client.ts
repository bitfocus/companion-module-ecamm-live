import type { AudioBus, SoundAction, SourceMode, ZoomPanel } from '../data-structures/ecamm-enums.js'
import { ConnectionPermission } from '../data-structures/ecamm-enums.js'
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
} from '../data-structures/ecamm-domain-types.js'
import {
	parseAudioFilterList,
	parseCameraList,
	parseChannelList,
	parseConnectionPermission,
	parseInfo,
	parseNumeric,
	parseOverlayList,
	parseProfileList,
	parseSceneList,
	parseSoundList,
	parseSourceMode,
	parseVideoList,
	unwrapScalar,
	yesNo,
} from '../data-structures/ecamm-parsers.js'
import type { EcammHttp } from './ecamm-http.js'

/**
 * One method per Ecamm endpoint, each returning its own typed result.
 *
 * This is what replaces the previous design, where a single sendCommand mutated shared state and
 * a switch guessed the response type from "the last command sent". That guess was wrong whenever
 * two requests overlapped. Here a reply can only ever be interpreted by the call that asked for
 * it, so overlapping requests are harmless.
 */
export class EcammClient {
	constructor(private readonly http: EcammHttp) {}

	// --- status -------------------------------------------------------------------------

	async getConnectionStatus(): Promise<ConnectionPermission> {
		return parseConnectionPermission(await this.http.get('getConnectionStatus'))
	}

	async getInfo(): Promise<EcammInfo> {
		return parseInfo(await this.http.get('getInfo'))
	}

	async getButtonLabel(): Promise<string> {
		return unwrapScalar(await this.http.get('getButtonLabel'))
	}

	async getPauseButtonLabel(): Promise<string> {
		return unwrapScalar(await this.http.get('getPauseButtonLabel'))
	}

	async getViewers(): Promise<number> {
		return parseNumeric(unwrapScalar(await this.http.get('getViewers'))) ?? 0
	}

	async getLiveDemo(): Promise<boolean> {
		return yesNo(unwrapScalar(await this.http.get('getLiveDemo')))
	}

	async getHideShowUI(): Promise<boolean> {
		return yesNo(unwrapScalar(await this.http.get('getHideShowUI')))
	}

	// --- lists --------------------------------------------------------------------------

	async getSceneList(): Promise<EcammScene[]> {
		return parseSceneList(await this.http.get('getSceneList'))
	}

	/** Current scene only - Ecamm cannot report overlays belonging to any other scene. */
	async getOverlayList(): Promise<EcammOverlay[]> {
		return parseOverlayList(await this.http.get('getOverlayList'))
	}

	async getInputs(): Promise<EcammCamera[]> {
		return parseCameraList(await this.http.get('getInputs'))
	}

	async getVideoList(): Promise<EcammVideo[]> {
		return parseVideoList(await this.http.get('getVideoList'))
	}

	/** One request yields both the playable sounds and the folders they are grouped into. */
	async getSoundList(): Promise<{ sounds: EcammSound[]; folders: EcammSoundFolder[] }> {
		return parseSoundList(await this.http.get('getSoundList'))
	}

	async getAudioFilterList(): Promise<EcammAudioFilter[]> {
		return parseAudioFilterList(await this.http.get('getAudioFilterList'))
	}

	async getProfileList(): Promise<EcammProfile[]> {
		return parseProfileList(await this.http.get('getProfileList'))
	}

	async getChannels(): Promise<EcammChannel[]> {
		return parseChannelList(await this.http.get('getChannels'))
	}

	// --- scalars ------------------------------------------------------------------------

	async getCurrentScene(): Promise<string> {
		return unwrapScalar(await this.http.get('getCurrentScene'))
	}

	async getCurrentMode(): Promise<SourceMode | undefined> {
		return parseSourceMode(await this.http.get('getCurrentMode'))
	}

	async getDefaultCamera(): Promise<string> {
		return unwrapScalar(await this.http.get('getDefaultCamera'))
	}

	/**
	 * Read directly by the adjust-volume action, which needs a fresh base rather than a status
	 * payload that may be a poll interval old. Everything else reads volume from getInfo.
	 */
	async getVolume(bus: AudioBus): Promise<number | undefined> {
		// Buses that are not wired up answer "N/A" rather than a number.
		return parseNumeric(unwrapScalar(await this.http.get('getVolume', { bus })))
	}

	// --- broadcast ----------------------------------------------------------------------

	async setClickButton(params: { channel?: string; title?: string; desc?: string } = {}): Promise<void> {
		await this.http.set('setClickButton', params)
	}

	setClickPauseButton = async (): Promise<void> => this.http.set('setClickPauseButton')
	setStartNewRecording = async (): Promise<void> => this.http.set('setStartNewRecording')
	setComment = async (text: string): Promise<void> => this.http.set('setComment', { text })
	setShowComment = async (): Promise<void> => this.http.set('setShowComment')
	setHideComment = async (): Promise<void> => this.http.set('setHideComment')

	setMarker = async (params: { text?: string; dialogbox: boolean }): Promise<void> =>
		this.http.set('setMarker', { text: params.text, dialogbox: params.dialogbox ? 'true' : 'false' })

	// --- scenes and sources ---------------------------------------------------------------

	setScene = async (id: string): Promise<void> => this.http.set('setScene', { id })
	setNext = async (): Promise<void> => this.http.set('setNext')
	setPrev = async (): Promise<void> => this.http.set('setPrev')
	setInput = async (id: string): Promise<void> => this.http.set('setInput', { id })
	setMode = async (mode: SourceMode): Promise<void> => this.http.set('setMode', { mode })
	setVideo = async (id: string): Promise<void> => this.http.set('setVideo', { id })
	setPIP = async (): Promise<void> => this.http.set('setPIP')
	setOverlay = async (id: string): Promise<void> => this.http.set('setOverlay', { id })

	// --- audio ----------------------------------------------------------------------------

	/**
	 * Undocumented: the v4.4 doc lists no parameters for setMute, but a live install honours the
	 * same `bus` values setVolume documents, and each bus mutes independently of the global mute.
	 * Omitting the bus keeps the documented global behaviour.
	 */
	setMute = async (bus?: AudioBus): Promise<void> => this.http.set('setMute', { bus })
	setVolume = async (bus: AudioBus, volume: number): Promise<void> => this.http.set('setVolume', { bus, volume })
	setAudioFilter = async (id: string): Promise<void> => this.http.set('setAudioFilter', { id })

	setSound = async (id: string, volume: number, action: SoundAction): Promise<void> =>
		this.http.set('setSound', { id, volume, action })

	setSoundVolume = async (volume: number): Promise<void> => this.http.set('setSoundVolume', { volume })
	setSoundStop = async (): Promise<void> => this.http.set('setSoundStop')
	setSoundPause = async (): Promise<void> => this.http.set('setSoundPause')

	// --- modes and profiles -----------------------------------------------------------------

	setPreviewMode = async (): Promise<void> => this.http.set('setPreviewMode')
	setPublish = async (): Promise<void> => this.http.set('setPublish')
	setProfile = async (id: string): Promise<void> => this.http.set('setProfile', { id })
	setLiveDemo = async (): Promise<void> => this.http.set('setLiveDemo')
	setHideShowUI = async (): Promise<void> => this.http.set('setHideShowUI')

	// --- Ecamm for Zoom ---------------------------------------------------------------------

	setZoomNew = async (pmi: boolean): Promise<void> => this.http.set('setZoomNew', { pmi: pmi ? 'true' : 'false' })
	setZoomLeave = async (end: boolean): Promise<void> => this.http.set('setZoomLeave', { end: end ? 'true' : 'false' })
	setZoomPanel = async (panel: ZoomPanel): Promise<void> => this.http.set('setZoomPanel', { panel })
	setZoomVideo = async (): Promise<void> => this.http.set('setZoomVideo')
	setZoomAudio = async (): Promise<void> => this.http.set('setZoomAudio')
	setZoomMuteAll = async (): Promise<void> => this.http.set('setZoomMuteAll')
	setZoomRaiseHand = async (): Promise<void> => this.http.set('setZoomRaiseHand')
	setZoomFullScreen = async (): Promise<void> => this.http.set('setZoomFullScreen')
	setZoomCloudRecord = async (): Promise<void> => this.http.set('setZoomCloudRecord')
	setZoomLocalRecord = async (): Promise<void> => this.http.set('setZoomLocalRecord')
	setZoomPauseRecord = async (): Promise<void> => this.http.set('setZoomPauseRecord')
	setZoomPrevGallery = async (): Promise<void> => this.http.set('setZoomPrevGallery')
	setZoomNextGallery = async (): Promise<void> => this.http.set('setZoomNextGallery')
	setZoomGallerySpeaker = async (): Promise<void> => this.http.set('setZoomGallerySpeaker')
	setSpotlightSelf = async (): Promise<void> => this.http.set('setSpotlightSelf')
}
