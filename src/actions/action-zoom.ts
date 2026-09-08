import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { ZOOM_PANEL_CHOICES, ZoomPanel } from '../data-structures/ecamm-enums.js'
import { runCommand } from './action-utils.js'

export enum ActionIdZoom {
	zoomNew = 'zoomNew',
	zoomLeave = 'zoomLeave',
	zoomPanel = 'zoomPanel',
	zoomVideo = 'zoomVideo',
	zoomAudio = 'zoomAudio',
	zoomMuteAll = 'zoomMuteAll',
	zoomRaiseHand = 'zoomRaiseHand',
	zoomFullScreen = 'zoomFullScreen',
	zoomCloudRecord = 'zoomCloudRecord',
	zoomLocalRecord = 'zoomLocalRecord',
	zoomPauseRecord = 'zoomPauseRecord',
	zoomPrevGallery = 'zoomPrevGallery',
	zoomNextGallery = 'zoomNextGallery',
	zoomGallerySpeaker = 'zoomGallerySpeaker',
	zoomSpotlightSelf = 'zoomSpotlightSelf',
}

export function GetActionsZoom(self: ModuleInstance): {
	[id in ActionIdZoom]: CompanionActionDefinition | undefined
} {
	/** Every Zoom command is a parameterless toggle, so they share one shape. */
	const simple = (name: string, description: string, run: () => Promise<void>): CompanionActionDefinition => ({
		name,
		description,
		options: [],
		callback: async () => runCommand(self, name, run),
	})

	const client = () => self.ecammApi!.client

	return {
		[ActionIdZoom.zoomNew]: {
			name: 'Zoom: Start a new meeting',
			options: [
				{
					type: 'checkbox',
					id: 'pmi',
					label: 'Use Personal Meeting ID',
					default: true,
				},
			],
			callback: async (action) =>
				runCommand(self, 'Start a new Zoom meeting', async () => client().setZoomNew(action.options.pmi !== false)),
		},

		[ActionIdZoom.zoomLeave]: {
			name: 'Zoom: Leave meeting',
			options: [
				{
					type: 'checkbox',
					id: 'end',
					label: 'End the meeting for everyone (host only)',
					default: true,
				},
			],
			callback: async (action) =>
				runCommand(self, 'Leave Zoom meeting', async () => client().setZoomLeave(action.options.end !== false)),
		},

		[ActionIdZoom.zoomPanel]: {
			name: 'Zoom: Show or hide a panel',
			options: [
				{ type: 'dropdown', id: 'panel', label: 'Panel', choices: ZOOM_PANEL_CHOICES, default: ZoomPanel.Meeting },
			],
			callback: async (action) =>
				runCommand(self, 'Toggle Zoom panel', async () =>
					client().setZoomPanel(String(action.options.panel ?? ZoomPanel.Meeting) as ZoomPanel),
				),
		},

		[ActionIdZoom.zoomVideo]: simple('Zoom: Toggle video', 'Starts or stops your Zoom camera.', async () =>
			client().setZoomVideo(),
		),
		[ActionIdZoom.zoomAudio]: simple('Zoom: Toggle microphone', 'Mutes or unmutes your Zoom mic.', async () =>
			client().setZoomAudio(),
		),
		[ActionIdZoom.zoomMuteAll]: simple('Zoom: Mute everyone else', 'Host and co-host only.', async () =>
			client().setZoomMuteAll(),
		),
		[ActionIdZoom.zoomRaiseHand]: simple('Zoom: Raise or lower hand', '', async () => client().setZoomRaiseHand()),
		[ActionIdZoom.zoomFullScreen]: simple('Zoom: Toggle full screen', '', async () => client().setZoomFullScreen()),
		[ActionIdZoom.zoomCloudRecord]: simple('Zoom: Toggle cloud recording', '', async () =>
			client().setZoomCloudRecord(),
		),
		[ActionIdZoom.zoomLocalRecord]: simple('Zoom: Toggle local recording', '', async () =>
			client().setZoomLocalRecord(),
		),
		[ActionIdZoom.zoomPauseRecord]: simple(
			'Zoom: Pause or resume recording',
			'Applies to whichever recording is running.',
			async () => client().setZoomPauseRecord(),
		),
		[ActionIdZoom.zoomPrevGallery]: simple('Zoom: Previous gallery page', '', async () =>
			client().setZoomPrevGallery(),
		),
		[ActionIdZoom.zoomNextGallery]: simple('Zoom: Next gallery page', '', async () => client().setZoomNextGallery()),
		[ActionIdZoom.zoomGallerySpeaker]: simple('Zoom: Switch gallery / speaker view', '', async () =>
			client().setZoomGallerySpeaker(),
		),
		[ActionIdZoom.zoomSpotlightSelf]: simple('Zoom: Toggle spotlight on yourself', '', async () =>
			client().setSpotlightSelf(),
		),
	}
}
