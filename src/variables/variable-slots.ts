import type { CompanionVariableValue } from '@companion-module/base'
import type { EcammListItem } from '../data-structures/ecamm-domain-types.js'

/**
 * Fixed, numbered variable slots for every list Ecamm exposes.
 *
 * The slots exist whether or not the device currently has that many items, which is the whole
 * point: a button can be built against `scene_250_uuid` before a 250th scene exists, and it
 * simply starts working once one does. It is also the only practical way to address an overlay
 * belonging to a scene that is not live, because Ecamm will only ever list the current scene's
 * overlays.
 *
 * Numbers are zero padded to three digits so a family's name and uuid sort next to each other,
 * and so slot 2 sorts before slot 10, in Companion's variable picker.
 */
export interface SlotFamily {
	/** Variable id prefix, e.g. "scene" gives scene_001_name / scene_001_uuid. */
	prefix: string
	/** Human-readable singular, used in the variable description. */
	label: string
	count: number
	/** Adds `<prefix>_NNN_visible`. Only overlays report a visibility Ecamm can be trusted on. */
	includeVisible?: boolean
}

export const SLOT_FAMILIES = {
	scene: { prefix: 'scene', label: 'Scene', count: 300 },
	overlay: { prefix: 'overlay', label: 'Overlay', count: 100, includeVisible: true },
	sound: { prefix: 'sound', label: 'Sound', count: 100 },
	soundFolder: { prefix: 'sound_folder', label: 'Sound folder', count: 20 },
	camera: { prefix: 'camera', label: 'Camera', count: 50 },
	profile: { prefix: 'profile', label: 'Profile', count: 20 },
} as const satisfies Record<string, SlotFamily>

export type SlotFamilyKey = keyof typeof SLOT_FAMILIES

/** Zero-padded slot number. Slot 1 is `001`, so families sort correctly in the picker. */
export function slotNumber(index: number): string {
	return String(index + 1).padStart(3, '0')
}

export interface SlotVariable {
	variableId: string
	name: string
	value: CompanionVariableValue
}

/**
 * Builds every slot for one family, padding beyond the end of the supplied list with empty
 * values so the variable set never changes shape as the device's lists grow and shrink.
 */
export function buildSlotVariables(
	family: SlotFamily,
	items: EcammListItem[],
	options: { label?: (item: EcammListItem) => string; visible?: (item: EcammListItem) => boolean } = {},
): SlotVariable[] {
	const variables: SlotVariable[] = []
	const labelOf = options.label ?? ((item: EcammListItem) => item.label)

	for (let index = 0; index < family.count; index++) {
		const slot = slotNumber(index)
		const item = items[index]

		variables.push({
			variableId: `${family.prefix}_${slot}_name`,
			name: `${family.label} ${slot} name`,
			value: item ? labelOf(item) : '',
		})
		variables.push({
			variableId: `${family.prefix}_${slot}_uuid`,
			name: `${family.label} ${slot} UUID`,
			value: item?.id ?? '',
		})

		if (family.includeVisible) {
			variables.push({
				variableId: `${family.prefix}_${slot}_visible`,
				name: `${family.label} ${slot} visible`,
				value: item ? (options.visible?.(item) ?? false) : false,
			})
		}
	}

	return variables
}

/** Total slot variables across every family, used by the tests to pin the expected count. */
export function totalSlotVariables(): number {
	return Object.values(SLOT_FAMILIES).reduce(
		(total, family) => total + family.count * ('includeVisible' in family && family.includeVisible ? 3 : 2),
		0,
	)
}
