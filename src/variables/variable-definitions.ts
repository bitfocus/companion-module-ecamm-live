import type { CompanionVariableDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { EcammState } from '../ecamm-api/ecamm-state.js'
import { buildVariableCatalog } from './variable-catalog.js'

/**
 * Declares every variable the module exposes. Re-run whenever a device list changes, because the
 * indexed entries (scene_1_name and friends) only exist for as many items as the device reports.
 */
export function initVariableDefinitions(self: ModuleInstance): void {
	const state = self.ecammApi?.state ?? new EcammState()
	const definitions: CompanionVariableDefinition[] = buildVariableCatalog(state).map((spec) => ({
		variableId: spec.variableId,
		name: spec.name,
	}))
	self.setVariableDefinitions(definitions)
}
