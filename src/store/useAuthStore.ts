import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fetchAllUserData, upsertUserSettings } from '../lib/supabaseData'
import { useFinanceStore } from './useFinanceStore'
import type { User, Session } from '@supabase/supabase-js'
import type { AppSettings } from '../types/budget'
import { DEFAULT_APP_SETTINGS } from '../constants/defaultBudget'

const LOCAL_STORAGE_KEY = 'financas-dashboard-store'

/** Try to read old zustand-persist data from localStorage */
function getLocalStorageData() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    console.log('[migration] localStorage raw exists:', !!raw, raw ? `(${raw.length} chars)` : '')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // zustand persist wraps state in { state: {...}, version: N }
    const state = parsed?.state ?? parsed
    console.log('[migration] parsed state keys:', Object.keys(state))
    console.log('[migration] transactions count:', state.transactions?.length ?? 'none')
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
async function migrateLocalData() {
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
    console.log(`[migration] Migrated ${local.transactions.length} transactions from localStorage to Supabase`)
  }
  return ok
}

function shouldMigrate(): boolean {
  const alreadyMigrated = localStorage.getItem(LOCAL_STORAGE_KEY + '-migrated') === 'true'
  const hasData = getLocalStorageData() !== null
  console.log('[migration] shouldMigrate check:', { alreadyMigrated, hasData })
  return !alreadyMigrated && hasData
}

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  migrated: boolean

  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, initialSettings?: Partial<AppSettings>) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  updatePassword: (newPassword: string) => Promise<{ error?: string }>
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,
  migrated: false,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false })
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user, session })
        // Load data from Supabase into finance store
        const data = await fetchAllUserData(session.user.id)
        const supabaseIsEmpty = data.transactions.length === 0
        console.log('[migration] initialize: supabaseIsEmpty=', supabaseIsEmpty, 'txCount=', data.transactions.length)

        if (supabaseIsEmpty && shouldMigrate()) {
          const ok = await migrateLocalData()
          console.log('[migration] initialize: migrateLocalData result=', ok)
          if (ok) set({ migrated: true })
        } else {
          useFinanceStore.getState().loadFromSupabase(data)
        }
        set({ loading: false })
      } else {
        set({ user: null, session: null, loading: false })
      }

      // Listen for auth changes (token refresh, logout from another tab, etc.)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          set({ user: null, session: null })
          useFinanceStore.getState().resetStore()
        } else if (session?.user && event === 'SIGNED_IN') {
          set({ user: session.user, session })
          const data = await fetchAllUserData(session.user.id)
          const supabaseIsEmpty = data.transactions.length === 0

          if (supabaseIsEmpty && shouldMigrate()) {
            const ok = await migrateLocalData()
            if (ok) set({ migrated: true })
          } else {
            useFinanceStore.getState().loadFromSupabase(data)
          }
        } else if (session) {
          set({ user: session.user, session })
        }
      })
    } catch {
      set({ loading: false })
    }
  },

  signIn: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
      return { error: error.message }
    }
    if (data.user) {
      set({ user: data.user, session: data.session })
      const storeData = await fetchAllUserData(data.user.id)
      const supabaseIsEmpty = storeData.transactions.length === 0

      if (supabaseIsEmpty && shouldMigrate()) {
        const ok = await migrateLocalData()
        if (ok) set({ migrated: true })
      } else {
        useFinanceStore.getState().loadFromSupabase(storeData)
      }
    }
    return {}
  },

  signUp: async (email, password, initialSettings) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      set({ error: error.message })
      return { error: error.message }
    }
    // If email confirmation is required, user will be null until confirmed
    if (data.user && data.session) {
      set({ user: data.user, session: data.session })
      
      // Initialize settings if user is logged in immediately
      if (initialSettings) {
        const fullSettings: AppSettings = {
          ...DEFAULT_APP_SETTINGS,
          ...initialSettings,
          hasSeenTutorial: true // Always skip tutorial for new users
        }
        await upsertUserSettings(data.user.id, fullSettings)
      }

      const storeData = await fetchAllUserData(data.user.id)
      const supabaseIsEmpty = storeData.transactions.length === 0

      if (supabaseIsEmpty && shouldMigrate()) {
        const ok = await migrateLocalData()
        if (ok) set({ migrated: true })
      } else {
        useFinanceStore.getState().loadFromSupabase(storeData)
      }
    }
    return {}
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, error: null, migrated: false })
    useFinanceStore.getState().resetStore()
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { error: error.message }
    return {}
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    return {}
  },
}))
