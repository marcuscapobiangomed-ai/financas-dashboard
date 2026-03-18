// ── Constants ──────────────────────────────────────────────────────

export const BUSINESS_DAYS_PER_YEAR = 252

// ── IR Regressive Table ────────────────────────────────────────────

export interface IRBracket {
  maxDays: number
  rate: number   // decimal, e.g. 0.225
  label: string
}

export const IR_TABLE: IRBracket[] = [
  { maxDays: 180, rate: 0.225, label: '22,5% (até 180 dias)' },
  { maxDays: 360, rate: 0.20, label: '20% (181–360 dias)' },
  { maxDays: 720, rate: 0.175, label: '17,5% (361–720 dias)' },
  { maxDays: Infinity, rate: 0.15, label: '15% (acima de 720 dias)' },
]

// ── Rate Conversions ───────────────────────────────────────────────

/** Annual rate (e.g. 14.15 for 14.15%) → daily rate using 252 business days */
export function annualToDaily(annualPercent: number): number {
  return (Math.pow(1 + annualPercent / 100, 1 / BUSINESS_DAYS_PER_YEAR) - 1) * 100
}

/** Annual rate → monthly rate (compound) */
export function annualToMonthly(annualPercent: number): number {
  return (Math.pow(1 + annualPercent / 100, 1 / 12) - 1) * 100
}

/** Effective annual yield for CDI-based investment: cdiPercent% × CDI rate */
export function effectiveAnnualRate(cdiPercent: number, cdiRateAnnual: number): number {
  return (cdiPercent / 100) * cdiRateAnnual
}

/** Effective annual rate for IPCA+ investments: (1+IPCA)(1+spread) - 1 */
export function effectiveAnnualRateIPCA(ipcaSpread: number, ipcaRateAnnual: number): number {
  return ((1 + ipcaRateAnnual / 100) * (1 + ipcaSpread / 100) - 1) * 100
}

/** Poupança: 70% da Selic quando Selic > 8.5%, senão 70% da Selic (teto menor) */
export function poupancaAnnualRate(selicAnnual: number): number {
  if (selicAnnual > 8.5) return 0.70 * selicAnnual
  // Quando Selic ≤ 8.5%, rendimento = 70% da Selic (mesma regra na prática)
  return 0.70 * selicAnnual
}

// ── Projections ────────────────────────────────────────────────────

export interface YieldProjection {
  dailyRate: number
  monthlyRate: number
  annualRate: number
  dailyAmount: number
  monthlyAmount: number
  annualAmount: number
}

export function computeProjection(principal: number, annualRatePercent: number): YieldProjection {
  const dailyRate = annualToDaily(annualRatePercent)
  const monthlyRate = annualToMonthly(annualRatePercent)
  return {
    dailyRate,
    monthlyRate,
    annualRate: annualRatePercent,
    dailyAmount: Math.round(principal * dailyRate / 100 * 100) / 100,
    monthlyAmount: Math.round(principal * monthlyRate / 100 * 100) / 100,
    annualAmount: Math.round(principal * annualRatePercent / 100 * 100) / 100,
  }
}

// ── Tax ────────────────────────────────────────────────────────────

export function getIRRate(daysSinceStart: number): number {
  for (const bracket of IR_TABLE) {
    if (daysSinceStart <= bracket.maxDays) return bracket.rate
  }
  return 0.15
}

export function getIRBracketLabel(daysSinceStart: number): string {
  for (const bracket of IR_TABLE) {
    if (daysSinceStart <= bracket.maxDays) return bracket.label
  }
  return '15% (acima de 720 dias)'
}

export function daysSinceStartMonth(startMonth: string): number {
  const [y, m] = startMonth.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

export function netYieldAfterIR(
  grossYield: number,
  daysSinceStart: number,
  isTaxExempt: boolean
): { netYield: number; taxAmount: number; taxRate: number } {
  if (isTaxExempt) return { netYield: grossYield, taxAmount: 0, taxRate: 0 }
  const taxRate = getIRRate(daysSinceStart)
  const taxAmount = Math.round(grossYield * taxRate * 100) / 100
  return { netYield: grossYield - taxAmount, taxAmount, taxRate }
}

// ── Resolve monthlyYieldPercent from investment type + rates ──────

export function resolveMonthlyYieldPercent(
  investmentType: string | undefined,
  cdiPercent: number | undefined,
  ipcaPercent: number | undefined,
  cdiRateAnnual: number,
  ipcaRateAnnual: number,
  existingMonthlyYieldPercent: number
): number {
  const type = investmentType ?? 'manual'
  switch (type) {
    case 'cdb':
    case 'lci':
    case 'lca':
    case 'tesouro_selic':
    case 'fundo':
      return annualToMonthly(effectiveAnnualRate(cdiPercent ?? 100, cdiRateAnnual))
    case 'tesouro_ipca':
      return annualToMonthly(effectiveAnnualRateIPCA(ipcaPercent ?? 0, ipcaRateAnnual))
    case 'poupanca':
      return annualToMonthly(poupancaAnnualRate(cdiRateAnnual))
    case 'manual':
    default:
      return existingMonthlyYieldPercent
  }
}

/** Get the effective annual rate for an investment (for display) */
export function getEffectiveAnnualRate(
  investmentType: string | undefined,
  cdiPercent: number | undefined,
  ipcaPercent: number | undefined,
  cdiRateAnnual: number,
  ipcaRateAnnual: number,
  monthlyYieldPercent: number
): number {
  const type = investmentType ?? 'manual'
  switch (type) {
    case 'cdb':
    case 'lci':
    case 'lca':
    case 'tesouro_selic':
    case 'fundo':
      return effectiveAnnualRate(cdiPercent ?? 100, cdiRateAnnual)
    case 'tesouro_ipca':
      return effectiveAnnualRateIPCA(ipcaPercent ?? 0, ipcaRateAnnual)
    case 'poupanca':
      return poupancaAnnualRate(cdiRateAnnual)
    case 'manual':
    default:
      return monthlyYieldPercent * 12
  }
}
