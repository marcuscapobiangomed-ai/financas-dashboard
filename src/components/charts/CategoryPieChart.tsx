import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAnalytics } from '../../hooks/useAnalytics'
import { CATEGORY_META } from '../../types/category'
import { CategoryBreakdown } from '../../types/analytics'
import { formatCurrency } from '../../utils/currency'
import { EmptyState } from '../ui/EmptyState'
import { TOOLTIP_STYLE } from '../../constants/chartStyles'

interface Props {
  monthKey?: string
  data?: CategoryBreakdown[]
  totalLabel?: string
}

export function CategoryPieChart({ monthKey, data, totalLabel }: Props) {
  const analytics = useAnalytics(monthKey)
  const categoryBreakdowns = data ?? analytics.categoryBreakdowns

  if (categoryBreakdowns.length === 0) {
    return <EmptyState title="Sem dados" description="Adicione lançamentos para ver o gráfico" />
  }

  const total = categoryBreakdowns.reduce((s, c) => s + c.total, 0)

  const dataWithColors = categoryBreakdowns.map((c) => ({
    name: c.label,
    value: c.total,
    color: CATEGORY_META[c.category]?.color ?? '#6b7280',
    percentage: c.percentage,
  }))

  return (
    <ResponsiveContainer width="100%" height={340}>
      <PieChart>
        <Pie
          data={dataWithColors}
          cx="50%"
          cy="45%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {dataWithColors.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [
            `${formatCurrency(Number(value))} (${dataWithColors.find((d) => d.name === name)?.percentage.toFixed(1) ?? 0}%)`,
            name,
          ]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>}
        />
        {/* Center label */}
        <text
          x="50%"
          y="42%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-900 dark:fill-gray-100"
          fontSize="15"
          fontWeight="700"
        >
          {formatCurrency(total)}
        </text>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-400"
          fontSize="9"
        >
          {totalLabel ?? 'Total despesas'}
        </text>
      </PieChart>
    </ResponsiveContainer>
  )
}
