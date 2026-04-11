import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Category, CATEGORY_META } from '../types/category'
import { SpendingInsight, CategoryBreakdown, ProjectionData } from '../types/analytics'
import { computeIncome, computeTotalExpenses, computeSavingsRate, projectEndOfMonth } from '../utils/calculations'
import { getCurrentMonthKey, getLast12MonthKeys, prevMonthKey } from '../constants/months'
import { formatCurrency } from '../utils/currency'
import { useSectionConfig } from './useSectionConfig'

export function useAnalytics(monthKey?: string) {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const { expenseSections } = useSectionConfig()
  const currentKey = monthKey ?? getCurrentMonthKey()

  return useMemo(() => {
    const monthTxs = transactions.filter((t) => t.monthKey === currentKey)
    const monthExtraordinary = extraordinaryEntries.filter((e) => e.monthKey === currentKey)
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
        const prevTotal = transactions
          .filter((t) => t.monthKey === prevKey && t.category === category)
          .reduce((s, t) => s + t.amount, 0)
        const delta = total - prevTotal
        const trendPercent = prevTotal > 0 ? (delta / prevTotal) * 100 : 0
        const trend: 'up' | 'down' | 'stable' = Math.abs(trendPercent) < 5 ? 'stable' : delta > 0 ? 'up' : 'down'

        // Real 12-month average for this category
        const last12Total = last12Keys.reduce((sum, k) => {
          return sum + transactions
            .filter((t) => t.monthKey === k && t.category === category)
            .reduce((s, t) => s + t.amount, 0)
        }, 0)
        const monthlyAvg = last12Total / 12

        return {
          category,
          label: meta?.label ?? category,
          total,
          percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
          monthlyAvg,
          trend,
          trendPercent,
        }
      })
      .sort((a, b) => b.total - a.total)

    // Income includes extraordinary entries
    const ordinaryIncome = computeIncome(monthTxs)
    const extraordinaryIncome = monthExtraordinary.reduce((s, e) => s + e.netAmount, 0)
    const income = ordinaryIncome + extraordinaryIncome

    // Generate insights
    const insights: SpendingInsight[] = []

    if (categoryBreakdowns.length > 0) {
      const top = categoryBreakdowns[0]
      insights.push({
        id: 'top-category',
        type: 'info',
        title: `Maior gasto: ${top.label}`,
        description: `${formatCurrency(top.total)} (${top.percentage.toFixed(1)}% das despesas)`,
        category: top.category,
      })
    }

    const savingsRate = computeSavingsRate(income, totalExpenses)
    const goalRate = appSettings.defaultSavingsGoalPercent
    if (income > 0) {
      if (savingsRate >= goalRate) {
        insights.push({
          id: 'savings-on-track',
          type: 'success',
          title: 'Meta de poupança atingida!',
          description: `Você está poupando ${savingsRate.toFixed(1)}% da renda (meta: ${goalRate}%).`,
        })
      } else {
        insights.push({
          id: 'savings-below-goal',
          type: 'warning',
          title: 'Abaixo da meta de poupança',
          description: `Poupança atual: ${savingsRate.toFixed(1)}%. Meta: ${goalRate}%. Faltam ${formatCurrency(((goalRate - savingsRate) / 100) * income)}.`,
        })
      }
    }

    const projectedExpenses = currentKey === getCurrentMonthKey() ? projectEndOfMonth(totalExpenses) : totalExpenses
    if (income > 0 && projectedExpenses > income) {
      insights.push({
        id: 'overspend-projection',
        type: 'warning',
        title: 'Projeção de estouro',
        description: `No ritmo atual, suas despesas devem chegar a ${formatCurrency(projectedExpenses)} este mês.`,
      })
    }

    const trendingUp = categoryBreakdowns.filter((c) => c.trend === 'up' && c.trendPercent > 20)
    if (trendingUp.length > 0) {
      const c = trendingUp[0]
      insights.push({
        id: 'trend-up',
        type: 'warning',
        title: `${c.label} subiu ${c.trendPercent.toFixed(0)}%`,
        description: `Comparado ao mês anterior, gastos com ${c.label} aumentaram ${formatCurrency(c.trendPercent !== -100 ? c.total * c.trendPercent / (100 + c.trendPercent) : c.total)}.`,
        category: c.category,
      })
    }

    // Projection: include extraordinary in historical income averages
    const last12Completed = getLast12MonthKeys(currentKey).slice(0, -1)
    const completedMonths = last12Completed.filter((k) => {
      const txs = transactions.filter((t) => t.monthKey === k)
      return txs.length > 0
    })
    const n = completedMonths.length
    let projection: ProjectionData | null = null
    if (n > 0) {
      const avgIncome = completedMonths.reduce((s, k) => {
        const txs = transactions.filter((t) => t.monthKey === k)
        const extraOrdinary = extraordinaryEntries.filter((e) => e.monthKey === k)
        return s + computeIncome(txs) + extraOrdinary.reduce((sum, e) => sum + e.netAmount, 0)
      }, 0) / n
      const avgExpenses = completedMonths.reduce((s, k) =>
        s + computeTotalExpenses(transactions.filter((t) => t.monthKey === k), expenseSections), 0) / n
      const [, m] = currentKey.split('-').map(Number)
      const monthsRemaining = 12 - m
      const projectedYearIncome = avgIncome * (n + monthsRemaining)
      const projectedYearTotal = avgExpenses * (n + monthsRemaining)
      projection = {
        projectedYearTotal,
        projectedYearIncome,
        projectedYearSavings: projectedYearIncome - projectedYearTotal,
        monthsRemaining,
        avgMonthlyExpense: avgExpenses,
        avgMonthlyIncome: avgIncome,
        avgSavingsRate: computeSavingsRate(avgIncome, avgExpenses),
        onTrackForGoal: computeSavingsRate(avgIncome, avgExpenses) >= goalRate,
      }
    }

    return { categoryBreakdowns, insights, projection, totalExpenses, income }
  }, [transactions, extraordinaryEntries, currentKey, appSettings.defaultSavingsGoalPercent, expenseSections])
}
