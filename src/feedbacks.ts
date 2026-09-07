import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { FeedbackIdAudio, GetFeedbacksAudio } from './feedbacks/feedback-audio.js'
import { FeedbackIdBroadcast, GetFeedbacksBroadcast } from './feedbacks/feedback-broadcast.js'
import { FeedbackIdOverlay, GetFeedbacksOverlay } from './feedbacks/feedback-overlay.js'
import { FeedbackIdScene, GetFeedbacksScene } from './feedbacks/feedback-scene.js'
import { FeedbackIdSource, GetFeedbacksSource } from './feedbacks/feedback-source.js'
import { FeedbackIdUtility, GetFeedbacksUtility } from './feedbacks/feedback-utility.js'
import { FeedbackIdZoom, GetFeedbacksZoom } from './feedbacks/feedback-zoom.js'

/** Base enum for uncategorised feedbacks; kept empty so the union below always has an anchor. */
export enum FeedbackId {}

export function UpdateFeedbacks(self: ModuleInstance): void {
	const audio: { [id in FeedbackIdAudio]: CompanionFeedbackDefinition | undefined } = GetFeedbacksAudio(self)
	const broadcast: { [id in FeedbackIdBroadcast]: CompanionFeedbackDefinition | undefined } =
		GetFeedbacksBroadcast(self)
	const overlay: { [id in FeedbackIdOverlay]: CompanionFeedbackDefinition | undefined } = GetFeedbacksOverlay(self)
	const scene: { [id in FeedbackIdScene]: CompanionFeedbackDefinition | undefined } = GetFeedbacksScene(self)
	const source: { [id in FeedbackIdSource]: CompanionFeedbackDefinition | undefined } = GetFeedbacksSource(self)
	const utility: { [id in FeedbackIdUtility]: CompanionFeedbackDefinition | undefined } = GetFeedbacksUtility(self)
	const zoom: { [id in FeedbackIdZoom]: CompanionFeedbackDefinition | undefined } = GetFeedbacksZoom(self)

	const feedbacks: {
		[
			id in
				| FeedbackId
				| FeedbackIdAudio
				| FeedbackIdBroadcast
				| FeedbackIdOverlay
				| FeedbackIdScene
				| FeedbackIdSource
				| FeedbackIdUtility
				| FeedbackIdZoom
		]: CompanionFeedbackDefinition | undefined
	} = {
		...audio,
		...broadcast,
		...overlay,
		...scene,
		...source,
		...utility,
		...zoom,
	}

	self.setFeedbackDefinitions(feedbacks)
}
