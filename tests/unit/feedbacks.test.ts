import { describe, expect, it } from 'vitest'
import type { CompanionFeedbackDefinition } from '@companion-module/base'
import { FeedbackIdScene, GetFeedbacksScene } from '../../src/feedbacks/feedback-scene.js'
import { FeedbackIdOverlay, GetFeedbacksOverlay } from '../../src/feedbacks/feedback-overlay.js'
import { FeedbackIdAudio, GetFeedbacksAudio } from '../../src/feedbacks/feedback-audio.js'
import { FeedbackIdBroadcast, GetFeedbacksBroadcast } from '../../src/feedbacks/feedback-broadcast.js'
import { FeedbackIdUtility, GetFeedbacksUtility } from '../../src/feedbacks/feedback-utility.js'
import { FeedbackIdZoom, GetFeedbacksZoom } from '../../src/feedbacks/feedback-zoom.js'
import { AudioBus, ConnectionPermission } from '../../src/data-structures/ecamm-enums.js'
import { parseInfo } from '../../src/data-structures/ecamm-parsers.js'
import { createMockInstance, mockContext } from '../helpers/mock-instance.js'
import { populatedState } from '../helpers/populated-state.js'
import { loadFixture } from '../helpers/fixture.js'

async function evaluate(definition: CompanionFeedbackDefinition | undefined, options: Record<string, unknown> = {}) {
	return (definition as unknown as { callback: (f: unknown, c: unknown) => boolean | Promise<boolean> }).callback(
		{ options },
		mockContext(),
	)
}

describe('scene feedback', () => {
	it('is true only for the live scene', async () => {
		const mock = createMockInstance({ state: populatedState() })
		const feedbacks = GetFeedbacksScene(mock.instance)

		expect(await evaluate(feedbacks[FeedbackIdScene.sceneActive], { id: '8A1DB264-FD68-4B20-973D-62B051A87E0E' })).toBe(
			true,
		)
		expect(await evaluate(feedbacks[FeedbackIdScene.sceneActive], { id: '6D68813C-3145-4999-B51C-718A997CAE46' })).toBe(
			false,
		)
	})

	it('is false when nothing is selected', async () => {
		const mock = createMockInstance({ state: populatedState() })
		expect(await evaluate(GetFeedbacksScene(mock.instance)[FeedbackIdScene.sceneActive], { id: '' })).toBe(false)
	})
})

describe('overlay feedback', () => {
	it('reflects the visible flag for an overlay in the current scene', async () => {
		const state = populatedState()
		const mock = createMockInstance({ state })
		const id = state.overlays[0].id

		expect(await evaluate(GetFeedbacksOverlay(mock.instance)[FeedbackIdOverlay.overlayVisible], { id })).toBe(true)

		state.overlays[0].visible = false
		expect(await evaluate(GetFeedbacksOverlay(mock.instance)[FeedbackIdOverlay.overlayVisible], { id })).toBe(false)
	})

	it('defaults to off for an overlay belonging to another scene', async () => {
		// Ecamm cannot report on overlays outside the live scene, so "unknown" is the honest
		// state; a confidently wrong tally would be worse than a dark button.
		const mock = createMockInstance({ state: populatedState() })
		const feedback = GetFeedbacksOverlay(mock.instance)[FeedbackIdOverlay.overlayVisible]

		expect(await evaluate(feedback, { id: 'from-another-scene', unknownBehavior: 'off' })).toBe(false)
	})

	it('honours the opt-in to treat unknown overlays as visible', async () => {
		const mock = createMockInstance({ state: populatedState() })
		const feedback = GetFeedbacksOverlay(mock.instance)[FeedbackIdOverlay.overlayVisible]

		expect(await evaluate(feedback, { id: 'from-another-scene', unknownBehavior: 'on' })).toBe(true)
	})
})

