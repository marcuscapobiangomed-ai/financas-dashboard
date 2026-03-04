import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useAnnualData } from '../../hooks/useAnnualData'
import { formatCurrency } from '../../utils/currency'
import { EmptyState } from '../ui/EmptyState'

export function IncomeVsExpenseBar({ fromMonthKey }: { fromMonthKey?: string }) {
  const { trends } = useAnnualData(fromMonthKey)
  const hasData = trends.some((t) => t.income > 0 || t.expenses > 0)

  if (!hasData) {
    return <EmptyState title="Sem dados históricos" description="Adicione lançamentos para visualizar a evolução" />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            name === 'income' ? 'Receita' : name === 'expenses' ? 'Despesas' : 'Balanço',
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
        />
        <Legend
          formatter={(v) => v === 'income' ? 'Receita' : v === 'expenses' ? 'Despesas' : 'Balanço'}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11 }}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" />
        <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
