import { describe, expect, it } from 'vitest'
import { parseInfo, parseOverlayList } from '../../src/data-structures/ecamm-parsers.js'
import { SourceMode } from '../../src/data-structures/ecamm-enums.js'
import { loadFixture } from '../helpers/fixture.js'
import { populatedState } from '../helpers/populated-state.js'

const rawInfo = () => loadFixture<Record<string, string>>('getInfo')

/** Applies a modified status payload and returns the feedbacks it says need re-checking. */
function afterInfoChange(overrides: Record<string, string>): Set<string> {
	const state = populatedState()
	return state.applyInfo(parseInfo({ ...rawInfo(), ...overrides })).feedbacks
}

/**
 * Every value change used to re-run all two dozen feedbacks. Each field now reports only the
 * feedbacks that actually read it, so a tick where nothing relevant moved costs no callbacks.
 */
describe('feedback targeting', () => {
	it('asks for nothing when nothing moved', () => {
		const state = populatedState()
		const changes = state.applyInfo(parseInfo(rawInfo()))
		expect(changes.values).toBe(false)
		expect([...changes.feedbacks]).toEqual([])
	})

	it.each([
		['CurrentScene', { CurrentScene: '6D68813C-3145-4999-B51C-718A997CAE46' }, ['scene_active']],
		['Mute', { Mute: 'yes' }, ['audio_muted']],
		['Viewers', { Viewers: '99' }, ['broadcast_viewers_at_or_above']],
		['PreviewMode', { PreviewMode: 'yes' }, ['utility_preview_mode_active']],
		['LiveDemo', { LiveDemo: 'yes' }, ['utility_live_demo_active']],
		['HidingUI', { HidingUI: 'yes' }, ['utility_ui_hidden']],
		['PauseButtonLabel', { PauseButtonLabel: 'Resume' }, ['broadcast_is_paused']],
		['VOLUME_MIC', { VOLUME_MIC: '55' }, ['audio_volume_at_or_above']],
		['MUTE_MIC', { MUTE_MIC: 'yes' }, ['audio_bus_muted']],
	])('%s asks for exactly its own feedbacks', (_field, override, expected) => {
		expect([...afterInfoChange(override)].sort()).toEqual(expected.sort())
	})

	it('the start button label drives both broadcast label feedbacks', () => {
		expect([...afterInfoChange({ ButtonLabel: 'Stop Recording' })].sort()).toEqual([
			'broadcast_button_label_matches',
			'broadcast_is_broadcasting',
		])
	})

	it('a Zoom change asks for every Zoom feedback and nothing else', () => {
		const feedbacks = [...afterInfoChange({ ZoomInMeeting: 'yes' })]
		expect(feedbacks).toHaveLength(8)
		expect(feedbacks.every((id) => id.startsWith('zoom_'))).toBe(true)
	})

	it('updates a variable-only field without re-checking anything', () => {
		// CurrentSceneOrig is exposed as a variable; no feedback reads it.
		const changes = afterInfoChange({ CurrentSceneOrig: 'a-different-uuid' })
		expect(changes.size).toBe(0)
	})

	it('an overlay toggle asks only for the overlay feedback', () => {
		const state = populatedState()
		const overlays = parseOverlayList(loadFixture('getOverlayList'))
		const toggled = overlays.map((o, i) => (i === 0 ? { ...o, visible: !o.visible } : o))

		const changes = state.applyList('overlays', toggled)
		expect(changes.definitions).toBe(false)
		expect([...changes.feedbacks]).toEqual(['overlay_visible'])
	})

	it('source mode and default camera ask only for their own feedbacks', () => {
		const state = populatedState()
		expect([...state.setSourceMode(SourceMode.Screen).feedbacks]).toEqual(['source_mode_is'])
		expect([...state.setDefaultCamera('GUEST_2').feedbacks]).toEqual(['source_camera_is_default'])
	})

	it('a moved bus level asks only for the volume feedback', () => {
		expect([...afterInfoChange({ VOLUME_MIC: '70' })]).toEqual(['audio_volume_at_or_above'])
	})

	it('a moved bus mute asks only for the bus mute feedback', () => {
		expect([...afterInfoChange({ MUTE_MIC: 'yes' })]).toEqual(['audio_bus_muted'])
	})

	it('a bus appearing for the first time counts as a change', () => {
		// A guest joining adds keys the previous payload did not have; sameRecord has to notice
		// that, or the guest's buttons would sit dark until something unrelated moved.
		expect([...afterInfoChange({ VOLUME_GUEST_1: '80' })]).toEqual(['audio_volume_at_or_above'])
		expect([...afterInfoChange({ MUTE_GUEST_1: 'yes' })]).toEqual(['audio_bus_muted'])
	})

	it('an unchanged payload asks for nothing', () => {
		expect([...afterInfoChange({})]).toEqual([])
	})

	it('names only feedbacks that are actually registered', async () => {
		const { UpdateFeedbacks } = await import('../../src/feedbacks.js')
		const { createMockInstance } = await import('../helpers/mock-instance.js')
		const mock = createMockInstance({ state: populatedState() })
		UpdateFeedbacks(mock.instance)

		const registered = new Set(
			Object.keys(
				(mock.instance.setFeedbackDefinitions as unknown as { mock: { calls: unknown[][] } }).mock
					.calls[0][0] as object,
			),
		)

		// Every id the state can emit must exist, or checkFeedbacks would silently do nothing.
		const emitted = new Set<string>([
			...afterInfoChange({ ButtonLabel: 'x', PauseButtonLabel: 'y', CurrentScene: 'z', Viewers: '9', Mute: 'yes' }),
			...afterInfoChange({ PreviewMode: 'yes', HidingUI: 'yes', LiveDemo: 'yes', ZoomInMeeting: 'yes' }),
			...afterInfoChange({ VOLUME_MIC: '1', MUTE_MIC: 'yes' }),
			'overlay_visible',
			'source_mode_is',
			'source_camera_is_default',
			'utility_connection_ok',
			'utility_awaiting_approval',
		])

		for (const id of emitted) {
			expect(registered.has(id), `${id} is not a registered feedback`).toBe(true)
		}
	})
})
