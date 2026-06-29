import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/currency'

interface SummaryMetricCardProps {
  label: string
  value: number
  deltaPercent: number
  format?: 'currency' | 'percent'
  invertDelta?: boolean
}

export function SummaryMetricCard({ label, value, deltaPercent, format = 'currency', invertDelta = false }: SummaryMetricCardProps) {
  const formattedValue = format === 'percent' ? formatPercent(value) : formatCurrency(value)

  const isPositive = invertDelta ? deltaPercent < 0 : deltaPercent > 0
  const isNeutral = Math.abs(deltaPercent) < 0.5
  const deltaColor = isNeutral
    ? 'text-gray-400 dark:text-gray-500'
    : isPositive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-500 dark:text-red-400'
  const deltaBg = isNeutral
    ? 'bg-gray-50 dark:bg-gray-700/50'
    : isPositive
      ? 'bg-emerald-50 dark:bg-emerald-900/20'
      : 'bg-red-50 dark:bg-red-900/20'

  const DeltaIcon = isNeutral ? Minus : deltaPercent > 0 ? TrendingUp : TrendingDown

  return (
    <div className="glass-panel p-4 flex flex-col gap-2 animate-fade-in-up">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold tracking-tight ${value >= 0 || format === 'percent' ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>
        {formattedValue}
      </p>
      {!isNaN(deltaPercent) && (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full w-fit ${deltaBg}`}>
          <DeltaIcon size={12} className={deltaColor} />
          <span className={`text-xs font-semibold ${deltaColor}`}>
            {Math.abs(deltaPercent).toFixed(1)}%
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">vs mês ant.</span>
        </div>
      )}
    </div>
  )
}
