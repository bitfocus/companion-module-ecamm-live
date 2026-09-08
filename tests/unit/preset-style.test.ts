import { describe, expect, it } from 'vitest'
import { SLOT_PRESET_COUNTS, UpdatePresets } from '../../src/presets.js'
import { DYNAMIC_CATEGORY_SUFFIX } from '../../src/presets/preset-slots.js'
import { createMockInstance } from '../helpers/mock-instance.js'
import { populatedState } from '../helpers/populated-state.js'

type Preset = { category: string; style: { text: string; textExpression?: boolean; size: string | number } }

function allPresets(state?: ReturnType<typeof populatedState>): Record<string, Preset> {
	const mock = state ? createMockInstance({ state }) : createMockInstance()
	UpdatePresets(mock.instance)
	return (mock.instance.setPresetDefinitions as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<
		string,
		Preset
	>
}

describe('preset styling', () => {
	// Both builds, because the fixed presets only exist once the device has answered - checking
	// the disconnected one alone would let a badly styled fixed preset through.
	it.each([
		['with no device data', undefined],
		['with a full device payload', populatedState()],
	])('uses text size 12 everywhere %s', (_label, state) => {
		// 12 is not one of CompanionTextSize's named sizes, so it has to be the number rather
		// than the string '12'.
		const sizes = new Set(Object.values(allPresets(state)).map((preset) => preset.style.size))
		expect([...sizes]).toEqual([12])
	})
})

describe('scene and overlay slot labels', () => {
	const presets = allPresets()

	/**
	 * Verified against Companion's own expression engine (@companion-app/expressions): the
	 * backticks are not decoration - without them the parser rejects the string outright with
	 * "Unexpected token", because a bare ${...} is only meaningful inside a template literal.
	 */
	it('falls back to the unpadded slot number when the name is empty', () => {
		expect(presets.overlay_slot_004.style.text).toBe(
			`\`\${$(ecamm-live:overlay_004_name) != '' ? $(ecamm-live:overlay_004_name) : '4'}\``,
		)
		expect(presets.scene_slot_100.style.text).toBe(
			`\`\${$(ecamm-live:scene_100_name) != '' ? $(ecamm-live:scene_100_name) : '100'}\``,
		)
	})

	it('marks the text as an expression, or Companion would print it literally', () => {
		expect(presets.scene_slot_001.style.textExpression).toBe(true)
		expect(presets.overlay_slot_001.style.textExpression).toBe(true)
	})

	it('applies to every slot in every family', () => {
		const slotPresets = Object.entries(presets).filter(([id]) => /_slot_\d{3}$/.test(id))
		// Derived from the caps rather than restated, so resizing a family needs no test edit.
		const expected = Object.values(SLOT_PRESET_COUNTS).reduce((total, count) => total + count, 0)
		expect(slotPresets).toHaveLength(expected)
		for (const [id, preset] of slotPresets) {
			expect(preset.style.textExpression, `${id} is not an expression`).toBe(true)
			expect(preset.style.text.startsWith('`${'), `${id} is not a template literal`).toBe(true)
		}
	})

	it('labels every slot category as dynamic, after the chunk range', () => {
		const slotCategories = new Set(
			Object.entries(presets)
				.filter(([id]) => /_slot_\d{3}$/.test(id))
				.map(([, preset]) => preset.category),
		)
		for (const category of slotCategories) {
			expect(category.endsWith(DYNAMIC_CATEGORY_SUFFIX), `${category} is not marked dynamic`).toBe(true)
		}
		expect(presets.scene_slot_001.category).toBe('Scenes 001-050 - Dynamic')
		expect(presets.scene_slot_051.category).toBe('Scenes 051-100 - Dynamic')
		expect(presets.overlay_slot_001.category).toBe('Overlays 001-050 - Dynamic')
		expect(presets.camera_slot_001.category).toBe('Cameras 001-020 - Dynamic')
		expect(presets.sound_folder_slot_001.category).toBe('Sound folders 001-020 - Dynamic')
	})

	it('stops generating buttons at the cap, while the variables carry on past it', () => {
		// The whole point of the cap: fewer ready-made buttons, same addressable depth. The
		// matching variable half of this is pinned in variable-slots.test.ts.
		expect(presets.scene_slot_100).toBeDefined()
		expect(presets.scene_slot_101).toBeUndefined()
		expect(presets.overlay_slot_050).toBeDefined()
		expect(presets.overlay_slot_051).toBeUndefined()
		expect(presets.camera_slot_020).toBeDefined()
		expect(presets.camera_slot_021).toBeUndefined()
	})

	it('covers sounds and sound folders too', () => {
		expect(presets.sound_slot_002.style.text).toBe(
			`\`\${$(ecamm-live:sound_002_name) != '' ? $(ecamm-live:sound_002_name) : '2'}\``,
		)
		expect(presets.sound_folder_slot_003.style.text).toBe(
			`\`\${$(ecamm-live:sound_folder_003_name) != '' ? $(ecamm-live:sound_folder_003_name) : '3'}\``,
		)
	})
})
