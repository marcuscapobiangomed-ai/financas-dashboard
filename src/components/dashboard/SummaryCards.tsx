import { TrendingUp, TrendingDown, Minus, Wallet, ArrowDownCircle, Scale, PiggyBank, Landmark, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/currency'
import { useMonthData } from '../../hooks/useMonthData'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { prevMonthKey, getCurrentMonthKey } from '../../constants/months'
import { computeIncome, computeTotalExpenses, computeSavingsRate } from '../../utils/calculations'

function DeltaBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0) return null
  const delta = ((current - previous) / Math.abs(previous)) * 100
  const up = delta > 0
  const Icon = Math.abs(delta) < 1 ? Minus : up ? TrendingUp : TrendingDown
  // For expenses, going up is bad (red) and going down is good (green)
  const color = invert
    ? (up ? 'text-red-600' : 'text-emerald-600')
    : (up ? 'text-emerald-600' : 'text-red-600')
  return (
    <span className={`flex items-center gap-0.5 text-xs ${color}`}>
      <Icon size={11} />
      {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

interface StatCardProps {
  label: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  iconBg: string
  deltaEl?: React.ReactNode
  valueColor?: string
}

function StatCard({ label, value, subtitle, icon, iconBg, deltaEl, valueColor = 'text-gray-900 dark:text-gray-100' }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {deltaEl}
      </div>
      <p className={`text-2xl font-bold ${valueColor} leading-none mb-1`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export function SummaryCards({ monthKey }: { monthKey: string }) {
  const { income, totalExpenses, extraordinaryIncome, accumulatedBalance, carryoverBalance } = useMonthData(monthKey)
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const { expenseSections } = useSectionConfig()

  const totalIncome = income + extraordinaryIncome
  const balance = totalIncome - totalExpenses
  const savingsRate = computeSavingsRate(totalIncome, totalExpenses)

  const appSettings = useFinanceStore((s) => s.appSettings)

  const prev = prevMonthKey(monthKey)
  const prevTxs = transactions.filter((t) => t.monthKey === prev)
  const prevExtraordinary = extraordinaryEntries.filter((e) => e.monthKey === prev)
  const prevIncome = computeIncome(prevTxs) + prevExtraordinary.reduce((s, e) => s + e.netAmount, 0)
  const prevExpenses = computeTotalExpenses(prevTxs, expenseSections)
  const prevBalance = prevIncome - prevExpenses
  const prevSavingsRate = computeSavingsRate(prevIncome, prevExpenses)

  return (
    <div className="flex flex-col gap-4">
      {/* Hero - accumulated balance card at TOP */}
      <div className={`rounded-2xl p-5 sm:p-6 shadow-lg transition-colors ${
        accumulatedBalance >= 0
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'
          : 'bg-gradient-to-br from-red-500 to-red-700 text-white'
      }`}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-white/80 text-xs font-medium uppercase tracking-wide flex items-center gap-1.5">
              <Landmark size={15} />
              Saldo Total Acumulado
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
              {formatCurrency(accumulatedBalance)}
            </p>
          </div>
          {accumulatedBalance < 0 && (
            <span className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold shrink-0">
              <AlertTriangle size={13} />
              Negativo
            </span>
          )}
        </div>

        {appSettings.initialBalance > 0 && monthKey === getCurrentMonthKey() && (
          <p className="text-white/60 text-[10px] mt-1">
            Inclui saldo inicial de {formatCurrency(appSettings.initialBalance)}
          </p>
        )}

        {/* Breakdown: previous month carryover + this month result = total */}
        <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <div>
            <span className="text-white/50 text-[10px] block">Saldo Anterior</span>
            <span className="font-semibold">{formatCurrency(carryoverBalance)}</span>
          </div>
          <span className="text-white/30 text-lg font-light">+</span>
          <div>
            <span className="text-white/50 text-[10px] block">Resultado do Mês</span>
            <span className={`font-semibold ${balance >= 0 ? '' : 'text-red-200'}`}>
              {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
            </span>
          </div>
          <span className="text-white/30 text-lg font-light">=</span>
          <div>
            <span className="text-white/50 text-[10px] block">Total</span>
            <span className="font-bold">{formatCurrency(accumulatedBalance)}</span>
          </div>
        </div>
      </div>

      {/* Grid of 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Receita Total"
        value={formatCurrency(totalIncome)}
        icon={<Wallet size={18} className="text-emerald-600" />}
        iconBg="bg-emerald-50 dark:bg-emerald-900/30"
        deltaEl={<DeltaBadge current={totalIncome} previous={prevIncome} />}
      />
      <StatCard
        label="Total de Despesas"
        value={formatCurrency(totalExpenses)}
        icon={<ArrowDownCircle size={18} className="text-red-500" />}
        iconBg="bg-red-50 dark:bg-red-900/30"
        deltaEl={<DeltaBadge current={totalExpenses} previous={prevExpenses} invert />}
        valueColor="text-red-600"
      />
      <StatCard
        label="Balanço do Mês"
        value={formatCurrency(balance)}
        icon={<Scale size={18} className={balance >= 0 ? 'text-indigo-600' : 'text-orange-500'} />}
        iconBg={balance >= 0 ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-orange-50 dark:bg-orange-900/30'}
        deltaEl={<DeltaBadge current={balance} previous={prevBalance} />}
        valueColor={balance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-orange-600'}
      />
      <StatCard
        label="Taxa de Poupança"
        value={formatPercent(savingsRate)}
        icon={<PiggyBank size={18} className="text-violet-600" />}
        iconBg="bg-violet-50 dark:bg-violet-900/30"
        deltaEl={<DeltaBadge current={savingsRate} previous={prevSavingsRate} />}
        valueColor={savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'}
      />
      </div>
    </div>
  )
}
