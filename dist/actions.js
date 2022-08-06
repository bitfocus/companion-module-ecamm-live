"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActions = void 0;
/**
 * Main function to create the actions
 * @param instance Give the instance so we can extract data
 * @returns CompanionActions
 */
function getActions(instance) {
    /**
     * Construct the command like I want and send it to the OSC
     * @param action
     * @param _info
     */
    const sendActionCommand = (action, _info) => {
        // Construct command
        let command = action.options.command;
        if (instance.HTTP)
            instance.HTTP.sendCommand(command);
    };
    return {
        // Display Info
        getInfo: {
            label: 'Get standard info',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getInfo',
                    options: {
                        command: `getInfo`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getInfo';
                sendActionCommand(sendToCommand);
            },
        },
        getButtonLabel: {
            label: 'Get Label for Start button',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getButtonLabel',
                    options: {
                        command: `getButtonLabel`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getButtonLabel';
                sendActionCommand(sendToCommand);
            },
        },
        getPauseButtonLabel: {
            label: 'Get Label for Pause button',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getPauseButtonLabel',
                    options: {
                        command: `getPauseButtonLabel`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getPauseButtonLabel';
                sendActionCommand(sendToCommand);
            },
        },
        setClickButton: {
            label: 'Clicks the start or record button',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setClickButton',
                    options: {
                        command: `setClickButton`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setClickButton';
                sendActionCommand(sendToCommand);
            },
        },
        setClickPauseButton: {
            label: 'Clicks the pause recording button',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setClickPauseButton',
                    options: {
                        command: `setClickPauseButton`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setClickPauseButton';
                sendActionCommand(sendToCommand);
            },
        },
        // Scenes
        getSceneList: {
            label: 'Get Scenes info',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getSceneList',
                    options: {
                        command: `getSceneList`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getSceneList';
                sendActionCommand(sendToCommand);
            },
        },
        getSceneImage: {
            label: 'Get the Scenes last thumbnail image',
            options: [
                {
                    type: 'textinput',
                    label: 'UUID',
                    id: 'UUID',
                    default: '',
                },
            ],
            callback: (action) => {
                const sendToCommand = {
                    id: 'getSceneImage',
                    options: {
                        command: `getSceneImage/${action.options.UUID}`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getSceneImage';
                sendActionCommand(sendToCommand);
            },
        },
        getCurrentScene: {
            label: 'Get UUID of the current Scene',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getCurrentScene',
                    options: {
                        command: `getCurrentScene`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getCurrentScene';
                sendActionCommand(sendToCommand);
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
                },
            ],
            callback: (action) => {
                const sendToCommand = {
                    id: 'setScene',
                    options: {
                        command: `setScene/${action.options.UUID}`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setScene';
                sendActionCommand(sendToCommand);
            },
        },
        setNext: {
            label: 'Go to next Scene',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setNext',
                    options: {
                        command: `setNext`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setNext';
                sendActionCommand(sendToCommand);
            },
        },
        setPrev: {
            label: 'Go to previous Scene',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setPrev',
                    options: {
                        command: `setPrev`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setPrev';
                sendActionCommand(sendToCommand);
            },
        },
        // Mute
        getMute: {
            label: 'Get mute status',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getMute',
                    options: {
                        command: `getMute`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getMute';
                sendActionCommand(sendToCommand);
            },
        },
        setMute: {
            label: 'Toggles mute status',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setMute',
                    options: {
                        command: `setMute`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setMute';
                sendActionCommand(sendToCommand);
            },
        },
        // Concurrent Viewers
        getViewers: {
            label: 'Get Number of concurrent viewers',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getViewers',
                    options: {
                        command: `getViewers`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getViewers';
                sendActionCommand(sendToCommand);
            },
        },
        // Camera
        getInputs: {
            label: 'Get camera inputs',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getInputs',
                    options: {
                        command: `getInputs`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getInputs';
                sendActionCommand(sendToCommand);
            },
        },
        getDefaultCamera: {
            label: 'Get UUID of the default camera',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getDefaultCamera',
                    options: {
                        command: `getDefaultCamera`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getDefaultCamera';
                sendActionCommand(sendToCommand);
            },
        },
        setInput: {
            label: 'Set UUID of a camera to use',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setInput',
                    options: {
                        command: `setInput`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setInput';
                sendActionCommand(sendToCommand);
            },
        },
        // Source Mode
        getCurrentMode: {
            label: 'Get Current source mode (cam | screen | video) ',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getCurrentMode',
                    options: {
                        command: `getCurrentMode`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getCurrentMode';
                sendActionCommand(sendToCommand);
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
                const sendToCommand = {
                    id: 'setMode',
                    options: {
                        command: `setMode`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setMode';
                sendActionCommand(sendToCommand);
            },
        },
        // PiP
        setPIP: {
            label: 'Toggle PIP visibility',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setPIP',
                    options: {
                        command: `setPIP`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setPIP';
                sendActionCommand(sendToCommand);
            },
        },
        // Video Playback Mode
        getVideoList: {
            label: 'Get recently used video files.',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getVideoList',
                    options: {
                        command: `getVideoList`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getVideoList';
                sendActionCommand(sendToCommand);
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
                const sendToCommand = {
                    id: 'getOverlayList',
                    options: {
                        command: `getOverlayList`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getOverlayList';
                sendActionCommand(sendToCommand);
            },
        },
        getOverlayImage: {
            label: 'Get icon: The Overlay’s thumbnail image',
            options: [
                {
                    type: 'textinput',
                    label: 'Overlay UUID',
                    id: 'UUID',
                    default: '',
                },
            ],
            callback: () => {
                const sendToCommand = {
                    id: 'getOverlayImage',
                    options: {
                        command: `getOverlayImage`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getOverlayImage';
                sendActionCommand(sendToCommand);
            },
        },
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
                const sendToCommand = {
                    id: 'setOverlay',
                    options: {
                        command: `setOverlay`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setOverlay';
                sendActionCommand(sendToCommand);
            },
        },
        setHideComment: {
            label: 'Hide the most recent comment Overlay. (Adding in v3.4.)',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setHideComment',
                    options: {
                        command: `setHideComment`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setHideComment';
                sendActionCommand(sendToCommand);
            },
        },
        // SoundEffects
        getSoundList: {
            label: 'Get An array of Sound Effect info',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getSoundList',
                    options: {
                        command: `getSoundList`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'getSoundList';
                sendActionCommand(sendToCommand);
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
                const sendToCommand = {
                    id: 'setSound',
                    options: {
                        command: `setSound`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setSound';
                sendActionCommand(sendToCommand);
            },
        },
        setSoundStop: {
            label: 'Stop the currently playing sound. (Adding in v3.4.)',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'setSoundStop',
                    options: {
                        command: `setSoundStop`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setSoundStop';
                sendActionCommand(sendToCommand);
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
                const sendToCommand = {
                    id: 'setSoundVolume',
                    options: {
                        command: `setSoundVolume`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setSoundVolume';
                sendActionCommand(sendToCommand);
            },
        },
    };
}
exports.getActions = getActions;
