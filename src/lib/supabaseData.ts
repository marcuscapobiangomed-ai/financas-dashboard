import { supabase } from './supabase'
import type { Transaction, RecurringTemplate, ExtraordinaryEntry } from '../types/transaction'
import type { AppSettings, MonthSettings } from '../types/budget'
import type { Investment } from '../types/investment'
import { DEFAULT_APP_SETTINGS } from '../constants/defaultBudget'
import { toSnake, toCamel, toModel, rowsToModels, requireSession, sanitizeMonthSettings, parseUserSettingsRow } from './supabaseSchema'

export { toModel, sanitizeMonthSettings, parseUserSettingsRow }

/**
 * Executes an upsert operation with auto-recovery for missing schema columns.
 * If Supabase returns a PGRST204/PGRST205/schema cache error indicating that a column doesn't exist,
 * it dynamically strips that column from the payload and retries the operation.
 */
async function safeUpsert(table: string, row: Record<string, any>, onConflict: string): Promise<void> {
  let attempt = 0
  const maxAttempts = 10
  const rowCopy = { ...row }
  
  while (attempt < maxAttempts) {
    const { error } = await supabase.from(table).upsert(rowCopy, { onConflict })
    if (!error) return

    // Check for missing column error in the schema cache
    // Message pattern: "Could not find the '...' column of '...' in the schema cache"
    if (error.message && error.message.includes("Could not find the '")) {
      const match = error.message.match(/Could not find the '([^']+)' column/)
      if (match && match[1]) {
        const missingColumn = match[1]
        console.warn(`[Supabase] Coluna '${missingColumn}' ausente na tabela '${table}'. Removendo do payload e tentando novamente.`, error)
        delete rowCopy[missingColumn]
        attempt++
        continue
      }
    }
    throw error
  }
}

// ── Transactions ───────────────────────────────────────────────────────────
export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId)
  if (error) throw error; return rowsToModels<Transaction>(data ?? [])
}

export async function upsertTransaction(userId: string, t: Transaction): Promise<void> {
  await requireSession()
  const { confidence, ...cleanT } = t as any
  await safeUpsert('transactions', { ...toSnake(cleanT), user_id: userId }, 'id')
}

