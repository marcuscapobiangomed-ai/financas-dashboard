import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { SectionSummary } from '../../types/budget'
import { SectionType } from '../../types/transaction'
import { TransactionRow } from './TransactionRow'
import { TransactionForm } from '../forms/TransactionForm'
import { ProgressBar } from '../ui/ProgressBar'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../utils/currency'
import { useFinanceStore } from '../../store/useFinanceStore'

interface SectionTableProps {
  summary: SectionSummary
  monthKey: string
  disabled?: boolean
  defaultOpen?: boolean
}

export function SectionTable({ summary, monthKey, disabled, defaultOpen = true }: SectionTableProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [addOpen, setAddOpen] = useState(false)
  const appSettings = useFinanceStore((s) => s.appSettings)

  const { label, limit, total, transactions, isOverLimit, percentUsed, section } = summary
  const limitColor = isOverLimit ? 'text-red-600' : percentUsed >= appSettings.alertThresholdPercent ? 'text-yellow-600' : 'text-gray-500'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        {open ? <ChevronDown size={15} className="text-gray-400 shrink-0" /> : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
        <span className="text-sm font-semibold text-gray-800 flex-1 text-left">{label}</span>

        <div className="flex items-center gap-3">
          {limit > 0 && (
            <div className="w-24">
              <ProgressBar value={percentUsed} alertThreshold={appSettings.alertThresholdPercent} />
            </div>
          )}
          <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-800'}`}>
            {formatCurrency(total)}
          </span>
          {limit > 0 && (
            <span className={`text-xs ${limitColor}`}>
              / {formatCurrency(limit)}
            </span>
          )}
        </div>
      </button>

      {/* Body */}
      {open && (
        <>
          {transactions.length > 0 ? (
            <table className="w-full">
              <tbody className="divide-y divide-gray-50">
                {transactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} disabled={disabled} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400 italic">
              Nenhum lançamento nesta seção.
            </div>
          )}

          {!disabled && (
            <div className="px-4 py-2.5 border-t border-gray-50">
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                <Plus size={13} />
                Adicionar item
              </button>
            </div>
          )}
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Adicionar em ${label}`}>
        <TransactionForm
          defaultSection={section as SectionType}
          defaultMonthKey={monthKey}
          onSave={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
          showSaveAndNew
        />
      </Modal>
    </div>
  )
}
