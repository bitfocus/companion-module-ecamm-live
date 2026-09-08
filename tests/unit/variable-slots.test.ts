import { describe, expect, it } from 'vitest'
import {
	SLOT_FAMILIES,
	buildSlotVariables,
	slotNumber,
	totalSlotVariables,
} from '../../src/variables/variable-slots.js'
import { buildVariableCatalog } from '../../src/variables/variable-catalog.js'
import { SLOT_PRESET_COUNTS, UpdatePresets } from '../../src/presets.js'
import { createMockInstance } from '../helpers/mock-instance.js'
import { EcammState } from '../../src/ecamm-api/ecamm-state.js'
import { populatedState } from '../helpers/populated-state.js'

describe('slot numbering', () => {
	it('zero pads so families sort adjacently and 2 sorts before 10', () => {
		expect(slotNumber(0)).toBe('001')
		expect(slotNumber(9)).toBe('010')
		expect(slotNumber(299)).toBe('300')
		expect(['scene_010_name', 'scene_002_name'].sort()).toEqual(['scene_002_name', 'scene_010_name'])
	})
})

describe('slot generation', () => {
	it('emits exactly the declared number of slots regardless of device data', () => {
		const empty = buildSlotVariables(SLOT_FAMILIES.scene, [])
		const full = buildSlotVariables(
			SLOT_FAMILIES.scene,
			Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, label: `S${i}` })),
		)
		expect(empty).toHaveLength(300 * 2)
		expect(full).toHaveLength(300 * 2)
	})

	it('pads unused slots with empty values so a button never hits an undefined variable', () => {
		const vars = buildSlotVariables(SLOT_FAMILIES.scene, [{ id: 'abc', label: 'First' }])
		const byId = new Map(vars.map((v) => [v.variableId, v.value]))

		expect(byId.get('scene_001_name')).toBe('First')
		expect(byId.get('scene_001_uuid')).toBe('abc')
		expect(byId.get('scene_300_name')).toBe('')
		expect(byId.get('scene_300_uuid')).toBe('')
	})

	it('adds a visible flag only where a family asks for one', () => {
		const overlays = buildSlotVariables(SLOT_FAMILIES.overlay, [{ id: 'o1', label: 'One' }], { visible: () => true })
		const scenes = buildSlotVariables(SLOT_FAMILIES.scene, [{ id: 's1', label: 'One' }])

		expect(overlays.find((v) => v.variableId === 'overlay_001_visible')?.value).toBe(true)
		// Unpopulated overlay slots read false, not empty, so a boolean comparison still works.
		expect(overlays.find((v) => v.variableId === 'overlay_100_visible')?.value).toBe(false)
		expect(scenes.find((v) => v.variableId.endsWith('_visible'))).toBeUndefined()
	})

	it('honours the counts agreed for each family', () => {
		expect(SLOT_FAMILIES.scene.count).toBe(300)
		expect(SLOT_FAMILIES.overlay.count).toBe(100)
		expect(SLOT_FAMILIES.sound.count).toBe(100)
		expect(SLOT_FAMILIES.soundFolder.count).toBe(20)
		expect(SLOT_FAMILIES.camera.count).toBe(50)
		expect(SLOT_FAMILIES.profile.count).toBe(20)
		// 300*2 + 100*3 + 100*2 + 20*2 + 50*2 + 20*2
		expect(totalSlotVariables()).toBe(1280)
	})

	it('keeps every slot addressable even where no preset is generated for it', () => {
		// The presets are capped well below these counts, and that cap must never be "fixed" by
		// shrinking the families - a machine with 250 scenes still needs scene_250_uuid to exist
		// so the user can build that button by hand.
		const mock = createMockInstance()
		UpdatePresets(mock.instance)
		const presets = (mock.instance.setPresetDefinitions as unknown as { mock: { calls: unknown[][] } }).mock
			.calls[0][0] as Record<string, unknown>
		const variables = new Set(buildVariableCatalog(new EcammState()).map((spec) => spec.variableId))

		for (const [family, cap] of Object.entries(SLOT_PRESET_COUNTS)) {
			const { prefix, count } = SLOT_FAMILIES[family as keyof typeof SLOT_FAMILIES]
			expect(cap, `${family} generates more presets than it has slots`).toBeLessThanOrEqual(count)
			expect(variables.has(`${prefix}_${slotNumber(count - 1)}_uuid`), `${prefix} loses its last slot`).toBe(true)
			if (cap < count) {
				expect(presets[`${prefix}_slot_${slotNumber(cap)}`], `${prefix} generates past its cap`).toBeUndefined()
			}
		}
		expect(variables.has('scene_250_uuid')).toBe(true)
		expect(presets.scene_slot_250).toBeUndefined()
	})
})

describe('the catalog as a whole', () => {
	it('produces the same variable ids whether or not a device is connected', () => {
		const idsOf = (state: EcammState) =>
			buildVariableCatalog(state)
				.map((s) => s.variableId)
				.sort()
		// Fixed slots mean definitions never change shape, only values.
		expect(idsOf(new EcammState())).toEqual(idsOf(populatedState()))
	})

	it('fills slots from real device data, with nested sounds labelled by folder', () => {
		const byId = new Map(buildVariableCatalog(populatedState()).map((s) => [s.variableId, s.value]))

		expect(byId.get('scene_001_name')).toBe('Me (full)')
		expect(byId.get('scene_001_uuid')).toBe('9FEA0460-A4AC-4AEC-ABFC-3550624C6983')
		expect(byId.get('sound_folder_001_name')).toBe('Test Group')

		const soundNames = [...byId.entries()].filter(([id]) => /^sound_\d{3}_name$/.test(id)).map(([, value]) => value)
		expect(soundNames).toContain('Test Group / Triangle')
	})

	it('no longer emits the old unpadded indexed variables', () => {
		const ids = new Set(buildVariableCatalog(populatedState()).map((s) => s.variableId))
		expect(ids.has('scene_1_name')).toBe(false)
		expect(ids.has('overlay_1_id')).toBe(false)
		expect(ids.has('scene_001_name')).toBe(true)
	})
})
