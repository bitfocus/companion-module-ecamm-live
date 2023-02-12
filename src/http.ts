import { request } from 'urllib'
import { Uuid } from 'node-ts-uuid'
import { InstanceStatus } from '@companion-module/base'
import { Config, InstanceBaseExt } from './config'
const bonjour = require('bonjour')()

export class HTTP {
	private instance: InstanceBaseExt<Config>
	private host: string = ''
	private port: number = 0
	private uuid: string = Uuid.generate({
		length: 25,
		prefix: 'companion-',
	})

	constructor(instance: InstanceBaseExt<Config>) {
		this.instance = instance

		// Connect
		this.Connect()
			.then(() => {
				this.instance.updateStatus(InstanceStatus.Ok)
				this.instance.log('debug', 'Ecamm Live active')
				this.sendCommand('getInfo')
			})
			.catch(() => {
				this.instance.log('warn', `Unable to connect, please configure a host and port in the instance configuration`)
				this.instance.updateStatus(InstanceStatus.UnknownWarning, 'wrong settings')
			})
	}

	/**
	 * @description Close connection on instance disable/removal
	 */
	public readonly destroy = (): void => {}

	/**
	 * @description Do a check
	 */
	public readonly Connect = () => {
		let p = new Promise((resolve, reject) => {
			try {
				this.instance.log('debug', 'Search for ecamm live')

				bonjour.find({ type: 'ecammliveremote' }, (service: { host: string; port: number }) => {
					this.host = service.host
					this.port = service.port
					this.instance.log('debug', `Connection info:, ${this.host}, ${this.port}`)

					resolve('ready for HTTP requests')
				})
			} catch (e) {
				console.error(e)
				reject(e)
			}
		})
		return p
	}

	private processData = (data: string) => {
		try {
			let received = JSON.parse(data)
			this.instance.log('debug', `Received, ${JSON.stringify(received)}`)

			switch (this.instance.basicInfoObj.latestCommand) {
				case 'getInfo':
					this.instance.basicInfoObj.PauseButtonLabel = received.PauseButtonLabel
					this.instance.basicInfoObj.ButtonLabel = received.ButtonLabel
					this.instance.basicInfoObj.Mute = received.Mute
					this.instance.basicInfoObj.VOLUME_MOVIE = received.VOLUME_MOVIE
					this.instance.basicInfoObj.MUTE_SOUNDEFFECTS = received.MUTE_SOUNDEFFECTS
					this.instance.basicInfoObj.MUTE_MIC = received.MUTE_MIC
					this.instance.basicInfoObj.VOLUME_MIC = received.VOLUME_MIC
					this.instance.basicInfoObj.CurrentScene = received.CurrentScene
					this.instance.basicInfoObj.PreviewMode = received.PreviewMode
					this.instance.basicInfoObj.HidingUI = received.HidingUI
					this.instance.basicInfoObj.VOLUME_SOUNDEFFECTS = received.VOLUME_SOUNDEFFECTS
					this.instance.basicInfoObj.LiveDemo = received.LiveDemo
					this.instance.basicInfoObj.Viewers = received.Viewers
					this.instance.basicInfoObj.MUTE_MOVIE = received.MUTE_MOVIE
					this.instance.updateVariableValues()
					break
				case 'getButtonLabel':
					this.instance.basicInfoObj.ButtonLabel = received[0]
					this.instance.updateVariableValues()
					break
				case 'getPauseButtonLabel':
					this.instance.basicInfoObj.PauseButtonLabel = received[0]
					this.instance.updateVariableValues()
					break
				case 'getSceneList':
					this.instance.sceneList.length = 0
					this.instance.sceneList = received.items
					this.instance.updateInstance()
					break
				case 'getSceneImage':
					// do nothing for now
					break
				case 'getCurrentScene':
					this.instance.basicInfoObj.CurrentScene = received[0]
					this.instance.updateVariableValues()
					break
				case 'getMute':
					this.instance.basicInfoObj.Mute = received[0]
					this.instance.updateVariableValues()
					break
				case 'getViewers':
					this.instance.basicInfoObj.Viewers = parseInt(received[0])
					this.instance.updateVariableValues()
					break
				case 'getInputs':
					this.instance.cameraList.length = 0
					this.instance.cameraList = received.items
					break
				case 'getDefaultCamera':
					this.instance.basicInfoObj.defaultCamera = received[0]
					this.instance.updateVariableValues()
					break
				case 'getCurrentMode':
					this.instance.basicInfoObj.currentSourceMode = received[0]
					this.instance.updateVariableValues()
					break
				case 'getVideoList':
					this.instance.videoList.length = 0
					this.instance.videoList = received.items
					break
				case 'getVideoImage':
					// Do nothing
					break
				case 'getOverlayList':
					this.instance.overlayList.items.length = 0
					this.instance.overlayList = received
					break
				// case 'getOverlayImage':
				// 	// TODO
				// 	break
				// case 'getSoundList':
				// 	// TODO
				// 	break
				default:
					console.log('Received unknown response:', this.instance.basicInfoObj.latestCommand)
					console.log('received:', received)
					break
			}

			// if (received.isArray()) {
			// 	if (received[0] === 'Done') {
			// 		console.log('Command succesfull')
			// 		this.sendCommand('getInfo')
			// 	}
			// }

			this.instance.updateVariables()
		} catch (err) {
			console.error(err)
		}
	}

	/**
	 * @param command function and any params
	 * @description Check OSC connection status and format command
	 */
	public readonly sendCommand = async (command: string): Promise<void> => {
		this.instance.log('debug', `sending: http://${this.host}:${this.port}/${command}`)
		const { data } = await request(`http://${this.host}:${this.port}/${command}`, {
			headers: {
				'User-Agent': 'Companion/version3',
				'EcammLive-UUID': this.uuid,
				'EcammLive-ClientName': 'Companion',
			},
		})
		this.processData(data.toString())
	}

	/**
	 * @description Check for config changes and start new connections/polling if needed
	 */
	public readonly update = (): void => {
		bonjour.destroy()
		this.Connect()
			.then(() => {
				this.instance.updateStatus(InstanceStatus.Ok)
				console.log('Ecamm Live active')
			})
			.catch(() => {
				this.instance.log('warn', `Unable to connect, please configure a host and port in the instance configuration`)
				this.instance.updateStatus(InstanceStatus.UnknownWarning, 'wrong settings')
			})
	}
}
