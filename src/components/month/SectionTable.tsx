import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, TrendingUp, TrendingDown, CreditCard } from 'lucide-react'
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
  const allTransactions = useFinanceStore((s) => s.transactions)
  const bulkUpdateTransactions = useFinanceStore((s) => s.bulkUpdateTransactions)

  const { label, limit, total, transactions, isOverLimit, percentUsed, section } = summary
  const isIncome = section === 'entradas'
  const limitColor = isOverLimit ? 'text-red-500' : percentUsed >= appSettings.alertThresholdPercent ? 'text-amber-500' : 'text-gray-400'

  const cardSections = appSettings.cardSections ?? []
  const cardIds = cardSections.map((c) => c.id)
  const isCardSection = cardIds.includes(section)

  const isPaidBill = allTransactions.some(
    (t) => t.monthKey === monthKey && t.section === section && t.description === '__CARD_BILL_PAID__' && t.isPaid === true
  )

  const handleToggleInvoicePaid = () => {
    const dummy = allTransactions.find(
      (t) => t.monthKey === monthKey && t.section === section && t.description === '__CARD_BILL_PAID__'
    )

    if (isPaidBill) {
      if (dummy) {
        useFinanceStore.getState().updateTransaction(dummy.id, { isPaid: false })
      }
    } else {
      if (dummy) {
        useFinanceStore.getState().updateTransaction(dummy.id, { isPaid: true })
      } else {
        useFinanceStore.getState().addTransaction({
          description: '__CARD_BILL_PAID__',
          amount: 0,
          section: section as SectionType,
          category: 'Fatura' as any,
          date: `${monthKey}-01`,
          monthKey,
          type: 'expense',
          isPaid: true
        })
      }
    }
  }

  return (
    <div className="glass-panel-lg glass-panel-hover overflow-hidden group">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/30 dark:hover:bg-gray-700/30 transition-all cursor-pointer"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-indigo-100 dark:bg-indigo-900/40'}`}>
          {isIncome ? <TrendingUp size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-indigo-600" />}
        </div>
        <div className="flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-gray-800 dark:text-gray-200">{label}</span>
            {isCardSection && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleInvoicePaid()
                }}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition-all cursor-pointer border ${
                  isPaidBill
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
                    : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60'
                }`}
                title={isPaidBill ? 'Marcar fatura como pendente' : 'Marcar fatura como paga'}
              >
                {isPaidBill ? 'Fatura Paga' : 'Fatura Pendente'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">{transactions.length} lançamento{transactions.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-4">
          {limit > 0 && (
            <div className="w-28">
              <ProgressBar value={percentUsed} alertThreshold={appSettings.alertThresholdPercent} />
            </div>
          )}
          <div className="text-right">
            <span className={`text-lg font-bold ${isOverLimit ? 'text-red-500' : isIncome ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-200'}`}>
              {formatCurrency(total)}
            </span>
            {limit > 0 && (
              <p className={`text-xs ${limitColor}`}>de {formatCurrency(limit)}</p>
            )}
          </div>
          {open ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-gray-100/50 dark:border-gray-700/50">
          {transactions.length > 0 ? (
            <div className="divide-y divide-gray-50/50 dark:divide-gray-700/50">
              {transactions.map((t) => (
                <TransactionRow key={t.id} transaction={t} disabled={disabled} />
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 italic text-center">
              Nenhum lançamento nesta seção.
            </div>
          )}

          {!disabled && (
            <div className="px-5 py-3.5 border-t border-gray-100/50 dark:border-gray-700/50 bg-white/20 dark:bg-gray-800/20 flex flex-wrap gap-2 justify-between items-center">
              <button
                onClick={() => setAddOpen(true)}
                className="pill-button"
              >
                <Plus size={14} />
                Adicionar item
              </button>

              {isCardSection && (
                <button
                  type="button"
                  onClick={handleToggleInvoicePaid}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-all cursor-pointer flex items-center gap-1.5 ${
                    isPaidBill
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                >
                  <CreditCard size={13} />
                  {isPaidBill ? 'Marcar fatura como pendente' : `Pagar fatura (${formatCurrency(total)})`}
                </button>
              )}
            </div>
          )}
        </div>
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
