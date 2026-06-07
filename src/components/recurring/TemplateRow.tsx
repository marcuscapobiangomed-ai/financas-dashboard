import { CheckCircle2, Pause, Play, Pencil, Trash2 } from 'lucide-react'
import { RecurringTemplate, Transaction } from '../../types/transaction'
import { CATEGORY_META } from '../../types/category'

interface TemplateRowProps {
  t: RecurringTemplate
  currentMonthKey: string
  transactions: Transaction[]
  sectionLabels: Record<string, string>
  monthsDiff: (from: string, to: string) => number
  formatMonthKey: (key: string) => string
  handleToggle: (t: RecurringTemplate) => void
  openEdit: (t: RecurringTemplate) => void
  handleDelete: (id: string, description: string) => void
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function TemplateRow({
  t,
  currentMonthKey,
  transactions,
  sectionLabels,
  monthsDiff,
  formatMonthKey,
  handleToggle,
  openEdit,
  handleDelete,
}: TemplateRowProps) {
  const meta = CATEGORY_META[t.category]
  
  function getInstallmentProgress() {
    if (!t.installmentTotal) return { current: 0, total: 0, done: false }
    const current = monthsDiff(t.startMonth, currentMonthKey) + 1
    const clamped = Math.max(1, Math.min(current, t.installmentTotal))
    return { current: clamped, total: t.installmentTotal, done: current > t.installmentTotal }
  }

  const prog = getInstallmentProgress()
  const alreadyApplied = transactions.some(
    (tx) => tx.monthKey === currentMonthKey && tx.recurringId === t.id
  )

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${t.isActive ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-700 opacity-60'}`}>
      {/* category dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: meta.color }}
      />

      {/* info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{t.description}</span>
          {prog.done && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
              <CheckCircle2 size={10} /> Concluída
            </span>
          )}
          {alreadyApplied && (
            <span className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full">
              Aplicado {formatMonthKey(currentMonthKey)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">{sectionLabels[t.section] ?? t.section}</span>
          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
          <span className="text-xs" style={{ color: meta.color }}>{meta.label}</span>
          {t.installmentTotal && (
            <>
              <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {prog.current}/{t.installmentTotal} parcelas
              </span>
            </>
          )}
          {!t.installmentTotal && t.endMonth && (
            <>
              <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">até {formatMonthKey(t.endMonth)}</span>
            </>
          )}
        </div>
      </div>

      {/* amount */}
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 shrink-0">{fmt(t.amount)}</span>

      {/* actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => handleToggle(t)}
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors"
          title={t.isActive ? 'Pausar' : 'Ativar'}
        >
          {t.isActive ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          onClick={() => openEdit(t)}
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => handleDelete(t.id, t.description)}
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
