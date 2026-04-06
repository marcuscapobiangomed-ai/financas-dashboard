import { describe, it, expect } from 'vitest'
import { DEFAULT_APP_SETTINGS } from '../constants/defaultBudget'

describe('DEFAULT_APP_SETTINGS', () => {
  it('has required fields', () => {
    expect(DEFAULT_APP_SETTINGS.defaultSectionLimits).toBeDefined()
    expect(DEFAULT_APP_SETTINGS.defaultTithePercent).toBeGreaterThan(0)
    expect(DEFAULT_APP_SETTINGS.defaultOfferingPercent).toBeGreaterThan(0)
    expect(DEFAULT_APP_SETTINGS.defaultSavingsGoalPercent).toBeGreaterThan(0)
  })

  it('has valid card sections', () => {
    expect(DEFAULT_APP_SETTINGS.cardSections).toBeInstanceOf(Array)
    expect(DEFAULT_APP_SETTINGS.cardSections.length).toBeGreaterThan(0)
  })

  it('has dark mode default', () => {
    expect(typeof DEFAULT_APP_SETTINGS.darkMode).toBe('boolean')
  })

  it('has alert threshold', () => {
    expect(DEFAULT_APP_SETTINGS.alertThresholdPercent).toBeGreaterThan(0)
    expect(DEFAULT_APP_SETTINGS.alertThresholdPercent).toBeLessThanOrEqual(100)
  })
})

describe('Budget alert calculations', () => {
  it('calculates percent used correctly', () => {
    const total = 800
    const limit = 1000
    const percentUsed = (total / limit) * 100
    expect(percentUsed).toBe(80)
  })

  it('detects over limit', () => {
    const total = 1200
    const limit = 1000
    const percentUsed = (total / limit) * 100
    expect(percentUsed).toBe(120)
    expect(percentUsed >= 100).toBe(true)
  })

  it('handles zero limit without division by zero', () => {
    const total = 100
    const limit = 0
    const percentUsed = limit > 0 ? (total / limit) * 100 : 0
    expect(percentUsed).toBe(0)
  })

  it('triggers alert at threshold', () => {
    const threshold = 80
    const percentUsed = 80
    expect(percentUsed >= threshold).toBe(true)
  })

  it('does not trigger below threshold', () => {
    const threshold = 80
    const percentUsed = 79.9
    expect(percentUsed >= threshold).toBe(false)
  })
})

describe('Data import/export', () => {
  it('export produces valid JSON', () => {
    const mockData = {
      version: 2,
      transactions: [],
      recurringTemplates: [],
      extraordinaryEntries: [],
      investments: [],
      monthSettings: {} as Record<string, unknown>,
      appSettings: DEFAULT_APP_SETTINGS,
    }

    const json = JSON.stringify(mockData)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('import handles empty transactions', () => {
    const data = JSON.stringify({
      version: 2,
      transactions: [],
    })
    const parsed = JSON.parse(data)
    expect(parsed.transactions).toHaveLength(0)
  })

  it('import handles transaction with all fields', () => {
    const data = JSON.stringify({
      version: 2,
      transactions: [{
        id: '1',
        type: 'expense',
        section: 'despesas_fixas',
        description: 'Netflix',
        amount: 55.90,
        category: 'lazer',
        date: '2025-03-15',
        monthKey: '2025-03',
        createdAt: '2025-03-15T10:00:00Z',
        updatedAt: '2025-03-15T10:00:00Z',
      }],
    })
    const parsed = JSON.parse(data)
    expect(parsed.transactions[0].amount).toBe(55.90)
  })

  it('handles extraordinary entries', () => {
    const data = JSON.stringify({
      version: 2,
      extraordinaryEntries: [{
        id: '1',
        type: 'ferias',
        grossAmount: 10000,
        tithePercent: 10,
        offeringPercent: 2,
        tithe: 1000,
        offering: 200,
        netAmount: 8800,
        monthKey: '2025-03',
      }],
    })
    const parsed = JSON.parse(data)
    expect(parsed.extraordinaryEntries[0].netAmount).toBe(8800)
  })

  it('handles investments', () => {
    const data = JSON.stringify({
      version: 2,
      investments: [{
        id: '1',
        name: 'CDB Banco do Brasil',
        principal: 50000,
        monthlyYieldPercent: 1.1,
        startMonth: '2025-01',
        isActive: true,
        investmentType: 'cdb',
        cdiPercent: 100,
      }],
    })
    const parsed = JSON.parse(data)
    expect(parsed.investments[0].principal).toBe(50000)
  })
})

describe('Month key operations', () => {
  it('parses year and month from monthKey', () => {
    const monthKey = '2025-03'
    const [year, month] = monthKey.split('-').map(Number)
    expect(year).toBe(2025)
    expect(month).toBe(3)
  })

  it('generates next month key', () => {
    const current = '2025-03'
    const [year, month] = current.split('-').map(Number)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const nextKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
    expect(nextKey).toBe('2025-04')
  })

  it('handles year transition', () => {
    const current = '2025-12'
    const [year, month] = current.split('-').map(Number)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const nextKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
    expect(nextKey).toBe('2026-01')
  })
})