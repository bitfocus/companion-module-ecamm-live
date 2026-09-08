import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ModuleInstance } from '../main.js'
import { ConnectionPermission } from '../data-structures/ecamm-enums.js'
import { StyleActive, StyleReady, StyleWarning } from './feedback-utils.js'

export enum FeedbackIdUtility {
	previewModeActive = 'utility_preview_mode_active',
	liveDemoActive = 'utility_live_demo_active',
	uiHidden = 'utility_ui_hidden',
	connectionOk = 'utility_connection_ok',
	awaitingApproval = 'utility_awaiting_approval',
}

export function GetFeedbacksUtility(self: ModuleInstance): {
	[id in FeedbackIdUtility]: CompanionFeedbackDefinition | undefined
} {
	return {
		[FeedbackIdUtility.previewModeActive]: {
			type: 'boolean',
			name: 'Preview mode is active',
			defaultStyle: StyleActive,
			options: [],
			callback: () => self.ecammApi?.state.info.previewMode === true,
		},

		[FeedbackIdUtility.liveDemoActive]: {
			type: 'boolean',
			name: 'Live Demo mode is active',
			defaultStyle: StyleActive,
			options: [],
			callback: () => self.ecammApi?.state.info.liveDemo === true,
		},

		[FeedbackIdUtility.uiHidden]: {
			type: 'boolean',
			name: 'Main window controls are hidden',
			defaultStyle: StyleWarning,
			options: [],
			callback: () => self.ecammApi?.state.info.hidingUi === true,
		},

		[FeedbackIdUtility.connectionOk]: {
			type: 'boolean',
			name: 'Connected to Ecamm Live',
			defaultStyle: StyleReady,
			options: [],
			callback: () => self.ecammApi?.state.connected === true,
		},

		[FeedbackIdUtility.awaitingApproval]: {
			type: 'boolean',
			name: 'Waiting to be approved in Ecamm Live',
			description:
				'True while Ecamm has this client in its Remote Control list but nobody has approved it yet. Worth ' +
				'putting on a button, because until it is approved every command is silently refused.',
			defaultStyle: StyleWarning,
			options: [],
			callback: () => self.ecammApi?.state.permission === ConnectionPermission.Pending,
		},
	}
}
