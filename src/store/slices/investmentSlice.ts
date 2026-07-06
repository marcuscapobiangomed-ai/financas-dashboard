import { Investment } from '../../types/investment'
import { Category } from '../../types/category'
import { resolveMonthlyYieldPercent } from '../../utils/investmentCalc'
import {
  generateId,
  now,
  getUserId,
  syncRemote,
  assertMonthNotClosed,
} from '../financeStoreHelpers'

export interface InvestmentSlice {
  investments: Investment[]
  addInvestment: (inv: Omit<Investment, 'id'>) => void
  updateInvestment: (id: string, updates: Partial<Investment>) => void
  deleteInvestment: (id: string) => void
  applyInvestmentYieldsToMonth: (monthKey: string) => number
}

export const createInvestmentSlice = (set: any, get: any): InvestmentSlice => ({
  investments: [],

  addInvestment: (inv) => {
    const { appSettings } = get()
    const resolved = resolveMonthlyYieldPercent(
      inv.investmentType, inv.cdiPercent, inv.ipcaPercent,
      appSettings.cdiRateAnnual, appSettings.ipcaRateAnnual,
      inv.monthlyYieldPercent
    )
    const newInv: Investment = { ...inv, id: generateId(), monthlyYieldPercent: resolved }
    set((s: any) => ({ investments: [...s.investments, newInv] }))
    const uid = getUserId()
    if (uid) syncRemote('upsertInvestment', uid, newInv)
  },

  updateInvestment: (id, updates) => {
    const { appSettings } = get()
    const existing = get().investments.find((inv: any) => inv.id === id)
    if (!existing) return
    const merged = { ...existing, ...updates }
    const resolved = resolveMonthlyYieldPercent(
      merged.investmentType, merged.cdiPercent, merged.ipcaPercent,
      appSettings.cdiRateAnnual, appSettings.ipcaRateAnnual,
      merged.monthlyYieldPercent
    )
    const updated = { ...merged, monthlyYieldPercent: resolved }
    set((s: any) => ({
      investments: s.investments.map((inv: any) => (inv.id === id ? updated : inv)),
    }))
    const uid = getUserId()
    if (uid) {
      syncRemote('upsertInvestment', uid, updated)
    }
  },

  deleteInvestment: (id) => {
    const exists = get().investments.some((inv: any) => inv.id === id)
    if (!exists) return
    set((s: any) => ({ investments: s.investments.filter((inv: any) => inv.id !== id) }))
    const uid = getUserId()
    if (uid) syncRemote('deleteInvestmentRemote', id)
  },

  applyInvestmentYieldsToMonth: (monthKey) => {
    try { assertMonthNotClosed(get, monthKey) } catch { console.warn('[closed] applyInvestmentYieldsToMonth blocked:', monthKey); return 0 }
    const { investments, transactions } = get()
    const dateStr = `${monthKey}-01`
    const existingInvIds = new Set(
      transactions
        .filter((t: any) => t.monthKey === monthKey && t.tags?.includes('investment-yield'))
        .map((t: any) => t.recurringId)
    )

    const toAdd = investments
      .filter((inv: any) => inv.isActive && inv.startMonth <= monthKey && !existingInvIds.has(inv.id))
      .map((inv: any) => {
        const yield_ = Math.round(inv.principal * inv.monthlyYieldPercent / 100 * 100) / 100
        return {
          id: generateId(),
          type: 'income' as const,
          section: 'entradas',
          description: `Rendimento — ${inv.name}`,
          amount: yield_,
          category: Category.RENDIMENTOS,
          date: dateStr,
          monthKey,
          recurringId: inv.id,
          tags: ['investment-yield'],
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
