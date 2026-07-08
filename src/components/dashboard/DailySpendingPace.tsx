import { useMemo } from 'react'
import { Gauge, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { useMonthData } from '../../hooks/useMonthData'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { formatCurrency } from '../../utils/currency'
import { getCurrentMonthKey, parseMonthKey } from '../../constants/months'

export function DailySpendingPace({ monthKey }: { monthKey: string }) {
  const { totalExpenses, sectionLimits, sections } = useMonthData(monthKey)
  const { expenseSections, cardSections } = useSectionConfig()
  const isCurrentMonth = monthKey === getCurrentMonthKey()
  const cardIds = cardSections.map((c) => c.id)

  const data = useMemo(() => {
    const { year, month } = parseMonthKey(monthKey)
    const totalDays = new Date(year, month, 0).getDate()

    const today = new Date()
    const daysElapsed = isCurrentMonth
      ? today.getDate()
      : totalDays

    // ── Budget: exclude card sections (they're billed next month, not daily cash)
    const nonCardExpenseSections = expenseSections.filter((s) => !cardIds.includes(s))
    const totalBudget = nonCardExpenseSections.reduce((sum, section) => {
      return sum + (sectionLimits[section] ?? 0)
    }, 0)

    // ── Daily average: exclude card transactions (cash-flow impact is next month)
    const nonCardExpenses = sections
      .filter((s) => !cardIds.includes(s.section) && expenseSections.includes(s.section))
      .reduce((sum, s) => sum + s.total, 0)

    const dailyAvg = daysElapsed > 0 ? nonCardExpenses / daysElapsed : 0
    const idealDaily = totalBudget > 0 ? totalBudget / totalDays : 0
    const projectedTotal = isCurrentMonth ? dailyAvg * totalDays : totalExpenses
    const daysRemaining = isCurrentMonth ? totalDays - daysElapsed : 0
    const remainingBudget = totalBudget - totalExpenses
    const dailyBudgetRemaining = daysRemaining > 0 ? remainingBudget / daysRemaining : 0

    let paceStatus: 'good' | 'warning' | 'danger'
    if (idealDaily <= 0 || totalBudget <= 0) {
      paceStatus = dailyAvg > 0 ? 'warning' : 'good'
    } else if (dailyAvg <= idealDaily) {
      paceStatus = 'good'
    } else if (dailyAvg <= idealDaily * 1.2) {
      paceStatus = 'warning'
    } else {
      paceStatus = 'danger'
    }

    const paceBarPercent = idealDaily > 0
      ? Math.min(150, (dailyAvg / idealDaily) * 100)
      : 0

    return {
      dailyAvg,
      idealDaily,
      projectedTotal,
      totalBudget,
      daysElapsed,
      totalDays,
      daysRemaining,
      dailyBudgetRemaining,
      paceStatus,
      paceBarPercent,
    }
  }, [monthKey, totalExpenses, sectionLimits, expenseSections, isCurrentMonth, cardIds, sections])

  if (data.totalBudget <= 0 && totalExpenses <= 0) return null

  const statusConfig = {
    good: {
      icon: TrendingDown,
      label: 'Controlado',
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
    },
    warning: {
      icon: AlertTriangle,
      label: 'Atenção',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      bar: 'bg-gradient-to-r from-amber-400 to-amber-500',
    },
    danger: {
      icon: TrendingUp,
      label: 'Acima do ideal',
      bg: 'bg-red-50 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      bar: 'bg-gradient-to-r from-red-400 to-red-500',
    },
  }

  const status = statusConfig[data.paceStatus]
  const StatusIcon = status.icon

  return (
    <div className="glass-obsidian rounded-3xl p-6 border border-gray-200/50 dark:border-white/5 shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Gauge size={15} className="text-indigo-500" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Ritmo de gastos
            </p>
          </div>
          <p className="text-2xl font-extrabold text-outfit tracking-tight text-gray-900 dark:text-gray-100 mt-1">
            {formatCurrency(data.dailyAvg)}<span className="text-sm font-medium text-gray-400">/dia</span>
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">Pix/dinheiro · exclui cartões</p>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
          <StatusIcon size={12} />
          {status.label}
        </div>
      </div>

      {/* Pace bar */}
      {data.idealDaily > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
            <span>Ideal: {formatCurrency(data.idealDaily)}/dia</span>
            <span>{data.paceBarPercent.toFixed(0)}% do ritmo ideal</span>
          </div>
          <div className="relative w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
              style={{ width: `${Math.min(100, data.paceBarPercent)}%` }}
            />
            {/* Ideal mark at 100% */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500"
              style={{ left: `${Math.min(100, (100 / Math.max(data.paceBarPercent, 100)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {isCurrentMonth && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Projeção fim do mês</p>
            <p className={`text-sm font-bold mt-1 ${
              data.projectedTotal > data.totalBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {formatCurrency(data.projectedTotal)}
            </p>
          </div>
        )}
        {isCurrentMonth && data.daysRemaining > 0 && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Pode gastar/dia</p>
            <p className={`text-sm font-bold mt-1 ${
              data.dailyBudgetRemaining <= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {formatCurrency(Math.max(0, data.dailyBudgetRemaining))}
            </p>
          </div>
        )}
        {!isCurrentMonth && (
          <>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Total gasto</p>
              <p className="text-sm font-bold mt-1 text-gray-900 dark:text-gray-100">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Orçamento</p>
              <p className="text-sm font-bold mt-1 text-gray-900 dark:text-gray-100">{formatCurrency(data.totalBudget)}</p>
            </div>
          </>
        )}
      </div>

      {isCurrentMonth && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 text-center">
          {data.daysElapsed} dias passados · {data.daysRemaining} restantes
        </p>
      )}
    </div>
  )
}
