import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMemo } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Category, CATEGORY_META } from '../../types/category'
import { getLast12MonthKeys, getMonthShort } from '../../constants/months'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { formatCurrency } from '../../utils/currency'
import { EmptyState } from '../ui/EmptyState'
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, formatYAxisK } from '../../constants/chartStyles'

export function CategoryStackedBar({ fromMonthKey }: { fromMonthKey?: string }) {
  const transactions = useFinanceStore((s) => s.transactions)
  const { expenseSections } = useSectionConfig()

  const { data, categories } = useMemo(() => {
    const keys = getLast12MonthKeys(fromMonthKey)
    const keysSet = new Set(keys)
    const usedCategories = new Set<Category>()

    // Pre-group transactions by monthKey
    const txsByMonth = new Map<string, typeof transactions>()
    transactions.forEach((t) => {
      if (!expenseSections.includes(t.section)) return
      if (!keysSet.has(t.monthKey)) return
      let list = txsByMonth.get(t.monthKey)
      if (!list) {
        list = []
        txsByMonth.set(t.monthKey, list)
      }
      list.push(t)
      usedCategories.add(t.category)
    })

    const data = keys.map((key) => {
      const monthTxs = txsByMonth.get(key) ?? []
      const row: Record<string, string | number> = { label: getMonthShort(key) }
      monthTxs.forEach((t) => {
        row[t.category] = ((row[t.category] as number) || 0) + t.amount
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
          tickFormatter={formatYAxisK}
          tick={AXIS_TICK_STYLE}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            CATEGORY_META[name as Category]?.label ?? String(name),
          ]}
          contentStyle={TOOLTIP_STYLE}
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
