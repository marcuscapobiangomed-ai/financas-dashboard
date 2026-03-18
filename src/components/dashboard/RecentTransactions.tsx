import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useMonthData } from '../../hooks/useMonthData'
import { CATEGORY_META } from '../../types/category'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { formatCurrency } from '../../utils/currency'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Modal } from '../ui/Modal'
import { TransactionForm } from '../forms/TransactionForm'
import { Transaction } from '../../types/transaction'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'

export function RecentTransactions({ monthKey }: { monthKey: string }) {
  const { transactions } = useMonthData(monthKey)
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction)
  const { sectionLabels } = useSectionConfig()
  const [editing, setEditing] = useState<Transaction | null>(null)

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  if (sorted.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Últimos Lançamentos</h3>
        <EmptyState title="Nenhum lançamento ainda" description="Use o botão + para adicionar" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-5 pt-4 pb-2">Últimos Lançamentos</h3>
      <div className="divide-y divide-gray-50 dark:divide-gray-700">
        {sorted.map((t) => {
          const meta = CATEGORY_META[t.category]
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: meta?.color ?? '#6b7280' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.description}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{t.date}</span>
                  <Badge variant="default" style={{ backgroundColor: meta?.bgColor, color: meta?.color }}>
                    {meta?.label ?? t.category}
                  </Badge>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{sectionLabels[t.section] ?? t.section}</span>
                </div>
              </div>
              <span className={`text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-200'}`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => setEditing(t)}
                  className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Excluir "${t.description}"?`)) deleteTransaction(t.id) }}
                  className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Lançamento">
        {editing && (
          <TransactionForm
            initial={editing}
            onSave={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
