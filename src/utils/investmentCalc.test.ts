import { describe, it, expect } from 'vitest'
import {
  annualToDaily,
  annualToMonthly,
  effectiveAnnualRate,
  effectiveAnnualRateIPCA,
  poupancaAnnualRate,
  computeProjection,
  getIRRate,
  getIRBracketLabel,
  netYieldAfterIR,
  resolveMonthlyYieldPercent,
  getEffectiveAnnualRate,
} from './investmentCalc'

describe('annualToDaily', () => {
  it('converts annual rate to daily rate (252 business days)', () => {
    const daily = annualToDaily(14.15)
    // (1 + 0.1415)^(1/252) - 1 ≈ 0.0526%
    expect(daily).toBeGreaterThan(0.05)
    expect(daily).toBeLessThan(0.06)
  })

  it('returns 0 for 0% annual', () => {
    expect(annualToDaily(0)).toBe(0)
  })
})

describe('annualToMonthly', () => {
  it('converts annual rate to monthly compound rate', () => {
    const monthly = annualToMonthly(14.15)
    // (1.1415)^(1/12) - 1 ≈ 1.107%
    expect(monthly).toBeGreaterThan(1.0)
    expect(monthly).toBeLessThan(1.2)
  })

  it('compounding 12 months should give back the annual rate', () => {
    const annual = 14.15
    const monthly = annualToMonthly(annual)
    const recomputed = (Math.pow(1 + monthly / 100, 12) - 1) * 100
    expect(recomputed).toBeCloseTo(annual, 6)
  })
})

describe('effectiveAnnualRate', () => {
  it('calculates CDI-based effective rate (100% CDI)', () => {
    expect(effectiveAnnualRate(100, 14.15)).toBe(14.15)
  })

  it('calculates CDI-based effective rate (110% CDI)', () => {
    expect(effectiveAnnualRate(110, 14.15)).toBeCloseTo(15.565)
  })
})

describe('effectiveAnnualRateIPCA', () => {
  it('calculates IPCA+ rate with spread', () => {
    // (1 + 0.05) * (1 + 0.06) - 1 = 0.113 → 11.3%
    const rate = effectiveAnnualRateIPCA(6, 5)
    expect(rate).toBeCloseTo(11.3, 1)
  })

  it('returns IPCA only when spread is 0', () => {
    const rate = effectiveAnnualRateIPCA(0, 5)
    expect(rate).toBeCloseTo(5.0, 1)
  })
})

describe('poupancaAnnualRate', () => {
  it('returns 70% of Selic when Selic > 8.5%', () => {
    expect(poupancaAnnualRate(14.15)).toBeCloseTo(9.905)
  })

  it('returns 70% of Selic when Selic <= 8.5%', () => {
    expect(poupancaAnnualRate(8.0)).toBeCloseTo(5.6)
  })
})

describe('computeProjection', () => {
  it('projects daily, monthly, and annual amounts', () => {
    const proj = computeProjection(100000, 14.15)
    expect(proj.dailyRate).toBeGreaterThan(0)
    expect(proj.monthlyRate).toBeGreaterThan(0)
    expect(proj.annualRate).toBe(14.15)
    expect(proj.annualAmount).toBe(14150)
    expect(proj.monthlyAmount).toBeGreaterThan(1000)
    expect(proj.dailyAmount).toBeGreaterThan(40)
  })

  it('returns 0 amounts for 0 principal', () => {
    const proj = computeProjection(0, 14.15)
    expect(proj.dailyAmount).toBe(0)
    expect(proj.monthlyAmount).toBe(0)
    expect(proj.annualAmount).toBe(0)
  })
})

