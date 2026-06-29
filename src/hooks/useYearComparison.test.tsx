import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useYearComparison } from './useYearComparison'
import { Category } from '../types/category'
import type { Transaction, ExtraordinaryEntry } from '../types/transaction'

const mockStore = vi.hoisted(() => ({
  transactions: [] as Transaction[],
  extraordinaryEntries: [] as ExtraordinaryEntry[],
  appSettings: {
    defaultSavingsGoalPercent: 20,
    cardSections: [
      { id: 'cartao_x', label: 'Cartão X', closingDay: 10, dueDay: 20 },
    ],
    defaultSectionLimits: {},
    defaultTithePercent: 10,
    defaultOfferingPercent: 2,
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

describe('useYearComparison', () => {
  it('returns zero stats when no transactions exist', () => {
    const { result } = renderHook(() => useYearComparison(2025, 2024))

    expect(result.current.statsA.income).toBe(0)
    expect(result.current.statsA.expenses).toBe(0)
    expect(result.current.statsB.income).toBe(0)
    expect(result.current.statsB.expenses).toBe(0)
    expect(result.current.monthlyTrends).toHaveLength(12)
    expect(result.current.categoryComparison).toHaveLength(0)
    expect(result.current.insights).toHaveLength(0)
    expect(result.current.availableYears).toEqual([])
  })

  it('computes year stats correctly', () => {
    mockStore.transactions = [
      incomeTx(6000, '2025-01'),
      incomeTx(6000, '2025-02'),
      tx({ amount: 2000, monthKey: '2025-01', category: Category.MORADIA }),
      tx({ amount: 1500, monthKey: '2025-02', category: Category.MORADIA }),
      incomeTx(5000, '2024-01'),
      tx({ amount: 1800, monthKey: '2024-01', category: Category.MORADIA }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    expect(result.current.statsA.income).toBe(12000)
    expect(result.current.statsA.expenses).toBe(3500)
    expect(result.current.statsA.balance).toBe(8500)
    expect(result.current.statsB.income).toBe(5000)
    expect(result.current.statsB.expenses).toBe(1800)
    expect(result.current.statsB.balance).toBe(3200)
    expect(result.current.availableYears).toEqual([2025, 2024])
  })

  it('builds monthly comparison data for 12 months', () => {
    mockStore.transactions = [
      incomeTx(5000, '2025-01'),
      incomeTx(5000, '2025-02'),
      tx({ amount: 1000, monthKey: '2025-01' }),
      tx({ amount: 2000, monthKey: '2025-02' }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    expect(result.current.monthlyTrends).toHaveLength(12)
    const jan = result.current.monthlyTrends.find((m) => m.month === 1)
    expect(jan).toBeDefined()
    expect(jan!.year1Income).toBe(5000)
    expect(jan!.year1Expenses).toBe(1000)
    expect(jan!.year1Balance).toBe(4000)

    const fev = result.current.monthlyTrends.find((m) => m.month === 2)
    expect(fev!.year1Income).toBe(5000)
    expect(fev!.year1Expenses).toBe(2000)
  })

  it('categories comparison sorts by year1 total descending', () => {
    mockStore.transactions = [
      incomeTx(10000, '2025-01'),
      tx({ amount: 3000, monthKey: '2025-01', category: Category.MORADIA }),
      tx({ amount: 1000, monthKey: '2025-01', category: Category.ALIMENTACAO }),
      tx({ amount: 2000, monthKey: '2024-01', category: Category.MORADIA }),
      tx({ amount: 800, monthKey: '2024-01', category: Category.ALIMENTACAO }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    expect(result.current.categoryComparison).toHaveLength(2)
    expect(result.current.categoryComparison[0].category).toBe(Category.MORADIA)
    expect(result.current.categoryComparison[0].year1Total).toBe(3000)
    expect(result.current.categoryComparison[0].year2Total).toBe(2000)
    expect(result.current.categoryComparison[0].delta).toBe(1000)
  })

  it('generates income increase insight', () => {
    mockStore.transactions = [
      incomeTx(6000, '2025-01'),
      incomeTx(5000, '2024-01'),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    const insight = result.current.insights.find((i) => i.id === 'year-income-change')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('success')
    expect(insight!.title).toContain('cresceu')
  })

  it('generates income decrease insight', () => {
    mockStore.transactions = [
      incomeTx(4000, '2025-01'),
      incomeTx(6000, '2024-01'),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    const insight = result.current.insights.find((i) => i.id === 'year-income-change')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('warning')
    expect(insight!.title).toContain('caiu')
  })

  it('generates expense increase insight', () => {
    mockStore.transactions = [
      incomeTx(10000, '2025-01'),
      incomeTx(10000, '2024-01'),
      tx({ amount: 3000, monthKey: '2025-01' }),
      tx({ amount: 1000, monthKey: '2024-01' }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    const insight = result.current.insights.find((i) => i.id === 'year-expense-change')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('warning')
    expect(insight!.title).toContain('aumentaram')
  })

  it('generates expense decrease insight', () => {
    mockStore.transactions = [
      incomeTx(10000, '2025-01'),
      incomeTx(10000, '2024-01'),
      tx({ amount: 1000, monthKey: '2025-01' }),
      tx({ amount: 3000, monthKey: '2024-01' }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    const insight = result.current.insights.find((i) => i.id === 'year-expense-change')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('success')
    expect(insight!.title).toContain('reduziram')
  })

  it('generates savings rate improvement insight', () => {
    mockStore.transactions = [
      incomeTx(10000, '2025-01'),
      incomeTx(5000, '2024-01'),
      tx({ amount: 1000, monthKey: '2025-01' }),
      tx({ amount: 4000, monthKey: '2024-01' }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    const insight = result.current.insights.find((i) => i.id === 'year-savings-rate')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('success')
    expect(insight!.title).toContain('melhorou')
  })

  it('generates savings rate decline insight', () => {
    mockStore.transactions = [
      incomeTx(5000, '2025-01'),
      incomeTx(10000, '2024-01'),
      tx({ amount: 4000, monthKey: '2025-01' }),
      tx({ amount: 1000, monthKey: '2024-01' }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    const insight = result.current.insights.find((i) => i.id === 'year-savings-rate')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('warning')
    expect(insight!.title).toContain('caiu')
  })

  it('generates category increase insight', () => {
    mockStore.transactions = [
      incomeTx(10000, '2025-01'),
      incomeTx(10000, '2024-01'),
      tx({ amount: 5000, monthKey: '2025-01', category: Category.MORADIA }),
      tx({ amount: 1000, monthKey: '2024-01', category: Category.MORADIA }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    const insight = result.current.insights.find((i) => i.id === 'year-cat-increase')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('warning')
    expect(insight!.category).toBe(Category.MORADIA)
  })

  it('generates category decrease insight', () => {
    mockStore.transactions = [
      incomeTx(10000, '2025-01'),
      incomeTx(10000, '2024-01'),
      tx({ amount: 1000, monthKey: '2025-01', category: Category.MORADIA }),
      tx({ amount: 5000, monthKey: '2024-01', category: Category.MORADIA }),
    ]

    const { result } = renderHook(() => useYearComparison(2025, 2024))

    const insight = result.current.insights.find((i) => i.id === 'year-cat-decrease')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('success')
    expect(insight!.category).toBe(Category.MORADIA)
  })
})
