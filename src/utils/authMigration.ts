import { useFinanceStore } from '../store/useFinanceStore'

const LOCAL_STORAGE_KEY = 'financas-dashboard-store'

/** Try to read old zustand-persist data from localStorage */
export function getLocalStorageData() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (import.meta.env.DEV) console.log('[migration] localStorage raw exists:', !!raw, raw ? `(${raw.length} chars)` : '')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // zustand persist wraps state in { state: {...}, version: N }
    const state = parsed?.state ?? parsed
    if (import.meta.env.DEV) console.log('[migration] parsed state keys:', Object.keys(state))
    if (import.meta.env.DEV) console.log('[migration] transactions count:', state.transactions?.length ?? 'none')
    if (!state.transactions || !Array.isArray(state.transactions) || state.transactions.length === 0) {
      return null
    }
    return state
  } catch (e) {
    console.error('[migration] Failed to parse localStorage:', e)
    return null
  }
}

/** Migrate localStorage data into the finance store and sync to Supabase */
export async function migrateLocalData() {
  const local = getLocalStorageData()
  if (!local) return false

  const store = useFinanceStore.getState()
  // Use the existing importData mechanism by converting to JSON
  const json = JSON.stringify({
    version: 2,
    transactions: local.transactions ?? [],
    recurringTemplates: local.recurringTemplates ?? [],
    extraordinaryEntries: local.extraordinaryEntries ?? [],
    investments: local.investments ?? [],
    monthSettings: local.monthSettings ?? {},
    appSettings: local.appSettings ?? undefined,
  })
  const ok = store.importData(json)
  if (ok) {
    // Mark migration as done so we don't re-import
    localStorage.setItem(LOCAL_STORAGE_KEY + '-migrated', 'true')
    if (import.meta.env.DEV) console.log(`[migration] Migrated ${local.transactions.length} transactions from localStorage to Supabase`)
  }
  return ok
}

export function shouldMigrate(): boolean {
  const alreadyMigrated = localStorage.getItem(LOCAL_STORAGE_KEY + '-migrated') === 'true'
  const hasData = getLocalStorageData() !== null
  if (import.meta.env.DEV) console.log('[migration] shouldMigrate check:', { alreadyMigrated, hasData })
  return !alreadyMigrated && hasData
}
