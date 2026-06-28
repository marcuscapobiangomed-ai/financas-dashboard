import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Check whether the current Supabase session is active.
 * Attempts to silently refresh if missing or expired.
 */
export async function hasActiveSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return true
    return await tryRefreshSession()
  } catch {
    return false
  }
}

/**
 * Attempt to silently refresh an expired Supabase session.
 * Returns `true` if a valid session was obtained.
 */
export async function tryRefreshSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error || !session?.access_token) return false
    return true
  } catch {
    return false
  }
}

/**
 * Asserts that there is a valid session, attempting a refresh first.
 * Throws an error if no session can be recovered.
 */
export async function requireSession(): Promise<void> {
  const active = await hasActiveSession()
  if (active) return
  const refreshed = await tryRefreshSession()
  if (!refreshed) {
    throw new Error('Sessão expirada. Faça login novamente para sincronizar.')
  }
}
