import { EcammHttpError, EcammParseError, EcammTimeoutError, isAbortError } from './ecamm-errors.js'

export type QueryValue = string | number | boolean | undefined
export type QueryParams = Record<string, QueryValue>

export type HttpLogger = (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void

export interface EcammHttpOptions {
	/** "host:port". Mutable, because Ecamm's port changes across restarts - see setHost. */
	host: string
	/** Stable per-installation id shown in Ecamm's Remote Control list. */
	uuid: string
	clientName: string
	clientVersion: string
	deviceName: string
	timeoutMs: number
	log: HttpLogger
	verbose: boolean
}

/** How much of a failing body an error carries. An error message is not the place for a wall of HTML. */
const BODY_SNIPPET_LENGTH = 200

/**
 * How much of a body verbose logging prints.
 *
 * Far larger than the error snippet, because the two want opposite things: verbose logging exists
 * precisely so you can read the whole payload, and getSceneList or getSoundList run to several
 * kilobytes on a real machine. This is only a backstop against an endpoint that returns something
 * enormous - the image endpoints answer with a Base64 JPG - and when it does bite, the log says
 * how much was left out rather than trailing off mid-JSON and looking like Ecamm sent that.
 */
const VERBOSE_BODY_LENGTH = 64_000

/**
 * Transport only: builds URLs, sends the headers Ecamm requires, enforces a deadline, and turns
 * failures into typed errors. It knows nothing about individual endpoints - that is
 * EcammClient's job - and it never touches module state, which is what makes it safe to run
 * several requests concurrently.
 */
export class EcammHttp {
	private controller = new AbortController()

	constructor(private readonly options: EcammHttpOptions) {}

	get host(): string {
		return this.options.host
	}

	/**
	 * Points the transport at a different address.
	 *
	 * Ecamm binds a new port on every launch, so the address a connection was configured with
	 * stops working after the app restarts. Swapping it here means rediscovery can reconnect
	 * without tearing down and rebuilding the whole api.
	 */
	setHost(host: string): void {
		this.options.host = host
	}

	/**
	 * Aborts every in-flight request and arms a fresh controller. Called on destroy so a reply
	 * arriving late cannot write into a torn-down instance.
	 */
	abortAll(): void {
		this.controller.abort()
		this.controller = new AbortController()
	}

	/** A request whose reply is JSON. */
	async get<T>(endpoint: string, params?: QueryParams): Promise<T> {
		const body = await this.raw(endpoint, params)
		try {
			return JSON.parse(body) as T
		} catch {
			throw new EcammParseError(endpoint, body.slice(0, BODY_SNIPPET_LENGTH))
		}
	}

	/**
	 * A command. Ecamm answers these with the bare word "Done" rather than JSON, so the body is
	 * deliberately not parsed - calling res.json() here would throw on every successful write.
	 */
	async set(endpoint: string, params?: QueryParams): Promise<void> {
		await this.raw(endpoint, params)
	}

	/** The unparsed body. Used by `get`/`set` and by diagnostics that need to see raw output. */
	async raw(endpoint: string, params?: QueryParams): Promise<string> {
		const url = `http://${this.options.host}/${endpoint}${buildQuery(params)}`
		if (this.options.verbose) this.options.log('debug', `GET ${url}`)

		let response: Response
		try {
			response = await fetch(url, {
				headers: this.headers(),
				signal: AbortSignal.any([AbortSignal.timeout(this.options.timeoutMs), this.controller.signal]),
			})
		} catch (error) {
			// A timeout and a shutdown both surface as AbortError; only the former is worth a
			// dedicated error type, but the caller can tell them apart via isAbortError.
			if (isAbortError(error) && !this.controller.signal.aborted) {
				throw new EcammTimeoutError(endpoint, this.options.timeoutMs)
			}
			throw error
		}

		const body = await response.text()
		if (!response.ok) {
			throw new EcammHttpError(endpoint, response.status, body.slice(0, BODY_SNIPPET_LENGTH).trim())
		}
		if (this.options.verbose) {
			this.options.log('debug', `${endpoint} -> ${forLog(body)}`)
		}
		return body
	}

	/**
	 * The four headers the Remote API requires. The UUID identifies this installation in Ecamm's
	 * permission list, so it must stay identical across restarts or the user is asked to approve
	 * Companion again.
	 */
	private headers(): Record<string, string> {
		return {
			'User-Agent': `${this.options.clientName}/${this.options.clientVersion}`,
			'EcammLive-UUID': this.options.uuid,
			'EcammLive-ClientName': this.options.clientName,
			'EcammLive-DeviceName': this.options.deviceName,
		}
	}
}

/** A body as verbose logging should print it: whole, or explicitly marked as cut short. */
function forLog(body: string): string {
	if (body.length <= VERBOSE_BODY_LENGTH) return body
	return `${body.slice(0, VERBOSE_BODY_LENGTH)}… [truncated, ${body.length - VERBOSE_BODY_LENGTH} more characters]`
}

/**
 * Values are escaped with encodeURIComponent rather than URLSearchParams: the latter encodes a
 * space as "+", which Ecamm - a Cocoa app - does not decode back into a space. That would
 * silently corrupt marker text, comments and any video path containing a space.
 */
export function buildQuery(params?: QueryParams): string {
	if (!params) return ''
	const pairs = Object.entries(params)
		.filter(([, value]) => value !== undefined && value !== '')
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
	return pairs.length > 0 ? `?${pairs.join('&')}` : ''
}
