import { useState, useCallback } from 'react'
import { Lock, Unlock, Copy, Edit3, StickyNote, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useMonthData } from '../hooks/useMonthData'
import { SectionTable } from '../components/month/SectionTable'
import { ExtraordinarySection } from '../components/month/ExtraordinarySection'
import { BulkEditModal } from '../components/month/BulkEditModal'
import { CopyTransactionsModal } from '../components/month/CopyTransactionsModal'
import { CloseMonthModal } from '../components/month/CloseMonthModal'
import { Button } from '../components/ui/Button'
import { formatCurrency } from '../utils/currency'
import { getMonthLabel } from '../constants/months'
export function MonthView() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const updateMonthSettings = useFinanceStore((s) => s.updateMonthSettings)
  const monthSettings = useFinanceStore((s) => s.monthSettings)
  const { sections, income, totalExpenses, isClosed, extraordinaryIncome } = useMonthData(currentMonthKey)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income')

  const incomeSections = sections.filter(s => s.section === 'entradas')
  const expenseSections = sections.filter(s => s.section !== 'entradas')

  const currentNotes = monthSettings[currentMonthKey]?.notes ?? ''
  const currentHighlights = monthSettings[currentMonthKey]?.highlights ?? []
  const currentLessons = monthSettings[currentMonthKey]?.lessons ?? ''
  const currentSavingsGoal = monthSettings[currentMonthKey]?.savingsGoal
  const appSettings = useFinanceStore((s) => s.appSettings)
  const savingsGoalPercent = currentSavingsGoal ?? appSettings.defaultSavingsGoalPercent
  const totalIncome = income + extraordinaryIncome
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
  const hasNotes = currentNotes.length > 0 || currentHighlights.length > 0 || currentLessons.length > 0

  const handleNotesChange = useCallback((value: string) => {
    updateMonthSettings(currentMonthKey, { notes: value })
  }, [currentMonthKey, updateMonthSettings])

  const handleHighlightsChange = useCallback((value: string) => {
    updateMonthSettings(currentMonthKey, { highlights: value.split('\n').filter(h => h.trim()) })
  }, [currentMonthKey, updateMonthSettings])

  const handleLessonsChange = useCallback((value: string) => {
    updateMonthSettings(currentMonthKey, { lessons: value })
  }, [currentMonthKey, updateMonthSettings])

  const handleSavingsGoalChange = useCallback((value: string) => {
    const num = parseFloat(value)
    updateMonthSettings(currentMonthKey, { savingsGoal: isNaN(num) ? undefined : num })
  }, [currentMonthKey, updateMonthSettings])

  return (
    <div className="flex flex-col gap-6 -mx-4 px-4 -mt-4 pt-4 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="glass-card-lg px-4 py-2">
            <h1 className="text-2xl tracking-tight font-extrabold text-gray-900 dark:text-white">{getMonthLabel(currentMonthKey)}</h1>
          </div>
          {isClosed && (
            <span className="glass-card px-3 py-1 text-xs text-red-600 font-semibold flex items-center gap-1">
              <Lock size={12} /> Mês fechado
            </span>
          )}
        </div>
        <div className="flex gap-2 glass-card p-1.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy size={13} />}
            onClick={() => setCopyOpen(true)}
            disabled={isClosed}
          >
            Copiar
          </Button>
          <Button
            variant={isClosed ? 'secondary' : 'danger'}
            size="sm"
            icon={isClosed ? <Unlock size={13} /> : <Lock size={13} />}
            onClick={() => setCloseOpen(true)}
          >
            {isClosed ? 'Reabrir' : 'Fechar'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<StickyNote size={13} />}
            onClick={() => setNotesOpen(!notesOpen)}
            className={hasNotes ? 'ring-2 ring-amber-400/50' : ''}
          >
            Notas
            {hasNotes && <span className="ml-1 w-2 h-2 rounded-full bg-amber-500" />}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Edit3 size={13} />}
            onClick={() => setBulkOpen(true)}
          >
            Editar
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="glass-panel-lg p-6 z-20">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Receita</p>
            <p className="text-xl font-extrabold text-glow-positive">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Despesas</p>
            <p className="text-xl font-extrabold text-glow-negative">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Balanço</p>
            <p className={`text-2xl font-extrabold ${(totalIncome - totalExpenses) >= 0 ? 'text-glow-neutral' : 'text-glow-negative'}`}>
              {formatCurrency(totalIncome - totalExpenses)}
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Taxa de Poupança</p>
            <p className={`text-xl font-extrabold ${savingsRate >= savingsGoalPercent ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {savingsRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">meta: {savingsGoalPercent}%</p>
          </div>
        </div>
      </div>

      {/* Month notes & savings goal */}
      {notesOpen && (
        <div className="glass-panel-lg p-5 animate-slide-up">
          <div className="flex flex-wrap gap-6">
            <div className="flex-1 min-w-[250px]">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                <StickyNote size={14} /> Notas do mês
              </label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={3}
                placeholder="Observações sobre este mês..."
                value={currentNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                <span className="text-amber-500">★</span> Destaques do mês
              </label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={3}
                placeholder="O que foi bom este mês? (um item por linha)"
                value={currentHighlights.join('\n')}
                onChange={(e) => handleHighlightsChange(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                <span className="text-indigo-500">💡</span> Lições aprendidas
              </label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={3}
                placeholder="O que você aprendeu este mês?"
                value={currentLessons}
                onChange={(e) => handleLessonsChange(e.target.value)}
              />
            </div>
            <div className="w-40">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                <Target size={14} /> Meta (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all"
                placeholder={String(appSettings.defaultSavingsGoalPercent)}
                value={currentSavingsGoal ?? ''}
                onChange={(e) => handleSavingsGoalChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="glass-card-lg p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'income'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <TrendingUp size={16} />
          Receitas
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'expenses'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <TrendingDown size={16} />
          Despesas
        </button>
      </div>

      <BulkEditModal open={bulkOpen} onClose={() => setBulkOpen(false)} monthKey={currentMonthKey} />
      <CopyTransactionsModal open={copyOpen} onClose={() => setCopyOpen(false)} monthKey={currentMonthKey} />
      <CloseMonthModal open={closeOpen} onClose={() => setCloseOpen(false)} monthKey={currentMonthKey} isClosed={isClosed} />

      {/* Section tables */}
      <div className="flex flex-col gap-4 pb-8">
        {activeTab === 'income' ? (
          <>
            {incomeSections.map((section) => (
              <SectionTable
                key={section.section}
                summary={section}
                monthKey={currentMonthKey}
                disabled={isClosed}
                defaultOpen={section.transactions.length > 0}
              />
            ))}
            <ExtraordinarySection monthKey={currentMonthKey} disabled={isClosed} />
          </>
        ) : (
          expenseSections.map((section) => (
            <SectionTable
              key={section.section}
              summary={section}
              monthKey={currentMonthKey}
              disabled={isClosed}
              defaultOpen={section.transactions.length > 0}
            />
          ))
        )}
      </div>
    </div>
  )
}
