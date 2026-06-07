import { Transaction, RecurringTemplate, ExtraordinaryEntry } from '../../types/transaction'
import { AppSettings, MonthSettings } from '../../types/budget'
import { StoreSnapshot } from '../../lib/supabaseData'
import { Investment } from '../../types/investment'
import { DEFAULT_APP_SETTINGS } from '../../constants/defaultBudget'
import { getCurrentMonthKey } from '../../constants/months'
import {
  getUserId,
  now,
  syncRemote,
} from '../financeStoreHelpers'
import * as db from '../../lib/supabaseData'
import { z } from 'zod'
import { Category } from '../../types/category'

const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['income', 'expense']),
  section: z.string(),
  description: z.string(),
  amount: z.number(),
  category: z.nativeEnum(Category),
  date: z.string(),
  monthKey: z.string(),
  isRecurring: z.boolean().optional(),
  recurringId: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  installmentGroupId: z.string().optional(),
  installmentCurrent: z.number().optional(),
  installmentTotal: z.number().optional(),
  createdAt: z.string().default(() => now()),
  updatedAt: z.string().default(() => now()),
})

const RecurringTemplateSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  category: z.nativeEnum(Category),
  section: z.string(),
  isActive: z.boolean(),
  startMonth: z.string(),
  endMonth: z.string().optional(),
  installmentTotal: z.number().optional(),
})

const ExtraordinaryEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['ferias', 'plr', 'decimo_terceiro', 'bonus', 'outro']),
  grossAmount: z.number(),
  tithePercent: z.number(),
  offeringPercent: z.number(),
  tithe: z.number(),
  offering: z.number(),
  netAmount: z.number(),
  monthKey: z.string(),
  description: z.string().optional(),
})

const InvestmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  principal: z.number(),
  monthlyYieldPercent: z.number(),
  startMonth: z.string(),
  isActive: z.boolean(),
  notes: z.string().optional(),
  investmentType: z.enum([
    'cdb', 'lci', 'lca', 'tesouro_selic', 'tesouro_ipca',
    'poupanca', 'fundo', 'acoes', 'fiis', 'manual'
  ]).optional(),
  cdiPercent: z.number().optional(),
  ipcaPercent: z.number().optional(),
  ticker: z.string().optional(),
  shares: z.number().optional(),
  averagePrice: z.number().optional(),
})

const CardSectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  closingDay: z.number(),
  dueDay: z.number(),
})

const AppSettingsSchema = z.object({
  defaultSectionLimits: z.record(z.string(), z.number()).optional(),
  defaultTithePercent: z.number().optional(),
  defaultOfferingPercent: z.number().optional(),
  defaultSavingsGoalPercent: z.number().optional(),
  darkMode: z.boolean().optional(),
  alertThresholdPercent: z.number().optional(),
  cardSections: z.array(CardSectionSchema).optional(),
  initialBalance: z.number().optional(),
  cdiRateAnnual: z.number().optional(),
  ipcaRateAnnual: z.number().optional(),
  ratesLastUpdated: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  hasSeenTutorial: z.boolean().optional(),
})

const MonthSettingsSchema = z.object({
  monthKey: z.string(),
  isClosed: z.boolean(),
  notes: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  lessons: z.string().optional(),
  sectionLimits: z.record(z.string(), z.number()),
  tithePercent: z.number(),
  offeringPercent: z.number(),
  savingsGoal: z.number().optional(),
  copiedFromMonths: z.array(z.string()).optional(),
  closedAt: z.string().optional(),
  closedBy: z.string().optional(),
  openedAt: z.string().optional(),
})

const ImportSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  transactions: z.array(TransactionSchema),
  recurringTemplates: z.array(RecurringTemplateSchema).optional(),
  extraordinaryEntries: z.array(ExtraordinaryEntrySchema).optional(),
  investments: z.array(InvestmentSchema).optional(),
  monthSettings: z.record(z.string(), MonthSettingsSchema).optional(),
  appSettings: AppSettingsSchema.optional(),
})

export interface DataManagementSlice {
  loadFromSupabase: (data: StoreSnapshot) => void
  resetStore: () => void
  exportData: () => string
  importData: (json: string, merge?: boolean) => boolean
  migrateMonth: (fromMonthKey: string, toMonthKey: string) => number
  clearAllData: () => void
}

