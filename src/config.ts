import type { SomeCompanionConfigField } from '@companion-module/base'

/**
 * Ecamm Live refuses to be polled faster than this. The value is enforced here as well as in the
 * config field, because an imported or hand-edited configuration bypasses the field's `min`.
 */
export const POLL_FLOOR_MS = 2000
export const POLL_DEFAULT_MS = 2000
export const POLL_MAX_MS = 60000

export interface ModuleConfig {
	/**
	 * `address:port`, as chosen in Companion's Bonjour picker. Empty when nothing is selected -
	 * Companion stores its always-present "Manual" row as null, which normalizeConfig folds to ''.
	 */
	ecammHost: string
	/**
	 * The machine behind that address, recorded when it is picked. Ecamm binds a new port on
	 * every launch, so the hostname is the only stable way to find the same Mac again. Never
	 * rendered as a field.
	 */
	ecammHostname: string
	/** Bonjour instance name of the chosen device, so a stale row can be labelled like a live one. */
	ecammServiceName: string
	/**
	 * Identifies this Companion instance in Ecamm Live's Remote Control permission list. Minted
	 * once on first init and persisted; never rendered as a config field.
	 */
	uuid: string
	pollInterval: number
	pollOverlays: boolean
	verboseLogging: boolean
}

/**
 * What Companion actually hands back.
 *
 * The bonjour-device field writes null when the user selects "Manual", which ModuleConfig
 * deliberately does not carry: normalizeConfig is the single place that null is dealt with, so
 * nothing downstream has to think about it.
 */
export type StoredModuleConfig = Omit<Partial<ModuleConfig>, 'ecammHost'> & { ecammHost?: string | null }

/**
 * Fills in any field the stored configuration is missing.
 *
 * Companion only applies a field's `default` when a connection is first created, so a config
 * saved by an earlier version of this module arrives with the newer keys undefined. Left alone,
 * `pollOverlays` would read as false and every overlay feedback would silently stop working.
 *
 * This is the one place defaults are declared - the instance's own `config` field is seeded from
 * it - so `this.config` is never partially undefined. The identity strings fall back to `''`
 * rather than staying optional: every consumer already treats them as "not set" by truthiness, so
 * an empty string carries the same meaning while letting the type say what is actually there.
 */
export function normalizeConfig(config: StoredModuleConfig | undefined): ModuleConfig {
	return {
		// null ("Manual"), undefined (never configured) and '' all mean the same thing here.
		ecammHost: (config?.ecammHost ?? '').trim(),
		ecammHostname: config?.ecammHostname ?? '',
		ecammServiceName: config?.ecammServiceName ?? '',
		uuid: config?.uuid ?? '',
		pollInterval: Math.min(POLL_MAX_MS, Math.max(POLL_FLOOR_MS, config?.pollInterval ?? POLL_DEFAULT_MS)),
		pollOverlays: config?.pollOverlays ?? true,
		verboseLogging: config?.verboseLogging ?? false,
	}
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'intro',
			label: 'Ecamm Live',
			width: 12,
			value:
				'Select your Ecamm Live machine below, then open <b>Ecamm Live &rarr; Settings &rarr; Remote Control</b> ' +
				'on that Mac and approve <b>Bitfocus Companion</b>. Until you approve it, every request is rejected.',
		},
		{
			// Companion's own discovery, which keeps browsing for as long as this dialog is open, so
			// the list fills in while you look at it rather than being a snapshot taken when the
			// connection started. It stores "address:port" - the same shape this module has always
			// saved - so an existing configuration carries straight over.
			type: 'bonjour-device',
			id: 'ecammHost',
			label: 'Ecamm Live machine',
			width: 12,
			tooltip: 'Every install announces itself as "Ecamm Live Remote", so the address is what tells two Macs apart.',
		},
		{
			// Companion always offers a "Manual" row and stores null for it, so this cannot be made
			// mandatory. There is nothing useful to type instead: Ecamm binds a new port every launch,
			// so a hand-entered address would be stale by its next restart.
			type: 'static-text',
			id: 'bonjourRequired',
			label: '',
			width: 12,
			value:
				'<b>Bonjour is the only way to connect to Ecamm Live.</b> Ecamm chooses a new port every time it ' +
				'launches, so there is no fixed address to enter by hand - pick a machine from the list above. If the ' +
				'list stays empty, check that Ecamm Live is running and that Bonjour/mDNS is not blocked between this ' +
				'computer and the Mac.',
			// Shown only while the picker has nothing selected. Companion evaluates this itself, and
			// falls back to showing a field if it cannot, so the worst case is a redundant note.
			isVisibleExpression: '!$(options:ecammHost)',
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Poll interval (ms)',
			width: 4,
			min: POLL_FLOOR_MS,
			max: POLL_MAX_MS,
			default: POLL_DEFAULT_MS,
			tooltip: `Ecamm Live asks that status is polled no more often than every ${POLL_FLOOR_MS} ms.`,
		},
		{
			type: 'checkbox',
			id: 'pollOverlays',
			label: 'Poll overlays',
			width: 4,
			default: true,
			tooltip: 'Required for overlay feedbacks. Ecamm only reports overlays for the current scene.',
		},
		{
			type: 'checkbox',
			id: 'verboseLogging',
			label: 'Verbose logging',
			width: 12,
			default: false,
			tooltip: 'Logs every request and response. Useful when reporting a bug; noisy otherwise.',
		},
	]
}
