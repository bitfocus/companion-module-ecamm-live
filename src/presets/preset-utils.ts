import type { CompanionButtonPresetDefinition } from '@companion-module/base'
import type { ActionId } from '../actions.js'
import type { ActionIdAudio } from '../actions/action-audio.js'
import type { ActionIdBroadcast } from '../actions/action-broadcast.js'
import type { ActionIdFilter } from '../actions/action-filter.js'
import type { ActionIdOverlay } from '../actions/action-overlay.js'
import type { ActionIdPreview } from '../actions/action-preview.js'
import type { ActionIdProfile } from '../actions/action-profile.js'
import type { ActionIdScene } from '../actions/action-scene.js'
import type { ActionIdSound } from '../actions/action-sound.js'
import type { ActionIdSource } from '../actions/action-source.js'
import type { ActionIdUtility } from '../actions/action-utility.js'
import type { ActionIdZoom } from '../actions/action-zoom.js'
import type { FeedbackId } from '../feedbacks.js'
import type { FeedbackIdAudio } from '../feedbacks/feedback-audio.js'
import type { FeedbackIdBroadcast } from '../feedbacks/feedback-broadcast.js'
import type { FeedbackIdOverlay } from '../feedbacks/feedback-overlay.js'
import type { FeedbackIdScene } from '../feedbacks/feedback-scene.js'
import type { FeedbackIdSource } from '../feedbacks/feedback-source.js'
import type { FeedbackIdUtility } from '../feedbacks/feedback-utility.js'
import type { FeedbackIdZoom } from '../feedbacks/feedback-zoom.js'

export type AnyActionId =
	| ActionId
	| ActionIdAudio
	| ActionIdBroadcast
	| ActionIdFilter
	| ActionIdOverlay
	| ActionIdPreview
	| ActionIdProfile
	| ActionIdScene
	| ActionIdSound
	| ActionIdSource
	| ActionIdUtility
	| ActionIdZoom

export type AnyFeedbackId =
	| FeedbackId
	| FeedbackIdAudio
	| FeedbackIdBroadcast
	| FeedbackIdOverlay
	| FeedbackIdScene
	| FeedbackIdSource
	| FeedbackIdUtility
	| FeedbackIdZoom

/**
 * A preset whose action and feedback references must come from a real enum.
 *
 * This is the point of the enum discipline: rename an action id and every preset still pointing
 * at the old one fails to compile, instead of shipping a button that silently does nothing.
 */
export interface CompanionPresetExt extends CompanionButtonPresetDefinition {
	feedbacks: Array<{ feedbackId: AnyFeedbackId } & CompanionButtonPresetDefinition['feedbacks'][0]>
	steps: Array<{
		down: Array<{ actionId: AnyActionId } & CompanionButtonPresetDefinition['steps'][0]['down'][0]>
		up: Array<{ actionId: AnyActionId } & CompanionButtonPresetDefinition['steps'][0]['up'][0]>
	}>
}
