import { useAuthStore } from './useAuthStore'
import { useFinanceStore } from './useFinanceStore'
import { Transaction } from '../types/transaction'
import { AppSettings, MonthSettings } from '../types/budget'
import { getNotificationPermission, showBudgetAlert } from '../lib/notifications'
import { hasActiveSession, tryRefreshSession } from '../lib/supabase'
import * as db from '../lib/supabaseData'

export function getUserId(): string | null {
  try {
    return useAuthStore.getState().user?.id ?? null
  } catch {
    return null
  }
}

export const QUEUE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/** Max number of network retries for a single sync operation before queuing offline. */
const MAX_SYNC_RETRIES = 3
/** Base delay for retry backoff in ms. */
const RETRY_BASE_MS = 800
/** Interval in ms for automatic retry when syncStatus is 'error'. */
export const SYNC_RETRY_INTERVAL_MS = 30_000

export type SyncActionDescriptor = {
  id: string;
  action: string;
  args: any[];
  createdAt: number;
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message
    return msg === 'Failed to fetch' || msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('network')
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return msg.includes('network') || msg.includes('timeout') || msg.includes('aborted')
  }
  return false
}

export function isSessionError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.message.includes('Sessão expirada') ||
      err.message.includes('JWT') ||
      err.message.includes('invalid_jwt') ||
      err.message.includes('not authenticated') ||
      err.message.includes('PGRST301')
    )
  }
  return false
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}

export function monthsDiff(fromMonthKey: string, toMonthKey: string): number {
  const [fy, fm] = fromMonthKey.split('-').map(Number)
  const [ty, tm] = toMonthKey.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export function defaultMonthSettings(monthKey: string, appSettings: AppSettings): MonthSettings {
  return {
    monthKey,
    isClosed: false,
    sectionLimits: { ...appSettings.defaultSectionLimits },
    tithePercent: appSettings.defaultTithePercent,
    offeringPercent: appSettings.defaultOfferingPercent,
  }
}

export function checkBudgetAlert(state: any, monthKey: string, section: string) {
  if (!state.appSettings.notificationsEnabled) return
  if (getNotificationPermission() !== 'granted') return

  const ms = state.getMonthSettings(monthKey)
  const limit = ms.sectionLimits[section] ?? 0
  if (limit <= 0) return

  const total = state.transactions
    .filter((t: any) => t.monthKey === monthKey && t.section === section && t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0)

  const percentUsed = (total / limit) * 100
  const threshold = state.appSettings.alertThresholdPercent || 80

  if (percentUsed >= threshold) {
    const cardLabel = state.appSettings.cardSections?.find((c: any) => c.id === section)?.label
    const labels: Record<string, string> = {
      despesas_fixas: 'Despesas Fixas',
      gastos_diarios: 'Gastos com Dinheiro Físico',
    }
    const label = cardLabel ?? labels[section] ?? section
    showBudgetAlert(label, percentUsed, limit, total)
  }
}

// Global flag to suppress sync-back when applying realtime updates
export let _realtimeOrigin = { value: false }

/**
 * Check if a month is closed and throw an error if so.
 * Used by store slices to prevent mutations on closed months.
 */
export function assertMonthNotClosed(get: any, monthKey: string): void {
  const state = get()
  const settings = state.monthSettings?.[monthKey]
  if (settings?.isClosed) {
    throw new Error(`O mês ${monthKey} está fechado. Reabra-o para fazer alterações.`)
  }
}

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute a remote DB call with automatic retry on network errors.
 * Throws after MAX_SYNC_RETRIES failed attempts.
 */
async function callWithRetry(fn: () => Promise<void>): Promise<void> {
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
    try {
      await fn()
      return
    } catch (err) {
      lastErr = err
      if (!isNetworkError(err)) throw err // Non-network errors bubble immediately
      if (attempt < MAX_SYNC_RETRIES - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt)
        console.warn(`[sync] Tentativa ${attempt + 1}/${MAX_SYNC_RETRIES} falhou (rede). Retry em ${delay}ms...`)
        await sleep(delay)
      }
    }
  }
  throw lastErr
}

/**
 * Attempt to recover from a session error by refreshing the token,
 * then re-executing the operation once.
 * Returns true if recovery succeeded.
 */
async function attemptSessionRecovery(fn: () => Promise<void>): Promise<boolean> {
  try {
    const refreshed = await tryRefreshSession()
    if (!refreshed) return false
    await fn()
    return true
  } catch {
    return false
  }
}

