import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { create } from 'zustand'

const { mockProcessQueue } = vi.hoisted(() => ({
  mockProcessQueue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../financeStoreHelpers', () => ({
  getUserId: () => 'test-user',
  _realtimeOrigin: { value: false },
}))

vi.mock('../../sync/queue', () => ({
  processSyncQueue: mockProcessQueue,
}))

vi.mock('../../lib/supabaseData', () => ({
  toModel: (x: any) => {
    if (typeof x !== 'object' || x === null) return x
    const result: any = {}
    for (const key of Object.keys(x)) {
      const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
      result[camel] = x[key]
    }
    return result
  },
  sanitizeMonthSettings: (x: any) => x,
  parseUserSettingsRow: (x: any) => x,
}))

import { createSyncSlice } from './syncSlice'
import type { SyncSlice } from './syncSlice'
import type { SyncActionDescriptor } from '../../sync/types'

interface TestStore extends SyncSlice {
  transactions: any[]
  recurringTemplates: any[]
  extraordinaryEntries: any[]
  investments: any[]
  monthSettings: Record<string, any>
  appSettings: any
  loadFromSupabase: (data: any) => void
}

function createTestStore(initial?: Partial<TestStore>) {
  return create<TestStore>()((set, get) => ({
    ...createSyncSlice(set, get),
    transactions: [],
    recurringTemplates: [],
    extraordinaryEntries: [],
    investments: [],
    monthSettings: {},
    appSettings: {},
    loadFromSupabase: vi.fn(),
    ...initial,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('navigator', { onLine: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeAction(overrides: Partial<SyncActionDescriptor> = {}): SyncActionDescriptor {
  return {
    id: 'act-1',
    action: 'upsertTransaction',
    args: ['user-1', { id: 'tx-1' }],
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('pushToSyncQueue', () => {
  it('adds an item to an empty queue', () => {
    const store = createTestStore()
    store.getState().pushToSyncQueue(makeAction())
    expect(store.getState().syncQueue).toHaveLength(1)
    expect(store.getState().syncQueue[0]).toMatchObject({ action: 'upsertTransaction' })
  })

  it('adds distinct items', () => {
    const store = createTestStore()
    store.getState().pushToSyncQueue(makeAction({ id: 'act-1' }))
    store.getState().pushToSyncQueue(makeAction({ id: 'act-2', action: 'deleteTransactionRemote' }))
    expect(store.getState().syncQueue).toHaveLength(2)
  })

  it('deduplicates identical action+args', () => {
    const store = createTestStore()
    store.getState().pushToSyncQueue(makeAction({ id: 'act-1' }))
    store.getState().pushToSyncQueue(makeAction({ id: 'act-2' }))
    expect(store.getState().syncQueue).toHaveLength(1)
  })

  it('replaces the existing entry on deduplication', () => {
    const store = createTestStore()
    store.getState().pushToSyncQueue(makeAction({ id: 'act-1', createdAt: 100 }))
    store.getState().pushToSyncQueue(makeAction({ id: 'act-2', createdAt: 200 }))
    expect(store.getState().syncQueue).toHaveLength(1)
    expect(store.getState().syncQueue[0].createdAt).toBe(200)
  })

  it('keeps items with different args but same action', () => {
    const store = createTestStore()
    store.getState().pushToSyncQueue(makeAction({ id: 'act-1', args: ['user-1', { id: 'tx-1' }] }))
    store.getState().pushToSyncQueue(makeAction({ id: 'act-2', args: ['user-1', { id: 'tx-2' }] }))
    expect(store.getState().syncQueue).toHaveLength(2)
  })
})

describe('retrySyncNow', () => {
  it('returns early when isQueueProcessing is true', () => {
    const store = createTestStore({ isQueueProcessing: true })
    store.getState().retrySyncNow()
    expect(mockProcessQueue).not.toHaveBeenCalled()
  })

  it('returns early when offline', () => {
    vi.stubGlobal('navigator', { onLine: false })
    const store = createTestStore()
    store.getState().retrySyncNow()
    expect(mockProcessQueue).not.toHaveBeenCalled()
  })

  it('calls processSyncQueue when idle and online', () => {
    const store = createTestStore()
    store.getState().retrySyncNow()
    expect(mockProcessQueue).toHaveBeenCalledTimes(1)
  })

  it('transitions from error to offline before processing', () => {
    const store = createTestStore({ syncStatus: 'error', syncError: 'Some error' })
    store.getState().retrySyncNow()
    expect(store.getState().syncStatus).toBe('offline')
    expect(store.getState().syncError).toBeNull()
    expect(mockProcessQueue).toHaveBeenCalledTimes(1)
  })

  it('does not change status when already syncing', () => {
    const store = createTestStore({ syncStatus: 'syncing' })
    store.getState().retrySyncNow()
    expect(store.getState().syncStatus).toBe('syncing')
  })
})

describe('processSyncQueue delegation', () => {
  it('calls processQueue with the correct store interface', async () => {
    const store = createTestStore()
    store.getState().pushToSyncQueue(makeAction())
    await store.getState().processSyncQueue()
    expect(mockProcessQueue).toHaveBeenCalledTimes(1)
    const iface = mockProcessQueue.mock.calls[0][0]
    expect(typeof iface.getSyncQueue).toBe('function')
    expect(typeof iface.setSyncQueue).toBe('function')
    expect(typeof iface.setSyncStatus).toBe('function')
    expect(typeof iface.setQueueProcessing).toBe('function')
    expect(typeof iface.setLastSyncedAt).toBe('function')
    expect(typeof iface.loadFromSupabase).toBe('function')
    expect(typeof iface.getUserId).toBe('function')
  })

  it('delegates setSyncStatus to store', () => {
    const store = createTestStore()
    store.getState().processSyncQueue()
    const iface = mockProcessQueue.mock.calls[0][0]
    iface.setSyncStatus('error')
    expect(store.getState().syncStatus).toBe('error')
  })

  it('delegates setQueueProcessing to store', () => {
    const store = createTestStore()
    store.getState().processSyncQueue()
    const iface = mockProcessQueue.mock.calls[0][0]
    iface.setQueueProcessing(true)
    expect(store.getState().isQueueProcessing).toBe(true)
  })
})

describe('applyRealtimeUpdate', () => {
  it('adds transaction on INSERT', () => {
    const store = createTestStore()
    store.getState().applyRealtimeUpdate('transactions', 'INSERT', { id: 'tx-1', amount: 100 }, null)
    expect(store.getState().transactions).toHaveLength(1)
    expect(store.getState().transactions[0].id).toBe('tx-1')
  })

  it('updates transaction on UPDATE', () => {
    const store = createTestStore({
      transactions: [{ id: 'tx-1', amount: 100, description: 'old' }],
    })
    store.getState().applyRealtimeUpdate('transactions', 'UPDATE', { id: 'tx-1', amount: 200, description: 'updated' }, null)
    expect(store.getState().transactions[0].amount).toBe(200)
  })

  it('removes transaction on DELETE', () => {
    const store = createTestStore({
      transactions: [{ id: 'tx-1' }, { id: 'tx-2' }],
    })
    store.getState().applyRealtimeUpdate('transactions', 'DELETE', null, { id: 'tx-1' })
    expect(store.getState().transactions).toHaveLength(1)
    expect(store.getState().transactions[0].id).toBe('tx-2')
  })

  it('adds recurring template on INSERT', () => {
    const store = createTestStore()
    store.getState().applyRealtimeUpdate('recurring_templates', 'INSERT', { id: 'rec-1', description: 'Netflix' }, null)
    expect(store.getState().recurringTemplates).toHaveLength(1)
    expect(store.getState().recurringTemplates[0].id).toBe('rec-1')
  })

  it('removes recurring template on DELETE', () => {
    const store = createTestStore({
      recurringTemplates: [{ id: 'rec-1' }],
    })
    store.getState().applyRealtimeUpdate('recurring_templates', 'DELETE', null, { id: 'rec-1' })
    expect(store.getState().recurringTemplates).toHaveLength(0)
  })

  it('adds extraordinary entry on INSERT', () => {
    const store = createTestStore()
    store.getState().applyRealtimeUpdate('extraordinary_entries', 'INSERT', { id: 'e-1', type: 'ferias' }, null)
    expect(store.getState().extraordinaryEntries).toHaveLength(1)
  })

  it('adds investment on INSERT', () => {
    const store = createTestStore()
    store.getState().applyRealtimeUpdate('investments', 'INSERT', { id: 'inv-1', name: 'CDB' }, null)
    expect(store.getState().investments).toHaveLength(1)
  })

  it('upserts month settings', () => {
    const store = createTestStore()
    store.getState().applyRealtimeUpdate('month_settings', 'INSERT', { month_key: '2025-03', is_closed: true }, null)
    expect(store.getState().monthSettings['2025-03']).toBeDefined()
    expect(store.getState().monthSettings['2025-03'].isClosed).toBe(true)
  })

  it('updates appSettings', () => {
    const store = createTestStore({ appSettings: {} })
    store.getState().applyRealtimeUpdate('user_settings', 'UPDATE', { dark_mode: true }, null)
    expect(store.getState().appSettings).toBeDefined()
  })

  it('ignores unknown tables', () => {
    const store = createTestStore()
    expect(() => {
      store.getState().applyRealtimeUpdate('unknown_table', 'INSERT', { id: 'x' }, null)
    }).not.toThrow()
  })
})
