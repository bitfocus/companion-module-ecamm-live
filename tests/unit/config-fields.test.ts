import { describe, expect, it } from 'vitest'
import { GetConfigFields, normalizeConfig } from '../../src/config.js'

describe('normalizeConfig', () => {
	it('folds every empty form of the picked host into one', () => {
		// Companion writes null for its always-present "Manual" row, and undefined for a
		// connection that has never been configured. Nothing downstream should have to care.
		expect(normalizeConfig({ ecammHost: null }).ecammHost).toBe('')
		expect(normalizeConfig({ ecammHost: undefined }).ecammHost).toBe('')
		expect(normalizeConfig({ ecammHost: '   ' }).ecammHost).toBe('')
		expect(normalizeConfig(undefined).ecammHost).toBe('')
	})

	it('leaves a value saved by the old custom dropdown untouched', () => {
		// The upgrade guarantee: the previous field allowed typed values and stored the same
		// "address:port" shape, so an existing connection must carry over without a re-pick.
		expect(normalizeConfig({ ecammHost: 'LYNBHs-Mac-Studio.local:59089' }).ecammHost).toBe(
			'LYNBHs-Mac-Studio.local:59089',
		)
		expect(normalizeConfig({ ecammHost: '192.168.8.199:59395' }).ecammHost).toBe('192.168.8.199:59395')
	})
})

describe('the config fields', () => {
	const fields = GetConfigFields()
	const byId = (id: string) => fields.find((field) => field.id === id)

	it('uses Companion’s own Bonjour picker for the host', () => {
		expect(byId('ecammHost')?.type).toBe('bonjour-device')
	})

	it('shows the Bonjour-only note exactly when nothing is picked', () => {
		expect(byId('bonjourRequired')).toMatchObject({
			type: 'static-text',
			isVisibleExpression: '!$(options:ecammHost)',
		})
	})

	it('never declares both visibility forms on one field', () => {
		// serializeIsVisibleFn takes isVisibleExpression and discards isVisible, so a field
		// carrying both silently loses one - which reads as a working fallback but is not.
		for (const field of fields) {
			const both = 'isVisibleExpression' in field && 'isVisible' in field
			expect(both, `${field.id} declares both`).toBe(false)
		}
	})
})
