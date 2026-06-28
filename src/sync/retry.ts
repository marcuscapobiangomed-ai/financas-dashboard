import { isNetworkError } from './errors'

const MAX_SYNC_RETRIES = 3
const RETRY_BASE_MS = 800

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute an asynchronous operation with retry logic on network errors.
 */
export async function callWithRetry(fn: () => Promise<void>): Promise<void> {
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
    try {
      await fn()
      return
    } catch (err) {
      lastErr = err
      if (!isNetworkError(err)) throw err
      if (attempt < MAX_SYNC_RETRIES - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt)
        console.warn(`[sync] Tentativa ${attempt + 1}/${MAX_SYNC_RETRIES} falhou (rede). Retry em ${delay}ms...`)
        await sleep(delay)
      }
    }
  }
  throw lastErr
}
