import { describe, expect, it } from 'vitest'
import { EcammApi } from '../../src/ecamm-api/ecamm-api.js'
import type { ModuleInstance } from '../../src/main.js'
import { createMockInstance } from '../helpers/mock-instance.js'
import { installFetchMock } from '../helpers/mock-fetch.js'
import { fixtureText } from '../helpers/fixture.js'

/**
 * Ecamm answers "Not Found" for a client it has never heard from, and only creates the pending
 * entry - and raises its approval prompt - in response to a real data request. A module that
 * polled getConnectionStatus alone would sit at "Not Found" forever while the user waited for a
 * dialog that never appeared.
 */
describe('registering with Ecamm Live', () => {
	function apiFor(instance: ModuleInstance): EcammApi {
		const api = new EcammApi(instance)
		// The instance normally owns the api; wire it up so callbacks resolve.
		;(instance as unknown as { ecammApi: EcammApi }).ecammApi = api
		return api
	}

	it('sends a data request when Ecamm does not yet know this client', async () => {
		const { calls } = installFetchMock({
			getConnectionStatus: { body: '["Not Found"]' },
			getInfo: { body: fixtureText('getInfo') },
		})
		const { instance } = createMockInstance()
		const api = apiFor(instance)

		await api.init()
		await api.destroy()

		const endpoints = calls.map((url) => url.pathname)
		expect(endpoints, 'getInfo is what makes Ecamm raise its approval prompt').toContain('/getInfo')
	})

	it('re-reads the permission after registering, so a prompt is not delayed a poll cycle', async () => {
		installFetchMock({
			getConnectionStatus: { body: '["Not Found"]' },
			getInfo: { body: fixtureText('getInfo') },
		})
		const { instance } = createMockInstance()
		const api = apiFor(instance)

		await api.init()
		await api.destroy()

		const statusCalls = (globalThis.fetch as unknown as { mock: { calls: [string][] } }).mock.calls.filter(([url]) =>
			String(url).includes('getConnectionStatus'),
		).length
		expect(statusCalls).toBeGreaterThanOrEqual(2)
	})

	it('does not pester a client the user explicitly denied', async () => {
		const { calls } = installFetchMock({
			getConnectionStatus: { body: '["Denied"]' },
			getInfo: { body: fixtureText('getInfo') },
		})
		const { instance } = createMockInstance()
		const api = apiFor(instance)

		await api.init()
		await api.destroy()

		expect(calls.map((url) => url.pathname)).not.toContain('/getInfo')
	})

	it('goes straight to work when already approved', async () => {
		const { calls } = installFetchMock({
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
		const { instance } = createMockInstance()
		const api = apiFor(instance)

		await api.init()
		// Asserted before teardown, since destroy() deliberately clears the connected flag.
		expect(api.state.connected).toBe(true)
		expect(calls.map((url) => url.pathname)).toContain('/getSceneList')
		await api.destroy()
	})
})
