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
		category: 'Bridge presets',
		label: `Start Bridge`,
		bank: {
			style: 'text',
			text: `Start Bridge`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'StartBridge', options: { bridgeID: '1' } }],
		feedbacks: [],
	})

	presets.push({
		category: 'Bridge presets',
		label: `Start new Bridge`,
		bank: {
			style: 'text',
			text: `Start new Bridge`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'StartNewBridge', options: { bridgeID: '1' } }],
		feedbacks: [],
	})

	presets.push({
		category: 'Bridge presets',
		label: `Stop Bridge`,
		bank: {
			style: 'text',
			text: `Stop Bridge`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'StopBridge', options: { bridgeID: '1' } }],
		feedbacks: [],
	})

	presets.push({
		category: 'Bridge presets',
		label: `Pin participant`,
		bank: {
			style: 'text',
			text: `Pin participant`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'PinParticipantOnBridge', options: { bridgeID: '1' } }],
		feedbacks: [],
	})

	presets.push({
		category: 'Bridge presets',
		label: `Remove Pin`,
		bank: {
			style: 'text',
			text: `Remove Pin`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'RemovePinnedParticipantFromBridge', options: {} }],
		feedbacks: [],
	})

	presets.push({
		category: 'Bridge modus',
		label: `Switch`,
		bank: {
			style: 'text',
			text: `Active speaker`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'SwitchMode', options: { bridgeID: '1', mode: 'active-speaker' } }],
		feedbacks: [],
	})

	presets.push({
		category: 'Bridge modus',
		label: `Switch`,
		bank: {
			style: 'text',
			text: `Gallery`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'SwitchMode', options: { bridgeID: '1', mode: 'gallery' } }],
		feedbacks: [],
	})

	presets.push({
		category: 'Bridge modus',
		label: `Switch`,
		bank: {
			style: 'text',
			text: `Screen sharing`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'SwitchMode', options: { bridgeID: '1', mode: 'screensharing' } }],
		feedbacks: [],
	})

	presets.push({
		category: 'Get info presets',
		label: `Get Bridges`,
		bank: {
			style: 'text',
			text: `Get Bridges`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'Bridges', options: {} }],
		feedbacks: [],
	})

	presets.push({
		category: 'Get info presets',
		label: `Get Participants`,
		bank: {
			style: 'text',
			text: `Get Participants`,
			size: 'auto',
			color: instance.rgb(255, 255, 255),
			bgcolor: instance.rgb(0, 0, 0),
		},
		actions: [{ action: 'Participants', options: {} }],
		feedbacks: [],
	})

	return presets
}
