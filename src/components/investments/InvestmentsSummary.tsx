import { Investment } from '../../types/investment'
import { getInvestmentMeta } from '../../constants/investmentTypes'
import { formatCurrency } from '../../utils/currency'
import { daysSinceStartMonth, netYieldAfterIR } from '../../utils/investmentCalc'

interface InvestmentsSummaryProps {
  investments: Investment[]
}

export function InvestmentsSummary({ investments }: InvestmentsSummaryProps) {
  const activeInvestments = investments.filter((i) => i.isActive)
  const totalPrincipal = activeInvestments.reduce((s, i) => s + i.principal, 0)
  
  const fixedInvestments = activeInvestments.filter(i => {
    const m = getInvestmentMeta(i.investmentType)
    return m.yieldInputMode !== 'variable_income'
  })
  const variableInvestments = activeInvestments.filter(i => {
    const m = getInvestmentMeta(i.investmentType)
    return m.yieldInputMode === 'variable_income'
  })

  const totalFixed = fixedInvestments.reduce((s, i) => s + i.principal, 0)
  const totalVariable = variableInvestments.reduce((s, i) => s + i.principal, 0)

  const totalMonthlyYieldGross = activeInvestments.reduce(
    (s, i) => s + (i.principal * i.monthlyYieldPercent / 100), 0
  )

  const totalMonthlyTax = activeInvestments.reduce((s, i) => {
    const meta = getInvestmentMeta(i.investmentType)
    if (meta.yieldInputMode === 'variable_income') return s
    const monthlyAmt = i.principal * i.monthlyYieldPercent / 100
    const days = daysSinceStartMonth(i.startMonth)
    const { taxAmount } = netYieldAfterIR(monthlyAmt, days, meta.isTaxExempt)
    return s + taxAmount
  }, 0)
  const totalMonthlyNet = totalMonthlyYieldGross - totalMonthlyTax

  if (activeInvestments.length === 0) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="glass-panel-lg p-5 flex flex-col justify-between">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Patrimônio Total</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalPrincipal)}</p>
      </div>
      <div className="glass-panel-lg p-5 border-t-4 border-t-indigo-500">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Renda Fixa</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalFixed)}</p>
      </div>
      <div className="glass-panel-lg p-5 border-t-4 border-t-emerald-500">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Renda Var.</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalVariable)}</p>
      </div>
      <div className="glass-panel-lg p-5 bg-gradient-to-br from-emerald-50/80 to-cyan-50/80 dark:from-emerald-900/30 dark:to-cyan-900/20">
        <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Rend. Mensal Liq.</p>
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalMonthlyNet)}</p>
      </div>
    </div>
  )
}
