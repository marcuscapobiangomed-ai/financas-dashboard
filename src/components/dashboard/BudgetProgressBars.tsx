import { useMonthData } from '../../hooks/useMonthData'
import { ProgressBar } from '../ui/ProgressBar'
import { formatCurrency } from '../../utils/currency'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useSectionConfig } from '../../hooks/useSectionConfig'

export function BudgetProgressBars({ monthKey }: { monthKey: string }) {
  const { sections } = useMonthData(monthKey)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const { expenseSections: expenseSectionIds } = useSectionConfig()

  const expenseSections = sections.filter((s) => expenseSectionIds.includes(s.section) && s.limit > 0)

  if (expenseSections.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Orçamento por Seção</h3>
      <div className="flex flex-col gap-4">
        {expenseSections.map((s) => (
          <div key={s.section}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-700">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${s.isOverLimit ? 'text-red-600' : 'text-gray-800'}`}>
                  {formatCurrency(s.total)}
                </span>
                <span className="text-xs text-gray-400">/ {formatCurrency(s.limit)}</span>
              </div>
            </div>
            <ProgressBar
              value={s.percentUsed}
              height="md"
              showLabel
              alertThreshold={appSettings.alertThresholdPercent}
            />
            {s.isOverLimit && (
              <p className="text-xs text-red-600 mt-1">
                Acima do limite em {formatCurrency(s.total - s.limit)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
