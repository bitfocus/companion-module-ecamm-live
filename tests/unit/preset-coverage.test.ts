import { describe, expect, it } from 'vitest'
import { UpdateActions } from '../../src/actions.js'
import { SLOT_PRESET_COUNTS, UpdatePresets } from '../../src/presets.js'
import { ActionIdZoom } from '../../src/actions/action-zoom.js'
import { ActionIdProfile } from '../../src/actions/action-profile.js'
import { ActionIdSource } from '../../src/actions/action-source.js'
import { FeedbackIdZoom } from '../../src/feedbacks/feedback-zoom.js'
import { FeedbackIdAudio } from '../../src/feedbacks/feedback-audio.js'
import { ALL_AUDIO_BUSES, AUDIO_BUS_LABELS } from '../../src/data-structures/ecamm-enums.js'
import { DYNAMIC_CATEGORY_SUFFIX } from '../../src/presets/preset-slots.js'
import { createMockInstance } from '../helpers/mock-instance.js'
import { populatedState } from '../helpers/populated-state.js'

type Preset = {
	category: string
	steps: Array<{ down: Array<{ actionId: string; options?: Record<string, unknown> }> }>
	feedbacks: Array<{ feedbackId: string }>
}

function build(state?: ReturnType<typeof populatedState>) {
	const mock = state ? createMockInstance({ state }) : createMockInstance()
	UpdateActions(mock.instance)
	UpdatePresets(mock.instance)
	const first = (fn: unknown) => (fn as { mock: { calls: unknown[][] } }).mock.calls[0][0]

	const presets = first(mock.instance.setPresetDefinitions) as Record<string, Preset>
	const actions = Object.keys(first(mock.instance.setActionDefinitions) as object)

	/** Every actionId any preset presses. */
	const pressed = new Set<string>()
	for (const preset of Object.values(presets)) {
		for (const step of preset.steps ?? []) {
			for (const action of step.down ?? []) pressed.add(action.actionId)
		}
	}
	return { presets, actions, pressed }
}

describe('Zoom presets', () => {
	const { presets, pressed } = build()
	const zoom = Object.entries(presets).filter(([, p]) => p.category === 'Zoom')

	it('gives every Zoom action a button', () => {
		for (const action of Object.values<string>(ActionIdZoom)) {
			expect(pressed.has(action), `${action} has no preset`).toBe(true)
		}
	})

	it('puts them all in one Zoom category', () => {
		// 15 actions, with the panel action expanded to one button per panel.
		expect(zoom).toHaveLength(18)
	})

	it('offers every panel rather than defaulting to one', () => {
		const panels = zoom
			.flatMap(([, p]) => p.steps[0].down)
			.filter((a) => a.actionId === String(ActionIdZoom.zoomPanel))
			.map((a) => a.options?.panel)
		expect(panels.sort()).toEqual(['chat', 'meeting', 'participants', 'share'])
	})

	it.each([
		[ActionIdZoom.zoomAudio, FeedbackIdZoom.muted],
		[ActionIdZoom.zoomVideo, FeedbackIdZoom.camOn],
		[ActionIdZoom.zoomRaiseHand, FeedbackIdZoom.handRaised],
		[ActionIdZoom.zoomCloudRecord, FeedbackIdZoom.cloudRecording],
		[ActionIdZoom.zoomLocalRecord, FeedbackIdZoom.localRecording],
		[ActionIdZoom.zoomPauseRecord, FeedbackIdZoom.recordingPaused],
		[ActionIdZoom.zoomNew, FeedbackIdZoom.inMeeting],
		[ActionIdZoom.zoomLeave, FeedbackIdZoom.inMeeting],
	])('%s shows its state via %s', (action, feedback) => {
		const preset = zoom.find(([, p]) => p.steps[0].down.some((a) => a.actionId === String(action)))
		expect(preset?.[1].feedbacks.map((f) => f.feedbackId)).toContain(String(feedback))
	})

	it('leaves the actions Ecamm reports no state for as plain buttons', () => {
		// No API state exists for these, so a tally would have to be invented.
		for (const action of [
			ActionIdZoom.zoomMuteAll,
			ActionIdZoom.zoomFullScreen,
			ActionIdZoom.zoomPrevGallery,
			ActionIdZoom.zoomNextGallery,
			ActionIdZoom.zoomGallerySpeaker,
			ActionIdZoom.zoomSpotlightSelf,
		]) {
			const preset = zoom.find(([, p]) => p.steps[0].down.some((a) => a.actionId === String(action)))
			expect(preset?.[1].feedbacks, `${action} should have no feedback`).toEqual([])
		}
	})
})

