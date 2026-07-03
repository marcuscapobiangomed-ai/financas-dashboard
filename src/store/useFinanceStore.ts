import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TransactionSlice, createTransactionSlice } from './slices/transactionSlice'
import { RecurringSlice, createRecurringSlice } from './slices/recurringSlice'
import { InvestmentSlice, createInvestmentSlice } from './slices/investmentSlice'
import { SettingsSlice, createSettingsSlice } from './slices/settingsSlice'
import { SyncSlice, createSyncSlice } from './slices/syncSlice'
import { DataManagementSlice, createDataManagementSlice } from './slices/dataManagementSlice'
import { ExtraordinarySlice, createExtraordinarySlice } from './slices/extraordinarySlice'

export interface FinanceStore
  extends TransactionSlice,
    RecurringSlice,
    InvestmentSlice,
    SettingsSlice,
    SyncSlice,
    DataManagementSlice,
    ExtraordinarySlice {
  // Autocomplete suggestions for description
  getDescriptionSuggestions: (query: string, limit?: number) => string[]
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...createTransactionSlice(set, get),
      ...createRecurringSlice(set, get),
      ...createInvestmentSlice(set, get),
      ...createSettingsSlice(set, get),
      ...createSyncSlice(set, get),
      ...createDataManagementSlice(set, get),
      ...createExtraordinarySlice(set, get),

      getDescriptionSuggestions: (() => {
        let lastTransactions: any[] = []
        let uniqueDescriptions: string[] = []

        return (query: string, limit = 8) => {
          const { transactions } = get()
          if (transactions !== lastTransactions) {
            lastTransactions = transactions
            const seen = new Set<string>()
            uniqueDescriptions = []
            for (let i = transactions.length - 1; i >= 0; i--) {
              const desc = transactions[i].description
              if (desc && !seen.has(desc)) {
                seen.add(desc)
                uniqueDescriptions.push(desc)
              }
            }
          }

          const q = query.toLowerCase()
          const results: string[] = []
          for (const desc of uniqueDescriptions) {
            if (results.length >= limit) break
            if (desc.toLowerCase().includes(q)) {
              results.push(desc)
            }
          }
          return results
        }
      })(),
    }),
    {
      name: 'financas-offline-queue',
      // Keep local finance data available across reloads, even before remote sync finishes.
      partialize: (state) => ({
        transactions: state.transactions,
        recurringTemplates: state.recurringTemplates,
        extraordinaryEntries: state.extraordinaryEntries,
        investments: state.investments,
        monthSettings: state.monthSettings,
        appSettings: state.appSettings,
        currentMonthKey: state.currentMonthKey,
        syncQueue: state.syncQueue,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
)

// Register the store in the sync engine to prevent circular dependencies
import { registerStore } from '../sync'
registerStore(useFinanceStore)
