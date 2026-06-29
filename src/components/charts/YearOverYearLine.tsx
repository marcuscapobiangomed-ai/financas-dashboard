import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { YearMonthlyData } from '../../types/analytics'
import { formatCurrency } from '../../utils/currency'
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, formatYAxisK } from '../../constants/chartStyles'

interface YearOverYearLineProps {
  data: YearMonthlyData[]
  year1: number
  year2: number
}

type Metric = 'income' | 'expenses' | 'balance'

export function YearOverYearLine({ data, year1, year2 }: YearOverYearLineProps) {
  const [metric, setMetric] = useState<Metric>('balance')

  const metricMeta = {
    income: {
      label: 'Receitas',
      y1Key: 'year1Income',
      y2Key: 'year2Income',
      color1: '#10b981', // emerald
      color2: '#a7f3d0', // light emerald
    },
    expenses: {
      label: 'Despesas',
      y1Key: 'year1Expenses',
      y2Key: 'year2Expenses',
      color1: '#ef4444', // red
      color2: '#fca5a5', // light red
    },
    balance: {
      label: 'Saldo (Balanço)',
      y1Key: 'year1Balance',
      y2Key: 'year2Balance',
      color1: '#6366f1', // indigo
      color2: '#c7d2fe', // light indigo
    },
  }

  const current = metricMeta[metric]

  return (
    <div className="flex flex-col gap-4">
      {/* Metric selectors */}
      <div className="flex gap-2 self-end">
        {(Object.keys(metricMeta) as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              metric === m
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            {metricMeta[m].label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f3f4f6)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={formatYAxisK}
            tick={AXIS_TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), '']}
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            name={`${current.label} — ${year1}`}
            dataKey={current.y1Key}
            stroke={current.color1}
            strokeWidth={2.5}
            dot={{ r: 3, fill: current.color1 }}
            activeDot={{ r: 5 }}
          />
          {year1 !== year2 && (
            <Line
              type="monotone"
              name={`${current.label} — ${year2}`}
              dataKey={current.y2Key}
              stroke={current.color2}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, strokeDasharray: '0', fill: current.color2 }}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
