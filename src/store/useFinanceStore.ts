import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Transaction, RecurringTemplate, ExtraordinaryEntry } from '../types/transaction'
import { AppSettings, MonthSettings } from '../types/budget'
import { DEFAULT_APP_SETTINGS, DEFAULT_SECTION_LIMITS } from '../constants/defaultBudget'
import { getCurrentMonthKey } from '../constants/months'

interface FinanceStore {
  // Raw data
  transactions: Transaction[]
  recurringTemplates: RecurringTemplate[]
  extraordinaryEntries: ExtraordinaryEntry[]
  monthSettings: Record<string, MonthSettings>  // key: monthKey
  appSettings: AppSettings

  // UI state (not persisted)
  currentMonthKey: string

  // Transaction actions
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  getTransactionsForMonth: (monthKey: string) => Transaction[]

  // Extraordinary actions
  addExtraordinary: (e: Omit<ExtraordinaryEntry, 'id'>) => void
  updateExtraordinary: (id: string, updates: Partial<ExtraordinaryEntry>) => void
  deleteExtraordinary: (id: string) => void
  getExtraordinaryForMonth: (monthKey: string) => ExtraordinaryEntry[]

  // Recurring template actions
  addRecurringTemplate: (t: Omit<RecurringTemplate, 'id'>) => void
  updateRecurringTemplate: (id: string, updates: Partial<RecurringTemplate>) => void
  deleteRecurringTemplate: (id: string) => void
  applyRecurringToMonth: (monthKey: string) => void

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
  importData: (json: string) => boolean
  clearAllData: () => void
  migrateMonth: (fromMonthKey: string, toMonthKey: string) => number

  // Description autocomplete
  getDescriptionSuggestions: (query: string, limit?: number) => string[]
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

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      recurringTemplates: [],
      extraordinaryEntries: [],
      monthSettings: {},
      appSettings: DEFAULT_APP_SETTINGS,
      currentMonthKey: getCurrentMonthKey(),

      addTransaction: (t) => {
        const newT: Transaction = {
          ...t,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        }
        set((s) => ({ transactions: [...s.transactions, newT] }))
      },

      updateTransaction: (id, updates) => {
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: now() } : t
          ),
        }))
      },

      deleteTransaction: (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
      },

      getTransactionsForMonth: (monthKey) => {
        return get().transactions.filter((t) => t.monthKey === monthKey)
      },

      addExtraordinary: (e) => {
        const entry: ExtraordinaryEntry = { ...e, id: generateId() }
        set((s) => ({ extraordinaryEntries: [...s.extraordinaryEntries, entry] }))
      },

      updateExtraordinary: (id, updates) => {
        set((s) => ({
          extraordinaryEntries: s.extraordinaryEntries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }))
      },

      deleteExtraordinary: (id) => {
        set((s) => ({ extraordinaryEntries: s.extraordinaryEntries.filter((e) => e.id !== id) }))
      },

      getExtraordinaryForMonth: (monthKey) => {
        return get().extraordinaryEntries.filter((e) => e.monthKey === monthKey)
      },

      addRecurringTemplate: (t) => {
        const template: RecurringTemplate = { ...t, id: generateId() }
        set((s) => ({ recurringTemplates: [...s.recurringTemplates, template] }))
      },

      updateRecurringTemplate: (id, updates) => {
        set((s) => ({
          recurringTemplates: s.recurringTemplates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }))
      },

      deleteRecurringTemplate: (id) => {
        set((s) => ({ recurringTemplates: s.recurringTemplates.filter((t) => t.id !== id) }))
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
        }
      },

      getMonthSettings: (monthKey) => {
        const { monthSettings, appSettings } = get()
        return monthSettings[monthKey] ?? defaultMonthSettings(monthKey, appSettings)
      },

      updateMonthSettings: (monthKey, updates) => {
        const existing = get().getMonthSettings(monthKey)
        set((s) => ({
          monthSettings: {
            ...s.monthSettings,
            [monthKey]: { ...existing, ...updates },
          },
        }))
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
          transactions
            .filter((t) => t.monthKey === monthKey)
            .map((t) => `${t.section}:${t.description}`)
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
        }
      },

      updateAppSettings: (updates) => {
        set((s) => ({ appSettings: { ...s.appSettings, ...updates } }))
      },

      setCurrentMonthKey: (key) => {
        set({ currentMonthKey: key })
      },

      exportData: () => {
        const { transactions, recurringTemplates, extraordinaryEntries, monthSettings, appSettings } = get()
        return JSON.stringify({
          version: 1,
          exportedAt: now(),
          transactions,
          recurringTemplates,
          extraordinaryEntries,
          monthSettings,
          appSettings,
        }, null, 2)
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json)
          if (!data.transactions || !Array.isArray(data.transactions)) return false
          set({
            transactions: data.transactions,
            recurringTemplates: data.recurringTemplates ?? [],
            extraordinaryEntries: data.extraordinaryEntries ?? [],
            monthSettings: data.monthSettings ?? {},
            appSettings: data.appSettings ?? DEFAULT_APP_SETTINGS,
          })
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

        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.monthKey === fromMonthKey
              ? { ...t, monthKey: toMonthKey, date: t.date.replace(fromMonthKey, toMonthKey), updatedAt: now() }
              : t
          ),
          extraordinaryEntries: s.extraordinaryEntries.map((e) =>
            e.monthKey === fromMonthKey ? { ...e, monthKey: toMonthKey } : e
          ),
        }))
        return txToMigrate.length + extraToMigrate.length
      },

      clearAllData: () => {
        set({
          transactions: [],
          recurringTemplates: [],
          extraordinaryEntries: [],
          monthSettings: {},
          appSettings: DEFAULT_APP_SETTINGS,
          currentMonthKey: getCurrentMonthKey(),
        })
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
    }),
    {
      name: 'financas-dashboard-store',
      partialize: (state) => ({
        transactions: state.transactions,
        recurringTemplates: state.recurringTemplates,
        extraordinaryEntries: state.extraordinaryEntries,
        monthSettings: state.monthSettings,
        appSettings: state.appSettings,
        currentMonthKey: state.currentMonthKey,
      }),
    }
  )
)
