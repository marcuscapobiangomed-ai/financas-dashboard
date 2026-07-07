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
    <div className="glass-obsidian rounded-2xl p-5 hover:border-indigo-500/30 card-premium-glow transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center border border-current/10 ${iconBg}`}>
          {icon}
        </div>
        {deltaEl}
      </div>
      <p className={`text-2xl font-extrabold text-outfit tracking-tight leading-none mb-1.5 ${valueColor}`}>{value}</p>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">{subtitle}</p>}
    </div>
  )
}

export function SummaryCards({ monthKey }: { monthKey: string }) {
  const { income, totalExpenses, extraordinaryIncome, accumulatedBalance, carryoverBalance } = useMonthData(monthKey)
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const { expenseSections, cardSections } = useSectionConfig()
  const cardIds = cardSections.map((c) => c.id)

  const totalIncome = income + extraordinaryIncome
  const balance = totalIncome - totalExpenses
  const savingsRate = computeSavingsRate(totalIncome, totalExpenses)

  const appSettings = useFinanceStore((s) => s.appSettings)

  const prev = prevMonthKey(monthKey)
  const prevTxs = transactions.filter((t) => t.monthKey === prev)
  const prevExtraordinary = extraordinaryEntries.filter((e) => e.monthKey === prev)
  const prevIncome = computeIncome(prevTxs) + prevExtraordinary.reduce((s, e) => s + e.netAmount, 0)
  const prevExpenses = computeTotalExpenses(prevTxs, expenseSections, cardIds)
  const prevBalance = prevIncome - prevExpenses
  const prevSavingsRate = computeSavingsRate(prevIncome, prevExpenses)

  return (
    <div className="flex flex-col gap-4">
      {/* Hero - accumulated balance card at TOP */}
      <div className={`relative overflow-hidden rounded-3xl p-6 border transition-all duration-300 shadow-xl ${
        accumulatedBalance >= 0
          ? 'bg-gradient-to-br from-emerald-950/40 via-[#0A161D]/80 to-[#0C221D]/40 border-emerald-500/20 text-gray-100 shadow-emerald-950/10'
          : 'bg-gradient-to-br from-rose-950/40 via-[#1C0D11]/80 to-[#1D0C0F]/40 border-rose-500/20 text-gray-100 shadow-rose-950/10'
      }`}>
        {/* Decorative background glow */}
        <div className={`absolute -right-16 -top-16 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none ${
          accumulatedBalance >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
        }`} />

        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-gray-400 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Landmark size={14} className={accumulatedBalance >= 0 ? 'text-teal-400' : 'text-rose-400'} />
              Saldo Total Acumulado
            </p>
            <p className={`text-3xl sm:text-4xl font-extrabold text-outfit tracking-tight mt-1.5 ${
              accumulatedBalance >= 0 ? 'text-teal-400' : 'text-rose-400'
            }`}>
              {formatCurrency(accumulatedBalance)}
            </p>
          </div>
          {accumulatedBalance < 0 && (
            <span className="flex items-center gap-1 text-[10px] uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full font-bold shrink-0 animate-pulse">
              <AlertTriangle size={12} />
              Negativo
            </span>
          )}
          {accumulatedBalance >= 0 && (
            <span className="flex items-center gap-1 text-[10px] uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full font-bold shrink-0">
              Saldo Saudável
            </span>
          )}
        </div>

        {appSettings.initialBalance > 0 && monthKey === getCurrentMonthKey() && (
          <p className="text-gray-400 text-[10px] mt-1 font-medium">
            Inclui saldo inicial de {formatCurrency(appSettings.initialBalance)}
          </p>
        )}

        {/* Breakdown: previous month carryover + this month result = total */}
        <div className="mt-5 pt-4 border-t border-gray-200/10 dark:border-white/5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Saldo Anterior</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">{formatCurrency(carryoverBalance)}</span>
          </div>
          <span className="text-gray-400 dark:text-gray-600 text-sm font-light">+</span>
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Resultado do Mês</span>
            <span className={`font-semibold mt-0.5 block ${balance >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
              {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
            </span>
          </div>
          <span className="text-gray-400 dark:text-gray-600 text-sm font-light">=</span>
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider block font-extrabold">Total</span>
            <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">{formatCurrency(accumulatedBalance)}</span>
          </div>
        </div>
      </div>

      {/* Grid of 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Receita Total"
          value={formatCurrency(totalIncome)}
          icon={<Wallet size={18} className="text-emerald-500" />}
          iconBg="bg-emerald-500/10 text-emerald-500"
          deltaEl={<DeltaBadge current={totalIncome} previous={prevIncome} />}
        />
        <StatCard
          label="Total de Despesas"
          value={formatCurrency(totalExpenses)}
          icon={<ArrowDownCircle size={18} className="text-rose-500" />}
          iconBg="bg-rose-500/10 text-rose-500"
          deltaEl={<DeltaBadge current={totalExpenses} previous={prevExpenses} invert />}
          valueColor="text-rose-500"
        />
        <StatCard
          label="Balanço do Mês"
          value={formatCurrency(balance)}
          icon={<Scale size={18} className={balance >= 0 ? 'text-indigo-500' : 'text-orange-500'} />}
          iconBg={balance >= 0 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-orange-500/10 text-orange-500'}
          deltaEl={<DeltaBadge current={balance} previous={prevBalance} />}
          valueColor={balance >= 0 ? 'text-indigo-500 dark:text-indigo-400' : 'text-orange-500'}
        />
        <StatCard
          label="Taxa de Poupança"
          value={formatPercent(savingsRate)}
          icon={<PiggyBank size={18} className="text-violet-500" />}
          iconBg="bg-violet-500/10 text-violet-500"
          deltaEl={<DeltaBadge current={savingsRate} previous={prevSavingsRate} />}
          valueColor={savingsRate >= 20 ? 'text-teal-500' : savingsRate >= 10 ? 'text-yellow-500' : 'text-rose-500'}
        />
      </div>
    </div>
  )
}
