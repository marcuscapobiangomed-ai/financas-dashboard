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
}

export interface SpendingInsight {
  id: string
  type: 'warning' | 'success' | 'info' | 'tip'
  title: string
  description: string
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
}

export interface YearComparison {
  category: Category
  label: string
  year1Total: number
  year2Total: number
  delta: number
  deltaPercent: number
}
