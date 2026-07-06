import { describe, it, expect, vi, beforeEach } from 'vitest'
import { create } from 'zustand'

const mockAuthState = vi.hoisted(() => ({ user: { id: 'test-user' } }))

vi.mock('../financeStoreHelpers', () => ({
  getUserId: () => mockAuthState.user?.id ?? null,
  generateId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
  assertMonthNotClosed: (get: any, monthKey: string) => {
    const state = get()
    const settings = state.monthSettings?.[monthKey]
    if (settings?.isClosed) {
      throw new Error(`O mês ${monthKey} está fechado. Reabra-o para fazer alterações.`)
    }
  },
  checkBudgetAlert: vi.fn(),
  syncRemote: vi.fn(),
}))

import { createTransactionSlice } from './transactionSlice'
import type { TransactionSlice } from './transactionSlice'
import type { Transaction } from '../../types/transaction'
import { syncRemote } from '../financeStoreHelpers'

interface TestStore extends TransactionSlice {
  monthSettings: Record<string, any>
}

function tx(overrides: Partial<Transaction> = {}): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: 'expense',
    section: 'despesas_fixas',
    description: 'Test transaction',
    amount: 100,
    category: 'outros',
    date: '2025-03-15',
    monthKey: '2025-03',
    ...overrides,
  }
}

