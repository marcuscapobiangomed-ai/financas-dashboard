import { useMemo } from 'react'
import { useMonthData } from './useMonthData'
import { useFinanceStore } from '../store/useFinanceStore'

export interface BudgetAlert {
  section: string
  label: string
  limit: number
  total: number
  overage: number
  percentUsed: number
}

export function useBudgetAlerts(monthKey: string) {
  const { sections } = useMonthData(monthKey)
  const appSettings = useFinanceStore((s) => s.appSettings)

  return useMemo(() => {
    const threshold = appSettings.alertThresholdPercent
    const overLimit = sections.filter((s) => s.isOverLimit)
    const nearLimit = sections.filter(
      (s) => !s.isOverLimit && s.limit > 0 && s.percentUsed >= threshold
    )

    const alerts: BudgetAlert[] = overLimit.map((s) => ({
      section: s.section,
      label: s.label,
      limit: s.limit,
      total: s.total,
      overage: s.total - s.limit,
      percentUsed: s.percentUsed,
    }))

    return { overLimit: alerts, nearLimit, hasAlerts: overLimit.length > 0, hasWarnings: nearLimit.length > 0 }
  }, [sections, appSettings.alertThresholdPercent])
}
