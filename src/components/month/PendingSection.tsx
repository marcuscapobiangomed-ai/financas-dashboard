import { Circle } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { TransactionRow } from './TransactionRow'
import { formatCurrency } from '../../utils/currency'

interface PendingSectionProps {
  monthKey: string
  disabled?: boolean
  type?: 'income' | 'expense'
}

export function PendingSection({ monthKey, disabled, type }: PendingSectionProps) {
  const transactions = useFinanceStore((s) => s.transactions)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const cardSections = appSettings.cardSections ?? []
  const cardIds = cardSections.map((c: any) => c.id)

  const pending = transactions.filter((t) => {
    const isPending = t.monthKey === monthKey && t.isPaid === false
    if (!isPending) return false
    if (cardIds.includes(t.section) || t.description === '__CARD_BILL_PAID__') return false
    if (type === 'income') return t.section === 'entradas'
    if (type === 'expense') return t.section !== 'entradas'
    return true
  })

  if (pending.length === 0) return null

  const pendingIncome = pending
    .filter((t) => t.section === 'entradas')
    .reduce((s, t) => s + t.amount, 0)
  const pendingExpenses = pending
    .filter((t) => t.section !== 'entradas')
    .reduce((s, t) => s + t.amount, 0)

  const label = type === 'income'
    ? `${pending.length} receita${pending.length !== 1 ? 's' : ''} pendente${pending.length !== 1 ? 's' : ''}`
    : type === 'expense'
      ? `${pending.length} despesa${pending.length !== 1 ? 's' : ''} pendente${pending.length !== 1 ? 's' : ''}`
      : `${pending.length} lançamento${pending.length !== 1 ? 's' : ''} pendente${pending.length !== 1 ? 's' : ''}`

  return (
    <div className="glass-panel-lg glass-panel-hover overflow-hidden border-2 border-amber-200 dark:border-amber-800">
      <div className="px-5 py-4 flex items-center gap-3 bg-amber-50/50 dark:bg-amber-900/20">
        <Circle size={16} className="text-amber-500" />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {label}
        </span>
        <div className="ml-auto flex gap-4 text-xs">
          {pendingIncome > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(pendingIncome)} a receber
            </span>
          )}
          {pendingExpenses > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{formatCurrency(pendingExpenses)} a pagar
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-50/50 dark:divide-gray-700/50">
        {pending.map((t) => (
          <TransactionRow key={t.id} transaction={t} disabled={disabled} />
        ))}
      </div>
    </div>
  )
}
