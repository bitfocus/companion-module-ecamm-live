import { CompanionPreset } from '../../../instance_skel_types'
import EcammLiveInstance from './index'
import { ActionCallbacks } from './actions'
// import { FeedbackCallbacks } from './feedback'

export type PresetCategory = 'Select Users' | 'User presets' | 'Global Presets' | 'Special Presets'

interface EcammLivePresetAdditions {
	category: string
	actions: ActionCallbacks[]
	release_actions?: ActionCallbacks[]
	// feedbacks: FeedbackCallbacks[]
}

export type EcammLiveGlobalPreset = Exclude<CompanionPreset, 'category' | 'actions' | 'release_actions' | 'feedbacks'> &
	EcammLivePresetAdditions

export function getPresets(instance: EcammLiveInstance): CompanionPreset[] {
	let presets: CompanionPreset[] = []

	presets.push({
		category: 'Basic',
		label: `Mute`,
		bank: {
			style: 'text',
			text: `Mute`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'setMute', options: {} }],
		feedbacks: [],
	})

	return presets
}