describe('audio presets', () => {
	const { presets } = build()
	const audioIds = Object.entries(presets)
		.filter(([, p]) => p.category === 'Audio')
		.map(([id]) => id)

	it('gives every bus a mute, an up and a down', () => {
		// Ecamm only reports the buses a given Mac has, but which those are is not knowable at
		// definition time - so every bus the API accepts gets its three buttons.
		expect(audioIds).toHaveLength(ALL_AUDIO_BUSES.length * 3 + 2)
	})

	it('tells the mute state on every mute button, not just the ones getInfo reports', () => {
		for (const bus of ALL_AUDIO_BUSES) {
			const mute = Object.values(presets).find(
				(p) => p.category === 'Audio' && p.steps[0].down[0]?.options?.bus === bus && p.feedbacks.length > 0,
			)
			expect(mute, `${AUDIO_BUS_LABELS[bus]} has no mute preset with feedback`).toBeDefined()
			expect(mute?.feedbacks).toEqual([
				expect.objectContaining({ feedbackId: String(FeedbackIdAudio.busMuted), options: { bus } }),
			])
		}
	})

	it("keeps each bus's three buttons together, in bus order", () => {
		// Companion lists a category in the order the module supplies it, so this ordering is
		// what puts mute/+/- side by side rather than three screens apart.
		const perBus = audioIds.filter((id) => id !== 'audio_setVolume' && id !== 'audio_stopSound')

		for (const [index, bus] of ALL_AUDIO_BUSES.entries()) {
			const triple = perBus.slice(index * 3, index * 3 + 3)
			expect(
				triple.map((id) => id.replace(/^audio_|_(mute|up|down)$/g, '')),
				`${bus} triple is split up`,
			).toEqual([
				triple[0].replace(/^audio_|_mute$/g, ''),
				triple[0].replace(/^audio_|_mute$/g, ''),
				triple[0].replace(/^audio_|_mute$/g, ''),
			])
			expect(triple.map((id) => id.replace(/^.*_/, ''))).toEqual(['mute', 'up', 'down'])
			// All three drive the same bus - the ids only look right if they agree with the options.
			for (const id of triple) expect(presets[id].steps[0].down[0].options?.bus).toBe(bus)
		}
	})

	it('no longer offers a button for the global mute', () => {
		// Per-bus mute covers every real bus; the main-mute button only invited confusion, since
		// Ecamm tracks it entirely separately from the buses.
		expect(presets.audio_toggleMute).toBeUndefined()
	})
})

describe('camera and profile slot presets', () => {
	const { presets, pressed } = build()
	// Both halves matter: `startsWith` alone would also sweep up "Cameras - Fixed", which is a
	// different family of preset with a different count.
	const inCategory = (prefix: string) =>
		Object.entries(presets).filter(
			([, p]) => p.category.startsWith(prefix) && p.category.endsWith(DYNAMIC_CATEGORY_SUFFIX),
		)

	it('drives the actions that had slot variables but no presets', () => {
		expect(pressed.has(String(ActionIdSource.setCamera))).toBe(true)
		expect(pressed.has(String(ActionIdProfile.setProfile))).toBe(true)
	})

	it('generates one per slot', () => {
		// The cap, not the family's variable count - cameras have 50 slot variables but 20 buttons.
		expect(inCategory('Cameras')).toHaveLength(SLOT_PRESET_COUNTS.camera)
		expect(inCategory('Profiles')).toHaveLength(SLOT_PRESET_COUNTS.profile)
	})

	it('carries no feedback', () => {
		// The only camera feedback reports Ecamm's *default* camera, not the live one - a tally
		// that lit up for the wrong camera mid-show would be worse than none.
		for (const [, preset] of [...inCategory('Cameras'), ...inCategory('Profiles')]) {
			expect(preset.feedbacks).toEqual([])
		}
	})
})

describe('overall action coverage', () => {
	// The same answer either way. The fixed presets press the actions the slot presets already
	// press, so connecting a device must not quietly change what is covered - if this list
	// diverges between the two builds, a fixed preset is driving something nothing else does.
	it.each([
		['with no device data', undefined],
		['with a full device payload', populatedState()],
	])('leaves exactly the agreed actions without a preset %s', (_label, state) => {
		// Pinned deliberately: a new action showing up here should be a decision, not an
		// accident. Each of these needs free text or a device with no slot variables.
		const { actions, pressed } = build(state)
		const uncovered = actions.filter((action) => !pressed.has(action)).sort()
		expect(uncovered).toEqual(
			[
				'toggleAudioFilter',
				'setSceneByName',
				'setSoundVolume',
				'pauseSound',
				'setMode',
				'setVideo',
				'toggleUi',
				'postComment',
				'setMarker',
			].sort(),
		)
	})
})
