import { RecurringTemplate, Transaction } from '../../types/transaction'
import {
  generateId,
  now,
  getUserId,
  syncRemote,
  monthsDiff,
} from '../financeStoreHelpers'

export interface RecurringSlice {
  recurringTemplates: RecurringTemplate[]
  addRecurringTemplate: (t: Omit<RecurringTemplate, 'id'>) => string
  updateRecurringTemplate: (id: string, updates: Partial<RecurringTemplate>) => void
  deleteRecurringTemplate: (id: string) => void
  applyRecurringToMonth: (monthKey: string) => number
}

export const createRecurringSlice = (set: any, get: any): RecurringSlice => ({
  recurringTemplates: [],

  addRecurringTemplate: (t) => {
    const template: RecurringTemplate = { ...t, id: generateId() }
    set((s: any) => ({ recurringTemplates: [...s.recurringTemplates, template] }))
    const uid = getUserId()
    if (uid) syncRemote('upsertRecurringTemplate', uid, template)
    return template.id
  },

  updateRecurringTemplate: (id, updates) => {
    set((s: any) => ({
      recurringTemplates: s.recurringTemplates.map((t: any) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }))
    const uid = getUserId()
    if (uid) {
      const updated = get().recurringTemplates.find((t: any) => t.id === id)
      if (updated) syncRemote('upsertRecurringTemplate', uid, updated)
    }
  },

  deleteRecurringTemplate: (id) => {
    set((s: any) => ({ recurringTemplates: s.recurringTemplates.filter((t: any) => t.id !== id) }))
    const uid = getUserId()
    if (uid) syncRemote('deleteRecurringTemplateRemote', id)
  },

  applyRecurringToMonth: (monthKey) => {
    const { recurringTemplates, transactions } = get()
    const existingIds = new Set(
      transactions.filter((t: any) => t.monthKey === monthKey && t.recurringId).map((t: any) => t.recurringId)
    )
    const dateStr = `${monthKey}-01`

    const toAdd: Transaction[] = recurringTemplates
      .filter((tmpl: any) => tmpl.isActive && !existingIds.has(tmpl.id))
      .filter((tmpl: any) => {
        if (tmpl.endMonth && tmpl.endMonth < monthKey) return false
        if (tmpl.startMonth > monthKey) return false
        return true
      })
      .map((tmpl: any) => {
        let description = tmpl.description
        if (tmpl.installmentTotal) {
          const current = monthsDiff(tmpl.startMonth, monthKey) + 1
          description = `${tmpl.description} (${current}/${tmpl.installmentTotal})`
        }
        return {
          id: generateId(),
          type: 'expense' as const,
          section: tmpl.section,
          description,
          amount: tmpl.amount,
          category: tmpl.category,
          date: dateStr,
          monthKey,
          isRecurring: true,
          recurringId: tmpl.id,
          createdAt: now(),
          updatedAt: now(),
        }
      })

    if (toAdd.length > 0) {
      set((s: any) => ({ transactions: [...s.transactions, ...toAdd] }))
      const uid = getUserId()
      if (uid) syncRemote('bulkUpsertTransactions', uid, toAdd)
    }
    return toAdd.length
  },
})
