import { Transaction, ExtraordinaryEntry } from './transaction'

export interface SectionSummary {
  section: string
  label: string
  limit: number
  total: number
  transactions: Transaction[]
  isOverLimit: boolean
  percentUsed: number
}

export interface MonthSettings {
  monthKey: string
  isClosed: boolean
  notes?: string
  sectionLimits: Record<string, number>
  tithePercent: number
  offeringPercent: number
  savingsGoal?: number
}

export interface CardSection {
  id: string
  label: string
}

export interface AppSettings {
  defaultSectionLimits: Record<string, number>
  defaultTithePercent: number
  defaultOfferingPercent: number
  defaultSavingsGoalPercent: number
  darkMode: boolean
  alertThresholdPercent: number
  cardSections: CardSection[]
  initialBalance: number  // saldo antes de começar a usar o app
}
