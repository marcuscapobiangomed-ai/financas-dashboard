import { CreditCard, Landmark, TrendingDown } from 'lucide-react'
import { useCardCashFlow } from '../../hooks/useCardCashFlow'
import { formatCurrency } from '../../utils/currency'
import { formatMonthKey } from '../../constants/months'

function formatShortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

/**
 * Compact version shown on Dashboard — just 2 key metrics + bill list.
 * Full detail panel is available in MonthView.
 */
export function CardCashFlowPanel({ monthKey }: { monthKey: string }) {
  const flow = useCardCashFlow(monthKey)

  if (!flow.hasCards) return null

  const availableTone = flow.cashAfterCurrentCommitments >= 0 ? 'teal' : 'rose'
  const projectedTone = flow.projectedAfterNextBill >= 0 ? 'teal' : 'rose'

  return (
    <section className="glass-obsidian p-6 rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <CreditCard size={18} className="text-indigo-500" />
        <h2 className="text-base font-extrabold text-outfit tracking-tight text-gray-900 dark:text-gray-100">
          Cartões & Faturas
        </h2>
      </div>

      {/* 2 Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Disponível agora */}
        <div className={`rounded-2xl border p-4 ${
          availableTone === 'teal'
            ? 'border-teal-500/20 bg-teal-500/5'
            : 'border-rose-500/20 bg-rose-500/5'
        }`}>
          <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-2 ${
            availableTone === 'teal' ? 'text-teal-500/80' : 'text-rose-500/80'
          }`}>
            Disponível agora
          </p>
          <p className={`text-2xl font-extrabold text-outfit tracking-tight leading-none ${
            availableTone === 'teal' ? 'text-teal-500 dark:text-teal-400' : 'text-rose-500 dark:text-rose-400'
          }`}>
            {formatCurrency(flow.cashAfterCurrentCommitments)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-2">
            Após pagar fatura deste mês
          </p>
        </div>

        {/* Projeção após próxima fatura */}
        <div className={`rounded-2xl border p-4 ${
          projectedTone === 'teal'
            ? 'border-indigo-500/20 bg-indigo-500/5'
            : 'border-amber-500/20 bg-amber-500/5'
        }`}>
          <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-2 ${
            projectedTone === 'teal' ? 'text-indigo-500/80' : 'text-amber-500/80'
          }`}>
            Após fatura de {formatMonthKey(flow.nextMonthKey)}
          </p>
          <p className={`text-2xl font-extrabold text-outfit tracking-tight leading-none ${
            projectedTone === 'teal' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-500 dark:text-amber-400'
          }`}>
            {formatCurrency(flow.projectedAfterNextBill)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-2">
            Reserva: {formatCurrency(flow.nextBillTotal)}
          </p>
        </div>
      </div>

      {/* Bills summary — current month */}
      {flow.currentBills.length > 0 && (
        <div className="border-t border-gray-100/50 dark:border-white/5 pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Landmark size={13} className="text-amber-500" />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Faturas deste mês
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {flow.currentBills.map((bill) => (
              <div key={bill.cardId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <TrendingDown size={12} className="text-rose-400 shrink-0" />
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{bill.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                    vence {formatShortDate(bill.dueDate)}
                  </span>
                </div>
                <span className="font-extrabold text-outfit text-gray-900 dark:text-gray-100 shrink-0 ml-3">
                  {formatCurrency(bill.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
