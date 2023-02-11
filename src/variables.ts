import { CompanionVariableValues, InstanceBase, InstanceStatus } from '@companion-module/base'
import { Config } from './config'

module.exports = {
	UpdateDefinitions(instance: InstanceBase<Config>): void {
		let basiscs = []
		// The basics

		basiscs.push({ name: `Latest command`, variableId: `LatestCommand` })
		basiscs.push({ name: `PauseButtonLabel`, variableId: `PauseButtonLabel` })
		basiscs.push({ name: `ButtonLabel`, variableId: `ButtonLabel` })
		basiscs.push({ name: `Mute`, variableId: `Mute` })
		basiscs.push({ name: `VOLUME_MOVIE`, variableId: `VOLUME_MOVIE` })
		basiscs.push({ name: `MUTE_SOUNDEFFECTS`, variableId: `MUTE_SOUNDEFFECTS` })
		basiscs.push({ name: `MUTE_MIC`, variableId: `MUTE_MIC` })
		basiscs.push({ name: `VOLUME_MIC`, variableId: `VOLUME_MIC` })
		basiscs.push({ name: `CurrentScene`, variableId: `CurrentScene` })
		basiscs.push({ name: `PreviewMode`, variableId: `PreviewMode` })
		basiscs.push({ name: `VOLUME_SOUNDEFFECTS`, variableId: `VOLUME_SOUNDEFFECTS` })
		basiscs.push({ name: `LiveDemo`, variableId: `LiveDemo` })
		basiscs.push({ name: `Viewers`, variableId: `Viewers` })
		basiscs.push({ name: `MUTE_MOVIE`, variableId: `MUTE_MOVIE` })

		let filteredVariables = [...basiscs]

		instance.setVariableDefinitions(filteredVariables)
	},

	UpdateVariableValues(instance: InstanceBase<Config>): void {
		try {
			const newVariables: CompanionVariableValues = {}

			newVariables[`LatestCommand`] = this.instance.basicInfoObj.latestCommand
			newVariables[`PauseButtonLabel`] = this.instance.basicInfoObj.PauseButtonLabel
			newVariables[`ButtonLabel`] = this.instance.basicInfoObj.ButtonLabel
			newVariables[`Mute`] = this.instance.basicInfoObj.Mute
			newVariables[`VOLUME_MOVIE`] = this.instance.basicInfoObj.VOLUME_MOVIE
			newVariables[`MUTE_SOUNDEFFECTS`] = this.instance.basicInfoObj.MUTE_SOUNDEFFECTS
			newVariables[`MUTE_MIC`] = this.instance.basicInfoObj.MUTE_MIC
			newVariables[`VOLUME_MIC`] = this.instance.basicInfoObj.VOLUME_MIC
			newVariables[`CurrentScene`] = this.instance.basicInfoObj.CurrentScene
			newVariables[`PreviewMode`] = this.instance.basicInfoObj.PreviewMode
			newVariables[`HidingUI`] = this.instance.basicInfoObj.HidingUI
			newVariables[`VOLUME_SOUNDEFFECTS`] = this.instance.basicInfoObj.VOLUME_SOUNDEFFECTS
			newVariables[`LiveDemo`] = this.instance.basicInfoObj.LiveDemo
			newVariables[`Viewers`] = this.instance.basicInfoObj.Viewers
			newVariables[`MUTE_MOVIE`] = this.instance.basicInfoObj.MUTE_MOVIE
			instance.setVariableValues(newVariables)
		} catch (error: any) {
			instance.updateStatus(InstanceStatus.UnknownWarning)
			instance.log('error', `Error checking variables: ${error.toString()}`)
		}
	},
}
