import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useSectionConfig } from './useSectionConfig'
import {
  getMonthKey, getMonthLabel, getCurrentMonthKey,
  nextMonthKey, prevMonthKey, parseMonthKey,
} from '../constants/months'
import { computeIncome, computeTotalExpenses } from '../utils/calculations'
import { monthsDiff } from '../store/financeStoreHelpers'
import type { RecurringTemplate } from '../types/transaction'

export interface CashFlowMonth {
  monthKey: string
  label: string
  income: number
  expenses: number
  balance: number
  accumulatedBalance: number
  isProjected: boolean
  isCurrentMonth: boolean
}

export interface CashFlowProjection {
  months: CashFlowMonth[]
  currentBalance: number
  totalPastIncome: number
  totalPastExpenses: number
  totalFutureIncome: number
  totalFutureExpenses: number
  projectedBalanceAfter: number
  initialBalance: number
}

function shouldApplyInMonth(tmpl: RecurringTemplate, monthKey: string): boolean {
  if (!tmpl.isActive) return false
  if (tmpl.startMonth > monthKey) return false
  if (tmpl.endMonth && tmpl.endMonth < monthKey) return false
  if (tmpl.installmentTotal) {
    const diff = monthsDiff(tmpl.startMonth, monthKey)
    if (diff < 0 || diff >= tmpl.installmentTotal) return false
  }
  return true
}

export function useCashFlowProjection(futureMonths: number = 12) {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const recurringTemplates = useFinanceStore((s) => s.recurringTemplates)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const { expenseSections } = useSectionConfig()

  return useMemo(() => {
    const currentKey = getCurrentMonthKey()
    const initial = appSettings.initialBalance ?? 0

    // Gather all existing month keys sorted
    const existingMonthSet = new Set<string>()
    transactions.forEach((t) => existingMonthSet.add(t.monthKey))
    extraordinaryEntries.forEach((e) => existingMonthSet.add(e.monthKey))
    const existingMonths = Array.from(existingMonthSet).sort()

    // Pre-group transactions by monthKey for O(1) lookup
    const txsByMonth = new Map<string, typeof transactions>()
    transactions.forEach((t) => {
      let list = txsByMonth.get(t.monthKey)
      if (!list) { list = []; txsByMonth.set(t.monthKey, list) }
      list.push(t)
    })

    const extraByMonth = new Map<string, typeof extraordinaryEntries>()
    extraordinaryEntries.forEach((e) => {
      let list = extraByMonth.get(e.monthKey)
      if (!list) { list = []; extraByMonth.set(e.monthKey, list) }
      list.push(e)
    })

    // Determine the range of months to display
    // Show all existing months + futureMonths ahead
    let lastExisting = currentKey
    if (existingMonths.length > 0) {
      const last = existingMonths[existingMonths.length - 1]
      if (last > lastExisting) lastExisting = last
    }

    const firstExisting = existingMonths.length > 0 ? existingMonths[0] : currentKey

    // Generate all month keys from first existing to futureMonths ahead
    const allKeys: string[] = []
    let cursor = firstExisting
    const endYearMonth = (() => {
      const { year, month } = parseMonthKey(lastExisting)
      let totalMonths = year * 12 + month + futureMonths
      const y = Math.floor((totalMonths - 1) / 12)
      const m = ((totalMonths - 1) % 12) + 1
      return { year: y, month: m }
    })()

    while (true) {
      allKeys.push(cursor)
      if (cursor === getMonthKey(endYearMonth.year, endYearMonth.month)) break
      cursor = nextMonthKey(cursor)
    }

    // Compute actual data for existing months, projected for future
    let runningBalance = initial
    const months: CashFlowMonth[] = []

    let totalPastIncome = 0
    let totalPastExpenses = 0
    let totalFutureIncome = 0
    let totalFutureExpenses = 0

    allKeys.forEach((key) => {
      const isExisting = existingMonthSet.has(key)
      const isCurrent = key === currentKey
      const isPastOrCurrent = key <= currentKey || isExisting

      let income = 0
      let expenses = 0

      if (isExisting) {
        const txs = txsByMonth.get(key) ?? []
        const extra = extraByMonth.get(key) ?? []
        const extraIncome = extra.reduce((s, e) => s + e.netAmount, 0)
        income = computeIncome(txs) + extraIncome
        expenses = computeTotalExpenses(txs, expenseSections)
      } else if (!isPastOrCurrent) {
        // Project using recurring templates
        recurringTemplates.forEach((tmpl) => {
          if (!shouldApplyInMonth(tmpl, key)) return
          if (tmpl.section === 'entradas') {
            income += tmpl.amount
          } else if (expenseSections.includes(tmpl.section)) {
            expenses += tmpl.amount
          }
        })
      }

      const balance = income - expenses
      runningBalance += balance

      if (isPastOrCurrent || isExisting) {
        totalPastIncome += income
        totalPastExpenses += expenses
      } else {
        totalFutureIncome += income
        totalFutureExpenses += expenses
      }

      months.push({
        monthKey: key,
        label: getMonthLabel(key),
        income,
        expenses,
        balance,
        accumulatedBalance: runningBalance,
        isProjected: !isExisting && !isPastOrCurrent,
        isCurrentMonth: isCurrent,
      })
    })

    return {
      months,
      currentBalance: months.find((m) => m.monthKey === currentKey)?.accumulatedBalance ?? initial,
      totalPastIncome,
      totalPastExpenses,
      totalFutureIncome,
      totalFutureExpenses,
      projectedBalanceAfter: runningBalance,
      initialBalance: initial,
    }
  }, [transactions, extraordinaryEntries, recurringTemplates, appSettings.initialBalance, expenseSections, futureMonths])
}
