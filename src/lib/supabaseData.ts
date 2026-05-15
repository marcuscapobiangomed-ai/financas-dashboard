import { supabase, hasActiveSession } from './supabase'
import type { Transaction, RecurringTemplate, ExtraordinaryEntry } from '../types/transaction'
import type { AppSettings, MonthSettings } from '../types/budget'
import type { Investment } from '../types/investment'
import { DEFAULT_APP_SETTINGS } from '../constants/defaultBudget'

// ── snake_case ↔ camelCase helpers ─────────────────────────────────────────

function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())] = v
  }
  return result
}

export function toCamel<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v
  }
  return result as T
}

// ── Numeric field coercion ─────────────────────────────────────────────────

/** Fields that come as string from Postgres numeric columns but must be number in JS */
const NUMERIC_FIELDS = new Set([
  'amount', 'grossAmount', 'tithePercent', 'offeringPercent',
  'tithe', 'offering', 'netAmount', 'principal', 'monthlyYieldPercent',
  'cdiPercent', 'ipcaPercent', 'shares', 'averagePrice',
  'savingsGoal', 'installmentCurrent', 'installmentTotal',
])

/** Convert Postgres numeric-string fields to actual JS numbers */
function coerceNumerics<T>(obj: Record<string, unknown>): T {
  for (const key of Object.keys(obj)) {
    if (NUMERIC_FIELDS.has(key) && obj[key] != null) {
      obj[key] = Number(obj[key])
    }
  }
  return obj as T
}

/** Convert a single raw Postgres row (snake_case + string numerics) into a typed model.
 *  Use this in Realtime handlers where rows arrive one-at-a-time. */
export function toModel<T>(row: Record<string, unknown>): T {
  return coerceNumerics<T>(toCamel<Record<string, unknown>>(row))
}

function rowsToModels<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => toModel<T>(r))
}

// ── Session guard ──────────────────────────────────────────────────────────

/** Ensure there's an active Supabase session before performing a write.
 *  Throws a clear error if no session is found. */
async function requireSession(): Promise<void> {
  const active = await hasActiveSession()
  if (!active) {
    throw new Error('Sessão expirada. Faça login novamente para sincronizar.')
  }
}

// ── Transactions ───────────────────────────────────────────────────────────

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return rowsToModels<Transaction>(data ?? [])
}

export async function upsertTransaction(userId: string, t: Transaction): Promise<void> {
  await requireSession()
  const row = { ...toSnake(t as unknown as Record<string, unknown>), user_id: userId }
  const { error } = await supabase.from('transactions').upsert(row, { onConflict: 'id' })
  if (error) { console.error('upsertTransaction error:', error); throw error }
}

export async function bulkUpsertTransactions(userId: string, txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return
  await requireSession()
  const rows = txs.map((t) => ({ ...toSnake(t as unknown as Record<string, unknown>), user_id: userId }))
  const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' })
  if (error) { console.error('bulkUpsertTransactions error:', error); throw error }
}

export async function deleteTransactionRemote(id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) { console.error('deleteTransaction error:', error); throw error }
}

// ── Recurring Templates ────────────────────────────────────────────────────

export async function fetchRecurringTemplates(userId: string): Promise<RecurringTemplate[]> {
  const { data, error } = await supabase
    .from('recurring_templates')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return rowsToModels<RecurringTemplate>(data ?? [])
}

export async function upsertRecurringTemplate(userId: string, t: RecurringTemplate): Promise<void> {
  await requireSession()
  const row = { ...toSnake(t as unknown as Record<string, unknown>), user_id: userId }
  const { error } = await supabase.from('recurring_templates').upsert(row, { onConflict: 'id' })
  if (error) { console.error('upsertRecurringTemplate error:', error); throw error }
}

export async function deleteRecurringTemplateRemote(id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase.from('recurring_templates').delete().eq('id', id)
  if (error) { console.error('deleteRecurringTemplate error:', error); throw error }
}