export const createDataManagementSlice = (set: any, get: any): DataManagementSlice => ({
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
      const parsedJson = JSON.parse(json)
      const parseResult = ImportSchema.safeParse(parsedJson)
      if (!parseResult.success) {
        console.error('[Import] Schema validation failed:', parseResult.error)
        return false
      }
      const data = parseResult.data

      if (merge) {
        const { transactions: existingTxs, recurringTemplates: existingRecurring, extraordinaryEntries: existingExtra, investments: existingInv, monthSettings: existingMs } = get()
        
        const newTxs = data.transactions.filter((t: Transaction) => !existingTxs.some((e: any) => e.id === t.id))
        const newRecurring = (data.recurringTemplates ?? []).filter((r: RecurringTemplate) => !existingRecurring.some((e: any) => e.id === r.id))
        const newExtra = (data.extraordinaryEntries ?? []).filter((e: ExtraordinaryEntry) => !existingExtra.some((o: any) => o.id === e.id))
        const newInv = (data.investments ?? []).filter((i: Investment) => !existingInv.some((o: any) => o.id === i.id))
        
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
            if (newTxs.length > 0) await db.bulkUpsertTransactions(uid, newTxs)
            for (const t of newRecurring) await db.upsertRecurringTemplate(uid, t as RecurringTemplate)
            for (const e of newExtra) await db.upsertExtraordinaryEntry(uid, e as ExtraordinaryEntry)
            for (const inv of newInv) await db.upsertInvestment(uid, inv as Investment)
            for (const [key, ms] of Object.entries(data.monthSettings ?? {})) {
              await db.upsertMonthSettings(uid, key, ms as MonthSettings)
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
        appSettings: (data.appSettings ? { ...DEFAULT_APP_SETTINGS, ...data.appSettings } : DEFAULT_APP_SETTINGS) as AppSettings,
      }
      set(imported)

      const uid = getUserId()
      if (uid) {
        syncRemote(async () => {
          await db.deleteAllUserData(uid)
          await db.bulkUpsertTransactions(uid, imported.transactions)
          for (const t of imported.recurringTemplates) await db.upsertRecurringTemplate(uid, t as RecurringTemplate)
          for (const e of imported.extraordinaryEntries) await db.upsertExtraordinaryEntry(uid, e as ExtraordinaryEntry)
          for (const inv of imported.investments) await db.upsertInvestment(uid, inv as Investment)
          for (const [key, ms] of Object.entries(imported.monthSettings)) {
            await db.upsertMonthSettings(uid, key, ms as MonthSettings)
          }
          await db.upsertUserSettings(uid, imported.appSettings)
        })
      }
      return true
    } catch {
      return false
    }
  },

  migrateMonth: (fromMonthKey, toMonthKey) => {
    const { transactions, extraordinaryEntries } = get()
    const txToMigrate = transactions.filter((t: any) => t.monthKey === fromMonthKey)
    const extraToMigrate = extraordinaryEntries.filter((e: any) => e.monthKey === fromMonthKey)
    if (txToMigrate.length === 0 && extraToMigrate.length === 0) return 0

    const updatedTxs = transactions.map((t: any) => {
      if (t.monthKey !== fromMonthKey) return t
      const parts = t.date.split('-')
      const day = parts.length === 3 ? parts[2] : '01'
      const newDate = `${toMonthKey}-${day.padStart(2, '0')}`
      return { ...t, monthKey: toMonthKey, date: newDate, updatedAt: now() }
    })
    const updatedExtras = extraordinaryEntries.map((e: any) =>
      e.monthKey === fromMonthKey ? { ...e, monthKey: toMonthKey } : e
    )

    set({ transactions: updatedTxs, extraordinaryEntries: updatedExtras })

    const uid = getUserId()
    if (uid) {
      const migratedTxs = updatedTxs.filter((t: any) => t.monthKey === toMonthKey)
      syncRemote('bulkUpdateTransactions', uid, migratedTxs)
      const migratedExtras = updatedExtras.filter((e: any) => e.monthKey === toMonthKey)
      syncRemote('bulkUpdateExtraordinaryEntries', uid, migratedExtras)
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
    if (uid) syncRemote('deleteAllUserData', uid)
  },
})
