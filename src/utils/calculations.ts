import { Transaction, SectionType } from '../types/transaction'
import { SectionSummary } from '../types/budget'

export function isCardBillPaid(transactions: Transaction[], cardId: string, monthKey: string): boolean {
  return transactions.some(
    (t) => t.monthKey === monthKey && t.section === cardId && t.description === '__CARD_BILL_PAID__' && t.isPaid === true
  )
}

export function computeSectionSummary(
  section: string,
  label: string,
  transactions: Transaction[],
  limit: number,
  cardIds: string[] = []
): SectionSummary {
  const isCard = cardIds.includes(section)
  
  const allSectionTransactions = transactions.filter(
    (t) => t.section === section && t.description !== '__CARD_BILL_PAID__'
  )

  const sectionTransactions = allSectionTransactions.filter((t) => {
    if (isCard) return true // Show all purchases in card section
    return t.isPaid !== false // Show only paid/confirmed in normal sections
  })

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
    .filter((t) => t.section === 'entradas' && t.isPaid !== false)
    .reduce((sum, t) => sum + t.amount, 0)
}

export function computeTotalExpenses(
  transactions: Transaction[],
  expenseSections: string[],
  cardIds: string[] = []
): number {
  return transactions
    .filter((t) => {
      if (!expenseSections.includes(t.section)) return false
      if (t.description === '__CARD_BILL_PAID__') return false

      if (cardIds.includes(t.section)) {
        // Credit card transactions: paid status is determined by the card bill payment status in that month
        return isCardBillPaid(transactions, t.section, t.monthKey)
      }

      // Normal transactions: paid status is determined by t.isPaid
      return t.isPaid !== false
    })
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
