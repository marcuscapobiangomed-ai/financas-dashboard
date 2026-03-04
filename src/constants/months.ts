export const MONTH_NAMES: string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MONTH_SHORT: string[] = [
  'Jan', 'Fev', 'Mar', 'Abr',
  'Mai', 'Jun', 'Jul', 'Ago',
  'Set', 'Out', 'Nov', 'Dez',
]

export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-')
  return { year: parseInt(y), month: parseInt(m) }
}

export function getMonthLabel(key: string): string {
  const { year, month } = parseMonthKey(key)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function getMonthShort(key: string): string {
  const { month } = parseMonthKey(key)
  return MONTH_SHORT[month - 1]
}

export function getCurrentMonthKey(): string {
  const now = new Date()
  return getMonthKey(now.getFullYear(), now.getMonth() + 1)
}

export function prevMonthKey(key: string): string {
  const { year, month } = parseMonthKey(key)
  if (month === 1) return getMonthKey(year - 1, 12)
  return getMonthKey(year, month - 1)
}

export function nextMonthKey(key: string): string {
  const { year, month } = parseMonthKey(key)
  if (month === 12) return getMonthKey(year + 1, 1)
  return getMonthKey(year, month + 1)
}

export function getLast12MonthKeys(fromKey?: string): string[] {
  const base = fromKey || getCurrentMonthKey()
  const keys: string[] = []
  let current = base
  for (let i = 0; i < 12; i++) {
    keys.unshift(current)
    current = prevMonthKey(current)
  }
  return keys
}
