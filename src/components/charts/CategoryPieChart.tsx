import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAnalytics } from '../../hooks/useAnalytics'
import { CATEGORY_META } from '../../types/category'
import { formatCurrency } from '../../utils/currency'
import { EmptyState } from '../ui/EmptyState'

interface Props {
  monthKey: string
}

export function CategoryPieChart({ monthKey }: Props) {
  const { categoryBreakdowns } = useAnalytics(monthKey)

  if (categoryBreakdowns.length === 0) {
    return <EmptyState title="Sem dados" description="Adicione lançamentos para ver o gráfico" />
  }

  const dataWithColors = categoryBreakdowns.map((c) => ({
    name: c.label,
    value: c.total,
    color: CATEGORY_META[c.category]?.color ?? '#6b7280',
    percentage: c.percentage,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
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
          formatter={(value) => [formatCurrency(Number(value)), '']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
