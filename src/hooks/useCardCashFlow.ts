import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useMonthData } from './useMonthData'
import { useSectionConfig } from './useSectionConfig'
import { nextMonthKey } from '../constants/months'
import { getDueDate } from '../utils/cardBilling'
import type { Transaction } from '../types/transaction'
import type { CardSection } from '../types/budget'

export interface CardBillSummary {
  cardId: string
  label: string
  monthKey: string
  dueDate: string
  total: number
  pendingTotal: number
  transactionCount: number
}

export interface BillingDestinationSummary {
  monthKey: string
  total: number
  transactionCount: number
}

export interface CardCashFlow {
  hasCards: boolean
  incomeAvailable: number
  immediateExpenses: number
  currentBillTotal: number
  currentBillPendingTotal: number
  nextBillTotal: number
  purchasesThisMonthTotal: number
  futurePurchasesFromThisMonth: number
  cashAfterCurrentCommitments: number
  projectedAfterNextBill: number
  nextMonthKey: string
  currentBills: CardBillSummary[]
  nextBills: CardBillSummary[]
  purchaseDestinations: BillingDestinationSummary[]
}

function sumTransactions(transactions: Transaction[]): number {
  return transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
}

function summarizeBills(transactions: Transaction[], cards: CardSection[], monthKey: string): CardBillSummary[] {
  return cards
    .map((card) => {
      const cardTransactions = transactions.filter((transaction) => transaction.section === card.id)
      const total = sumTransactions(cardTransactions)

      return {
        cardId: card.id,
        label: card.label,
        monthKey,
        dueDate: getDueDate(monthKey, card.dueDay ?? 20),
        total,
        pendingTotal: sumTransactions(cardTransactions.filter((transaction) => transaction.isPaid === false)),
        transactionCount: cardTransactions.length,
      }
    })
    .filter((bill) => bill.total > 0)
}

function summarizeDestinations(transactions: Transaction[]): BillingDestinationSummary[] {
  const byMonth = new Map<string, BillingDestinationSummary>()

  transactions.forEach((transaction) => {
    const current = byMonth.get(transaction.monthKey) ?? {
      monthKey: transaction.monthKey,
      total: 0,
      transactionCount: 0,
    }

    current.total += transaction.amount
    current.transactionCount += 1
    byMonth.set(transaction.monthKey, current)
  })

  return Array.from(byMonth.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

export function useCardCashFlow(monthKey: string): CardCashFlow {
  const transactions = useFinanceStore((state) => state.transactions)
  const { cardSections, expenseSections } = useSectionConfig()
  const monthData = useMonthData(monthKey)

  return useMemo(() => {
    const cardIds = new Set(cardSections.map((card) => card.id))
    const nextKey = nextMonthKey(monthKey)

    const monthTransactions = transactions.filter((transaction) => transaction.monthKey === monthKey)
    const currentCardTransactions = monthTransactions.filter((transaction) => cardIds.has(transaction.section))
    const immediateExpenseTransactions = monthTransactions.filter((transaction) =>
      expenseSections.includes(transaction.section) && !cardIds.has(transaction.section)
    )

    const nextCardTransactions = transactions.filter((transaction) =>
      transaction.monthKey === nextKey && cardIds.has(transaction.section)
    )

    const purchasesThisMonth = transactions.filter((transaction) =>
      cardIds.has(transaction.section) && transaction.date.startsWith(monthKey)
    )

    const futurePurchases = purchasesThisMonth.filter((transaction) => transaction.monthKey > monthKey)
    const currentBillTotal = sumTransactions(currentCardTransactions)
    const currentBillPendingTotal = sumTransactions(
      currentCardTransactions.filter((transaction) => transaction.isPaid === false)
    )
    const immediateExpenses = sumTransactions(immediateExpenseTransactions)
    const nextBillTotal = sumTransactions(nextCardTransactions)
    const incomeAvailable = monthData.carryoverBalance + monthData.totalIncomePlusExtraordinary
    const cashAfterCurrentCommitments = incomeAvailable - immediateExpenses - currentBillTotal

    return {
      hasCards: cardSections.length > 0,
      incomeAvailable,
      immediateExpenses,
      currentBillTotal,
      currentBillPendingTotal,
      nextBillTotal,
      purchasesThisMonthTotal: sumTransactions(purchasesThisMonth),
      futurePurchasesFromThisMonth: sumTransactions(futurePurchases),
      cashAfterCurrentCommitments,
      projectedAfterNextBill: cashAfterCurrentCommitments - nextBillTotal,
      nextMonthKey: nextKey,
      currentBills: summarizeBills(currentCardTransactions, cardSections, monthKey),
      nextBills: summarizeBills(nextCardTransactions, cardSections, nextKey),
      purchaseDestinations: summarizeDestinations(purchasesThisMonth),
    }
  }, [transactions, cardSections, expenseSections, monthData.carryoverBalance, monthData.totalIncomePlusExtraordinary, monthKey])
}
