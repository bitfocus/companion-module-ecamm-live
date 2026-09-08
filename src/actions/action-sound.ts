import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { SOUND_ACTION_CHOICES, SoundAction } from '../data-structures/ecamm-enums.js'
import { soundLabel } from '../data-structures/ecamm-parsers.js'
import { deviceIdOptions, optionNumber, requireId, resolveId, runCommand } from './action-utils.js'

export enum ActionIdSound {
	playSound = 'playSound',
	playSoundFolder = 'playSoundFolder',
	setSoundVolume = 'setSoundVolume',
	stopSound = 'stopSound',
	pauseSound = 'pauseSound',
}

export function GetActionsSound(self: ModuleInstance): {
	[id in ActionIdSound]: CompanionActionDefinition | undefined
} {
	const state = self.ecammApi?.state

	// Sounds inside a folder are shown as "Folder / Sound", so two sounds sharing a name in
	// different folders stay distinguishable.
	const sounds = (state?.sounds ?? []).map((sound) => ({ id: sound.id, label: soundLabel(sound) }))

	return {
		[ActionIdSound.playSound]: {
			name: 'Sound: Play sound effect',
			description: 'Plays a single sound. Sounds inside a folder are listed as "Folder / Sound".',
			options: [
				...deviceIdOptions('Sound', sounds, 'A sound effect UUID, or a path to an audio file.'),
				{ type: 'number', id: 'volume', label: 'Volume', min: 0, max: 100, default: 100, range: true },
				{
					type: 'dropdown',
					id: 'action',
					label: 'Playback behaviour',
					choices: SOUND_ACTION_CHOICES,
					default: SoundAction.Restart,
				},
			],
			callback: async (action) => {
				const id = requireId(self, resolveId(action.options), 'Play sound effect')
				if (!id) return
				const volume = clampVolume(optionNumber(action.options.volume, 100))
				const behaviour = String(action.options.action ?? SoundAction.Restart) as SoundAction
				await runCommand(self, 'Play sound effect', async () => self.ecammApi!.client.setSound(id, volume, behaviour))
			},
		},

		[ActionIdSound.playSoundFolder]: {
			name: 'Sound: Play sound folder',
			description:
				'Plays a whole folder of sound effects. Ecamm addresses a folder by its own UUID, exactly like an ' +
				'individual sound.',
			options: [
				...deviceIdOptions('Sound folder', state?.soundFolders ?? []),
				{ type: 'number', id: 'volume', label: 'Volume', min: 0, max: 100, default: 100, range: true },
				{
					type: 'dropdown',
					id: 'action',
					label: 'Playback behaviour',
					choices: SOUND_ACTION_CHOICES,
					default: SoundAction.Restart,
				},
			],
			callback: async (action) => {
				const id = requireId(self, resolveId(action.options), 'Play sound folder')
				if (!id) return
				const volume = clampVolume(optionNumber(action.options.volume, 100))
				const behaviour = String(action.options.action ?? SoundAction.Restart) as SoundAction
				await runCommand(self, 'Play sound folder', async () => self.ecammApi!.client.setSound(id, volume, behaviour))
			},
		},

		[ActionIdSound.setSoundVolume]: {
			name: 'Sound: Set playing sound volume',
			options: [{ type: 'number', id: 'volume', label: 'Volume', min: 0, max: 100, default: 100, range: true }],
			callback: async (action) => {
				const volume = clampVolume(optionNumber(action.options.volume, 100))
				await runCommand(self, 'Set sound volume', async () => self.ecammApi!.client.setSoundVolume(volume))
			},
		},

		[ActionIdSound.stopSound]: {
			name: 'Sound: Stop',
			options: [],
			callback: async () => runCommand(self, 'Stop sound', async () => self.ecammApi!.client.setSoundStop()),
		},

		[ActionIdSound.pauseSound]: {
			name: 'Sound: Pause',
			options: [],
			callback: async () => runCommand(self, 'Pause sound', async () => self.ecammApi!.client.setSoundPause()),
		},
	}
}

function clampVolume(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)))
}
