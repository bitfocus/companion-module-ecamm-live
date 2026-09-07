import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EcammPoller } from '../../src/ecamm-api/ecamm-poller.js'

function makePoller(run: (tick: number) => Promise<void>, overrides = {}) {
	return new EcammPoller({
		intervalMs: 2000,
		floorMs: 2000,
		maxBackoffMs: 30000,
		run,
		onFailure: vi.fn(),
		onRecovered: vi.fn(),
		...overrides,
	})
}

describe('EcammPoller', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => vi.useRealTimers())

	it('runs immediately and then on the interval', async () => {
		const run = vi.fn(async () => undefined)
		const poller = makePoller(run)
		poller.start()

		await vi.advanceTimersByTimeAsync(0)
		expect(run).toHaveBeenCalledTimes(1)

		await vi.advanceTimersByTimeAsync(2000)
		expect(run).toHaveBeenCalledTimes(2)
		poller.stop()
	})

	it('never overlaps: a slow tick delays the next rather than stacking', async () => {
		let running = 0
		let maxConcurrent = 0
		const run = vi.fn(async () => {
			running++
			maxConcurrent = Math.max(maxConcurrent, running)
			await new Promise((r) => setTimeout(r, 5000))
			running--
		})

		const poller = makePoller(run)
		poller.start()
		await vi.advanceTimersByTimeAsync(20000)
		poller.stop()

		// The whole point of self-rescheduling rather than setInterval.
		expect(maxConcurrent).toBe(1)
	})

	it('backs off while failing, so a sleeping Mac is not hammered', async () => {
		const onFailure = vi.fn()
		const run = vi.fn(async () => {
			throw new Error('down')
		})
		const poller = makePoller(run, { onFailure })
		poller.start()

		await vi.advanceTimersByTimeAsync(0)
		expect(run).toHaveBeenCalledTimes(1)

		// First retry waits 2x the interval, not the interval.
		await vi.advanceTimersByTimeAsync(2000)
		expect(run).toHaveBeenCalledTimes(1)
		await vi.advanceTimersByTimeAsync(2000)
		expect(run).toHaveBeenCalledTimes(2)

		poller.stop()
		expect(onFailure).toHaveBeenCalled()
	})

	it('announces recovery once and returns to the normal cadence', async () => {
		const onRecovered = vi.fn()
		let shouldFail = true
		const run = vi.fn(async () => {
			if (shouldFail) throw new Error('down')
		})
		const poller = makePoller(run, { onRecovered })
		poller.start()

		await vi.advanceTimersByTimeAsync(0)
		shouldFail = false
		await vi.advanceTimersByTimeAsync(4000)

		expect(onRecovered).toHaveBeenCalledTimes(1)
		poller.stop()
	})

	it('stops even if the request was in flight', async () => {
		const run = vi.fn(async () => {
			await new Promise((r) => setTimeout(r, 1000))
		})
		const poller = makePoller(run)
		poller.start()
		await vi.advanceTimersByTimeAsync(0)

		poller.stop()
		await vi.advanceTimersByTimeAsync(30000)

		// A tick that settles after stop() must not schedule another one.
		expect(run).toHaveBeenCalledTimes(1)
		expect(poller.isRunning).toBe(false)
	})

	it('never lets a fast refresh breach the floor', async () => {
		const run = vi.fn(async () => undefined)
		const poller = makePoller(run)
		poller.start()
		await vi.advanceTimersByTimeAsync(0)
		expect(run).toHaveBeenCalledTimes(1)

		// Simulates a user mashing a button: many refresh requests in quick succession.
		for (let i = 0; i < 10; i++) poller.requestFastRefresh()
		await vi.advanceTimersByTimeAsync(500)

		// Still only the original tick - the floor has not elapsed.
		expect(run).toHaveBeenCalledTimes(1)

		await vi.advanceTimersByTimeAsync(1600)
		expect(run).toHaveBeenCalledTimes(2)
		poller.stop()
	})

	it('ignores a fast refresh while stopped', async () => {
		const run = vi.fn(async () => undefined)
		const poller = makePoller(run)
		poller.requestFastRefresh()
		await vi.advanceTimersByTimeAsync(5000)
		expect(run).not.toHaveBeenCalled()
	})
})
