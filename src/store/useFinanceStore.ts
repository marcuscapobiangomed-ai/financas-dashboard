import { create } from 'zustand'
import { Transaction, RecurringTemplate, ExtraordinaryEntry } from '../types/transaction'
import { AppSettings, MonthSettings } from '../types/budget'
import { Investment } from '../types/investment'
import { Category } from '../types/category'
import { DEFAULT_APP_SETTINGS } from '../constants/defaultBudget'
import { resolveMonthlyYieldPercent } from '../utils/investmentCalc'
import { fetchBCBRates } from '../lib/bcbApi'
import { showBudgetAlert, getNotificationPermission } from '../lib/notifications'
import { getCurrentMonthKey } from '../constants/months'
import {
  upsertTransaction,
  deleteTransactionRemote,
  bulkUpsertTransactions,
  upsertRecurringTemplate,
  deleteRecurringTemplateRemote,
  upsertExtraordinaryEntry,
  deleteExtraordinaryEntryRemote,
  upsertInvestment,
  deleteInvestmentRemote,
  upsertMonthSettings as upsertMonthSettingsRemote,
  upsertUserSettings,
  deleteAllUserData,
  bulkUpdateTransactions,
  bulkUpdateExtraordinaryEntries,
  type StoreSnapshot,
} from '../lib/supabaseData'

function getUserId(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require('./useAuthStore')
    return useAuthStore.getState().user?.id ?? null
  } catch {
    return null
  }
}

/** Fire-and-forget sync with error feedback */
function syncRemote(fn: () => Promise<void>) {
  fn().catch((err) => {
    console.error('[sync]', err)
    const msg = err?.message ?? 'Erro ao sincronizar com o servidor'
    useFinanceStore.getState().setSyncError(msg)
  })
}

interface FinanceStore {
  // Raw data
  transactions: Transaction[]
  recurringTemplates: RecurringTemplate[]
  extraordinaryEntries: ExtraordinaryEntry[]
  investments: Investment[]
  monthSettings: Record<string, MonthSettings>
  appSettings: AppSettings

  // UI state
  currentMonthKey: string

  // Transaction actions
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void
  addTransactions: (ts: Transaction[]) => void
  addInstallmentTransactions: (
    base: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'installmentGroupId' | 'installmentCurrent' | 'monthKey'>,
    installmentTotal: number
  ) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  getTransactionsForMonth: (monthKey: string) => Transaction[]

  // Extraordinary actions
  addExtraordinary: (e: Omit<ExtraordinaryEntry, 'id'>) => void
  updateExtraordinary: (id: string, updates: Partial<ExtraordinaryEntry>) => void
  deleteExtraordinary: (id: string) => void
  getExtraordinaryForMonth: (monthKey: string) => ExtraordinaryEntry[]

  // Recurring template actions
  addRecurringTemplate: (t: Omit<RecurringTemplate, 'id'>) => string
  updateRecurringTemplate: (id: string, updates: Partial<RecurringTemplate>) => void
  deleteRecurringTemplate: (id: string) => void
  applyRecurringToMonth: (monthKey: string) => number

  // Investment actions
  addInvestment: (inv: Omit<Investment, 'id'>) => void
  updateInvestment: (id: string, updates: Partial<Investment>) => void
  deleteInvestment: (id: string) => void
  applyInvestmentYieldsToMonth: (monthKey: string) => number

  // Month settings
  getMonthSettings: (monthKey: string) => MonthSettings
  updateMonthSettings: (monthKey: string, updates: Partial<MonthSettings>) => void
  toggleMonthClosed: (monthKey: string) => void
  duplicatePreviousMonth: (monthKey: string) => void

  // App settings
  updateAppSettings: (updates: Partial<AppSettings>) => void

  // Navigation
  setCurrentMonthKey: (key: string) => void

  // Data management
  exportData: () => string
  importData: (json: string, merge?: boolean) => boolean
  clearAllData: () => void
  migrateMonth: (fromMonthKey: string, toMonthKey: string) => number

  // Description autocomplete
  getDescriptionSuggestions: (query: string, limit?: number) => string[]

