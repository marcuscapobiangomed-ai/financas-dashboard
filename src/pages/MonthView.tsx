import { useState } from 'react'
import { Lock, Unlock, Copy, Tags } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useMonthData } from '../hooks/useMonthData'
import { SectionTable } from '../components/month/SectionTable'
import { ExtraordinarySection } from '../components/month/ExtraordinarySection'
import { BulkEditModal } from '../components/month/BulkEditModal'
import { Button } from '../components/ui/Button'
import { formatCurrency } from '../utils/currency'
import { getMonthLabel } from '../constants/months'
export function MonthView() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const toggleMonthClosed = useFinanceStore((s) => s.toggleMonthClosed)
  const duplicatePreviousMonth = useFinanceStore((s) => s.duplicatePreviousMonth)
  const { sections, income, totalExpenses, isClosed, extraordinaryIncome } = useMonthData(currentMonthKey)
  const [bulkOpen, setBulkOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{getMonthLabel(currentMonthKey)}</h1>
          {isClosed && <span className="text-xs text-red-600 font-medium">Mês fechado</span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy size={13} />}
            onClick={() => {
              if (window.confirm('Copiar lançamentos recorrentes do mês anterior?')) {
                duplicatePreviousMonth(currentMonthKey)
              }
            }}
            disabled={isClosed}
          >
            Copiar anterior
          </Button>
          <Button
            variant={isClosed ? 'secondary' : 'danger'}
            size="sm"
            icon={isClosed ? <Unlock size={13} /> : <Lock size={13} />}
            onClick={() => toggleMonthClosed(currentMonthKey)}
          >
            {isClosed ? 'Reabrir' : 'Fechar mês'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Tags size={13} />}
            onClick={() => setBulkOpen(true)}
          >
            Editar categorias
          </Button>
        </div>
      </div>

      <BulkEditModal open={bulkOpen} onClose={() => setBulkOpen(false)} monthKey={currentMonthKey} />

      {/* Section tables */}
      <div className="flex flex-col gap-3">
        {sections.map((section) => (
          <SectionTable
            key={section.section}
            summary={section}
            monthKey={currentMonthKey}
            disabled={isClosed}
            defaultOpen={section.section === 'entradas' || section.transactions.length > 0}
          />
        ))}
        <ExtraordinarySection monthKey={currentMonthKey} disabled={isClosed} />
      </div>

      {/* Summary footer */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky bottom-4">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-500">Receita</p>
              <p className="text-base font-bold text-emerald-600">{formatCurrency(income + extraordinaryIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Despesas</p>
              <p className="text-base font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Balanço do Mês</p>
            <p className={`text-2xl font-bold ${(income + extraordinaryIncome - totalExpenses) >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
              {formatCurrency(income + extraordinaryIncome - totalExpenses)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
