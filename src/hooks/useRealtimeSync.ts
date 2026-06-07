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

/** Max consecutive retries before entering "long pause" mode (doesn't give up permanently). */
const MAX_FAST_RETRIES = 8
/** Base delay in ms for exponential backoff (doubles each attempt, capped at 30s). */
const BASE_DELAY_MS = 1_000
/** After MAX_FAST_RETRIES failures, pause this long before trying again (5 min). */
const LONG_PAUSE_MS = 5 * 60 * 1_000

/**
 * Subscribes to Supabase Realtime changes on finance tables.
 * When changes are detected, applies them directly to the Zustand store.
 *
 * Reconnection strategy:
 * - Fast retries: up to MAX_FAST_RETRIES attempts with exponential backoff (1s → 2s → ... → 128s)
 * - After fast retries exhausted: waits LONG_PAUSE_MS (5 minutes) then resets and tries again
 * - Never gives up permanently — recovers automatically when network returns
 */
export function useRealtimeSync() {
  const user = useAuthStore((s) => s.user)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!isSupabaseConfigured || !user?.id) return

    /** Create and subscribe to the Realtime channel. */
    async function connect() {
      if (!mountedRef.current) return

      // Clean up previous channel
      if (channelRef.current) {
        const oldChannel = channelRef.current
        channelRef.current = null
        try {
          await supabase.removeChannel(oldChannel)
        } catch (err) {
          console.error('[Realtime] Failed to remove old channel:', err)
        }
      }

      if (!mountedRef.current) return
      if (channelRef.current) return

      const channel = supabase.channel(`finance-sync-${user!.id}`)

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
        if (!mountedRef.current) return

        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0
          console.log('[Realtime] ✅ Conectado — escutando alterações em', TABLES.length, 'tabelas')
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

    /** Schedule a reconnection. Uses exponential backoff for fast retries,
     *  then a long pause before resetting and starting over. */
    function scheduleRetry() {
      if (!mountedRef.current) return

      let delay: number

      if (retryCountRef.current < MAX_FAST_RETRIES) {
        // Exponential backoff capped at 30s
        delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCountRef.current), 30_000)
        retryCountRef.current++
        console.warn(
          `[Realtime] Reconectando em ${(delay / 1000).toFixed(1)}s ` +
          `(tentativa ${retryCountRef.current}/${MAX_FAST_RETRIES})...`
        )
      } else {
        // Fast retries exhausted — long pause then reset counter
        delay = LONG_PAUSE_MS
        retryCountRef.current = 0
        console.warn(
          `[Realtime] Muitas falhas consecutivas. Aguardando ${LONG_PAUSE_MS / 60_000} minutos antes de tentar novamente...`
        )
      }

      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null
        if (mountedRef.current) connect()
      }, delay)
    }

    // Initial connection — also reconnect when browser goes back online
    const handleOnline = () => {
      if (!mountedRef.current) return
      console.log('[Realtime] Conexão restabelecida — reconectando...')
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      retryCountRef.current = 0
      connect()
    }

    window.addEventListener('online', handleOnline)
    connect()

    return () => {
      mountedRef.current = false
      window.removeEventListener('online', handleOnline)
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
