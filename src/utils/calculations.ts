import { Transaction, SectionType, ExtraordinaryEntry } from '../types/transaction'
import { SectionSummary } from '../types/budget'
import { EXPENSE_SECTIONS } from '../constants/categories'

export function computeSectionSummary(
  section: SectionType,
  label: string,
  transactions: Transaction[],
  limit: number
): SectionSummary {
  const sectionTransactions = transactions.filter((t) => t.section === section)
  const total = sectionTransactions.reduce((sum, t) => sum + t.amount, 0)
  const percentUsed = limit > 0 ? (total / limit) * 100 : 0
  return {
    section,
    label,
    limit,
    total,
    transactions: sectionTransactions,
    isOverLimit: limit > 0 && total > limit,
    percentUsed,
  }
}

export function computeIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.section === 'entradas')
    .reduce((sum, t) => sum + t.amount, 0)
}

export function computeTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => EXPENSE_SECTIONS.includes(t.section as SectionType))
    .reduce((sum, t) => sum + t.amount, 0)
}

export function computeBalance(income: number, expenses: number): number {
  return income - expenses
}

export function computeSavingsRate(income: number, expenses: number): number {
  if (income === 0) return 0
  return Math.max(0, ((income - expenses) / income) * 100)
}

export function computeExtraordinaryTotals(entry: {
  grossAmount: number
  tithePercent: number
  offeringPercent: number
}): { tithe: number; offering: number; netAmount: number } {
  const tithe = (entry.grossAmount * entry.tithePercent) / 100
  const offering = (entry.grossAmount * entry.offeringPercent) / 100
  const netAmount = entry.grossAmount - tithe - offering
  return { tithe, offering, netAmount }
}

export function percentageOf(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

export function daysRemainingInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return lastDay - now.getDate()
}

export function daysElapsedInMonth(): number {
  return new Date().getDate()
}

export function totalDaysInMonth(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

export function projectEndOfMonth(currentTotal: number): number {
  const elapsed = daysElapsedInMonth()
  const total = totalDaysInMonth()
  if (elapsed === 0) return currentTotal
  return (currentTotal / elapsed) * total
}
