"use strict";
const instance_skel = require("../../../instance_skel");
const actions_1 = require("./actions");
const config_1 = require("./config");
const http_1 = require("./http");
// import { getFeedbacks } from './feedback'
const presets_1 = require("./presets");
const variables_1 = require("./variables");
/**
 * Companion instance class
 */
class EcammLiveInstance extends instance_skel {
    constructor(system, id, config) {
        super(system, id, config);
        // Global call settings
        this.variables = null;
        this.HTTP = null;
        this.basicInfoObj = {
            latestCommand: 'getInfo',
            PauseButtonLabel: 'no info',
            ButtonLabel: 'no info',
            Mute: 'no',
            VOLUME_MOVIE: 0,
            MUTE_SOUNDEFFECTS: 'no',
            MUTE_MIC: 'no',
            VOLUME_MIC: 0,
            CurrentScene: '',
            PreviewMode: 'no',
            HidingUI: 'no',
            VOLUME_SOUNDEFFECTS: 0,
            LiveDemo: 'no',
            Viewers: 0,
            MUTE_MOVIE: 'no',
            defaultCamera: '',
            currentSourceMode: 'no info',
        };
        this.sceneList = [];
        this.cameraList = [];
        this.videoList = [];
        this.overlayList = { items: [] };
        /**
         * @returns config options
         * @description generates the config options available for this instance
         */
        this.config_fields = () => {
            return (0, config_1.getConfigFields)();
        };
        /**
         * @description close connections and stop timers/intervals
         */
        this.destroy = () => {
            this.log('debug', `Instance destroyed: ${this.id}`);
        };
        this.system = system;
        this.config = config;
    }
    /**
     * @description triggered on instance being enabled
     */
    init() {
        this.log('info', `Welcome, module is loading`);
        this.status(this.STATUS_WARNING, 'Connecting');
        this.variables = new variables_1.Variables(this);
        this.HTTP = new http_1.HTTP(this);
        this.updateInstance();
    }
    /**
     * @param config new configuration data
     * @description triggered every time the config for this instance is saved
     */
    updateConfig(config) {
        console.log('changing config!', config);
        this.config = config;
        this.updateInstance();
    }
    /**
     * @description Create and update variables
     */
    updateVariables() {
        if (this.variables) {
            console.log('update variables');
            this.variables.updateDefinitions();
            this.variables.updateVariables();
        }
    }
    /**
     * @description sets actions, presets and feedbacks available for this instance
     */
    updateInstance() {
        // Cast actions and feedbacks from EcammLive types to Companion types
        const actions = (0, actions_1.getActions)(this);
        // const feedbacks = getFeedbacks(this) as CompanionFeedbacks
        const presets = [...(0, presets_1.getPresets)(this)];
        this.setActions(actions);
        // this.setFeedbackDefinitions(feedbacks)
        this.setPresetDefinitions(presets);
        this.updateVariables();
    }
}
module.exports = EcammLiveInstance;
