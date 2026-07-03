import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAnalytics } from './useAnalytics'
import { Category } from '../types/category'
import type { Transaction, ExtraordinaryEntry } from '../types/transaction'

const MONTH_KEY = '2025-01'

const mockStore = vi.hoisted(() => ({
  transactions: [] as Transaction[],
  extraordinaryEntries: [] as ExtraordinaryEntry[],
  appSettings: {
    defaultSavingsGoalPercent: 20,
    defaultTithePercent: 10,
    defaultOfferingPercent: 2,
    cardSections: [
      { id: 'cartao_x', label: 'Cartão X', closingDay: 10, dueDay: 20 },
    ],
    defaultSectionLimits: {},
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
    monthKey: MONTH_KEY,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function incomeTx(overrides: Partial<Transaction> = {}): Transaction {
  return tx({ type: 'income', section: 'entradas', category: Category.ENTRADAS, amount: 5000, ...overrides })
}

function extraordinary(overrides: Partial<ExtraordinaryEntry> = {}): ExtraordinaryEntry {
  return {
    id: crypto.randomUUID(),
    type: 'bonus',
    grossAmount: 1000,
    tithePercent: 10,
    offeringPercent: 2,
    tithe: 100,
    offering: 20,
    netAmount: 880,
    monthKey: MONTH_KEY,
    ...overrides,
  }
}

beforeEach(() => {
  mockStore.transactions = []
  mockStore.extraordinaryEntries = []
})

describe('useAnalytics', () => {
  it('returns empty state when no transactions exist', () => {
    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    expect(result.current.summary.income).toBe(0)
    expect(result.current.summary.expenses).toBe(0)
    expect(result.current.summary.balance).toBe(0)
    expect(result.current.categoryBreakdowns).toHaveLength(0)
    expect(result.current.insights).toHaveLength(0)
    expect(result.current.projection).toBeNull()
  })

  it('computes category breakdowns correctly', () => {
    mockStore.transactions = [
      tx({ category: Category.MORADIA, amount: 1500, section: 'despesas_fixas' }),
      tx({ category: Category.SUPERMERCADO, amount: 800, section: 'gastos_diarios' }),
      tx({ category: Category.MORADIA, amount: 500, section: 'despesas_fixas' }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    expect(result.current.summary.expenses).toBe(2800)
    expect(result.current.categoryBreakdowns).toHaveLength(2)

    const moradia = result.current.categoryBreakdowns.find((c) => c.category === Category.MORADIA)
    expect(moradia).toBeDefined()
    expect(moradia!.total).toBe(2000)
    expect(moradia!.percentage).toBeCloseTo(71.43, 1)
  })

  it('computes income and balance correctly', () => {
    mockStore.transactions = [
      incomeTx({ amount: 5000 }),
      tx({ category: Category.MORADIA, amount: 1500 }),
      tx({ category: Category.ALIMENTACAO, amount: 600 }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    expect(result.current.summary.income).toBe(5000)
    expect(result.current.summary.expenses).toBe(2100)
    expect(result.current.summary.balance).toBe(2900)
    expect(result.current.summary.savingsRate).toBeCloseTo(58, 1)
  })

  it('includes extraordinary income in total income', () => {
    mockStore.transactions = [incomeTx({ amount: 3000 })]
    mockStore.extraordinaryEntries = [extraordinary({ netAmount: 880 })]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    expect(result.current.summary.income).toBe(3880)
  })

  it('generates savings-on-track insight when rate meets goal', () => {
    mockStore.transactions = [
      incomeTx({ amount: 10000 }),
      tx({ amount: 3000 }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    const insight = result.current.insights.find((i) => i.id === 'savings-on-track')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('success')
  })

  it('generates savings-below-goal insight when rate is below goal', () => {
    mockStore.transactions = [
      incomeTx({ amount: 5000 }),
      tx({ amount: 4500 }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    const insight = result.current.insights.find((i) => i.id === 'savings-below-goal')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('warning')
  })

  it('generates top-category insight', () => {
    mockStore.transactions = [
      incomeTx({ amount: 10000 }),
      tx({ category: Category.MORADIA, amount: 3000 }),
      tx({ category: Category.ALIMENTACAO, amount: 1000 }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    const insight = result.current.insights.find((i) => i.id === 'top-category')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('Moradia')
  })

  it('detects trending up categories', () => {
    const prevKey = '2024-12'
    const currentKey = '2025-01'
    mockStore.transactions = [
      incomeTx({ amount: 10000, monthKey: currentKey }),
      tx({ category: Category.ALIMENTACAO, amount: 100, monthKey: prevKey }),
      tx({ category: Category.ALIMENTACAO, amount: 500, monthKey: currentKey }),
    ]

    const { result } = renderHook(() => useAnalytics(currentKey))

    const insight = result.current.insights.find((i) => i.id === 'trend-up')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('subiu')
  })

  it('detects trending down categories', () => {
    const prevKey = '2024-12'
    const currentKey = '2025-01'
    mockStore.transactions = [
      incomeTx({ amount: 10000, monthKey: currentKey }),
      tx({ category: Category.ALIMENTACAO, amount: 500, monthKey: prevKey }),
      tx({ category: Category.ALIMENTACAO, amount: 100, monthKey: currentKey }),
    ]

    const { result } = renderHook(() => useAnalytics(currentKey))

    const insight = result.current.insights.find((i) => i.id === 'trend-down')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('caiu')
  })

  it('detects spending above 12-month average', () => {
    const currentKey = '2025-01'
    const keys = ['2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07',
                  '2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01']
    mockStore.transactions = [
      incomeTx({ amount: 10000, monthKey: currentKey }),
      // Low spending in 11 previous months
      ...keys.slice(0, -1).map((k) => tx({ category: Category.MORADIA, amount: 100, section: 'despesas_fixas', monthKey: k })),
      // High spending in current month
      tx({ category: Category.MORADIA, amount: 500, section: 'despesas_fixas', monthKey: currentKey }),
    ]

    const { result } = renderHook(() => useAnalytics(currentKey))

    const insight = result.current.insights.find((i) => i.id === 'above-avg')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('tip')
  })

  it('detects high fixed expense ratio', () => {
    mockStore.transactions = [
      incomeTx({ amount: 10000 }),
      tx({ amount: 4000, section: 'despesas_fixas', category: Category.MORADIA }),
      tx({ amount: 500, section: 'gastos_diarios', category: Category.ALIMENTACAO }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    const insight = result.current.insights.find((i) => i.id === 'high-fixed')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('% dos gastos são fixos')
  })

  it('identifies current month as best month when applicable', () => {
    const keys = ['2024-03', '2024-04', '2024-05']
    const currentKey = '2025-01'

    mockStore.transactions = [
      // Best savings in current month
      incomeTx({ amount: 10000, monthKey: currentKey }),
      tx({ amount: 1000, monthKey: currentKey }),
      // Worse savings in previous months
      ...keys.map((k) => incomeTx({ amount: 5000, monthKey: k })),
      ...keys.map((k) => tx({ amount: 4000, monthKey: k })),
    ]

    const { result } = renderHook(() => useAnalytics(currentKey))

    const insight = result.current.insights.find((i) => i.id === 'best-month')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('success')
    expect(insight!.title).toContain('melhor mês')
  })

  it('generates projection data when historical data exists', () => {
    const keys = ['2024-03', '2024-04', '2024-05']
    mockStore.transactions = [
      ...keys.map((k) => incomeTx({ amount: 6000, monthKey: k })),
      ...keys.map((k) => tx({ amount: 2500, monthKey: k })),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    expect(result.current.projection).not.toBeNull()
    expect(result.current.projection!.avgMonthlyIncome).toBeCloseTo(6000, 0)
    expect(result.current.projection!.avgMonthlyExpense).toBeCloseTo(2500, 0)
    expect(result.current.projection!.projectedYearIncome).toBeCloseTo(72000, 0)
    expect(result.current.projection!.projectedYearSavings).toBeCloseTo(42000, 0)
    expect(result.current.projection!.avgSavingsRate).toBeGreaterThan(0)
  })

  it('generates overspend projection when expenses exceed income', () => {
    mockStore.transactions = [
      incomeTx({ amount: 3000 }),
      tx({ amount: 3500 }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    const insight = result.current.insights.find((i) => i.id === 'overspend-projection')
    expect(insight).toBeDefined()
    expect(insight!.type).toBe('warning')
  })

  it('computes summary deltas compared to previous month', () => {
    const prevKey = '2024-12'
    mockStore.transactions = [
      incomeTx({ amount: 5000, monthKey: prevKey }),
      incomeTx({ amount: 6000, monthKey: MONTH_KEY }),
      tx({ amount: 2000, monthKey: prevKey }),
      tx({ amount: 2500, monthKey: MONTH_KEY }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    expect(result.current.summary.incomeDelta).toBeCloseTo(20, 0)
    expect(result.current.summary.expensesDelta).toBeCloseTo(25, 0)
  })

  it('handles previous month with zero income gracefully', () => {
    mockStore.transactions = [
      incomeTx({ amount: 5000, monthKey: MONTH_KEY }),
      tx({ amount: 500, monthKey: MONTH_KEY }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    expect(result.current.summary.incomeDelta).toBe(0)
    expect(result.current.summary.expensesDelta).toBe(0)
  })

  it('uses card sections for expense filtering', () => {
    mockStore.appSettings.cardSections = [
      { id: 'cartao_x', label: 'Cartão X', closingDay: 10, dueDay: 20 },
    ]
    mockStore.transactions = [
      incomeTx({ amount: 10000 }),
      tx({ amount: 500, section: 'despesas_fixas', category: Category.MORADIA }),
      tx({ amount: 300, section: 'cartao_x', category: Category.ALIMENTACAO }),
    ]

    const { result } = renderHook(() => useAnalytics(MONTH_KEY))

    expect(result.current.summary.expenses).toBe(800)
    expect(result.current.categoryBreakdowns).toHaveLength(2)
  })
})
