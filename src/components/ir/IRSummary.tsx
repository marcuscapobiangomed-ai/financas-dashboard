import { AlertTriangle, CheckCircle, TrendingUp, Heart, Briefcase, Target, Bell, XCircle, Zap } from 'lucide-react'
import { IRAnalysis } from '../../utils/irCalc'

interface IRSummaryProps {
  analysis: IRAnalysis
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

export function IRSummary({ analysis }: IRSummaryProps) {
  return (
    <div className="lg:col-span-2 space-y-6">
      <GlassCard className="bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200/50 dark:border-emerald-700/50">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${analysis.isMandatory ? 'bg-red-500' : 'bg-emerald-500'}`}>
            {analysis.isMandatory ? <AlertTriangle size={24} className="text-white" /> : <CheckCircle size={24} className="text-white" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {analysis.isMandatory ? '⚠️ Obrigado a Declarar' : 'Não Obrigado a Declarar'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {analysis.isMandatory
                ? 'Com base nos seus dados, você deve apresentar a DIRPF'
                : 'Sua renda está abaixo do limite obrigatório'}
            </p>
          </div>
        </div>
        {analysis.reasons.length > 0 && (
          <div className="space-y-2">
            {analysis.reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-red-50/50 dark:bg-red-900/20 border border-red-200/30">
                <XCircle size={16} className="text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400">{r.description}</span>
                {r.value && <span className="ml-auto text-sm font-semibold text-red-600">{fmt(r.value)}</span>}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -mr-8 -mt-8" />
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <span className="text-xs text-gray-500 uppercase">Receitas</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{fmt(analysis.income.total)}</p>
          <p className="text-xs text-gray-400 mt-1">mapeadas automaticamente</p>
        </GlassCard>

        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/10 rounded-full -mr-8 -mt-8" />
          <div className="flex items-center gap-2 mb-2">
            <Heart size={16} className="text-pink-500" />
            <span className="text-xs text-gray-500 uppercase">Deduções</span>
          </div>
          <p className="text-xl font-bold text-pink-500">{fmt(analysis.deductions.total)}</p>
          <p className="text-xs text-gray-400 mt-1">encontradas automaticamente</p>
        </GlassCard>

        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full -mr-8 -mt-8" />
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={16} className="text-indigo-500" />
            <span className="text-xs text-gray-500 uppercase">Patrimônio</span>
          </div>
          <p className="text-xl font-bold text-indigo-600">{fmt(analysis.assets.total)}</p>
          <p className="text-xs text-gray-400 mt-1">em investimentos</p>
        </GlassCard>

        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full -mr-8 -mt-8" />
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-amber-500" />
            <span className="text-xs text-gray-500 uppercase">Completude</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{analysis.completeness.score}%</p>
          <p className="text-xs text-gray-400 mt-1">da declaração preenchida</p>
        </GlassCard>
      </div>

      {analysis.alerts.length > 0 && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Bell size={16} className="text-amber-500" />
            Alertas e Sugestões
          </h3>
          <div className="space-y-3">
            {analysis.alerts.map((alert, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                alert.type === 'success' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/30' :
                alert.type === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200/30' :
                'bg-red-50/50 dark:bg-red-900/20 border-red-200/30'
              }`}>
                <div className="flex items-start gap-3">
                  {alert.type === 'success' && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
                  {alert.type === 'warning' && <AlertTriangle size={18} className="text-amber-500 shrink-0" />}
                  {alert.type === 'error' && <XCircle size={18} className="text-red-500 shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{alert.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Sugestões Automáticas</h3>
        <div className="space-y-2">
          {analysis.completeness.suggestions.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/30">
              <Zap size={16} className="text-indigo-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{s}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
