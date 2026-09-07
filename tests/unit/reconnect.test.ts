import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EcammApi } from '../../src/ecamm-api/ecamm-api.js'
import type { DiscoveredEcamm } from '../../src/ecamm-api/ecamm-discovery.js'
import { createMockInstance } from '../helpers/mock-instance.js'
import { installFetchMock } from '../helpers/mock-fetch.js'
import { fixtureText } from '../helpers/fixture.js'

const OLD_HOST = '192.168.8.199:58049'
const NEW_PORT = 59395

const MAC: DiscoveredEcamm = {
	name: 'Ecamm Live Remote',
	hostname: 'LYNBHs-Mac-Studio-2.local',
	addresses: ['192.168.8.199', '192.168.8.129'],
	port: NEW_PORT,
}
const OTHER_MAC: DiscoveredEcamm = {
	name: 'Ecamm Live Remote (2)',
	hostname: 'LYNBHs-Mac-Studio.local',
	addresses: ['192.168.8.118'],
	port: 59089,
}

/**
 * Ecamm binds a new port every launch, so restarting it leaves the stored address pointing at
 * nothing. Discovery is injected here; a unit test must never open a multicast socket.
 */
function setup(found: DiscoveredEcamm[], config: Record<string, unknown> = {}) {
	installFetchMock({}) // every request 404s, standing in for a dead port
	const discover = vi.fn(async () => found)
	const { instance } = createMockInstance({
		config: { ecammHost: OLD_HOST, ecammHostname: 'LYNBHs-Mac-Studio-2.local', ...config },
	})
	const api = new EcammApi(instance, { discover })
	;(instance as unknown as { ecammApi: EcammApi }).ecammApi = api
	return { api, instance, discover }
}

const rediscover = async (api: EcammApi) =>
	(api as unknown as { attemptRediscovery: () => Promise<void> }).attemptRediscovery()

/**
 * Private, and normally reached via connect(), which deliberately does not await it.
 */
const learnIdentity = async (api: EcammApi) =>
	(api as unknown as { learnIdentity: () => Promise<void> }).learnIdentity()

describe('following Ecamm to a new port', () => {
	it('swaps the address when only the port moved', async () => {
		const { api, instance } = setup([MAC])
		await rediscover(api)

		expect(api.state.host).toBe(`192.168.8.199:${NEW_PORT}`)
		expect(instance.log).toHaveBeenCalledWith('info', expect.stringContaining('moved to'))
	})

	it('persists the new address without forcing a reconnect', async () => {
		const { api, instance } = setup([MAC])
		await rediscover(api)

		// persistDiscoveredHost updates config in place before saving, so configUpdated sees no
		// change and does not tear down the api we just repointed.
		expect(instance.persistDiscoveredHost).toHaveBeenCalledWith(`192.168.8.199:${NEW_PORT}`, MAC.hostname, MAC.name)
	})

	it('keeps the interface it was configured with', async () => {
		// The Mac answers on both Ethernet and Wi-Fi; a reconnect must not silently move NICs.
		const { api } = setup([MAC])
		await rediscover(api)
		expect(api.state.host.startsWith('192.168.8.199:')).toBe(true)
	})

	it('follows the machine when its address changed too', async () => {
		const moved: DiscoveredEcamm = { ...MAC, addresses: ['10.0.0.42'] }
		const { api } = setup([moved])
		await rediscover(api)

		expect(api.state.host).toBe(`10.0.0.42:${NEW_PORT}`)
	})

	it('never hops to a different machine', async () => {
		const { api, instance } = setup([OTHER_MAC])
		await rediscover(api)

		// Neither the hostname nor the address matches, so nothing should happen at all.
		expect(api.state.host).toBe(OLD_HOST)
		expect(instance.persistDiscoveredHost).not.toHaveBeenCalled()
	})

	it('does nothing when the address has not actually changed', async () => {
		const unchanged: DiscoveredEcamm = { ...MAC, port: 58049 }
		const { api, instance } = setup([unchanged])
		await rediscover(api)

		expect(instance.persistDiscoveredHost).not.toHaveBeenCalled()
	})

	it('matches by address when the hostname was never recorded', async () => {
		const { api } = setup([MAC], { ecammHostname: undefined })
		await rediscover(api)

		expect(api.state.host).toBe(`192.168.8.199:${NEW_PORT}`)
	})
})

