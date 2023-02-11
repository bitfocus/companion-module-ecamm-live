import { CompanionActionDefinitions, InstanceBase, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { Config } from './config'
import { GetActions } from './actions'
import { GetConfigFields } from './config'
import { HTTP } from './http'
// import { getFeedbacks } from './feedback'
// import { getPresets } from './presets'
const { UpdateDefinitions, UpdateVariableValues } = require('./variables')

/**
 * Companion instance class
 */
class EcammLiveInstance extends InstanceBase<Config> {
	
	// Global call settings
	public HTTP: HTTP | null = null
	public config: Config = {
		label: ''
	}

	public basicInfoObj: {
		latestCommand: string
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
		defaultCamera: string
		currentSourceMode: string
	} = {
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
	}

	public sceneList: {
		Locked: boolean
		AutoGroupTimeInterval: number
		SceneSoundVolume: number
		SceneSoundStop: boolean
		title: string
		UUID: string
		AutoGroup: boolean
		AutoGroupRandom: boolean
		Children: []
		LastAspect: string
		CURRENT: boolean
	}[] = []

	public cameraList: {
		title: string
		UUID: string
	}[] = []

	public videoList: {
		title: string
		UUID: string
	}[] = []

	public overlayList: {
		items: []
	} = { items: [] }
	/**
	 * @description constructor
	 * @param internal
	 */
	constructor(internal: unknown) {
		super(internal)
		this.instanceOptions.disableVariableValidation = true
	}

	/**
	 * @description triggered on instance being enabled
	 */
	 public async init(config: Config): Promise<void> {
		this.config = config
		this.log('info', `Welcome, module ecamm live is loading`)
		this.updateStatus(InstanceStatus.Connecting, 'Connecting')
		this.HTTP = new HTTP(this)
		this.updateInstance()
	}

	/**
	 * @returns config options
	 * @description generates the config options available for this instance
	 */
	 public getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}


	/**
	 * @param config new configuration data
	 * @description triggered every time the config for this instance is saved
	 */
	public async configUpdated(config: Config): Promise<void> {
		this.config = config
		this.log('debug','changing config! '+config)
		this.updateInstance()
	}

	/**
	 * @description close connections and stop timers/intervals
	 */
	public async destroy(): Promise<void> {
		this.log('debug', `Instance destroyed: ${this.id}`)
	}

	/**
	 * @description Create and update variables
	 */
	public updateVariables(): void {
		UpdateDefinitions()
		UpdateVariableValues()
	}
	/**
	 * @description Update variables
	 */
	public updateVariableValues(): void {
		UpdateVariableValues()
	}

	/**
	 * @description sets actions, presets and feedbacks available for this instance
	 */
	public updateInstance(): void {
		// Cast actions and feedbacks from EcammLive types to Companion types
		const actions = GetActions(this) as CompanionActionDefinitions
		// const feedbacks = getFeedbacks(this) as CompanionFeedbacks
		// const presets = [...getPresets(this)] as CompanionPreset[]

		this.setActionDefinitions(actions)
		// this.setFeedbackDefinitions(feedbacks)
		// this.setPresetDefinitions(presets)
		this.updateVariables()
	}
}

export = EcammLiveInstance
