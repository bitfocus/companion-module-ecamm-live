import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { SOURCE_MODE_CHOICES, SourceMode } from '../data-structures/ecamm-enums.js'
import { deviceIdOptions, requireId, resolveId, runCommand } from './action-utils.js'

export enum ActionIdSource {
	setCamera = 'setCamera',
	setMode = 'setMode',
	setVideo = 'setVideo',
	togglePip = 'togglePip',
}

export function GetActionsSource(self: ModuleInstance): {
	[id in ActionIdSource]: CompanionActionDefinition | undefined
} {
	const state = self.ecammApi?.state

	return {
		[ActionIdSource.setCamera]: {
			name: 'Source: Select camera',
			options: deviceIdOptions('Camera', state?.cameras ?? []),
			callback: async (action) => {
				const id = requireId(self, resolveId(action.options), 'Select camera')
				if (!id) return
				await runCommand(self, 'Select camera', async () => self.ecammApi!.client.setInput(id))
			},
		},

		[ActionIdSource.setMode]: {
			name: 'Source: Set source mode',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: SOURCE_MODE_CHOICES,
					default: SourceMode.Cam,
				},
			],
			callback: async (action) => {
				const mode = String(action.options.mode ?? '') as SourceMode
				await runCommand(self, 'Set source mode', async () => self.ecammApi!.client.setMode(mode))
			},
		},

		[ActionIdSource.setVideo]: {
			name: 'Source: Play video',
			description:
				'Videos are addressed by file path. The dropdown lists Ecamm’s recent items; any other path can be ' +
				'typed in directly.',
			options: deviceIdOptions('Video', state?.videos ?? [], 'Ecamm identifies videos by full file path.'),
			callback: async (action) => {
				const id = requireId(self, resolveId(action.options), 'Play video')
				if (!id) return
				await runCommand(self, 'Play video', async () => self.ecammApi!.client.setVideo(id))
			},
		},

		[ActionIdSource.togglePip]: {
			name: 'Source: Toggle PIP',
			description: 'Ecamm exposes no way to read PIP state back, so this toggles blind.',
			options: [],
			callback: async () => runCommand(self, 'Toggle PIP', async () => self.ecammApi!.client.setPIP()),
		},
	}
}
