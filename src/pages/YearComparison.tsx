import { useState, useMemo } from 'react'
import { ArrowLeftRight, TrendingUp, PieChart, Sparkles, Lightbulb } from 'lucide-react'
import { useYearComparison } from '../hooks/useYearComparison'
import { YearOverYearLine } from '../components/charts/YearOverYearLine'
import { CategoryComparisonBar } from '../components/charts/CategoryComparisonBar'
import { SectionHeader } from '../components/analytics/SectionHeader'
import { InsightCard } from '../components/analytics/InsightCard'
import { Card } from '../components/ui/Card'
import { formatCurrency, formatPercent } from '../utils/currency'

export function YearComparison() {
  const currentYear = new Date().getFullYear()
  const [year1, setYear1] = useState(currentYear)
  const [year2, setYear2] = useState(currentYear - 1)

  const {
    statsA,
    statsB,
    monthlyTrends,
    categoryComparison,
    insights,
    availableYears,
  } = useYearComparison(year1, year2)

  // Ensure year selectors have all years including current defaults
  const yearOptions = useMemo(() => {
    const list = [...new Set([...availableYears, year1, year2])]
    return list.sort((a, b) => b - a)
  }, [availableYears, year1, year2])

  // Summary Metrics comparing year1 vs year2
  const comparisonSummary = [
    {
      label: 'Receitas',
      val1: statsA.income,
      val2: statsB.income,
      format: formatCurrency,
      invert: false,
    },
    {
      label: 'Despesas',
      val1: statsA.expenses,
      val2: statsB.expenses,
      format: formatCurrency,
      invert: true,
    },
    {
      label: 'Balanço',
      val1: statsA.balance,
      val2: statsB.balance,
      format: formatCurrency,
      invert: false,
    },
    {
      label: 'Poupança %',
      val1: statsA.savingsRate,
      val2: statsB.savingsRate,
      format: formatPercent,
      invert: false,
    },
  ]

  // Totals for table footer
  const total1 = categoryComparison.reduce((s, c) => s + c.year1Total, 0)
  const total2 = categoryComparison.reduce((s, c) => s + c.year2Total, 0)
  const totalDelta = total1 - total2
  const totalDeltaPercent = total2 > 0 ? (totalDelta / total2) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={22} className="text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Comparativo Anual</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[30px]">
            Compare seus resultados financeiros entre dois anos selecionados
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={year1}
            onChange={(e) => setYear1(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl text-sm px-3.5 py-2 cursor-pointer shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">vs</span>
          <select
            value={year2}
            onChange={(e) => setYear2(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl text-sm px-3.5 py-2 cursor-pointer shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 1: Visão Geral */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          icon={<Sparkles size={16} />}
          title="Visão Geral do Comparativo"
          subtitle={`Resumo acumulado de ${year1} comparado com o ano de ${year2}`}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {comparisonSummary.map(({ label, val1, val2, format, invert }) => {
            const diff = val1 - val2
            const percentDiff = val2 > 0 ? (diff / val2) * 100 : 0
            const isPositive = invert ? diff < 0 : diff > 0
            const isNeutral = Math.abs(percentDiff) < 0.1 || val2 === 0
            const badgeColor = isNeutral
              ? 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50'
              : isPositive
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20'

            return (
              <div key={label} className="glass-panel p-4 flex flex-col gap-2.5 animate-fade-in-up">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{year1}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{format(val1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{year2}</span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{format(val2)}</span>
                  </div>
                </div>
                {val2 !== 0 && (
                  <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${badgeColor}`}>
                    {diff > 0 ? '▲' : '▼'} {Math.abs(percentDiff).toFixed(1)}%
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 2: Insights Comparativos */}
      {/* ═══════════════════════════════════════════════════ */}
      {insights.length > 0 && year1 !== year2 && (
        <div>
          <SectionHeader
            icon={<Lightbulb size={16} />}
            title="Insights Comparativos"
            subtitle="Análises automáticas comparando o desempenho financeiro dos dois anos"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {insights.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 3: Evolução Mensal Comparativa */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          icon={<TrendingUp size={16} />}
          title="Evolução Mensal Comparativa"
          subtitle="Curva de evolução mês a mês (Janeiro a Dezembro) sobreposta para identificar sazonalidade"
        />
        <Card title="Evolução Sobreposta" noPadding className="mt-3">
          <div className="px-4 pt-1 pb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Escolha a métrica abaixo para sobrepor as curvas mensais de cada ano. Linha sólida representa {year1} e tracejada representa {year2}.
            </p>
            <YearOverYearLine data={monthlyTrends} year1={year1} year2={year2} />
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 4: Análise de Despesas por Categoria */}
      {/* ═══════════════════════════════════════════════════ */}
      {categoryComparison.length > 0 && (
        <div>
          <SectionHeader
            icon={<PieChart size={16} />}
            title="Despesas por Categoria"
            subtitle="Comparação de gastos entre categorias nos dois períodos"
          />
          
          <Card title="Comparativo Visual de Categorias (Top 8)" noPadding className="mt-3">
            <div className="px-4 pt-1 pb-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Gráfico com as 8 categorias de maior gasto em {year1} lado a lado com {year2}.
              </p>
              <CategoryComparisonBar data={categoryComparison} year1={year1} year2={year2} />
            </div>
          </Card>

          <div className="glass-panel overflow-hidden mt-5 animate-fade-in-up">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tabela de Comparação de Categorias</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Valores absolutos de despesas por categoria, diferença em valor real (Δ R$) e percentual (Δ %).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Categoria</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{year1}</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{year2}</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Δ R$</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Δ %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {categoryComparison.map((c) => {
                    const maxVal = Math.max(total1, total2) || 1
                    const barPercent1 = (c.year1Total / maxVal) * 100
                    const barPercent2 = (c.year2Total / maxVal) * 100
                    return (
                      <tr key={c.category} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.label}</span>
                            <div className="flex flex-col gap-1 w-24">
                              <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${barPercent1}%` }} />
                              </div>
                              {year1 !== year2 && (
                                <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-300 dark:bg-slate-500 rounded-full" style={{ width: `${barPercent2}%` }} />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right tabular-nums">
                          {formatCurrency(c.year1Total)}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 text-right tabular-nums">
                          {formatCurrency(c.year2Total)}
                        </td>
                        <td className={`px-5 py-3 text-sm font-semibold text-right tabular-nums ${c.delta > 0 ? 'text-red-500 dark:text-red-400' : c.delta < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {c.delta > 0 ? '+' : ''}{formatCurrency(c.delta)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {c.year2Total > 0 ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              c.delta > 0
                                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                                : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                            }`}>
                              {c.delta > 0 ? '▲' : '▼'} {Math.abs(c.deltaPercent).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Linha de Totais no Rodapé */}
                <tfoot>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 font-bold border-t border-gray-200 dark:border-gray-700">
                    <td className="px-5 py-4 text-sm text-gray-950 dark:text-gray-50">Total Despesas</td>
                    <td className="px-5 py-4 text-sm text-gray-950 dark:text-gray-50 text-right tabular-nums">{formatCurrency(total1)}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 text-right tabular-nums">{formatCurrency(total2)}</td>
                    <td className={`px-5 py-4 text-sm text-right tabular-nums ${totalDelta > 0 ? 'text-red-600' : totalDelta < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {totalDelta > 0 ? '+' : ''}{formatCurrency(totalDelta)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {total2 > 0 ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          totalDelta > 0
                            ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                            : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                        }`}>
                          {totalDelta > 0 ? '▲' : '▼'} {Math.abs(totalDeltaPercent).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
