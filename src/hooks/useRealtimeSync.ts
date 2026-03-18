import { useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fetchAllUserData } from '../lib/supabaseData'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuthStore } from '../store/useAuthStore'

const DEBOUNCE_MS = 3000 // Don't reload more than once every 3s

/**
 * Subscribes to Supabase Realtime changes on finance tables.
 * When changes are detected (from another device), reloads all data.
 */
export function useRealtimeSync() {
  const user = useAuthStore((s) => s.user)
  const loadFromSupabase = useFinanceStore((s) => s.loadFromSupabase)
  const lastReloadRef = useRef(0)

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return

    const tables = [
      'transactions',
      'recurring_templates',
      'extraordinary_entries',
      'investments',
      'user_settings',
    ]

    function handleChange() {
      const now = Date.now()
      if (now - lastReloadRef.current < DEBOUNCE_MS) return
      lastReloadRef.current = now

      // Reload all data from Supabase
      fetchAllUserData(user!.id).then((data) => {
        if (data) loadFromSupabase(data)
      }).catch((err) => {
        console.error('[realtime] Failed to reload data:', err)
      })
    }

    const channel = supabase
      .channel('finance-sync')

    tables.forEach((table) => {
      channel.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          filter: table === 'user_settings'
            ? `user_id=eq.${user.id}`
            : `user_id=eq.${user.id}`,
        },
        handleChange
      )
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, loadFromSupabase])
}
