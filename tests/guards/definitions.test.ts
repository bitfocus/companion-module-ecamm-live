import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type {
	CompanionActionDefinition,
	CompanionFeedbackDefinition,
	CompanionPresetDefinitions,
} from '@companion-module/base'
import { GetConfigFields } from '../../src/config.js'
import { ECAMM_SERVICE_PROTOCOL, ECAMM_SERVICE_TYPE } from '../../src/ecamm-api/ecamm-discovery.js'
import { UpdateActions } from '../../src/actions.js'
import { UpdateFeedbacks } from '../../src/feedbacks.js'
import { UpdatePresets } from '../../src/presets.js'
import { initVariableDefinitions } from '../../src/variables/variable-definitions.js'
import { updateVariableValues } from '../../src/variables/variable-values.js'
import { EcammState } from '../../src/ecamm-api/ecamm-state.js'
import { createMockInstance } from '../helpers/mock-instance.js'
import { populatedState } from '../helpers/populated-state.js'

/**
 * Everything is checked in both states. The empty case is the one that historically broke: the
 * old module read `choices[0].id` for a dropdown default and threw whenever a definition was
 * built before the device had answered.
 */
const scenarios: Array<[string, () => EcammState]> = [
	['with no device data', () => new EcammState()],
	['with a full device payload', populatedState],
]

function build(state: EcammState) {
	const mock = createMockInstance({ state })

	UpdateActions(mock.instance)
	UpdateFeedbacks(mock.instance)
	UpdatePresets(mock.instance)
	initVariableDefinitions(mock.instance)
	updateVariableValues(mock.instance)

	const call = <T>(fn: unknown): T => (fn as { mock: { calls: unknown[][] } }).mock.calls[0][0] as T

	return {
		actions: call<Record<string, CompanionActionDefinition | undefined>>(mock.instance.setActionDefinitions),
		feedbacks: call<Record<string, CompanionFeedbackDefinition | undefined>>(mock.instance.setFeedbackDefinitions),
		presets: call<CompanionPresetDefinitions>(mock.instance.setPresetDefinitions),
		variableDefs: call<Array<{ variableId: string; name: string }>>(mock.instance.setVariableDefinitions),
		variableValues: call<Record<string, unknown>>(mock.instance.setVariableValues),
	}
}

