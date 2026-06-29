import { TrendingUp, Target, CalendarDays } from 'lucide-react'
import { ProjectionData } from '../../types/analytics'
import { formatCurrency, formatPercent } from '../../utils/currency'
import { useFinanceStore } from '../../store/useFinanceStore'

function SavingsGauge({ rate, goal }: { rate: number; goal: number }) {
  const clampedRate = Math.min(Math.max(rate, 0), 100)
  const angle = (clampedRate / 100) * 180
  const goalAngle = (Math.min(goal, 100) / 100) * 180
  const isOnTrack = rate >= goal

  const describeArc = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = ((startAngle - 180) * Math.PI) / 180
    const endRad = ((endAngle - 180) * Math.PI) / 180
    const x1 = 60 + radius * Math.cos(startRad)
    const y1 = 55 + radius * Math.sin(startRad)
    const x2 = 60 + radius * Math.cos(endRad)
    const y2 = 55 + radius * Math.sin(endRad)
    const large = endAngle - startAngle > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <svg viewBox="0 0 120 70" className="w-full max-w-[160px] mx-auto">
      {/* Background arc */}
      <path
        d={describeArc(0, 180, 45)}
        fill="none"
        stroke="currentColor"
        className="text-gray-200 dark:text-gray-600"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Value arc */}
      {angle > 0 && (
        <path
          d={describeArc(0, Math.min(angle, 180), 45)}
          fill="none"
          stroke={isOnTrack ? '#10b981' : '#f59e0b'}
          strokeWidth="8"
          strokeLinecap="round"
        />
      )}
      {/* Goal marker */}
      {(() => {
        const goalRad = ((goalAngle - 180) * Math.PI) / 180
        const gx = 60 + 45 * Math.cos(goalRad)
        const gy = 55 + 45 * Math.sin(goalRad)
        return <circle cx={gx} cy={gy} r="3" fill="#6366f1" />
      })()}
      {/* Center text */}
      <text x="60" y="50" textAnchor="middle" className="fill-gray-900 dark:fill-gray-100" fontSize="14" fontWeight="700">
        {formatPercent(rate)}
      </text>
      <text x="60" y="63" textAnchor="middle" className="fill-gray-400" fontSize="8">
        Meta: {formatPercent(goal)}
      </text>
    </svg>
  )
}

export function ProjectionCard({ projection }: { projection: ProjectionData }) {
  const goalRate = useFinanceStore((s) => s.appSettings.defaultSavingsGoalPercent)
  return (
    <div className="glass-panel p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Projeção Anual</h3>
        <span className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full ${projection.onTrackForGoal ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
          {projection.onTrackForGoal ? '✓ Na meta' : '✗ Abaixo da meta'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Gauge */}
        <div className="flex flex-col items-center justify-center">
          <SavingsGauge rate={projection.avgSavingsRate} goal={goalRate} />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Taxa média de poupança</p>
        </div>

        {/* Projections grid */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Receita projetada (ano)</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(projection.projectedYearIncome)}</p>
            <p className="text-[10px] text-gray-400">≈ {formatCurrency(projection.avgMonthlyIncome)}/mês</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Despesas projetadas (ano)</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(projection.projectedYearTotal)}</p>
            <p className="text-[10px] text-gray-400">≈ {formatCurrency(projection.avgMonthlyExpense)}/mês</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Poupança projetada (ano)</p>
            <p className={`text-lg font-bold ${projection.projectedYearSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(projection.projectedYearSavings)}
            </p>
          </div>
          {projection.projectedMonthExpense != null && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Projeção mês atual</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(projection.projectedMonthExpense)}</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <CalendarDays size={10} /> até fim do mês
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Target size={11} />
        Baseado nos últimos {12 - projection.monthsRemaining} meses · {projection.monthsRemaining} meses restantes no ano
      </div>
    </div>
  )
}
