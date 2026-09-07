import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { deviceIdOptions, requireId, resolveId, runCommand } from './action-utils.js'

export enum ActionIdProfile {
	setProfile = 'setProfile',
}

export function GetActionsProfile(self: ModuleInstance): {
	[id in ActionIdProfile]: CompanionActionDefinition | undefined
} {
	const state = self.ecammApi?.state

	return {
		[ActionIdProfile.setProfile]: {
			name: 'Profile: Switch profile',
			description: 'Switching profile replaces the scenes, overlays and sounds, so every list is re-read.',
			options: deviceIdOptions('Profile', state?.profiles ?? []),
			callback: async (action) => {
				const id = requireId(self, resolveId(action.options), 'Switch profile')
				if (!id) return
				await runCommand(self, 'Switch profile', async () => {
					await self.ecammApi!.client.setProfile(id)
					// A profile carries its own scenes and overlays, so everything cached is stale.
					self.ecammApi!.invalidateLists()
				})
			},
		},
	}
}
