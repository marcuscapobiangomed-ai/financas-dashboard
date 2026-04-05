import { Transaction } from './transaction'

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
  highlights?: string[]
  lessons?: string
  sectionLimits: Record<string, number>
  tithePercent: number
  offeringPercent: number
  savingsGoal?: number
  copiedFromMonths?: string[]
  closedAt?: string
  closedBy?: string
  openedAt?: string
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
  cdiRateAnnual: number   // taxa CDI anual, ex: 14.15
  ipcaRateAnnual: number  // taxa IPCA anual, ex: 5.0
  ratesLastUpdated?: string  // ISO date of last BCB rate fetch
  notificationsEnabled?: boolean  // budget alert notifications
}
