import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, parseCurrency, formatPercent } from './currency'

describe('formatCurrency', () => {
  it('formats positive values as BRL', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1.234,56')
    expect(result).toContain('R$')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0,00')
  })

  it('formats negative values', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('500,00')
  })
})

describe('formatNumber', () => {
  it('formats with 2 decimal places', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50')
  })

  it('formats integer', () => {
    expect(formatNumber(1000)).toBe('1.000,00')
  })
})

describe('parseCurrency', () => {
  it('parses Brazilian format "1.234,56"', () => {
    expect(parseCurrency('1.234,56')).toBeCloseTo(1234.56)
  })

  it('parses with R$ prefix', () => {
    expect(parseCurrency('R$ 1.234,56')).toBeCloseTo(1234.56)
  })

  it('parses plain number', () => {
    expect(parseCurrency('500,00')).toBe(500)
  })

  it('returns 0 for invalid input', () => {
    expect(parseCurrency('abc')).toBe(0)
    expect(parseCurrency('')).toBe(0)
  })
})

describe('formatPercent', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercent(14.15)).toBe('14.2%')
  })

  it('formats with custom decimals', () => {
    expect(formatPercent(14.15, 2)).toBe('14.15%')
  })

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })
})