describe('audio feedbacks', () => {
	it('reads the main mute', async () => {
		const state = populatedState()
		const mock = createMockInstance({ state })
		expect(await evaluate(GetFeedbacksAudio(mock.instance)[FeedbackIdAudio.muted])).toBe(false)

		state.applyInfo(parseInfo({ ...loadFixture<Record<string, string>>('getInfo'), Mute: 'yes' }))
		expect(await evaluate(GetFeedbacksAudio(mock.instance)[FeedbackIdAudio.muted])).toBe(true)
	})

	it('reports a bus Ecamm does not mention as not muted', async () => {
		const mock = createMockInstance({ state: populatedState() })
		const feedback = GetFeedbacksAudio(mock.instance)[FeedbackIdAudio.busMuted]
		expect(await evaluate(feedback, { bus: AudioBus.Skype })).toBe(false)
	})

	it('lights a guest bus as soon as the status payload carries it', async () => {
		const state = populatedState()
		const mock = createMockInstance({ state })
		const feedback = GetFeedbacksAudio(mock.instance)[FeedbackIdAudio.busMuted]

		expect(await evaluate(feedback, { bus: AudioBus.Guest1 })).toBe(false)

		// A guest joining is the whole reason there is no separate per-bus read: Ecamm simply
		// starts reporting the bus, and the next status payload brings it in.
		state.applyInfo(parseInfo({ ...loadFixture<Record<string, string>>('getInfo'), MUTE_GUEST_1: 'yes' }))
		expect(await evaluate(feedback, { bus: AudioBus.Guest1 })).toBe(true)
		expect(await evaluate(feedback, { bus: AudioBus.Mic })).toBe(false)
	})

	it('compares volume against the threshold, and is false when unknown', async () => {
		const mock = createMockInstance({ state: populatedState() })
		const feedback = GetFeedbacksAudio(mock.instance)[FeedbackIdAudio.volumeAtOrAbove]

		expect(await evaluate(feedback, { bus: AudioBus.Mic, threshold: 50 })).toBe(true)
		expect(await evaluate(feedback, { bus: AudioBus.SoundEffects, threshold: 90 })).toBe(false)
		expect(await evaluate(feedback, { bus: AudioBus.Guest3, threshold: 0 })).toBe(false)
	})
})

describe('broadcast feedbacks', () => {
	it('matches the button label, case-insensitively', async () => {
		const mock = createMockInstance({ state: populatedState() })
		const feedback = GetFeedbacksBroadcast(mock.instance)[FeedbackIdBroadcast.buttonLabelMatches]

		// The captured payload has ButtonLabel "Record".
		expect(await evaluate(feedback, { text: 'record' })).toBe(true)
		expect(await evaluate(feedback, { text: 'stop' })).toBe(false)
	})

	it('reads idle as not broadcasting', async () => {
		const mock = createMockInstance({ state: populatedState() })
		expect(await evaluate(GetFeedbacksBroadcast(mock.instance)[FeedbackIdBroadcast.isBroadcasting])).toBe(false)
	})

	it('infers broadcasting once the label changes to Stop', async () => {
		const state = populatedState()
		state.applyInfo(parseInfo({ ...loadFixture<Record<string, string>>('getInfo'), ButtonLabel: 'Stop Recording' }))
		const mock = createMockInstance({ state })

		expect(await evaluate(GetFeedbacksBroadcast(mock.instance)[FeedbackIdBroadcast.isBroadcasting])).toBe(true)
	})

	it('treats the "None" pause label as not paused', async () => {
		const mock = createMockInstance({ state: populatedState() })
		expect(await evaluate(GetFeedbacksBroadcast(mock.instance)[FeedbackIdBroadcast.isPaused])).toBe(false)
	})
})

describe('utility feedbacks', () => {
	it('exposes the waiting-for-approval state', async () => {
		const state = populatedState()
		state.permission = ConnectionPermission.Pending
		const mock = createMockInstance({ state })

		expect(await evaluate(GetFeedbacksUtility(mock.instance)[FeedbackIdUtility.awaitingApproval])).toBe(true)
	})

	it('reports the connection', async () => {
		const mock = createMockInstance({ state: populatedState() })
		expect(await evaluate(GetFeedbacksUtility(mock.instance)[FeedbackIdUtility.connectionOk])).toBe(true)
	})
})

describe('zoom feedbacks', () => {
	it('are all false outside a meeting', async () => {
		const mock = createMockInstance({ state: populatedState() })
		const feedbacks = GetFeedbacksZoom(mock.instance)

		expect(await evaluate(feedbacks[FeedbackIdZoom.inMeeting])).toBe(false)
		expect(await evaluate(feedbacks[FeedbackIdZoom.muted])).toBe(false)
	})

	it('read the flags during a meeting', async () => {
		const state = populatedState()
		state.applyInfo(parseInfo({ ZoomInMeeting: 'yes', ZoomMuted: 'yes', ZoomHosting: 'yes' }))
		const mock = createMockInstance({ state })
		const feedbacks = GetFeedbacksZoom(mock.instance)

		expect(await evaluate(feedbacks[FeedbackIdZoom.inMeeting])).toBe(true)
		expect(await evaluate(feedbacks[FeedbackIdZoom.muted])).toBe(true)
		expect(await evaluate(feedbacks[FeedbackIdZoom.camOn])).toBe(false)
	})
})
