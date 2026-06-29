import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAnnualData } from './useAnnualData'
import { Category } from '../types/category'
import type { Transaction, ExtraordinaryEntry } from '../types/transaction'

const mockStore = vi.hoisted(() => ({
  transactions: [] as Transaction[],
  extraordinaryEntries: [] as ExtraordinaryEntry[],
  appSettings: {
    cardSections: [{ id: 'cartao_x', label: 'Cartão X', closingDay: 10, dueDay: 20 }],
    defaultSectionLimits: {},
    defaultTithePercent: 10,
    defaultOfferingPercent: 2,
    defaultSavingsGoalPercent: 20,
    darkMode: false,
    alertThresholdPercent: 80,
    initialBalance: 0,
    cdiRateAnnual: 14.15,
    ipcaRateAnnual: 5.0,
    hasSeenTutorial: false,
  },
}))

vi.mock('../store/useFinanceStore', () => ({
  useFinanceStore: (selector: any) => selector(mockStore),
}))

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    section: 'despesas_fixas',
    description: 'Test',
    amount: 100,
    category: Category.OUTROS,
    date: '2025-01-15',
    monthKey: '2025-01',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function incomeTx(amount: number, monthKey: string): Transaction {
  return tx({ type: 'income', section: 'entradas', category: Category.ENTRADAS, amount, monthKey })
}

beforeEach(() => {
  mockStore.transactions = []
  mockStore.extraordinaryEntries = []
})

describe('useAnnualData', () => {
  it('returns empty trends when no transactions exist', () => {
    const { result } = renderHook(() => useAnnualData('2025-01'))

    expect(result.current.trends).toHaveLength(12)
    result.current.trends.forEach((t) => {
      expect(t.income).toBe(0)
      expect(t.expenses).toBe(0)
      expect(t.balance).toBe(0)
      expect(t.savingsRate).toBe(0)
    })
    expect(result.current.totalIncome).toBe(0)
    expect(result.current.totalExpenses).toBe(0)
    expect(result.current.avgSavingsRate).toBe(0)
    // When all months have balance=0, best/worst is first month (no better alternative)
    expect(result.current.bestMonth.monthKey).toBe(result.current.trends[0].monthKey)
    expect(result.current.worstMonth.monthKey).toBe(result.current.trends[0].monthKey)
  })

  it('computes monthly trends correctly', () => {
    mockStore.transactions = [
      incomeTx(5000, '2025-01'),
      tx({ amount: 2000, monthKey: '2025-01' }),
      incomeTx(6000, '2025-02'),
      tx({ amount: 2500, monthKey: '2025-02' }),
    ]

    const { result } = renderHook(() => useAnnualData('2025-02'))

    const jan = result.current.trends.find((t) => t.monthKey === '2025-01')
    expect(jan).toBeDefined()
    expect(jan!.income).toBe(5000)
    expect(jan!.expenses).toBe(2000)
    expect(jan!.balance).toBe(3000)
    expect(jan!.savingsRate).toBeCloseTo(60, 1)

    const fev = result.current.trends.find((t) => t.monthKey === '2025-02')
    expect(fev!.income).toBe(6000)
    expect(fev!.expenses).toBe(2500)
    expect(fev!.balance).toBe(3500)
  })

  it('separates fixed and variable expenses', () => {
    mockStore.transactions = [
      incomeTx(10000, '2025-01'),
      tx({ amount: 3000, section: 'despesas_fixas', category: Category.MORADIA, monthKey: '2025-01' }),
      tx({ amount: 1000, section: 'gastos_diarios', category: Category.ALIMENTACAO, monthKey: '2025-01' }),
    ]

    const { result } = renderHook(() => useAnnualData('2025-01'))

    const jan = result.current.trends.find((t) => t.monthKey === '2025-01')
    expect(jan!.fixedExpenses).toBe(3000)
    expect(jan!.variableExpenses).toBe(1000)
  })

  it('includes extraordinary income in trends', () => {
    mockStore.transactions = [incomeTx(5000, '2025-01')]
    mockStore.extraordinaryEntries = [
      { id: '1', type: 'bonus', grossAmount: 1000, tithePercent: 10, offeringPercent: 2, tithe: 100, offering: 20, netAmount: 880, monthKey: '2025-01' },
    ]

    const { result } = renderHook(() => useAnnualData('2025-01'))

    const jan = result.current.trends.find((t) => t.monthKey === '2025-01')
    expect(jan!.income).toBe(5880)
  })

  it('computes totals and averages', () => {
    // Create transactions for all 12 months so avg isn't diluted by zeros
    const months = ['2024-03', '2024-04', '2024-05', '2024-06', '2024-07',
                    '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
                    '2025-01', '2025-02']
    mockStore.transactions = months.flatMap((m) => [
      incomeTx(5000, m),
      tx({ amount: 2000, monthKey: m }),
    ])

    const { result } = renderHook(() => useAnnualData('2025-02'))

    expect(result.current.totalIncome).toBe(60000)
    expect(result.current.totalExpenses).toBe(24000)
    expect(result.current.avgSavingsRate).toBeCloseTo(60, 1)
  })

  it('identifies best and worst months', () => {
    mockStore.transactions = [
      incomeTx(10000, '2025-01'), tx({ amount: 1000, monthKey: '2025-01' }),
      tx({ amount: 500, monthKey: '2025-02' }), // negative balance: 0-500=-500
      incomeTx(7000, '2025-03'), tx({ amount: 6000, monthKey: '2025-03' }),
    ]

    const { result } = renderHook(() => useAnnualData('2025-03'))

    expect(result.current.bestMonth.monthKey).toBe('2025-01')
    expect(result.current.worstMonth.monthKey).toBe('2025-02')
  })

  it('only includes months in the 12-month window', () => {
    mockStore.transactions = [
      incomeTx(5000, '2024-01'),
      tx({ amount: 1000, monthKey: '2024-01' }),
    ]

    const { result } = renderHook(() => useAnnualData('2025-01'))

    const oldMonth = result.current.trends.find((t) => t.monthKey === '2024-01')
    expect(oldMonth).toBeUndefined()
  })
})
