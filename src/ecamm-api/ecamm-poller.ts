export interface PollerOptions {
	/** Base cadence. Already clamped to the API's documented floor by the caller. */
	intervalMs: number
	/** Never schedule a tick sooner than this after the previous one started. */
	floorMs: number
	/** Ceiling applied while backing off from repeated failures. */
	maxBackoffMs: number
	run: (tickCount: number) => Promise<void>
	onFailure: (error: unknown, consecutiveFailures: number) => void
	onRecovered: () => void
}

/**
 * A self-rescheduling timer, deliberately not setInterval: the next tick is only scheduled once
 * the current one has settled, so a slow reply can never cause requests to pile up on a device
 * that has asked to be polled gently.
 */
export class EcammPoller {
	private timer: NodeJS.Timeout | undefined
	private running = false
	private tickCount = 0
	private consecutiveFailures = 0
	private lastTickStartedAt = 0

	constructor(private options: PollerOptions) {}

	get isRunning(): boolean {
		return this.running
	}

	start(): void {
		if (this.running) return
		this.running = true
		this.schedule(0)
	}

	stop(): void {
		this.running = false
		if (this.timer) {
			clearTimeout(this.timer)
			this.timer = undefined
		}
	}

	/** Applies a new cadence without losing the current failure state. */
	retime(intervalMs: number): void {
		this.options = { ...this.options, intervalMs }
	}

	/**
	 * Pulls the next tick forward after a command, so a button reflects its own effect promptly.
	 *
	 * This reschedules rather than adding a tick, and still respects the floor, so repeatedly
	 * pressing a button cannot drive the poll rate above what the device allows.
	 */
	requestFastRefresh(afterMs = 250): void {
		if (!this.running) return
		const earliest = this.lastTickStartedAt + this.options.floorMs
		const delay = Math.max(afterMs, earliest - Date.now(), 0)
		this.schedule(delay)
	}

	private schedule(delayMs: number): void {
		if (!this.running) return
		if (this.timer) clearTimeout(this.timer)
		this.timer = setTimeout(() => void this.tick(), delayMs)
	}

	private async tick(): Promise<void> {
		if (!this.running) return
		this.timer = undefined
		this.lastTickStartedAt = Date.now()

		try {
			await this.options.run(this.tickCount++)
			if (this.consecutiveFailures > 0) {
				this.consecutiveFailures = 0
				this.options.onRecovered()
			}
		} catch (error) {
			this.consecutiveFailures++
			this.options.onFailure(error, this.consecutiveFailures)
		}

		// Re-checked after the await: destroy() may have run while the request was in flight, and
		// scheduling here would otherwise resurrect a stopped poller.
		if (this.running) this.schedule(this.currentDelay())
	}

	/**
	 * Backs off exponentially while failing, so an Ecamm that is closed or asleep costs one
	 * request every 30 seconds rather than one every two.
	 */
	private currentDelay(): number {
		if (this.consecutiveFailures === 0) return this.options.intervalMs
		const exponent = Math.min(this.consecutiveFailures, 4)
		return Math.min(this.options.intervalMs * 2 ** exponent, this.options.maxBackoffMs)
	}
}
