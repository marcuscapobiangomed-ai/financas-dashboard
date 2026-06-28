import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockHasActiveSession, mockTryRefreshSession, mockLoadFromSupabase } = vi.hoisted(() => ({
  mockHasActiveSession: vi.fn(),
  mockTryRefreshSession: vi.fn(),
  mockLoadFromSupabase: vi.fn(),
}))

const mockDbTarget = vi.hoisted(() => ({}))

vi.mock('./session', () => ({
  hasActiveSession: mockHasActiveSession,
  tryRefreshSession: mockTryRefreshSession,
}))

vi.mock('../lib/supabaseData', () => new Proxy(mockDbTarget, {
  has: () => true,
  get: (target, prop) => (target as any)[prop],
}))

import { processSyncQueue } from './queue'
import type { SyncActionDescriptor, QueueProcessorStoreInterface } from './queue'

function createMockStore(): QueueProcessorStoreInterface {
  let syncQueue: SyncActionDescriptor[] = []
  const mockSetSyncQueue = vi.fn((q) => { syncQueue = q })
  return {
    getSyncQueue: () => syncQueue,
    setSyncQueue: mockSetSyncQueue,
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
    mockDbTarget.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockDbTarget.upsertTransaction).toHaveBeenCalledWith('user-1', { id: 'tx-1', amount: 100 })
    expect(store.setSyncStatus).toHaveBeenCalledWith('syncing')
    expect(store.setSyncStatus).toHaveBeenCalledWith('idle')
    expect(store.setSyncError).toHaveBeenCalledWith(null)
    expect(store.setQueueProcessing).toHaveBeenCalledWith(false)
    expect(store.setLastSyncedAt).toHaveBeenCalled()
  })

  it('clears the queue after successful processing', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbTarget.upsertTransaction = vi.fn().mockResolvedValue(undefined)
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
    mockDbTarget.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockDbTarget.upsertTransaction).toHaveBeenCalledTimes(2)
  })

  it('keeps remaining items and sets offline on network error', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [
      item({ id: 'item-1', action: 'upsertTransaction' }),
      item({ id: 'item-2', action: 'upsertTransaction', args: ['user-1', { id: 'tx-2' }] }),
    ]
    mockDbTarget.upsertTransaction = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await processSyncQueue(store)
    expect(store.setSyncStatus).toHaveBeenCalledWith('offline')
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toHaveLength(2)
  })

  it('keeps remaining items after first network error and stops processing', async () => {
    const store = createMockStore()
    mockDbTarget.upsertTransaction = vi.fn()
    mockDbTarget.upsertTransaction
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    store.getSyncQueue = () => [
      item({ id: 'item-1' }),
      item({ id: 'item-2', args: ['user-1', { id: 'tx-2' }] }),
      item({ id: 'item-3', args: ['user-1', { id: 'tx-3' }] }),
    ]
    await processSyncQueue(store)
    expect(mockDbTarget.upsertTransaction).toHaveBeenCalledTimes(2)
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toHaveLength(2)
    expect(finalQueue[0].id).toBe('item-2')
    expect(finalQueue[1].id).toBe('item-3')
  })

  it('recovers from session error and retries the item', async () => {
    const store = createMockStore()
    mockDbTarget.upsertTransaction = vi.fn()
    mockDbTarget.upsertTransaction
      .mockRejectedValueOnce(new Error('Sessão expirada'))
      .mockResolvedValueOnce(undefined)
    mockTryRefreshSession.mockResolvedValue(true)
    store.getSyncQueue = () => [item()]
    await processSyncQueue(store)
    expect(mockTryRefreshSession).toHaveBeenCalled()
    expect(mockDbTarget.upsertTransaction).toHaveBeenCalledTimes(2)
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
    expect(store.setSyncStatus).toHaveBeenCalledWith('idle')
  })

  it('keeps item and halts if session recovery fails', async () => {
    const store = createMockStore()
    mockDbTarget.upsertTransaction = vi.fn().mockRejectedValue(new Error('Sessão expirada'))
    mockTryRefreshSession.mockResolvedValue(false)
    store.getSyncQueue = () => [item()]
    await processSyncQueue(store)
    expect(store.setSyncStatus).toHaveBeenCalledWith('offline')
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toHaveLength(1)
  })

  it('discards toxic items and reloads from server', async () => {
    const store = createMockStore()
    mockDbTarget.upsertTransaction = vi.fn().mockRejectedValue(new Error('Payload too large'))
    mockDbTarget.fetchAllUserData = vi.fn().mockResolvedValue({ transactions: [] })
    store.getSyncQueue = () => [item()]
    await processSyncQueue(store)
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
    mockDbTarget.upsertTransaction = vi.fn()
    mockDbTarget.upsertTransaction
      .mockRejectedValueOnce(new Error('Toxic error'))
      .mockResolvedValueOnce(undefined)
    mockDbTarget.fetchAllUserData = vi.fn().mockResolvedValue({ transactions: [] })
    store.getSyncQueue = () => [
      item({ id: 'item-1' }),
      item({ id: 'item-2', args: ['user-1', { id: 'tx-2' }] }),
    ]
    await processSyncQueue(store)
    expect(mockDbTarget.upsertTransaction).toHaveBeenCalledTimes(2)
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
  })

  it('discards TTL-expired items', async () => {
    const { QUEUE_TTL_MS } = await import('./queue')
    const store = createMockStore()
    const expiredItem = item({ createdAt: Date.now() - QUEUE_TTL_MS - 1000 })
    store.getSyncQueue = () => [expiredItem]
    mockDbTarget.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockDbTarget.upsertTransaction).not.toHaveBeenCalled()
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
    expect(store.setSyncStatus).toHaveBeenCalledWith('idle')
  })

  it('handles unknown db method gracefully by skipping item', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item({ action: 'nonExistentMethod' })]
    await processSyncQueue(store)
    const finalQueue = (store.setSyncQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(finalQueue).toEqual([])
  })

  it('does not call refresh on first successful session check', async () => {
    mockHasActiveSession.mockResolvedValue(true)
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbTarget.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(mockTryRefreshSession).not.toHaveBeenCalled()
  })

  it('sets processing flag before syncing', async () => {
    const store = createMockStore()
    const setQueueProcessing = vi.fn()
    const setSyncStatus = vi.fn()
    store.setQueueProcessing = setQueueProcessing
    store.setSyncStatus = setSyncStatus
    store.getSyncQueue = () => [item()]
    mockDbTarget.upsertTransaction = vi.fn().mockResolvedValue(undefined)
    await processSyncQueue(store)
    expect(setQueueProcessing).toHaveBeenCalledWith(true)
    expect(setSyncStatus).toHaveBeenCalledWith('syncing')
    expect(setQueueProcessing).toHaveBeenCalledWith(false)
  })

  it('correctly sets offline status for network errors', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbTarget.upsertTransaction = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await processSyncQueue(store)
    expect(store.setSyncStatus).toHaveBeenCalledWith('offline')
  })

  it('does not clear syncError when going offline', async () => {
    const store = createMockStore()
    store.getSyncQueue = () => [item()]
    mockDbTarget.upsertTransaction = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await processSyncQueue(store)
    expect(store.setSyncError).not.toHaveBeenCalledWith(null)
  })
})
