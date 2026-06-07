import { ExtraordinaryEntry } from '../../types/transaction'
import {
  generateId,
  getUserId,
  syncRemote,
} from '../financeStoreHelpers'

export interface ExtraordinarySlice {
  extraordinaryEntries: ExtraordinaryEntry[]
  addExtraordinary: (e: Omit<ExtraordinaryEntry, 'id'>) => void
  deleteExtraordinary: (id: string) => void
}

export const createExtraordinarySlice = (set: any, get: any): ExtraordinarySlice => ({
  extraordinaryEntries: [],

  addExtraordinary: (e) => {
    const newEntry: ExtraordinaryEntry = { ...e, id: generateId() }
    set((s: any) => ({ extraordinaryEntries: [...s.extraordinaryEntries, newEntry] }))
    const uid = getUserId()
    if (uid) syncRemote('upsertExtraordinaryEntry', uid, newEntry)
  },

  deleteExtraordinary: (id) => {
    set((s: any) => ({ extraordinaryEntries: s.extraordinaryEntries.filter((e: any) => e.id !== id) }))
    const uid = getUserId()
    if (uid) syncRemote('deleteExtraordinaryEntryRemote', id)
  },
})
