import { AppSettings } from '../types/budget'

export const DEFAULT_SECTION_LIMITS: Record<string, number> = {
  entradas: 0,
  despesas_fixas: 1000,
  gastos_diarios: 1500,
  cartao_x: 500,
  cartao_y: 500,
  extraordinario: 0,
}

export const DEFAULT_CARD_SECTIONS = [
  { id: 'cartao_x', label: 'Cartão X', closingDay: 10, dueDay: 20 },
  { id: 'cartao_y', label: 'Cartão Y', closingDay: 10, dueDay: 20 },
]

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultSectionLimits: DEFAULT_SECTION_LIMITS,
  defaultTithePercent: 10,
  defaultOfferingPercent: 2,
  defaultSavingsGoalPercent: 20,
  darkMode: false,
  alertThresholdPercent: 80,
  cardSections: DEFAULT_CARD_SECTIONS,
  initialBalance: 0,
  cdiRateAnnual: 14.15,
  ipcaRateAnnual: 5.0,
}
