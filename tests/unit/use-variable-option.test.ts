import { describe, expect, it, vi } from 'vitest'
import type { CompanionActionDefinition } from '@companion-module/base'
import { deviceIdOptions, resolveId } from '../../src/actions/action-utils.js'
import { ActionIdScene, GetActionsScene } from '../../src/actions/action-scene.js'
import { ActionIdSound, GetActionsSound } from '../../src/actions/action-sound.js'
import { createMockInstance, mockContext } from '../helpers/mock-instance.js'
import { populatedState } from '../helpers/populated-state.js'

async function fire(definition: CompanionActionDefinition | undefined, options: Record<string, unknown>) {
	await (definition as unknown as { callback: (e: unknown, c: unknown) => Promise<void> }).callback(
		{ options },
		mockContext(),
	)
}

/**
 * Companion resolves variables only in a `textinput` declaring `useVariables`; a dropdown value
 * is handed over untouched. The checkbox swaps between the two, which is the only way a preset
 * can drive an action from a slot variable.
 */
describe('the "Use variable" option', () => {
	it('offers a checkbox, a dropdown and a variable-capable text box', () => {
		const options = deviceIdOptions('Scene', [{ id: 'a', label: 'A' }])
		expect(options.map((o) => o.id)).toEqual(['useVariable', 'id', 'idVariable'])

		const [checkbox, dropdown, textinput] = options
		expect(checkbox.type).toBe('checkbox')
		expect(checkbox.default).toBe(false)
		expect(dropdown.type).toBe('dropdown')
		expect(textinput.type).toBe('textinput')
		// Only this field type is variable-substituted by Companion.
		expect(textinput).toHaveProperty('useVariables', true)
	})

	it('shows exactly one of the two fields at a time', () => {
		const [, dropdown, textinput] = deviceIdOptions('Scene', [])
		expect(dropdown.isVisibleExpression).toBe('!$(options:useVariable)')
		expect(textinput.isVisibleExpression).toBe('$(options:useVariable)')
	})

	it('reads the dropdown by default and the text box when checked', () => {
		expect(resolveId({ useVariable: false, id: 'from-list', idVariable: 'ignored' })).toBe('from-list')
		expect(resolveId({ useVariable: true, id: 'ignored', idVariable: 'from-variable' })).toBe('from-variable')
	})

	it('trims and tolerates missing values', () => {
		expect(resolveId({ useVariable: true, idVariable: '  spaced  ' })).toBe('spaced')
		expect(resolveId({})).toBe('')
		expect(resolveId({ useVariable: true })).toBe('')
	})

	it('sends the already-substituted value straight through', async () => {
		const mock = createMockInstance({ state: populatedState() })
		// Companion substitutes before the callback runs, so the callback sees a real UUID.
		await fire(GetActionsScene(mock.instance)[ActionIdScene.setScene], {
			useVariable: true,
			idVariable: 'resolved-scene-uuid',
		})
		expect(mock.client.setScene).toHaveBeenCalledWith('resolved-scene-uuid')
	})

	it('warns rather than sending an empty id when a slot variable is blank', async () => {
		const mock = createMockInstance({ state: populatedState() })
		// An unpopulated slot resolves to an empty string; the button must simply do nothing.
		await fire(GetActionsScene(mock.instance)[ActionIdScene.setScene], { useVariable: true, idVariable: '' })

		expect(mock.client.setScene).not.toHaveBeenCalled()
		expect(mock.instance.log).toHaveBeenCalledWith('warn', expect.stringContaining('nothing selected'))
	})
})

describe('playing a sound folder', () => {
	it('sends the folder id, which Ecamm treats like any other sound id', async () => {
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsSound(mock.instance)[ActionIdSound.playSoundFolder], {
			id: 'folder-uuid',
			volume: 80,
			action: 'loop',
		})
		expect(mock.client.setSound).toHaveBeenCalledWith('folder-uuid', 80, 'loop')
	})

	it('lists only folders in its dropdown, and no folders in the sound dropdown', () => {
		const mock = createMockInstance({ state: populatedState() })
		const actions = GetActionsSound(mock.instance)

		const labelsOf = (definition: CompanionActionDefinition | undefined) => {
			const dropdown = definition?.options.find((o) => o.id === 'id')
			return (dropdown as unknown as { choices: { label: string }[] }).choices.map((c) => c.label)
		}

		expect(labelsOf(actions[ActionIdSound.playSoundFolder])).toEqual(['Test Group'])

		const soundLabels = labelsOf(actions[ActionIdSound.playSound])
		expect(soundLabels).not.toContain('Test Group')
		expect(soundLabels).toContain('Test Group / Triangle')
	})

	it('clamps folder volume like the single-sound action', async () => {
		const mock = createMockInstance({ state: populatedState() })
		await fire(GetActionsSound(mock.instance)[ActionIdSound.playSoundFolder], { id: 'f', volume: 500 })
		expect(mock.client.setSound).toHaveBeenCalledWith('f', 100, 'restart')
	})
})

describe('variable value diffing', () => {
	it('sends everything first, then only what changed', async () => {
		const { updateVariableValues, resetVariableValueCache } = await import('../../src/variables/variable-values.js')
		const state = populatedState()
		const mock = createMockInstance({ state })
		const setValues = mock.instance.setVariableValues as unknown as ReturnType<typeof vi.fn>

		updateVariableValues(mock.instance)
		const firstCount = Object.keys(setValues.mock.calls[0][0]).length
		expect(firstCount).toBeGreaterThan(1000)

		// Nothing moved, so nothing should cross the IPC boundary.
		setValues.mockClear()
		updateVariableValues(mock.instance)
		expect(setValues).not.toHaveBeenCalled()

		// One value moved, so exactly that one is sent.
		state.info = { ...state.info, viewers: 42 }
		updateVariableValues(mock.instance)
		expect(setValues).toHaveBeenCalledTimes(1)
		expect(setValues.mock.calls[0][0]).toEqual({ viewers: 42 })

		// Re-registering definitions clears Companion's values, so the cache must be dropped.
		resetVariableValueCache(mock.instance)
		setValues.mockClear()
		updateVariableValues(mock.instance)
		expect(Object.keys(setValues.mock.calls[0][0]).length).toBe(firstCount)
	})
})
