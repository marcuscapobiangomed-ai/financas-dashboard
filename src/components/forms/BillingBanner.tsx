import { CreditCard } from 'lucide-react'

interface BillingBannerProps {
  billingMonthLabel: string | null
  date: string
  currentCard: {
    closingDay?: number
    dueDay?: number
  } | undefined
}

export function BillingBanner({ billingMonthLabel, date, currentCard }: BillingBannerProps) {
  if (!billingMonthLabel || !date || !currentCard) return null

  const day = date.split('-')[2]
  const month = date.split('-')[1]

  return (
    <div className="flex items-start gap-2.5 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-700/40 rounded-xl text-xs">
      <CreditCard size={14} className="text-indigo-500 mt-0.5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-indigo-700 dark:text-indigo-300">
          Fatura: {billingMonthLabel}
        </span>
        <span className="text-indigo-600/70 dark:text-indigo-400/70">
          Compra dia {day}/{month} · Fechamento dia {currentCard.closingDay ?? 10} · Vencimento dia {currentCard.dueDay ?? 20}
        </span>
      </div>
    </div>
  )
}
