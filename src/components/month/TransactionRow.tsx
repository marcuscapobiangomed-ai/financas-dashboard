import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
  const [editing, setEditing] = useState(false)

  const meta = CATEGORY_META[t.category]

  return (
    <>
      <tr className="hover:bg-indigo-50/40 dark:hover:bg-gray-700/40 group transition-colors">
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/50 dark:ring-gray-600/50"
              style={{ backgroundColor: meta?.color ?? '#6b7280' }}
            />
            <div className="flex flex-col">
              <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{t.description}</span>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {t.date.substring(0, 7) !== t.monthKey && (
                  <span className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800" title="A data da compra é de outro mês em relação à fatura">
                    compra: {t.date.split('-')[2]}/{t.date.split('-')[1]}
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
        </td>
        <td className="px-4 py-3.5 text-right">
          <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}
          </span>
        </td>
        <td className="px-4 py-3.5 w-24">
          {!disabled && (
            <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
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
        </td>
      </tr>

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
