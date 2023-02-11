import { combineRgb, CompanionPresetDefinitions, CompanionButtonPresetDefinition } from '@companion-module/base'
import { EcammLiveActions } from './actions'

interface CompanionPresetExt extends CompanionButtonPresetDefinition {
	feedbacks: Array<{} & CompanionButtonPresetDefinition['feedbacks'][0]>
	steps: Array<{
		down: Array<
			{
				actionId: EcammLiveActions
			} & CompanionButtonPresetDefinition['steps'][0]['down'][0]
		>
		up: Array<
			{
				actionId: EcammLiveActions
			} & CompanionButtonPresetDefinition['steps'][0]['up'][0]
		>
	}>
}
interface CompanionPresetDefinitionsExt {
	[id: string]: CompanionPresetExt | undefined
}

export function GetPresets(): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitionsExt = {}

	presets[`toggleMute`] = {
		type: 'button',
		category: 'Basic',
		name: `Toggle Mute`,
		style: {
			text: `Toggle Mute`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: EcammLiveActions.setMute,
						options: {},
					},
				],
				up: [],
			},
		],
	}
	presets[`Go to next Scene`] = {
		type: 'button',
		category: 'Basic',
		name: `Go to next Scene`,
		style: {
			text: `Go to next Scene`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: EcammLiveActions.setNext,
						options: {},
					},
				],
				up: [],
			},
		],
	}

	return presets
}
