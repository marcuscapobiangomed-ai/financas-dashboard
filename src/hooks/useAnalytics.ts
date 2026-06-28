import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Category, CATEGORY_META } from '../types/category'
import { SpendingInsight, CategoryBreakdown, ProjectionData } from '../types/analytics'
import { computeIncome, computeTotalExpenses, computeSavingsRate, projectEndOfMonth, percentageOf } from '../utils/calculations'
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
          description: `Poupança atual: ${savingsRate.toFixed(1)}%. Meta: ${goalRate}%. Faltam ${formatCurrency((goalRate / 100) * income - (income - totalExpenses))}.`,
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
        description: `Comparado ao mês anterior, gastos com ${c.label} aumentaram ${formatCurrency(c.delta)}.`,
        category: c.category,
      })
    }

    // Projection: include extraordinary in historical income averages
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
        return s + computeTotalExpenses(txs, expenseSections)
      }, 0) / n
      const [, m] = currentKey.split('-').map(Number)
      const monthsRemaining = 12 - m
      const projectedYearIncome = avgIncome * (n + monthsRemaining)
      const projectedYearTotal = avgExpenses * (n + monthsRemaining)
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
      }
    }

    return { categoryBreakdowns, insights, projection }
  }, [transactions, extraordinaryEntries, currentKey, appSettings.defaultSavingsGoalPercent, expenseSections])
}
