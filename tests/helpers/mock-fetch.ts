import { vi } from 'vitest'

export interface Route {
	status?: number
	body: string
}

/**
 * Replaces global fetch with a routing table keyed by endpoint name, and records every URL so a
 * test can assert on the query string that was actually built.
 */
export function installFetchMock(routes: Record<string, Route>): {
	calls: URL[]
	headers: Array<Record<string, string>>
} {
	const calls: URL[] = []
	const headers: Array<Record<string, string>> = []

	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string | URL, init?: RequestInit) => {
			const url = new URL(String(input))
			calls.push(url)
			headers.push((init?.headers ?? {}) as Record<string, string>)

			const endpoint = url.pathname.replace(/^\//, '')
			const route = routes[endpoint] ?? { status: 404, body: 'Not Found' }
			const status = route.status ?? 200

			return {
				ok: status >= 200 && status < 300,
				status,
				statusText: status === 200 ? 'OK' : 'Error',
				text: async () => route.body,
			} as Response
		}),
	)

	return { calls, headers }
}
