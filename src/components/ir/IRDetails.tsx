import { IRAnalysis } from '../../utils/irCalc'

interface IRDetailsProps {
  analysis: IRAnalysis
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card-lg p-5 ${className}`}>
      {children}
    </div>
  )
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function IRDetails({ analysis }: IRDetailsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Investimentos Tributáveis</h3>
        {analysis.investments.taxable.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum investimento tributável</p>
        ) : (
          <div className="space-y-2">
            {analysis.investments.taxable.map((inv, i) => (
              <div key={i} className="flex justify-between p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/30">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{inv.name}</p>
                  <p className="text-xs text-gray-400">{inv.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-600">{fmt(inv.value)}</p>
                  <p className="text-xs text-amber-500">rendimento</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Investimentos Isentos</h3>
        {analysis.investments.exempt.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum investimento isento</p>
        ) : (
          <div className="space-y-2">
            {analysis.investments.exempt.map((inv, i) => (
              <div key={i} className="flex justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/30">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{inv.name}</p>
                  <p className="text-xs text-gray-400">{inv.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">{fmt(inv.value)}</p>
                  <p className="text-xs text-emerald-500">rendimento</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
