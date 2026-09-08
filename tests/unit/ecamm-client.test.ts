import { describe, expect, it, vi } from 'vitest'
import { EcammClient } from '../../src/ecamm-api/ecamm-client.js'
import { EcammHttp } from '../../src/ecamm-api/ecamm-http.js'
import { AudioBus, SoundAction, SourceMode, ZoomPanel } from '../../src/data-structures/ecamm-enums.js'
import { installFetchMock } from '../helpers/mock-fetch.js'
import { fixtureText } from '../helpers/fixture.js'

function makeClient(): EcammClient {
	return new EcammClient(
		new EcammHttp({
			host: 'ecamm.local:1234',
			uuid: 'u',
			clientName: 'c',
			clientVersion: '1',
			deviceName: 'd',
			timeoutMs: 1000,
			log: vi.fn(),
			verbose: false,
		}),
	)
}

describe('EcammClient reads', () => {
	it('returns typed domain objects, not raw payloads', async () => {
		installFetchMock({
			getSceneList: { body: fixtureText('getSceneList') },
			getOverlayList: { body: fixtureText('getOverlayList') },
			getInfo: { body: fixtureText('getInfo') },
		})
		const client = makeClient()

		const scenes = await client.getSceneList()
		expect(scenes[0]).toHaveProperty('label')
		expect(scenes.find((s) => s.current)?.label).toBe('Me + Guest Half')

		const overlays = await client.getOverlayList()
		expect(overlays[0].visible).toBe(true)

		expect((await client.getInfo()).viewers).toBe(0)
	})

	it('passes the bus through as a query parameter', async () => {
		const { calls } = installFetchMock({ getVolume: { body: fixtureText('getVolume-mic') } })
		expect(await makeClient().getVolume(AudioBus.Mic)).toBe(100)
		expect(calls[0].searchParams.get('bus')).toBe('mic')
	})

	it('reports an unavailable bus as unknown', async () => {
		installFetchMock({ getVolume: { body: fixtureText('getVolume-guest_2') } })
		expect(await makeClient().getVolume(AudioBus.Guest2)).toBeUndefined()
	})
})

describe('EcammClient writes', () => {
	/** Each entry: run the method, then assert the endpoint and query it produced. */
	const cases: Array<[string, (c: EcammClient) => Promise<void>, string, Record<string, string>]> = [
		['setScene', async (c) => c.setScene('scene-1'), 'setScene', { id: 'scene-1' }],
		['setNext', async (c) => c.setNext(), 'setNext', {}],
		['setInput', async (c) => c.setInput('GUEST_1'), 'setInput', { id: 'GUEST_1' }],
		['setMode', async (c) => c.setMode(SourceMode.Screen), 'setMode', { mode: 'screen' }],
		['setOverlay', async (c) => c.setOverlay('ov-1'), 'setOverlay', { id: 'ov-1' }],
		['setVolume', async (c) => c.setVolume(AudioBus.Movie, 42), 'setVolume', { bus: 'movie', volume: '42' }],
		['setMute (bus)', async (c) => c.setMute(AudioBus.SoundEffects), 'setMute', { bus: 'soundeffects' }],
		// No bus at all, rather than an empty one: that is what makes it the main mute.
		['setMute (main)', async (c) => c.setMute(), 'setMute', {}],
		[
			'setSound',
			async (c) => c.setSound('snd-1', 80, SoundAction.Loop),
			'setSound',
			{ id: 'snd-1', volume: '80', action: 'loop' },
		],
		['setSoundVolume', async (c) => c.setSoundVolume(10), 'setSoundVolume', { volume: '10' }],
		['setProfile', async (c) => c.setProfile('p-1'), 'setProfile', { id: 'p-1' }],
		['setZoomPanel', async (c) => c.setZoomPanel(ZoomPanel.Chat), 'setZoomPanel', { panel: 'chat' }],
		['setZoomNew', async (c) => c.setZoomNew(false), 'setZoomNew', { pmi: 'false' }],
		['setZoomLeave', async (c) => c.setZoomLeave(true), 'setZoomLeave', { end: 'true' }],
	]

	it.each(cases)('%s hits the right endpoint with the right parameters', async (_name, run, endpoint, params) => {
		const { calls } = installFetchMock({ [endpoint]: { body: 'Done' } })
		await run(makeClient())

		expect(calls[0].pathname).toBe(`/${endpoint}`)
		for (const [key, value] of Object.entries(params)) {
			expect(calls[0].searchParams.get(key)).toBe(value)
		}
	})

	it('sends marker text and the dialog flag', async () => {
		const { calls } = installFetchMock({ setMarker: { body: 'Done' } })
		await makeClient().setMarker({ text: 'Act Two', dialogbox: false })

		expect(calls[0].searchParams.get('text')).toBe('Act Two')
		expect(calls[0].searchParams.get('dialogbox')).toBe('false')
		// The raw query must use %20; "+" would reach Ecamm as a literal plus sign.
		expect(calls[0].search).toContain('text=Act%20Two')
	})

	it('omits the optional broadcast parameters when they are not supplied', async () => {
		const { calls } = installFetchMock({ setClickButton: { body: 'Done' } })
		await makeClient().setClickButton({})
		expect(calls[0].search).toBe('')
	})
})
