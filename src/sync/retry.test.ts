import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sleep, callWithRetry } from './retry'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('sleep', () => {
  it('resolves after the specified time', async () => {
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await expect(promise).resolves.toBeUndefined()
  })

  it('does not resolve before the specified time', async () => {
    const spy = vi.fn()
    sleep(500).then(spy)
    vi.advanceTimersByTime(400)
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    await vi.runAllTimersAsync()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('handles 0ms sleep', async () => {
    const promise = sleep(0)
    vi.advanceTimersByTime(0)
    await expect(promise).resolves.toBeUndefined()
  })
})

describe('callWithRetry', () => {
  it('resolves when fn succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    const promise = callWithRetry(fn)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on network error and succeeds', async () => {
    const fn = vi.fn()
    fn.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fn.mockResolvedValueOnce(undefined)

    const promise = callWithRetry(fn)
    // First attempt fails immediately (network), retry with backoff 800ms
    await vi.advanceTimersByTimeAsync(800)
    await expect(promise).resolves.toBeUndefined()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries multiple times and eventually throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const promise = callWithRetry(fn)
    // 3 attempts with backoff: 0ms, 800ms, 1600ms
    await vi.advanceTimersByTimeAsync(800)
    await vi.advanceTimersByTimeAsync(1600)
    await expect(promise).rejects.toThrow('Failed to fetch')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('immediately throws on non-network error without retrying', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Validation error'))

    const promise = callWithRetry(fn)
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow('Validation error')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws on session error without retrying', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Sessão expirada'))

    const promise = callWithRetry(fn)
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow('Sessão expirada')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws the last error after exhausting network retries', async () => {
    const err = new TypeError('Failed to fetch')
    const fn = vi.fn().mockRejectedValue(err)

    const promise = callWithRetry(fn)
    await vi.advanceTimersByTimeAsync(800)
    await vi.advanceTimersByTimeAsync(1600)
    await expect(promise).rejects.toThrow('Failed to fetch')
  })

  it('uses exponential backoff between retries', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const start = Date.now()

    const promise = callWithRetry(fn)
    // First retry after 800ms
    await vi.advanceTimersByTimeAsync(800)
    expect(fn).toHaveBeenCalledTimes(2)

    // Second retry after 1600ms (800 * 2^1)
    await vi.advanceTimersByTimeAsync(1600)
    expect(fn).toHaveBeenCalledTimes(3)

    await expect(promise).rejects.toThrow('Failed to fetch')
  })
})
