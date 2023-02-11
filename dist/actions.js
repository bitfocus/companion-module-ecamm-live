"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetActions = exports.EcammLiveActions = void 0;
var EcammLiveActions;
(function (EcammLiveActions) {
    EcammLiveActions["getSceneImage"] = "getSceneImage";
    EcammLiveActions["setScene"] = "setScene";
    EcammLiveActions["setInput"] = "setInput";
    EcammLiveActions["setMode"] = "setMode";
    EcammLiveActions["setVideo"] = "setVideo";
    // getVideoImage= 'getVideoImage',
    EcammLiveActions["getOverlayImage"] = "getOverlayImage";
    EcammLiveActions["getDefaultCamera"] = "getDefaultCamera";
    EcammLiveActions["setOverlay"] = "setOverlay";
    EcammLiveActions["setSoundVolume"] = "setSoundVolume";
    EcammLiveActions["getInfo"] = "getInfo";
    EcammLiveActions["getButtonLabel"] = "getButtonLabel";
    EcammLiveActions["getPauseButtonLabel"] = "getPauseButtonLabel";
    EcammLiveActions["setClickButton"] = "setClickButton";
    EcammLiveActions["setClickPauseButton"] = "setClickPauseButton";
    EcammLiveActions["getSceneList"] = "getSceneList";
    EcammLiveActions["getCurrentScene"] = "getCurrentScene";
    EcammLiveActions["setNext"] = "setNext";
    EcammLiveActions["setPrev"] = "setPrev";
    EcammLiveActions["getMute"] = "getMute";
    EcammLiveActions["setMute"] = "setMute";
    EcammLiveActions["getViewers"] = "getViewers";
    EcammLiveActions["getInputs"] = "getInputs";
    EcammLiveActions["getCurrentMode"] = "getCurrentMode";
    EcammLiveActions["setPIP"] = "setPIP";
    EcammLiveActions["setPIPsetPIP"] = "setPIPsetPIP";
    EcammLiveActions["getVideoList"] = "getVideoList";
    EcammLiveActions["getOverlayList"] = "getOverlayList";
    EcammLiveActions["setHideComment"] = "setHideComment";
    EcammLiveActions["getSoundList"] = "getSoundList";
    EcammLiveActions["setSound"] = "setSound";
    EcammLiveActions["setSoundStop"] = "setSoundStop";
})(EcammLiveActions = exports.EcammLiveActions || (exports.EcammLiveActions = {}));
/**
 * Main function to create the actions
 * @param instance Give the instance so we can extract data
 * @returns CompanionActions
 */
function GetActions(instance) {
    let CHOICES_SCENES = instance.sceneList.length === 0 ? [{ id: 'none', label: 'no scenes loaded' }] : [];
    instance.sceneList.forEach((scene) => {
        CHOICES_SCENES.push({ id: scene.UUID, label: scene.title });
    });
    let CHOICES_CAMERA = instance.cameraList.length === 0 ? [{ id: 'none', label: 'no inputs loaded' }] : [];
    instance.cameraList.forEach((camera) => {
        CHOICES_CAMERA.push({ id: camera.UUID, label: camera.title });
    });
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
    const actions = {
        // Display Info
        getInfo: {
            name: 'Get standard info',
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
            name: 'Get Label for Start button',
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
            name: 'Get Label for Pause button',
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
            name: 'Clicks the start or record button',
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
            name: 'Clicks the pause recording button',
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
            name: 'Get Scene list',
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
        // getSceneImage: {
        // 	name: 'Get the Scenes last thumbnail image',
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
            name: 'Get UUID of the current Scene',
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
            name: 'Switch to a Scene',
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
                const sendToCommand = {
                    id: 'setScene',
                    options: {
                        command: `setScene?id=${action.options.UUID}`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setScene';
                sendActionCommand(sendToCommand);
            },
        },
        setNext: {
            name: 'Go to next Scene',
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
            name: 'Go to previous Scene',
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
            name: 'Get mute status',
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
            name: 'Toggles mute status',
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
            name: 'Get Number of concurrent viewers',
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
            name: 'Get camera inputs',
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
            name: 'Get default camera',
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
            name: 'Set camera input to use',
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
                const sendToCommand = {
                    id: 'setInput',
                    options: {
                        command: `setInput?id=${action.options.UUID}`,
                    },
                };
                instance.basicInfoObj.latestCommand = 'setInput';
                sendActionCommand(sendToCommand);
            },
        },
        // Source Mode
        getCurrentMode: {
            name: 'Get Current source mode (cam | screen | video) ',
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
            name: 'Set Current source mode (cam | screen | video) ',
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
            name: 'Toggle PIP visibility',
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
            name: 'Get recently used video files.',
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
        // 	name: 'Get Video thumbnail.',
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
            name: 'Get An array of Overlay info',
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
        // getOverlayImage: {
        // 	name: 'Get icon: The Overlay’s thumbnail image',
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
            name: 'Toggle an overlays visibility.',
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
            name: 'Hide the most recent comment Overlay. (Adding in v3.4.)',
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
            name: 'Get An array of Sound Effect info',
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
            name: 'Play a sound',
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
            name: 'Stop the currently playing sound. (Adding in v3.4.)',
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
            name: 'Set Sound volume',
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
        getSceneImage: undefined,
        setVideo: undefined,
        getOverlayImage: undefined,
        setPIPsetPIP: undefined
    };
    return actions;
}
exports.GetActions = GetActions;
