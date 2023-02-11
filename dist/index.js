"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("@companion-module/base");
const actions_1 = require("./actions");
const config_1 = require("./config");
const http_1 = require("./http");
// import { GetFeedbacks } from './feedback'
// import { GetPresets } from './presets'
const { UpdateDefinitions, UpdateVariableValues } = require('./variables');
/**
 * Companion instance class
 */
class EcammLiveInstance extends base_1.InstanceBase {
    /**
     * @description constructor
     * @param internal
     */
    constructor(internal) {
        super(internal);
        // Global call settings
        this.HTTP = null;
        this.config = {
            label: ''
        };
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
        // this.instanceOptions.disableVariableValidation = true
    }
    /**
     * @description triggered on instance being enabled
     */
    async init(config) {
        this.config = config;
        this.log('info', `Welcome, module ecamm live is loading`);
        this.updateStatus(base_1.InstanceStatus.Connecting, 'Connecting');
        this.HTTP = new http_1.HTTP(this);
        this.updateInstance();
    }
    /**
     * @returns config options
     * @description generates the config options available for this instance
     */
    getConfigFields() {
        return (0, config_1.GetConfigFields)();
    }
    /**
     * @param config new configuration data
     * @description triggered every time the config for this instance is saved
     */
    async configUpdated(config) {
        this.config = config;
        this.log('debug', 'changing config! ' + config);
        this.updateInstance();
    }
    /**
     * @description close connections and stop timers/intervals
     */
    async destroy() {
        this.log('debug', `Instance destroyed: ${this.id}`);
    }
    /**
     * @description Create and update variables
     */
    updateVariables() {
        UpdateDefinitions(this);
        UpdateVariableValues(this);
    }
    /**
     * @description Update variables
     */
    updateVariableValues() {
        UpdateVariableValues(this);
    }
    /**
     * @description sets actions, presets and feedbacks available for this instance
     */
    updateInstance() {
        // Cast actions and feedbacks from EcammLive types to Companion types
        const actions = (0, actions_1.GetActions)(this);
        // const feedbacks = getFeedbacks(this) as CompanionFeedbacks
        // const presets = [...getPresets(this)] as CompanionPreset[]
        this.setActionDefinitions(actions);
        // this.setFeedbackDefinitions(feedbacks)
        // this.setPresetDefinitions(presets)
        this.updateVariables();
    }
}
(0, base_1.runEntrypoint)(EcammLiveInstance, []);
