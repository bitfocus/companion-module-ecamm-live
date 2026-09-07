import { describe, expect, it } from 'vitest'
import type { CompanionOptionValues } from '@companion-module/base'
import { UpdatePresets } from '../../src/presets.js'
import { buildFixedPresets, FIXED_CATEGORY_SUFFIX } from '../../src/presets/preset-fixed.js'
import { resolveId } from '../../src/actions/action-utils.js'
import { ActionIdScene } from '../../src/actions/action-scene.js'
import { ActionIdSource } from '../../src/actions/action-source.js'
import { FeedbackIdOverlay, OverlayUnknownBehavior } from '../../src/feedbacks/feedback-overlay.js'
import { FeedbackIdScene } from '../../src/feedbacks/feedback-scene.js'
import { SoundAction } from '../../src/data-structures/ecamm-enums.js'
import { sceneLabel, soundLabel } from '../../src/data-structures/ecamm-parsers.js'
import type { EcammState } from '../../src/ecamm-api/ecamm-state.js'
import { createMockInstance } from '../helpers/mock-instance.js'
import { populatedState } from '../helpers/populated-state.js'

type Preset = {
	category: string
	name: string
	style: { text: string; textExpression?: boolean }
	steps: Array<{ down: Array<{ actionId: string; options: CompanionOptionValues }> }>
	feedbacks: Array<{ feedbackId: string; options: CompanionOptionValues }>
}

