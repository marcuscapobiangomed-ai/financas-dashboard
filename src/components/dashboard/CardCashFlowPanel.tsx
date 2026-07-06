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
    neutral: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-800/40',
    danger: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-800/40',
    success: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800/40',
    warning: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800/40',
  }[tone]

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none">{formatCurrency(value)}</p>
      <p className="mt-2 text-xs opacity-75">{subtitle}</p>
    </div>
  )
}

export function CardCashFlowPanel({ monthKey }: { monthKey: string }) {
  const flow = useCardCashFlow(monthKey)

  if (!flow.hasCards) return null

  const projectedTone = flow.projectedAfterNextBill >= 0 ? 'success' : 'danger'

  return (
    <section className="glass-panel-lg p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <CreditCard size={19} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-extrabold tracking-tight">Cartão e caixa real</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Faturas aparecem no mês em que vencem. Compras de {formatMonthKey(monthKey)} podem virar compromisso de {formatMonthKey(flow.nextMonthKey)}.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <CalendarDays size={14} />
          {getMonthLabel(monthKey)}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricTile
          label="Fatura vence neste mês"
          value={flow.currentBillTotal}
          subtitle={flow.currentBillPendingTotal > 0 ? `Inclui ${formatCurrency(flow.currentBillPendingTotal)} pendente` : 'Compromisso do cartão neste mês'}
          tone={flow.currentBillTotal > 0 ? 'warning' : 'neutral'}
        />
        <MetricTile
          label="Pix/debito e fixos"
          value={flow.immediateExpenses}
          subtitle="Saidas que nao dependem da fatura"
          tone="danger"
        />
        <MetricTile
          label="Depois de pagar este mes"
          value={flow.cashAfterCurrentCommitments}
          subtitle={`Entradas + saldo anterior: ${formatCurrency(flow.incomeAvailable)}`}
          tone={flow.cashAfterCurrentCommitments >= 0 ? 'success' : 'danger'}
        />
        <MetricTile
          label={`Depois da fatura de ${formatMonthKey(flow.nextMonthKey)}`}
          value={flow.projectedAfterNextBill}
          subtitle={`Reserva para a proxima fatura: ${formatCurrency(flow.nextBillTotal)}`}
          tone={projectedTone}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white/55 dark:bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <WalletCards size={15} className="text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Faturas deste mês</h3>
          </div>
          {flow.currentBills.length > 0 ? (
            <div className="space-y-2">
              {flow.currentBills.map((bill) => (
                <div key={bill.cardId} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{bill.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">vence {formatShortDate(bill.dueDate)} - {bill.transactionCount} lanç.</p>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(bill.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma fatura cadastrada para este mês.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white/55 dark:bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={15} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Compras feitas no mês</h3>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{formatCurrency(flow.purchasesThisMonthTotal)}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(flow.futurePurchasesFromThisMonth)} já ficou para faturas futuras.
          </p>
          {flow.purchaseDestinations.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {flow.purchaseDestinations.map((destination) => (
                <div key={destination.monthKey} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Vai para {formatMonthKey(destination.monthKey)}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(destination.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white/55 dark:bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={15} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Próxima fatura</h3>
          </div>
          {flow.nextBills.length > 0 ? (
            <div className="space-y-2">
              {flow.nextBills.map((bill) => (
                <div key={bill.cardId} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{bill.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">vence {formatShortDate(bill.dueDate)}</p>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(bill.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Ainda não há fatura conhecida para {formatMonthKey(flow.nextMonthKey)}.</p>
          )}
        </div>
      </div>
    </section>
  )
}
