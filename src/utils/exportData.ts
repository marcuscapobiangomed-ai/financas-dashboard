import { Transaction } from '../types/transaction'
import { formatCurrency } from './currency'
import { CATEGORY_META } from '../types/category'

export function downloadJSON(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function transactionsToCSV(transactions: Transaction[], sectionLabels: Record<string, string>): string {
  const header = ['Data', 'Mês', 'Seção', 'Categoria', 'Descrição', 'Valor', 'Tipo', 'Nota']
  const rows = transactions.map((t) => [
    t.date,
    t.monthKey,
    sectionLabels[t.section] ?? t.section,
    CATEGORY_META[t.category]?.label ?? t.category,
    t.description,
    formatCurrency(t.amount),
    t.type === 'income' ? 'Entrada' : 'Saída',
    t.note ?? '',
  ])
  return [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}