function allPresets(state?: EcammState): Record<string, Preset> {
	const mock = state ? createMockInstance({ state }) : createMockInstance()
	UpdatePresets(mock.instance)
	return (mock.instance.setPresetDefinitions as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<
		string,
		Preset
	>
}

const fixedEntries = (presets: Record<string, Preset>, prefix: string) =>
	Object.entries(presets).filter(([id]) => id.startsWith(`${prefix}_fixed_`))

describe('fixed presets, before the device has answered', () => {
	const presets = allPresets()

	it('generates none at all', () => {
		// Not an empty category: Companion derives its headings from the presets present, so an
		// unconnected module simply has no "- Fixed" sections rather than six empty ones.
		expect(Object.keys(presets).filter((id) => id.includes('_fixed_'))).toEqual([])
		expect(Object.values(presets).filter((preset) => preset.category.endsWith(FIXED_CATEGORY_SUFFIX))).toEqual([])
	})
})

describe('fixed presets, with a full device payload', () => {
	const state = populatedState()
	const presets = allPresets(state)

	it('generates exactly one button per discovered item', () => {
		// Counted against the state rather than the fixture, so re-capturing a payload does not
		// break the test.
		expect(fixedEntries(presets, 'scene')).toHaveLength(state.scenes.length)
		expect(fixedEntries(presets, 'overlay')).toHaveLength(state.overlays.length)
		expect(fixedEntries(presets, 'sound')).toHaveLength(state.sounds.length)
		expect(fixedEntries(presets, 'sound_folder')).toHaveLength(state.soundFolders.length)
		expect(fixedEntries(presets, 'camera')).toHaveLength(state.cameras.length)
		expect(fixedEntries(presets, 'profile')).toHaveLength(state.profiles.length)
	})

	it('puts each family in one unchunked category', () => {
		const categories = new Set(
			Object.values(presets)
				.filter((preset) => preset.category.endsWith(FIXED_CATEGORY_SUFFIX))
				.map((preset) => preset.category),
		)
		expect([...categories].sort()).toEqual([
			'Cameras - Fixed',
			'Overlays - Fixed',
			'Profiles - Fixed',
			'Scenes - Fixed',
			'Sound folders - Fixed',
			'Sounds - Fixed',
		])
	})

	it('hard-codes the id into the dropdown, not the variable field', () => {
		for (const [, preset] of fixedEntries(presets, 'scene')) {
			const options = preset.steps[0].down[0].options
			expect(options.useVariable).toBe(false)
			expect(options.idVariable).toBeUndefined()
			// The end of the contract that matters: this is what the action callback actually reads.
			expect(resolveId(options)).toBe(options.id)
			expect(state.scenes.some((scene) => scene.id === options.id)).toBe(true)
		}
	})

	it('prints the decorated name literally, with no expression', () => {
		const grouped = state.scenes.find((scene) => scene.groupName)
		expect(grouped, 'fixture has no grouped scene to check').toBeDefined()
		const scenePreset = fixedEntries(presets, 'scene').find(
			([, preset]) => preset.steps[0].down[0].options.id === grouped!.id,
		)![1]
		expect(scenePreset.style.text).toBe(sceneLabel(grouped!))
		expect(scenePreset.style.text).toContain(grouped!.groupName!)

		const foldered = state.sounds.find((sound) => sound.folderName)!
		const soundPreset = fixedEntries(presets, 'sound').find(
			([, preset]) => preset.steps[0].down[0].options.id === foldered.id,
		)![1]
		expect(soundPreset.style.text).toBe(soundLabel(foldered))

		for (const [id, preset] of Object.entries(presets).filter(([key]) => key.includes('_fixed_'))) {
			expect(preset.style.textExpression, `${id} should not be an expression`).toBeFalsy()
			expect(preset.style.text, `${id} should not reference a variable`).not.toContain('$(')
		}
	})

	it('attaches a hard-coded tally where one exists, and none where it does not', () => {
		for (const [, preset] of fixedEntries(presets, 'scene')) {
			expect(preset.feedbacks).toHaveLength(1)
			expect(preset.feedbacks[0].feedbackId).toBe(FeedbackIdScene.sceneActive)
			expect(preset.feedbacks[0].options.id).toBe(preset.steps[0].down[0].options.id)
			expect(preset.feedbacks[0].options.useVariable).toBe(false)
		}
		for (const [, preset] of fixedEntries(presets, 'overlay')) {
			expect(preset.feedbacks[0].feedbackId).toBe(FeedbackIdOverlay.overlayVisible)
			expect(preset.feedbacks[0].options.unknownBehavior).toBe(OverlayUnknownBehavior.Off)
		}
		// Ecamm reports no sound playback state, and its only camera feedback describes the
		// *default* camera rather than the live one - a tally lighting the wrong button mid-show
		// would be worse than none.
		for (const prefix of ['sound', 'sound_folder', 'camera', 'profile']) {
			for (const [id, preset] of fixedEntries(presets, prefix)) {
				expect(preset.feedbacks, `${id} should have no feedback`).toEqual([])
			}
		}
	})

	it('carries the sound playback options', () => {
		for (const prefix of ['sound', 'sound_folder']) {
			for (const [, preset] of fixedEntries(presets, prefix)) {
				expect(preset.steps[0].down[0].options.volume).toBe(100)
				expect(preset.steps[0].down[0].options.action).toBe(SoundAction.Restart)
			}
		}
	})

	it('sanitises an awkward id into the key while the option keeps it raw', () => {
		// getInputs really does report a camera whose UUID is "EXAMPLE-MAC.LOCAL (macOS AV
		// Output)" - spaces, dots and parentheses. The id has to survive intact where it is sent
		// to Ecamm, and be tamed only where it becomes a preset key.
		const awkward = state.cameras.find((camera) => /[^A-Za-z0-9_-]/.test(camera.id))
		expect(awkward, 'fixture no longer has an awkward camera id').toBeDefined()

		const entry = fixedEntries(presets, 'camera').find(
			([, preset]) => preset.steps[0].down[0].options.id === awkward!.id,
		)
		expect(entry, 'no preset was generated for the awkward camera').toBeDefined()
		expect(entry![0]).toMatch(/^camera_fixed_[A-Za-z0-9_-]+$/)
		expect(entry![1].steps[0].down[0].options.id).toBe(awkward!.id)
	})

	it('keeps every preset key unique and legal', () => {
		const fixedKeys = Object.keys(presets).filter((id) => id.includes('_fixed_'))
		expect(new Set(fixedKeys).size).toBe(fixedKeys.length)
		for (const key of fixedKeys) {
			expect(key, `${key} is not a safe key`).toMatch(/^[a-z_]+_fixed_[A-Za-z0-9_-]+$/)
			// The _fixed_ infix is what keeps these clear of the slot keys and the static enums.
			expect(key).not.toMatch(/_slot_\d{3}$/)
		}
	})
})

describe('fixed preset keys', () => {
	const cameras = (ids: string[]) => ids.map((id) => ({ id, label: id }))
	const build = (ids: string[]) =>
		buildFixedPresets({
			prefix: 'camera',
			category: 'Cameras',
			items: cameras(ids),
			verb: 'Select',
			actionId: ActionIdSource.setCamera,
		})

	it('derives from the id, not the position', () => {
		const before = build(['aaa', 'bbb', 'ccc'])
		expect(Object.keys(build(['aaa', 'bbb', 'ccc']))).toEqual(Object.keys(before))
		// Dropping the first item must not renumber the rest, or every remaining button would
		// churn in the palette on an unrelated change.
		const after = build(['bbb', 'ccc'])
		expect(Object.keys(after)).toEqual(Object.keys(before).slice(1))
	})

	it('keeps two ids apart when sanitising alone would merge them', () => {
		const presets = build(['a b', 'a.b'])
		expect(Object.keys(presets)).toHaveLength(2)
		expect(Object.values(presets).map((preset) => preset.steps[0].down[0].options.id)).toEqual(['a b', 'a.b'])
	})

	it('skips an item with no id rather than shipping a dead button', () => {
		expect(Object.keys(build(['', 'real']))).toHaveLength(1)
	})
})

describe('fixed scene presets', () => {
	it('press the same action the slot presets do', () => {
		const presets = allPresets(populatedState())
		for (const [, preset] of fixedEntries(presets, 'scene')) {
			expect(preset.steps[0].down[0].actionId).toBe(ActionIdScene.setScene)
		}
	})
})
