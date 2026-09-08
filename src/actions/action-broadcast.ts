import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { deviceDropdown, runCommand } from './action-utils.js'

export enum ActionIdBroadcast {
	clickButton = 'clickButton',
	clickPauseButton = 'clickPauseButton',
	startNewRecording = 'startNewRecording',
	postComment = 'postComment',
	setMarker = 'setMarker',
}

export function GetActionsBroadcast(self: ModuleInstance): {
	[id in ActionIdBroadcast]: CompanionActionDefinition | undefined
} {
	const state = self.ecammApi?.state

	return {
		[ActionIdBroadcast.clickButton]: {
			name: 'Broadcast: Click start / record button',
			description:
				'Presses whatever the main button currently does. Leave the destination empty to use the scheduled ' +
				'live event.',
			options: [
				deviceDropdown('channel', 'Destination', state?.channels ?? [], 'Leave empty for the scheduled event.'),
				{ type: 'textinput', id: 'title', label: 'Broadcast title', default: '', useVariables: true },
				{ type: 'textinput', id: 'desc', label: 'Broadcast description', default: '', useVariables: true },
			],
			callback: async (action) => {
				const channel = String(action.options.channel ?? '').trim()
				const title = String(action.options.title ?? '').trim()
				const desc = String(action.options.desc ?? '').trim()
				await runCommand(self, 'Click start button', async () =>
					self.ecammApi!.client.setClickButton({
						channel: channel || undefined,
						title: title || undefined,
						desc: desc || undefined,
					}),
				)
			},
		},

		[ActionIdBroadcast.clickPauseButton]: {
			name: 'Broadcast: Click pause button',
			options: [],
			callback: async () =>
				runCommand(self, 'Click pause button', async () => self.ecammApi!.client.setClickPauseButton()),
		},

		[ActionIdBroadcast.startNewRecording]: {
			name: 'Broadcast: Start a new recording',
			description: 'Splits the recording while streaming or recording continues.',
			options: [],
			callback: async () =>
				runCommand(self, 'Start new recording', async () => self.ecammApi!.client.setStartNewRecording()),
		},

		[ActionIdBroadcast.postComment]: {
			name: 'Broadcast: Post a comment',
			description: 'Posts to Twitch, YouTube or a Facebook Page, depending on where you are streaming.',
			options: [{ type: 'textinput', id: 'text', label: 'Comment', default: '', useVariables: true }],
			callback: async (action) => {
				const text = String(action.options.text ?? '').trim()
				if (!text) {
					self.log('warn', 'Post a comment: nothing to post')
					return
				}
				await runCommand(self, 'Post a comment', async () => self.ecammApi!.client.setComment(text))
			},
		},

		[ActionIdBroadcast.setMarker]: {
			name: 'Broadcast: Add a marker',
			options: [
				{ type: 'textinput', id: 'text', label: 'Marker text', default: '', useVariables: true },
				{ type: 'checkbox', id: 'dialogbox', label: 'Show the marker dialog', default: false },
			],
			callback: async (action) => {
				const text = String(action.options.text ?? '').trim()
				await runCommand(self, 'Add a marker', async () =>
					self.ecammApi!.client.setMarker({ text: text || undefined, dialogbox: action.options.dialogbox === true }),
				)
			},
		},
	}
}
