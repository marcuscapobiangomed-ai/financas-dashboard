import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co')

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Variáveis de ambiente não configuradas. ' +
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local'
  )
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

/** Check whether the current Supabase session is active. */
export async function hasActiveSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session?.access_token
  } catch {
    return false
  }
}
