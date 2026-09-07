import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { sceneLabel } from '../data-structures/ecamm-parsers.js'
import { deviceIdOptions, requireId, resolveId, runCommand } from './action-utils.js'

export enum ActionIdScene {
	setScene = 'setScene',
	setSceneByName = 'setSceneByName',
	nextScene = 'nextScene',
	prevScene = 'prevScene',
}

export function GetActionsScene(self: ModuleInstance): {
	[id in ActionIdScene]: CompanionActionDefinition | undefined
} {
	const state = self.ecammApi?.state
	// Scenes inside a group read as "Group - Scene", so two scenes sharing a name in different
	// groups stay distinguishable.
	const scenes = (state?.scenes ?? []).map((scene) => ({ id: scene.id, label: sceneLabel(scene) }))

	return {
		[ActionIdScene.setScene]: {
			name: 'Scene: Switch to scene',
			options: deviceIdOptions('Scene', scenes),
			callback: async (action) => {
				const id = requireId(self, resolveId(action.options), 'Switch to scene')
				if (!id) return
				await runCommand(self, 'Switch to scene', async () => {
					await self.ecammApi!.client.setScene(id)
					// Overlays belong to the live scene, so they are re-read straight away rather
					// than waiting out the poll interval.
					await self.ecammApi!.applySceneChange({ expectedId: id })
				})
			},
		},

		[ActionIdScene.setSceneByName]: {
			name: 'Scene: Switch to scene by name',
			description: 'Matches a scene title exactly. Useful when the scene is chosen by a variable.',
			options: [{ type: 'textinput', id: 'name', label: 'Scene name', default: '', useVariables: true }],
			callback: async (action) => {
				// Companion has already substituted any variables in a useVariables textinput.
				const name = String(action.options.name ?? '').trim()
				if (!name) {
					self.log('warn', 'Switch to scene by name: no name given')
					return
				}
				// Either form matches: the bare title, or the qualified one shown in the dropdown.
				const scene = self.ecammApi?.state.scenes.find(
					(candidate) => candidate.label === name || sceneLabel(candidate) === name,
				)
				if (!scene) {
					self.log('warn', `Switch to scene by name: no scene called "${name}"`)
					return
				}
				await runCommand(self, 'Switch to scene by name', async () => {
					await self.ecammApi!.client.setScene(scene.id)
					await self.ecammApi!.applySceneChange({ expectedId: scene.id })
				})
			},
		},

		[ActionIdScene.nextScene]: {
			name: 'Scene: Next',
			options: [],
			callback: async () =>
				runCommand(self, 'Next scene', async () => {
					await self.ecammApi!.client.setNext()
					// The resulting scene is not known up front, so the confirmation settles for
					// "anything other than the scene that was live".
					await self.ecammApi!.applySceneChange()
				}),
		},

		[ActionIdScene.prevScene]: {
			name: 'Scene: Previous',
			options: [],
			callback: async () =>
				runCommand(self, 'Previous scene', async () => {
					await self.ecammApi!.client.setPrev()
					await self.ecammApi!.applySceneChange()
				}),
		},
	}
}
