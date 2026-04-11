import { AlertTriangle, CheckCircle2, Info, Lightbulb } from 'lucide-react'
import { SpendingInsight } from '../../types/analytics'

const configs = {
  warning: {
    bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: <AlertTriangle size={15} className="text-red-500 shrink-0" />,
    titleColor: 'text-red-800 dark:text-red-300',
    textColor: 'text-red-700 dark:text-red-400',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />,
    titleColor: 'text-emerald-800 dark:text-emerald-300',
    textColor: 'text-emerald-700 dark:text-emerald-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: <Info size={15} className="text-blue-500 shrink-0" />,
    titleColor: 'text-blue-800 dark:text-blue-300',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  tip: {
    bg: 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800',
    icon: <Lightbulb size={15} className="text-violet-500 shrink-0" />,
    titleColor: 'text-violet-800 dark:text-violet-300',
    textColor: 'text-violet-700 dark:text-violet-400',
  },
}

export function InsightCard({ insight }: { insight: SpendingInsight }) {
  const c = configs[insight.type]
  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${c.bg}`}>
      <div className="mt-0.5">{c.icon}</div>
      <div>
        <p className={`text-sm font-semibold ${c.titleColor}`}>{insight.title}</p>
        <p className={`text-xs mt-0.5 leading-relaxed ${c.textColor}`}>{insight.description}</p>
      </div>
    </div>
  )
}
