import instance_skel = require('../../../instance_skel')
import {
	CompanionActions,
	CompanionConfigField,
	// CompanionFeedbacks,
	CompanionPreset,
	CompanionSystem,
} from '../../../instance_skel_types'
import { Config } from './config'
import { getActions } from './actions'
import { getConfigFields } from './config'
import { HTTP } from './http'
// import { getFeedbacks } from './feedback'
import { getPresets } from './presets'
import { Variables } from './variables'

/**
 * Companion instance class
 */
class EcammLiveInstance extends instance_skel<Config> {
	// Global call settings
	public variables: Variables | null = null
	public HTTP: HTTP | null = null
	
	public basicInfoObj: {
		PauseButtonLabel: string
		ButtonLabel: string
		Mute: string
		VOLUME_MOVIE: number
		MUTE_SOUNDEFFECTS: string
		MUTE_MIC: string
		VOLUME_MIC: number
		CurrentScene: string
		PreviewMode: string
		HidingUI: string
		VOLUME_SOUNDEFFECTS: number
		LiveDemo: string
		Viewers: number
		MUTE_MOVIE: string
	} = {
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
	}

	constructor(system: CompanionSystem, id: string, config: Config) {
		super(system, id, config)
		this.system = system
		this.config = config
	}

	/**
	 * @description triggered on instance being enabled
	 */
	public init(): void {
		this.log('info', `Welcome, module is loading`)
		this.status(this.STATUS_WARNING, 'Connecting')
		this.HTTP = new HTTP(this)
		this.variables = new Variables(this)
		this.updateInstance()
	}

	/**
	 * @returns config options
	 * @description generates the config options available for this instance
	 */
	public readonly config_fields = (): CompanionConfigField[] => {
		return getConfigFields()
	}

	/**
	 * @param config new configuration data
	 * @description triggered every time the config for this instance is saved
	 */
	public updateConfig(config: Config): void {
		console.log('changing config!', config)
		this.config = config
		this.updateInstance()
	}

	/**
	 * @description close connections and stop timers/intervals
	 */
	public readonly destroy = (): void => {
		this.log('debug', `Instance destroyed: ${this.id}`)
	}

	/**
	 * @description Create and update variables
	 */
	public updateVariables(): void {
		if (this.variables) {
			console.log('update variables')
			this.variables.updateDefinitions()
			this.variables.updateVariables()
		}
	}

	/**
	 * @description sets actions, presets and feedbacks available for this instance
	 */
	public updateInstance(): void {
		// Cast actions and feedbacks from EcammLive types to Companion types
		const actions = getActions(this) as CompanionActions
		// const feedbacks = getFeedbacks(this) as CompanionFeedbacks
		const presets = [...getPresets(this)] as CompanionPreset[]

		this.setActions(actions)
		// this.setFeedbackDefinitions(feedbacks)
		this.setPresetDefinitions(presets)
		this.updateVariables()
	}
}

export = EcammLiveInstance
