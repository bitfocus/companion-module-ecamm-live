import { describe, expect, it } from 'vitest'
import { AudioBus, ConnectionPermission, SourceMode } from '../../src/data-structures/ecamm-enums.js'
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
} from '../../src/data-structures/ecamm-parsers.js'
import { loadFixture } from '../helpers/fixture.js'

describe('scalar handling', () => {
	it('unwraps the single-element arrays every scalar endpoint returns', () => {
		expect(unwrapScalar(loadFixture('getMute'))).toBe('no')
		expect(unwrapScalar(loadFixture('getViewers'))).toBe('0')
		expect(unwrapScalar(loadFixture('getCurrentScene'))).toBe('8A1DB264-FD68-4B20-973D-62B051A87E0E')
	})

	it('tolerates a bare string, in case the array wrapper ever goes away', () => {
		expect(unwrapScalar('yes')).toBe('yes')
	})

	it('returns empty rather than "[object Object]" for values with no scalar reading', () => {
		expect(unwrapScalar({ a: 1 })).toBe('')
		expect(unwrapScalar(null)).toBe('')
		expect(unwrapScalar([])).toBe('')
	})

	it('reads yes/no as booleans', () => {
		expect(yesNo('yes')).toBe(true)
		expect(yesNo('no')).toBe(false)
		expect(yesNo(undefined)).toBe(false)
	})

	it('treats a non-numeric volume as unknown rather than zero', () => {
		// Buses the machine does not have answer "N/A"; reporting that as 0 would be a lie.
		expect(parseNumeric(unwrapScalar(loadFixture('getVolume-guest_2')))).toBeUndefined()
		expect(parseNumeric(unwrapScalar(loadFixture('getVolume-mic')))).toBe(100)
	})
})

describe('parseInfo', () => {
	const info = parseInfo(loadFixture('getInfo'))

	it('reads the current scene as a UUID', () => {
		expect(info.currentSceneId).toBe('8A1DB264-FD68-4B20-973D-62B051A87E0E')
	})

	it('exposes the undocumented pre-switch scene', () => {
		expect(info.currentSceneOrigId).toBe('8D5710AE-ED92-4B4F-BA30-8F1A0C81EA03')
	})

	it('picks up only the buses this machine reports', () => {
		expect(info.volumes[AudioBus.Mic]).toBe(100)
		expect(info.volumes[AudioBus.SoundEffects]).toBe(59)
		expect(info.mutes[AudioBus.Mic]).toBe(false)
		// Not present in the payload, so it must stay undefined rather than defaulting.
		expect(info.volumes[AudioBus.Skype]).toBeUndefined()
		expect(info.mutes[AudioBus.Interview]).toBeUndefined()
	})

	it('forces every Zoom flag false when no meeting is running', () => {
		expect(info.zoom.inMeeting).toBe(false)
		expect(info.zoom.hosting).toBe(false)
	})

	it('reads Zoom flags when a meeting is running', () => {
		const zoom = parseInfo({ ZoomInMeeting: 'yes', ZoomMuted: 'yes', ZoomHosting: 'no' })
		expect(zoom.zoom.inMeeting).toBe(true)
		expect(zoom.zoom.muted).toBe(true)
		expect(zoom.zoom.hosting).toBe(false)
	})

	it('ignores stale Zoom flags once the meeting has ended', () => {
		const zoom = parseInfo({ ZoomInMeeting: 'no', ZoomMuted: 'yes' })
		expect(zoom.zoom.muted).toBe(false)
	})

	it('accounts for every key in the captured payload', () => {
		// A future Ecamm release that adds fields should show up here rather than being dropped.
		expect(info.unmappedKeys).toEqual([])
	})

	it('reports genuinely unknown keys', () => {
		expect(parseInfo({ SomeNewField: 'x' }).unmappedKeys).toEqual(['SomeNewField'])
	})
})

describe('list parsing', () => {
	it('flags the live scene', () => {
		// 12 ungrouped scenes plus the 2 lifted out of the group.
		const scenes = parseSceneList(loadFixture('getSceneList'))
		expect(scenes).toHaveLength(14)
		expect(scenes.filter((s) => s.current)).toHaveLength(1)
		expect(scenes.find((s) => s.current)?.label).toBe('Me + Guest Half')
	})

	it('reads overlay visibility from the Visible flag', () => {
		const overlays = parseOverlayList(loadFixture('getOverlayList'))
		expect(overlays).toHaveLength(3)
		expect(overlays.every((o) => o.visible)).toBe(true)
		expect(overlays.some((o) => o.isComment)).toBe(true)
	})

	it('keeps camera ids verbatim, since they are frequently not UUIDs', () => {
		const cameras = parseCameraList(loadFixture('getInputs'))
		const ids = cameras.map((c) => c.id)
		expect(ids).toContain('PLACEHOLDER_CAMERA_000001')
		expect(ids).toContain('GUEST_1')
		expect(ids).toContain('ZOOM_ACTIVE_SPEAKER')
		expect(ids).toContain('0x0000000019f7006b')
	})

	it('drops the placeholder entry Ecamm returns for an empty video history', () => {
		// The raw payload has one item titled "-No recent items-" with an empty UUID, which must
		// never reach a dropdown.
		expect(parseVideoList(loadFixture('getVideoList'))).toEqual([])
	})

	it('parses sounds with their duration', () => {
		const { sounds } = parseSoundList(loadFixture('getSoundList'))
		expect(sounds[0].label).toBe('Applause')
		expect(sounds[0].duration).toBeGreaterThan(0)
	})

	it('handles the lists that were empty on the captured machine', () => {
		expect(parseAudioFilterList(loadFixture('getAudioFilterList'))).toEqual([])
		expect(parseChannelList(loadFixture('getChannels'))).toEqual([])
		expect(parseProfileList(loadFixture('getProfileList'))).toHaveLength(2)
	})
})

describe('enumerated values', () => {
	it('reads the connection permission', () => {
		expect(parseConnectionPermission(loadFixture('getConnectionStatus'))).toBe(ConnectionPermission.Allowed)
		expect(parseConnectionPermission(['Pending'])).toBe(ConnectionPermission.Pending)
	})

	it('falls back to Not Found for anything unrecognised, rather than assuming access', () => {
		expect(parseConnectionPermission(['Nonsense'])).toBe(ConnectionPermission.NotFound)
	})

	it('passes through source modes the documentation does not list', () => {
		// A live install returned "blank", which the v4.4 document never mentions.
		expect(parseSourceMode(loadFixture('getCurrentMode'))).toBe('blank')
		expect(parseSourceMode(['cam'])).toBe(SourceMode.Cam)
	})
})
