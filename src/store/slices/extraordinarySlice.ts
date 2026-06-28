import { ExtraordinaryEntry } from '../../types/transaction'
import {
  generateId,
  getUserId,
  syncRemote,
  assertMonthNotClosed,
} from '../financeStoreHelpers'

export interface ExtraordinarySlice {
  extraordinaryEntries: ExtraordinaryEntry[]
  addExtraordinary: (e: Omit<ExtraordinaryEntry, 'id'>) => void
  deleteExtraordinary: (id: string) => void
}

export const createExtraordinarySlice = (set: any, get: any): ExtraordinarySlice => ({
  extraordinaryEntries: [],

  addExtraordinary: (e) => {
    try { assertMonthNotClosed(get, e.monthKey) } catch { console.warn('[closed] addExtraordinary blocked:', e.monthKey); return }
    const newEntry: ExtraordinaryEntry = { ...e, id: generateId() }
    set((s: any) => ({ extraordinaryEntries: [...s.extraordinaryEntries, newEntry] }))
    const uid = getUserId()
    if (uid) syncRemote('upsertExtraordinaryEntry', uid, newEntry)
  },

  deleteExtraordinary: (id) => {
    const existing = get().extraordinaryEntries.find((e: any) => e.id === id)
    if (!existing) return
    try { assertMonthNotClosed(get, existing.monthKey) } catch { console.warn('[closed] deleteExtraordinary blocked:', existing.monthKey); return }
    set((s: any) => ({ extraordinaryEntries: s.extraordinaryEntries.filter((e: any) => e.id !== id) }))
    const uid = getUserId()
    if (uid) syncRemote('deleteExtraordinaryEntryRemote', id)
  },
})
