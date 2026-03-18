import { supabase, isSupabaseConfigured } from './supabase'

export interface BCBRateEntry {
  value: number
  date: string  // DD/MM/YYYY from BCB
}

export interface BCBRates {
  cdi: BCBRateEntry | null
  ipca: BCBRateEntry | null
  selic: BCBRateEntry | null
}

/**
 * Fetch latest CDI, IPCA, and Selic rates from BCB via Edge Function.
 * Returns null values for any rate that failed to fetch.
 */
export async function fetchBCBRates(): Promise<BCBRates> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado')
  }

  const { data, error } = await supabase.functions.invoke('fetch-bcb-rates')

  if (error) throw new Error(error.message ?? 'Erro ao buscar taxas do BCB')
  return data as BCBRates
}