describe('the rediscovery timer', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => vi.useRealTimers())

	const start = (api: EcammApi) => (api as unknown as { startRediscovery: () => void }).startRediscovery()
	const isArmed = (api: EcammApi) =>
		(api as unknown as { rediscoverTimer: NodeJS.Timeout | undefined }).rediscoverTimer !== undefined

	it('keeps looking while disconnected', async () => {
		const { api, discover } = setup([MAC])
		start(api)

		await vi.advanceTimersByTimeAsync(10_000)
		expect(discover).toHaveBeenCalledTimes(1)

		// Still disconnected, so it books another attempt rather than giving up.
		await vi.advanceTimersByTimeAsync(10_000)
		expect(discover).toHaveBeenCalledTimes(2)
		await api.destroy()
	})

	it('does not stack attempts', async () => {
		const { api, discover } = setup([MAC])
		start(api)
		start(api)
		start(api)

		await vi.advanceTimersByTimeAsync(10_000)
		expect(discover).toHaveBeenCalledTimes(1)
		await api.destroy()
	})

	it('stops once reconnected', async () => {
		const { api } = setup([MAC])
		start(api)
		expect(isArmed(api)).toBe(true)
		;(api as unknown as { handleRecovery: () => void }).handleRecovery()

		expect(isArmed(api)).toBe(false)
	})

	it('is cleared by destroy', async () => {
		const { api } = setup([MAC])
		start(api)
		await api.destroy()

		expect(isArmed(api)).toBe(false)
		await vi.advanceTimersByTimeAsync(60_000)
	})
})

/**
 * Finding the new port is only half of it. A relaunched Ecamm can have forgotten this client,
 * and an unapproved getInfo answers with an empty {} rather than an error - so a rediscovery that
 * merely re-pointed the transport would leave the module looking connected while holding nothing.
 */
describe('reconnecting after rediscovery', () => {
	function connectable(found: DiscoveredEcamm[], permission = '["Allowed"]') {
		const { calls } = installFetchMock({
			getConnectionStatus: { body: permission },
			getInfo: { body: fixtureText('getInfo') },
			getSceneList: { body: fixtureText('getSceneList') },
			getOverlayList: { body: fixtureText('getOverlayList') },
			getInputs: { body: fixtureText('getInputs') },
			getVideoList: { body: fixtureText('getVideoList') },
			getSoundList: { body: fixtureText('getSoundList') },
			getAudioFilterList: { body: fixtureText('getAudioFilterList') },
			getProfileList: { body: fixtureText('getProfileList') },
			getChannels: { body: fixtureText('getChannels') },
			getCurrentMode: { body: fixtureText('getCurrentMode') },
			getDefaultCamera: { body: fixtureText('getDefaultCamera') },
		})
		const discover = vi.fn(async () => found)
		const { instance } = createMockInstance({
			config: { ecammHost: OLD_HOST, ecammHostname: 'LYNBHs-Mac-Studio-2.local' },
		})
		const api = new EcammApi(instance, { discover })
		;(instance as unknown as { ecammApi: EcammApi }).ecammApi = api
		return { api, instance, calls }
	}

	const paths = (calls: URL[]) => calls.map((u) => u.pathname)

	it('re-checks permission rather than trusting the cached value', async () => {
		const { api, calls } = connectable([MAC])
		await rediscover(api)

		// Ecamm may have forgotten the client across a restart.
		expect(paths(calls)).toContain('/getConnectionStatus')
	})

	it('refreshes every list so nothing is stale on the first tick', async () => {
		const { api, calls } = connectable([MAC])
		await rediscover(api)

		for (const endpoint of ['/getInfo', '/getSceneList', '/getOverlayList', '/getSoundList', '/getProfileList']) {
			expect(paths(calls), `${endpoint} was not refreshed`).toContain(endpoint)
		}
	})

	it('republishes the definitions built from those lists', async () => {
		const { api, instance } = connectable([MAC])
		await rediscover(api)

		expect(instance.registerAll).toHaveBeenCalled()
		expect(api.state.connected).toBe(true)
	})

	it('saves the new port before reconnecting, so a restart does not go back to the dead one', async () => {
		const { api, instance } = connectable([MAC])
		await rediscover(api)

		expect(instance.persistDiscoveredHost).toHaveBeenCalledWith(`192.168.8.199:${NEW_PORT}`, MAC.hostname, MAC.name)
	})

	it('stays disconnected when the relaunched Ecamm has not approved the client', async () => {
		const { api } = connectable([MAC], '["Pending"]')
		await rediscover(api)

		// The address moved, but nothing should claim to be connected.
		expect(api.state.host).toBe(`192.168.8.199:${NEW_PORT}`)
		expect(api.state.connected).toBe(false)
	})
})

