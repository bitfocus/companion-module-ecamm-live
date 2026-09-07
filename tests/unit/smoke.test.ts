import { describe, expect, it } from 'vitest'
// Deliberately a ".js" specifier pointing at a ".ts" source: this is the ESM style the whole
// module uses, and this test exists to prove vitest resolves it without any extra configuration.
import { GetConfigFields, POLL_FLOOR_MS, normalizeConfig } from '../../src/config.js'

describe('module resolution', () => {
	it('resolves .js import specifiers to their TypeScript sources', () => {
		expect(typeof GetConfigFields).toBe('function')
		expect(POLL_FLOOR_MS).toBe(2000)
	})
})

describe('config normalization', () => {
	it('fills in fields a config saved by an older version is missing', () => {
		// An upgraded connection arrives with only the keys the old version knew about. Without
		// this, pollOverlays would read as false and overlay feedbacks would silently stop.
		const normalized = normalizeConfig({ ecammHost: 'mac.local:1234' })

		expect(normalized.pollOverlays).toBe(true)
		expect(normalized.pollInterval).toBe(2000)
		expect(normalized.verboseLogging).toBe(false)
		expect(normalized.ecammHost).toBe('mac.local:1234')
	})

	it('clamps a poll interval below the documented floor', () => {
		// The field's min does not protect against an imported or hand-edited configuration.
		expect(normalizeConfig({ pollInterval: 100 }).pollInterval).toBe(2000)
		expect(normalizeConfig({ pollInterval: 999999 }).pollInterval).toBe(60000)
	})

	it('handles a completely absent config', () => {
		expect(normalizeConfig(undefined).pollInterval).toBe(2000)
	})
})
