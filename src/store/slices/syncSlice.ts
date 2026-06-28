import { Transaction, RecurringTemplate, ExtraordinaryEntry } from '../../types/transaction'
import { MonthSettings } from '../../types/budget'
import { getUserId, _realtimeOrigin } from '../financeStoreHelpers'
import { SyncActionDescriptor } from '../../sync'
import { processSyncQueue as processQueue } from '../../sync/queue'
import { toModel, sanitizeMonthSettings, parseUserSettingsRow } from '../../lib/supabaseData'

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
    const { syncStatus, processSyncQueue, setSyncStatus, setSyncError, isQueueProcessing } = get()
    if (isQueueProcessing) return
    if (syncStatus === 'error') {
      setSyncError(null)
      setSyncStatus('offline')
    }
    if (navigator.onLine) processSyncQueue()
  },

  processSyncQueue: async () => {
    const storeInterface = {
      getSyncQueue: () => get().syncQueue,
      setSyncQueue: (q: SyncActionDescriptor[]) => set({ syncQueue: q }),
      setSyncStatus: (s: any) => get().setSyncStatus(s),
      setSyncError: (e: any) => get().setSyncError(e),
      setQueueProcessing: (b: boolean) => get().setQueueProcessing(b),
      setLastSyncedAt: (ts: string) => get().setLastSyncedAt(ts),
      loadFromSupabase: (data: any) => get().loadFromSupabase(data),
      getUserId: () => getUserId()
    }
    await processQueue(storeInterface)
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
