import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Wallet, ArrowDownCircle, Scale, PiggyBank, Landmark } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/currency'
import { useMonthData } from '../../hooks/useMonthData'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { prevMonthKey } from '../../constants/months'
import { computeIncome, computeTotalExpenses, computeSavingsRate } from '../../utils/calculations'

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const delta = ((current - previous) / Math.abs(previous)) * 100
  const up = delta > 0
  const Icon = Math.abs(delta) < 1 ? Minus : up ? TrendingUp : TrendingDown
  const color = up ? 'text-emerald-600' : 'text-red-600'
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
  const { income, totalExpenses, extraordinaryIncome } = useMonthData(monthKey)
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const { expenseSections } = useSectionConfig()

  const totalIncome = income + extraordinaryIncome
  const balance = totalIncome - totalExpenses
  const savingsRate = computeSavingsRate(totalIncome, totalExpenses)

  // Accumulated balance across all months + initial balance from settings
  const appSettings = useFinanceStore((s) => s.appSettings)
  const allMonthKeys = useMemo(() => {
    const keys = new Set(transactions.map((t) => t.monthKey))
    return Array.from(keys).sort()
  }, [transactions])
  const accumulatedBalance = useMemo(() => {
    const initial = appSettings.initialBalance ?? 0
    return allMonthKeys.reduce((acc, key) => {
      const txs = transactions.filter((t) => t.monthKey === key)
      const extra = extraordinaryEntries.filter((e) => e.monthKey === key)
      const inc = computeIncome(txs) + extra.reduce((s, e) => s + e.netAmount, 0)
      const exp = computeTotalExpenses(txs, expenseSections)
      return acc + inc - exp
    }, initial)
  }, [transactions, extraordinaryEntries, allMonthKeys, appSettings.initialBalance, expenseSections])

  const prev = prevMonthKey(monthKey)
  const prevTxs = transactions.filter((t) => t.monthKey === prev)
  const prevExtraordinary = extraordinaryEntries.filter((e) => e.monthKey === prev)
  const prevIncome = computeIncome(prevTxs) + prevExtraordinary.reduce((s, e) => s + e.netAmount, 0)
  const prevExpenses = computeTotalExpenses(prevTxs, expenseSections)
  const prevBalance = prevIncome - prevExpenses
  const prevSavingsRate = computeSavingsRate(prevIncome, prevExpenses)

  return (
    <div className="flex flex-col gap-4">
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
        deltaEl={<DeltaBadge current={totalExpenses} previous={prevExpenses} />}
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
      <StatCard
        label="Saldo Acumulado (todas as entradas)"
        value={formatCurrency(accumulatedBalance)}
        subtitle={appSettings.initialBalance ? `Inclui saldo inicial de ${formatCurrency(appSettings.initialBalance)}` : undefined}
        icon={<Landmark size={18} className={accumulatedBalance >= 0 ? 'text-emerald-600' : 'text-red-500'} />}
        iconBg={accumulatedBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}
        valueColor={accumulatedBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}
      />
    </div>
  )
}
