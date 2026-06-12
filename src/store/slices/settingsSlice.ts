import { AppSettings, MonthSettings } from '../../types/budget'
import { resolveMonthlyYieldPercent } from '../../utils/investmentCalc'
import { fetchBCBRates } from '../../lib/bcbApi'
import { getCurrentMonthKey } from '../../constants/months'
import { DEFAULT_APP_SETTINGS } from '../../constants/defaultBudget'
import {
  generateId,
  now,
  getUserId,
  syncRemote,
  defaultMonthSettings,
} from '../financeStoreHelpers'

interface DebouncedFunction<T extends (...args: any[]) => void> {
  (...args: Parameters<T>): void
  flush: () => void
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
      lastArgs = null
    }, delay)
  }

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId)
      fn(...lastArgs)
      timeoutId = null
      lastArgs = null
    }
  }

  return debounced
}

const debouncedMonthSettingsSyncs: Record<string, DebouncedFunction<(uid: string, key: string, settings: MonthSettings) => void>> = {}

function getDebouncedMonthSettingsSync(monthKey: string) {
  if (!debouncedMonthSettingsSyncs[monthKey]) {
    debouncedMonthSettingsSyncs[monthKey] = debounce((uid: string, key: string, settings: MonthSettings) => {
      syncRemote('upsertMonthSettings', uid, key, settings)
    }, 800)
  }
  return debouncedMonthSettingsSyncs[monthKey]
}

const debouncedUserSettingsSync = debounce((uid: string, settings: AppSettings) => {
  syncRemote('upsertUserSettings', uid, settings)
}, 800)

const debouncedInvestmentsSync = debounce((uid: string, recalculatedInvestments: any[]) => {
  syncRemote('bulkUpsertInvestments', uid, recalculatedInvestments)
}, 800)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    debouncedUserSettingsSync.flush()
    debouncedInvestmentsSync.flush()
    for (const syncFn of Object.values(debouncedMonthSettingsSyncs)) {
      syncFn.flush()
    }
  })
}

export interface SettingsSlice {
  monthSettings: Record<string, MonthSettings>
  appSettings: AppSettings
  currentMonthKey: string
  ratesFetching: boolean

  getMonthSettings: (monthKey: string) => MonthSettings
  updateMonthSettings: (monthKey: string, updates: Partial<MonthSettings>) => void
  toggleMonthClosed: (monthKey: string) => void
  duplicatePreviousMonth: (monthKey: string) => void
  updateAppSettings: (updates: Partial<AppSettings>) => void
  setCurrentMonthKey: (key: string) => void
  fetchLatestRates: () => Promise<{ cdi?: number; ipca?: number; selic?: number } | null>
}

export const createSettingsSlice = (set: any, get: any): SettingsSlice => ({
  monthSettings: {},
  appSettings: DEFAULT_APP_SETTINGS,
  currentMonthKey: getCurrentMonthKey(),
  ratesFetching: false,

  getMonthSettings: (monthKey) => {
    const { monthSettings, appSettings } = get()
    return monthSettings[monthKey] ?? defaultMonthSettings(monthKey, appSettings)
  },

  updateMonthSettings: (monthKey, updates) => {
    const existing = get().getMonthSettings(monthKey)
    const updated = { ...existing, ...updates }
    set((s: any) => ({
      monthSettings: { ...s.monthSettings, [monthKey]: updated },
    }))
    const uid = getUserId()
    if (uid) {
      getDebouncedMonthSettingsSync(monthKey)(uid, monthKey, updated)
    }
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
      transactions.filter((t: any) => t.monthKey === monthKey).map((t: any) => `${t.section}:${t.description}`)
    )

    const toAdd = transactions
      .filter((t: any) => t.monthKey === prevKey)
      .filter((t: any) => !existing.has(`${t.section}:${t.description}`))
      .map((t: any) => ({
        ...t,
        id: generateId(),
        monthKey,
        date: `${monthKey}-01`,
        createdAt: now(),
        updatedAt: now(),
      }))

    if (toAdd.length > 0) {
      set((s: any) => ({ transactions: [...s.transactions, ...toAdd] }))
      const uid = getUserId()
      if (uid) syncRemote('bulkUpsertTransactions', uid, toAdd)
    }
  },

  updateAppSettings: (updates) => {
    const newSettings = { ...get().appSettings, ...updates }
    set({ appSettings: newSettings })
    const uid = getUserId()
    if (uid) {
      debouncedUserSettingsSync(uid, newSettings)
    }

    if (updates.cdiRateAnnual !== undefined || updates.ipcaRateAnnual !== undefined) {
      const { investments } = get()
      const recalculated = investments.map((inv: any) => {
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
        const toSync = recalculated.filter((inv: any) => (inv.investmentType ?? 'manual') !== 'manual')
        if (toSync.length > 0) {
          debouncedInvestmentsSync(uid, toSync)
        }
      }
    }
  },

  setCurrentMonthKey: (key) => {
    set({ currentMonthKey: key })
    Promise.resolve().then(() => {
      get().applyRecurringToMonth(key)
      get().applyInvestmentYieldsToMonth(key)
    })
  },

  fetchLatestRates: async () => {
    set({ ratesFetching: true })
    try {
      const rates = await fetchBCBRates()
      const updates: Partial<AppSettings> = {}
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
})