describe('recognising an old configuration', () => {
	it('learns the machine it is connected to by browsing for it', async () => {
		// Configs saved before this module did its own discovery have no hostname, and a stored
		// loopback address can never be matched - so without this they never reconnect.
		installFetchMock({
			getConnectionStatus: { body: '["Allowed"]' },
			getInfo: { body: fixtureText('getInfo') },
			getSceneList: { body: fixtureText('getSceneList') },
			getOverlayList: { body: fixtureText('getOverlayList') },
			getInputs: { body: fixtureText('getInputs') },
			getVideoList: { body: fixtureText('getVideoList') },
			getSoundList: { body: fixtureText('getSoundList') },
			getAudioFilterList: { body: fixtureText('getAudioFilterList') },
			getProfileList: { body: fixtureText('getProfileList') },
			getChannels: { body: fixtureText('getChannels') },
			getCurrentMode: { body: fixtureText('getCurrentMode') },
			getDefaultCamera: { body: fixtureText('getDefaultCamera') },
		})
		const { instance } = createMockInstance({
			config: { ecammHost: `127.0.0.1:${NEW_PORT}`, ecammHostname: undefined },
		})
		const api = new EcammApi(instance, { discover: vi.fn(async () => [MAC]) })
		;(instance as unknown as { ecammApi: EcammApi }).ecammApi = api
		await api.init()

		// connect() starts the browse without awaiting it, so the write lands a tick later.
		await vi.waitFor(() =>
			expect(instance.persistDiscoveredHost).toHaveBeenCalledWith(`127.0.0.1:${NEW_PORT}`, MAC.hostname, MAC.name),
		)
		await api.destroy()
	})

	it('records nothing when two machines share the port', async () => {
		installFetchMock({
			getConnectionStatus: { body: '["Allowed"]' },
			getInfo: { body: fixtureText('getInfo') },
			getSceneList: { body: fixtureText('getSceneList') },
			getOverlayList: { body: fixtureText('getOverlayList') },
			getInputs: { body: fixtureText('getInputs') },
			getVideoList: { body: fixtureText('getVideoList') },
			getSoundList: { body: fixtureText('getSoundList') },
			getAudioFilterList: { body: fixtureText('getAudioFilterList') },
			getProfileList: { body: fixtureText('getProfileList') },
			getChannels: { body: fixtureText('getChannels') },
			getCurrentMode: { body: fixtureText('getCurrentMode') },
			getDefaultCamera: { body: fixtureText('getDefaultCamera') },
		})
		const twin: DiscoveredEcamm = { ...OTHER_MAC, port: NEW_PORT }
		const { instance } = createMockInstance({
			config: { ecammHost: `127.0.0.1:${NEW_PORT}`, ecammHostname: undefined },
		})
		const api = new EcammApi(instance, { discover: vi.fn(async () => [MAC, twin]) })
		;(instance as unknown as { ecammApi: EcammApi }).ecammApi = api
		// Driven directly rather than through init(): asserting that nothing was written cannot
		// be done against a call this test would otherwise be racing.
		await learnIdentity(api)
		await api.destroy()

		// Ambiguous, so guessing would risk adopting the wrong machine.
		expect(instance.persistDiscoveredHost).not.toHaveBeenCalled()
	})
})
