import { isNetworkError, isSessionError } from './errors'
import { tryRefreshSession } from './session'
import { callWithRetry } from './retry'
import * as db from '../lib/supabaseData'

// Global flag to suppress sync-back when applying realtime updates
export const _realtimeOrigin = { value: false }

let storeRef: any = null

/**
 * Register the finance store with the sync engine at startup.
 * Prevents circular dependencies between the store and the sync engine.
 */
export function registerStore(store: any) {
  storeRef = store
}

function getStore() {
  if (!storeRef) {
    throw new Error('[sync] Finance store was not registered in sync engine.')
  }
  return storeRef.getState()
}

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
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

/**
 * Main function to synchronize mutations with the remote Supabase database.
 * If offline or if a session error occurs that cannot be resolved immediately,
 * the operation is added to the local syncQueue.
 */
export function syncRemote(actionOrFn: keyof typeof db | (() => Promise<void>), ...args: any[]) {
  if (_realtimeOrigin.value) return

  const store = getStore()

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

  ;(async () => {
    try {
      await callWithRetry(() => method(...args))
      
      // Get the freshest state to update status and trigger queue processing
      const currentStore = getStore()
      currentStore.setSyncStatus('idle')
      currentStore.setSyncError(null)
      currentStore.setLastSyncedAt(now())
      if (currentStore.syncQueue.length > 0) currentStore.processSyncQueue()
    } catch (err: any) {
      console.error('[sync execution]', actionName, err)

      if (isSessionError(err)) {
        const recovered = await attemptSessionRecovery(() => method(...args))
        if (recovered) {
          const currentStore = getStore()
          currentStore.setSyncStatus('idle')
          currentStore.setSyncError(null)
          currentStore.setLastSyncedAt(now())
          if (currentStore.syncQueue.length > 0) currentStore.processSyncQueue()
          return
        }
        
        const currentStore = getStore()
        currentStore.setSyncStatus('error')
        currentStore.setSyncError('Sessão expirada. Faça login novamente para sincronizar.')
        currentStore.pushToSyncQueue({ id: generateId(), action: actionName, args, createdAt: Date.now() })
      } else if (isNetworkError(err)) {
        const currentStore = getStore()
        currentStore.setSyncStatus('offline')
        currentStore.pushToSyncQueue({ id: generateId(), action: actionName, args, createdAt: Date.now() })
      } else {
        const currentStore = getStore()
        currentStore.setSyncStatus('error')
        currentStore.setSyncError(err?.message ?? 'Erro ao sincronizar com o banco')
        currentStore.pushToSyncQueue({ id: generateId(), action: actionName, args, createdAt: Date.now() })
      }
    }
  })()
}
