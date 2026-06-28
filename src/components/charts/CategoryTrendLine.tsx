import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Category, CATEGORY_META } from '../../types/category'
import { getLast12MonthKeys, getMonthShort } from '../../constants/months'
import { EmptyState } from '../ui/EmptyState'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { formatCurrency } from '../../utils/currency'
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, formatYAxisK } from '../../constants/chartStyles'

const TOP_N = 5

export function CategoryTrendLine({ fromMonthKey }: { fromMonthKey?: string }) {
  const transactions = useFinanceStore((s) => s.transactions)
  const { expenseSections } = useSectionConfig()

  const monthKeys = useMemo(() => getLast12MonthKeys(fromMonthKey), [fromMonthKey])

  // Pre-group transactions by monthKey+category for O(n) filtering
  const byMonthCat = useMemo(() => {
    const keysSet = new Set(monthKeys)
    const grouped = new Map<string, number>()
    transactions.forEach((t) => {
      if (!expenseSections.includes(t.section)) return
      if (!keysSet.has(t.monthKey)) return
      const key = `${t.monthKey}::${t.category}`
      grouped.set(key, (grouped.get(key) ?? 0) + t.amount)
    })
    return grouped
  }, [transactions, monthKeys, expenseSections])

  // Find top N categories by total expense across 12 months
  const topCategories = useMemo(() => {
    const totals = new Map<Category, number>()
    for (const [key, amount] of byMonthCat) {
      const [, cat] = key.split('::')
      totals.set(cat as Category, (totals.get(cat as Category) ?? 0) + amount)
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([cat]) => cat)
  }, [byMonthCat])

  const [visible, setVisible] = useState<Set<Category>>(new Set())
  useEffect(() => {
    if (topCategories.length > 0 && (visible.size === 0 || !Array.from(visible).some((c) => topCategories.includes(c)))) {
      setVisible(new Set(topCategories))
    }
  }, [topCategories])

  // Build chart data: one row per month
  const data = useMemo(() => monthKeys.map((key) => {
    const row: Record<string, number | string> = { label: getMonthShort(key) }
    topCategories.forEach((cat) => {
      row[cat] = byMonthCat.get(`${key}::${cat}`) ?? 0
    })
    return row
  }), [monthKeys, topCategories, byMonthCat])

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
            tickFormatter={formatYAxisK}
            tick={AXIS_TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(v, name) => [formatCurrency(Number(v)), CATEGORY_META[name as Category]?.label ?? name]}
            contentStyle={TOOLTIP_STYLE}
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
