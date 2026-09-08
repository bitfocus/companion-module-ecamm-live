import { ColorBlack, ColorRed, ColorWhite } from '../feedbacks/feedback-utils.js'
import { type SlotFamily, slotNumber } from '../variables/variable-slots.js'
import type { CompanionPresetExt } from './preset-utils.js'

/**
 * Derived from the preset type itself rather than restated, so these can never drift out of step
 * with what CompanionPresetExt actually accepts.
 */
type PresetActionId = CompanionPresetExt['steps'][0]['down'][0]['actionId']
type PresetFeedbackId = CompanionPresetExt['feedbacks'][0]['feedbackId']

/** Chunk size for preset categories. 300 scenes in one category is unusable to scroll. */
const CATEGORY_CHUNK = 50

/**
 * Marks every category built here as slot-driven, to tell it apart from the "- Fixed" categories
 * that name a specific item.
 *
 * It lives here rather than at the six call sites because it has to land *after* the chunk range -
 * a caller-supplied prefix cannot do that - and because everything this function builds is
 * dynamic by definition, so there is nothing to decide per call.
 */
export const DYNAMIC_CATEGORY_SUFFIX = ' - Dynamic'

/**
 * Builds one preset per slot, rather than one per item the device currently has.
 *
 * The button takes its text from the slot's name variable and drives its action and feedback from
 * the slot's uuid variable, so it is not bound to whatever happened to be in that position when
 * the preset was generated. A slot beyond the end of the device's list is simply blank until the
 * list grows, and the button starts working with no reconfiguration.
 *
 * This is only possible because the id options carry a "Use variable" checkbox - Companion
 * substitutes variables in a `textinput`, never in a dropdown.
 */
export function buildSlotPresets(config: {
	family: SlotFamily
	/** Category prefix, e.g. "Scenes" gives "Scenes 001-050 - Dynamic". */
	category: string
	/**
	 * How many of the family's slots get a ready-made button. Defaults to all of them.
	 *
	 * Deliberately independent of `family.count`: the *variables* exist for every slot so a large
	 * Ecamm profile stays addressable, but shipping a button for all 300 scene slots buries the
	 * palette. Past this point the user builds the button by hand against `scene_NNN_uuid`, which
	 * is exactly what the slot variables are for.
	 */
	presetCount?: number
	actionId: PresetActionId
	/** Extra action options merged in alongside the id, e.g. sound volume. */
	actionOptions?: Record<string, unknown>
	feedbackId?: PresetFeedbackId
	feedbackOptions?: Record<string, unknown>
	/** Button label prefix, e.g. "Switch to". */
	verb: string
	/**
	 * Label an empty slot with its own number instead of leaving the button blank, so a wall of
	 * unpopulated buttons is still navigable.
	 */
	numberWhenEmpty?: boolean
}): Record<string, CompanionPresetExt> {
	const presets: Record<string, CompanionPresetExt> = {}
	const { family, category, actionId, feedbackId, verb } = config
	const count = Math.min(config.presetCount ?? family.count, family.count)

	for (let index = 0; index < count; index++) {
		const slot = slotNumber(index)
		const uuidVariable = `$(ecamm-live:${family.prefix}_${slot}_uuid)`
		const nameVariable = `$(ecamm-live:${family.prefix}_${slot}_name)`
		const chunkStart = Math.floor(index / CATEGORY_CHUNK) * CATEGORY_CHUNK

		presets[`${family.prefix}_slot_${slot}`] = {
			type: 'button',
			category: `${category} ${slotNumber(chunkStart)}-${slotNumber(Math.min(chunkStart + CATEGORY_CHUNK, count) - 1)}${DYNAMIC_CATEGORY_SUFFIX}`,
			name: `${verb} ${family.label.toLowerCase()} ${slot}`,
			style: {
				// A Companion expression, which has to be a backtick template literal for the
				// interpolation to parse. The fallback is the unpadded slot number, so slot 004
				// of an empty list reads "4".
				text: config.numberWhenEmpty
					? `\`\${${nameVariable} != '' ? ${nameVariable} : '${index + 1}'}\``
					: nameVariable,
				textExpression: config.numberWhenEmpty === true,
				size: 12,
				color: ColorWhite,
				bgcolor: ColorBlack,
			},
			steps: [
				{
					down: [
						{
							actionId,
							options: { useVariable: true, idVariable: uuidVariable, ...(config.actionOptions ?? {}) },
						},
					],
					up: [],
				},
			],
			feedbacks: feedbackId
				? [
						{
							feedbackId,
							options: {
								useVariable: true,
								idVariable: uuidVariable,
								...(config.feedbackOptions ?? {}),
							},
							style: { color: ColorWhite, bgcolor: ColorRed },
						},
					]
				: [],
		}
	}

	return presets
}
