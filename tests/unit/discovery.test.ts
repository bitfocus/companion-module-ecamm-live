import { describe, expect, it } from 'vitest'
import { matchInstance, splitHost, type DiscoveredEcamm } from '../../src/ecamm-api/ecamm-discovery.js'

const MAC_A: DiscoveredEcamm = {
	name: 'Ecamm Live Remote',
	hostname: 'LYNBHs-Mac-Studio-2.local',
	addresses: ['192.168.8.199', '192.168.8.129'],
	port: 59395,
}
const MAC_B: DiscoveredEcamm = {
	name: 'Ecamm Live Remote (2)',
	hostname: 'LYNBHs-Mac-Studio.local',
	addresses: ['192.168.8.118'],
	port: 59089,
}

describe('splitHost', () => {
	it('splits an address and port', () => {
		expect(splitHost('192.168.8.199:59395')).toEqual({ address: '192.168.8.199', port: 59395 })
	})

	it('copes with a missing or malformed value', () => {
		expect(splitHost(undefined)).toEqual({ address: '', port: undefined })
		expect(splitHost('192.168.8.199')).toEqual({ address: '192.168.8.199', port: undefined })
	})
})

describe('matchInstance', () => {
	const found = [MAC_A, MAC_B]

	it('prefers the hostname, since Bonjour instance names collide', () => {
		// Both Macs call themselves "Ecamm Live Remote"; the "(2)" is assigned by collision order
		// and can move between machines, so it is never used for matching.
		expect(matchInstance(found, { hostname: 'LYNBHs-Mac-Studio.local' })).toBe(MAC_B)
	})

	it('matches the hostname regardless of case', () => {
		expect(matchInstance(found, { hostname: 'lynbhs-mac-studio-2.local' })).toBe(MAC_A)
	})

	it('follows the hostname even when the address has changed entirely', () => {
		expect(matchInstance(found, { hostname: 'LYNBHs-Mac-Studio-2.local', address: '10.0.0.5' })).toBe(MAC_A)
	})

	it('falls back to the address when no hostname is known yet', () => {
		expect(matchInstance(found, { address: '192.168.8.129' })).toBe(MAC_A)
	})

	it('returns nothing rather than guessing', () => {
		// Reconnecting to the wrong Mac would be far worse than staying disconnected.
		expect(matchInstance(found, { hostname: 'somebody-else.local' })).toBeUndefined()
		expect(matchInstance(found, { address: '10.0.0.99' })).toBeUndefined()
		expect(matchInstance(found, {})).toBeUndefined()
	})
})
