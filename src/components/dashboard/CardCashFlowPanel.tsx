import { CalendarDays, CreditCard, Landmark, WalletCards } from 'lucide-react'
import { useCardCashFlow } from '../../hooks/useCardCashFlow'
import { formatCurrency } from '../../utils/currency'
import { formatMonthKey, getMonthLabel } from '../../constants/months'

function formatShortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

function MetricTile({
  label,
  value,
  subtitle,
  tone = 'neutral',
}: {
  label: string
  value: number
  subtitle: string
  tone?: 'neutral' | 'danger' | 'success' | 'warning'
}) {
  const toneClass = {
    neutral: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 dark:bg-indigo-500/5 border-indigo-500/10',
    danger: 'text-rose-500 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/5 border-rose-500/10',
    success: 'text-teal-500 dark:text-teal-400 bg-teal-500/5 dark:bg-teal-500/5 border-teal-500/10',
    warning: 'text-amber-500 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/10',
  }[tone]

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.01] ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-outfit tracking-tight leading-none">{formatCurrency(value)}</p>
      <p className="mt-2.5 text-[10px] opacity-80 font-semibold">{subtitle}</p>
    </div>
  )
}

export function CardCashFlowPanel({ monthKey }: { monthKey: string }) {
  const flow = useCardCashFlow(monthKey)

  if (!flow.hasCards) return null

  const projectedTone = flow.projectedAfterNextBill >= 0 ? 'success' : 'danger'

  return (
    <section className="glass-obsidian p-6 rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 text-gray-900 dark:text-gray-100">
            <CreditCard size={19} className="text-indigo-500" />
            <h2 className="text-lg font-extrabold text-outfit tracking-tight">Fluxo de Caixa Real & Cartões</h2>
          </div>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Faturas aparecem no mês em que vencem. Compras de {formatMonthKey(monthKey)} podem virar compromisso de {formatMonthKey(flow.nextMonthKey)}.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 px-3.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 self-start shrink-0">
          <CalendarDays size={13} className="text-indigo-500" />
          {getMonthLabel(monthKey)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricTile
          label="Fatura vence neste mês"
          value={flow.currentBillTotal}
          subtitle={flow.currentBillPendingTotal > 0 ? `Inclui ${formatCurrency(flow.currentBillPendingTotal)} pendente` : 'Compromisso do cartão neste mês'}
          tone={flow.currentBillTotal > 0 ? 'warning' : 'neutral'}
        />
        <MetricTile
          label="Pix/débito e fixos"
          value={flow.immediateExpenses}
          subtitle="Saídas que não dependem de fatura"
          tone="danger"
        />
        <MetricTile
          label="Depois de pagar este mês"
          value={flow.cashAfterCurrentCommitments}
          subtitle={`Disponível: ${formatCurrency(flow.incomeAvailable)}`}
          tone={flow.cashAfterCurrentCommitments >= 0 ? 'success' : 'danger'}
        />
        <MetricTile
          label={`Depois da fatura de ${formatMonthKey(flow.nextMonthKey)}`}
          value={flow.projectedAfterNextBill}
          subtitle={`Reserva da próxima fatura: ${formatCurrency(flow.nextBillTotal)}`}
          tone={projectedTone}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass-obsidian rounded-2xl p-5 border border-gray-200/40 dark:border-white/5 hover:border-indigo-500/20 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <WalletCards size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider text-[11px]">Faturas deste mês</h3>
          </div>
          {flow.currentBills.length > 0 ? (
            <div className="space-y-3.5">
              {flow.currentBills.map((bill) => (
                <div key={bill.cardId} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{bill.label}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">vence {formatShortDate(bill.dueDate)} · {bill.transactionCount} lanç.</p>
                  </div>
                  <span className="font-extrabold text-outfit text-gray-900 dark:text-gray-100">{formatCurrency(bill.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma fatura cadastrada para este mês.</p>
          )}
        </div>

        <div className="glass-obsidian rounded-2xl p-5 border border-gray-200/40 dark:border-white/5 hover:border-indigo-500/20 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider text-[11px]">Compras feitas no mês</h3>
          </div>
          <p className="text-2xl font-extrabold text-outfit tracking-tight text-gray-900 dark:text-gray-100">{formatCurrency(flow.purchasesThisMonthTotal)}</p>
          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {formatCurrency(flow.futurePurchasesFromThisMonth)} já ficou para faturas futuras.
          </p>
          {flow.purchaseDestinations.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-gray-150 dark:border-white/5 pt-3">
              {flow.purchaseDestinations.map((destination) => (
                <div key={destination.monthKey} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 dark:text-gray-500 font-medium">Fatura de {formatMonthKey(destination.monthKey)}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(destination.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-obsidian rounded-2xl p-5 border border-gray-200/40 dark:border-white/5 hover:border-indigo-500/20 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Landmark size={16} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider text-[11px]">Próxima fatura</h3>
          </div>
          {flow.nextBills.length > 0 ? (
            <div className="space-y-3.5">
              {flow.nextBills.map((bill) => (
                <div key={bill.cardId} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{bill.label}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">vence {formatShortDate(bill.dueDate)}</p>
                  </div>
                  <span className="font-extrabold text-outfit text-gray-900 dark:text-gray-100">{formatCurrency(bill.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">Ainda não há fatura para {formatMonthKey(flow.nextMonthKey)}.</p>
          )}
        </div>
      </div>
    </section>
  )
}
