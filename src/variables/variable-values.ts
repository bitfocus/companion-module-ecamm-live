import type { CompanionVariableValue, CompanionVariableValues } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { EcammState } from '../ecamm-api/ecamm-state.js'
import { buildVariableCatalog } from './variable-catalog.js'

/**
 * Last values sent, so a poll can push only what moved.
 *
 * With fixed slots the catalog is well over a thousand entries, and on a routine two-second poll
 * almost none of them change. Sending the whole set every time would put a large payload across
 * the IPC boundary to say nothing happened.
 */
const lastSent = new WeakMap<ModuleInstance, Map<string, CompanionVariableValue>>()

/**
 * Writes changed variable values. Values come from the same catalog as the definitions, so it is
 * not possible to set a variable that was never declared.
 */
export function updateVariableValues(self: ModuleInstance): void {
	const state = self.ecammApi?.state ?? new EcammState()
	const previous = lastSent.get(self)
	const current = new Map<string, CompanionVariableValue>()
	const changed: CompanionVariableValues = {}
	let changedCount = 0

	for (const spec of buildVariableCatalog(state)) {
		current.set(spec.variableId, spec.value)
		if (!previous || previous.get(spec.variableId) !== spec.value) {
			changed[spec.variableId] = spec.value
			changedCount++
		}
	}

	lastSent.set(self, current)
	if (changedCount > 0) self.setVariableValues(changed)
}

/** Forces the next update to send everything, e.g. after definitions are re-registered. */
export function resetVariableValueCache(self: ModuleInstance): void {
	lastSent.delete(self)
}
