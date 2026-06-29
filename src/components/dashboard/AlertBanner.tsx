import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useBudgetAlerts } from '../../hooks/useBudgetAlerts'
import { useMonthData } from '../../hooks/useMonthData'
import { formatCurrency } from '../../utils/currency'

export function AlertBanner({ monthKey }: { monthKey: string }) {
  const { overLimit, nearLimit, hasAlerts, hasWarnings } = useBudgetAlerts(monthKey)
  const { accumulatedBalance } = useMonthData(monthKey)
  const isNegative = accumulatedBalance < 0

  // Track which specific alert combination was dismissed — reappears if alerts change
  const alertKey = `${overLimit.map((a) => `${a.section}:${Math.floor(a.total)}`).join(',')}|neg:${isNegative}`
  const [dismissedKey, setDismissedKey] = useState('')

  if (dismissedKey === alertKey || (!hasAlerts && !hasWarnings && !isNegative)) return null

  const isRed = hasAlerts || isNegative

  return (
    <div className={`rounded-xl p-4 flex items-start gap-3 ${isRed ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'}`}>
      <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${isRed ? 'text-red-500' : 'text-yellow-600'}`} />
      <div className="flex-1">
        {isNegative && (
          <div className={hasAlerts ? 'mb-3 pb-3 border-b border-red-200 dark:border-red-800' : ''}>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-0.5">
              Saldo Acumulado Negativo
            </p>
            <p className="text-sm text-red-700 dark:text-red-400">
              O seu saldo acumulado projetado ao final de este mês está negativo em <strong>{formatCurrency(accumulatedBalance)}</strong>. Por favor, revise suas despesas.
            </p>
          </div>
        )}

        {hasAlerts && (
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
              Limite ultrapassado
            </p>
            <ul className="flex flex-col gap-0.5">
              {overLimit.map((a) => (
                <li key={a.section} className="text-sm text-red-700 dark:text-red-400">
                  <strong>{a.label}:</strong> {formatCurrency(a.total)} (limite {formatCurrency(a.limit)}) · acima em <strong>{formatCurrency(a.overage)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasWarnings && (
          <div className={hasAlerts || isNegative ? 'mt-2' : ''}>
            {(!hasAlerts && !isNegative) && <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Atenção: limite próximo</p>}
            <ul className="flex flex-col gap-0.5">
              {nearLimit.map((s) => (
                <li key={s.section} className="text-sm text-yellow-700 dark:text-yellow-400">
                  <strong>{s.label}:</strong> {s.percentUsed.toFixed(0)}% do limite usado
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <button onClick={() => setDismissedKey(alertKey)} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}
