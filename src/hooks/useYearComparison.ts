import { useMemo } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useSectionConfig } from './useSectionConfig'
import { Category, CATEGORY_META } from '../types/category'
import { computeIncome, computeTotalExpenses, computeSavingsRate } from '../utils/calculations'
import { formatCurrency, formatPercent } from '../utils/currency'
import { getMonthKey, MONTH_SHORT } from '../constants/months'
import type { YearComparison, YearMonthlyData, YearStats, SpendingInsight } from '../types/analytics'

export function useYearComparison(year1: number, year2: number) {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const { expenseSections } = useSectionConfig()

  return useMemo(() => {
    // ── Pre-group all transactions by year + monthKey in a single O(n) pass ──
    const txsByYearMonth = new Map<string, typeof transactions>()
    const catAmountByYear = new Map<string, number>()

    transactions.forEach((t) => {
      const year = parseInt(t.monthKey.split('-')[0])
      if (year !== year1 && year !== year2) return

      // Group by year::monthKey
      const ymKey = t.monthKey
      let list = txsByYearMonth.get(ymKey)
      if (!list) {
        list = []
        txsByYearMonth.set(ymKey, list)
      }
      list.push(t)

      // Group expenses by year::category
      if (expenseSections.includes(t.section)) {
        const ycKey = `${year}::${t.category}`
        catAmountByYear.set(ycKey, (catAmountByYear.get(ycKey) ?? 0) + t.amount)
      }
    })

    // Pre-group extraordinary entries by monthKey
    const extraByMonth = new Map<string, number>()
    extraordinaryEntries.forEach((e) => {
      const year = parseInt(e.monthKey.split('-')[0])
      if (year !== year1 && year !== year2) return
      extraByMonth.set(e.monthKey, (extraByMonth.get(e.monthKey) ?? 0) + e.netAmount)
    })

    // ── Year-level stats (include extraordinary income) ──
    function computeYearStats(year: number): YearStats {
      let income = 0
      let expenses = 0
      for (let m = 1; m <= 12; m++) {
        const key = getMonthKey(year, m)
        const txs = txsByYearMonth.get(key) ?? []
        income += computeIncome(txs) + (extraByMonth.get(key) ?? 0)
        expenses += computeTotalExpenses(txs, expenseSections)
      }
      return {
        income,
        expenses,
        balance: income - expenses,
        savingsRate: computeSavingsRate(income, expenses),
      }
    }

    const statsA = computeYearStats(year1)
    const statsB = computeYearStats(year2)

    // ── Monthly comparison data (for overlapping line chart) ──
    const monthlyTrends: YearMonthlyData[] = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const key1 = getMonthKey(year1, m)
      const key2 = getMonthKey(year2, m)
      const txs1 = txsByYearMonth.get(key1) ?? []
      const txs2 = txsByYearMonth.get(key2) ?? []
      const inc1 = computeIncome(txs1) + (extraByMonth.get(key1) ?? 0)
      const inc2 = computeIncome(txs2) + (extraByMonth.get(key2) ?? 0)
      const exp1 = computeTotalExpenses(txs1, expenseSections)
      const exp2 = computeTotalExpenses(txs2, expenseSections)

      return {
        month: m,
        label: MONTH_SHORT[i],
        year1Income: inc1,
        year1Expenses: exp1,
        year1Balance: inc1 - exp1,
        year2Income: inc2,
        year2Expenses: exp2,
        year2Balance: inc2 - exp2,
      }
    })

    // ── Category comparison (O(1) per category using pre-grouped Map) ──
    const allCategories = new Set<Category>()
    for (const [key] of catAmountByYear) {
      const [, cat] = key.split('::')
      allCategories.add(cat as Category)
    }

    const categoryComparison: YearComparison[] = Array.from(allCategories)
      .map((cat) => {
        const y1Total = catAmountByYear.get(`${year1}::${cat}`) ?? 0
        const y2Total = catAmountByYear.get(`${year2}::${cat}`) ?? 0
        const delta = y1Total - y2Total
        const deltaPercent = y2Total > 0 ? (delta / y2Total) * 100 : 0
        const meta = CATEGORY_META[cat]
        return {
          category: cat,
          label: meta?.label ?? cat,
          color: meta?.color ?? '#6b7280',
          year1Total: y1Total,
          year2Total: y2Total,
          delta,
          deltaPercent,
        }
      })
      .sort((a, b) => b.year1Total - a.year1Total)

    // ── Available years ──
    const yearsSet = new Set<number>()
    transactions.forEach((t) => yearsSet.add(parseInt(t.monthKey.split('-')[0])))
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a)

    // ── Insights comparativos ──
    const insights: SpendingInsight[] = []

    // 1. Income change
    if (statsB.income > 0) {
      const incomeDelta = ((statsA.income - statsB.income) / statsB.income) * 100
      if (Math.abs(incomeDelta) > 5) {
        insights.push({
          id: 'year-income-change',
          type: incomeDelta > 0 ? 'success' : 'warning',
          title: incomeDelta > 0
            ? `Receita cresceu ${incomeDelta.toFixed(1)}%`
            : `Receita caiu ${Math.abs(incomeDelta).toFixed(1)}%`,
          description: `${year1}: ${formatCurrency(statsA.income)} · ${year2}: ${formatCurrency(statsB.income)}`,
          actionHint: incomeDelta > 0
            ? 'Ótima evolução! Aproveite para aumentar a taxa de poupança.'
            : 'Avalie fontes alternativas de renda ou oportunidades de crescimento.',
        })
      }
    }

    // 2. Expense change
    if (statsB.expenses > 0) {
      const expDelta = ((statsA.expenses - statsB.expenses) / statsB.expenses) * 100
      if (Math.abs(expDelta) > 5) {
        insights.push({
          id: 'year-expense-change',
          type: expDelta < 0 ? 'success' : 'warning',
          title: expDelta > 0
            ? `Despesas aumentaram ${expDelta.toFixed(1)}%`
            : `Despesas reduziram ${Math.abs(expDelta).toFixed(1)}%`,
          description: `${year1}: ${formatCurrency(statsA.expenses)} · ${year2}: ${formatCurrency(statsB.expenses)}`,
          actionHint: expDelta > 0
            ? 'Identifique as categorias que mais cresceram na tabela abaixo.'
            : 'Parabéns pela economia! Continue mantendo o controle.',
        })
      }
    }

    // 3. Savings rate change
    if (statsB.savingsRate > 0 || statsA.savingsRate > 0) {
      const rateDiff = statsA.savingsRate - statsB.savingsRate
      if (Math.abs(rateDiff) > 3) {
        insights.push({
          id: 'year-savings-rate',
          type: rateDiff > 0 ? 'success' : 'warning',
          title: rateDiff > 0
            ? `Taxa de poupança melhorou ${rateDiff.toFixed(1)}pp`
            : `Taxa de poupança caiu ${Math.abs(rateDiff).toFixed(1)}pp`,
          description: `${year1}: ${formatPercent(statsA.savingsRate)} · ${year2}: ${formatPercent(statsB.savingsRate)}`,
        })
      }
    }

    // 4. Category with biggest increase
    const biggestIncrease = categoryComparison.find((c) => c.year2Total > 0 && c.deltaPercent > 20)
    if (biggestIncrease) {
      insights.push({
        id: 'year-cat-increase',
        type: 'warning',
        title: `${biggestIncrease.label}: +${biggestIncrease.deltaPercent.toFixed(0)}% vs ${year2}`,
        description: `Cresceu de ${formatCurrency(biggestIncrease.year2Total)} para ${formatCurrency(biggestIncrease.year1Total)} (+${formatCurrency(biggestIncrease.delta)}).`,
        actionHint: `Avalie se o aumento em ${biggestIncrease.label} é justificado ou se pode ser reduzido.`,
        category: biggestIncrease.category,
      })
    }

    // 5. Category with biggest decrease
    const biggestDecrease = categoryComparison.find((c) => c.year2Total > 0 && c.deltaPercent < -20)
    if (biggestDecrease) {
      insights.push({
        id: 'year-cat-decrease',
        type: 'success',
        title: `${biggestDecrease.label}: ${biggestDecrease.deltaPercent.toFixed(0)}% vs ${year2}`,
        description: `Reduziu de ${formatCurrency(biggestDecrease.year2Total)} para ${formatCurrency(biggestDecrease.year1Total)} (−${formatCurrency(Math.abs(biggestDecrease.delta))}).`,
        category: biggestDecrease.category,
      })
    }

    return {
      statsA,
      statsB,
      monthlyTrends,
      categoryComparison,
      insights,
      availableYears,
    }
  }, [transactions, extraordinaryEntries, year1, year2, expenseSections])
}
