import { useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuthStore } from '../store/useAuthStore'

/**
 * Subscribes to Supabase Realtime changes on finance tables.
 * When changes are detected, applies them directly to the Zustand store.
 */
export function useRealtimeSync() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return

    const tables = [
      'transactions',
      'recurring_templates',
      'extraordinary_entries',
      'investments',
      'user_settings',
    ]

    const channel = supabase.channel('finance-sync')

    tables.forEach((table) => {
      channel.on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!user?.id) return
          useFinanceStore.getState().applyRealtimeUpdate(
            payload.table,
            payload.eventType,
            payload.new,
            payload.old
          )
        }
      )
    })

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Realtime subscription failed. Database tables might not have Realtime enabled.')
        supabase.removeChannel(channel)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])
}