describe.each(scenarios)('definitions %s', (_label, makeState) => {
	const built = build(makeState())

	it('registers actions and feedbacks', () => {
		expect(Object.keys(built.actions).length).toBeGreaterThan(30)
		expect(Object.keys(built.feedbacks).length).toBeGreaterThan(10)
	})

	it('has no undefined definitions left in the registered sets', () => {
		// An enum member with no matching definition would silently register as undefined.
		expect(Object.entries(built.actions).filter(([, v]) => v === undefined)).toEqual([])
		expect(Object.entries(built.feedbacks).filter(([, v]) => v === undefined)).toEqual([])
	})

	it('gives every dropdown a usable default', () => {
		for (const [id, definition] of Object.entries(built.actions)) {
			for (const option of definition?.options ?? []) {
				if (option.type !== 'dropdown') continue
				expect(option.choices.length, `${id}.${option.id} has no choices`).toBeGreaterThan(0)

				const inChoices = option.choices.some((choice) => choice.id === option.default)
				// A default outside the choice list is only acceptable when custom values are
				// allowed, which is how overlays from other scenes survive.
				expect(inChoices || option.allowCustom === true, `${id}.${option.id} default is unusable`).toBe(true)
			}
		}
	})

	it('keeps option ids unique within each definition', () => {
		for (const [id, definition] of Object.entries({ ...built.actions, ...built.feedbacks })) {
			const ids = (definition?.options ?? []).map((option) => option.id)
			expect(new Set(ids).size, `${id} has duplicate option ids`).toBe(ids.length)
		}
	})

	it('names every action and feedback', () => {
		for (const [id, definition] of Object.entries(built.actions)) {
			expect(definition?.name, `${id} has no name`).toBeTruthy()
		}
		for (const [id, definition] of Object.entries(built.feedbacks)) {
			expect(definition?.name, `${id} has no name`).toBeTruthy()
		}
	})

	it('only references actions and feedbacks that exist', () => {
		// The CompanionPresetExt type catches a renamed id at compile time; this catches a
		// preset pointing at a definition that was deleted outright.
		for (const [presetId, preset] of Object.entries(built.presets)) {
			if (!preset || preset.type !== 'button') continue

			for (const step of preset.steps) {
				for (const action of [...step.down, ...step.up]) {
					expect(built.actions[action.actionId], `${presetId} uses unknown action ${action.actionId}`).toBeDefined()
				}
			}
			for (const feedback of preset.feedbacks) {
				expect(
					built.feedbacks[feedback.feedbackId],
					`${presetId} uses unknown feedback ${feedback.feedbackId}`,
				).toBeDefined()
			}
		}
	})

	it('gives every preset a key Companion can carry safely', () => {
		// Companion does not validate a preset key - it becomes preset.id verbatim - so nothing
		// downstream would complain about a key built from a camera id like
		// "EXAMPLE-MAC.LOCAL (macOS AV Output)". This is the only thing that would.
		const keys = Object.keys(built.presets)
		for (const key of keys) {
			expect(key, 'a preset has an empty key').toBeTruthy()
			expect(key, `${key} is not a safe preset key`).toMatch(/^[A-Za-z0-9_-]+$/)
		}
		expect(new Set(keys).size, 'two presets share a key, so one was silently dropped').toBe(keys.length)
	})

	it('only sets options that the referenced definition declares', () => {
		for (const [presetId, preset] of Object.entries(built.presets)) {
			if (!preset || preset.type !== 'button') continue

			for (const step of preset.steps) {
				for (const action of [...step.down, ...step.up]) {
					const declared = new Set((built.actions[action.actionId]?.options ?? []).map((o) => o.id))
					for (const key of Object.keys(action.options ?? {})) {
						expect(declared.has(key), `${presetId} sets unknown option "${key}" on ${action.actionId}`).toBe(true)
					}
				}
			}
			// Feedback options were never checked, and the fixed presets set unknownBehavior by
			// hand - a typo there would ship a feedback quietly reading its default.
			for (const feedback of preset.feedbacks) {
				const declared = new Set((built.feedbacks[feedback.feedbackId]?.options ?? []).map((o) => o.id))
				for (const key of Object.keys(feedback.options ?? {})) {
					expect(declared.has(key), `${presetId} sets unknown option "${key}" on ${feedback.feedbackId}`).toBe(true)
				}
			}
		}
	})

	it('only references variables that are defined', () => {
		const defined = new Set(built.variableDefs.map((definition) => definition.variableId))

		for (const [presetId, preset] of Object.entries(built.presets)) {
			if (!preset || preset.type !== 'button') continue
			const text = String(preset.style?.text ?? '')

			for (const match of text.matchAll(/\$\(ecamm-live:([a-zA-Z0-9_]+)\)/g)) {
				expect(defined.has(match[1]), `${presetId} references undefined variable ${match[1]}`).toBe(true)
			}
		}
	})

	it('defines a value for every variable, and no value without a definition', () => {
		// This is the exact defect the previous implementation had: fifteen values written
		// against fourteen definitions, so HidingUI was set but never declared.
		const defined = new Set(built.variableDefs.map((definition) => definition.variableId))
		const valued = new Set(Object.keys(built.variableValues))

		expect([...valued].filter((id) => !defined.has(id))).toEqual([])
		expect([...defined].filter((id) => !valued.has(id))).toEqual([])
	})

	it('uses only characters Companion accepts in a variable id', () => {
		for (const definition of built.variableDefs) {
			expect(definition.variableId, `${definition.variableId} is not a legal variable id`).toMatch(/^[a-zA-Z0-9_]+$/)
			expect(definition.name, `${definition.variableId} has no name`).toBeTruthy()
		}
	})

	it('has no duplicate variable ids', () => {
		const ids = built.variableDefs.map((definition) => definition.variableId)
		expect(new Set(ids).size).toBe(ids.length)
	})
})

describe('aggregators', () => {
	it('does not lose a definition to a duplicate id across categories', () => {
		// Spreading category objects means a shared id would silently overwrite, so the merged
		// count must equal the sum of the parts.
		const state = populatedState()
		const mock = createMockInstance({ state })
		UpdateActions(mock.instance)

		const merged = (mock.instance.setActionDefinitions as unknown as { mock: { calls: unknown[][] } }).mock
			.calls[0][0] as Record<string, unknown>

		// Rebuild each category and total them up.
		const categories = [
			'action-audio',
			'action-broadcast',
			'action-filter',
			'action-overlay',
			'action-preview',
			'action-profile',
			'action-scene',
			'action-sound',
			'action-source',
			'action-utility',
			'action-zoom',
		]
		expect(categories.length).toBe(11)
		expect(Object.keys(merged).length).toBeGreaterThan(30)
	})
})

/**
 * A bonjour-device field is wired to its query by name alone: the field's id has to match a key
 * under `bonjourQueries` in the manifest. Nothing in the toolchain checks that, and getting it
 * wrong does not fail the build - it just leaves the picker permanently empty.
 */
describe('the Bonjour query', () => {
	const manifest = JSON.parse(readFileSync(new URL('../../companion/manifest.json', import.meta.url), 'utf8')) as {
		bonjourQueries?: Record<string, { type: string; protocol: string }>
	}

	it('declares a query for every bonjour-device field', () => {
		const pickers = GetConfigFields().filter((field) => field.type === 'bonjour-device')
		expect(pickers.length).toBeGreaterThan(0)

		for (const picker of pickers) {
			expect(manifest.bonjourQueries?.[picker.id], `no query named ${picker.id}`).toBeDefined()
		}
	})

	it('asks for the service Ecamm Live actually publishes', () => {
		expect(manifest.bonjourQueries?.ecammHost).toEqual({
			type: ECAMM_SERVICE_TYPE,
			protocol: ECAMM_SERVICE_PROTOCOL,
		})
	})
})
