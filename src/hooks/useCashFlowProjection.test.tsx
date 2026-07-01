import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCashFlowProjection } from './useCashFlowProjection'
import { Category } from '../types/category'
import type { Transaction, ExtraordinaryEntry, RecurringTemplate } from '../types/transaction'

const mockStore = vi.hoisted(() => ({
  transactions: [] as Transaction[],
  extraordinaryEntries: [] as ExtraordinaryEntry[],
  recurringTemplates: [] as RecurringTemplate[],
  appSettings: {
    initialBalance: 1000,
    defaultSavingsGoalPercent: 20,
    cardSections: [{ id: 'cartao_x', label: 'Cartão X', closingDay: 10, dueDay: 20 }],
    defaultSectionLimits: {},
    defaultTithePercent: 10,
    defaultOfferingPercent: 2,
    darkMode: false,
    alertThresholdPercent: 80,
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
    date: '2026-06-15',
    monthKey: '2026-06',
    createdAt: '',
    updatedAt: '',
    isPaid: true,
    ...overrides,
  }
}

function incomeTx(amount: number, monthKey: string): Transaction {
  return tx({ type: 'income', section: 'entradas', category: Category.ENTRADAS, amount, monthKey })
}

function recurringTmpl(overrides: Partial<RecurringTemplate> = {}): RecurringTemplate {
  return {
    id: crypto.randomUUID(),
    description: 'Aluguel',
    amount: 1500,
    category: Category.MORADIA,
    section: 'despesas_fixas',
    isActive: true,
    startMonth: '2026-01',
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-15'))
  mockStore.transactions = []
  mockStore.extraordinaryEntries = []
  mockStore.recurringTemplates = []
  mockStore.appSettings.initialBalance = 1000
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCashFlowProjection', () => {
  it('returns initial balance when no data exists', () => {
    mockStore.appSettings.initialBalance = 500
    const { result } = renderHook(() => useCashFlowProjection(3))

    expect(result.current.initialBalance).toBe(500)
    expect(result.current.currentBalance).toBe(500)
    expect(result.current.totalPastIncome).toBe(0)
    expect(result.current.totalPastExpenses).toBe(0)
    expect(result.current.months.length).toBeGreaterThan(0)
    expect(result.current.months[0].accumulatedBalance).toBe(500)
  })

  it('computes accumulated balance from transactions', () => {
    mockStore.transactions = [
      incomeTx(10000, '2026-05'),
      tx({ amount: 4000, monthKey: '2026-05' }),
    ]

    const { result } = renderHook(() => useCashFlowProjection(3))

    expect(result.current.initialBalance).toBe(1000)
    expect(result.current.totalPastIncome).toBe(10000)
    expect(result.current.totalPastExpenses).toBe(4000)

    const may = result.current.months.find((m) => m.monthKey === '2026-05')
    expect(may).toBeDefined()
    expect(may!.income).toBe(10000)
    expect(may!.expenses).toBe(4000)
    expect(may!.balance).toBe(6000)
    expect(may!.accumulatedBalance).toBe(7000) // 1000 + 6000
  })

  it('includes extraordinary entries in income', () => {
    mockStore.transactions = [incomeTx(5000, '2026-05')]
    mockStore.extraordinaryEntries = [
      { id: '1', type: 'bonus', grossAmount: 2000, tithePercent: 10, offeringPercent: 2, tithe: 200, offering: 40, netAmount: 1760, monthKey: '2026-05' },
    ]

    const { result } = renderHook(() => useCashFlowProjection(3))

    const may = result.current.months.find((m) => m.monthKey === '2026-05')
    expect(may!.income).toBe(6760)
  })

  it('projects future months using recurring templates', () => {
    mockStore.appSettings.initialBalance = 0
    mockStore.recurringTemplates = [
      recurringTmpl({ description: 'Aluguel', amount: 2000, category: Category.MORADIA, section: 'despesas_fixas' }),
      recurringTmpl({ description: 'Salário', amount: 8000, category: Category.ENTRADAS, section: 'entradas' }),
    ]

    const { result } = renderHook(() => useCashFlowProjection(3))

    // All months should be projected (no actual transactions)
    const projected = result.current.months.filter((m) => m.isProjected)
    expect(projected.length).toBeGreaterThan(0)

    // Each projected month should have income=8000, expenses=2000, balance=6000
    projected.forEach((m) => {
      expect(m.income).toBe(8000)
      expect(m.expenses).toBe(2000)
      expect(m.balance).toBe(6000)
    })

    // Running balance should accumulate
    expect(result.current.totalFutureIncome).toBeGreaterThan(0)
    expect(result.current.totalFutureExpenses).toBeGreaterThan(0)

    // Each month accumulates
    let expectedAccum = 0
    result.current.months.forEach((m, i) => {
      expectedAccum += m.balance
      expect(m.accumulatedBalance).toBeCloseTo(expectedAccum)
    })
  })

  it('respects recurring template endMonth', () => {
    mockStore.appSettings.initialBalance = 0
    mockStore.recurringTemplates = [
      recurringTmpl({ description: 'Assinatura', amount: 50, section: 'despesas_fixas', category: Category.ASSINATURAS, startMonth: '2026-01', endMonth: '2026-07' }),
    ]

    const { result } = renderHook(() => useCashFlowProjection(12))

    const afterEnd = result.current.months.filter((m) => m.monthKey > '2026-07')
    afterEnd.forEach((m) => {
      expect(m.expenses).toBe(0)
    })
  })

  it('respects recurring template installment limits', () => {
    mockStore.appSettings.initialBalance = 0
    mockStore.recurringTemplates = [
      recurringTmpl({
        description: 'Curso',
        amount: 300,
        section: 'despesas_fixas',
        category: Category.EDUCACAO,
        startMonth: '2026-06',
        installmentTotal: 3,
      }),
    ]

    const { result } = renderHook(() => useCashFlowProjection(12))

    // Debug: print all months
    const months = result.current.months.map((m) => `${m.monthKey}(proj=${m.isProjected},exp=${m.expenses})`).join(', ')

    // Current month (June) — has no transactions, but is not projected
    const jun = result.current.months.find((m) => m.monthKey === '2026-06')!
    expect([jun.isProjected, jun.expenses]).toEqual([false, 0])

    // July onwards should be projected
    const jul = result.current.months.find((m) => m.monthKey === '2026-07')!
    expect(jul.isProjected).toBe(true)

    // Template: start June, 3 installments → diff 0,1,2 → June, July, August
    // June is current month (not projected), so only July/Aug get the expense
    expect([jul.monthKey, jul.expenses]).toEqual(['2026-07', 300])

    const aug = result.current.months.find((m) => m.monthKey === '2026-08')
    if (aug) {
      expect([aug.monthKey, aug.expenses]).toEqual(['2026-08', 300])
    }

    // September: diff=3, >=3 → doesn't apply
    const sep = result.current.months.find((m) => m.monthKey === '2026-09')
    if (sep) {
      expect(sep.expenses).toBe(0)
    }
  })

  it('marks current month correctly', () => {
    const { result } = renderHook(() => useCashFlowProjection(3))

    const current = result.current.months.find((m) => m.isCurrentMonth)
    expect(current).toBeDefined()
    expect(current!.isProjected).toBe(false)
  })

  it('shows mixed past/projected data correctly', () => {
    mockStore.appSettings.initialBalance = 2000
    mockStore.transactions = [
      incomeTx(5000, '2026-04'),
      tx({ amount: 2000, monthKey: '2026-04' }),
    ]
    mockStore.recurringTemplates = [
      recurringTmpl({ description: 'Salário', amount: 5000, section: 'entradas', category: Category.ENTRADAS }),
    ]

    const { result } = renderHook(() => useCashFlowProjection(6))

    const april = result.current.months.find((m) => m.monthKey === '2026-04')!
    expect(april.isProjected).toBe(false)
    expect(april.income).toBe(5000)
    expect(april.expenses).toBe(2000)
    expect(april.accumulatedBalance).toBe(5000) // 2000 + 3000

    const futureProj = result.current.months.filter((m) => m.isProjected)
    expect(futureProj.length).toBeGreaterThan(0)
    futureProj.forEach((m) => {
      expect(m.income).toBe(5000)
      expect(m.expenses).toBe(0)
    })
  })

  it('handles income-type recurring templates correctly', () => {
    mockStore.appSettings.initialBalance = 0
    mockStore.recurringTemplates = [
      recurringTmpl({ description: 'Freela', amount: 3000, section: 'entradas', category: Category.ENTRADAS }),
    ]

    const { result } = renderHook(() => useCashFlowProjection(3))

    result.current.months.filter((m) => m.isProjected).forEach((m) => {
      expect(m.income).toBe(3000)
      expect(m.expenses).toBe(0)
    })
  })

  it('ignores inactive recurring templates', () => {
    mockStore.appSettings.initialBalance = 0
    mockStore.recurringTemplates = [
      recurringTmpl({ description: 'Cancelado', amount: 500, section: 'despesas_fixas', category: Category.ASSINATURAS, isActive: false }),
    ]

    const { result } = renderHook(() => useCashFlowProjection(3))

    result.current.months.filter((m) => m.isProjected).forEach((m) => {
      expect(m.expenses).toBe(0)
    })
  })

  it('handles multiple transactions in same month', () => {
    mockStore.appSettings.initialBalance = 0
    mockStore.transactions = [
      incomeTx(8000, '2026-05'),
      tx({ amount: 1500, monthKey: '2026-05' }),
      tx({ amount: 600, monthKey: '2026-05', category: Category.ALIMENTACAO, section: 'gastos_diarios' }),
      tx({ amount: 400, monthKey: '2026-05', category: Category.TRANSPORTE, section: 'gastos_diarios' }),
    ]

    const { result } = renderHook(() => useCashFlowProjection(3))

    const may = result.current.months.find((m) => m.monthKey === '2026-05')!
    expect(may.income).toBe(8000)
    expect(may.expenses).toBe(2500)
    expect(may.balance).toBe(5500)
  })
})
