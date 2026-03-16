import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useSectionConfig } from './useSectionConfig'
import type { MonthTrend } from '../types/analytics'
import { computeIncome, computeTotalExpenses, computeBalance, computeSavingsRate } from '../utils/calculations'
import { getLast12MonthKeys, getMonthShort } from '../constants/months'

export function useAnnualData(fromMonthKey?: string) {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const { expenseSections } = useSectionConfig()

  return useMemo(() => {
    const monthKeys = getLast12MonthKeys(fromMonthKey)

    const trends: MonthTrend[] = monthKeys.map((key) => {
      const monthTxs = transactions.filter((t) => t.monthKey === key)
      const monthExtra = extraordinaryEntries.filter((e) => e.monthKey === key)
      const extraordinaryIncome = monthExtra.reduce((s, e) => s + e.netAmount, 0)
      const income = computeIncome(monthTxs) + extraordinaryIncome
      const expenses = computeTotalExpenses(monthTxs, expenseSections)
      const fixedExpenses = monthTxs
        .filter((t) => t.section === 'despesas_fixas')
        .reduce((s, t) => s + t.amount, 0)
      const variableExpenses = expenses - fixedExpenses

      return {
        monthKey: key,
        label: getMonthShort(key),
        income,
        expenses,
        balance: computeBalance(income, expenses),
        savingsRate: computeSavingsRate(income, expenses),
        fixedExpenses,
        variableExpenses,
      }
    })

    const totalIncome = trends.reduce((s, t) => s + t.income, 0)
    const totalExpenses = trends.reduce((s, t) => s + t.expenses, 0)
    const avgSavingsRate = trends.length > 0
      ? trends.reduce((s, t) => s + t.savingsRate, 0) / trends.length
      : 0

    const emptyMonth = { label: '—', balance: 0, monthKey: '' }
    const bestMonth = trends.length > 0
      ? trends.reduce((best, t) => t.balance > best.balance ? t : best)
      : emptyMonth
    const worstMonth = trends.length > 0
      ? trends.reduce((worst, t) => t.balance < worst.balance ? t : worst)
      : emptyMonth

    return { trends, totalIncome, totalExpenses, avgSavingsRate, bestMonth, worstMonth }
  }, [transactions, extraordinaryEntries, expenseSections, fromMonthKey])
}
