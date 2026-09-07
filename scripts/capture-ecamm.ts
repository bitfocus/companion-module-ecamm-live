/**
 * Dev-only capture tool. NOT part of the shipped module.
 *
 * Discovers every Ecamm Live instance on the network over Bonjour, then sweeps the read-only
 * `get*` endpoints and writes each raw response to `captures/` so the real payload shapes can
 * be turned into typed parsers and committed test fixtures.
 *
 * Ecamm gates remote clients: the first request from an unknown `EcammLive-UUID` lands as
 * "Pending" in Ecamm Live -> Settings -> Remote Control and returns nothing useful until a
 * human approves it. The UUID is therefore persisted so approval survives re-runs.
 *
 * Run with: node scripts/capture-ecamm.ts [--list] [--host <host:port>] [--images]
 * (Node 22 strips the types; no build step.)
 */
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CAPTURE_DIR = join(REPO_ROOT, 'captures')
const UUID_FILE = join(CAPTURE_DIR, '.client-uuid')

const SERVICE_TYPE = '_ecammliveremote._tcp'
const CLIENT_NAME = 'Companion Module Capture'
const CLIENT_VERSION = '1.0.0'
const REQUEST_TIMEOUT_MS = 5000
const BROWSE_MS = 4000
const RESOLVE_MS = 3000

/** The 12 audio buses the v4.4 doc documents for getVolume/setVolume. */
const AUDIO_BUSES = [
	'mic',
	'mic2',
	'skype',
	'system audio',
	'interview',
	'zoom',
	'soundeffects',
	'movie',
	'guest_1',
	'guest_2',
	'guest_3',
	'guest_4',
]

/** Read-only endpoints taking no parameters. `*Dict` variants are deliberately excluded. */
const SIMPLE_ENDPOINTS = [
	'getConnectionStatus',
	'getInfo',
	'getButtonLabel',
	'getPauseButtonLabel',
	'getSceneList',
	'getCurrentScene',
	'getMute',
	'getViewers',
	'getInputs',
	'getDefaultCamera',
	'getCurrentMode',
	'getVideoList',
	'getOverlayList',
	'getSoundList',
	'getAudioFilterList',
	'getProfileList',
	'getChannels',
	'getLiveDemo',
	'getHideShowUI',
]

interface Instance {
	name: string
	host: string
	port: number
}

/**
 * dns-sd never exits on its own - it streams until killed - so every call is time-boxed and the
 * output collected so far is returned.
 */
async function runFor(command: string, args: string[], ms: number): Promise<string> {
	return new Promise((resolve) => {
		const child = spawn(command, args)
		let out = ''
		child.stdout.on('data', (d) => (out += d.toString()))
		child.stderr.on('data', (d) => (out += d.toString()))
		const timer = setTimeout(() => child.kill(), ms)
		child.on('close', () => {
			clearTimeout(timer)
			resolve(out)
		})
		child.on('error', () => {
			clearTimeout(timer)
			resolve(out)
		})
	})
}

/**
 * Every responder is returned, never just the local one. Companion drives devices across the
 * network, so the operator picks which Ecamm to talk to.
 */
async function discover(): Promise<Instance[]> {
	const browse = await runFor('dns-sd', ['-B', SERVICE_TYPE, 'local.'], BROWSE_MS)

	const names = new Set<string>()
	for (const line of browse.split('\n')) {
		const marker = `${SERVICE_TYPE}.`
		const idx = line.indexOf(marker)
		if (idx === -1 || !line.includes('Add')) continue
		const name = line.slice(idx + marker.length).trim()
		if (name) names.add(name)
	}

	const instances: Instance[] = []
	for (const name of names) {
		const resolved = await runFor('dns-sd', ['-L', name, SERVICE_TYPE, 'local.'], RESOLVE_MS)
		const match = resolved.match(/can be reached at\s+(\S+?):(\d+)/)
		if (!match) {
			console.warn(`  ! could not resolve "${name}"`)
			continue
		}
		instances.push({ name, host: match[1].replace(/\.$/, ''), port: Number(match[2]) })
	}
	return instances
}

/** Stable across runs so Ecamm's approval is not revoked every time this is invoked. */
function clientUuid(): string {
	mkdirSync(CAPTURE_DIR, { recursive: true })
	if (existsSync(UUID_FILE)) return readFileSync(UUID_FILE, 'utf8').trim()
	const uuid = randomUUID()
	writeFileSync(UUID_FILE, uuid)
	return uuid
}

function headers(uuid: string): Record<string, string> {
	return {
		'User-Agent': `${CLIENT_NAME}/${CLIENT_VERSION}`,
		'EcammLive-UUID': uuid,
		'EcammLive-ClientName': CLIENT_NAME,
		'EcammLive-DeviceName': process.env.HOST ?? 'capture-script',
	}
}

/**
 * Returns the raw body. Query values are encoded with encodeURIComponent rather than
 * URLSearchParams: the latter encodes a space as `+`, which Cocoa's URL parsing does not decode
 * back to a space.
 */
async function request(base: string, endpoint: string, uuid: string, params?: Record<string, string>): Promise<string> {
	const query = params
		? '?' +
			Object.entries(params)
				.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
				.join('&')
		: ''
	const res = await fetch(`${base}/${endpoint}${query}`, {
		headers: headers(uuid),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	})
	if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
	return await res.text()
}

/**
 * Blocks until a human approves this client in Ecamm. Without approval every endpoint returns
 * empty, which would otherwise be captured as if it were the real shape.
 */
