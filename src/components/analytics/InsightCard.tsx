import { AlertTriangle, CheckCircle2, Info, Lightbulb, ChevronRight } from 'lucide-react'
import { SpendingInsight } from '../../types/analytics'
import { useState } from 'react'

const configs = {
  warning: {
    bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: <AlertTriangle size={15} className="text-red-500 shrink-0" />,
    titleColor: 'text-red-800 dark:text-red-300',
    textColor: 'text-red-700 dark:text-red-400',
    hintBg: 'bg-red-100/50 dark:bg-red-900/20',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />,
    titleColor: 'text-emerald-800 dark:text-emerald-300',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    hintBg: 'bg-emerald-100/50 dark:bg-emerald-900/20',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: <Info size={15} className="text-blue-500 shrink-0" />,
    titleColor: 'text-blue-800 dark:text-blue-300',
    textColor: 'text-blue-700 dark:text-blue-400',
    hintBg: 'bg-blue-100/50 dark:bg-blue-900/20',
  },
  tip: {
    bg: 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800',
    icon: <Lightbulb size={15} className="text-violet-500 shrink-0" />,
    titleColor: 'text-violet-800 dark:text-violet-300',
    textColor: 'text-violet-700 dark:text-violet-400',
    hintBg: 'bg-violet-100/50 dark:bg-violet-900/20',
  },
}

export function InsightCard({ insight, index = 0 }: { insight: SpendingInsight; index?: number }) {
  const c = configs[insight.type]
  const [showHint, setShowHint] = useState(false)

  return (
    <div
      className={`rounded-xl border p-3.5 flex flex-col gap-2 ${c.bg} animate-fade-in-up`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{c.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${c.titleColor}`}>{insight.title}</p>
          <p className={`text-xs mt-0.5 leading-relaxed ${c.textColor}`}>{insight.description}</p>
        </div>
        {insight.actionHint && (
          <button
            onClick={() => setShowHint(!showHint)}
            className={`shrink-0 p-1 rounded-full transition-transform cursor-pointer ${showHint ? 'rotate-90' : ''}`}
            title="Ver sugestão"
          >
            <ChevronRight size={14} className={c.textColor} />
          </button>
        )}
      </div>
      {insight.actionHint && showHint && (
        <div className={`rounded-lg px-3 py-2 ${c.hintBg} animate-fade-in-up`}>
          <p className={`text-xs leading-relaxed ${c.textColor}`}>
            💡 {insight.actionHint}
          </p>
        </div>
      )}
    </div>
  )
}
