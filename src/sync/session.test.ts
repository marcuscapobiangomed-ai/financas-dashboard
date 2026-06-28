import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
const mockRefreshSession = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  },
  isSupabaseConfigured: true,
}))

const { hasActiveSession, tryRefreshSession, requireSession } = await import('./session')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('hasActiveSession', () => {
  it('returns true when session has a valid access_token', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    })
    await expect(hasActiveSession()).resolves.toBe(true)
    expect(mockGetSession).toHaveBeenCalledTimes(1)
    expect(mockRefreshSession).not.toHaveBeenCalled()
  })

  it('tries refresh when session is null', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'refreshed-token' } },
    })
    await expect(hasActiveSession()).resolves.toBe(true)
    expect(mockGetSession).toHaveBeenCalledTimes(1)
    expect(mockRefreshSession).toHaveBeenCalledTimes(1)
  })

  it('tries refresh when session has no access_token', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: '' } },
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'refreshed-token' } },
    })
    await expect(hasActiveSession()).resolves.toBe(true)
    expect(mockRefreshSession).toHaveBeenCalledTimes(1)
  })

  it('returns false when both initial and refresh fail', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
    })
    await expect(hasActiveSession()).resolves.toBe(false)
  })

  it('returns false when getSession throws', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'))
    await expect(hasActiveSession()).resolves.toBe(false)
    expect(mockRefreshSession).not.toHaveBeenCalled()
  })

  it('returns false when refreshSession returns error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid refresh token'),
    })
    await expect(hasActiveSession()).resolves.toBe(false)
  })
})

describe('tryRefreshSession', () => {
  it('returns true on successful refresh with access_token', async () => {
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'new-token' } },
    })
    await expect(tryRefreshSession()).resolves.toBe(true)
  })

  it('returns false when refresh returns no session', async () => {
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
    })
    await expect(tryRefreshSession()).resolves.toBe(false)
  })

  it('returns false when refresh throws', async () => {
    mockRefreshSession.mockRejectedValue(new Error('Network error'))
    await expect(tryRefreshSession()).resolves.toBe(false)
  })

  it('returns false when refresh returns error with a session', async () => {
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: new Error('some error'),
    })
    await expect(tryRefreshSession()).resolves.toBe(false)
  })
})

describe('requireSession', () => {
  it('resolves when hasActiveSession returns true', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    })
    await expect(requireSession()).resolves.toBeUndefined()
  })

  it('resolves when refresh succeeds after initial failure', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'refreshed' } },
    })
    await expect(requireSession()).resolves.toBeUndefined()
  })

  it('throws when both attempts fail', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
    })
    await expect(requireSession()).rejects.toThrow('Sessão expirada')
  })

  it('throws with correct error message', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
    })
    await expect(requireSession()).rejects.toThrow('Faça login novamente para sincronizar')
  })
})
