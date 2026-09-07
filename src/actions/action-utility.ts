import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { runCommand } from './action-utils.js'

export enum ActionIdUtility {
	toggleLiveDemo = 'toggleLiveDemo',
	toggleUi = 'toggleUi',
}

export function GetActionsUtility(self: ModuleInstance): {
	[id in ActionIdUtility]: CompanionActionDefinition | undefined
} {
	return {
		[ActionIdUtility.toggleLiveDemo]: {
			name: 'Utility: Toggle Live Demo mode',
			options: [],
			callback: async () => runCommand(self, 'Toggle Live Demo', async () => self.ecammApi!.client.setLiveDemo()),
		},

		[ActionIdUtility.toggleUi]: {
			name: 'Utility: Toggle main window controls',
			options: [],
			callback: async () =>
				runCommand(self, 'Toggle window controls', async () => self.ecammApi!.client.setHideShowUI()),
		},
	}
}