function createTestStore(initial?: Partial<TestStore>) {
  return create<TestStore>()((set, get) => ({
    ...createTransactionSlice(set, get),
    monthSettings: {},
    ...initial,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthState.user = { id: 'test-user' }
})

describe('addTransaction', () => {
  it('adds a transaction to the store', () => {
    const store = createTestStore()
    store.getState().addTransaction(tx({ description: 'Netflix' }))
    expect(store.getState().transactions).toHaveLength(1)
    expect(store.getState().transactions[0].description).toBe('Netflix')
  })

  it('fires syncRemote when user is logged in', () => {
    const store = createTestStore()
    store.getState().addTransaction(tx())
    expect(syncRemote).toHaveBeenCalled()
    expect(syncRemote).toHaveBeenCalledWith('upsertTransaction', 'test-user', expect.any(Object))
  })

  it('does not add when month is closed', () => {
    const store = createTestStore({
      monthSettings: { '2025-03': { isClosed: true } },
    })
    store.getState().addTransaction(tx())
    expect(store.getState().transactions).toHaveLength(0)
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('allows transaction on open month', () => {
    const store = createTestStore({
      monthSettings: { '2025-03': { isClosed: false } },
    })
    store.getState().addTransaction(tx())
    expect(store.getState().transactions).toHaveLength(1)
  })

  it('allows transaction when monthSettings does not include the month', () => {
    const store = createTestStore({
      monthSettings: { '2025-02': { isClosed: true } },
    })
    store.getState().addTransaction(tx({ monthKey: '2025-03' }))
    expect(store.getState().transactions).toHaveLength(1)
  })

  it('does not call syncRemote when user is not logged in', () => {
    mockAuthState.user = null
    const store = createTestStore()
    store.getState().addTransaction(tx())
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('adds multiple transactions independently', () => {
    const store = createTestStore()
    store.getState().addTransaction(tx({ description: 'First' }))
    store.getState().addTransaction(tx({ description: 'Second' }))
    expect(store.getState().transactions).toHaveLength(2)
  })
})

describe('addTransactions', () => {
  it('adds multiple transactions at once', () => {
    const store = createTestStore()
    store.getState().addTransactions([tx({ description: 'A' }), tx({ description: 'B' })])
    expect(store.getState().transactions).toHaveLength(2)
  })

  it('blocks when any month in the batch is closed', () => {
    const store = createTestStore({
      monthSettings: { '2025-04': { isClosed: true } },
    })
    store.getState().addTransactions([
      tx({ description: 'A', monthKey: '2025-03' }),
      tx({ description: 'B', monthKey: '2025-04' }),
    ])
    expect(store.getState().transactions).toHaveLength(0)
    expect(syncRemote).not.toHaveBeenCalled()
  })
})

describe('updateTransaction', () => {
  it('updates an existing transaction', () => {
    const store = createTestStore()
    store.getState().addTransaction(tx())
    const id = store.getState().transactions[0].id
    store.getState().updateTransaction(id, { amount: 200 })
    expect(store.getState().transactions[0].amount).toBe(200)
  })

  it('does nothing when id does not exist', () => {
    const store = createTestStore()
    store.getState().updateTransaction('non-existent', { amount: 200 })
    expect(store.getState().transactions).toHaveLength(0)
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('blocks when target month is closed', () => {
    const store = createTestStore({
      monthSettings: { '2025-03': { isClosed: false } },
    })
    store.getState().addTransaction(tx({ description: 'For update' }))
    store.getState().monthSettings = { '2025-03': { isClosed: true } }
    vi.clearAllMocks()
    store.getState().updateTransaction(store.getState().transactions[0].id, { amount: 500 })
    expect(store.getState().transactions[0].amount).toBe(100)
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('blocks when moving to a closed month', () => {
    const store = createTestStore({
      monthSettings: { '2025-03': { isClosed: false }, '2025-04': { isClosed: true } },
    })
    store.getState().addTransaction(tx())
    const id = store.getState().transactions[0].id
    vi.clearAllMocks()
    store.getState().updateTransaction(id, { monthKey: '2025-04' })
    expect(store.getState().transactions[0].monthKey).toBe('2025-03')
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('blocks when original month of a moved transaction is closed', () => {
    const store = createTestStore({
      monthSettings: { '2025-03': { isClosed: false } },
    })
    store.getState().addTransaction(tx())
    const id = store.getState().transactions[0].id
    store.getState().monthSettings = { '2025-03': { isClosed: true }, '2025-04': { isClosed: false } }
    vi.clearAllMocks()
    store.getState().updateTransaction(id, { monthKey: '2025-04' })
    expect(store.getState().transactions[0].monthKey).toBe('2025-03')
    expect(syncRemote).not.toHaveBeenCalled()
  })
})

describe('bulkUpdateTransactions', () => {
  it('updates multiple transactions', () => {
    const store = createTestStore()
    store.getState().addTransaction(tx({ description: 'A' }))
    store.getState().addTransaction(tx({ description: 'B' }))
    const ids = store.getState().transactions.map((t) => t.id)
    vi.clearAllMocks()
    store.getState().bulkUpdateTransactions(ids, { amount: 0 })
    expect(store.getState().transactions.every((t) => t.amount === 0)).toBe(true)
  })

  it('blocks when any target month is closed', () => {
    const store = createTestStore({
      monthSettings: { '2025-03': { isClosed: false }, '2025-04': { isClosed: true } },
    })
    store.getState().addTransaction(tx({ monthKey: '2025-03' }))
    store.getState().addTransaction(tx({ monthKey: '2025-03' }))
    const ids = store.getState().transactions.map((t) => t.id)
    vi.clearAllMocks()
    store.getState().bulkUpdateTransactions(ids, { monthKey: '2025-04' })
    expect(store.getState().transactions.every((t) => t.monthKey === '2025-03')).toBe(true)
  })
})

describe('deleteTransaction', () => {
  it('removes a transaction from the store', () => {
    const store = createTestStore()
    store.getState().addTransaction(tx())
    const id = store.getState().transactions[0].id
    vi.clearAllMocks()
    store.getState().deleteTransaction(id)
    expect(store.getState().transactions).toHaveLength(0)
  })

  it('does nothing for non-existent id', () => {
    const store = createTestStore()
    store.getState().deleteTransaction('non-existent')
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('blocks when month is closed', () => {
    const store = createTestStore({
      monthSettings: { '2025-03': { isClosed: false } },
    })
    store.getState().addTransaction(tx())
    const id = store.getState().transactions[0].id
    store.getState().monthSettings = { '2025-03': { isClosed: true } }
    vi.clearAllMocks()
    store.getState().deleteTransaction(id)
    expect(store.getState().transactions).toHaveLength(1)
    expect(syncRemote).not.toHaveBeenCalled()
  })
})

describe('addInstallmentTransactions', () => {
  const base = {
    type: 'expense' as const,
    section: 'despesas_fixas' as const,
    description: 'Curso',
    amount: 1000,
    category: 'educacao',
    date: '2025-03-15',
  }

  it('creates the correct number of installments', () => {
    const store = createTestStore()
    store.getState().addInstallmentTransactions(base, 6, undefined)
    expect(store.getState().transactions).toHaveLength(6)
  })

  it('assigns correct installment numbers', () => {
    const store = createTestStore()
    store.getState().addInstallmentTransactions(base, 3, undefined)
    expect(store.getState().transactions[0].installmentCurrent).toBe(1)
    expect(store.getState().transactions[1].installmentCurrent).toBe(2)
    expect(store.getState().transactions[2].installmentCurrent).toBe(3)
  })

  it('generates a shared installmentGroupId', () => {
    const store = createTestStore()
    store.getState().addInstallmentTransactions(base, 3, undefined)
    const groupId = store.getState().transactions[0].installmentGroupId
    expect(groupId).toBeDefined()
    expect(store.getState().transactions.every((t) => t.installmentGroupId === groupId)).toBe(true)
  })

  it('blocks when any installment month is closed', () => {
    const store = createTestStore({
      monthSettings: { '2025-04': { isClosed: true } },
    })
    store.getState().addInstallmentTransactions({ ...base, date: '2025-03-01' }, 12, undefined)
    expect(store.getState().transactions).toHaveLength(0)
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('calculates monthKey with billing cycle', () => {
    const store = createTestStore()
    store.getState().addInstallmentTransactions({ ...base, date: '2025-03-10' }, 1, 15)
    expect(store.getState().transactions[0].monthKey).toBe('2025-03')
  })

  it('calculates monthKey with billing cycle pushing to next month', () => {
    const store = createTestStore()
    store.getState().addInstallmentTransactions({ ...base, date: '2025-03-20' }, 1, 15)
    expect(store.getState().transactions[0].monthKey).toBe('2025-04')
  })

  it('uses due day to place installments in the payment month', () => {
    const store = createTestStore()
    store.getState().addInstallmentTransactions({ ...base, date: '2025-06-15' }, 1, 30, 10)
    expect(store.getState().transactions[0].monthKey).toBe('2025-07')
  })
})

describe('getTransactionsForMonth', () => {
  it('returns only transactions for the given month', () => {
    const store = createTestStore()
    store.getState().addTransaction(tx({ description: 'Mar', monthKey: '2025-03' }))
    store.getState().addTransaction(tx({ description: 'Apr', monthKey: '2025-04' }))
    expect(store.getState().getTransactionsForMonth('2025-03')).toHaveLength(1)
    expect(store.getState().getTransactionsForMonth('2025-03')[0].description).toBe('Mar')
  })

  it('returns empty for months with no transactions', () => {
    const store = createTestStore()
    store.getState().addTransaction(tx())
    expect(store.getState().getTransactionsForMonth('2025-01')).toHaveLength(0)
  })
})
