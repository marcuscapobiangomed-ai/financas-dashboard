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
  syncRemote: vi.fn(),
}))

import { createInvestmentSlice } from './investmentSlice'
import type { InvestmentSlice } from './investmentSlice'
import type { Investment } from '../../types/investment'
import { syncRemote } from '../financeStoreHelpers'

interface TestStore extends InvestmentSlice {
  appSettings: { cdiRateAnnual: number; ipcaRateAnnual: number }
  transactions: any[]
  monthSettings: Record<string, any>
}

function investment(
  overrides: Partial<Investment> = {},
): Omit<Investment, 'id'> {
  return {
    name: 'CDB Banco X',
    principal: 10000,
    monthlyYieldPercent: 1.0,
    startMonth: '2025-01',
    isActive: true,
    investmentType: 'cdb',
    cdiPercent: 100,
    ...overrides,
  }
}

function createTestStore(initial?: Partial<TestStore>) {
  return create<TestStore>()((set, get) => ({
    ...createInvestmentSlice(set, get),
    appSettings: { cdiRateAnnual: 14.15, ipcaRateAnnual: 5.0 },
    transactions: [],
    monthSettings: {},
    ...initial,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthState.user = { id: 'test-user' }
})

describe('addInvestment', () => {
  it('adds an investment to the store', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({ name: 'LCI Inter' }))
    expect(store.getState().investments).toHaveLength(1)
    expect(store.getState().investments[0].name).toBe('LCI Inter')
  })

  it('resolves monthlyYieldPercent via CDI rate', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({
      investmentType: 'cdb',
      cdiPercent: 100,
      monthlyYieldPercent: 0,
    }))
    const inv = store.getState().investments[0]
    expect(inv.monthlyYieldPercent).toBeGreaterThan(0)
    expect(inv.monthlyYieldPercent).toBeLessThan(2)
  })

  it('generates an id', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    expect(store.getState().investments[0].id).toBeDefined()
    expect(store.getState().investments[0].id.length).toBeGreaterThan(0)
  })

  it('calls syncRemote when user is logged in', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    expect(syncRemote).toHaveBeenCalled()
    expect(syncRemote).toHaveBeenCalledWith('upsertInvestment', 'test-user', expect.any(Object))
  })

  it('does not call syncRemote when user is not logged in', () => {
    mockAuthState.user = null
    const store = createTestStore()
    store.getState().addInvestment(investment())
    expect(syncRemote).not.toHaveBeenCalled()
  })
})

describe('updateInvestment', () => {
  it('updates an existing investment', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    const id = store.getState().investments[0].id
    store.getState().updateInvestment(id, { name: 'Updated' })
    expect(store.getState().investments[0].name).toBe('Updated')
  })

  it('re-resolves monthlyYieldPercent on update', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({
      investmentType: 'cdb',
      cdiPercent: 100,
      monthlyYieldPercent: 0,
    }))
    const id = store.getState().investments[0].id
    const oldYield = store.getState().investments[0].monthlyYieldPercent
    store.getState().updateInvestment(id, { cdiPercent: 200 })
    expect(store.getState().investments[0].monthlyYieldPercent).not.toBe(oldYield)
  })

  it('does nothing for non-existent id', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    vi.clearAllMocks()
    store.getState().updateInvestment('non-existent', { name: 'Nope' })
    expect(store.getState().investments).toHaveLength(1)
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('calls syncRemote on update', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    vi.clearAllMocks()
    const id = store.getState().investments[0].id
    store.getState().updateInvestment(id, { name: 'Updated' })
    expect(syncRemote).toHaveBeenCalledWith('upsertInvestment', 'test-user', expect.objectContaining({ name: 'Updated' }))
  })

  it('does not sync when user is not logged in', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    const id = store.getState().investments[0].id
    mockAuthState.user = null
    vi.clearAllMocks()
    store.getState().updateInvestment(id, { name: 'No sync' })
    expect(syncRemote).not.toHaveBeenCalled()
  })
})

