import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useSectionConfig } from '../hooks/useSectionConfig'
import { IncomeVsExpenseBar } from '../components/charts/IncomeVsExpenseBar'
import { Card } from '../components/ui/Card'
import { getMonthKey, getMonthLabel } from '../constants/months'
import { computeIncome, computeTotalExpenses, computeSavingsRate } from '../utils/calculations'
import { formatCurrency, formatPercent } from '../utils/currency'
import { Category, CATEGORY_META } from '../types/category'
import type { YearComparison as YearComparisonData } from '../types/analytics'

function getAvailableYears(transactions: { monthKey: string }[]): number[] {
  const years = new Set(transactions.map((t) => parseInt(t.monthKey.split('-')[0])))
  return Array.from(years).sort((a, b) => b - a)
}

export function YearComparison() {
  const transactions = useFinanceStore((s) => s.transactions)
  const { expenseSections } = useSectionConfig()
  const years = useMemo(() => getAvailableYears(transactions), [transactions])
  const currentYear = new Date().getFullYear()

  const [year1, setYear1] = useState(currentYear)
  const [year2, setYear2] = useState(currentYear - 1)

  const stats = useMemo(() => {
    function yearStats(year: number) {
      const txs = transactions.filter((t) => t.monthKey.startsWith(String(year)))
      const income = computeIncome(txs)
      const expenses = computeTotalExpenses(txs, expenseSections)
      return { income, expenses, balance: income - expenses, savingsRate: computeSavingsRate(income, expenses) }
    }
    return { a: yearStats(year1), b: yearStats(year2) }
  }, [transactions, year1, year2, expenseSections])

  const categoryComparison = useMemo(() => {
    const year1Txs = transactions.filter(
      (t) => t.monthKey.startsWith(String(year1)) && expenseSections.includes(t.section)
    )
    const year2Txs = transactions.filter(
      (t) => t.monthKey.startsWith(String(year2)) && expenseSections.includes(t.section)
    )

    const allCategories = new Set<Category>()
    year1Txs.forEach((t) => allCategories.add(t.category as Category))
    year2Txs.forEach((t) => allCategories.add(t.category as Category))

    return Array.from(allCategories)
      .map((cat): YearComparisonData => {
        const y1Total = year1Txs.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0)
        const y2Total = year2Txs.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0)
        const delta = y1Total - y2Total
        const deltaPercent = y2Total > 0 ? (delta / y2Total) * 100 : 0
        return {
          category: cat,
          label: CATEGORY_META[cat]?.label ?? cat,
          year1Total: y1Total,
          year2Total: y2Total,
          delta,
          deltaPercent,
        }
      })
      .sort((a, b) => b.year1Total - a.year1Total)
  }, [transactions, year1, year2, expenseSections])

  const yearOptions = [...new Set([...years, year1, year2])].sort((a, b) => b - a)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Comparativo Anual</h1>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={year1}
            onChange={(e) => setYear1(Number(e.target.value))}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 cursor-pointer"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-gray-400 text-sm">vs</span>
          <select
            value={year2}
            onChange={(e) => setYear2(Number(e.target.value))}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 cursor-pointer"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Receita', a: stats.a.income, b: stats.b.income, format: formatCurrency, higher: 'better' },
          { label: 'Despesas', a: stats.a.expenses, b: stats.b.expenses, format: formatCurrency, higher: 'worse' },
          { label: 'Balanço', a: stats.a.balance, b: stats.b.balance, format: formatCurrency, higher: 'better' },
          { label: 'Taxa Poupança', a: stats.a.savingsRate, b: stats.b.savingsRate, format: formatPercent, higher: 'better' },
        ].map(({ label, a, b, format, higher }) => {
          const delta = a - b
          const better = (higher === 'better' && delta > 0) || (higher === 'worse' && delta < 0)
          return (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-2">{label}</p>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">{year1}</span>
                  <span className="text-sm font-bold text-gray-900">{format(a)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-400">{year2}</span>
                  <span className="text-sm text-gray-500">{format(b)}</span>
                </div>
                {b !== 0 && (
                  <div className={`text-xs font-medium mt-1 ${better ? 'text-emerald-600' : 'text-red-600'}`}>
                    {delta > 0 ? '▲' : '▼'} {Math.abs(((delta) / Math.abs(b)) * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Card title={`Receita vs Despesas — ${year1}`} noPadding>
        <div className="p-4">
          <IncomeVsExpenseBar fromMonthKey={getMonthKey(year1, 12)} />
        </div>
      </Card>

      {year2 !== year1 && (
        <Card title={`Receita vs Despesas — ${year2}`} noPadding>
          <div className="p-4">
            <IncomeVsExpenseBar fromMonthKey={getMonthKey(year2, 12)} />
          </div>
        </Card>
      )}

      {/* Per-category comparison table */}
      {categoryComparison.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-700 px-5 pt-4 pb-2">
            Comparativo por Categoria
          </h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Categoria</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">{year1}</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">{year2}</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Δ %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categoryComparison.map((c) => (
                <tr key={c.category} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-800">{c.label}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(c.year1Total)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">
                    {formatCurrency(c.year2Total)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.year2Total > 0 ? (
                      <span className={`text-xs font-medium ${
                        c.delta > 0 ? 'text-red-600' : c.delta < 0 ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {c.delta > 0 ? '▲' : c.delta < 0 ? '▼' : ''}
                        {' '}{Math.abs(c.deltaPercent).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
