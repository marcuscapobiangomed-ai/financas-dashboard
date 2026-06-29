import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { YearComparison } from '../../types/analytics'
import { formatCurrency } from '../../utils/currency'
import { EmptyState } from '../ui/EmptyState'
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, formatYAxisK } from '../../constants/chartStyles'

interface CategoryComparisonBarProps {
  data: YearComparison[]
  year1: number
  year2: number
}

export function CategoryComparisonBar({ data, year1, year2 }: CategoryComparisonBarProps) {
  // Take top 8 categories by spending in year 1 to prevent chart clutter
  const chartData = data.slice(0, 8).map((c) => ({
    name: c.label,
    [year1]: c.year1Total,
    [year2]: c.year2Total,
    deltaPercent: c.deltaPercent,
  }))

  const hasData = chartData.some((d) => (d[year1] ?? 0) > 0 || (d[year2] ?? 0) > 0)

  if (!hasData) {
    return <EmptyState title="Sem dados comparativos" description="Adicione despesas nos anos selecionados para visualizar" />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f3f4f6)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={formatYAxisK}
          tick={AXIS_TICK_STYLE}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            String(name)
          ]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey={String(year1)} fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={24} />
        {year1 !== year2 && (
          <Bar dataKey={String(year2)} fill="#cbd5e1" radius={[3, 3, 0, 0]} maxBarSize={24} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
