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
    updateTransaction(t.id, { description: desc.trim(), amount: num })
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
      <tr className={hasError ? 'bg-red-50' : 'bg-indigo-50'}>
        <td className="px-3 py-2">
          <input
            autoFocus
            className={`w-full border rounded px-2 py-1 text-sm outline-none focus:ring-2 ${errorClass}`}
            value={desc}
            onChange={(e) => { setDesc(e.target.value); setHasError(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          />
        </td>
        <td className="px-3 py-2 w-32">
          <input
            className={`w-full border rounded px-2 py-1 text-sm text-right outline-none focus:ring-2 ${errorClass}`}
            value={amount}
            type="number"
            step="0.01"
            onChange={(e) => { setAmount(e.target.value); setHasError(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          />
        </td>
        <td className="px-3 py-2 w-20">
          <div className="flex gap-1 justify-end">
            <button onClick={save} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 cursor-pointer">
              <Check size={14} />
            </button>
            <button onClick={cancel} className="p-1 rounded text-gray-400 hover:bg-gray-100 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: meta?.color ?? '#6b7280' }}
          />
          <span className="text-sm text-gray-800">{t.description}</span>
          {t.note && (
            <span className="text-xs text-gray-400 truncate max-w-[120px]">{t.note}</span>
          )}
          {t.isRecurring && (
            <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">recorrente</span>
          )}
          {t.installmentTotal && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              {t.installmentCurrent}/{t.installmentTotal}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}`}>
          {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}
        </span>
      </td>
      <td className="px-3 py-2.5 w-20">
        {!disabled && (
          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => { if (window.confirm(`Excluir "${t.description}"?`)) deleteTransaction(t.id) }}
              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
