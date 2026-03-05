import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMemo } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Category, CATEGORY_META } from '../../types/category'
import { getLast12MonthKeys, getMonthShort } from '../../constants/months'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { formatCurrency } from '../../utils/currency'
import { EmptyState } from '../ui/EmptyState'

export function CategoryStackedBar({ fromMonthKey }: { fromMonthKey?: string }) {
  const transactions = useFinanceStore((s) => s.transactions)
  const { expenseSections } = useSectionConfig()

  const { data, categories } = useMemo(() => {
    const keys = getLast12MonthKeys(fromMonthKey)
    const usedCategories = new Set<Category>()

    const data = keys.map((key) => {
      const monthTxs = transactions.filter(
        (t) => t.monthKey === key && expenseSections.includes(t.section)
      )
      const row: Record<string, string | number> = { label: getMonthShort(key) }
      monthTxs.forEach((t) => {
        row[t.category] = ((row[t.category] as number) || 0) + t.amount
        usedCategories.add(t.category)
      })
      return row
    })

    return { data, categories: Array.from(usedCategories) }
  }, [transactions, fromMonthKey, expenseSections])

  const hasData = data.some((d) => Object.keys(d).length > 1)
  if (!hasData) {
    return <EmptyState title="Sem dados" description="Adicione despesas para visualizar por categoria" />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
            CATEGORY_META[name as Category]?.label ?? String(name),
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
        />
        <Legend
          formatter={(v) => CATEGORY_META[v as Category]?.label ?? v}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10 }}
        />
        {categories.map((cat) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="a"
            fill={CATEGORY_META[cat]?.color ?? '#6b7280'}
            maxBarSize={32}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