export async function bulkUpsertTransactions(userId: string, txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return; await requireSession()
  const rows = txs.map((t) => {
    const { confidence, ...cleanT } = t as any
    return { ...toSnake(cleanT), user_id: userId }
  })
  const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteTransactionRemote(id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// ── Recurring Templates ────────────────────────────────────────────────────
export async function fetchRecurringTemplates(userId: string): Promise<RecurringTemplate[]> {
  const { data, error } = await supabase.from('recurring_templates').select('*').eq('user_id', userId)
  if (error) throw error; return rowsToModels<RecurringTemplate>(data ?? [])
}

export async function upsertRecurringTemplate(userId: string, t: RecurringTemplate): Promise<void> {
  await requireSession()
  await safeUpsert('recurring_templates', { ...toSnake(t as any), user_id: userId }, 'id')
}

export async function deleteRecurringTemplateRemote(id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase.from('recurring_templates').delete().eq('id', id)
  if (error) throw error
}

// ── Extraordinary Entries ──────────────────────────────────────────────────
export async function fetchExtraordinaryEntries(userId: string): Promise<ExtraordinaryEntry[]> {
  const { data, error } = await supabase.from('extraordinary_entries').select('*').eq('user_id', userId)
  if (error) throw error; return rowsToModels<ExtraordinaryEntry>(data ?? [])
}

export async function upsertExtraordinaryEntry(userId: string, e: ExtraordinaryEntry): Promise<void> {
  await requireSession()
  await safeUpsert('extraordinary_entries', { ...toSnake(e as any), user_id: userId }, 'id')
}

export async function deleteExtraordinaryEntryRemote(id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase.from('extraordinary_entries').delete().eq('id', id)
  if (error) throw error
}

// ── Investments ────────────────────────────────────────────────────────────
export async function fetchInvestments(userId: string): Promise<Investment[]> {
  const { data, error } = await supabase.from('investments').select('*').eq('user_id', userId)
  if (error) throw error; return rowsToModels<Investment>(data ?? [])
}

export async function upsertInvestment(userId: string, inv: Investment): Promise<void> {
  await requireSession()
  await safeUpsert('investments', { ...toSnake(inv as any), user_id: userId }, 'id')
}

export async function deleteInvestmentRemote(id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) throw error
}

// ── Month Settings ─────────────────────────────────────────────────────────
export async function fetchMonthSettings(userId: string): Promise<Record<string, MonthSettings>> {
  const { data, error } = await supabase.from('month_settings').select('*').eq('user_id', userId)
  if (error) throw error
  const result: Record<string, MonthSettings> = {}
  for (const row of data ?? []) {
    const ms = toCamel<MonthSettings & { userId?: string }>(row)
    result[ms.monthKey] = sanitizeMonthSettings(ms)
  }
  return result
}

export async function upsertMonthSettings(userId: string, monthKey: string, settings: MonthSettings): Promise<void> {
  await requireSession()
  const row = {
    user_id: userId, month_key: monthKey, is_closed: settings.isClosed, notes: settings.notes ?? null,
    section_limits: settings.sectionLimits, tithe_percent: settings.tithePercent,
    offering_percent: settings.offeringPercent, savings_goal: settings.savingsGoal ?? null,
    highlights: settings.highlights ?? null, lessons: settings.lessons ?? null,
    copied_from_months: settings.copiedFromMonths ?? null, closed_at: settings.closedAt ?? null,
    opened_at: settings.openedAt ?? null, closed_by: settings.closedBy ?? null,
  }
  await safeUpsert('month_settings', row, 'user_id,month_key')
}

// ── User Settings (AppSettings) ────────────────────────────────────────────
export async function fetchUserSettings(userId: string): Promise<AppSettings> {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
  if (error || !data) return DEFAULT_APP_SETTINGS; return parseUserSettingsRow(data as Record<string, unknown>)
}

export async function upsertUserSettings(userId: string, settings: AppSettings): Promise<void> {
  await requireSession()
  const row = {
    user_id: userId, default_section_limits: settings.defaultSectionLimits,
    default_tithe_percent: settings.defaultTithePercent, default_offering_percent: settings.defaultOfferingPercent,
    default_savings_goal_percent: settings.defaultSavingsGoalPercent, dark_mode: settings.darkMode,
    alert_threshold_percent: settings.alertThresholdPercent, card_sections: settings.cardSections,
    initial_balance: settings.initialBalance, cdi_rate_annual: settings.cdiRateAnnual,
    ipca_rate_annual: settings.ipcaRateAnnual, notifications_enabled: settings.notificationsEnabled ?? false,
    has_seen_tutorial: settings.hasSeenTutorial ?? false, rates_last_updated: settings.ratesLastUpdated ?? null,
    gemini_api_key: settings.geminiApiKey ?? null,
  }
  await safeUpsert('user_settings', row, 'user_id')
}

// ── Bulk operations ────────────────────────────────────────────────────────
export interface StoreSnapshot {
  transactions: Transaction[]; recurringTemplates: RecurringTemplate[]
  extraordinaryEntries: ExtraordinaryEntry[]; investments: Investment[]
  monthSettings: Record<string, MonthSettings>; appSettings: AppSettings
}

export async function fetchAllUserData(userId: string): Promise<StoreSnapshot> {
  const [transactions, recurringTemplates, extraordinaryEntries, investments, monthSettings, appSettings] =
    await Promise.all([
      fetchTransactions(userId), fetchRecurringTemplates(userId), fetchExtraordinaryEntries(userId),
      fetchInvestments(userId), fetchMonthSettings(userId), fetchUserSettings(userId),
    ])
  return { transactions, recurringTemplates, extraordinaryEntries, investments, monthSettings, appSettings }
}

export async function deleteAllUserData(userId: string): Promise<void> {
  await requireSession()
  const results = await Promise.all([
    supabase.from('transactions').delete().eq('user_id', userId),
    supabase.from('recurring_templates').delete().eq('user_id', userId),
    supabase.from('extraordinary_entries').delete().eq('user_id', userId),
    supabase.from('investments').delete().eq('user_id', userId),
    supabase.from('month_settings').delete().eq('user_id', userId),
  ])
  for (const r of results) {
    if (r.error) throw r.error
  }
  await upsertUserSettings(userId, DEFAULT_APP_SETTINGS)
}

export async function bulkUpdateTransactions(userId: string, txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return; await requireSession()
  const rows = txs.map((t) => ({ ...toSnake(t as any), user_id: userId }))
  const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function bulkUpdateExtraordinaryEntries(userId: string, entries: ExtraordinaryEntry[]): Promise<void> {
  if (entries.length === 0) return; await requireSession()
  const rows = entries.map((e) => ({ ...toSnake(e as any), user_id: userId }))
  const { error } = await supabase.from('extraordinary_entries').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function bulkUpsertInvestments(userId: string, investments: Investment[]): Promise<void> {
  if (investments.length === 0) return; await requireSession()
  const rows = investments.map((inv) => ({ ...toSnake(inv as any), user_id: userId }))
  const { error } = await supabase.from('investments').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}
