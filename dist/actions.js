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
            label: 'Returns: Dictionary containing strings',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getInfo',
                    options: {
                        command: `getInfo`,
                    },
                };
                sendActionCommand(sendToCommand);
            },
        },
        getButtonLabel: {
            label: 'Returns: Label for Start button',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getButtonLabel',
                    options: {
                        command: `getButtonLabel`,
                    },
                };
                sendActionCommand(sendToCommand);
            },
        },
        getPauseButtonLabel: {
            label: 'Returns: Label for Pause button',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getPauseButtonLabel',
                    options: {
                        command: `getPauseButtonLabel`,
                    },
                };
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
                sendActionCommand(sendToCommand);
            },
        },
        // Scenes
        getSceneList: {
            label: 'Returns: An array of Scene info dictionaries',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getSceneList',
                    options: {
                        command: `getSceneList`,
                    },
                };
                sendActionCommand(sendToCommand);
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
                const sendToCommand = {
                    id: 'getSceneImage',
                    options: {
                        command: `getSceneImage/${action.options.UUID}`,
                    },
                };
                sendActionCommand(sendToCommand);
            },
        },
        getCurrentScene: {
            label: 'Returns: UUID of the current Scene',
            options: [],
            callback: () => {
                const sendToCommand = {
                    id: 'getCurrentScene',
                    options: {
                        command: `getCurrentScene`,
                    },
                };
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
                }
            ],
            callback: (action) => {
                const sendToCommand = {
                    id: 'setScene',
                    options: {
                        command: `setScene/${action.options.UUID}`,
                    },
                };
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
                sendActionCommand(sendToCommand);
            },
        },
    };
}
exports.getActions = getActions;
