import { beforeEach, vi } from 'vitest'

/**
 * Unit tests must never reach the network. Rather than leaving the real fetch in place, this
 * installs one that fails loudly, so a test that forgot to mock its transport is obvious instead
 * of quietly trying to contact an Ecamm Live on the LAN.
 */
beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn((input: unknown) => {
			throw new Error(`Unmocked network access in a unit test: ${String(input)}`)
		}),
	)
})
