import { getInvestmentMeta } from '../constants/investmentTypes'
import type { Transaction } from '../types/transaction'
import type { Investment } from '../types/investment'
import { OBRIGATORIEDADE_LIMITS, DEDUCTIBLE_EXPENSE_PATTERNS } from '../constants/irLimits'

export interface IRAnalysis {
  isMandatory: boolean
  reasons: { type: string; description: string; value?: number }[]
  income: { regular: number; exclusive: number; exempt: number; total: number }
  deductions: { tithes: number; offerings: number; health: number; education: number; inss: number; total: number }
  investments: { taxable: { name: string; value: number; type: string }[]; exempt: { name: string; value: number; type: string }[] }
  assets: { total: number; breakdown: { category: string; value: number }[] }
  completeness: { score: number; missing: string[]; suggestions: string[] }
  alerts: { type: 'warning' | 'error' | 'success'; title: string; description: string }[]
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function analyzeIRPF(
  transactions: Transaction[],
  extraordinaryEntries: any[],
  investments: Investment[],
  selectedYear: number
): IRAnalysis {
  const yearMonths = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`)

  const yearTransactions = transactions.filter(t => yearMonths.includes(t.monthKey))
  const yearExtra = extraordinaryEntries.filter(e => yearMonths.includes(e.monthKey))

  const regularIncome = yearTransactions
    .filter(t => t.section === 'entradas' && !t.tags?.includes('investment-yield'))
    .reduce((s, t) => s + t.amount, 0)

  const exclusiveIncome = {
    decimo: yearExtra.filter(e => e.type === 'decimo_terceiro').reduce((s, e) => s + e.grossAmount, 0),
    plr: yearExtra.filter(e => e.type === 'plr').reduce((s, e) => s + e.grossAmount, 0),
    taxableYields: 0,
  }

  const taxableInvestments: { name: string; value: number; type: string }[] = []
  const exemptInvestments: { name: string; value: number; type: string }[] = []

  investments.forEach(inv => {
    const isExempt = getInvestmentMeta(inv.investmentType).isTaxExempt
    const monthlyYield = inv.principal * inv.monthlyYieldPercent / 100
    const startParts = inv.startMonth.split('-').map(Number)
    const invStartMonth = startParts[0] * 12 + startParts[1]
    let months = 0
    yearMonths.forEach(mk => {
      const [y, m] = mk.split('-').map(Number)
      if (y * 12 + m >= invStartMonth && inv.isActive) months++
    })
    const annualYield = monthlyYield * months

    if (annualYield > 0) {
      if (isExempt) {
        exemptInvestments.push({ name: inv.name, value: annualYield, type: getInvestmentMeta(inv.investmentType).label })
      } else {
        exclusiveIncome.taxableYields += annualYield
        taxableInvestments.push({ name: inv.name, value: annualYield, type: getInvestmentMeta(inv.investmentType).label })
      }
    }
  })

  const exclusiveTotal = exclusiveIncome.decimo + exclusiveIncome.plr + exclusiveIncome.taxableYields

  const exemptIncome = {
    ferias: yearExtra.filter(e => e.type === 'ferias').reduce((s, e) => s + e.grossAmount, 0),
    bonus: yearExtra.filter(e => e.type === 'bonus' || e.type === 'outro').reduce((s, e) => s + e.grossAmount, 0),
    yields: exemptInvestments.reduce((s, i) => s + i.value, 0),
  }
  const exemptTotal = exemptIncome.ferias + exemptIncome.bonus + exemptIncome.yields

  const totalIncome = regularIncome + exclusiveTotal + exemptTotal

  const totalAssets = investments.reduce((s, inv) => s + inv.principal, 0)

  const expenses = yearTransactions.filter(t => t.type === 'expense')
  const healthExpenses = expenses.filter(e => DEDUCTIBLE_EXPENSE_PATTERNS.health.some(p => e.description?.toLowerCase().includes(p)))
  const educationExpenses = expenses.filter(e => DEDUCTIBLE_EXPENSE_PATTERNS.education.some(p => e.description?.toLowerCase().includes(p)))

  const deductions = {
    tithes: yearExtra.reduce((s, e) => s + e.tithe, 0),
    offerings: yearExtra.reduce((s, e) => s + e.offering, 0),
    health: healthExpenses.reduce((s, e) => s + e.amount, 0),
    education: educationExpenses.reduce((s, e) => s + e.amount, 0),
    inss: 0,
  }
  const deductionsTotal = deductions.health + deductions.education + deductions.inss

  const reasons: { type: string; description: string; value?: number }[] = []
  const alerts: { type: 'warning' | 'error' | 'success'; title: string; description: string }[] = []

  if (regularIncome > OBRIGATORIEDADE_LIMITS.incomeThreshold) {
    reasons.push({ type: 'renda', description: 'Renda tributável acima de R$ 211.200', value: regularIncome })
  }
  if (exemptTotal > OBRIGATORIEDADE_LIMITS.exemptIncomeThreshold) {
    reasons.push({ type: 'isenta', description: 'Renda isenta acima de R$ 40.000', value: exemptTotal })
  }
  if (totalAssets > OBRIGATORIEDADE_LIMITS.patrimonyThreshold) {
    reasons.push({ type: 'patrimonio', description: 'Bens acima de R$ 300.000', value: totalAssets })
  }

  const isMandatory = reasons.length > 0

  if (deductions.tithes > 0 || deductions.offerings > 0) {
    alerts.push({
      type: 'warning',
      title: 'Contribuições religiosas não dedutíveis',
      description: 'Dízimos e ofertas não são dedutíveis da base de cálculo do IRPF.',
    })
  }

  if (deductions.education > 0 && regularIncome > 0) {
    const maxEducation = regularIncome * 0.3
    if (deductions.education > maxEducation) {
      alerts.push({
        type: 'warning',
        title: 'Despesas com educação limitadas',
        description: `Suas despesas com educação (R$ ${fmt(deductions.education)}) excedem o limite de 30% da renda (R$ ${fmt(maxEducation)}).`,
      })
    }
  }

  if (healthExpenses.length > 0) {
    alerts.push({
      type: 'success',
      title: 'Despesas médicas detectadas',
      description: `Encontramos R$ ${fmt(deductions.health)} em despesas médicas - estas são 100% dedutíveis!`,
    })
  }

  if (taxableInvestments.length > 0) {
    const estimatedIR = taxableInvestments.reduce((s, inv) => s + inv.value * 0.15, 0)
    alerts.push({
      type: 'warning',
      title: 'Imposto sobre investimentos',
      description: `Seus investimentos tributáveis devem gerar IR de aproximadamente R$ ${fmt(estimatedIR)} (15% sobre rendimentos).`,
    })
  }

  const missing: string[] = []
  const suggestions: string[] = []

  if (regularIncome === 0) missing.push('Nenhuma renda tributável encontrada')
  else suggestions.push(`Renda tributável de R$ ${fmt(regularIncome)} mapeada automaticamente`)

  if (deductions.health === 0) suggestions.push('💡 Dica: Adicione despesas médicas para dedução integral')
  if (deductions.education > 0) suggestions.push(`✓ Educação: R$ ${fmt(deductions.education)} em deduções`)

  if (yearExtra.filter(e => e.type === 'decimo_terceiro').length === 0) suggestions.push('💡 Cadastre seu 13° salário nos lançamentos extraordinários')
  if (yearExtra.filter(e => e.type === 'plr').length === 0) suggestions.push('💡 Cadastre PLR (Participação nos Lucros) se aplicável')
  if (yearExtra.filter(e => e.type === 'ferias').length === 0) suggestions.push('💡 Cadastre férias/abono pecuniário')

  const completenessScore = Math.min(100, Math.round(
    (regularIncome > 0 ? 25 : 0) +
    (exclusiveTotal > 0 ? 15 : 0) +
    (exemptTotal > 0 ? 10 : 0) +
    (totalAssets > 0 ? 20 : 0) +
    (deductionsTotal > 0 ? 15 : 0) +
    (investments.length > 0 ? 15 : 0)
  ))

  return {
    isMandatory,
    reasons,
    income: { regular: regularIncome, exclusive: exclusiveTotal, exempt: exemptTotal, total: totalIncome },
    deductions: { ...deductions, total: deductionsTotal },
    investments: { taxable: taxableInvestments, exempt: exemptInvestments },
    assets: {
      total: totalAssets,
      breakdown: [
        { category: 'Investimentos', value: totalAssets },
        { category: 'Conta Corrente', value: 0 },
        { category: 'Outros', value: 0 },
      ],
    },
    completeness: { score: completenessScore, missing, suggestions },
    alerts,
  }
}

export function calculateIR(income: number): { aliquot: number; taxDue: number; effectiveRate: number } {
  const table = [
    { limit: 2259.20, aliquot: 0, deduction: 0 },
    { limit: 2826.65, aliquot: 7.5, deduction: 169.44 },
    { limit: 3751.05, aliquot: 15, deduction: 381.44 },
    { limit: 4664.68, aliquot: 22.5, deduction: 662.77 },
    { limit: Infinity, aliquot: 27.5, deduction: 896.00 },
  ]
  const row = table.find(t => income <= t.limit) || table[table.length - 1]
  const taxDue = Math.max(0, income * (row.aliquot / 100) - row.deduction)
  return { aliquot: row.aliquot, taxDue, effectiveRate: income > 0 ? (taxDue / income) * 100 : 0 }
}