async function waitForApproval(base: string, uuid: string): Promise<boolean> {
	// getConnectionStatus alone reports "Not Found" forever - it inspects the permission table
	// without registering anything. An actual data request is what makes Ecamm create the
	// pending entry and raise the approval prompt.
	try {
		await request(base, 'getInfo', uuid)
	} catch {
		// Expected while unapproved; the point is the side effect, not the response.
	}

	for (let attempt = 0; attempt < 60; attempt++) {
		let status: string
		try {
			status = (await request(base, 'getConnectionStatus', uuid)).trim()
		} catch (e) {
			console.error(`  ! ${String(e)}`)
			return false
		}

		if (status.includes('Allowed')) {
			console.log(`  status: ${status} - approved\n`)
			return true
		}
		if (status.includes('Denied')) {
			console.error(`  status: ${status} - this client was denied in Ecamm Live.`)
			return false
		}

		if (attempt === 0) {
			console.log(`  status: ${status}`)
			console.log('\n  >>> ACTION NEEDED <<<')
			console.log('  Open Ecamm Live -> Settings -> Remote Control and approve')
			console.log(`  the client named "${CLIENT_NAME}". Waiting up to 5 minutes...\n`)
		}
		await new Promise((r) => setTimeout(r, 5000))
	}
	console.error('  ! timed out waiting for approval')
	return false
}

async function capture(instance: Instance, wantImages: boolean): Promise<void> {
	const base = `http://${instance.host}:${instance.port}`
	const uuid = clientUuid()
	const outDir = join(CAPTURE_DIR, instance.name.replace(/[^\w.-]+/g, '_'))
	mkdirSync(outDir, { recursive: true })

	console.log(`Capturing from ${instance.name} (${base})`)
	console.log(`  client UUID: ${uuid}`)

	if (!(await waitForApproval(base, uuid))) return

	const endpoints: Array<{ name: string; endpoint: string; params?: Record<string, string> }> = SIMPLE_ENDPOINTS.map(
		(e) => ({ name: e, endpoint: e }),
	)
	for (const bus of AUDIO_BUSES) {
		endpoints.push({ name: `getVolume.${bus.replace(/\s+/g, '_')}`, endpoint: 'getVolume', params: { bus } })
	}

	const failures: string[] = []
	for (const { name, endpoint, params } of endpoints) {
		try {
			const body = await request(base, endpoint, uuid, params)
			writeFileSync(join(outDir, `${name}.json`), body)
			const preview = body.replace(/\s+/g, ' ').slice(0, 90)
			console.log(`  ok   ${name.padEnd(28)} ${body.length.toString().padStart(7)}B  ${preview}`)
		} catch (e) {
			failures.push(`${name}: ${String(e)}`)
			console.log(`  FAIL ${name.padEnd(28)} ${String(e)}`)
		}
	}

	if (wantImages) await captureImages(base, uuid, outDir)

	console.log(`\n  wrote ${endpoints.length - failures.length}/${endpoints.length} to ${outDir}`)
	if (failures.length) console.log(`  failures:\n    ${failures.join('\n    ')}`)
}

/**
 * Image endpoints need a real id, so scenes/overlays are re-read to pick one. Bodies are large
 * base64 blobs; only the first scene and overlay are sampled, purely to learn the envelope.
 */
async function captureImages(base: string, uuid: string, outDir: string): Promise<void> {
	const pickId = async (endpoint: string): Promise<string | undefined> => {
		try {
			const parsed = JSON.parse(await request(base, endpoint, uuid))
			const items = Array.isArray(parsed) ? parsed : (parsed.items ?? [])
			return items[0]?.UUID ?? items[0]?.uuid
		} catch {
			return undefined
		}
	}

	for (const [endpoint, listEndpoint] of [
		['getSceneImage', 'getSceneList'],
		['getOverlayImage', 'getOverlayList'],
	]) {
		const id = await pickId(listEndpoint)
		if (!id) {
			console.log(`  skip ${endpoint} (no id available from ${listEndpoint})`)
			continue
		}
		try {
			const body = await request(base, endpoint, uuid, { id })
			writeFileSync(join(outDir, `${endpoint}.json`), body)
			console.log(`  ok   ${endpoint.padEnd(28)} ${body.length.toString().padStart(7)}B  (id ${id})`)
		} catch (e) {
			console.log(`  FAIL ${endpoint.padEnd(28)} ${String(e)}`)
		}
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2)
	const hostArg = args.includes('--host') ? args[args.indexOf('--host') + 1] : undefined
	const wantImages = args.includes('--images')

	if (hostArg) {
		const [host, port] = hostArg.split(':')
		await capture({ name: hostArg, host, port: Number(port) || 80 }, wantImages)
		return
	}

	console.log(`Browsing for ${SERVICE_TYPE} (${BROWSE_MS / 1000}s)...`)
	const instances = await discover()

	if (instances.length === 0) {
		console.error('No Ecamm Live instances found. Is Ecamm Live running with Remote Control enabled?')
		process.exitCode = 1
		return
	}

	console.log(`\nFound ${instances.length} instance(s):`)
	instances.forEach((i, n) => console.log(`  [${n}] ${i.name} -> ${i.host}:${i.port}`))
	console.log()

	if (args.includes('--list')) return

	for (const instance of instances) {
		await capture(instance, wantImages)
		console.log()
	}
}

await main()
