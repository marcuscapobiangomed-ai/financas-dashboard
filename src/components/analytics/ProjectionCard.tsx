import { TrendingUp, Target } from 'lucide-react'
import { ProjectionData } from '../../types/analytics'
import { formatCurrency, formatPercent } from '../../utils/currency'

export function ProjectionCard({ projection }: { projection: ProjectionData }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-700">Projeção Anual</h3>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${projection.onTrackForGoal ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {projection.onTrackForGoal ? 'Na meta' : 'Abaixo da meta'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Receita projetada</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(projection.projectedYearIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Despesas projetadas</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(projection.projectedYearTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Poupança projetada</p>
          <p className={`text-lg font-bold ${projection.projectedYearSavings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(projection.projectedYearSavings)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Taxa média de poupança</p>
          <p className={`text-lg font-bold ${projection.avgSavingsRate >= 20 ? 'text-emerald-600' : 'text-yellow-600'}`}>
            {formatPercent(projection.avgSavingsRate)}
          </p>
        </div>
      </div>

      <div className="text-xs text-gray-400 flex items-center gap-1">
        <Target size={11} />
        Baseado nos últimos {12 - projection.monthsRemaining} meses · {projection.monthsRemaining} meses restantes
      </div>
    </div>
  )
}