describe('getIRRate', () => {
  it('returns 22.5% for <= 180 days', () => {
    expect(getIRRate(1)).toBe(0.225)
    expect(getIRRate(180)).toBe(0.225)
  })

  it('returns 20% for 181-360 days', () => {
    expect(getIRRate(181)).toBe(0.20)
    expect(getIRRate(360)).toBe(0.20)
  })

  it('returns 17.5% for 361-720 days', () => {
    expect(getIRRate(361)).toBe(0.175)
    expect(getIRRate(720)).toBe(0.175)
  })

  it('returns 15% for > 720 days', () => {
    expect(getIRRate(721)).toBe(0.15)
    expect(getIRRate(9999)).toBe(0.15)
  })
})

describe('getIRBracketLabel', () => {
  it('returns correct label for each bracket', () => {
    expect(getIRBracketLabel(100)).toContain('22,5%')
    expect(getIRBracketLabel(200)).toContain('20%')
    expect(getIRBracketLabel(500)).toContain('17,5%')
    expect(getIRBracketLabel(1000)).toContain('15%')
  })
})

describe('netYieldAfterIR', () => {
  it('applies tax correctly for CDB (taxable)', () => {
    const result = netYieldAfterIR(1000, 100, false)
    expect(result.taxRate).toBe(0.225)
    expect(result.taxAmount).toBe(225)
    expect(result.netYield).toBe(775)
  })

  it('no tax for exempt investments (LCI/LCA)', () => {
    const result = netYieldAfterIR(1000, 100, true)
    expect(result.taxRate).toBe(0)
    expect(result.taxAmount).toBe(0)
    expect(result.netYield).toBe(1000)
  })

  it('applies lower rate for longer holding periods', () => {
    const result = netYieldAfterIR(1000, 721, false)
    expect(result.taxRate).toBe(0.15)
    expect(result.taxAmount).toBe(150)
    expect(result.netYield).toBe(850)
  })
})

describe('resolveMonthlyYieldPercent', () => {
  const cdiAnnual = 14.15
  const ipcaAnnual = 5.0

  it('resolves CDB 100% CDI to monthly rate', () => {
    const monthly = resolveMonthlyYieldPercent('cdb', 100, undefined, cdiAnnual, ipcaAnnual, 0)
    expect(monthly).toBeCloseTo(annualToMonthly(14.15), 6)
  })

  it('resolves LCI with CDI percentage', () => {
    const monthly = resolveMonthlyYieldPercent('lci', 90, undefined, cdiAnnual, ipcaAnnual, 0)
    expect(monthly).toBeCloseTo(annualToMonthly(effectiveAnnualRate(90, cdiAnnual)), 6)
  })

  it('resolves tesouro_ipca with spread', () => {
    const monthly = resolveMonthlyYieldPercent('tesouro_ipca', undefined, 6, cdiAnnual, ipcaAnnual, 0)
    expect(monthly).toBeCloseTo(annualToMonthly(effectiveAnnualRateIPCA(6, ipcaAnnual)), 6)
  })

  it('resolves poupanca', () => {
    const monthly = resolveMonthlyYieldPercent('poupanca', undefined, undefined, cdiAnnual, ipcaAnnual, 0)
    expect(monthly).toBeCloseTo(annualToMonthly(poupancaAnnualRate(cdiAnnual)), 6)
  })

  it('returns existing rate for manual type', () => {
    expect(resolveMonthlyYieldPercent('manual', undefined, undefined, cdiAnnual, ipcaAnnual, 1.5)).toBe(1.5)
  })

  it('returns existing rate for undefined type', () => {
    expect(resolveMonthlyYieldPercent(undefined, undefined, undefined, cdiAnnual, ipcaAnnual, 2.0)).toBe(2.0)
  })
})

describe('getEffectiveAnnualRate', () => {
  it('returns CDI-based rate for CDB', () => {
    expect(getEffectiveAnnualRate('cdb', 100, undefined, 14.15, 5.0, 0)).toBe(14.15)
  })

  it('returns monthly * 12 for manual type', () => {
    expect(getEffectiveAnnualRate('manual', undefined, undefined, 14.15, 5.0, 1.5)).toBe(18)
  })
})
