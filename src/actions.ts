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
interface actionExtraCallback {
	action: string
	options: Readonly<{
		command: string
		UUID?: string
		volume?: string
		behaviour?: string
		mode?: string
	}>
}
interface actionCallback {
	action: string
	options: Readonly<{
		command: string
	}>
}
export interface EcammLiveActions {
	getSceneImage: EcammLiveAction<actionExtraCallback>
	setScene: EcammLiveAction<actionExtraCallback>
	setInput: EcammLiveAction<actionExtraCallback>
	setMode: EcammLiveAction<actionExtraCallback>
	setVideo: EcammLiveAction<actionExtraCallback>
	// getVideoImage: EcammLiveAction<actionExtraCallback>
	getOverlayImage: EcammLiveAction<actionExtraCallback>
	setOverlay: EcammLiveAction<actionExtraCallback>
	setSoundVolume: EcammLiveAction<actionExtraCallback>
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
	getViewers: EcammLiveAction<actionCallback>
	getInputs: EcammLiveAction<actionCallback>
	getCurrentMode: EcammLiveAction<actionCallback>
	setPIP: EcammLiveAction<actionCallback>
	getVideoList: EcammLiveAction<actionCallback>
	getOverlayList: EcammLiveAction<actionCallback>
	setHideComment: EcammLiveAction<actionCallback>
	getSoundList: EcammLiveAction<actionCallback>
	setSound: EcammLiveAction<actionExtraCallback>
	setSoundStop: EcammLiveAction<actionCallback>
}

