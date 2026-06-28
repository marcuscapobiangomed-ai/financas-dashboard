import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SyncActionDescriptor, QueueProcessorStoreInterface } from './queue'
import { QUEUE_TTL_MS } from './queue'

const mockHasActiveSession = vi.fn()
const mockTryRefreshSession = vi.fn()

vi.mock('./session', () => ({
  hasActiveSession: mockHasActiveSession,
  tryRefreshSession: mockTryRefreshSession,
}))

type MockDb = Record<string, vi.Mock>
const mockDbMethods: MockDb = {}

vi.mock('../lib/supabaseData', () => new Proxy({}, {
  get(_, prop: string) {
    if (!mockDbMethods[prop]) {
      mockDbMethods[prop] = vi.fn()
    }
    return mockDbMethods[prop]
  },
}))

const mockLoadFromSupabase = vi.fn()
const { processSyncQueue } = await import('./queue')

function createMockStore(): QueueProcessorStoreInterface {
  let syncQueue: SyncActionDescriptor[] = []
  return {
    getSyncQueue: () => syncQueue,
    setSyncQueue: (q) => { syncQueue = q },
    setSyncStatus: vi.fn(),
    setSyncError: vi.fn(),
    setQueueProcessing: vi.fn(),
    setLastSyncedAt: vi.fn(),
    loadFromSupabase: mockLoadFromSupabase,
    getUserId: () => 'test-user',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('navigator', { onLine: true })
  mockHasActiveSession.mockResolvedValue(true)
  mockTryRefreshSession.mockResolvedValue(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function item(overrides: Partial<SyncActionDescriptor> = {}): SyncActionDescriptor {
  return {
    id: 'item-1',
    action: 'upsertTransaction',
    args: ['user-1', { id: 'tx-1', amount: 100 }],
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('processSyncQueue', () => {
  it('returns immediately when queue is empty', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => []
    await processSyncQueue(store)
    expect(store.setSyncStatus).not.toHaveBeenCalled()
    expect(store.setQueueProcessing).not.toHaveBeenCalled()
  })

  it('returns immediately when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    await processSyncQueue(store)
    expect(store.setSyncStatus).not.toHaveBeenCalled()
  })

  it('sets error status when session check fails', async () => {
    mockHasActiveSession.mockResolvedValue(false)
    mockTryRefreshSession.mockResolvedValue(false)
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    await processSyncQueue(store)
    expect(store.setSyncStatus).toHaveBeenCalledWith('error')
    expect(store.setSyncError).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.')
  })

  it('processes items successfully and sets idle status', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbMethods.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockDbMethods.upsertTransaction).toHaveBeenCalledWith('user-1', { id: 'tx-1', amount: 100 })
    expect(store.setSyncStatus).toHaveBeenCalledWith('syncing')
    expect(store.setSyncStatus).toHaveBeenCalledWith('idle')
    expect(store.setSyncError).toHaveBeenCalledWith(null)
    expect(store.setQueueProcessing).toHaveBeenCalledWith(false)
    expect(store.setLastSyncedAt).toHaveBeenCalled()
  })

  it('clears the queue after successful processing', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbMethods.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
  })

  it('processes multiple items in the queue', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [
      item({ id: 'item-1', action: 'upsertTransaction' }),
      item({ id: 'item-2', action: 'upsertTransaction', args: ['user-1', { id: 'tx-2' }] }),
    ]
    mockDbMethods.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockDbMethods.upsertTransaction).toHaveBeenCalledTimes(2)
  })

  it('keeps remaining items and sets offline on network error', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [
      item({ id: 'item-1', action: 'upsertTransaction' }),
      item({ id: 'item-2', action: 'upsertTransaction', args: ['user-1', { id: 'tx-2' }] }),
    ]
    mockDbMethods.upsertTransaction = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await processSyncQueue(store)
    expect(store.setSyncStatus).toHaveBeenCalledWith('offline')
    // Both items remain in queue
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toHaveLength(2)
  })

  it('keeps remaining items after first network error and stops processing', async () => {
    const store = createMockStore()
    mockDbMethods.upsertTransaction = vi.fn()
    mockDbMethods.upsertTransaction
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    store.getSyncQueue = () => [
      item({ id: 'item-1' }),
      item({ id: 'item-2', args: ['user-1', { id: 'tx-2' }] }),
      item({ id: 'item-3', args: ['user-1', { id: 'tx-3' }] }),
    ]
    await processSyncQueue(store)
    // First item succeeded, second failed, third was skipped
    expect(mockDbMethods.upsertTransaction).toHaveBeenCalledTimes(2)
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toHaveLength(2) // items 2 and 3 remain
    expect(finalQueue[0].id).toBe('item-2')
    expect(finalQueue[1].id).toBe('item-3')
  })

  it('recovers from session error and retries the item', async () => {
    const store = createMockStore()
    mockDbMethods.upsertTransaction = vi.fn()
    mockDbMethods.upsertTransaction
      .mockRejectedValueOnce(new Error('Sessão expirada'))
      .mockResolvedValueOnce(undefined)
    mockTryRefreshSession.mockResolvedValue(true)
    store.getSyncQueue = () => [item()]
    await processSyncQueue(store)
    expect(mockTryRefreshSession).toHaveBeenCalled()
    expect(mockDbMethods.upsertTransaction).toHaveBeenCalledTimes(2)
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
    expect(store.setSyncStatus).toHaveBeenCalledWith('idle')
  })

  it('keeps item and halts if session recovery fails', async () => {
    const store = createMockStore()
    mockDbMethods.upsertTransaction = vi.fn().mockRejectedValue(new Error('Sessão expirada'))
    mockTryRefreshSession.mockResolvedValue(false)
    store.getSyncQueue = () => [item()]
    await processSyncQueue(store)
    expect(store.setSyncStatus).toHaveBeenCalledWith('offline')
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toHaveLength(1)
  })

  it('discards toxic items and reloads from server', async () => {
    const store = createMockStore()
    mockDbMethods.upsertTransaction = vi.fn().mockRejectedValue(new Error('Payload too large'))
    mockDbMethods.fetchAllUserData = vi.fn().mockResolvedValue({ transactions: [] })
    store.getSyncQueue = () => [item()]
    await processSyncQueue(store)
    // Toxic item discarded, queue should be empty
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
    expect(mockLoadFromSupabase).toHaveBeenCalled()
    expect(store.setSyncError).toHaveBeenCalledWith(
      'Alguns itens falharam e foram descartados. Os dados foram atualizados.'
    )
    expect(store.setSyncStatus).toHaveBeenCalledWith('idle')
  })

  it('handles toxic + network mixed: processes remaining after toxic', async () => {
    const store = createMockStore()
    mockDbMethods.upsertTransaction = vi.fn()
    mockDbMethods.upsertTransaction
      .mockRejectedValueOnce(new Error('Toxic error'))
      .mockResolvedValueOnce(undefined)
    mockDbMethods.fetchAllUserData = vi.fn().mockResolvedValue({ transactions: [] })
    store.getSyncQueue = () => [
      item({ id: 'item-1' }),
      item({ id: 'item-2', args: ['user-1', { id: 'tx-2' }] }),
    ]
    await processSyncQueue(store)
    // Item 1 discarded (toxic), item 2 processed successfully
    expect(mockDbMethods.upsertTransaction).toHaveBeenCalledTimes(2)
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
  })

  it('discards TTL-expired items', async () => {
    const store = createMockStore()
    const expiredItem = item({ createdAt: Date.now() - QUEUE_TTL_MS - 1000 })
    store.getSyncQueue = () => [expiredItem]
    mockDbMethods.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockDbMethods.upsertTransaction).not.toHaveBeenCalled()
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
    expect(store.setSyncStatus).toHaveBeenCalledWith('idle')
  })

  it('keeps non-expired items and discards expired ones', async () => {
    const store = createMockStore()
    const expiredItem = item({
      id: 'expired',
      createdAt: Date.now() - QUEUE_TTL_MS - 1000,
    })
    const freshItem = item({
      id: 'fresh',
      action: 'upsertTransaction',
      args: ['user-1', { id: 'tx-fresh' }],
    })
    store.getSyncQueue = () => [expiredItem, freshItem]
    mockDbMethods.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockDbMethods.upsertTransaction).toHaveBeenCalledTimes(1)
    expect(mockDbMethods.upsertTransaction).toHaveBeenCalledWith('user-1', { id: 'tx-fresh' })
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
  })

  it('handles unknown db method gracefully by skipping item', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item({ action: 'nonExistentMethod' })]
    await processSyncQueue(store)
    // A toxic item — should be discarded
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
  })

  it('does not call refresh on first successful session check', async () => {
    mockHasActiveSession.mockResolvedValue(true)
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbMethods.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockTryRefreshSession).not.toHaveBeenCalled()
  })

  it('calls refresh when initial session check fails and continues', async () => {
    mockHasActiveSession.mockResolvedValue(false)
    mockTryRefreshSession.mockResolvedValue(true)
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbMethods.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockTryRefreshSession).toHaveBeenCalled()
    expect(mockDbMethods.upsertTransaction).toHaveBeenCalled()
  })

  it('sets processing flag before syncing', async () => {
    const store = createMockStore()
    const setQueueProcessing = vi.fn()
    const setSyncStatus = vi.fn()
    store.setQueueProcessing = setQueueProcessing
    store.setSyncStatus = setSyncStatus
    store.getSyncQueue = () => [item()]
    mockDbMethods.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(setQueueProcessing).toHaveBeenCalledWith(true)
    expect(setSyncStatus).toHaveBeenCalledWith('syncing')
    expect(setQueueProcessing).toHaveBeenCalledWith(false)
  })

  it('correctly sets offline status for network errors', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbMethods.upsertTransaction = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await processSyncQueue(store)
    expect(store.setSyncStatus).toHaveBeenCalledWith('offline')
    expect(store.setSyncError).not.toHaveBeenCalledWith(null)
  })

  it('does not clear syncError when going offline', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbMethods.upsertTransaction = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await processSyncQueue(store)
    // syncError should NOT be cleared (only cleared on full idle success)
    expect(store.setSyncError).not.toHaveBeenCalledWith(null)
  })
})
