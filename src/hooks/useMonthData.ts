import { useMemo, useCallback } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useSectionConfig } from './useSectionConfig'
import type { SectionSummary } from '../types/budget'
import { useShallow } from 'zustand/react/shallow'
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
  const monthTransactions = useFinanceStore(
    useShallow((s) => s.transactions.filter((t) => t.monthKey === monthKey))
  )
  const monthExtraordinary = useFinanceStore(
    useShallow((s) => s.extraordinaryEntries.filter((e) => e.monthKey === monthKey))
  )
  const saved = useFinanceStore(
    useShallow((s) => s.monthSettings[monthKey])
  )
  const appSettings = useFinanceStore((s) => s.appSettings)
  const { sectionOrder, sectionLabels, expenseSections } = useSectionConfig()

  return useMemo(() => {
    const limits = saved?.sectionLimits ?? appSettings.defaultSectionLimits
    const isClosed = saved?.isClosed ?? false

    const sections = sectionOrder.filter((s) => s !== 'extraordinario').map((section) =>
      computeSectionSummary(
        section,
        sectionLabels[section] ?? section,
        monthTransactions,
        limits[section] ?? 0
      )
    )

    const income = computeIncome(monthTransactions)
    const totalExpenses = computeTotalExpenses(monthTransactions, expenseSections)
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
  }, [monthTransactions, monthExtraordinary, monthKey, saved, appSettings, sectionOrder, sectionLabels, expenseSections])
}
