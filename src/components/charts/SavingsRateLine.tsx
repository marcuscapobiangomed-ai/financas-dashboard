import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useAnnualData } from '../../hooks/useAnnualData'
import { useFinanceStore } from '../../store/useFinanceStore'
import { EmptyState } from '../ui/EmptyState'
import { TOOLTIP_STYLE } from '../../constants/chartStyles'

export function SavingsRateLine({ fromMonthKey }: { fromMonthKey?: string }) {
  const { trends } = useAnnualData(fromMonthKey)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const hasData = trends.some((t) => t.income > 0)
  const goal = appSettings.defaultSavingsGoalPercent

  if (!hasData) {
    return <EmptyState title="Sem dados" description="Adicione receitas para visualizar a taxa de poupança" />
  }

  // Check if most months are above or below goal for dynamic coloring
  const aboveGoalCount = trends.filter((t) => t.savingsRate >= goal).length
  const dominantAbove = aboveGoalCount > trends.length / 2
  const strokeColor = dominantAbove ? '#10b981' : '#6366f1'

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="savingsGradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="savingsGradIndigo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f3f4f6)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={40}
          domain={[
            (dataMin: number) => Math.min(0, Math.floor(dataMin / 10) * 10),
            (dataMax: number) => Math.max(100, Math.ceil(dataMax / 10) * 10),
          ]}
        />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Taxa de Poupança']}
          contentStyle={TOOLTIP_STYLE}
        />
        <ReferenceLine
          y={goal}
          stroke="#10b981"
          strokeDasharray="4 4"
          label={{ value: `Meta ${goal}%`, position: 'right', fontSize: 10, fill: '#10b981' }}
        />
        <Area
          type="monotone"
          dataKey="savingsRate"
          stroke={strokeColor}
          strokeWidth={2}
          fill={dominantAbove ? 'url(#savingsGradGreen)' : 'url(#savingsGradIndigo)'}
          dot={{ r: 3, fill: strokeColor }}
          activeDot={{ r: 5, fill: strokeColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
