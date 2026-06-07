import { useAuthStore } from './useAuthStore'
import { useFinanceStore } from './useFinanceStore'
import { Transaction } from '../types/transaction'
import { AppSettings, MonthSettings } from '../types/budget'
import { getNotificationPermission, showBudgetAlert } from '../lib/notifications'
import { hasActiveSession } from '../lib/supabase'
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

export function syncRemote(actionOrFn: keyof typeof db | (() => Promise<void>), ...args: any[]) {
  if (_realtimeOrigin.value) return

  const store = useFinanceStore.getState()

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
        store.setLastSyncedAt(now())
      })
      .catch((err) => {
        console.error('[sync function]', err)
        if (isSessionError(err)) {
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

  // Run with retry + session validation
  ;(async () => {
    // Validate session before attempting
    const sessionOk = await hasActiveSession()
    if (!sessionOk) {
      store.setSyncStatus('error')
      store.setSyncError('Sessão expirada. Faça login novamente para sincronizar.')
      return
    }

    try {
      await callWithRetry(() => method(...args))
      const queueSize = useFinanceStore.getState().syncQueue.length
      store.setSyncStatus(queueSize > 0 ? 'offline' : 'idle')
      store.setLastSyncedAt(now())
      if (queueSize > 0) store.processSyncQueue()
    } catch (err: any) {
      console.error('[sync execution]', actionName, err)
      if (isNetworkError(err)) {
        // All retries exhausted — queue for later
        store.setSyncStatus('offline')
        store.pushToSyncQueue({ id: generateId(), action: actionName, args, createdAt: Date.now() })
      } else if (isSessionError(err)) {
        store.setSyncStatus('error')
        store.setSyncError('Sessão expirada. Faça login novamente para sincronizar.')
      } else {
        store.setSyncStatus('error')
        store.setSyncError(err?.message ?? 'Erro crítico ao sincronizar com o banco')
        // Refresh from server to restore consistency
        const uid = getUserId()
        if (uid) {
          db.fetchAllUserData(uid).then((data) => store.loadFromSupabase(data)).catch(() => {})
        }
      }
    }
  })()
}
