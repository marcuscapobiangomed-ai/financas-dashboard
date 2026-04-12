import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { Transaction } from '../../types/transaction'
import { CATEGORY_META } from '../../types/category'
import { useFinanceStore } from '../../store/useFinanceStore'
import { formatCurrency } from '../../utils/currency'

interface TransactionRowProps {
  transaction: Transaction
  disabled?: boolean
}

export function TransactionRow({ transaction: t, disabled }: TransactionRowProps) {
  const updateTransaction = useFinanceStore((s) => s.updateTransaction)
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction)
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(t.description)
  const [amount, setAmount] = useState(String(t.amount))
  const [hasError, setHasError] = useState(false)

  const meta = CATEGORY_META[t.category]

  function save() {
    const num = parseFloat(amount.replace(',', '.'))
    if (!desc.trim() || isNaN(num) || num <= 0) {
      setHasError(true)
      return
    }
    setHasError(false)
    const isIncome = t.section === 'entradas'
    updateTransaction(t.id, { description: desc.trim(), amount: num, type: isIncome ? 'income' : 'expense' })
    setEditing(false)
  }

  function cancel() {
    setDesc(t.description)
    setAmount(String(t.amount))
    setEditing(false)
  }

  if (editing) {
    const errorClass = hasError ? 'border-red-400 focus:ring-red-100' : 'border-indigo-300 focus:ring-indigo-200'
    return (
      <tr className={hasError ? 'bg-red-50/80 dark:bg-red-900/30' : 'bg-indigo-50/80 dark:bg-indigo-900/30'}>
        <td className="px-4 py-3">
          <input
            autoFocus
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 ${errorClass}`}
            value={desc}
            onChange={(e) => { setDesc(e.target.value); setHasError(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          />
        </td>
        <td className="px-4 py-3 w-36">
          <input
            className={`w-full border rounded-lg px-3 py-2 text-sm text-right outline-none focus:ring-2 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 ${errorClass}`}
            value={amount}
            type="number"
            step="0.01"
            onChange={(e) => { setAmount(e.target.value); setHasError(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          />
        </td>
        <td className="px-4 py-3 w-24">
          <div className="flex gap-1.5 justify-end">
            <button onClick={save} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer transition-colors">
              <Check size={16} />
            </button>
            <button onClick={cancel} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
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
  )
}
