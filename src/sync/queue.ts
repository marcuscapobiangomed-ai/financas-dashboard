import { SyncActionDescriptor, SyncStatus } from './types'
import { isNetworkError, isSessionError } from './errors'
import { hasActiveSession, tryRefreshSession } from './session'
import * as db from '../lib/supabaseData'

export const QUEUE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface QueueProcessorStoreInterface {
  getSyncQueue: () => SyncActionDescriptor[]
  setSyncQueue: (q: SyncActionDescriptor[]) => void
  setSyncStatus: (s: SyncStatus) => void
  setSyncError: (e: string | null) => void
  setQueueProcessing: (b: boolean) => void
  setLastSyncedAt: (ts: string) => void
  loadFromSupabase: (data: any) => void
  getUserId: () => string | null
}

/**
 * Core algorithm to process the offline sync queue.
 * Decoupled from the Zustand store to prevent circular dependencies.
 */
export async function processSyncQueue(store: QueueProcessorStoreInterface): Promise<void> {
  const syncQueue = store.getSyncQueue()
  if (syncQueue.length === 0 || !navigator.onLine) return

  // Verify session before processing, silent refresh if expired
  const sessionOk = await hasActiveSession()
  if (!sessionOk) {
    const refreshed = await tryRefreshSession()
    if (!refreshed) {
      store.setSyncStatus('error')
      store.setSyncError('Sessão expirada. Faça login novamente.')
      return
    }
  }

  store.setQueueProcessing(true)
  store.setSyncStatus('syncing')

  // Filter out TTL-expired queue items
  const validQueue = syncQueue.filter(
    (item) => (Date.now() - (item.createdAt || 0)) < QUEUE_TTL_MS
  )
  if (validQueue.length < syncQueue.length) {
    console.warn(`[sync queue] Descartados ${syncQueue.length - validQueue.length} itens expirados da fila`)
  }

  const remaining: SyncActionDescriptor[] = []
  let hasNetworkError = false
  let hasToxicError = false

  for (const item of validQueue) {
    if (hasNetworkError) {
      remaining.push(item)
      continue
    }

    try {
      const method = (db as any)[item.action]
      if (method && typeof method === 'function') {
        await method(...item.args)
      } else {
        console.warn(`[sync queue] Método de banco desconhecido: ${item.action}`)
      }
    } catch (err: any) {
      console.error('[sync queue]', item.action, err)
      if (isSessionError(err)) {
        // Recover session & retry once
        const refreshed = await tryRefreshSession()
        if (refreshed) {
          try {
            const retryMethod = (db as any)[item.action]
            if (retryMethod) await retryMethod(...item.args)
            continue // Succeeded after recovery
          } catch (retryErr: any) {
            console.error('[sync queue] Falha após refresh de token:', item.action, retryErr)
          }
        }
        remaining.push(item)
        hasNetworkError = true
      } else if (isNetworkError(err)) {
        remaining.push(item)
        hasNetworkError = true
      } else {
        // Non-network/non-session error (toxic payload) — drop it to avoid infinite loop
        console.warn('[sync queue] Item tóxico descartado da fila:', item.action, item.id)
        hasToxicError = true
      }
    }
  }

  store.setSyncQueue(remaining)
  store.setQueueProcessing(false)

  if (hasToxicError) {
    store.setSyncError('Alguns itens falharam e foram descartados. Os dados foram atualizados.')
    const uid = store.getUserId()
    if (uid) {
      try {
        const data = await db.fetchAllUserData(uid)
        store.loadFromSupabase(data)
      } catch (err) {
        console.error('[sync queue] Falha ao recarregar dados do servidor:', err)
      }
    }
  }

  const finalStatus =
    hasNetworkError || remaining.length > 0
      ? 'offline'
      : 'idle'

  store.setSyncStatus(finalStatus)

  if (finalStatus === 'idle') {
    store.setSyncError(null)
    store.setLastSyncedAt(new Date().toISOString())
  }
}
