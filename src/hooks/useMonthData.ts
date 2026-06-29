import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useSectionConfig } from './useSectionConfig'
import type { SectionSummary } from '../types/budget'
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
  pendingTransactions: ReturnType<typeof useFinanceStore.getState>['transactions']
  pendingIncome: number
  pendingExpenses: number
  accumulatedBalance: number
  carryoverBalance: number
}

export function useMonthData(monthKey: string): MonthData {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const monthSettings = useFinanceStore((s) => s.monthSettings)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const { sectionOrder, sectionLabels, expenseSections } = useSectionConfig()

  return useMemo(() => {
    const monthTransactions = transactions.filter((t) => t.monthKey === monthKey)
    const monthExtraordinary = extraordinaryEntries.filter((e) => e.monthKey === monthKey)

    const saved = monthSettings[monthKey]
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

    const pendingTransactions = monthTransactions.filter((t) => t.isPaid === false)
    const pendingIncome = pendingTransactions
      .filter((t) => t.section === 'entradas')
      .reduce((s, t) => s + t.amount, 0)
    const pendingExpenses = pendingTransactions
      .filter((t) => expenseSections.includes(t.section))
      .reduce((s, t) => s + t.amount, 0)

    const accumulatedTransactions = transactions.filter((t) => t.monthKey <= monthKey)
    const accumulatedExtraordinary = extraordinaryEntries.filter((e) => e.monthKey <= monthKey)
    const accIncome = computeIncome(accumulatedTransactions) + accumulatedExtraordinary.reduce((s, e) => s + e.netAmount, 0)
    const accExpenses = computeTotalExpenses(accumulatedTransactions, expenseSections)
    const accumulatedBalance = (appSettings.initialBalance ?? 0) + accIncome - accExpenses

    const previousTransactions = transactions.filter((t) => t.monthKey < monthKey)
    const previousExtraordinary = extraordinaryEntries.filter((e) => e.monthKey < monthKey)
    const prevIncome = computeIncome(previousTransactions) + previousExtraordinary.reduce((s, e) => s + e.netAmount, 0)
    const prevExpenses = computeTotalExpenses(previousTransactions, expenseSections)
    const carryoverBalance = (appSettings.initialBalance ?? 0) + prevIncome - prevExpenses

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
      pendingTransactions,
      pendingIncome,
      pendingExpenses,
      accumulatedBalance,
      carryoverBalance,
    }
  }, [transactions, extraordinaryEntries, monthKey, monthSettings, appSettings, sectionOrder, sectionLabels, expenseSections])
}
