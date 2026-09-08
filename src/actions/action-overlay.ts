import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { deviceIdOptions, requireId, resolveId, runCommand } from './action-utils.js'

export enum ActionIdOverlay {
	toggleOverlay = 'toggleOverlay',
	showComment = 'showComment',
	hideComment = 'hideComment',
}

export function GetActionsOverlay(self: ModuleInstance): {
	[id in ActionIdOverlay]: CompanionActionDefinition | undefined
} {
	const state = self.ecammApi?.state

	return {
		[ActionIdOverlay.toggleOverlay]: {
			name: 'Overlay: Toggle visibility',
			description:
				'Ecamm only lists the overlays belonging to the scene that is currently live, so this dropdown ' +
				'changes as you switch scenes. An overlay from another scene can still be used - type or paste its ' +
				'UUID and Ecamm will resolve it.',
			options: deviceIdOptions(
				'Overlay',
				state?.overlays ?? [],
				'Only the current scene’s overlays are listed. Custom UUIDs are accepted.',
			),
			callback: async (action) => {
				const id = requireId(self, resolveId(action.options), 'Toggle overlay')
				if (!id) return
				await runCommand(self, 'Toggle overlay', async () => self.ecammApi!.client.setOverlay(id))
			},
		},

		[ActionIdOverlay.showComment]: {
			name: 'Overlay: Show most recent comment',
			options: [],
			callback: async () => runCommand(self, 'Show comment', async () => self.ecammApi!.client.setShowComment()),
		},

		[ActionIdOverlay.hideComment]: {
			name: 'Overlay: Hide most recent comment',
			options: [],
			callback: async () => runCommand(self, 'Hide comment', async () => self.ecammApi!.client.setHideComment()),
		},
	}
}
