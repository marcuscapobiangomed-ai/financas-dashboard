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
    <section className="glass-obsidian p-6 rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-xl">
      <div className="flex items-center gap-2.5 mb-5">
        <Landmark size={18} className="text-indigo-500" />
        <h2 className="text-base font-extrabold text-outfit tracking-tight text-gray-900 dark:text-gray-100">
          Saldo real no banco
        </h2>
      </div>

      {/* Main balance stack - vertical stack to prevent layout squeezes */}
      <div className="flex flex-col gap-3.5 mb-5">
        {/* Real confirmed balance */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4.5">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Saldo confirmado
            </span>
          </div>
          <p className="text-2xl font-extrabold text-outfit tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
            {formatCurrency(realBankBalance)}
          </p>
          <p className="text-[10px] font-semibold text-emerald-500/60 dark:text-emerald-400/50 mt-2">
            Apenas pagos/recebidos
          </p>
        </div>

        {/* Pending items */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={13} className="text-amber-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pendente
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            {pendingIncome > 0 && (
              <div className="flex items-center gap-1">
                <ArrowUpCircle size={12} className="text-emerald-500" />
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(pendingIncome)}
                </span>
              </div>
            )}
            {pendingExpenses > 0 && (
              <div className="flex items-center gap-1">
                <ArrowDownCircle size={12} className="text-rose-500" />
                <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                  -{formatCurrency(pendingExpenses)}
                </span>
              </div>
            )}
            {pendingIncome === 0 && pendingExpenses === 0 && (
              <span className="text-xs font-semibold text-amber-600/70 dark:text-amber-400/70">
                Nenhum pendente
              </span>
            )}
          </div>
          <p className="text-[10px] font-semibold text-amber-500/60 dark:text-amber-400/50 mt-2">
            {pendingTransactions.length} lançamento{pendingTransactions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Projected balance */}
        <div className={`rounded-2xl border p-4.5 ${
          projectedBalance >= 0
            ? 'border-indigo-500/20 bg-indigo-500/5'
            : 'border-rose-500/20 bg-rose-500/5'
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark size={13} className={projectedBalance >= 0 ? 'text-indigo-500' : 'text-rose-500'} />
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
              projectedBalance >= 0 ? 'text-indigo-500 dark:text-indigo-400' : 'text-rose-500 dark:text-rose-400'
            }`}>
              Saldo projetado
            </span>
          </div>
          <p className={`text-2xl font-extrabold text-outfit tracking-tight leading-none ${
            projectedBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500 dark:text-rose-400'
          }`}>
            {formatCurrency(projectedBalance)}
          </p>
          <p className={`text-[10px] font-semibold mt-2 ${
            projectedBalance >= 0 ? 'text-indigo-500/60 dark:text-indigo-400/50' : 'text-rose-500/60 dark:text-rose-400/50'
          }`}>
            Se tudo for confirmado
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-semibold text-xs">Progresso de confirmação</span>
          <span className="font-bold text-xs">{confirmedPercent.toFixed(0)}% confirmado</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out"
            style={{ width: `${confirmedPercent}%` }}
          />
        </div>
      </div>
    </section>
  )
}
