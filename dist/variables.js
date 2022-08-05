"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Variables = void 0;
class Variables {
    constructor(instance) {
        /**
         * @param name Instance variable name
         * @returns Value of instance variable or undefined
         * @description Retrieves instance variable from any EcammLive instances
         */
        this.get = (variable) => {
            let data;
            this.instance.parseVariables(variable, (value) => {
                data = value;
            });
            return data;
        };
        /**
         * @param variables Object of variable names and their values
         * @description Updates or removes variable for current instance
         */
        this.set = (variables) => {
            var _a;
            const newVariables = {};
            for (const name in variables) {
                newVariables[name] = (_a = variables[name]) === null || _a === void 0 ? void 0 : _a.toString();
            }
            this.instance.setVariables(newVariables);
        };
        /**
         * @description Sets variable definitions
         */
        this.updateDefinitions = () => {
            let basiscs = [];
            // The basics
            basiscs.push({ label: `PauseButtonLabel`, name: `PauseButtonLabel` });
            basiscs.push({ label: `ButtonLabel`, name: `ButtonLabel` });
            basiscs.push({ label: `Mute`, name: `Mute` });
            basiscs.push({ label: `VOLUME_MOVIE`, name: `VOLUME_MOVIE` });
            basiscs.push({ label: `MUTE_SOUNDEFFECTS`, name: `MUTE_SOUNDEFFECTS` });
            basiscs.push({ label: `MUTE_MIC`, name: `MUTE_MIC` });
            basiscs.push({ label: `VOLUME_MIC`, name: `VOLUME_MIC` });
            basiscs.push({ label: `CurrentScene`, name: `CurrentScene` });
            basiscs.push({ label: `PreviewMode`, name: `PreviewMode` });
            basiscs.push({ label: `VOLUME_SOUNDEFFECTS`, name: `VOLUME_SOUNDEFFECTS` });
            basiscs.push({ label: `LiveDemo`, name: `LiveDemo` });
            basiscs.push({ label: `Viewers`, name: `Viewers` });
            basiscs.push({ label: `MUTE_MOVIE`, name: `MUTE_MOVIE` });
            let filteredVariables = [...basiscs];
            this.instance.setVariableDefinitions(filteredVariables);
        };
        /**
         * @description Update variables
         */
        this.updateVariables = () => {
            const newVariables = {};
            newVariables[`PauseButtonLabel`] = this.instance.basicInfoObj.PauseButtonLabel;
            newVariables[`ButtonLabel`] = this.instance.basicInfoObj.ButtonLabel;
            newVariables[`Mute`] = this.instance.basicInfoObj.Mute;
            newVariables[`VOLUME_MOVIE`] = this.instance.basicInfoObj.VOLUME_MOVIE;
            newVariables[`MUTE_SOUNDEFFECTS`] = this.instance.basicInfoObj.MUTE_SOUNDEFFECTS;
            newVariables[`MUTE_MIC`] = this.instance.basicInfoObj.MUTE_MIC;
            newVariables[`VOLUME_MIC`] = this.instance.basicInfoObj.VOLUME_MIC;
            newVariables[`CurrentScene`] = this.instance.basicInfoObj.CurrentScene;
            newVariables[`PreviewMode`] = this.instance.basicInfoObj.PreviewMode;
            newVariables[`HidingUI`] = this.instance.basicInfoObj.HidingUI;
            newVariables[`VOLUME_SOUNDEFFECTS`] = this.instance.basicInfoObj.VOLUME_SOUNDEFFECTS;
            newVariables[`LiveDemo`] = this.instance.basicInfoObj.LiveDemo;
            newVariables[`Viewers`] = this.instance.basicInfoObj.Viewers;
            newVariables[`MUTE_MOVIE`] = this.instance.basicInfoObj.MUTE_MOVIE;
            this.set(newVariables);
            this.updateDefinitions();
        };
        this.instance = instance;
    }
}
exports.Variables = Variables;
