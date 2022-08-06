import EcammLiveInstance from '.'
import { request } from 'urllib'
const bonjour = require('bonjour')()

export class HTTP {
	private readonly instance: EcammLiveInstance
	private host: string = ''
	private port: number = 0

	constructor(instance: EcammLiveInstance) {
		this.instance = instance

		// Connect
		this.Connect()
			.then(() => {
				this.instance.status(this.instance.STATUS_OK)
				console.log('Ecamm Live active')
				this.sendCommand('getInfo')
			})
			.catch(() => {
				this.instance.log('warn', `Unable to connect, please configure a host and port in the instance configuration`)
				this.instance.status(this.instance.STATUS_ERROR, 'wrong settings')
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
				console.log('Search for ecamm live')

				bonjour.find({ type: 'ecammliveremote' }, (service: { host: string; port: number }) => {
					this.host = service.host
					this.port = service.port
					console.log('connection info', this.host, this.port)

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
					this.instance.variables?.updateVariables()
					break
				case 'getButtonLabel':
					this.instance.basicInfoObj.ButtonLabel = received[0]
					this.instance.variables?.updateVariables()
					break
				case 'getPauseButtonLabel':
					this.instance.basicInfoObj.PauseButtonLabel = received[0]
					this.instance.variables?.updateVariables()
					break
				case 'getSceneList':
					this.instance.sceneList.length = 0
					this.instance.sceneList = received.items
					break
				case 'getSceneImage':
					// do nothing for now
					break
				case 'getCurrentScene':
					this.instance.basicInfoObj.CurrentScene = received[0]
					this.instance.variables?.updateVariables()
					break
				case 'getMute':
					this.instance.basicInfoObj.Mute = received[0]
					this.instance.variables?.updateVariables()
					break
				case 'getViewers':
					this.instance.basicInfoObj.Viewers = parseInt(received[0])
					this.instance.variables?.updateVariables()
					break
				case 'getInputs':
					this.instance.cameraList.length = 0
					this.instance.cameraList = received.items
					break
				case 'getDefaultCamera':
					this.instance.basicInfoObj.defaultCamera = received[0]
					this.instance.variables?.updateVariables()
					break
				case 'getCurrentMode':
					this.instance.basicInfoObj.currentSourceMode = received[0]
					this.instance.variables?.updateVariables()
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
						console.log('unknown command or need to fill in:', this.instance.basicInfoObj.latestCommand)
						console.log('received:',received);
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
		console.log(`sending: http://${this.host}:${this.port}/${command}`)
		const { data } = await request(`http://${this.host}:${this.port}/${command}`)
		this.processData(data.toString())
	}

	/**
	 * @description Check for config changes and start new connections/polling if needed
	 */
	public readonly update = (): void => {
		bonjour.destroy()
		this.Connect()
			.then(() => {
				this.instance.status(this.instance.STATUS_OK)
				console.log('Ecamm Live active')
			})
			.catch(() => {
				this.instance.log('warn', `Unable to connect, please configure a host and port in the instance configuration`)
				this.instance.status(this.instance.STATUS_ERROR, 'wrong settings')
			})
	}
}
