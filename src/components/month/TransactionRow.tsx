import { useState } from 'react'
import { Pencil, Trash2, Circle, CheckCircle2 } from 'lucide-react'
import { Transaction } from '../../types/transaction'
import { CATEGORY_META } from '../../types/category'
import { useFinanceStore } from '../../store/useFinanceStore'
import { formatCurrency } from '../../utils/currency'
import { Modal } from '../ui/Modal'
import { TransactionForm } from '../forms/TransactionForm'

interface TransactionRowProps {
  transaction: Transaction
  disabled?: boolean
}

export function TransactionRow({ transaction: t, disabled }: TransactionRowProps) {
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction)
  const togglePaid = useFinanceStore((s) => s.togglePaid)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const [editing, setEditing] = useState(false)

  const cardSections = appSettings.cardSections ?? []
  const cardIds = cardSections.map((c: any) => c.id)
  const isCardSection = cardIds.includes(t.section)

  const meta = CATEGORY_META[t.category]
  const isPaid = t.isPaid ?? false
  const isIncome = t.type === 'income'

  const rowBgClass = isCardSection
    ? 'hover:bg-indigo-50/40 dark:hover:bg-gray-700/40'
    : isPaid
      ? isIncome
        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50'
        : 'bg-emerald-50/5 dark:bg-emerald-950/5 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10'
      : 'hover:bg-indigo-50/40 dark:hover:bg-gray-700/40'

  return (
    <>
      <div className={`transition-colors group border-b border-gray-100/50 dark:border-gray-800/40 ${rowBgClass}`}>
        <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {!disabled && !isCardSection && (
              <button
                onClick={() => togglePaid(t.id)}
                className={`shrink-0 cursor-pointer transition-colors ${isPaid ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400'}`}
                title={isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
              >
                {isPaid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </button>
            )}
            <div
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/50 dark:ring-gray-600/50"
              style={{ backgroundColor: meta?.color ?? '#6b7280' }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {t.description}
                {isIncome && isPaid && <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">(recebida)</span>}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {!isPaid && !isCardSection && (
                  <span className="text-xs bg-amber-100/70 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">pendente</span>
                )}
                {t.date.substring(0, 7) !== t.monthKey && (
                  <span className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800" title="A data da compra é de outro mês em relação à fatura">
                    compra: {t.date.split('-')[2]}/{t.date.split('-')[1]}
                  </span>
                )}
                {t.paidByOther && (
                  <span className="text-xs bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                    Pago por: {t.paidByName || 'outro'}
                  </span>
                )}
                {t.note && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[280px]">{t.note}</span>
                )}
                {t.isRecurring && (
                  <span className="text-xs bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">recorrente</span>
                )}
                {t.installmentTotal && (
                  <span className="text-xs bg-amber-100/70 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                    {t.installmentCurrent}/{t.installmentTotal}x
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 sm:shrink-0">
            <span className={`text-sm font-semibold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {isIncome ? '+' : ''}{formatCurrency(t.amount)}
            </span>
            {!disabled && (
              <div className="flex gap-1.5 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 cursor-pointer transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Excluir "${t.description}"?`)) deleteTransaction(t.id) }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar Lançamento">
        {editing && (
          <TransactionForm
            initial={t}
            onSave={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        )}
      </Modal>
    </>
  )
}
