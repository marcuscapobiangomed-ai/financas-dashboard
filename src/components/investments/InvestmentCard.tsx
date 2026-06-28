import { LineChart, PieChart, Pause, Play, Pencil, Trash2 } from 'lucide-react'
import { Investment } from '../../types/investment'
import { getInvestmentMeta } from '../../constants/investmentTypes'
import { formatMonthKey } from '../../constants/months'
import { formatCurrency } from '../../utils/currency'
import { getEffectiveAnnualRate, computeProjection } from '../../utils/investmentCalc'

interface InvestmentCardProps {
  inv: Investment
  cdiRate: number
  ipcaRate: number
  onUpdate: (id: string, updates: Partial<Investment>) => void
  onEdit: (inv: Investment) => void
  onDelete: (id: string) => void
}

export function InvestmentCard({
  inv,
  cdiRate,
  ipcaRate,
  onUpdate,
  onEdit,
  onDelete,
}: InvestmentCardProps) {
  const meta = getInvestmentMeta(inv.investmentType)
  const isVariable = meta.yieldInputMode === 'variable_income'

  const annual = getEffectiveAnnualRate(
    inv.investmentType, inv.cdiPercent, inv.ipcaPercent,
    cdiRate, ipcaRate, inv.monthlyYieldPercent
  )
  const proj = computeProjection(inv.principal, annual)

  function getInvRateLabel() {
    const type = inv.investmentType ?? 'manual'
    if (type === 'poupanca') return 'Poupança'
    if (type === 'tesouro_ipca') return `IPCA + ${inv.ipcaPercent ?? 0}%`
    if (type !== 'manual' && inv.cdiPercent) return `${inv.cdiPercent}% do CDI`
    return `${inv.monthlyYieldPercent.toFixed(2)}% a.m.`
  }

  return (
    <div
      className={`glass-panel-lg p-6 flex flex-col gap-4 group relative overflow-hidden transition-all hover:scale-[1.01] ${!inv.isActive ? 'opacity-60 grayscale' : ''}`}
    >
      {/* Neon glow indicator */}
      <div className={`absolute inset-x-0 top-0 h-1 ${isVariable ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_20px_rgba(16,185,129,0.6)]' : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]'}`} />
      
      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div className="flex gap-4 items-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white/20 shadow-lg ${isVariable ? 'bg-gradient-to-br from-emerald-100 to-cyan-50 dark:from-emerald-900/50 dark:to-cyan-900/30 text-emerald-600' : 'bg-gradient-to-br from-indigo-100 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/30 text-indigo-600'}`}>
            {isVariable ? <PieChart size={24} /> : <LineChart size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{inv.name}</p>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {inv.ticker && (
                <span className="text-xs font-extrabold bg-gray-900/10 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-lg border border-gray-200/30 dark:border-white/10">
                  {inv.ticker}
                </span>
              )}
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${isVariable ? 'bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}`}>
                {meta.label}
              </span>
            </div>
          </div>
        </div>

        {/* Main value */}
        <div className="text-right">
          <p className="text-xl font-black text-gray-900 dark:text-gray-100">{formatCurrency(inv.principal)}</p>
          <span className="text-xs text-gray-500">desde {formatMonthKey(inv.startMonth)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100/50 dark:border-white/5">
        <div className="flex-1">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Rendimento/mês</span>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(proj.monthlyAmount)}</p>
        </div>
        <div className="flex-1">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Rendimento/ano</span>
          <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">+{formatCurrency(proj.annualAmount)}</p>
        </div>
        <div className="flex-1">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Taxa a.a.</span>
          <p className="text-base font-bold text-gray-700 dark:text-gray-300">{proj.annualRate.toFixed(2)}%</p>
        </div>
        {!isVariable && (
          <div className="flex-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tipo</span>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate">{getInvRateLabel()}</p>
          </div>
        )}
      </div>

      {/* Status & Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100/50 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${inv.isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-gray-400'}`} />
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{inv.isActive ? 'ATIVO' : 'PAUSADO'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate(inv.id, { isActive: !inv.isActive })}
            className="p-2.5 rounded-xl bg-gray-100/50 dark:bg-white/5 text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all cursor-pointer"
            title={inv.isActive ? 'Pausar' : 'Ativar'}
          >
            {inv.isActive ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={() => onEdit(inv)}
            className="p-2.5 rounded-xl bg-gray-100/50 dark:bg-white/5 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Excluir "${inv.name}"?`)) onDelete(inv.id)
            }}
            className="p-2.5 rounded-xl bg-gray-100/50 dark:bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all cursor-pointer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
