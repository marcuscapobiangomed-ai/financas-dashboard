import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useAuthStore
const mockGetUser = vi.fn()
vi.mock('./useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      user: mockGetUser(),
    }),
  },
}))

// Mock notifications
vi.mock('../lib/notifications', () => ({
  getNotificationPermission: vi.fn(() => 'granted'),
  showBudgetAlert: vi.fn(),
}))

const { assertMonthNotClosed, monthsDiff, defaultMonthSettings, now, generateId } = await import('./financeStoreHelpers')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it('returns unique values on each call', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })

  it('returns a UUID-like format (hexadecimal with dashes)', () => {
    const id = generateId()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })
})

describe('now', () => {
  it('returns an ISO 8601 string', () => {
    const result = now()
    expect(() => new Date(result)).not.toThrow()
    expect(new Date(result).toISOString()).toBe(result)
  })

  it('returns the current date', () => {
    const before = Date.now()
    const result = now()
    const after = Date.now()
    const resultMs = new Date(result).getTime()
    expect(resultMs).toBeGreaterThanOrEqual(before)
    expect(resultMs).toBeLessThanOrEqual(after)
  })
})

describe('monthsDiff', () => {
  it('returns 0 for the same month', () => {
    expect(monthsDiff('2025-03', '2025-03')).toBe(0)
  })

  it('returns positive difference for future months', () => {
    expect(monthsDiff('2025-01', '2025-03')).toBe(2)
  })

  it('returns negative difference for past months', () => {
    expect(monthsDiff('2025-03', '2025-01')).toBe(-2)
  })

  it('handles year boundaries', () => {
    expect(monthsDiff('2025-12', '2026-01')).toBe(1)
  })

  it('handles multi-year differences', () => {
    expect(monthsDiff('2024-01', '2026-01')).toBe(24)
  })

  it('handles negative multi-year differences', () => {
    expect(monthsDiff('2026-01', '2024-01')).toBe(-24)
  })
})

describe('defaultMonthSettings', () => {
  const appSettings = {
    defaultSectionLimits: { despesas_fixas: 5000, gastos_diarios: 2000 },
    defaultTithePercent: 10,
    defaultOfferingPercent: 2,
    darkMode: false,
    alertThresholdPercent: 80,
    cardSections: [],
    defaultSavingsGoalPercent: 20,
  }

  it('creates settings with the given monthKey', () => {
    const result = defaultMonthSettings('2025-03', appSettings)
    expect(result.monthKey).toBe('2025-03')
  })

  it('sets isClosed to false', () => {
    const result = defaultMonthSettings('2025-03', appSettings)
    expect(result.isClosed).toBe(false)
  })

  it('copies section limits from app settings', () => {
    const result = defaultMonthSettings('2025-03', appSettings)
    expect(result.sectionLimits).toEqual({
      despesas_fixas: 5000,
      gastos_diarios: 2000,
    })
  })

  it('copies tithe and offering percent', () => {
    const result = defaultMonthSettings('2025-03', appSettings)
    expect(result.tithePercent).toBe(10)
    expect(result.offeringPercent).toBe(2)
  })

  it('does not mutate the original appSettings', () => {
    const original = { ...appSettings }
    defaultMonthSettings('2025-03', appSettings)
    expect(appSettings).toEqual(original)
  })
})

describe('assertMonthNotClosed', () => {
  it('throws when month is closed', () => {
    const get = () => ({
      monthSettings: {
        '2025-03': { isClosed: true },
      },
    })
    expect(() => assertMonthNotClosed(get, '2025-03')).toThrow(
      'O mês 2025-03 está fechado. Reabra-o para fazer alterações.'
    )
  })

  it('does not throw when month is open', () => {
    const get = () => ({
      monthSettings: {
        '2025-03': { isClosed: false },
      },
    })
    expect(() => assertMonthNotClosed(get, '2025-03')).not.toThrow()
  })

  it('does not throw when monthSettings is empty for that month (not yet configured)', () => {
    const get = () => ({
      monthSettings: {},
    })
    expect(() => assertMonthNotClosed(get, '2025-03')).not.toThrow()
  })

  it('does not throw when monthSettings is undefined', () => {
    const get = () => ({})
    expect(() => assertMonthNotClosed(get, '2025-03')).not.toThrow()
  })

  it('does not throw when monthSettings itself is undefined', () => {
    const get = () => ({
      monthSettings: undefined,
    })
    expect(() => assertMonthNotClosed(get, '2025-03')).not.toThrow()
  })

  it('throw message includes the month key', () => {
    const get = () => ({
      monthSettings: {
        '2024-12': { isClosed: true },
      },
    })
    expect(() => assertMonthNotClosed(get, '2024-12')).toThrow('2024-12')
  })

  it('does not throw for a different month that is closed', () => {
    const get = () => ({
      monthSettings: {
        '2025-02': { isClosed: true },
        '2025-03': { isClosed: false },
      },
    })
    expect(() => assertMonthNotClosed(get, '2025-03')).not.toThrow()
  })
})
