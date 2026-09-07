import { InstanceStatus } from '@companion-module/base'
import { ConnectionPermission } from '../data-structures/ecamm-enums.js'

/** A non-2xx reply. Carries a body snippet because Ecamm explains refusals in the body. */
export class EcammHttpError extends Error {
	constructor(
		readonly endpoint: string,
		readonly status: number,
		readonly bodySnippet: string,
	) {
		super(`${endpoint} failed: HTTP ${status}${bodySnippet ? ` - ${bodySnippet}` : ''}`)
		this.name = 'EcammHttpError'
	}
}

/** The request exceeded its deadline, or was aborted because the instance is shutting down. */
export class EcammTimeoutError extends Error {
	constructor(
		readonly endpoint: string,
		readonly timeoutMs: number,
	) {
		super(`${endpoint} timed out after ${timeoutMs} ms`)
		this.name = 'EcammTimeoutError'
	}
}

/** The reply was not the JSON the endpoint is supposed to return. */
export class EcammParseError extends Error {
	constructor(
		readonly endpoint: string,
		readonly bodySnippet: string,
	) {
		super(`${endpoint} returned an unparseable body: ${bodySnippet}`)
		this.name = 'EcammParseError'
	}
}

export interface StatusReport {
	status: InstanceStatus
	message: string
}

/** Aborts triggered by destroy() are routine; callers use this to stay quiet about them. */
export function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError'
}

/**
 * Turns a permission value into the status the user should see. Ecamm silently refuses every
 * request until a human approves the client, so saying so explicitly is the difference between
 * a five second fix and a support ticket.
 */
export function permissionToStatus(permission: ConnectionPermission, host: string): StatusReport {
	switch (permission) {
		case ConnectionPermission.Allowed:
			return { status: InstanceStatus.Ok, message: '' }
		case ConnectionPermission.Pending:
			return {
				status: InstanceStatus.Connecting,
				message: 'Waiting for approval - open Ecamm Live > Settings > Remote Control and allow Bitfocus Companion',
			}
		case ConnectionPermission.Denied:
			return {
				status: InstanceStatus.AuthenticationFailure,
				message: 'Ecamm Live denied this client. Remove it under Settings > Remote Control, then reconnect.',
			}
		case ConnectionPermission.NotFound:
			return {
				status: InstanceStatus.Connecting,
				message: `Registering with Ecamm Live at ${host}`,
			}
	}
}

/**
 * Maps a thrown request error onto a Companion status.
 *
 * A connection refusal is the expected symptom of Ecamm's port having changed, because that port
 * is assigned dynamically at launch and the value Companion stored is then pointing at nothing.
 * The message says so, since re-picking the device from the Bonjour list is the actual fix.
 */
export function mapErrorToStatus(error: unknown, host: string): StatusReport {
	if (error instanceof EcammHttpError) {
		if (error.status === 401 || error.status === 403) {
			return {
				status: InstanceStatus.AuthenticationFailure,
				message: 'Ecamm Live rejected this client. Approve it under Settings > Remote Control.',
			}
		}
		return { status: InstanceStatus.UnknownWarning, message: error.message }
	}

	if (error instanceof EcammTimeoutError) {
		return { status: InstanceStatus.ConnectionFailure, message: error.message }
	}

	if (error instanceof EcammParseError) {
		return { status: InstanceStatus.UnknownWarning, message: error.message }
	}

	return {
		status: InstanceStatus.ConnectionFailure,
		message:
			`Cannot reach Ecamm Live at ${host}. Ecamm picks a new port every time it launches; if it was ` +
			`restarted, this connection will find it again and reconnect on its own.`,
	}
}
