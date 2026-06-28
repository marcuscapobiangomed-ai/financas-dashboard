import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

// A chave deve ser um JWT válido (começa com "eyJ").
// Chaves no formato "sb_publishable_..." são Publishable Keys da nova API do Supabase
// e NÃO são aceitas pelo SDK @supabase/supabase-js — use a "anon public" key do painel.
const isValidJwt = supabaseAnonKey.startsWith('eyJ')

export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  isValidJwt
)

if (!isSupabaseConfigured) {
  if (supabaseUrl && supabaseAnonKey && !isValidJwt) {
    console.error(
      '[Supabase] ❌ Chave inválida detectada! ' +
      'A VITE_SUPABASE_ANON_KEY parece ser uma "Publishable Key" (sb_publishable_...) e não funcionará. ' +
      'Acesse o painel do Supabase → Project Settings → API e copie a chave "anon public" (começa com eyJ...).'
    )
  } else {
    console.warn(
      '[Supabase] Variáveis de ambiente não configuradas. ' +
      'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local'
    )
  }
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder', {
      auth: { persistSession: false, autoRefreshToken: false },
    })

// Import session utilities from the modular sync module to avoid duplication
import {
  hasActiveSession as _hasActiveSession,
  tryRefreshSession as _tryRefreshSession
} from '../sync/session'

export const hasActiveSession = _hasActiveSession
export const tryRefreshSession = _tryRefreshSession

