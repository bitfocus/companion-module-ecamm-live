import { describe, expect, it } from 'vitest'
import { EcammState, signatureOf } from '../../src/ecamm-api/ecamm-state.js'
import { parseInfo, parseOverlayList, parseSceneList } from '../../src/data-structures/ecamm-parsers.js'
import { loadFixture } from '../helpers/fixture.js'

describe('list change detection', () => {
	it('reports no change when a poll returns the same list', () => {
		const state = new EcammState()
		const scenes = parseSceneList(loadFixture('getSceneList'))

		expect(state.applyList('scenes', scenes).definitions).toBe(true)
		// Re-registering every definition on every poll would be a real performance problem, so
		// an unchanged list must cost nothing.
		expect(state.applyList('scenes', parseSceneList(loadFixture('getSceneList'))).definitions).toBe(false)
	})

	it('requires re-registration when an entry is renamed', () => {
		const state = new EcammState()
		const scenes = parseSceneList(loadFixture('getSceneList'))
		state.applyList('scenes', scenes)

		const renamed = scenes.map((s, i) => (i === 0 ? { ...s, label: 'Different' } : s))
		expect(state.applyList('scenes', renamed).definitions).toBe(true)
	})

	it('requires re-registration when the order changes, because dropdowns are ordered', () => {
		const state = new EcammState()
		const scenes = parseSceneList(loadFixture('getSceneList'))
		state.applyList('scenes', scenes)

		expect(state.applyList('scenes', [...scenes].reverse()).definitions).toBe(true)
	})

	it('treats an overlay toggle as a value change, not a definition change', () => {
		const state = new EcammState()
		const overlays = parseOverlayList(loadFixture('getOverlayList'))
		state.applyList('overlays', overlays)

		const toggled = overlays.map((o, i) => (i === 0 ? { ...o, visible: !o.visible } : o))
		const changes = state.applyList('overlays', toggled)

		// Visibility is deliberately excluded from the identity signature: otherwise every
		// overlay toggle would rebuild every definition in the module.
		expect(changes.definitions).toBe(false)
		expect(changes.values).toBe(true)
	})
})

describe('info change detection', () => {
	it('reports no change when nothing moved', () => {
		const state = new EcammState()
		state.applyInfo(parseInfo(loadFixture('getInfo')))
		expect(state.applyInfo(parseInfo(loadFixture('getInfo'))).values).toBe(false)
	})

	it('notices a scene change and re-flags the scene list', () => {
		const state = new EcammState()
		state.applyList('scenes', parseSceneList(loadFixture('getSceneList')))
		state.applyInfo(parseInfo(loadFixture('getInfo')))

		const raw = loadFixture<Record<string, string>>('getInfo')
		const changes = state.applyInfo(parseInfo({ ...raw, CurrentScene: '6D68813C-3145-4999-B51C-718A997CAE46' }))

		expect(changes.values).toBe(true)
		expect(state.sceneById('6D68813C-3145-4999-B51C-718A997CAE46')?.current).toBe(true)
		expect(state.sceneById('8A1DB264-FD68-4B20-973D-62B051A87E0E')?.current).toBe(false)
	})

	it('notices a viewer count change', () => {
		const state = new EcammState()
		const raw = loadFixture<Record<string, string>>('getInfo')
		state.applyInfo(parseInfo(raw))
		expect(state.applyInfo(parseInfo({ ...raw, Viewers: '5' })).values).toBe(true)
	})
})

describe('volume and mute resolution', () => {
	/**
	 * The status payload is the single source. It reports every bus the machine actually has, so
	 * there is deliberately nothing to fall back to - a second source would only be able to
	 * disagree with it. These cases are what would fail if one were reintroduced.
	 */
	it('resolves a bus the status payload reports', () => {
		const state = new EcammState()
		state.applyInfo(parseInfo(loadFixture('getInfo')))

		expect(state.volumeOf('mic' as never)).toBe(100)
		expect(state.muteOf('mic' as never)).toBe(false)
	})

	it('leaves a bus the machine does not have unknown, rather than zero or unmuted', () => {
		const state = new EcammState()
		state.applyInfo(parseInfo(loadFixture('getInfo')))

		// Undefined renders as an empty variable, which is honest. A 0 would read as "silent"
		// and a false would read as "live", and both would be inventions.
		expect(state.volumeOf('skype' as never)).toBeUndefined()
		expect(state.muteOf('skype' as never)).toBeUndefined()
	})

	it('picks up a bus as soon as the payload starts reporting it', () => {
		// What happens when a Zoom or Interview guest joins mid-show: no extra read, the next
		// status payload simply carries the bus.
		const state = new EcammState()
		state.applyInfo(parseInfo(loadFixture('getInfo')))
		expect(state.volumeOf('guest_1' as never)).toBeUndefined()

		const raw = loadFixture<Record<string, string>>('getInfo')
		state.applyInfo(parseInfo({ ...raw, VOLUME_GUEST_1: '80', MUTE_GUEST_1: 'yes' }))
		expect(state.volumeOf('guest_1' as never)).toBe(80)
		expect(state.muteOf('guest_1' as never)).toBe(true)
	})
})

describe('unmapped key reporting', () => {
	it('reports once and then stays quiet', () => {
		const state = new EcammState()
		state.applyInfo(parseInfo({ SomethingNew: 'x' }))
		expect(state.takeUnreportedKeys()).toEqual(['SomethingNew'])
		expect(state.takeUnreportedKeys()).toEqual([])
	})
})

describe('signatureOf', () => {
	it('distinguishes different ids and labels', () => {
		expect(signatureOf([{ id: 'a', label: 'A' }])).not.toBe(signatureOf([{ id: 'a', label: 'B' }]))
		expect(signatureOf([{ id: 'a', label: 'A' }])).toBe(signatureOf([{ id: 'a', label: 'A' }]))
	})
})
