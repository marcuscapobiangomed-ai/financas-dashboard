import { TrendingUp, TrendingDown, Minus, Wallet, ArrowDownCircle, Scale, PiggyBank } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/currency'
import { useMonthData } from '../../hooks/useMonthData'
import { useFinanceStore } from '../../store/useFinanceStore'
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

function StatCard({ label, value, subtitle, icon, iconBg, deltaEl, valueColor = 'text-gray-900' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {deltaEl}
      </div>
      <p className={`text-2xl font-bold ${valueColor} leading-none mb-1`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export function SummaryCards({ monthKey }: { monthKey: string }) {
  const { income, totalExpenses, extraordinaryIncome } = useMonthData(monthKey)
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)

  const totalIncome = income + extraordinaryIncome
  const balance = totalIncome - totalExpenses
  const savingsRate = computeSavingsRate(totalIncome, totalExpenses)

  const prev = prevMonthKey(monthKey)
  const prevTxs = transactions.filter((t) => t.monthKey === prev)
  const prevExtraordinary = extraordinaryEntries.filter((e) => e.monthKey === prev)
  const prevIncome = computeIncome(prevTxs) + prevExtraordinary.reduce((s, e) => s + e.netAmount, 0)
  const prevExpenses = computeTotalExpenses(prevTxs)
  const prevBalance = prevIncome - prevExpenses
  const prevSavingsRate = computeSavingsRate(prevIncome, prevExpenses)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Receita Total"
        value={formatCurrency(totalIncome)}
        icon={<Wallet size={18} className="text-emerald-600" />}
        iconBg="bg-emerald-50"
        deltaEl={<DeltaBadge current={totalIncome} previous={prevIncome} />}
      />
      <StatCard
        label="Total de Despesas"
        value={formatCurrency(totalExpenses)}
        icon={<ArrowDownCircle size={18} className="text-red-500" />}
        iconBg="bg-red-50"
        deltaEl={<DeltaBadge current={totalExpenses} previous={prevExpenses} />}
        valueColor="text-red-600"
      />
      <StatCard
        label="Balanço do Mês"
        value={formatCurrency(balance)}
        icon={<Scale size={18} className={balance >= 0 ? 'text-indigo-600' : 'text-orange-500'} />}
        iconBg={balance >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}
        deltaEl={<DeltaBadge current={balance} previous={prevBalance} />}
        valueColor={balance >= 0 ? 'text-indigo-700' : 'text-orange-600'}
      />
      <StatCard
        label="Taxa de Poupança"
        value={formatPercent(savingsRate)}
        icon={<PiggyBank size={18} className="text-violet-600" />}
        iconBg="bg-violet-50"
        deltaEl={<DeltaBadge current={savingsRate} previous={prevSavingsRate} />}
        valueColor={savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'}
      />
    </div>
  )
}
