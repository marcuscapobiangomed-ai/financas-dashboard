import { Transaction, RecurringTemplate, ExtraordinaryEntry } from '../../types/transaction'
import { MonthSettings } from '../../types/budget'
import {
  isNetworkError,
  isSessionError,
  SyncActionDescriptor,
  getUserId,
  syncRemote,
  _realtimeOrigin,
  QUEUE_TTL_MS,
} from '../financeStoreHelpers'
import { hasActiveSession, tryRefreshSession } from '../../lib/supabase'
import * as db from '../../lib/supabaseData'
import { parseUserSettingsRow, sanitizeMonthSettings, toModel } from '../../lib/supabaseData'

export interface SyncSlice {
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline'
  syncQueue: SyncActionDescriptor[]
  isQueueProcessing: boolean
  syncError: string | null
  /** ISO timestamp of the last successful sync. */
  lastSyncedAt: string | null

  setSyncError: (error: string | null) => void
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'offline') => void
  setQueueProcessing: (b: boolean) => void
  setLastSyncedAt: (ts: string) => void
  pushToSyncQueue: (action: SyncActionDescriptor) => void
  processSyncQueue: () => Promise<void>
  retrySyncNow: () => void
  applyRealtimeUpdate: (table: string, eventType: string, newRow: any, oldRow: any) => void
}

export const createSyncSlice = (set: any, get: any): SyncSlice => ({
  syncStatus: 'idle',
  syncQueue: [],
  isQueueProcessing: false,
  syncError: null,
  lastSyncedAt: null,

  setSyncError: (error) => set({ syncError: error }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setQueueProcessing: (b) => set({ isQueueProcessing: b }),
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
  pushToSyncQueue: (action) =>
    set((s: any) => ({
      // Deduplicate: if an identical action+args exists for the same entity, replace it
      syncQueue: [
        ...s.syncQueue.filter(
          (item: SyncActionDescriptor) =>
            !(item.action === action.action && JSON.stringify(item.args) === JSON.stringify(action.args))
        ),
        action,
      ],
    })),

  /** Manually trigger a retry — useful from the UI after an error. */
  retrySyncNow: () => {
    const { syncStatus, processSyncQueue, setSyncStatus, setSyncError } = get()
    if (syncStatus === 'error') {
      setSyncError(null)
      setSyncStatus('offline')
    }
    if (navigator.onLine) processSyncQueue()
  },

  processSyncQueue: async () => {
    const { syncQueue, setSyncStatus, isQueueProcessing, setQueueProcessing } = get()
    if (syncQueue.length === 0 || !navigator.onLine || isQueueProcessing) return

    // Try to ensure we have a valid session — attempt refresh if needed
    const sessionOk = await hasActiveSession()
    if (!sessionOk) {
      // hasActiveSession already tried refresh internally; try once more explicitly
      const refreshed = await tryRefreshSession()
      if (!refreshed) {
        setSyncStatus('error')
        get().setSyncError('Sessão expirada. Faça login novamente.')
        return
      }
    }

    setQueueProcessing(true)
    setSyncStatus('syncing')

    // Discard TTL-expired items
    const validQueue = syncQueue.filter(
      (item: any) => (Date.now() - (item.createdAt || 0)) < QUEUE_TTL_MS
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
        if (method) {
          await method(...item.args)
        }
      } catch (err: any) {
        console.error('[sync queue]', item.action, err)
        if (isSessionError(err)) {
          // Try to refresh the session and retry this item once
          const refreshed = await tryRefreshSession()
          if (refreshed) {
            try {
              const retryMethod = (db as any)[item.action]
              if (retryMethod) await retryMethod(...item.args)
              continue // Success after refresh — move to next item
            } catch (retryErr: any) {
              console.error('[sync queue] Retry after refresh failed:', item.action, retryErr)
            }
          }
          // Refresh failed or retry failed — keep in queue
          remaining.push(item)
          hasNetworkError = true
        } else if (isNetworkError(err)) {
          remaining.push(item)
          hasNetworkError = true
        } else {
          // Toxic item — discard and continue processing the rest
          console.warn('[sync queue] Item tóxico descartado:', item.action, item.id)
          hasToxicError = true
        }
      }
    }

    set({ syncQueue: remaining })
    setQueueProcessing(false)

    if (hasToxicError) {
      get().setSyncError('Alguns itens falharam e foram descartados. Os dados foram atualizados.')
      const uid = getUserId()
      if (uid) db.fetchAllUserData(uid).then((data: any) => get().loadFromSupabase(data)).catch(() => {})
    }

    const finalStatus =
      hasNetworkError || remaining.length > 0
        ? 'offline'
        : hasToxicError
        ? 'error'
        : 'idle'

    setSyncStatus(finalStatus)

    if (finalStatus === 'idle') {
      get().setSyncError(null) // Clear any previous errors on success
      get().setLastSyncedAt(new Date().toISOString())
    }
  },

  applyRealtimeUpdate: (table, eventType, newRow, oldRow) => {
    _realtimeOrigin.value = true
    try {
      set((s: any) => {
        try {
          if (table === 'transactions') {
            if (eventType === 'DELETE') return { transactions: s.transactions.filter((t: any) => t.id !== oldRow?.id) }
            const camel = toModel<Transaction>(newRow)
            const exists = s.transactions.some((t: any) => t.id === camel.id)
            return { transactions: exists ? s.transactions.map((t: any) => t.id === camel.id ? camel : t) : [...s.transactions, camel] }
          }
          if (table === 'recurring_templates') {
            if (eventType === 'DELETE') return { recurringTemplates: s.recurringTemplates.filter((t: any) => t.id !== oldRow?.id) }
            const camel = toModel<RecurringTemplate>(newRow)
            const exists = s.recurringTemplates.some((t: any) => t.id === camel.id)
            return { recurringTemplates: exists ? s.recurringTemplates.map((t: any) => t.id === camel.id ? camel : t) : [...s.recurringTemplates, camel] }
          }
          if (table === 'extraordinary_entries') {
            if (eventType === 'DELETE') return { extraordinaryEntries: s.extraordinaryEntries.filter((t: any) => t.id !== oldRow?.id) }
            const camel = toModel<ExtraordinaryEntry>(newRow)
            const exists = s.extraordinaryEntries.some((t: any) => t.id === camel.id)
            return { extraordinaryEntries: exists ? s.extraordinaryEntries.map((t: any) => t.id === camel.id ? camel : t) : [...s.extraordinaryEntries, camel] }
          }
          if (table === 'investments') {
            if (eventType === 'DELETE') return { investments: s.investments.filter((t: any) => t.id !== oldRow?.id) }
            const camel = toModel<any>(newRow)
            const exists = s.investments.some((t: any) => t.id === camel.id)
            return { investments: exists ? s.investments.map((t: any) => t.id === camel.id ? camel : t) : [...s.investments, camel] }
          }
          if (table === 'month_settings') {
            if (eventType === 'DELETE') return s
            const camel = sanitizeMonthSettings(toModel<MonthSettings & { userId?: string }>(newRow))
            return { monthSettings: { ...s.monthSettings, [camel.monthKey]: camel } }
          }
          if (table === 'user_settings') {
            const parsed = parseUserSettingsRow(newRow as Record<string, unknown>)
            return { appSettings: parsed }
          }
        } catch (innerErr) {
          console.error('[Realtime] Erro ao processar atualização:', table, eventType, innerErr)
        }
        return s
      })
    } finally {
      _realtimeOrigin.value = false
    }
  },
})