// ── Extraordinary Entries ──────────────────────────────────────────────────

export async function fetchExtraordinaryEntries(userId: string): Promise<ExtraordinaryEntry[]> {
  const { data, error } = await supabase
    .from('extraordinary_entries')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return rowsToModels<ExtraordinaryEntry>(data ?? [])
}

export async function upsertExtraordinaryEntry(userId: string, e: ExtraordinaryEntry): Promise<void> {
  await requireSession()
  const row = { ...toSnake(e as unknown as Record<string, unknown>), user_id: userId }
  const { error } = await supabase.from('extraordinary_entries').upsert(row, { onConflict: 'id' })
  if (error) { console.error('upsertExtraordinaryEntry error:', error); throw error }
}

export async function deleteExtraordinaryEntryRemote(id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase.from('extraordinary_entries').delete().eq('id', id)
  if (error) { console.error('deleteExtraordinaryEntry error:', error); throw error }
}

// ── Investments ────────────────────────────────────────────────────────────

export async function fetchInvestments(userId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return rowsToModels<Investment>(data ?? [])
}

export async function upsertInvestment(userId: string, inv: Investment): Promise<void> {
  await requireSession()
  const row = { ...toSnake(inv as unknown as Record<string, unknown>), user_id: userId }
  const { error } = await supabase.from('investments').upsert(row, { onConflict: 'id' })
  if (error) { console.error('upsertInvestment error:', error); throw error }
}

export async function deleteInvestmentRemote(id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) { console.error('deleteInvestment error:', error); throw error }
}

// ── Month Settings ─────────────────────────────────────────────────────────

/** Remove userId / user_id from a MonthSettings object (they leak in from Realtime payloads). */
export function sanitizeMonthSettings(ms: MonthSettings & { userId?: string; user_id?: string }): MonthSettings {
  const clean = { ...ms }
  delete (clean as any).userId
  delete (clean as any).user_id
  return clean
}

export async function fetchMonthSettings(userId: string): Promise<Record<string, MonthSettings>> {
  const { data, error } = await supabase
    .from('month_settings')
    .select('*')
    .eq('user_id', userId)
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
    user_id: userId,
    month_key: monthKey,
    is_closed: settings.isClosed,
    notes: settings.notes ?? null,
    section_limits: settings.sectionLimits,
    tithe_percent: settings.tithePercent,
    offering_percent: settings.offeringPercent,
    savings_goal: settings.savingsGoal ?? null,
  }
  const { error } = await supabase.from('month_settings').upsert(row, { onConflict: 'user_id,month_key' })
  if (error) { console.error('upsertMonthSettings error:', error); throw error }
}

// ── User Settings (AppSettings) ────────────────────────────────────────────

/** Parse a raw Postgres row into a typed AppSettings object.
 *  Reused by fetchUserSettings and the realtime update handler. */
export function parseUserSettingsRow(data: Record<string, unknown>): AppSettings {
  // Ensure backward compatibility: add closingDay/dueDay defaults to cards that don't have them
  const rawCards = data.card_sections ?? DEFAULT_APP_SETTINGS.cardSections
  const cardSections = (rawCards as Array<Record<string, unknown>>).map((c) => ({
    id: c.id as string,
    label: c.label as string,
    closingDay: (c.closingDay ?? c.closing_day ?? 10) as number,
    dueDay: (c.dueDay ?? c.due_day ?? 20) as number,
  }))

  return {
    defaultSectionLimits: data.default_section_limits ?? DEFAULT_APP_SETTINGS.defaultSectionLimits,
    defaultTithePercent: Number(data.default_tithe_percent),
    defaultOfferingPercent: Number(data.default_offering_percent),
    defaultSavingsGoalPercent: Number(data.default_savings_goal_percent),
    darkMode: data.dark_mode ?? false,
    alertThresholdPercent: Number(data.alert_threshold_percent),
    cardSections,
    initialBalance: Number(data.initial_balance),
    cdiRateAnnual: Number(data.cdi_rate_annual ?? 14.15),
    ipcaRateAnnual: Number(data.ipca_rate_annual ?? 5.0),
    notificationsEnabled: data.notifications_enabled ?? false,
    hasSeenTutorial: data.has_seen_tutorial ?? false,
    ratesLastUpdated: (data.rates_last_updated as string) ?? undefined,
  }
}