export type ActionCallbacks = actionExtraCallback | actionCallback

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
	let CHOICES_SCENES: { id: string; label: string }[] =
		instance.sceneList.length === 0 ? [{ id: 'none', label: 'no scenes loaded' }] : []
	instance.sceneList.forEach((scene) => {
		CHOICES_SCENES.push({ id: scene.UUID, label: scene.title })
	})
	let CHOICES_CAMERA: { id: string; label: string }[] =
		instance.cameraList.length === 0 ? [{ id: 'none', label: 'no inputs loaded' }] : []
	instance.cameraList.forEach((camera) => {
		CHOICES_CAMERA.push({ id: camera.UUID, label: camera.title })
	})
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
			label: 'Get standard info',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getInfo',
					options: {
						command: `getInfo`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getInfo'
				sendActionCommand(sendToCommand)
			},
		},
		getButtonLabel: {
			label: 'Get Label for Start button',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getButtonLabel',
					options: {
						command: `getButtonLabel`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getButtonLabel'
				sendActionCommand(sendToCommand)
			},
		},
		getPauseButtonLabel: {
			label: 'Get Label for Pause button',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getPauseButtonLabel',
					options: {
						command: `getPauseButtonLabel`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getPauseButtonLabel'
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
				instance.basicInfoObj.latestCommand = 'setClickButton'
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
				instance.basicInfoObj.latestCommand = 'setClickPauseButton'
				sendActionCommand(sendToCommand)
			},
		},
		// Scenes
		getSceneList: {
			label: 'Get Scene list',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getSceneList',
					options: {
						command: `getSceneList`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getSceneList'
				sendActionCommand(sendToCommand)
			},
		},
		// getSceneImage: {
		// 	label: 'Get the Scenes last thumbnail image',
		// 	options: [
		// 		{
		// 			type: 'textinput',
		// 			label: 'UUID',
		// 			id: 'UUID',
		// 			default: '',
		// 		},
		// 	],
		// 	callback: (action) => {
		// 		const sendToCommand: any = {
		// 			id: 'getSceneImage',
		// 			options: {
		// 				command: `getSceneImage/${action.options.UUID}`,
		// 			},
		// 		}
		// 		instance.basicInfoObj.latestCommand = 'getSceneImage'
		// 		sendActionCommand(sendToCommand)
		// 	},
		// },
		getCurrentScene: {
			label: 'Get UUID of the current Scene',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getCurrentScene',
					options: {
						command: `getCurrentScene`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getCurrentScene'
				sendActionCommand(sendToCommand)
			},
		},
		setScene: {
			label: 'Switch to a Scene',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'UUID',
					choices: CHOICES_SCENES,
					default: CHOICES_SCENES[0].id,
				},
			],
			callback: (action) => {
				const sendToCommand: any = {
					id: 'setScene',
					options: {
						command: `setScene?id=${action.options.UUID}`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setScene'
				sendActionCommand(sendToCommand)
			},
		},
		setNext: {
			label: 'Go to next Scene',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'setNext',
					options: {
						command: `setNext`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setNext'
				sendActionCommand(sendToCommand)
			},
		},
		setPrev: {
			label: 'Go to previous Scene',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'setPrev',
					options: {
						command: `setPrev`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setPrev'
				sendActionCommand(sendToCommand)
			},
		},
		// Mute
		getMute: {
			label: 'Get mute status',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getMute',
					options: {
						command: `getMute`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getMute'
				sendActionCommand(sendToCommand)
			},
		},
		setMute: {
			label: 'Toggles mute status',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'setMute',
					options: {
						command: `setMute`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setMute'
				sendActionCommand(sendToCommand)
			},
		},
		// Concurrent Viewers
		getViewers: {
			label: 'Get Number of concurrent viewers',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getViewers',
					options: {
						command: `getViewers`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getViewers'
				sendActionCommand(sendToCommand)
			},
		},
		// Camera
		getInputs: {
			label: 'Get camera inputs',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getInputs',
					options: {
						command: `getInputs`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getInputs'
				sendActionCommand(sendToCommand)
			},
		},
		getDefaultCamera: {
			label: 'Get default camera',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getDefaultCamera',
					options: {
						command: `getDefaultCamera`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getDefaultCamera'
				sendActionCommand(sendToCommand)
			},
		},
		setInput: {
			label: 'Set camera input to use',
			options: [
				{
					type: 'dropdown',
					label: 'Camera input',
					id: 'UUID',
					choices: CHOICES_CAMERA,
					default: CHOICES_CAMERA[0].id,
				},
			],
			callback: (action) => {
				const sendToCommand: any = {
					id: 'setInput',
					options: {
						command: `setInput?id=${action.options.UUID}`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setInput'
				sendActionCommand(sendToCommand)
			},
		},
		// Source Mode
		getCurrentMode: {
			label: 'Get Current source mode (cam | screen | video) ',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getCurrentMode',
					options: {
						command: `getCurrentMode`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getCurrentMode'
				sendActionCommand(sendToCommand)
			},
		},
		setMode: {
			label: 'Set Current source mode (cam | screen | video) ',
			options: [
				{
					label: 'source mode',
					type: 'dropdown',
					id: 'mode',
					default: 'cam',
					choices: [
						{ id: 'cam', label: 'cam' },
						{ id: 'screen', label: 'screen' },
						{ id: 'video', label: 'video' },
					],
				},
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'setMode',
					options: {
						command: `setMode`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setMode'
				sendActionCommand(sendToCommand)
			},
		},
		// PiP
		setPIP: {
			label: 'Toggle PIP visibility',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'setPIP',
					options: {
						command: `setPIP`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setPIP'
				sendActionCommand(sendToCommand)
			},
		},
		// Video Playback Mode
		getVideoList: {
			label: 'Get recently used video files.',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getVideoList',
					options: {
						command: `getVideoList`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getVideoList'
				sendActionCommand(sendToCommand)
			},
		},
		// getVideoImage: {
		// 	label: 'Get Video thumbnail.',
		// 	options: [
		// 		{
		// 			type: 'textinput',
		// 			label: 'file path',
		// 			id: 'UUID',
		// 			default: '',
		// 		},
		// 	],
		// 	callback: () => {
		// 		const sendToCommand: any = {
		// 			id: 'getVideoImage',
		// 			options: {
		// 				command: `getVideoImage`,
		// 			},
		// 		}
		// 		instance.basicInfoObj.latestCommand = 'getVideoImage'
		// 		sendActionCommand(sendToCommand)
		// 	},
		// },
		// Overlay
		getOverlayList: {
			label: 'Get An array of Overlay info',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getOverlayList',
					options: {
						command: `getOverlayList`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getOverlayList'
				sendActionCommand(sendToCommand)
			},
		},
		// getOverlayImage: {
		// 	label: 'Get icon: The Overlay’s thumbnail image',
		// 	options: [
		// 		{
		// 			type: 'textinput',
		// 			label: 'Overlay UUID',
		// 			id: 'UUID',
		// 			default: '',
		// 		},
		// 	],
		// 	callback: () => {
		// 		const sendToCommand: any = {
		// 			id: 'getOverlayImage',
		// 			options: {
		// 				command: `getOverlayImage`,
		// 			},
		// 		}
		// 		instance.basicInfoObj.latestCommand = 'getOverlayImage'
		// 		sendActionCommand(sendToCommand)
		// 	},
		// },
		setOverlay: {
			label: 'Toggle an overlays visibility.',
			options: [
				{
					type: 'textinput',
					label: 'Overlay UUID',
					id: 'UUID',
					default: '',
				},
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'setOverlay',
					options: {
						command: `setOverlay`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setOverlay'
				sendActionCommand(sendToCommand)
			},
		},
		setHideComment: {
			label: 'Hide the most recent comment Overlay. (Adding in v3.4.)',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'setHideComment',
					options: {
						command: `setHideComment`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setHideComment'
				sendActionCommand(sendToCommand)
			},
		},
		// SoundEffects
		getSoundList: {
			label: 'Get An array of Sound Effect info',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'getSoundList',
					options: {
						command: `getSoundList`,
					},
				}
				instance.basicInfoObj.latestCommand = 'getSoundList'
				sendActionCommand(sendToCommand)
			},
		},
		setSound: {
			label: 'Play a sound',
			options: [
				{
					type: 'textinput',
					label: 'UUID OR file path to a sound effect',
					id: 'UUID',
					default: '',
				},
				{
					type: 'textinput',
					label: 'Volume level 0 to 100',
					id: 'volume',
					default: '100',
				},
				{
					type: 'dropdown',
					label: 'Playback behavior. (stop | loop | restart)',
					id: 'action',
					default: 'stop',
					choices: [
						{ id: 'stop', label: 'stop' },
						{ id: 'loop', label: 'loop' },
						{ id: 'restart', label: 'restart' },
					],
				},
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'setSound',
					options: {
						command: `setSound`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setSound'
				sendActionCommand(sendToCommand)
			},
		},
		setSoundStop: {
			label: 'Stop the currently playing sound. (Adding in v3.4.)',
			options: [],
			callback: () => {
				const sendToCommand: any = {
					id: 'setSoundStop',
					options: {
						command: `setSoundStop`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setSoundStop'
				sendActionCommand(sendToCommand)
			},
		},
		setSoundVolume: {
			label: 'Set Sound volume',
			options: [
				{
					type: 'textinput',
					label: 'Volume level 0 to 100',
					id: 'volume',
					default: '100',
				},
			],
			callback: () => {
				const sendToCommand: any = {
					id: 'setSoundVolume',
					options: {
						command: `setSoundVolume`,
					},
				}
				instance.basicInfoObj.latestCommand = 'setSoundVolume'
				sendActionCommand(sendToCommand)
			},
		},
	}
}
