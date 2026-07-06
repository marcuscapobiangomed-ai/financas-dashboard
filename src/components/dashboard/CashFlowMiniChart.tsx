import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useCashFlowProjection } from '../../hooks/useCashFlowProjection'
import { formatCurrency } from '../../utils/currency'
import { getMonthShort, getCurrentMonthKey, prevMonthKey } from '../../constants/months'
import { TOOLTIP_STYLE } from '../../constants/chartStyles'

export function CashFlowMiniChart({ monthKey }: { monthKey: string }) {
  const projection = useCashFlowProjection(1)

  const chartData = useMemo(() => {
    const currentIdx = projection.months.findIndex((m) => m.monthKey === monthKey)
    if (currentIdx < 0) return []

    const startIdx = Math.max(0, currentIdx - 5)
    return projection.months.slice(startIdx, currentIdx + 1).map((m) => ({
      label: getMonthShort(m.monthKey),
      monthKey: m.monthKey,
      balance: m.accumulatedBalance,
      isCurrent: m.monthKey === monthKey,
    }))
  }, [projection.months, monthKey])

  const currentBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : 0
  const prevBalance = chartData.length > 1 ? chartData[chartData.length - 2].balance : 0
  const delta = currentBalance - prevBalance
  const deltaPercent = prevBalance !== 0 ? (delta / Math.abs(prevBalance)) * 100 : 0
  const isPositive = delta >= 0

  if (chartData.length < 2) return null

  const minBalance = Math.min(...chartData.map((d) => d.balance))
  const maxBalance = Math.max(...chartData.map((d) => d.balance))
  const isAllPositive = minBalance >= 0

  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Evolução do Saldo
          </p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">
            {formatCurrency(currentBalance)}
          </p>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isPositive
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        }`}>
          {Math.abs(deltaPercent) < 1 ? (
            <Minus size={12} />
          ) : isPositive ? (
            <TrendingUp size={12} />
          ) : (
            <TrendingDown size={12} />
          )}
          {isPositive ? '+' : ''}{deltaPercent.toFixed(1)}%
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <defs>
            <linearGradient id="miniBalGradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="miniBalGradNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Saldo']}
            contentStyle={TOOLTIP_STYLE}
          />
          {!isAllPositive && <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />}
          <Area
            type="monotone"
            dataKey="balance"
            stroke={isAllPositive ? '#10b981' : '#ef4444'}
            strokeWidth={2.5}
            fill={isAllPositive ? 'url(#miniBalGradPos)' : 'url(#miniBalGradNeg)'}
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (payload.isCurrent) {
                return (
                  <circle
                    key={payload.monthKey}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={isAllPositive ? '#10b981' : '#ef4444'}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )
              }
              return <circle key={payload.monthKey} cx={cx} cy={cy} r={2.5} fill={isAllPositive ? '#10b981' : '#ef4444'} />
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
        Últimos {chartData.length} meses
      </p>
    </div>
  )
}
