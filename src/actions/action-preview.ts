import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { runCommand } from './action-utils.js'

export enum ActionIdPreview {
	togglePreviewMode = 'togglePreviewMode',
	publishPreview = 'publishPreview',
}

export function GetActionsPreview(self: ModuleInstance): {
	[id in ActionIdPreview]: CompanionActionDefinition | undefined
} {
	return {
		[ActionIdPreview.togglePreviewMode]: {
			name: 'Preview: Toggle preview mode',
			options: [],
			callback: async () => runCommand(self, 'Toggle preview mode', async () => self.ecammApi!.client.setPreviewMode()),
		},

		[ActionIdPreview.publishPreview]: {
			name: 'Preview: Publish',
			description: 'Pushes what is in preview out to the live output.',
			options: [],
			callback: async () => runCommand(self, 'Publish preview', async () => self.ecammApi!.client.setPublish()),
		},
	}
}
