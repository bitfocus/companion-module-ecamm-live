/**
 * Fixed vocabularies from the Ecamm Live Remote API v4.4 document, plus the values observed on a
 * live install that the document does not mention.
 */

/** Audio buses accepted by getVolume/setVolume. */
export enum AudioBus {
	Mic = 'mic',
	Mic2 = 'mic2',
	Skype = 'skype',
	SystemAudio = 'system audio',
	Interview = 'interview',
	Zoom = 'zoom',
	SoundEffects = 'soundeffects',
	Movie = 'movie',
	Guest1 = 'guest_1',
	Guest2 = 'guest_2',
	Guest3 = 'guest_3',
	Guest4 = 'guest_4',
}

export const AUDIO_BUS_LABELS: Record<AudioBus, string> = {
	[AudioBus.Mic]: 'Microphone',
	[AudioBus.Mic2]: 'Microphone 2',
	[AudioBus.Skype]: 'Skype',
	[AudioBus.SystemAudio]: 'System Audio',
	[AudioBus.Interview]: 'Interview',
	[AudioBus.Zoom]: 'Zoom',
	[AudioBus.SoundEffects]: 'Sound Effects',
	[AudioBus.Movie]: 'Movie',
	[AudioBus.Guest1]: 'Guest 1',
	[AudioBus.Guest2]: 'Guest 2',
	[AudioBus.Guest3]: 'Guest 3',
	[AudioBus.Guest4]: 'Guest 4',
}

export const ALL_AUDIO_BUSES: AudioBus[] = Object.values(AudioBus)

/**
 * The bus name reduced to a form a variable id accepts.
 *
 * Companion permits alphanumerics and underscores only, so "system audio" would be rejected
 * outright. Shared rather than re-derived: the presets build their button text from
 * `volume_${busKey(bus)}`, and if that ever drifted from the id the variable catalogue registers,
 * every affected button would silently render an empty level.
 */
export function busKey(bus: AudioBus): string {
	return bus.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()
}

/**
 * getInfo reports mute/volume per bus using an upper-cased suffix, for every bus the machine
 * actually has. A live capture reported MIC, MOVIE, SOUNDEFFECTS and ZOOM, because nothing else
 * was connected at the time - the guest buses turn up as soon as a Zoom or Interview guest joins.
 * All twelve are mapped here so the parser picks up whichever ones a given machine reports.
 */
export const AUDIO_BUS_INFO_SUFFIX: Record<AudioBus, string> = {
	[AudioBus.Mic]: 'MIC',
	[AudioBus.Mic2]: 'MIC2',
	[AudioBus.Skype]: 'SKYPE',
	[AudioBus.SystemAudio]: 'SYSTEMAUDIO',
	[AudioBus.Interview]: 'INTERVIEW',
	[AudioBus.Zoom]: 'ZOOM',
	[AudioBus.SoundEffects]: 'SOUNDEFFECTS',
	[AudioBus.Movie]: 'MOVIE',
	[AudioBus.Guest1]: 'GUEST_1',
	[AudioBus.Guest2]: 'GUEST_2',
	[AudioBus.Guest3]: 'GUEST_3',
	[AudioBus.Guest4]: 'GUEST_4',
}

/**
 * The document lists cam | screen | video. A live install also returns "blank", so this is
 * treated as an open string set rather than a closed union.
 */
export enum SourceMode {
	Cam = 'cam',
	Screen = 'screen',
	Video = 'video',
	Blank = 'blank',
}

export const SOURCE_MODE_CHOICES = [
	{ id: SourceMode.Cam, label: 'Camera' },
	{ id: SourceMode.Screen, label: 'Screen' },
	{ id: SourceMode.Video, label: 'Video' },
]

/** Playback behaviour for setSound. */
export enum SoundAction {
	Stop = 'stop',
	Loop = 'loop',
	Restart = 'restart',
}

export const SOUND_ACTION_CHOICES = [
	{ id: SoundAction.Stop, label: 'Stop' },
	{ id: SoundAction.Loop, label: 'Loop' },
	{ id: SoundAction.Restart, label: 'Restart' },
]

/** Panels that setZoomPanel can show or hide. */
export enum ZoomPanel {
	Meeting = 'meeting',
	Chat = 'chat',
	Participants = 'participants',
	Share = 'share',
}

export const ZOOM_PANEL_CHOICES = [
	{ id: ZoomPanel.Meeting, label: 'Meeting' },
	{ id: ZoomPanel.Chat, label: 'Chat' },
	{ id: ZoomPanel.Participants, label: 'Participants' },
	{ id: ZoomPanel.Share, label: 'Share' },
]

/** Result of getConnectionStatus - this client's entry in Ecamm's Remote Control list. */
export enum ConnectionPermission {
	Allowed = 'Allowed',
	Denied = 'Denied',
	Pending = 'Pending',
	NotFound = 'Not Found',
}
