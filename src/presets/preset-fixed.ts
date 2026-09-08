import { ColorBlack, ColorRed, ColorWhite } from '../feedbacks/feedback-utils.js'
import type { EcammListItem } from '../data-structures/ecamm-domain-types.js'
import type { CompanionPresetExt } from './preset-utils.js'

/**
 * Derived from the preset type itself rather than restated, so these can never drift out of step
 * with what CompanionPresetExt actually accepts.
 */
type PresetActionId = CompanionPresetExt['steps'][0]['down'][0]['actionId']
type PresetFeedbackId = CompanionPresetExt['feedbacks'][0]['feedbackId']

/** Marks a category as naming real items, to tell it apart from the "- Dynamic" slot categories. */
export const FIXED_CATEGORY_SUFFIX = ' - Fixed'

/**
 * Builds one preset per item the device actually reported, with that item's id baked in.
 *
 * The complement of buildSlotPresets. A slot preset follows a *position* and survives the list
 * changing shape; a fixed preset names a *thing*, so the button says what it does without the user
 * having to work out which slot that thing currently occupies. The trade is that the set is only
 * as good as the last poll, which is why these are regenerated whenever a list signature moves.
 *
 * No chunking: a category only ever holds as many buttons as the machine has items.
 */
export function buildFixedPresets<T extends EcammListItem>(config: {
	/** Preset key prefix, e.g. "scene" gives scene_fixed_<id>. Unique per family. */
	prefix: string
	/** Category base, e.g. "Scenes" gives "Scenes - Fixed". */
	category: string
	items: readonly T[]
	/** Decorated label, e.g. sceneLabel / soundLabel. Defaults to the raw label. */
	label?: (item: T) => string
	/** Button label prefix, e.g. "Switch to". */
	verb: string
	actionId: PresetActionId
	/** Extra action options merged in alongside the id, e.g. sound volume. */
	actionOptions?: Record<string, unknown>
	feedbackId?: PresetFeedbackId
	feedbackOptions?: Record<string, unknown>
}): Record<string, CompanionPresetExt> {
	const presets: Record<string, CompanionPresetExt> = {}
	const labelOf = config.label ?? ((item: T) => item.label)

	for (const item of config.items) {
		// The parsers already drop Ecamm's id-less placeholder rows, but a button with no id would
		// press and do nothing, which is worse than not offering it.
		if (!item.id) continue

		const name = labelOf(item)
		// useVariable is set explicitly rather than left to the option default, so the button
		// arrives showing the dropdown with the item picked - not the "Use variable" text box.
		const idOptions = { useVariable: false, id: item.id }

		presets[fixedKey(config.prefix, item.id)] = {
			type: 'button',
			category: `${config.category}${FIXED_CATEGORY_SUFFIX}`,
			name: `${config.verb} ${name}`,
			style: {
				// A literal name, not a variable and not an expression: the whole point of a fixed
				// preset is that the button reads correctly without a slot lining up. Long names
				// overflow rather than being truncated, so the button never disagrees with Ecamm.
				text: name,
				size: 10,
				color: ColorWhite,
				bgcolor: ColorBlack,
			},
			steps: [
				{
					down: [{ actionId: config.actionId, options: { ...idOptions, ...(config.actionOptions ?? {}) } }],
					up: [],
				},
			],
			feedbacks: config.feedbackId
				? [
						{
							feedbackId: config.feedbackId,
							options: { ...idOptions, ...(config.feedbackOptions ?? {}) },
							style: { color: ColorWhite, bgcolor: ColorRed },
						},
					]
				: [],
		}
	}

	return presets
}

/**
 * A preset key derived from the item's id, stable for as long as the item exists.
 *
 * Ecamm's ids are not always UUIDs - a live capture returned `GUEST_1`, `0x0000000019f7006b` and a
 * camera whose id is literally `EXAMPLE-MAC.LOCAL (macOS AV Output)`, and setSound accepts a file
 * path. A real UUID passes through untouched; anything the sanitiser would flatten or truncate
 * gets a hash of the *raw* id appended instead, so two ids can never collapse onto one key. That
 * keeps the key a pure function of the id, with no dependence on list order. The raw id still goes
 * into the option, which is what actually reaches Ecamm.
 */
function fixedKey(prefix: string, id: string): string {
	const safe = id.replace(/[^A-Za-z0-9_-]+/g, '_')
	const lossy = safe !== id || safe.length > MAX_KEY_ID
	return lossy ? `${prefix}_fixed_${safe.slice(0, MAX_KEY_ID)}_${fnv1a(id)}` : `${prefix}_fixed_${safe}`
}

/** Long enough for a UUID with room to spare, short enough that a file path stays a key. */
const MAX_KEY_ID = 48

/** FNV-1a, as eight hex digits. Not a security hash - just a short, stable, dependency-free tag. */
function fnv1a(input: string): string {
	let hash = 0x811c9dc5
	for (let index = 0; index < input.length; index++) {
		hash ^= input.charCodeAt(index)
		hash = Math.imul(hash, 0x01000193)
	}
	return (hash >>> 0).toString(16).padStart(8, '0')
}
