import { BarChart2 } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAnalytics } from '../hooks/useAnalytics'
import { IncomeVsExpenseBar } from '../components/charts/IncomeVsExpenseBar'
import { SavingsRateLine } from '../components/charts/SavingsRateLine'
import { CategoryStackedBar } from '../components/charts/CategoryStackedBar'
import { CategoryPieChart } from '../components/charts/CategoryPieChart'
import { CategoryTrendLine } from '../components/charts/CategoryTrendLine'
import { InsightCard } from '../components/analytics/InsightCard'
import { ProjectionCard } from '../components/analytics/ProjectionCard'
import { Card } from '../components/ui/Card'

export function Analytics() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const { insights, projection, categoryBreakdowns } = useAnalytics(currentMonthKey)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BarChart2 size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Receita vs Despesas (12 meses)" noPadding>
          <div className="p-4">
            <IncomeVsExpenseBar fromMonthKey={currentMonthKey} />
          </div>
        </Card>

        <Card title="Taxa de Poupança (12 meses)" noPadding>
          <div className="p-4">
            <SavingsRateLine fromMonthKey={currentMonthKey} />
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Despesas por Categoria (mês atual)" noPadding>
          <div className="p-2">
            <CategoryPieChart monthKey={currentMonthKey} />
          </div>
        </Card>

        <Card title="Despesas por Categoria (12 meses)" noPadding>
          <div className="p-4">
            <CategoryStackedBar fromMonthKey={currentMonthKey} />
          </div>
        </Card>
      </div>

      {/* Category Trend over time */}
      <Card title="Tendência por Categoria (12 meses)" noPadding>
        <div className="p-4">
          <CategoryTrendLine fromMonthKey={currentMonthKey} />
        </div>
      </Card>

      {/* Projection */}
      {projection && <ProjectionCard projection={projection} />}

      {/* Top categories table */}
      {categoryBreakdowns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-700 px-5 pt-4 pb-2">Ranking de Categorias (mês atual)</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Categoria</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Total</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">%</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Tendência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categoryBreakdowns.map((c) => (
                <tr key={c.category} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-800">{c.label}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">
                    R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">{c.percentage.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-medium ${c.trend === 'up' ? 'text-red-600' : c.trend === 'down' ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {c.trend === 'up' ? `▲ ${c.trendPercent.toFixed(0)}%` : c.trend === 'down' ? `▼ ${Math.abs(c.trendPercent).toFixed(0)}%` : '—'}
                    </span>
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
