import { Transaction } from '../../types/transaction'
import { getBillingMonthKey } from '../../utils/cardBilling'
import {
  generateId,
  now,
  getUserId,
  syncRemote,
  checkBudgetAlert,
  assertMonthNotClosed,
} from '../financeStoreHelpers'

export interface TransactionSlice {
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void
  addTransactions: (ts: Transaction[]) => void
  addInstallmentTransactions: (
    base: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'installmentGroupId' | 'installmentCurrent' | 'monthKey'>,
    installmentTotal: number,
    closingDay?: number,
    dueDay?: number
  ) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  bulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  togglePaid: (id: string) => void
  getTransactionsForMonth: (monthKey: string) => Transaction[]
}

export const createTransactionSlice = (set: any, get: any): TransactionSlice => ({
  transactions: [],

  addTransaction: (t) => {
    try { assertMonthNotClosed(get, t.monthKey) } catch { console.warn('[closed] addTransaction blocked:', t.monthKey); return }
    const newT: Transaction = { ...t, id: generateId(), isPaid: t.isPaid ?? false, createdAt: now(), updatedAt: now() }
    set((s: any) => ({ transactions: [...s.transactions, newT] }))
    const uid = getUserId()
    if (uid) syncRemote('upsertTransaction', uid, newT)
    if (newT.type === 'expense') {
      Promise.resolve().then(() => checkBudgetAlert(get(), newT.monthKey, newT.section))
    }
  },

  addTransactions: (ts) => {
    for (const t of ts) {
      try { assertMonthNotClosed(get, t.monthKey) } catch { console.warn('[closed] addTransactions blocked:', t.monthKey); return }
    }
    const timeNow = now()
    const newTs = ts.map((t) => ({
      ...t,
      id: t.id || generateId(),
      isPaid: t.isPaid ?? false,
      createdAt: t.createdAt || timeNow,
      updatedAt: timeNow,
    }))
    set((s: any) => ({ transactions: [...s.transactions, ...newTs] }))
    const uid = getUserId()
    if (uid) syncRemote('bulkUpsertTransactions', uid, newTs)
  },

  addInstallmentTransactions: (base, installmentTotal, closingDay, dueDay) => {
    const groupId = generateId()
    const [startYear, startMonth, startDay] = base.date.split('-').map(Number)
    const baseDescription = base.description

    const transactions: Transaction[] = []
    const checkedMonths = new Set<string>()
    for (let i = 0; i < installmentTotal; i++) {
      const d = new Date(startYear, startMonth - 1 + i, startDay || 1)
      const instYear = d.getFullYear()
      const instMonth = d.getMonth() + 1
      const instDay = d.getDate()
      const instDate = `${instYear}-${String(instMonth).padStart(2, '0')}-${String(instDay).padStart(2, '0')}`

      const mk = closingDay != null
        ? getBillingMonthKey(instDate, closingDay, dueDay)
        : `${instYear}-${String(instMonth).padStart(2, '0')}`

      // Check each unique monthKey before adding
      if (!checkedMonths.has(mk)) {
        checkedMonths.add(mk)
        try { assertMonthNotClosed(get, mk) } catch { console.warn('[closed] addInstallmentTransactions blocked:', mk); return }
      }

      transactions.push({
        ...base,
        id: generateId(),
        description: `${baseDescription} (${i + 1}/${installmentTotal})`,
        monthKey: mk,
        date: instDate,
        isPaid: base.isPaid ?? false,
        installmentGroupId: groupId,
        installmentCurrent: i + 1,
        installmentTotal,
        createdAt: now(),
        updatedAt: now(),
      })
    }

    set((s: any) => ({ transactions: [...s.transactions, ...transactions] }))
    const uid = getUserId()
    if (uid) syncRemote('bulkUpsertTransactions', uid, transactions)
  },

  updateTransaction: (id, updates) => {
    const existing = get().transactions.find((t: any) => t.id === id)
    if (!existing) return
    const targetMonthKey = updates.monthKey ?? existing.monthKey
    try { assertMonthNotClosed(get, targetMonthKey) } catch { console.warn('[closed] updateTransaction blocked:', targetMonthKey); return }
    if (targetMonthKey !== existing.monthKey) {
      try { assertMonthNotClosed(get, existing.monthKey) } catch { console.warn('[closed] updateTransaction blocked (original):', existing.monthKey); return }
    }
    const updated = { ...existing, ...updates, updatedAt: now() }
    set((s: any) => ({
      transactions: s.transactions.map((t: any) => (t.id === id ? updated : t)),
    }))
    const uid = getUserId()
    if (uid) {
      syncRemote('upsertTransaction', uid, updated)
    }
  },

  bulkUpdateTransactions: (ids, updates) => {
    const idsSet = new Set(ids)
    const checked = new Set<string>()
    for (const tx of get().transactions) {
      if (!idsSet.has(tx.id)) continue
      const targetMk = updates.monthKey ?? tx.monthKey
      if (!checked.has(targetMk)) {
        checked.add(targetMk)
        try { assertMonthNotClosed(get, targetMk) } catch { console.warn('[closed] bulkUpdateTransactions blocked:', targetMk); return }
      }
      if (updates.monthKey && updates.monthKey !== tx.monthKey && !checked.has(tx.monthKey)) {
        checked.add(tx.monthKey)
        try { assertMonthNotClosed(get, tx.monthKey) } catch { console.warn('[closed] bulkUpdateTransactions blocked (original):', tx.monthKey); return }
      }
    }
    const updatedTxs: Transaction[] = []
    set((s: any) => ({
      transactions: s.transactions.map((t: any) => {
        if (idsSet.has(t.id)) {
          const updated = { ...t, ...updates, updatedAt: now() }
          updatedTxs.push(updated)
          return updated
        }
        return t
      }),
    }))
    const uid = getUserId()
    if (uid && updatedTxs.length > 0) {
      syncRemote('bulkUpdateTransactions', uid, updatedTxs)
    }
  },

  deleteTransaction: (id) => {
    const existing = get().transactions.find((t: any) => t.id === id)
    if (!existing) return
    try { assertMonthNotClosed(get, existing.monthKey) } catch { console.warn('[closed] deleteTransaction blocked:', existing.monthKey); return }
    set((s: any) => ({ transactions: s.transactions.filter((t: any) => t.id !== id) }))
    const uid = getUserId()
    if (uid) syncRemote('deleteTransactionRemote', id)
  },

  togglePaid: (id) => {
    const existing = get().transactions.find((t: any) => t.id === id)
    if (!existing) return
    const updated = { ...existing, isPaid: !existing.isPaid, updatedAt: now() }
    set((s: any) => ({
      transactions: s.transactions.map((t: any) => (t.id === id ? updated : t))
    }))
    const uid = getUserId()
    if (uid) syncRemote('upsertTransaction', uid, updated)
  },

  getTransactionsForMonth: (monthKey) => {
    return get().transactions.filter((t: any) => t.monthKey === monthKey)
  },
})
