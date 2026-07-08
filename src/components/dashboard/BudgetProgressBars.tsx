import { useMonthData } from '../../hooks/useMonthData'
import { ProgressBar } from '../ui/ProgressBar'
import { formatCurrency } from '../../utils/currency'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { Target } from 'lucide-react'

export function BudgetProgressBars({ monthKey }: { monthKey: string }) {
  const { sections } = useMonthData(monthKey)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const { expenseSections: expenseSectionIds } = useSectionConfig()

  const expenseSections = sections.filter((s) => expenseSectionIds.includes(s.section) && s.limit > 0)

  if (expenseSections.length === 0) return null

  return (
    <div className="glass-obsidian rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-xl p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <Target size={18} className="text-indigo-500" />
        <h3 className="text-base font-extrabold text-outfit tracking-tight text-gray-900 dark:text-gray-100">
          Orçamento por Seção
        </h3>
      </div>
      <div className="flex flex-col gap-4">
        {expenseSections.map((s) => (
          <div key={s.section}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-extrabold text-outfit ${s.isOverLimit ? 'text-rose-500' : 'text-gray-800 dark:text-gray-200'}`}>
                  {formatCurrency(s.total)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">/ {formatCurrency(s.limit)}</span>
              </div>
            </div>
            <ProgressBar
              value={s.percentUsed}
              height="md"
              showLabel
              alertThreshold={appSettings.alertThresholdPercent}
            />
            {s.isOverLimit && (
              <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold mt-1">
                ↑ Acima em {formatCurrency(s.total - s.limit)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
