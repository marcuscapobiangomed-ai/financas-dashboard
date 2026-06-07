import { Building2, Heart, GraduationCap, Landmark, Shield, Stethoscope } from 'lucide-react'
import { IRAnalysis } from '../../utils/irCalc'

interface IRDashboardCardsProps {
  analysis: IRAnalysis
  aliquot: number
  calculatedTax: number
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card-lg p-5 ${className}`}>
      {children}
    </div>
  )
}

export function IRDashboardCards({ analysis, aliquot, calculatedTax }: IRDashboardCardsProps) {
  return (
    <div className="space-y-4">
      <GlassCard className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">Simulação de IR</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Renda tributável</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(analysis.income.regular)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Deduções</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">- {fmt(Math.min(analysis.deductions.total, analysis.income.regular * 0.1))}</span>
          </div>
          <div className="border-t border-blue-200/50 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Base de cálculo</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(Math.max(0, analysis.income.regular - Math.min(analysis.deductions.total, analysis.income.regular * 0.1)))}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600 dark:text-gray-400">Alíquota</span>
              <span className="font-semibold text-indigo-600">{aliquot}%</span>
            </div>
            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-blue-200/50">
              <span className="font-semibold text-gray-700 dark:text-gray-300">IR Provável</span>
              <span className="text-lg font-bold text-blue-600">{fmt(calculatedTax)}</span>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mapeamento Automático</h3>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={14} className="text-indigo-500" />
              <span className="text-xs font-medium text-indigo-600">Rendimentos Tributáveis</span>
            </div>
            <p className="text-lg font-bold text-indigo-600">{fmt(analysis.income.regular)}</p>
            <p className="text-xs text-gray-400">Entradas do app</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 mb-1">
              <Landmark size={14} className="text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Tributação Exclusiva</span>
            </div>
            <p className="text-lg font-bold text-amber-600">{fmt(analysis.income.exclusive)}</p>
            <p className="text-xs text-gray-400">13°, PLR, investimentos</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">Rendimentos Isentos</span>
            </div>
            <p className="text-lg font-bold text-emerald-600">{fmt(analysis.income.exempt)}</p>
            <p className="text-xs text-gray-400">Férias, isentos</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Deduções Detectadas</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 rounded-lg bg-pink-50/50 dark:bg-pink-900/20">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-pink-500" />
              <span className="text-sm text-gray-600">Dízimos</span>
            </div>
            <span className="font-semibold text-pink-500">{fmt(analysis.deductions.tithes)}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-red-50/50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <Stethoscope size={14} className="text-red-500" />
              <span className="text-sm text-gray-600">Saúde</span>
            </div>
            <span className="font-semibold text-red-500">{fmt(analysis.deductions.health)}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2">
              <GraduationCap size={14} className="text-blue-500" />
              <span className="text-sm text-gray-600">Educação</span>
            </div>
            <span className="font-semibold text-blue-500">{fmt(analysis.deductions.education)}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
