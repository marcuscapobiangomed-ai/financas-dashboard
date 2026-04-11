import { useState } from 'react'
import { Lock, Unlock, Download, FileText, AlertTriangle, Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../utils/currency'
import { transactionsToCSV, downloadCSV } from '../../utils/exportData'
import { getMonthLabel } from '../../constants/months'

interface Props {
  open: boolean
  onClose: () => void
  monthKey: string
  isClosed: boolean
}

export function CloseMonthModal({ open, onClose, monthKey, isClosed }: Props) {
  const transactions = useFinanceStore((s) => s.transactions)
  const extraordinaryEntries = useFinanceStore((s) => s.extraordinaryEntries)
  const toggleMonthClosed = useFinanceStore((s) => s.toggleMonthClosed)
  const updateMonthSettings = useFinanceStore((s) => s.updateMonthSettings)
  const monthSettings = useFinanceStore((s) => s.monthSettings)
  const { sectionLabels } = useSectionConfig()

  const [exportAfterClose, setExportAfterClose] = useState(false)
  const [done, setDone] = useState(false)

  const monthTransactions = transactions.filter((t) => t.monthKey === monthKey)
  const monthExtraordinary = extraordinaryEntries.filter((e) => e.monthKey === monthKey)

  const totalIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) +
    monthExtraordinary.reduce((sum, e) => sum + e.netAmount, 0)

  const totalExpense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpense
  const closedAt = monthSettings[monthKey]?.closedAt

  function handleToggle() {
    const now = new Date().toISOString()
    
    if (!isClosed) {
      updateMonthSettings(monthKey, { closedAt: now })
    } else {
      updateMonthSettings(monthKey, { 
        closedAt: undefined,
        openedAt: now 
      })
    }
    
    toggleMonthClosed(monthKey)
    
    if (exportAfterClose) {
      handleExport()
    }
    
    setDone(true)
    setTimeout(() => {
      setDone(false)
      onClose()
    }, 1500)
  }

  function handleExport() {
    const csv = transactionsToCSV(monthTransactions, sectionLabels)
    const label = getMonthLabel(monthKey).replace(' ', '-')
    downloadCSV(csv, `financas-${label}.csv`)
  }

  return (
    <Modal open={open} onClose={onClose} title={isClosed ? 'Reabrir mês' : 'Fechar mês'} size="md">
      <div className="flex flex-col gap-5">
        {!isClosed ? (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Ao fechar o mês, todas as transações ficarão bloqueadas para edição.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Você poderá reabrir o mês a qualquer momento se precisar fazer ajustes.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Receitas</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalIncome)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Despesas</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(totalExpense)}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Balanço</span>
                  <span className={`font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 pt-2">
                {monthTransactions.length} transações · {monthExtraordinary.length} entradas extraordinárias
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input
                type="checkbox"
                checked={exportAfterClose}
                onChange={(e) => setExportAfterClose(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <Download size={16} className="text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Exportar CSV após fechar
              </span>
            </label>
          </>
        ) : (
          <>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Check size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Este mês está fechado
                  </p>
                  {closedAt && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      Fechado em {new Date(closedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ao reabrir, você poderá editar as transações novamente.
            </p>
          </>
        )}

        <div className="flex gap-3 pt-2">
          {isClosed && (
            <Button
              variant="secondary"
              onClick={handleExport}
              icon={<FileText size={16} />}
              className="flex-1"
            >
              Exportar CSV
            </Button>
          )}
          <Button
            variant={isClosed ? 'secondary' : 'danger'}
            onClick={handleToggle}
            icon={isClosed ? <Unlock size={16} /> : <Lock size={16} />}
            className="flex-1"
          >
            {done ? (isClosed ? 'Reaberto!' : 'Fechado!') : (isClosed ? 'Reabrir mês' : 'Fechar mês')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}