import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Category, CATEGORY_META } from '../../types/category'
import { getLast12MonthKeys, getMonthShort } from '../../constants/months'
import { EmptyState } from '../ui/EmptyState'
import { useSectionConfig } from '../../hooks/useSectionConfig'

const TOP_N = 5

export function CategoryTrendLine({ fromMonthKey }: { fromMonthKey?: string }) {
  const transactions = useFinanceStore((s) => s.transactions)
  const { expenseSections } = useSectionConfig()

  const monthKeys = useMemo(() => getLast12MonthKeys(fromMonthKey), [fromMonthKey])

  // Find top N categories by total expense across 12 months
  const topCategories = useMemo(() => {
    const totals = new Map<Category, number>()
    transactions
      .filter((t) => monthKeys.includes(t.monthKey) && expenseSections.includes(t.section))
      .forEach((t) => {
        totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
      })
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([cat]) => cat)
  }, [transactions, monthKeys, expenseSections])

  const [visible, setVisible] = useState<Set<Category>>(new Set(topCategories))

  // Build chart data: one row per month
  const data = useMemo(() => monthKeys.map((key) => {
    const row: Record<string, number | string> = { label: getMonthShort(key) }
    topCategories.forEach((cat) => {
      row[cat] = transactions
        .filter((t) => t.monthKey === key && t.category === cat)
        .reduce((s, t) => s + t.amount, 0)
    })
    return row
  }), [transactions, monthKeys, topCategories])

  // Averages per category for reference line
  const averages = useMemo(() => {
    const avgs: Record<string, number> = {}
    topCategories.forEach((cat) => {
      const total = (data as Record<string, number>[]).reduce((s, row) => s + (row[cat] ?? 0), 0)
      avgs[cat] = data.length > 0 ? total / data.length : 0
    })
    return avgs
  }, [data, topCategories])

  if (topCategories.length === 0) {
    return <EmptyState title="Sem dados" description="Adicione despesas para ver a tendência por categoria" />
  }

  function toggleCategory(cat: Category) {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  return (
    <div>
      {/* Category toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {topCategories.map((cat) => {
          const meta = CATEGORY_META[cat]
          const isOn = visible.has(cat)
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                isOn ? 'border-transparent text-white' : 'bg-white text-gray-400 border-gray-200'
              }`}
              style={isOn ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isOn ? 'white' : meta.color }} />
              {meta.label}
            </button>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(v, name) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, CATEGORY_META[name as Category]?.label ?? name]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
          />
          {topCategories.filter((c) => visible.has(c)).map((cat) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={CATEGORY_META[cat].color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
          {topCategories.filter((c) => visible.has(c)).map((cat) => (
            <ReferenceLine
              key={`avg-${cat}`}
              y={averages[cat]}
              stroke={CATEGORY_META[cat].color}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center mt-1">Linhas tracejadas = média dos 12 meses</p>
    </div>
  )
}