export async function fetchUserSettings(userId: string): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return DEFAULT_APP_SETTINGS

  return parseUserSettingsRow(data as Record<string, unknown>)
}

export async function upsertUserSettings(userId: string, settings: AppSettings): Promise<void> {
  await requireSession()
  const row = {
    user_id: userId,
    default_section_limits: settings.defaultSectionLimits,
    default_tithe_percent: settings.defaultTithePercent,
    default_offering_percent: settings.defaultOfferingPercent,
    default_savings_goal_percent: settings.defaultSavingsGoalPercent,
    dark_mode: settings.darkMode,
    alert_threshold_percent: settings.alertThresholdPercent,
    card_sections: settings.cardSections,
    initial_balance: settings.initialBalance,
    cdi_rate_annual: settings.cdiRateAnnual,
    ipca_rate_annual: settings.ipcaRateAnnual,
    notifications_enabled: settings.notificationsEnabled ?? false,
    has_seen_tutorial: settings.hasSeenTutorial ?? false,
    rates_last_updated: settings.ratesLastUpdated ?? null,
  }
  const { error } = await supabase.from('user_settings').upsert(row, { onConflict: 'user_id' })
  if (error) { console.error('upsertUserSettings error:', error); throw error }
}

// ── Bulk operations ────────────────────────────────────────────────────────

export interface StoreSnapshot {
  transactions: Transaction[]
  recurringTemplates: RecurringTemplate[]
  extraordinaryEntries: ExtraordinaryEntry[]
  investments: Investment[]
  monthSettings: Record<string, MonthSettings>
  appSettings: AppSettings
}

export async function fetchAllUserData(userId: string): Promise<StoreSnapshot> {
  const [transactions, recurringTemplates, extraordinaryEntries, investments, monthSettings, appSettings] =
    await Promise.all([
      fetchTransactions(userId),
      fetchRecurringTemplates(userId),
      fetchExtraordinaryEntries(userId),
      fetchInvestments(userId),
      fetchMonthSettings(userId),
      fetchUserSettings(userId),
    ])

  return { transactions, recurringTemplates, extraordinaryEntries, investments, monthSettings, appSettings }
}

export async function deleteAllUserData(userId: string): Promise<void> {
  await requireSession()
  await Promise.all([
    supabase.from('transactions').delete().eq('user_id', userId),
    supabase.from('recurring_templates').delete().eq('user_id', userId),
    supabase.from('extraordinary_entries').delete().eq('user_id', userId),
    supabase.from('investments').delete().eq('user_id', userId),
    supabase.from('month_settings').delete().eq('user_id', userId),
  ])
  // Reset user_settings to defaults instead of deleting
  await upsertUserSettings(userId, DEFAULT_APP_SETTINGS)
}

export async function bulkUpdateTransactions(userId: string, txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return
  await requireSession()
  const rows = txs.map((t) => ({ ...toSnake(t as unknown as Record<string, unknown>), user_id: userId }))
  const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' })
  if (error) { console.error('bulkUpdateTransactions error:', error); throw error }
}

export async function bulkUpdateExtraordinaryEntries(userId: string, entries: ExtraordinaryEntry[]): Promise<void> {
  if (entries.length === 0) return
  await requireSession()
  const rows = entries.map((e) => ({ ...toSnake(e as unknown as Record<string, unknown>), user_id: userId }))
  const { error } = await supabase.from('extraordinary_entries').upsert(rows, { onConflict: 'id' })
  if (error) { console.error('bulkUpdateExtraordinaryEntries error:', error); throw error }
}
