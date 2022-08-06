"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP = void 0;
const urllib_1 = require("urllib");
const bonjour = require('bonjour')();
class HTTP {
    constructor(instance) {
        this.host = '';
        this.port = 0;
        /**
         * @description Close connection on instance disable/removal
         */
        this.destroy = () => { };
        /**
         * @description Do a check
         */
        this.Connect = () => {
            let p = new Promise((resolve, reject) => {
                try {
                    console.log('Search for ecamm live');
                    bonjour.find({ type: 'ecammliveremote' }, (service) => {
                        this.host = service.host;
                        this.port = service.port;
                        console.log('connection info', this.host, this.port);
                        resolve('ready for HTTP requests');
                    });
                }
                catch (e) {
                    console.error(e);
                    reject(e);
                }
            });
            return p;
        };
        this.processData = (data) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            try {
                let received = JSON.parse(data);
                switch (this.instance.basicInfoObj.latestCommand) {
                    case 'getInfo':
                        this.instance.basicInfoObj.PauseButtonLabel = received.PauseButtonLabel;
                        this.instance.basicInfoObj.ButtonLabel = received.ButtonLabel;
                        this.instance.basicInfoObj.Mute = received.Mute;
                        this.instance.basicInfoObj.VOLUME_MOVIE = received.VOLUME_MOVIE;
                        this.instance.basicInfoObj.MUTE_SOUNDEFFECTS = received.MUTE_SOUNDEFFECTS;
                        this.instance.basicInfoObj.MUTE_MIC = received.MUTE_MIC;
                        this.instance.basicInfoObj.VOLUME_MIC = received.VOLUME_MIC;
                        this.instance.basicInfoObj.CurrentScene = received.CurrentScene;
                        this.instance.basicInfoObj.PreviewMode = received.PreviewMode;
                        this.instance.basicInfoObj.HidingUI = received.HidingUI;
                        this.instance.basicInfoObj.VOLUME_SOUNDEFFECTS = received.VOLUME_SOUNDEFFECTS;
                        this.instance.basicInfoObj.LiveDemo = received.LiveDemo;
                        this.instance.basicInfoObj.Viewers = received.Viewers;
                        this.instance.basicInfoObj.MUTE_MOVIE = received.MUTE_MOVIE;
                        (_a = this.instance.variables) === null || _a === void 0 ? void 0 : _a.updateVariables();
                        break;
                    case 'getButtonLabel':
                        this.instance.basicInfoObj.ButtonLabel = received[0];
                        (_b = this.instance.variables) === null || _b === void 0 ? void 0 : _b.updateVariables();
                        break;
                    case 'getPauseButtonLabel':
                        this.instance.basicInfoObj.PauseButtonLabel = received[0];
                        (_c = this.instance.variables) === null || _c === void 0 ? void 0 : _c.updateVariables();
                        break;
                    case 'getSceneList':
                        this.instance.sceneList.length = 0;
                        this.instance.sceneList = received.items;
                        break;
                    case 'getSceneImage':
                        // do nothing for now
                        break;
                    case 'getCurrentScene':
                        this.instance.basicInfoObj.CurrentScene = received[0];
                        (_d = this.instance.variables) === null || _d === void 0 ? void 0 : _d.updateVariables();
                        break;
                    case 'getMute':
                        this.instance.basicInfoObj.Mute = received[0];
                        (_e = this.instance.variables) === null || _e === void 0 ? void 0 : _e.updateVariables();
                        break;
                    case 'getViewers':
                        this.instance.basicInfoObj.Viewers = parseInt(received[0]);
                        (_f = this.instance.variables) === null || _f === void 0 ? void 0 : _f.updateVariables();
                        break;
                    case 'getInputs':
                        this.instance.cameraList.length = 0;
                        this.instance.cameraList = received.items;
                        break;
                    case 'getDefaultCamera':
                        this.instance.basicInfoObj.defaultCamera = received[0];
                        (_g = this.instance.variables) === null || _g === void 0 ? void 0 : _g.updateVariables();
                        break;
                    case 'getCurrentMode':
                        this.instance.basicInfoObj.currentSourceMode = received[0];
                        (_h = this.instance.variables) === null || _h === void 0 ? void 0 : _h.updateVariables();
                        break;
                    case 'getVideoList':
                        this.instance.videoList.length = 0;
                        this.instance.videoList = received.items;
                        break;
                    case 'getVideoImage':
                        // Do nothing
                        break;
                    case 'getOverlayList':
                        this.instance.overlayList.items.length = 0;
                        this.instance.overlayList = received;
                        break;
                    // case 'getOverlayImage':
                    // 	// TODO
                    // 	break
                    // case 'getSoundList':
                    // 	// TODO	
                    // 	break
                    default:
                        console.log('unknown command or need to fill in:', this.instance.basicInfoObj.latestCommand);
                        console.log('received:', received);
                        break;
                }
                // if (received.isArray()) {
                // 	if (received[0] === 'Done') {
                // 		console.log('Command succesfull')
                // 		this.sendCommand('getInfo')
                // 	}
                // }
                this.instance.updateVariables();
            }
            catch (err) {
                console.error(err);
            }
        };
        /**
         * @param command function and any params
         * @description Check OSC connection status and format command
         */
        this.sendCommand = async (command) => {
            console.log(`sending: http://${this.host}:${this.port}/${command}`);
            const { data } = await (0, urllib_1.request)(`http://${this.host}:${this.port}/${command}`);
            this.processData(data.toString());
        };
        /**
         * @description Check for config changes and start new connections/polling if needed
         */
        this.update = () => {
            bonjour.destroy();
            this.Connect()
                .then(() => {
                this.instance.status(this.instance.STATUS_OK);
                console.log('Ecamm Live active');
            })
                .catch(() => {
                this.instance.log('warn', `Unable to connect, please configure a host and port in the instance configuration`);
                this.instance.status(this.instance.STATUS_ERROR, 'wrong settings');
            });
        };
        this.instance = instance;
        // Connect
        this.Connect()
            .then(() => {
            this.instance.status(this.instance.STATUS_OK);
            console.log('Ecamm Live active');
            this.sendCommand('getInfo');
        })
            .catch(() => {
            this.instance.log('warn', `Unable to connect, please configure a host and port in the instance configuration`);
            this.instance.status(this.instance.STATUS_ERROR, 'wrong settings');
        });
    }
}
exports.HTTP = HTTP;