  // Supabase sync
  loadFromSupabase: (data: StoreSnapshot) => void
  resetStore: () => void

  // BCB rates
  fetchLatestRates: () => Promise<{ cdi?: number; ipca?: number; selic?: number } | null>
  ratesFetching: boolean

  // Sync error feedback
  syncError: string | null
  setSyncError: (error: string | null) => void
}

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

function monthsDiff(fromMonthKey: string, toMonthKey: string): number {
  const [fy, fm] = fromMonthKey.split('-').map(Number)
  const [ty, tm] = toMonthKey.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

function defaultMonthSettings(monthKey: string, appSettings: AppSettings): MonthSettings {
  return {
    monthKey,
    isClosed: false,
    sectionLimits: { ...appSettings.defaultSectionLimits },
    tithePercent: appSettings.defaultTithePercent,
    offeringPercent: appSettings.defaultOfferingPercent,
  }
}

/** Check if any section crossed the budget alert threshold after a transaction */
function checkBudgetAlert(state: FinanceStore, monthKey: string, section: string) {
  if (!state.appSettings.notificationsEnabled) return
  if (getNotificationPermission() !== 'granted') return

  const ms = state.getMonthSettings(monthKey)
  const limit = ms.sectionLimits[section] ?? 0
  if (limit <= 0) return

  const total = state.transactions
    .filter((t) => t.monthKey === monthKey && t.section === section && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const percentUsed = (total / limit) * 100
  const threshold = state.appSettings.alertThresholdPercent || 80

  // Notify if crossed threshold or over limit
  if (percentUsed >= threshold) {
    // Build a human label for the section
    const cardLabel = state.appSettings.cardSections?.find((c) => c.id === section)?.label
    const labels: Record<string, string> = {
      despesas_fixas: 'Despesas Fixas',
      gastos_diarios: 'Gastos com Dinheiro Físico',
    }
    const label = cardLabel ?? labels[section] ?? section
    showBudgetAlert(label, percentUsed, limit, total)
  }
}

export const useFinanceStore = create<FinanceStore>()((set, get) => ({
  transactions: [],
  recurringTemplates: [],
  extraordinaryEntries: [],
  investments: [],
  monthSettings: {},
  appSettings: DEFAULT_APP_SETTINGS,
  currentMonthKey: getCurrentMonthKey(),
  syncError: null,
  ratesFetching: false,

  setSyncError: (error) => set({ syncError: error }),

  fetchLatestRates: async () => {
    set({ ratesFetching: true })
    try {
      const rates = await fetchBCBRates()
      const updates: Partial<import('../types/budget').AppSettings> = {}
      if (rates.cdi?.value) updates.cdiRateAnnual = rates.cdi.value
      if (rates.ipca?.value) updates.ipcaRateAnnual = rates.ipca.value
      updates.ratesLastUpdated = new Date().toISOString()
      get().updateAppSettings(updates)
      set({ ratesFetching: false })
      return {
        cdi: rates.cdi?.value,
        ipca: rates.ipca?.value,
        selic: rates.selic?.value,
      }
    } catch (err) {
      console.error('[BCB rates]', err)
      set({ ratesFetching: false })
      return null
    }
  },

  // ── Supabase sync ──────────────────────────────────────────────────────

  loadFromSupabase: (data) => {
    set({
      transactions: data.transactions,
      recurringTemplates: data.recurringTemplates,
      extraordinaryEntries: data.extraordinaryEntries,
      investments: data.investments,
      monthSettings: data.monthSettings,
      appSettings: data.appSettings,
    })
  },

  resetStore: () => {
    set({
      transactions: [],
      recurringTemplates: [],
      extraordinaryEntries: [],
      investments: [],
      monthSettings: {},
      appSettings: DEFAULT_APP_SETTINGS,
      currentMonthKey: getCurrentMonthKey(),
    })
  },

  // ── Transaction actions ────────────────────────────────────────────────

  addTransaction: (t) => {
    const newT: Transaction = { ...t, id: generateId(), createdAt: now(), updatedAt: now() }
    set((s) => ({ transactions: [...s.transactions, newT] }))
    const uid = getUserId()
    if (uid) syncRemote(() => upsertTransaction(uid, newT))
    // Check budget alerts after state update
    if (newT.type === 'expense') {
      Promise.resolve().then(() => checkBudgetAlert(get(), newT.monthKey, newT.section))
    }
  },

  addTransactions: (ts) => {
    const now = new Date().toISOString()
    const newTs = ts.map((t) => ({
      ...t,
      id: t.id || generateId(),
      createdAt: t.createdAt || now,
      updatedAt: now,
    }))
    set((s) => ({ transactions: [...s.transactions, ...newTs] }))
    const uid = getUserId()
    if (uid) syncRemote(() => bulkUpsertTransactions(uid, newTs))
  },

  addInstallmentTransactions: (base, installmentTotal) => {
    const groupId = generateId()
    const [startYear, startMonth] = base.date.substring(0, 7).split('-').map(Number)
    const baseDescription = base.description

    const transactions: Transaction[] = []
    for (let i = 0; i < installmentTotal; i++) {
      const d = new Date(startYear, startMonth - 1 + i, 1)
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      transactions.push({
        ...base,
        id: generateId(),
        description: `${baseDescription} (${i + 1}/${installmentTotal})`,
        monthKey: mk,
        date: `${mk}-01`,
        installmentGroupId: groupId,
        installmentCurrent: i + 1,
        installmentTotal,
        createdAt: now(),
        updatedAt: now(),
      })
    }

    set((s) => ({ transactions: [...s.transactions, ...transactions] }))
    const uid = getUserId()
    if (uid) syncRemote(() => bulkUpsertTransactions(uid, transactions))
  },

  updateTransaction: (id, updates) => {
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: now() } : t
      ),
    }))
    const uid = getUserId()
    if (uid) {
      const updated = get().transactions.find((t) => t.id === id)
      if (updated) syncRemote(() => upsertTransaction(uid, updated))
    }
  },

  deleteTransaction: (id) => {
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
    syncRemote(() => deleteTransactionRemote(id))
  },

  getTransactionsForMonth: (monthKey) => {
    return get().transactions.filter((t) => t.monthKey === monthKey)
  },

  // ── Extraordinary actions ──────────────────────────────────────────────

  addExtraordinary: (e) => {
    const entry: ExtraordinaryEntry = { ...e, id: generateId() }
    set((s) => ({ extraordinaryEntries: [...s.extraordinaryEntries, entry] }))
    const uid = getUserId()
    if (uid) syncRemote(() => upsertExtraordinaryEntry(uid, entry))
  },

  updateExtraordinary: (id, updates) => {
    set((s) => ({
      extraordinaryEntries: s.extraordinaryEntries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    }))
    const uid = getUserId()
    if (uid) {
      const updated = get().extraordinaryEntries.find((e) => e.id === id)
      if (updated) syncRemote(() => upsertExtraordinaryEntry(uid, updated))
    }
  },

  deleteExtraordinary: (id) => {
    set((s) => ({ extraordinaryEntries: s.extraordinaryEntries.filter((e) => e.id !== id) }))
    syncRemote(() => deleteExtraordinaryEntryRemote(id))
  },

  getExtraordinaryForMonth: (monthKey) => {
    return get().extraordinaryEntries.filter((e) => e.monthKey === monthKey)
  },

  // ── Recurring template actions ─────────────────────────────────────────

  addRecurringTemplate: (t) => {
    const template: RecurringTemplate = { ...t, id: generateId() }
    set((s) => ({ recurringTemplates: [...s.recurringTemplates, template] }))
    const uid = getUserId()
    if (uid) syncRemote(() => upsertRecurringTemplate(uid, template))
    return template.id
  },

  updateRecurringTemplate: (id, updates) => {
    set((s) => ({
      recurringTemplates: s.recurringTemplates.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }))
    const uid = getUserId()
    if (uid) {
      const updated = get().recurringTemplates.find((t) => t.id === id)
      if (updated) syncRemote(() => upsertRecurringTemplate(uid, updated))
    }
  },

  deleteRecurringTemplate: (id) => {
    set((s) => ({ recurringTemplates: s.recurringTemplates.filter((t) => t.id !== id) }))
    syncRemote(() => deleteRecurringTemplateRemote(id))
  },

  applyRecurringToMonth: (monthKey) => {
    const { recurringTemplates, transactions } = get()
    const existingIds = new Set(
      transactions.filter((t) => t.monthKey === monthKey && t.recurringId).map((t) => t.recurringId)
    )
    const dateStr = `${monthKey}-01`

    const toAdd: Transaction[] = recurringTemplates
      .filter((tmpl) => tmpl.isActive && !existingIds.has(tmpl.id))
      .filter((tmpl) => {
        if (tmpl.endMonth && tmpl.endMonth < monthKey) return false
        if (tmpl.startMonth > monthKey) return false
        return true
      })
      .map((tmpl) => {
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
      set((s) => ({ transactions: [...s.transactions, ...toAdd] }))
      const uid = getUserId()
      if (uid) syncRemote(() => bulkUpsertTransactions(uid, toAdd))
    }
    return toAdd.length
  },

  // ── Investment actions ──────────────────────────────────────────────────

  addInvestment: (inv) => {

    const { appSettings } = get()
    const resolved = resolveMonthlyYieldPercent(
      inv.investmentType, inv.cdiPercent, inv.ipcaPercent,
      appSettings.cdiRateAnnual, appSettings.ipcaRateAnnual,
      inv.monthlyYieldPercent
    )
    const newInv: Investment = { ...inv, id: generateId(), monthlyYieldPercent: resolved }
    set((s) => ({ investments: [...s.investments, newInv] }))
    const uid = getUserId()
    if (uid) syncRemote(() => upsertInvestment(uid, newInv))
  },

  updateInvestment: (id, updates) => {

    const { appSettings } = get()
    set((s) => ({
      investments: s.investments.map((inv) => {
        if (inv.id !== id) return inv
        const merged = { ...inv, ...updates }
        const resolved = resolveMonthlyYieldPercent(
          merged.investmentType, merged.cdiPercent, merged.ipcaPercent,
          appSettings.cdiRateAnnual, appSettings.ipcaRateAnnual,
          merged.monthlyYieldPercent
        )
        return { ...merged, monthlyYieldPercent: resolved }
      }),
    }))
    const uid = getUserId()
    if (uid) {
      const updated = get().investments.find((inv) => inv.id === id)
      if (updated) syncRemote(() => upsertInvestment(uid, updated))
    }
  },

  deleteInvestment: (id) => {
    set((s) => ({ investments: s.investments.filter((inv) => inv.id !== id) }))
    syncRemote(() => deleteInvestmentRemote(id))
  },

  applyInvestmentYieldsToMonth: (monthKey) => {
    const { investments, transactions } = get()
    const dateStr = `${monthKey}-01`
    const existingInvIds = new Set(
      transactions
        .filter((t) => t.monthKey === monthKey && t.tags?.includes('investment-yield'))
        .map((t) => t.recurringId)
    )

    const toAdd: Transaction[] = investments
      .filter((inv) => inv.isActive && inv.startMonth <= monthKey && !existingInvIds.has(inv.id))
      .map((inv) => {
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
      set((s) => ({ transactions: [...s.transactions, ...toAdd] }))
      const uid = getUserId()
      if (uid) syncRemote(() => bulkUpsertTransactions(uid, toAdd))
    }
    return toAdd.length
  },

  // ── Month settings ──────────────────────────────────────────────────────

  getMonthSettings: (monthKey) => {
    const { monthSettings, appSettings } = get()
    return monthSettings[monthKey] ?? defaultMonthSettings(monthKey, appSettings)
  },

  updateMonthSettings: (monthKey, updates) => {
    const existing = get().getMonthSettings(monthKey)
    const updated = { ...existing, ...updates }
    set((s) => ({
      monthSettings: { ...s.monthSettings, [monthKey]: updated },
    }))
    const uid = getUserId()
    if (uid) syncRemote(() => upsertMonthSettingsRemote(uid, monthKey, updated))
  },

  toggleMonthClosed: (monthKey) => {
    const settings = get().getMonthSettings(monthKey)
    get().updateMonthSettings(monthKey, { isClosed: !settings.isClosed })
  },

  duplicatePreviousMonth: (monthKey) => {
    const { transactions } = get()
    const [year, month] = monthKey.split('-').map(Number)
    const prevYear = month === 1 ? year - 1 : year
    const prevMonth = month === 1 ? 12 : month - 1
    const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

    const existing = new Set(
      transactions.filter((t) => t.monthKey === monthKey).map((t) => `${t.section}:${t.description}`)
    )

    const toAdd: Transaction[] = transactions
      .filter((t) => t.monthKey === prevKey)
      .filter((t) => !existing.has(`${t.section}:${t.description}`))
      .map((t) => ({
        ...t,
        id: generateId(),
        monthKey,
        date: `${monthKey}-01`,
        createdAt: now(),
        updatedAt: now(),
      }))

    if (toAdd.length > 0) {
      set((s) => ({ transactions: [...s.transactions, ...toAdd] }))
      const uid = getUserId()
      if (uid) syncRemote(() => bulkUpsertTransactions(uid, toAdd))
    }
  },

  updateAppSettings: (updates) => {
    const newSettings = { ...get().appSettings, ...updates }
    set({ appSettings: newSettings })
    const uid = getUserId()
    if (uid) syncRemote(() => upsertUserSettings(uid, newSettings))

    // Recalculate CDI-based investments when rates change
    if (updates.cdiRateAnnual !== undefined || updates.ipcaRateAnnual !== undefined) {
  
      const { investments } = get()
      const recalculated = investments.map((inv) => {
        const type = inv.investmentType ?? 'manual'
        if (type === 'manual') return inv
        const newYield = resolveMonthlyYieldPercent(
          inv.investmentType, inv.cdiPercent, inv.ipcaPercent,
          newSettings.cdiRateAnnual, newSettings.ipcaRateAnnual,
          inv.monthlyYieldPercent
        )
        return { ...inv, monthlyYieldPercent: newYield }
      })
      set({ investments: recalculated })
      if (uid) {
        recalculated
          .filter((inv) => (inv.investmentType ?? 'manual') !== 'manual')
          .forEach((inv) => syncRemote(() => upsertInvestment(uid, inv)))
      }
    }
  },

  // Auto-apply recurring + investment yields when navigating to a new month
  setCurrentMonthKey: (key) => {
    set({ currentMonthKey: key })
    Promise.resolve().then(() => {
      get().applyRecurringToMonth(key)
      get().applyInvestmentYieldsToMonth(key)
    })
  },

  exportData: () => {
    const { transactions, recurringTemplates, extraordinaryEntries, investments, monthSettings, appSettings } = get()
    return JSON.stringify({
      version: 2,
      exportedAt: now(),
      transactions,
      recurringTemplates,
      extraordinaryEntries,
      investments,
      monthSettings,
      appSettings,
    }, null, 2)
  },

  importData: (json, merge = false) => {
    try {
      const data = JSON.parse(json)
      if (!data.transactions || !Array.isArray(data.transactions)) return false

      if (merge) {
        const { transactions: existingTxs, recurringTemplates: existingRecurring, extraordinaryEntries: existingExtra, investments: existingInv, monthSettings: existingMs } = get()
        
        const newTxs = data.transactions.filter((t: Transaction) => !existingTxs.some((e) => e.id === t.id))
        const newRecurring = (data.recurringTemplates ?? []).filter((r: RecurringTemplate) => !existingRecurring.some((e) => e.id === r.id))
        const newExtra = (data.extraordinaryEntries ?? []).filter((e: ExtraordinaryEntry) => !existingExtra.some((o) => o.id === e.id))
        const newInv = (data.investments ?? []).filter((i: Investment) => !existingInv.some((o) => o.id === i.id))
        
        const mergedSettings = { ...existingMs, ...(data.monthSettings ?? {}) }
        
        set({
          transactions: [...existingTxs, ...newTxs],
          recurringTemplates: [...existingRecurring, ...newRecurring],
          extraordinaryEntries: [...existingExtra, ...newExtra],
          investments: [...existingInv, ...newInv],
          monthSettings: mergedSettings,
        })
        
        const uid = getUserId()
        if (uid) {
          syncRemote(async () => {
            if (newTxs.length > 0) await bulkUpsertTransactions(uid, newTxs)
            for (const t of newRecurring) await upsertRecurringTemplate(uid, t as RecurringTemplate)
            for (const e of newExtra) await upsertExtraordinaryEntry(uid, e as ExtraordinaryEntry)
            for (const inv of newInv) await upsertInvestment(uid, inv as Investment)
            for (const [key, ms] of Object.entries(data.monthSettings ?? {})) {
              await upsertMonthSettingsRemote(uid, key, ms as MonthSettings)
            }
          })
        }
        return true
      }

      const imported = {
        transactions: data.transactions,
        recurringTemplates: data.recurringTemplates ?? [],
        extraordinaryEntries: data.extraordinaryEntries ?? [],
        investments: data.investments ?? [],
        monthSettings: data.monthSettings ?? {},
        appSettings: data.appSettings ?? DEFAULT_APP_SETTINGS,
      }
      set(imported)

      // Sync to Supabase
      const uid = getUserId()
      if (uid) {
        syncRemote(async () => {
          await deleteAllUserData(uid)
          await bulkUpsertTransactions(uid, imported.transactions)
          for (const t of imported.recurringTemplates) await upsertRecurringTemplate(uid, t as RecurringTemplate)
          for (const e of imported.extraordinaryEntries) await upsertExtraordinaryEntry(uid, e as ExtraordinaryEntry)
          for (const inv of imported.investments) await upsertInvestment(uid, inv as Investment)
          for (const [key, ms] of Object.entries(imported.monthSettings)) {
            await upsertMonthSettingsRemote(uid, key, ms as MonthSettings)
          }
          await upsertUserSettings(uid, imported.appSettings)
        })
      }
      return true
    } catch {
      return false
    }
  },

  migrateMonth: (fromMonthKey, toMonthKey) => {
    const { transactions, extraordinaryEntries } = get()
    const txToMigrate = transactions.filter((t) => t.monthKey === fromMonthKey)
    const extraToMigrate = extraordinaryEntries.filter((e) => e.monthKey === fromMonthKey)
    if (txToMigrate.length === 0 && extraToMigrate.length === 0) return 0

    const updatedTxs = transactions.map((t) =>
      t.monthKey === fromMonthKey
        ? { ...t, monthKey: toMonthKey, date: t.date.replace(fromMonthKey, toMonthKey), updatedAt: now() }
        : t
    )
    const updatedExtras = extraordinaryEntries.map((e) =>
      e.monthKey === fromMonthKey ? { ...e, monthKey: toMonthKey } : e
    )

    set({ transactions: updatedTxs, extraordinaryEntries: updatedExtras })

    const uid = getUserId()
    if (uid) {
      const migratedTxs = updatedTxs.filter((t) => t.monthKey === toMonthKey)
      syncRemote(() => bulkUpdateTransactions(uid, migratedTxs))
      const migratedExtras = updatedExtras.filter((e) => e.monthKey === toMonthKey)
      syncRemote(() => bulkUpdateExtraordinaryEntries(uid, migratedExtras))
    }

    return txToMigrate.length + extraToMigrate.length
  },

  clearAllData: () => {
    set({
      transactions: [],
      recurringTemplates: [],
      extraordinaryEntries: [],
      investments: [],
      monthSettings: {},
      appSettings: DEFAULT_APP_SETTINGS,
      currentMonthKey: getCurrentMonthKey(),
    })
    const uid = getUserId()
    if (uid) syncRemote(() => deleteAllUserData(uid))
  },

  getDescriptionSuggestions: (query, limit = 8) => {
    const { transactions } = get()
    const q = query.toLowerCase()
    const seen = new Set<string>()
    const results: string[] = []
    for (const t of transactions) {
      if (results.length >= limit) break
      if (!seen.has(t.description) && t.description.toLowerCase().includes(q)) {
        seen.add(t.description)
        results.push(t.description)
      }
    }
    return results
  },
}))
