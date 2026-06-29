import { Category } from './category'

export interface MonthTrend {
  monthKey: string
  label: string
  income: number
  expenses: number
  balance: number
  savingsRate: number
  fixedExpenses: number
  variableExpenses: number
}

export interface CategoryBreakdown {
  category: Category
  label: string
  total: number
  percentage: number
  monthlyAvg: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  delta: number
}

export interface SpendingInsight {
  id: string
  type: 'warning' | 'success' | 'info' | 'tip'
  title: string
  description: string
  actionHint?: string
  value?: number
  category?: Category
  month?: string
}

export interface ProjectionData {
  projectedYearTotal: number
  projectedYearSavings: number
  projectedYearIncome: number
  monthsRemaining: number
  avgMonthlyExpense: number
  avgMonthlyIncome: number
  avgSavingsRate: number
  onTrackForGoal: boolean
  projectedMonthExpense?: number
}

export interface AnalyticsSummary {
  income: number
  expenses: number
  balance: number
  savingsRate: number
  incomeDelta: number
  expensesDelta: number
  balanceDelta: number
  savingsRateDelta: number
}

export interface YearComparison {
  category: Category
  label: string
  color: string
  year1Total: number
  year2Total: number
  delta: number
  deltaPercent: number
}

export interface YearMonthlyData {
  month: number
  label: string
  year1Income: number
  year1Expenses: number
  year1Balance: number
  year2Income: number
  year2Expenses: number
  year2Balance: number
}

export interface YearStats {
  income: number
  expenses: number
  balance: number
  savingsRate: number
}

