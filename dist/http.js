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
                ///////
                try {
                    // // browse for all http services
                    // bonjour
                    // 	.find({ type: 'http' }, (service: { port: string; host: number }) => {
                    // 		console.log('Found an HTTP server:', service)
                    // 		resolve('ready for HTTP requests')
                    // 	})
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
            try {
                let received = JSON.parse(data);
                console.log('received', received);
                if (received.isArray()) {
                    if (received[0] === 'Done') {
                        console.log('Command succesfull');
                        this.sendCommand('getInfo');
                    }
                }
                if (received.PauseButtonLabel)
                    this.instance.basicInfoObj.PauseButtonLabel = received.PauseButtonLabel;
                if (received.ButtonLabel)
                    this.instance.basicInfoObj.ButtonLabel = received.ButtonLabel;
                if (received.Mute)
                    this.instance.basicInfoObj.Mute = received.Mute;
                if (received.VOLUME_MOVIE)
                    this.instance.basicInfoObj.VOLUME_MOVIE = received.VOLUME_MOVIE;
                if (received.MUTE_SOUNDEFFECTS)
                    this.instance.basicInfoObj.MUTE_SOUNDEFFECTS = received.MUTE_SOUNDEFFECTS;
                if (received.MUTE_MIC)
                    this.instance.basicInfoObj.MUTE_MIC = received.MUTE_MIC;
                if (received.VOLUME_MIC)
                    this.instance.basicInfoObj.VOLUME_MIC = received.VOLUME_MIC;
                if (received.CurrentScene)
                    this.instance.basicInfoObj.CurrentScene = received.CurrentScene;
                if (received.PreviewMode)
                    this.instance.basicInfoObj.PreviewMode = received.PreviewMode;
                if (received.HidingUI)
                    this.instance.basicInfoObj.HidingUI = received.HidingUI;
                if (received.VOLUME_SOUNDEFFECTS)
                    this.instance.basicInfoObj.VOLUME_SOUNDEFFECTS = received.VOLUME_SOUNDEFFECTS;
                if (received.LiveDemo)
                    this.instance.basicInfoObj.LiveDemo = received.LiveDemo;
                if (received.Viewers)
                    this.instance.basicInfoObj.Viewers = received.Viewers;
                if (received.MUTE_MOVIE)
                    this.instance.basicInfoObj.MUTE_MOVIE = received.MUTE_MOVIE;
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
