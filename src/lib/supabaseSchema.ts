import { supabase, hasActiveSession } from './supabase'
import type { AppSettings, MonthSettings } from '../types/budget'
import { DEFAULT_APP_SETTINGS } from '../constants/defaultBudget'

// ── snake_case ↔ camelCase helpers ─────────────────────────────────────────

export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
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

const NUMERIC_FIELDS = new Set([
  'amount', 'grossAmount', 'tithePercent', 'offeringPercent',
  'tithe', 'offering', 'netAmount', 'principal', 'monthlyYieldPercent',
  'cdiPercent', 'ipcaPercent', 'shares', 'averagePrice',
  'savingsGoal', 'installmentCurrent', 'installmentTotal',
])

export function coerceNumerics<T>(obj: Record<string, unknown>): T {
  const result = { ...obj }
  for (const key of Object.keys(result)) {
    if (NUMERIC_FIELDS.has(key) && result[key] != null) {
      result[key] = Number(result[key])
    }
  }
  return result as T
}

export function toModel<T>(row: Record<string, unknown>): T {
  return coerceNumerics<T>(toCamel<Record<string, unknown>>(row))
}

export function rowsToModels<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => toModel<T>(r))
}

// ── Session guard ──────────────────────────────────────────────────────────

export async function requireSession(): Promise<void> {
  const active = await hasActiveSession()
  if (!active) {
    throw new Error('Sessão expirada. Faça login novamente para sincronizar.')
  }
}

// ── Month Settings Sanitization ────────────────────────────────────────────

export function sanitizeMonthSettings(ms: MonthSettings & { userId?: string; user_id?: string }): MonthSettings {
  const clean = { ...ms }
  delete (clean as any).userId
  delete (clean as any).user_id
  return clean
}

// ── App Settings Parser ────────────────────────────────────────────────────

export function parseUserSettingsRow(data: Record<string, unknown>): AppSettings {
  const rawCards = data.card_sections ?? DEFAULT_APP_SETTINGS.cardSections
  const cardSections = (rawCards as Array<Record<string, unknown>>).map((c) => ({
    id: c.id as string,
    label: c.label as string,
    closingDay: (c.closingDay ?? c.closing_day ?? 10) as number,
    dueDay: (c.dueDay ?? c.due_day ?? 20) as number,
  }))

  return {
    defaultSectionLimits: (data.default_section_limits ?? DEFAULT_APP_SETTINGS.defaultSectionLimits) as Record<string, number>,
    defaultTithePercent: Number(data.default_tithe_percent),
    defaultOfferingPercent: Number(data.default_offering_percent),
    defaultSavingsGoalPercent: Number(data.default_savings_goal_percent),
    darkMode: Boolean(data.dark_mode ?? false),
    alertThresholdPercent: Number(data.alert_threshold_percent),
    cardSections,
    initialBalance: Number(data.initial_balance),
    cdiRateAnnual: Number(data.cdi_rate_annual ?? 14.15),
    ipcaRateAnnual: Number(data.ipca_rate_annual ?? 5.0),
    notificationsEnabled: Boolean(data.notifications_enabled ?? false),
    hasSeenTutorial: Boolean(data.has_seen_tutorial ?? false),
    ratesLastUpdated: (data.rates_last_updated as string) ?? undefined,
    geminiApiKey: (data.gemini_api_key as string) ?? undefined,
  }
}
