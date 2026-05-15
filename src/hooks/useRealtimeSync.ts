import { useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuthStore } from '../store/useAuthStore'
import type { RealtimeChannel } from '@supabase/supabase-js'

const TABLES = [
  'transactions',
  'recurring_templates',
  'extraordinary_entries',
  'investments',
  'month_settings',
  'user_settings',
] as const

/** Maximum number of reconnect attempts before giving up. */
const MAX_RETRIES = 8
/** Base delay in ms for exponential backoff (doubles each attempt). */
const BASE_DELAY_MS = 1_000

/**
 * Subscribes to Supabase Realtime changes on finance tables.
 * When changes are detected, applies them directly to the Zustand store.
 *
 * Includes exponential-backoff reconnection so that temporary network
 * interruptions don't permanently break Realtime.
 */
export function useRealtimeSync() {
  const user = useAuthStore((s) => s.user)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return

    /** Create and subscribe to the Realtime channel. */
    function connect() {
      // Clean up previous channel if it exists
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const channel = supabase.channel('finance-sync')

      TABLES.forEach((table) => {
        channel.on(
          'postgres_changes' as const,
          {
            event: '*',
            schema: 'public',
            table,
            filter: `user_id=eq.${user!.id}`,
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
        if (status === 'SUBSCRIBED') {
          // Successfully connected — reset retry counter
          retryCountRef.current = 0
          console.log('[Realtime] Conectado — escutando alterações em', TABLES.length, 'tabelas')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Erro no canal:', status)
          supabase.removeChannel(channel)
          channelRef.current = null
          scheduleRetry()
        } else if (status === 'CLOSED') {
          channelRef.current = null
        }
      })

      channelRef.current = channel
    }

    /** Schedule a reconnection with exponential backoff. */
    function scheduleRetry() {
      if (retryCountRef.current >= MAX_RETRIES) {
        console.error(
          `[Realtime] Máximo de tentativas (${MAX_RETRIES}) atingido. ` +
          'Realtime desativado até recarregar a página.'
        )
        return
      }

      const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current)
      retryCountRef.current++

      console.log(
        `[Realtime] Reconectando em ${(delay / 1000).toFixed(1)}s ` +
        `(tentativa ${retryCountRef.current}/${MAX_RETRIES})...`
      )

      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null
        connect()
      }, delay)
    }

    // Initial connection
    connect()

    return () => {
      // Cleanup on unmount or user change
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      retryCountRef.current = 0
    }
  }, [user?.id]) // depend on user.id only to avoid re-subscribing on unrelated user obj changes
}
