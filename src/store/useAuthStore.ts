import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { fetchAllUserData } from '../lib/supabaseData'
import { useFinanceStore } from './useFinanceStore'
import type { User, Session } from '@supabase/supabase-js'

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null

  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user, session, loading: false })
        // Load data from Supabase into finance store
        const data = await fetchAllUserData(session.user.id)
        useFinanceStore.getState().loadFromSupabase(data)
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
          useFinanceStore.getState().loadFromSupabase(data)
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
      useFinanceStore.getState().loadFromSupabase(storeData)
    }
    return {}
  },

  signUp: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      set({ error: error.message })
      return { error: error.message }
    }
    // If email confirmation is required, user will be null until confirmed
    if (data.user && data.session) {
      set({ user: data.user, session: data.session })
      const storeData = await fetchAllUserData(data.user.id)
      useFinanceStore.getState().loadFromSupabase(storeData)
    }
    return {}
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, error: null })
    useFinanceStore.getState().resetStore()
  },
}))
