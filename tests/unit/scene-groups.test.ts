import { describe, expect, it } from 'vitest'
import { parseSceneList, sceneLabel } from '../../src/data-structures/ecamm-parsers.js'
import { EcammState } from '../../src/ecamm-api/ecamm-state.js'
import { parseInfo } from '../../src/data-structures/ecamm-parsers.js'
import { buildVariableCatalog } from '../../src/variables/variable-catalog.js'
import { loadFixture } from '../helpers/fixture.js'

/**
 * Ecamm can collect scenes into a group. The group is a container only - setScene against a group
 * UUID does nothing, confirmed live - but it carries a title and a UUID, so before this it was
 * offered as an unpressable scene while the real scenes inside it disappeared entirely.
 */
describe('scene groups', () => {
	const scenes = parseSceneList(loadFixture('getSceneList'))

	it('lifts grouped scenes into the list', () => {
		const names = scenes.map((s) => s.label)
		expect(names).toContain('New Scene')
		expect(names).toContain('Test Video')
	})

	it('never offers the group itself as a scene', () => {
		expect(scenes.map((s) => s.label)).not.toContain('New Group')
	})

	it('records which group a scene came from', () => {
		expect(scenes.find((s) => s.label === 'New Scene')?.groupName).toBe('New Group')
		expect(scenes.find((s) => s.label === 'Me (full)')?.groupName).toBeUndefined()
	})

	it('labels grouped scenes as "Group - Scene"', () => {
		const grouped = scenes.find((s) => s.label === 'Test Video')!
		const plain = scenes.find((s) => s.label === 'Me (full)')!
		expect(sceneLabel(grouped)).toBe('New Group - Test Video')
		expect(sceneLabel(plain)).toBe('Me (full)')
	})

	it('lifts them in place, so slot numbering follows Ecamm', () => {
		// The group sits fifth in the list, so its scenes take that position.
		const names = scenes.map((s) => s.label)
		expect(names.slice(3, 7)).toEqual(['Speaker Stage', 'New Scene', 'Test Video', 'Me w/comment'])
	})

	it('handles a group inside a group', () => {
		const nested = parseSceneList({
			items: [
				{
					title: 'Outer',
					UUID: 'outer',
					Group: true,
					Children: [
						{ title: 'Inner', UUID: 'inner', Group: true, Children: [{ title: 'Deep', UUID: 'deep' }] },
						{ title: 'Shallow', UUID: 'shallow' },
					],
				},
			],
		})

		expect(nested.map((s) => s.label)).toEqual(['Deep', 'Shallow'])
		// Attributed to the group directly containing it, not the outermost.
		expect(nested.find((s) => s.label === 'Deep')?.groupName).toBe('Inner')
	})

	it('counts grouped scenes and gives them slots', () => {
		const state = new EcammState()
		state.applyList('scenes', scenes)
		const byId = new Map(buildVariableCatalog(state).map((s) => [s.variableId, s.value]))

		expect(byId.get('scene_count')).toBe(14)
		// Slot 5 is the first scene lifted out of the group.
		expect(byId.get('scene_005_name')).toBe('New Group - New Scene')
		expect(byId.get('scene_006_name')).toBe('New Group - Test Video')
	})
})

describe('the live scene when it is inside a group', () => {
	/**
	 * Ecamm omits CURRENT everywhere while a grouped scene is live - confirmed live - so the flag
	 * from the list cannot be trusted and the status payload has to settle it.
	 */
	it('re-flags from the status payload after a list refresh', () => {
		const state = new EcammState()
		const raw = loadFixture<Record<string, string>>('getInfo')
		// 33F22C16 is "New Scene", inside the group.
		state.applyInfo(parseInfo({ ...raw, CurrentScene: '33F22C16-1224-484D-9B0E-5095D671D018' }))

		// A list where nothing carries CURRENT, exactly as Ecamm reports it in this situation.
		state.applyList('scenes', parseSceneList(loadFixture('getSceneList')))

		const live = state.scenes.filter((s) => s.current)
		expect(live).toHaveLength(1)
		expect(live[0].label).toBe('New Scene')
	})

	it('reports the qualified name', () => {
		const state = new EcammState()
		state.applyList('scenes', parseSceneList(loadFixture('getSceneList')))
		const raw = loadFixture<Record<string, string>>('getInfo')
		state.applyInfo(parseInfo({ ...raw, CurrentScene: '33F22C16-1224-484D-9B0E-5095D671D018' }))

		expect(state.currentSceneName()).toBe('New Group - New Scene')
	})
})
