import type {
	CompanionInputFieldCheckbox,
	CompanionInputFieldDropdown,
	CompanionInputFieldTextInput,
	CompanionOptionValues,
	DropdownChoice,
} from '@companion-module/base'

/**
 * The subset of field types valid in both actions and feedbacks. Typing the shared id options
 * this way lets one helper serve both, since the two unions differ (only actions allow
 * `custom-variable`).
 */
export type SharedInputField = CompanionInputFieldCheckbox | CompanionInputFieldDropdown | CompanionInputFieldTextInput
import type { EcammListItem } from '../data-structures/ecamm-domain-types.js'
import type { ModuleInstance } from '../main.js'

/** Shown when the device has not reported a list yet, so a dropdown is never empty. */
const NONE_LOADED: DropdownChoice = { id: '', label: '- nothing loaded yet -' }

export function toChoices(items: EcammListItem[]): DropdownChoice[] {
	if (items.length === 0) return [NONE_LOADED]
	return items.map((item) => ({ id: item.id, label: item.label }))
}

/**
 * Guards against the empty list. Reading `list[0].id` directly is what made the previous
 * implementation throw whenever a dropdown was built before the device had answered.
 */
export function firstChoiceId(items: EcammListItem[]): string {
	return items[0]?.id ?? ''
}

/**
 * A dropdown backed by device data.
 *
 * `allowCustom` is on for every one of these. Ecamm's ids are not always UUIDs - a live capture
 * returned values such as `GUEST_1`, `ZOOM_ACTIVE_SPEAKER` and `0x0000000019f7006b` - and, more
 * importantly, overlay lists only ever contain the current scene's overlays. Without
 * `allowCustom` a saved id that is not in the current choices would be silently discarded, so a
 * button configured against another scene would quietly break on every scene change. No `regex`
 * is set for the same reason: there is no id format to validate against.
 */
export function deviceDropdown(
	id: string,
	label: string,
	items: EcammListItem[],
	tooltip?: string,
): CompanionInputFieldDropdown {
	return {
		type: 'dropdown',
		id,
		label,
		choices: toChoices(items),
		default: firstChoiceId(items),
		allowCustom: true,
		minChoicesForSearch: 8,
		tooltip,
	}
}

/**
 * A device dropdown plus a "Use variable" escape hatch.
 *
 * Companion only resolves variables in `textinput` fields declaring `useVariables`; a dropdown's
 * value is passed through untouched, even with allowCustom. So the only way a preset can drive an
 * action from a variable is to offer a real text field, and the established idiom is a checkbox
 * that swaps one for the other. Unchecked - the default - behaves exactly as before.
 *
 * Read the result back with `resolveId`, never by reading `options.id` directly.
 */
export function deviceIdOptions(label: string, items: EcammListItem[], tooltip?: string): SharedInputField[] {
	return [
		{
			type: 'checkbox',
			id: 'useVariable',
			label: 'Use variable',
			default: false,
			tooltip: `Enter the ${label.toLowerCase()} UUID from a variable instead of picking it from the list.`,
		},
		{
			...deviceDropdown('id', label, items, tooltip),
			isVisibleExpression: `!$(options:useVariable)`,
		},
		{
			type: 'textinput',
			id: 'idVariable',
			label: `${label} UUID`,
			default: '',
			useVariables: true,
			isVisibleExpression: `$(options:useVariable)`,
			tooltip: 'Accepts a variable, for example $(ecamm-live:scene_001_uuid)',
		},
	]
}

/**
 * Picks whichever of the two id fields is active. Companion has already substituted any variable
 * in the text field by the time a callback runs, so there is nothing to parse here.
 */
export function resolveId(options: CompanionOptionValues): string {
	const raw = options.useVariable ? options.idVariable : options.id
	return typeof raw === 'string' ? raw.trim() : ''
}

/**
 * Runs a device command with the error handling every action needs.
 *
 * Callbacks awaiting their command is the point: previously they were fire-and-forget, so a
 * failed command produced an unhandled rejection and the user saw nothing at all.
 */
export async function runCommand(
	self: ModuleInstance,
	description: string,
	command: () => Promise<void>,
): Promise<void> {
	const api = self.ecammApi
	if (!api) {
		self.log('warn', `${description} ignored: not connected to Ecamm Live`)
		return
	}

	try {
		await command()
		// Pull the next poll forward so the button reflects what it just did, without ever
		// exceeding the rate the device asks for.
		api.requestFastRefresh()
	} catch (error) {
		self.log('error', `${description} failed: ${error instanceof Error ? error.message : String(error)}`)
	}
}

/** Rejects the placeholder id so an unconfigured button reports rather than sending nonsense. */
export function requireId(self: ModuleInstance, value: unknown, description: string): string | undefined {
	const id = typeof value === 'string' ? value.trim() : ''
	if (!id) {
		self.log('warn', `${description} has nothing selected`)
		return undefined
	}
	return id
}

export function optionNumber(value: unknown, fallback: number): number {
	const parsed = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(parsed) ? parsed : fallback
}
