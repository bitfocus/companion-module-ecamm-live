import { readFileSync } from 'node:fs'

/**
 * Fixtures are raw JSON captured from a live Ecamm Live, so a new capture can be dropped in
 * byte-for-byte without being rewritten as TypeScript first.
 */
export function loadFixture<T = unknown>(name: string): T {
	const url = new URL(`../fixtures/${name}.json`, import.meta.url)
	return JSON.parse(readFileSync(url, 'utf8')) as T
}

export function fixtureText(name: string): string {
	return readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8')
}
