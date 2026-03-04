import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useBudgetAlerts } from '../../hooks/useBudgetAlerts'
import { formatCurrency } from '../../utils/currency'

export function AlertBanner({ monthKey }: { monthKey: string }) {
  const { overLimit, nearLimit, hasAlerts, hasWarnings } = useBudgetAlerts(monthKey)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || (!hasAlerts && !hasWarnings)) return null

  return (
    <div className={`rounded-xl p-4 flex items-start gap-3 ${hasAlerts ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
      <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${hasAlerts ? 'text-red-500' : 'text-yellow-600'}`} />
      <div className="flex-1">
        {hasAlerts && (
          <div>
            <p className={`text-sm font-semibold mb-1 ${hasAlerts ? 'text-red-800' : 'text-yellow-800'}`}>
              Limite ultrapassado
            </p>
            <ul className="flex flex-col gap-0.5">
              {overLimit.map((a) => (
                <li key={a.section} className="text-sm text-red-700">
                  <strong>{a.label}:</strong> {formatCurrency(a.total)} (limite {formatCurrency(a.limit)}) · acima em <strong>{formatCurrency(a.overage)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasWarnings && (
          <div className={hasAlerts ? 'mt-2' : ''}>
            {!hasAlerts && <p className="text-sm font-semibold text-yellow-800 mb-1">Atenção: limite próximo</p>}
            <ul className="flex flex-col gap-0.5">
              {nearLimit.map((s) => (
                <li key={s.section} className="text-sm text-yellow-700">
                  <strong>{s.label}:</strong> {s.percentUsed.toFixed(0)}% do limite usado
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="p-1 rounded text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}
