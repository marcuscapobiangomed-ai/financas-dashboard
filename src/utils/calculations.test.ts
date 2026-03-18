import { describe, it, expect } from 'vitest'
import {
  computeSectionSummary,
  computeIncome,
  computeTotalExpenses,
  computeBalance,
  computeSavingsRate,
  computeExtraordinaryTotals,
  percentageOf,
} from './calculations'
import type { Transaction } from '../types/transaction'
import { Category } from '../types/category'

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: '1',
    type: 'expense',
    section: 'despesas_fixas',
    description: 'Test',
    amount: 100,
    category: Category.OUTROS,
    date: '2025-03-01',
    monthKey: '2025-03',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('computeSectionSummary', () => {
  it('calculates total and percentage for a section', () => {
    const transactions = [
      tx({ amount: 200 }),
      tx({ amount: 300 }),
      tx({ section: 'entradas', amount: 500 }),
    ]
    const result = computeSectionSummary('despesas_fixas', 'Despesas Fixas', transactions, 1000)
    expect(result.total).toBe(500)
    expect(result.percentUsed).toBe(50)
    expect(result.isOverLimit).toBe(false)
    expect(result.transactions).toHaveLength(2)
  })

  it('detects over limit', () => {
    const transactions = [tx({ amount: 600 }), tx({ amount: 500 })]
    const result = computeSectionSummary('despesas_fixas', 'DF', transactions, 1000)
    expect(result.isOverLimit).toBe(true)
    expect(result.percentUsed).toBeCloseTo(110)
  })

  it('handles zero limit', () => {
    const transactions = [tx({ amount: 100 })]
    const result = computeSectionSummary('despesas_fixas', 'DF', transactions, 0)
    expect(result.percentUsed).toBe(0)
    expect(result.isOverLimit).toBe(false)
  })

  it('returns empty when no matching transactions', () => {
    const result = computeSectionSummary('gastos_diarios', 'GD', [tx()], 500)
    expect(result.total).toBe(0)
    expect(result.transactions).toHaveLength(0)
  })
})

describe('computeIncome', () => {
  it('sums only entradas section', () => {
    const transactions = [
      tx({ section: 'entradas', amount: 3000 }),
      tx({ section: 'entradas', amount: 2000 }),
      tx({ section: 'despesas_fixas', amount: 500 }),
    ]
    expect(computeIncome(transactions)).toBe(5000)
  })

  it('returns 0 when no income', () => {
    expect(computeIncome([tx()])).toBe(0)
  })
})

describe('computeTotalExpenses', () => {
  it('sums expenses across specified sections', () => {
    const transactions = [
      tx({ section: 'despesas_fixas', amount: 500 }),
      tx({ section: 'gastos_diarios', amount: 300 }),
      tx({ section: 'cartao_x', amount: 200 }),
      tx({ section: 'entradas', amount: 5000 }),
    ]
    const result = computeTotalExpenses(transactions, ['despesas_fixas', 'gastos_diarios', 'cartao_x'])
    expect(result).toBe(1000)
  })
})

describe('computeBalance', () => {
  it('returns income minus expenses', () => {
    expect(computeBalance(5000, 3000)).toBe(2000)
  })

  it('can be negative', () => {
    expect(computeBalance(1000, 3000)).toBe(-2000)
  })
})

describe('computeSavingsRate', () => {
  it('calculates savings as percentage of income', () => {
    expect(computeSavingsRate(5000, 3000)).toBe(40)
  })

  it('returns 0 when income is 0', () => {
    expect(computeSavingsRate(0, 500)).toBe(0)
  })

  it('clamps to 0 when expenses exceed income', () => {
    expect(computeSavingsRate(1000, 2000)).toBe(0)
  })
})

describe('computeExtraordinaryTotals', () => {
  it('calculates tithe, offering, and net amount', () => {
    const result = computeExtraordinaryTotals({
      grossAmount: 10000,
      tithePercent: 10,
      offeringPercent: 2,
    })
    expect(result.tithe).toBe(1000)
    expect(result.offering).toBe(200)
    expect(result.netAmount).toBe(8800)
  })

  it('handles zero percentages', () => {
    const result = computeExtraordinaryTotals({
      grossAmount: 5000,
      tithePercent: 0,
      offeringPercent: 0,
    })
    expect(result.tithe).toBe(0)
    expect(result.offering).toBe(0)
    expect(result.netAmount).toBe(5000)
  })
})

describe('percentageOf', () => {
  it('calculates percentage', () => {
    expect(percentageOf(25, 100)).toBe(25)
    expect(percentageOf(1, 3)).toBeCloseTo(33.33, 1)
  })

  it('returns 0 when total is 0', () => {
    expect(percentageOf(50, 0)).toBe(0)
  })
})
