import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import type { SectionSummary } from '../types/budget'
import { SECTION_LABELS, SECTION_ORDER } from '../constants/categories'
import {
  computeSectionSummary,
  computeIncome,
  computeTotalExpenses,
  computeBalance,
  computeSavingsRate,
} from '../utils/calculations'

export interface MonthData {
  monthKey: string
  transactions: ReturnType<typeof useFinanceStore.getState>['transactions']
  extraordinary: ReturnType<typeof useFinanceStore.getState>['extraordinaryEntries']
  sections: SectionSummary[]
  income: number
  totalExpenses: number
  balance: number
  savingsRate: number
  isClosed: boolean
  sectionLimits: Record<string, number>
  overLimitSections: SectionSummary[]
  extraordinaryIncome: number
  totalIncomePlusExtraordinary: number
}

export function useMonthData(monthKey: string): MonthData {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const monthSettings = useFinanceStore((s) => s.monthSettings)
  const appSettings = useFinanceStore((s) => s.appSettings)

  return useMemo(() => {
    const monthTransactions = transactions.filter((t) => t.monthKey === monthKey)
    const monthExtraordinary = extraordinaryEntries.filter((e) => e.monthKey === monthKey)

    // Read settings directly (no function reference in deps)
    const saved = monthSettings[monthKey]
    const limits = saved?.sectionLimits ?? appSettings.defaultSectionLimits
    const isClosed = saved?.isClosed ?? false

    // Exclude extraordinario — it has its own dedicated component
    const sections = SECTION_ORDER.filter((s) => s !== 'extraordinario').map((section) =>
      computeSectionSummary(
        section,
        SECTION_LABELS[section],
        monthTransactions,
        limits[section] ?? 0
      )
    )

    const income = computeIncome(monthTransactions)
    const totalExpenses = computeTotalExpenses(monthTransactions)
    const balance = computeBalance(income, totalExpenses)
    const savingsRate = computeSavingsRate(income, totalExpenses)
    const extraordinaryIncome = monthExtraordinary.reduce((s, e) => s + e.netAmount, 0)
    const overLimitSections = sections.filter((s) => s.isOverLimit)

    return {
      monthKey,
      transactions: monthTransactions,
      extraordinary: monthExtraordinary,
      sections,
      income,
      totalExpenses,
      balance,
      savingsRate,
      isClosed,
      sectionLimits: limits,
      overLimitSections,
      extraordinaryIncome,
      totalIncomePlusExtraordinary: income + extraordinaryIncome,
    }
  }, [transactions, extraordinaryEntries, monthKey, monthSettings, appSettings])
}
