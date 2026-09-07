import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { deviceIdOptions, requireId, resolveId, runCommand } from './action-utils.js'

export enum ActionIdFilter {
	toggleAudioFilter = 'toggleAudioFilter',
}

export function GetActionsFilter(self: ModuleInstance): {
	[id in ActionIdFilter]: CompanionActionDefinition | undefined
} {
	const state = self.ecammApi?.state

	return {
		[ActionIdFilter.toggleAudioFilter]: {
			name: 'Audio: Toggle audio filter',
			options: deviceIdOptions('Audio filter', state?.audioFilters ?? []),
			callback: async (action) => {
				const id = requireId(self, resolveId(action.options), 'Toggle audio filter')
				if (!id) return
				await runCommand(self, 'Toggle audio filter', async () => self.ecammApi!.client.setAudioFilter(id))
			},
		},
	}
}
