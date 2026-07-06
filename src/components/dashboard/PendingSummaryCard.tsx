import { CheckCircle2, Clock, ArrowUpCircle, ArrowDownCircle, Landmark } from 'lucide-react'
import { useMonthData } from '../../hooks/useMonthData'
import { formatCurrency } from '../../utils/currency'

export function PendingSummaryCard({ monthKey }: { monthKey: string }) {
  const {
    income, totalExpenses, pendingIncome, pendingExpenses,
    carryoverBalance, pendingTransactions,
  } = useMonthData(monthKey)

  const confirmedIncome = income
  const confirmedExpenses = totalExpenses

  const realBankBalance = carryoverBalance + confirmedIncome - confirmedExpenses
  const projectedBalance = realBankBalance + pendingIncome - pendingExpenses

  const totalMonthMovement = confirmedIncome + confirmedExpenses + pendingIncome + pendingExpenses
  const confirmedMovement = confirmedIncome + confirmedExpenses
  const confirmedPercent = totalMonthMovement > 0
    ? Math.min(100, (confirmedMovement / totalMonthMovement) * 100)
    : 100

  if (pendingTransactions.length === 0 && confirmedIncome === 0 && confirmedExpenses === 0) return null

  return (
    <section className="glass-panel-lg p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Landmark size={18} className="text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Saldo real no banco
        </h2>
      </div>

      {/* Main balance row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {/* Real confirmed balance */}
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 opacity-75">
              Saldo confirmado
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 leading-none">
            {formatCurrency(realBankBalance)}
          </p>
          <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60 mt-1.5">
            Apenas pagos/recebidos
          </p>
        </div>

        {/* Pending items */}
        <div className="rounded-xl border border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={14} className="text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 opacity-75">
              Pendente
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            {pendingIncome > 0 && (
              <div className="flex items-center gap-1">
                <ArrowUpCircle size={12} className="text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(pendingIncome)}
                </span>
              </div>
            )}
            {pendingExpenses > 0 && (
              <div className="flex items-center gap-1">
                <ArrowDownCircle size={12} className="text-red-500" />
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  -{formatCurrency(pendingExpenses)}
                </span>
              </div>
            )}
            {pendingIncome === 0 && pendingExpenses === 0 && (
              <span className="text-sm font-medium text-amber-600/70 dark:text-amber-400/70">
                Nenhum pendente
              </span>
            )}
          </div>
          <p className="text-xs text-amber-600/60 dark:text-amber-400/60 mt-1.5">
            {pendingTransactions.length} lançamento{pendingTransactions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Projected balance */}
        <div className={`rounded-xl border p-4 ${
          projectedBalance >= 0
            ? 'border-indigo-100 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-950/30'
            : 'border-red-100 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30'
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark size={14} className={projectedBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'} />
            <span className={`text-[11px] font-bold uppercase tracking-wider opacity-75 ${
              projectedBalance >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-700 dark:text-red-300'
            }`}>
              Saldo projetado
            </span>
          </div>
          <p className={`text-2xl font-extrabold leading-none ${
            projectedBalance >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-700 dark:text-red-300'
          }`}>
            {formatCurrency(projectedBalance)}
          </p>
          <p className={`text-xs mt-1.5 ${
            projectedBalance >= 0 ? 'text-indigo-600/60 dark:text-indigo-400/60' : 'text-red-600/60 dark:text-red-400/60'
          }`}>
            Se tudo for confirmado
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span className="font-medium">Progresso de confirmação</span>
          <span className="font-semibold">{confirmedPercent.toFixed(0)}% confirmado</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out"
            style={{ width: `${confirmedPercent}%` }}
          />
        </div>
      </div>
    </section>
  )
}
