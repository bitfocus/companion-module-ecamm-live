import { Bonjour } from 'bonjour-service'

/** Ecamm Live's Bonjour service, as published by the app. */
export const ECAMM_SERVICE_TYPE = 'ecammliveremote'
export const ECAMM_SERVICE_PROTOCOL = 'tcp'

/** How long each Bonjour browse listens. mDNS has no "that is all of them" signal. */
export const DISCOVERY_WINDOW_MS = 3000

export interface DiscoveredEcamm {
	/** Bonjour instance name, e.g. "Ecamm Live Remote (2)". */
	name: string
	/** The machine, e.g. "LYNBHs-Mac-Studio-2.local". The only thing that identifies it. */
	hostname: string
	/** IPv4 addresses it answered on. A multi-homed Mac can advertise more than one. */
	addresses: string[]
	port: number
}

/**
 * Injected so tests never open a multicast socket.
 *
 * The global fetch guard in tests/setup.ts stops HTTP escaping a unit test, but nothing would
 * stop real mDNS traffic, so discovery is passed in the same way the poller takes its `run`.
 */
export type DiscoverFn = (timeoutMs: number) => Promise<DiscoveredEcamm[]>

/**
 * Browses for Ecamm Live instances for a fixed window.
 *
 * mDNS has no "that's all of them" signal - responders reply whenever they feel like it - so the
 * only way to enumerate is to listen for a while and take what arrived.
 */
export const discoverEcammInstances: DiscoverFn = async (timeoutMs: number): Promise<DiscoveredEcamm[]> => {
	const bonjour = new Bonjour()
	const found = new Map<string, DiscoveredEcamm>()

	const browser = bonjour.find({ type: ECAMM_SERVICE_TYPE, protocol: ECAMM_SERVICE_PROTOCOL })
	browser.on('up', (service) => {
		const addresses = (service.addresses ?? []).filter(isIpv4)
		if (addresses.length === 0 || !service.port) return

		// Keyed by fqdn so a responder answering twice does not produce duplicate rows.
		found.set(service.fqdn, {
			name: service.name,
			hostname: stripTrailingDot(service.host ?? ''),
			addresses,
			port: service.port,
		})
	})

	try {
		await new Promise((resolve) => setTimeout(resolve, timeoutMs))
	} finally {
		browser.stop()
		bonjour.destroy()
	}

	return [...found.values()]
}

/**
 * Finds the instance we were talking to before.
 *
 * Hostname wins: it is the only stable identity Ecamm offers, since the Bonjour instance names
 * are assigned by collision order - the "(2)" suffix can move between machines - and both the
 * port and the address can change. The address is only a fallback for a connection that has not
 * yet learned its hostname.
 *
 * Returns nothing rather than guessing. Silently reconnecting to a different Mac would be far
 * worse than staying disconnected and saying so.
 */
export function matchInstance(
	found: DiscoveredEcamm[],
	want: { hostname?: string; address?: string },
): DiscoveredEcamm | undefined {
	if (want.hostname) {
		const byHostname = found.find((item) => equalsIgnoringCase(item.hostname, want.hostname))
		if (byHostname) return byHostname
	}

	if (want.address) {
		return found.find((item) => item.addresses.includes(want.address!))
	}

	return undefined
}

/** Splits the stored "host:port" back into its parts. */
export function splitHost(hostAndPort: string | undefined): { address: string; port: number | undefined } {
	if (!hostAndPort) return { address: '', port: undefined }
	const index = hostAndPort.lastIndexOf(':')
	if (index === -1) return { address: hostAndPort, port: undefined }

	const port = Number(hostAndPort.slice(index + 1))
	return { address: hostAndPort.slice(0, index), port: Number.isFinite(port) ? port : undefined }
}

/** IPv6 is filtered out: Ecamm answers on IPv4 and link-local v6 addresses are not useful here. */
function isIpv4(address: string): boolean {
	return /^\d{1,3}(\.\d{1,3}){3}$/.test(address)
}

function stripTrailingDot(value: string): string {
	return value.endsWith('.') ? value.slice(0, -1) : value
}

function equalsIgnoringCase(a: string, b: string | undefined): boolean {
	return b !== undefined && a.toLowerCase() === b.toLowerCase()
}
