import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend,
} from 'recharts'
import { useMonthData } from '../../hooks/useMonthData'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { formatCurrency } from '../../utils/currency'
import { parseMonthKey } from '../../constants/months'
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, CHART_GRID_COLOR } from '../../constants/chartStyles'

interface WeekData {
  label: string
  income: number
  expenses: number
}

export function IncomeExpenseTimeline({ monthKey }: { monthKey: string }) {
  const { transactions } = useMonthData(monthKey)
  const { expenseSections } = useSectionConfig()

  const { weeks, avgDailyExpense } = useMemo(() => {
    const { year, month } = parseMonthKey(monthKey)
    const totalDays = new Date(year, month, 0).getDate()

    const weekBuckets: WeekData[] = []
    const weekCount = Math.ceil(totalDays / 7)

    for (let w = 0; w < weekCount; w++) {
      const startDay = w * 7 + 1
      const endDay = Math.min((w + 1) * 7, totalDays)
      weekBuckets.push({
        label: `${startDay}-${endDay}`,
        income: 0,
        expenses: 0,
      })
    }

    transactions.forEach((t) => {
      const day = parseInt(t.date.split('-')[2], 10)
      if (isNaN(day) || day < 1 || day > totalDays) return
      const weekIdx = Math.min(Math.floor((day - 1) / 7), weekCount - 1)

      if (t.section === 'entradas') {
        weekBuckets[weekIdx].income += t.amount
      } else if (expenseSections.includes(t.section)) {
        weekBuckets[weekIdx].expenses += t.amount
      }
    })

    const totalExpenses = weekBuckets.reduce((s, w) => s + w.expenses, 0)
    const daysWithData = transactions
      .filter((t) => expenseSections.includes(t.section))
      .map((t) => parseInt(t.date.split('-')[2], 10))
    const uniqueDays = new Set(daysWithData).size
    const avg = uniqueDays > 0 ? totalExpenses / uniqueDays : 0

    return { weeks: weekBuckets, avgDailyExpense: avg }
  }, [transactions, monthKey, expenseSections])

  const hasData = weeks.some((w) => w.income > 0 || w.expenses > 0)
  if (!hasData) return null

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={15} className="text-indigo-500" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
          Entradas vs Saídas por semana
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={weeks} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`}
            tick={AXIS_TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              formatCurrency(Number(value || 0)),
              name === 'income' ? 'Entradas' : 'Saídas',
            ]}
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(label) => `Dias ${label}`}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {value === 'income' ? 'Entradas' : 'Saídas'}
              </span>
            )}
          />
          {avgDailyExpense > 0 && (
            <ReferenceLine
              y={avgDailyExpense * 7}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Média semanal: ${formatCurrency(avgDailyExpense * 7)}`,
                position: 'insideTopRight',
                fill: '#f59e0b',
                fontSize: 9,
              }}
            />
          )}
          <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
          <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
