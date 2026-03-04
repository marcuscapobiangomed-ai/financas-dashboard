import { Category } from './category'

export type TransactionType = 'income' | 'expense'

export type SectionType =
  | 'entradas'
  | 'despesas_fixas'
  | 'gastos_diarios'
  | 'cartao_x'
  | 'cartao_y'
  | 'extraordinario'

export interface Transaction {
  id: string
  type: TransactionType
  section: SectionType
  description: string
  amount: number
  category: Category
  date: string        // "2025-03-15"
  monthKey: string    // "2025-03"
  isRecurring?: boolean
  recurringId?: string
  note?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface RecurringTemplate {
  id: string
  description: string
  amount: number
  category: Category
  section: SectionType
  isActive: boolean
  startMonth: string  // "2025-01"
  endMonth?: string
}

export interface ExtraordinaryEntry {
  id: string
  type: 'ferias' | 'plr' | 'decimo_terceiro' | 'bonus' | 'outro'
  grossAmount: number
  tithePercent: number    // e.g. 10
  offeringPercent: number // e.g. 2
  tithe: number           // computed
  offering: number        // computed
  netAmount: number       // computed
  monthKey: string
  description?: string
}
