import { describe, expect, it } from 'vitest'
import { getBillingMonthKey } from './cardBilling'

describe('getBillingMonthKey', () => {
  it('moves a bill to the next month when due day is before closing day', () => {
    expect(getBillingMonthKey('2025-06-15', 30, 10)).toBe('2025-07')
  })

  it('moves purchases on the closing day to the following bill', () => {
    expect(getBillingMonthKey('2025-06-30', 30, 10)).toBe('2025-08')
  })

  it('keeps same-month bills when due day is after closing day', () => {
    expect(getBillingMonthKey('2025-04-05', 10, 20)).toBe('2025-04')
  })

  it('handles year rollover with due day before closing day', () => {
    expect(getBillingMonthKey('2025-12-20', 30, 10)).toBe('2026-01')
  })
})