describe('deleteInvestment', () => {
  it('removes an investment from the store', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    const id = store.getState().investments[0].id
    store.getState().deleteInvestment(id)
    expect(store.getState().investments).toHaveLength(0)
  })

  it('does nothing for non-existent id', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    vi.clearAllMocks()
    store.getState().deleteInvestment('non-existent')
    expect(store.getState().investments).toHaveLength(1)
    expect(syncRemote).not.toHaveBeenCalled()
  })

  it('calls syncRemote with deleteInvestmentRemote', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    const id = store.getState().investments[0].id
    vi.clearAllMocks()
    store.getState().deleteInvestment(id)
    expect(syncRemote).toHaveBeenCalledWith('deleteInvestmentRemote', id)
  })

  it('does not sync when user is not logged in', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment())
    const id = store.getState().investments[0].id
    mockAuthState.user = null
    vi.clearAllMocks()
    store.getState().deleteInvestment(id)
    expect(syncRemote).not.toHaveBeenCalled()
  })
})

describe('applyInvestmentYieldsToMonth', () => {
  it('creates yield transactions for active investments before the month', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({
      investmentType: 'manual',
      startMonth: '2025-01',
      principal: 10000,
      monthlyYieldPercent: 1.0,
    }))
    const count = store.getState().applyInvestmentYieldsToMonth('2025-03')
    expect(count).toBe(1)
    expect(store.getState().transactions).toHaveLength(1)
    expect(store.getState().transactions[0].description).toContain('CDB Banco X')
    expect(store.getState().transactions[0].amount).toBe(100)
    expect(store.getState().transactions[0].tags).toContain('investment-yield')
  })

  it('skips investments that start after the target month', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({ startMonth: '2025-04' }))
    const count = store.getState().applyInvestmentYieldsToMonth('2025-03')
    expect(count).toBe(0)
    expect(store.getState().transactions).toHaveLength(0)
  })

  it('skips inactive investments', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({ isActive: false }))
    const count = store.getState().applyInvestmentYieldsToMonth('2025-03')
    expect(count).toBe(0)
  })

  it('does not duplicate yields already applied', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({ startMonth: '2025-01' }))
    store.getState().applyInvestmentYieldsToMonth('2025-03')
    const count2 = store.getState().applyInvestmentYieldsToMonth('2025-03')
    expect(count2).toBe(0)
    expect(store.getState().transactions).toHaveLength(1)
  })

  it('returns 0 and warns when month is closed', () => {
    const store = createTestStore({
      monthSettings: { '2025-03': { isClosed: true } },
    })
    store.getState().addInvestment(investment({ startMonth: '2025-01' }))
    const count = store.getState().applyInvestmentYieldsToMonth('2025-03')
    expect(count).toBe(0)
    expect(store.getState().transactions).toHaveLength(0)
  })

  it('calculates correct yield amount', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({
      investmentType: 'manual',
      startMonth: '2025-01',
      principal: 50000,
      monthlyYieldPercent: 0.8,
    }))
    store.getState().applyInvestmentYieldsToMonth('2025-03')
    expect(store.getState().transactions[0].amount).toBe(400)
  })

  it('syncs created transactions via bulkUpsertTransactions', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({ startMonth: '2025-01' }))
    vi.clearAllMocks()
    store.getState().applyInvestmentYieldsToMonth('2025-03')
    expect(syncRemote).toHaveBeenCalledWith('bulkUpsertTransactions', 'test-user', expect.any(Array))
  })

  it('does not sync when no yields were applied', () => {
    const store = createTestStore()
    store.getState().addInvestment(investment({ startMonth: '2025-04' }))
    vi.clearAllMocks()
    store.getState().applyInvestmentYieldsToMonth('2025-03')
    expect(syncRemote).not.toHaveBeenCalled()
  })
})
