import { TrendingUp, Briefcase, Building2, Heart, Users, CheckCircle2 } from 'lucide-react'

interface IRChecklistProps {
  checklistProgress: Set<number>
  toggleChecklist: (id: number) => void
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card-lg p-5 ${className}`}>
      {children}
    </div>
  )
}

export function IRChecklist({ checklistProgress, toggleChecklist }: IRChecklistProps) {
  const checklistItems = [
    { id: 1, text: 'Informe de Rendimentos (IRPF) do meu emprego', category: 'rendimentos' },
    { id: 2, text: 'Extratos bancários', category: 'bens' },
    { id: 3, text: 'Informe de Rendimentos de investimentos', category: 'investimentos' },
    { id: 4, text: 'Extrato do FGTS', category: 'bens' },
    { id: 5, text: 'INSS - Extrato de contribuições', category: 'rendimentos' },
    { id: 6, text: 'Recibo de despesas médicas', category: 'deducoes' },
    { id: 7, text: 'Recibo de plano de saúde', category: 'deducoes' },
    { id: 8, text: 'Despesas com educação', category: 'deducoes' },
    { id: 9, text: 'Recibo de dízimos', category: 'deducoes' },
    { id: 10, text: 'CPF dos dependentes', category: 'familia' },
  ]

  const checklistByCategory = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof checklistItems>)

  const progressPercent = Math.round((checklistProgress.size / checklistItems.length) * 100)

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Checklist de Documentos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Seus dados já foram mapeados automaticamente!</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">{progressPercent}%</p>
            <p className="text-xs text-gray-400">{checklistProgress.size}/{checklistItems.length}</p>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(checklistByCategory).map(([category, items]) => (
          <GlassCard key={category}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 capitalize flex items-center gap-2">
              {category === 'rendimentos' && <TrendingUp size={16} className="text-indigo-500" />}
              {category === 'investimentos' && <Briefcase size={16} className="text-emerald-500" />}
              {category === 'bens' && <Building2 size={16} className="text-purple-500" />}
              {category === 'deducoes' && <Heart size={16} className="text-pink-500" />}
              {category === 'familia' && <Users size={16} className="text-amber-500" />}
              {category}
            </h3>
            <div className="space-y-2">
              {items.map((item) => {
                const checked = checklistProgress.has(item.id)
                return (
                  <div key={item.id} onClick={() => toggleChecklist(item.id)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${checked ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${checked ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'}`}>
                      {checked && <CheckCircle2 size={12} />}
                    </div>
                    <span className={`text-sm ${checked ? 'text-emerald-700 line-through' : 'text-gray-600'}`}>{item.text}</span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