export function syncRemote(actionOrFn: keyof typeof db | (() => Promise<void>), ...args: any[]) {
  if (_realtimeOrigin.value) return

  const store = useFinanceStore.getState()

  // ── Error guard ──────────────────────────────────────────────────────────
  // If syncStatus is 'error', skip the network call and just queue the operation.
  // A periodic retry timer (in App.tsx) will automatically try to recover and
  // drain the queue as soon as the connection/session is healthy again.
  if (store.syncStatus === 'error') {
    if (typeof actionOrFn === 'function') {
      store.setSyncError('Há um erro de sincronização pendente. Aguarde a recuperação automática ou clique em "Tentar novamente".')
      return
    }
    store.pushToSyncQueue({ id: generateId(), action: actionOrFn, args, createdAt: Date.now() })
    return
  }

  // ── Bulk / arbitrary function ────────────────────────────────────────────
  if (typeof actionOrFn === 'function') {
    if (!navigator.onLine) {
      store.setSyncError('Você está offline. Operações em lote (importação) precisam de internet.')
      return
    }
    store.setSyncStatus('syncing')
    actionOrFn()
      .then(() => {
        store.setSyncStatus('idle')
        store.setSyncError(null)
        store.setLastSyncedAt(now())
      })
      .catch(async (err) => {
        console.error('[sync function]', err)
        if (isSessionError(err)) {
          // Try to recover session and retry the whole function
          const recovered = await attemptSessionRecovery(actionOrFn as () => Promise<void>)
          if (recovered) {
            store.setSyncStatus('idle')
            store.setSyncError(null)
            store.setLastSyncedAt(now())
            return
          }
          store.setSyncStatus('error')
          store.setSyncError('Sessão expirada. Faça login novamente.')
        } else {
          store.setSyncStatus('error')
          store.setSyncError(err?.message ?? 'Erro crítico na sincronização em lote')
        }
      })
    return
  }

  // ── Named DB action ──────────────────────────────────────────────────────
  const actionName = actionOrFn

  if (!navigator.onLine) {
    store.setSyncStatus('offline')
    store.pushToSyncQueue({ id: generateId(), action: actionName, args, createdAt: Date.now() })
    return
  }

  store.setSyncStatus('syncing')
  const method = (db as any)[actionName]
  if (!method || typeof method !== 'function') {
    console.error('[sync] Ação desconhecida:', actionName)
    store.setSyncStatus('error')
    store.setSyncError(`Ação de sincronização desconhecida: ${String(actionName)}`)
    return
  }

  // Run with retry — NO pre-flight session check.
  // Each DB function already calls requireSession() internally which handles refresh.
  // Removing the pre-flight check eliminates the race condition where
  // hasActiveSession() fails during token auto-refresh, permanently blocking all sync.
  ;(async () => {
    try {
      await callWithRetry(() => method(...args))
      // ✅ Success — clear any previous error state (auto-recovery)
      const currentStore = useFinanceStore.getState()
      currentStore.setSyncStatus('idle')
      currentStore.setSyncError(null)
      currentStore.setLastSyncedAt(now())
      // Process any queued items now that we know the connection works
      if (currentStore.syncQueue.length > 0) currentStore.processSyncQueue()
    } catch (err: any) {
      console.error('[sync execution]', actionName, err)

      if (isSessionError(err)) {
        // Session expired — try to refresh and retry once
        const recovered = await attemptSessionRecovery(() => method(...args))
        if (recovered) {
          const currentStore = useFinanceStore.getState()
          currentStore.setSyncStatus('idle')
          currentStore.setSyncError(null)
          currentStore.setLastSyncedAt(now())
          if (currentStore.syncQueue.length > 0) currentStore.processSyncQueue()
          return
        }
        // Refresh failed — queue the operation for later (don't lose it!)
        const currentStore = useFinanceStore.getState()
        currentStore.setSyncStatus('error')
        currentStore.setSyncError('Sessão expirada. Faça login novamente para sincronizar.')
        currentStore.pushToSyncQueue({ id: generateId(), action: actionName, args, createdAt: Date.now() })
      } else if (isNetworkError(err)) {
        // All retries exhausted — queue for later
        const currentStore = useFinanceStore.getState()
        currentStore.setSyncStatus('offline')
        currentStore.pushToSyncQueue({ id: generateId(), action: actionName, args, createdAt: Date.now() })
      } else {
        // Unknown error — queue the operation so it's not lost, then try to refresh from server
        const currentStore = useFinanceStore.getState()
        currentStore.setSyncStatus('error')
        currentStore.setSyncError(err?.message ?? 'Erro ao sincronizar com o banco')
        currentStore.pushToSyncQueue({ id: generateId(), action: actionName, args, createdAt: Date.now() })
      }
    }
  })()
}

