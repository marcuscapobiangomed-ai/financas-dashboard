import { BarChart2, TrendingUp, PieChart, Sparkles, Lightbulb } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAnalytics } from '../hooks/useAnalytics'
import { IncomeVsExpenseBar } from '../components/charts/IncomeVsExpenseBar'
import { SavingsRateLine } from '../components/charts/SavingsRateLine'
import { CategoryStackedBar } from '../components/charts/CategoryStackedBar'
import { CategoryPieChart } from '../components/charts/CategoryPieChart'
import { CategoryTrendLine } from '../components/charts/CategoryTrendLine'
import { InsightCard } from '../components/analytics/InsightCard'
import { ProjectionCard } from '../components/analytics/ProjectionCard'
import { SectionHeader } from '../components/analytics/SectionHeader'
import { SummaryMetricCard } from '../components/analytics/SummaryMetricCard'
import { Card } from '../components/ui/Card'
import { formatCurrency } from '../utils/currency'
import { getMonthLabel } from '../constants/months'

export function Analytics() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const { insights, projection, categoryBreakdowns, summary } = useAnalytics(currentMonthKey)

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart2 size={22} className="text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[30px]">
          Análise completa das suas finanças — {getMonthLabel(currentMonthKey)}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 1: Financial Summary */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          icon={<Sparkles size={16} />}
          title="Visão Geral Financeira"
          subtitle="Resumo do mês atual comparado ao mês anterior"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <SummaryMetricCard
            label="Receita"
            value={summary.income}
            deltaPercent={summary.incomeDelta}
          />
          <SummaryMetricCard
            label="Despesas"
            value={summary.expenses}
            deltaPercent={summary.expensesDelta}
            invertDelta
          />
          <SummaryMetricCard
            label="Saldo"
            value={summary.balance}
            deltaPercent={summary.balanceDelta}
          />
          <SummaryMetricCard
            label="Poupança"
            value={summary.savingsRate}
            deltaPercent={summary.savingsRateDelta}
            format="percent"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 2: Smart Insights */}
      {/* ═══════════════════════════════════════════════════ */}
      {insights.length > 0 && (
        <div>
          <SectionHeader
            icon={<Lightbulb size={16} />}
            title="Insights Inteligentes"
            subtitle="Análises automáticas baseadas nos seus gastos e receitas"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {insights.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 3: Evolution Over Time */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          icon={<TrendingUp size={16} />}
          title="Evolução ao Longo do Tempo"
          subtitle="Acompanhe como sua receita, despesas e taxa de poupança evoluem mês a mês"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-3">
          <Card
            title="Receita vs Despesas (12 meses)"
            noPadding
          >
            <div className="px-4 pt-1 pb-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Compare sua receita total com despesas. A linha roxa mostra o balanço (receita − despesas).
              </p>
              <IncomeVsExpenseBar fromMonthKey={currentMonthKey} />
            </div>
          </Card>

          <Card
            title="Taxa de Poupança (12 meses)"
            noPadding
          >
            <div className="px-4 pt-1 pb-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Percentual da renda que você conseguiu poupar. A linha tracejada indica sua meta configurada.
              </p>
              <SavingsRateLine fromMonthKey={currentMonthKey} />
            </div>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 4: Category Analysis */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          icon={<PieChart size={16} />}
          title="Análise por Categoria"
          subtitle="Entenda como seus gastos se distribuem entre as categorias e identifique tendências"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-3">
          <Card title="Distribuição do Mês Atual" noPadding>
            <div className="px-4 pt-1 pb-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                Proporção de cada categoria nas despesas do mês. O centro mostra o total gasto.
              </p>
              <CategoryPieChart data={categoryBreakdowns} />
            </div>
          </Card>

          <Card title="Categorias ao Longo de 12 Meses" noPadding>
            <div className="px-4 pt-1 pb-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                Evolução empilhada — veja como a composição de gastos muda ao longo do tempo.
              </p>
              <CategoryStackedBar fromMonthKey={currentMonthKey} />
            </div>
          </Card>
        </div>

        {/* Category Trend */}
        <Card title="Tendência por Categoria (Top 5)" noPadding className="mt-5">
          <div className="px-4 pt-1 pb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Acompanhe as 5 categorias com maior gasto. Clique nos botões para mostrar/ocultar categorias.
            </p>
            <CategoryTrendLine fromMonthKey={currentMonthKey} />
          </div>
        </Card>

        {/* Ranking Table */}
        {categoryBreakdowns.length > 0 && (
          <div className="glass-panel overflow-hidden mt-5 animate-fade-in-up">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ranking de Categorias (mês atual)</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Todas as categorias ordenadas por valor gasto, com tendência vs mês anterior e média histórica.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Categoria</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider text-left" style={{ minWidth: 140 }}>Proporção</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Média 12m</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Tendência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {categoryBreakdowns.map((c) => {
                    const maxTotal = categoryBreakdowns[0]?.total ?? 1
                    const barWidth = Math.max((c.total / maxTotal) * 100, 2)
                    return (
                      <tr key={c.category} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{c.label}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right tabular-nums">
                          {formatCurrency(c.total)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${barWidth}%`, backgroundColor: 'var(--tw-gradient-from, #6366f1)' }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-12 text-right">{c.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 text-right tabular-nums">{formatCurrency(c.monthlyAvg)}</td>
                        <td className="px-5 py-3 text-right">
                          {c.trend === 'stable' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
                              — estável
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              c.trend === 'up'
                                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                                : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                            }`}>
                              {c.trend === 'up' ? '▲' : '▼'} {Math.abs(c.trendPercent).toFixed(0)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 5: Projections */}
      {/* ═══════════════════════════════════════════════════ */}
      {projection && (
        <div>
          <SectionHeader
            icon={<TrendingUp size={16} />}
            title="Projeções"
            subtitle="Estimativas para o restante do ano baseadas no seu histórico"
          />
          <div className="mt-3">
            <ProjectionCard projection={projection} />
          </div>
        </div>
      )}
    </div>
  )
}
