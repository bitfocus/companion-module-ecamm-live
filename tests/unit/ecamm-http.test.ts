import { describe, expect, it, vi } from 'vitest'
import { EcammHttp, buildQuery, type HttpLogger } from '../../src/ecamm-api/ecamm-http.js'
import { EcammHttpError, EcammParseError } from '../../src/ecamm-api/ecamm-errors.js'
import { installFetchMock } from '../helpers/mock-fetch.js'

function makeHttp(overrides: Partial<{ log: HttpLogger; verbose: boolean }> = {}): EcammHttp {
	return new EcammHttp({
		host: 'ecamm.local:1234',
		uuid: 'test-uuid',
		clientName: 'Bitfocus Companion',
		clientVersion: '4.0.0',
		deviceName: 'test-device',
		timeoutMs: 1000,
		log: vi.fn(),
		verbose: false,
		...overrides,
	})
}

describe('buildQuery', () => {
	it('encodes a space as %20, not +', () => {
		// Ecamm is a Cocoa app and does not decode "+" back into a space, so URLSearchParams
		// would silently corrupt marker text and any file path containing a space.
		expect(buildQuery({ text: 'Act Two' })).toBe('?text=Act%20Two')
		expect(buildQuery({ bus: 'system audio' })).toBe('?bus=system%20audio')
	})

	it('escapes characters that would otherwise break the query', () => {
		expect(buildQuery({ id: '/Users/me/My Video&x.mov' })).toBe('?id=%2FUsers%2Fme%2FMy%20Video%26x.mov')
	})

	it('omits undefined and empty values instead of sending blanks', () => {
		expect(buildQuery({ a: 'x', b: undefined, c: '' })).toBe('?a=x')
		expect(buildQuery({})).toBe('')
		expect(buildQuery(undefined)).toBe('')
	})

	it('keeps numbers and booleans', () => {
		expect(buildQuery({ volume: 50, dialogbox: true })).toBe('?volume=50&dialogbox=true')
	})
})

describe('EcammHttp', () => {
	it('sends the four headers the Remote API requires', async () => {
		const { headers } = installFetchMock({ getInfo: { body: '{}' } })
		await makeHttp().get('getInfo')

		expect(headers[0]).toMatchObject({
			'User-Agent': 'Bitfocus Companion/4.0.0',
			'EcammLive-UUID': 'test-uuid',
			'EcammLive-ClientName': 'Bitfocus Companion',
			'EcammLive-DeviceName': 'test-device',
		})
	})

	it('builds the URL from the host and endpoint', async () => {
		const { calls } = installFetchMock({ setScene: { body: 'Done' } })
		await makeHttp().set('setScene', { id: 'abc' })

		expect(calls[0].host).toBe('ecamm.local:1234')
		expect(calls[0].pathname).toBe('/setScene')
		expect(calls[0].searchParams.get('id')).toBe('abc')
	})

	it('accepts the bare "Done" body that every set endpoint returns', async () => {
		// res.json() would throw here, which is why set() never parses.
		installFetchMock({ setMute: { body: 'Done' } })
		await expect(makeHttp().set('setMute')).resolves.toBeUndefined()
	})

	it('throws a typed error carrying the status and a body snippet', async () => {
		installFetchMock({ getInfo: { status: 500, body: 'kaboom' } })
		await expect(makeHttp().get('getInfo')).rejects.toBeInstanceOf(EcammHttpError)

		try {
			await makeHttp().get('getInfo')
		} catch (error) {
			expect(error).toMatchObject({ endpoint: 'getInfo', status: 500, bodySnippet: 'kaboom' })
		}
	})

	it('reports an unparseable body rather than a generic syntax error', async () => {
		installFetchMock({ getInfo: { body: 'not json at all' } })
		await expect(makeHttp().get('getInfo')).rejects.toBeInstanceOf(EcammParseError)
	})

	it('parses a JSON body into the requested type', async () => {
		installFetchMock({ getInfo: { body: '{"Mute":"yes"}' } })
		expect(await makeHttp().get('getInfo')).toEqual({ Mute: 'yes' })
	})

	it('surfaces an unknown endpoint as a 404 error', async () => {
		installFetchMock({})
		await expect(makeHttp().get('somethingElse')).rejects.toBeInstanceOf(EcammHttpError)
	})
})

describe('verbose logging', () => {
	/** Roughly 34 KB: far past the old 200-character cap, comfortably inside the new one. */
	const bigBody = JSON.stringify({ items: Array.from({ length: 2000 }, (_, i) => ({ UUID: `id-${i}` })) })

	const logged = (log: HttpLogger) => (log as unknown as { mock: { calls: string[][] } }).mock.calls.map((c) => c[1])

	it('logs the whole response, not a snippet of it', async () => {
		// The point of turning verbose logging on is reading what Ecamm actually sent. A response
		// clipped at 200 characters made every list endpoint - the ones worth inspecting - useless.
		const log = vi.fn()
		installFetchMock({ getSceneList: { body: bigBody } })
		await makeHttp({ log, verbose: true }).raw('getSceneList')

		const line = logged(log).find((message) => message.startsWith('getSceneList ->'))!
		expect(line).toBe(`getSceneList -> ${bigBody}`)
		expect(JSON.parse(line.slice('getSceneList -> '.length))).toMatchObject({ items: expect.any(Array) })
	})

	it('says so when a body really is too big to print', async () => {
		const huge = 'x'.repeat(70_000)
		const log = vi.fn()
		installFetchMock({ getSceneImage: { body: huge } })
		await makeHttp({ log, verbose: true }).raw('getSceneImage')

		// Never trail off mid-payload: a cut body must not read as the whole thing.
		const line = logged(log).find((message) => message.startsWith('getSceneImage ->'))!
		expect(line).toContain('[truncated, 6000 more characters]')
	})

	it('keeps error snippets short, which is a different job', async () => {
		installFetchMock({ getInfo: { status: 500, body: 'e'.repeat(1000) } })
		try {
			await makeHttp().get('getInfo')
		} catch (error) {
			expect((error as EcammHttpError).bodySnippet).toHaveLength(200)
		}
	})

	it('stays quiet when verbose logging is off', async () => {
		const log = vi.fn()
		installFetchMock({ getSceneList: { body: bigBody } })
		await makeHttp({ log }).raw('getSceneList')

		expect(logged(log)).toEqual([])
	})
})
