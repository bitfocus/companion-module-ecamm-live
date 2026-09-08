import type { CompanionActionDefinition, DropdownChoice } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { ALL_AUDIO_BUSES, AUDIO_BUS_LABELS, AudioBus } from '../data-structures/ecamm-enums.js'
import { optionNumber, runCommand } from './action-utils.js'

export enum ActionIdAudio {
	toggleMute = 'toggleMute',
	setVolume = 'setVolume',
	adjustVolume = 'adjustVolume',
}

/** Static: the bus list is fixed by the API, not reported by the device. */
const BUS_CHOICES: DropdownChoice[] = ALL_AUDIO_BUSES.map((bus) => ({ id: bus, label: AUDIO_BUS_LABELS[bus] }))

/**
 * Not a bus: the documented parameterless setMute, which Ecamm tracks separately from the buses
 * as getInfo's `Mute`. Muting the main output leaves every bus untouched and vice versa.
 *
 * It is also the default, so a button saved before the bus option existed keeps toggling the
 * main mute rather than silently moving to a different control.
 */
export const MUTE_MAIN = 'main'

const MUTE_TARGET_CHOICES: DropdownChoice[] = [{ id: MUTE_MAIN, label: 'Main (global)' }, ...BUS_CHOICES]

export function GetActionsAudio(self: ModuleInstance): {
	[id in ActionIdAudio]: CompanionActionDefinition | undefined
} {
	return {
		[ActionIdAudio.toggleMute]: {
			name: 'Audio: Toggle mute',
			description:
				'Ecamm exposes mute as a toggle only; there is no explicit mute-on or mute-off command. ' +
				'Main and the individual buses mute independently of each other.',
			options: [{ type: 'dropdown', id: 'bus', label: 'Bus', choices: MUTE_TARGET_CHOICES, default: MUTE_MAIN }],
			callback: async (action) => {
				const target = String(action.options.bus ?? MUTE_MAIN)
				const bus = target === MUTE_MAIN ? undefined : (target as AudioBus)
				// getInfo carries both the main mute and every bus this machine has, and runCommand
				// asks for a fast refresh, so the tally follows the press on its own.
				await runCommand(self, 'Toggle mute', async () => self.ecammApi!.client.setMute(bus))
			},
		},

		[ActionIdAudio.setVolume]: {
			name: 'Audio: Set volume',
			options: [
				{ type: 'dropdown', id: 'bus', label: 'Bus', choices: BUS_CHOICES, default: AudioBus.Mic },
				{ type: 'number', id: 'volume', label: 'Volume', min: 0, max: 100, default: 100, range: true },
			],
			callback: async (action) => {
				const bus = String(action.options.bus ?? AudioBus.Mic) as AudioBus
				const volume = clampVolume(optionNumber(action.options.volume, 100))
				await runCommand(self, 'Set volume', async () => self.ecammApi!.client.setVolume(bus, volume))
			},
		},

		[ActionIdAudio.adjustVolume]: {
			name: 'Audio: Adjust volume by amount',
			description: 'Reads the current level for the bus first, so repeated presses cannot compound a stale base.',
			options: [
				{ type: 'dropdown', id: 'bus', label: 'Bus', choices: BUS_CHOICES, default: AudioBus.Mic },
				{ type: 'number', id: 'delta', label: 'Change by', min: -100, max: 100, default: 5 },
			],
			callback: async (action) => {
				const bus = String(action.options.bus ?? AudioBus.Mic) as AudioBus
				const delta = optionNumber(action.options.delta, 0)
				await runCommand(self, 'Adjust volume', async () => {
					const client = self.ecammApi!.client
					// Read rather than trusting cached state: the last status payload can be up to a
					// poll interval old, and a stale base would compound with every press.
					const current = (await client.getVolume(bus)) ?? self.ecammApi!.state.volumeOf(bus)
					if (current === undefined) {
						self.log('warn', `Adjust volume: Ecamm did not report a level for ${AUDIO_BUS_LABELS[bus]}`)
						return
					}
					await client.setVolume(bus, clampVolume(current + delta))
				})
			},
		},
	}
}

function clampVolume(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)))
}
