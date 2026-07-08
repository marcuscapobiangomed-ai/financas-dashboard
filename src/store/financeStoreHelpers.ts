import { useAuthStore } from './useAuthStore'
import { AppSettings, MonthSettings } from '../types/budget'
import { getNotificationPermission, showBudgetAlert } from '../lib/notifications'

export function getUserId(): string | null {
  try {
    return useAuthStore.getState().user?.id ?? null
  } catch {
    return null
  }
}

export {
  isNetworkError,
  isSessionError,
  syncRemote,
  _realtimeOrigin,
  QUEUE_TTL_MS
} from '../sync'

export function generateId(): string {
  return crypto.randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}

export function monthsDiff(fromMonthKey: string, toMonthKey: string): number {
  const [fy, fm] = fromMonthKey.split('-').map(Number)
  const [ty, tm] = toMonthKey.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export function defaultMonthSettings(monthKey: string, appSettings: AppSettings): MonthSettings {
  return {
    monthKey,
    isClosed: false,
    sectionLimits: { ...appSettings.defaultSectionLimits },
    tithePercent: appSettings.defaultTithePercent,
    offeringPercent: appSettings.defaultOfferingPercent,
  }
}

export function checkBudgetAlert(state: any, monthKey: string, section: string) {
  if (!state.appSettings.notificationsEnabled) return
  if (getNotificationPermission() !== 'granted') return

  const ms = state.getMonthSettings(monthKey)
  const isCard = state.appSettings.cardSections?.some((c: any) => c.id === section)
  const limit = isCard
    ? (state.appSettings.defaultSectionLimits[section] ?? 500)
    : (ms.sectionLimits[section] ?? 0)
  if (limit <= 0) return

  const total = state.transactions
    .filter((t: any) => t.monthKey === monthKey && t.section === section && t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0)

  const percentUsed = (total / limit) * 100
  const threshold = state.appSettings.alertThresholdPercent || 80

  if (percentUsed >= threshold) {
    const cardLabel = state.appSettings.cardSections?.find((c: any) => c.id === section)?.label
    const labels: Record<string, string> = {
      despesas_fixas: 'Despesas Fixas',
      gastos_diarios: 'Pix/Dinheiro',
    }
    const label = cardLabel ?? labels[section] ?? section
    showBudgetAlert(label, percentUsed, limit, total)
  }
}

/**
 * Check if a month is closed and throw an error if so.
 * Used by store slices to prevent mutations on closed months.
 */
export function assertMonthNotClosed(get: any, monthKey: string): void {
  const state = get()
  const settings = state.monthSettings?.[monthKey]
  if (settings?.isClosed) {
    throw new Error(`O mês ${monthKey} está fechado. Reabra-o para fazer alterações.`)
  }
}

