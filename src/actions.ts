import {
	CompanionActionEventInfo,
	CompanionActionEvent,
	SomeCompanionInputField,
	CompanionActions,
} from '../../../instance_skel_types'
import EcammLiveInstance from './index'

/**
 * Define what is needed
 */
interface getWidtUUDICallback {
	action: string
	options: Readonly<{
		command: string
		UUID: string
	}>
}
interface actionCallback {
	action: string
	options: Readonly<{
		command: string
	}>
}
export interface EcammLiveActions {
	getSceneImage: EcammLiveAction<getWidtUUDICallback>
	setScene: EcammLiveAction<getWidtUUDICallback>
	getInfo: EcammLiveAction<actionCallback>
	getButtonLabel: EcammLiveAction<actionCallback>
	getPauseButtonLabel: EcammLiveAction<actionCallback>
	setClickButton: EcammLiveAction<actionCallback>
	setClickPauseButton: EcammLiveAction<actionCallback>
	getSceneList: EcammLiveAction<actionCallback>
	getCurrentScene: EcammLiveAction<actionCallback>
	setNext: EcammLiveAction<actionCallback>
	setPrev: EcammLiveAction<actionCallback>
	getMute: EcammLiveAction<actionCallback>
	setMute: EcammLiveAction<actionCallback>
}

export type ActionCallbacks = getWidtUUDICallback | actionCallback

// Actions specific to EcammLive
export interface EcammLiveAction<T> {
	label: string
	description?: string
	options: InputFieldWithDefault[]
	callback: (
		action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>,
		info: Readonly<CompanionActionEventInfo | null>
	) => void
	subscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
	unsubscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
}

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionInputField, 'default'> & { default: string | number | boolean | null }

/**
 * Main function to create the actions
 * @param instance Give the instance so we can extract data
 * @returns CompanionActions
 */
export function getActions(instance: EcammLiveInstance): CompanionActions {
	/**
	 * Construct the command like I want and send it to the OSC
	 * @param action
	 * @param _info
	 */
	const sendActionCommand = (action: Readonly<ActionCallbacks>, _info?: CompanionActionEventInfo | null): void => {
		// Construct command
		let command = action.options.command
		if (instance.HTTP) instance.HTTP.sendCommand(command)
	}

	return {
		// Display Info
		getInfo: {
			label: 'Returns: Dictionary containing strings',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getInfo',
					options: {
						command: `getInfo`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		getButtonLabel: {
			label: 'Returns: Label for Start button',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getButtonLabel',
					options: {
						command: `getButtonLabel`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		getPauseButtonLabel: {
			label: 'Returns: Label for Pause button',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getPauseButtonLabel',
					options: {
						command: `getPauseButtonLabel`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		setClickButton: {
			label: 'Clicks the start or record button',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'setClickButton',
					options: {
						command: `setClickButton`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		setClickPauseButton: {
			label: 'Clicks the pause recording button',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'setClickPauseButton',
					options: {
						command: `setClickPauseButton`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		// Scenes
		getSceneList: {
			label: 'Returns: An array of Scene info dictionaries',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getSceneList',
					options: {
						command: `getSceneList`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		getSceneImage: {
			label: 'Returns: icon: The Scenes last thumbnail image, as a Base 64 encoded JPG',
			options: [
				{
					type: 'textinput',
					label: 'UUID',
					id: 'UUID',
					default: '',
				}
			],
			callback: (action) => {
				const sendToCommand: any = {
					id: 'getSceneImage',
					options: {
						command: `getSceneImage/${action.options.UUID}`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		getCurrentScene: {
			label: 'Returns: UUID of the current Scene',
			options: [
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'getCurrentScene',
					options: {
						command: `getCurrentScene`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		setScene: {
			label: 'Switch to a Scene',
			options: [
				{
					type: 'textinput',
					label: 'UUID',
					id: 'UUID',
					default: '',
				}
			],
			callback: (action) => {
				const sendToCommand: any = {
					id: 'setScene',
					options: {
						command: `setScene/${action.options.UUID}`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		setNext: {
			label: 'Go to next Scene',
			options: [
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'setNext',
					options: {
						command: `setNext`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		setPrev: {
			label: 'Go to previous Scene',
			options: [
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'setPrev',
					options: {
						command: `setPrev`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		// Mute
		getMute: {
			label: 'Get mute status',
			options: [
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'getMute',
					options: {
						command: `getMute`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
		setMute: {
			label: 'Toggles mute status',
			options: [
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'setMute',
					options: {
						command: `setMute`,
					},
				}
				sendActionCommand(sendToCommand)
			},
		},
	}
}
