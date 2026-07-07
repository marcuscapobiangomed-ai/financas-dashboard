import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Category, CATEGORY_META } from '../types/category'
import { SpendingInsight, CategoryBreakdown, ProjectionData, AnalyticsSummary } from '../types/analytics'
import { computeIncome, computeTotalExpenses, computeSavingsRate, projectEndOfMonth, percentageOf } from '../utils/calculations'
import { getCurrentMonthKey, getLast12MonthKeys, prevMonthKey, parseMonthKey } from '../constants/months'
import { formatCurrency } from '../utils/currency'
import { useSectionConfig } from './useSectionConfig'

export function useAnalytics(monthKey?: string) {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const { expenseSections, cardSections } = useSectionConfig()
  const cardIds = cardSections.map((c) => c.id)
  const currentKey = monthKey ?? getCurrentMonthKey()

  return useMemo(() => {
    // Pre-group transactions by monthKey and by monthKey+category to avoid O(n^2) nested filtering
    const txsByMonth = new Map<string, typeof transactions>()
    const amountByMonthCategory = new Map<string, number>()

    transactions.forEach((t) => {
      let mList = txsByMonth.get(t.monthKey)
      if (!mList) {
        mList = []
        txsByMonth.set(t.monthKey, mList)
      }
      mList.push(t)

      const mcKey = `${t.monthKey}::${t.category}`
      amountByMonthCategory.set(mcKey, (amountByMonthCategory.get(mcKey) ?? 0) + t.amount)
    })

    // Pre-group extraordinary entries by monthKey
    const extraByMonth = new Map<string, typeof extraordinaryEntries>()
    extraordinaryEntries.forEach((e) => {
      let mList = extraByMonth.get(e.monthKey)
      if (!mList) {
        mList = []
        extraByMonth.set(e.monthKey, mList)
      }
      mList.push(e)
    })

    const monthTxs = txsByMonth.get(currentKey) ?? []
    const monthExtraordinary = extraByMonth.get(currentKey) ?? []
    const expenseTxs = monthTxs.filter((t) => expenseSections.includes(t.section))

    const totalExpenses = expenseTxs.reduce((s, t) => s + t.amount, 0)
    const categoryMap = new Map<Category, number>()
    expenseTxs.forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount)
    })

    // Precompute last 12 months for monthlyAvg
    const last12Keys = getLast12MonthKeys(currentKey)

    const categoryBreakdowns: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([category, total]) => {
        const meta = CATEGORY_META[category]
        const prevKey = prevMonthKey(currentKey)
        const prevTotal = amountByMonthCategory.get(`${prevKey}::${category}`) ?? 0
        const delta = total - prevTotal
        const trendPercent = prevTotal > 0 ? (delta / prevTotal) * 100 : 0
        const trend: 'up' | 'down' | 'stable' = Math.abs(trendPercent) < 5 ? 'stable' : delta > 0 ? 'up' : 'down'

        // Real 12-month average for this category
        const last12Total = last12Keys.reduce((sum, k) => {
          return sum + (amountByMonthCategory.get(`${k}::${category}`) ?? 0)
        }, 0)
        const monthlyAvg = last12Total / 12

        return {
          category,
          label: meta?.label ?? category,
          total,
          percentage: percentageOf(total, totalExpenses),
          monthlyAvg,
          trend,
          trendPercent,
          delta,
        }
      })
      .sort((a, b) => b.total - a.total)

    // Income includes extraordinary entries
    const ordinaryIncome = computeIncome(monthTxs)
    const extraordinaryIncome = monthExtraordinary.reduce((s, e) => s + e.netAmount, 0)
    const income = ordinaryIncome + extraordinaryIncome

    // ── Previous month data for summary deltas ──
    const prevKey = prevMonthKey(currentKey)
    const prevMonthTxs = txsByMonth.get(prevKey) ?? []
    const prevMonthExtra = extraByMonth.get(prevKey) ?? []
    const prevIncome = computeIncome(prevMonthTxs) + prevMonthExtra.reduce((s, e) => s + e.netAmount, 0)
    const prevExpenses = computeTotalExpenses(prevMonthTxs, expenseSections, cardIds)
    const prevBalance = prevIncome - prevExpenses
    const prevSavingsRate = computeSavingsRate(prevIncome, prevExpenses)

    const balance = income - totalExpenses
    const savingsRate = computeSavingsRate(income, totalExpenses)

    const summary: AnalyticsSummary = {
      income,
      expenses: totalExpenses,
      balance,
      savingsRate,
      incomeDelta: prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0,
      expensesDelta: prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0,
      balanceDelta: prevBalance !== 0 ? ((balance - prevBalance) / Math.abs(prevBalance)) * 100 : 0,
      savingsRateDelta: savingsRate - prevSavingsRate,
    }

    // ── Generate insights ──
    const insights: SpendingInsight[] = []
    const goalRate = appSettings.defaultSavingsGoalPercent

    // 1. Top category
    if (categoryBreakdowns.length > 0) {
      const top = categoryBreakdowns[0]
      insights.push({
        id: 'top-category',
        type: 'info',
        title: `Maior gasto: ${top.label}`,
        description: `${formatCurrency(top.total)} (${top.percentage.toFixed(1)}% das despesas)`,
        actionHint: top.percentage > 40 ? `Concentrar mais de 40% em ${top.label} pode ser arriscado. Avalie se há como diversificar.` : undefined,
        category: top.category,
      })
    }

    // 2. Savings rate vs goal
    if (income > 0) {
      if (savingsRate >= goalRate) {
        insights.push({
          id: 'savings-on-track',
          type: 'success',
          title: 'Meta de poupança atingida! 🎉',
          description: `Você está poupando ${savingsRate.toFixed(1)}% da renda (meta: ${goalRate}%).`,
          actionHint: 'Continue assim! Considere investir o excedente em renda fixa ou ações.',
        })
      } else {
        const falta = (goalRate / 100) * income - (income - totalExpenses)
        insights.push({
          id: 'savings-below-goal',
          type: 'warning',
          title: 'Abaixo da meta de poupança',
          description: `Poupança atual: ${savingsRate.toFixed(1)}%. Meta: ${goalRate}%. Faltam ${formatCurrency(falta)}.`,
          actionHint: 'Revise suas categorias de maior gasto para identificar onde cortar.',
        })
      }
    }

    // 3. Overspend projection
    const projectedExpenses = currentKey === getCurrentMonthKey() ? projectEndOfMonth(totalExpenses) : totalExpenses
    if (income > 0 && projectedExpenses > income) {
      insights.push({
        id: 'overspend-projection',
        type: 'warning',
        title: 'Projeção de estouro',
        description: `No ritmo atual, suas despesas devem chegar a ${formatCurrency(projectedExpenses)} este mês.`,
        actionHint: `Reduza ${formatCurrency(projectedExpenses - income)} até o fim do mês para ficar no positivo.`,
      })
    }

    // 4. Trending up category (spending increase)
    const trendingUp = categoryBreakdowns.filter((c) => c.trend === 'up' && c.trendPercent > 20)
    if (trendingUp.length > 0) {
      const c = trendingUp[0]
      insights.push({
        id: 'trend-up',
        type: 'warning',
        title: `${c.label} subiu ${c.trendPercent.toFixed(0)}%`,
        description: `Comparado ao mês anterior, gastos com ${c.label} aumentaram ${formatCurrency(c.delta)}.`,
        actionHint: `Verifique se houve algum gasto extraordinário em ${c.label} ou se é uma tendência.`,
        category: c.category,
      })
    }

    // 5. NEW: Trending down category (spending decrease)
    const trendingDown = categoryBreakdowns.filter((c) => c.trend === 'down' && c.trendPercent < -20)
    if (trendingDown.length > 0) {
      const c = trendingDown[0]
      insights.push({
        id: 'trend-down',
        type: 'success',
        title: `${c.label} caiu ${Math.abs(c.trendPercent).toFixed(0)}%`,
        description: `Você economizou ${formatCurrency(Math.abs(c.delta))} em ${c.label} vs mês anterior.`,
        category: c.category,
      })
    }

    // 6. NEW: Spending above 12-month average
    const aboveAvg = categoryBreakdowns.filter((c) => c.monthlyAvg > 0 && c.total > c.monthlyAvg * 1.3)
    if (aboveAvg.length > 0) {
      const c = aboveAvg[0]
      const excessPercent = ((c.total - c.monthlyAvg) / c.monthlyAvg * 100).toFixed(0)
      insights.push({
        id: 'above-avg',
        type: 'tip',
        title: `${c.label} acima da média histórica`,
        description: `Gasto de ${formatCurrency(c.total)} está ${excessPercent}% acima da média de 12 meses (${formatCurrency(c.monthlyAvg)}).`,
        actionHint: `Considere se esse aumento em ${c.label} é pontual ou requer atenção.`,
        category: c.category,
      })
    }

    // 7. NEW: Fixed vs variable expenses ratio
    const fixedExpenses = monthTxs
      .filter((t) => t.section === 'despesas_fixas')
      .reduce((s, t) => s + t.amount, 0)
    const variableExpenses = totalExpenses - fixedExpenses
    if (totalExpenses > 0 && fixedExpenses > 0) {
      const fixedPercent = (fixedExpenses / totalExpenses) * 100
      if (fixedPercent > 70) {
        insights.push({
          id: 'high-fixed',
          type: 'tip',
          title: `${fixedPercent.toFixed(0)}% dos gastos são fixos`,
          description: `Despesas fixas: ${formatCurrency(fixedExpenses)} · Variáveis: ${formatCurrency(variableExpenses)}`,
          actionHint: 'Gastos fixos altos reduzem sua flexibilidade. Avalie renegociar contratos ou cancelar assinaturas.',
        })
      }
    }

    // 8. NEW: Best performance month in window
    const monthsWithIncome = last12Keys.filter((k) => {
      const txs = txsByMonth.get(k) ?? []
      return computeIncome(txs) > 0
    })
    if (monthsWithIncome.length >= 3) {
      let bestRate = -Infinity
      let bestKey = ''
      monthsWithIncome.forEach((k) => {
        const txs = txsByMonth.get(k) ?? []
        const extra = extraByMonth.get(k) ?? []
        const inc = computeIncome(txs) + extra.reduce((s, e) => s + e.netAmount, 0)
        const exp = computeTotalExpenses(txs, expenseSections, cardIds)
        const rate = computeSavingsRate(inc, exp)
        if (rate > bestRate) {
          bestRate = rate
          bestKey = k
        }
      })
      if (bestKey === currentKey && bestRate > 0) {
        insights.push({
          id: 'best-month',
          type: 'success',
          title: 'Seu melhor mês! 🏆',
          description: `Este é o mês com a melhor taxa de poupança (${bestRate.toFixed(1)}%) dos últimos 12 meses.`,
        })
      }
    }

    // ── Projection (fixed calculation) ──
    const { month: currentMonth } = parseMonthKey(currentKey)
    const previous11Keys = getLast12MonthKeys(currentKey).slice(0, -1)
    const monthsWithData = previous11Keys.filter((k) => {
      const txs = txsByMonth.get(k)
      return txs && txs.length > 0
    })
    const n = monthsWithData.length
    let projection: ProjectionData | null = null
    if (n > 0) {
      const avgIncome = monthsWithData.reduce((s, k) => {
        const txs = txsByMonth.get(k) ?? []
        const extraList = extraByMonth.get(k) ?? []
        return s + computeIncome(txs) + extraList.reduce((sum, e) => sum + e.netAmount, 0)
      }, 0) / n
      const avgExpenses = monthsWithData.reduce((s, k) => {
        const txs = txsByMonth.get(k) ?? []
        return s + computeTotalExpenses(txs, expenseSections, cardIds)
      }, 0) / n

      // Fixed: use months elapsed in the year + months remaining
      const monthsRemaining = 12 - currentMonth
      const projectedYearIncome = avgIncome * 12
      const projectedYearTotal = avgExpenses * 12
      const avgSavingsRate = computeSavingsRate(avgIncome, avgExpenses)

      projection = {
        projectedYearTotal,
        projectedYearIncome,
        projectedYearSavings: projectedYearIncome - projectedYearTotal,
        monthsRemaining,
        avgMonthlyExpense: avgExpenses,
        avgMonthlyIncome: avgIncome,
        avgSavingsRate,
        onTrackForGoal: avgSavingsRate >= goalRate,
        projectedMonthExpense: currentKey === getCurrentMonthKey() ? projectedExpenses : undefined,
      }
    }

    return { categoryBreakdowns, insights, projection, summary }
  }, [transactions, extraordinaryEntries, currentKey, appSettings.defaultSavingsGoalPercent, expenseSections])
}
