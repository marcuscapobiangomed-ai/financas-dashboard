import { useState } from 'react'
import { Lock, Unlock, Copy, Edit3, StickyNote, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { useMonthView } from '../hooks/useMonthView'
import { SectionTable } from '../components/month/SectionTable'
import { ExtraordinarySection } from '../components/month/ExtraordinarySection'
import { PendingSection } from '../components/month/PendingSection'
import { BulkEditModal } from '../components/month/BulkEditModal'
import { CopyTransactionsModal } from '../components/month/CopyTransactionsModal'
import { CloseMonthModal } from '../components/month/CloseMonthModal'
import { CardCashFlowPanel } from '../components/dashboard/CardCashFlowPanel'
import { Button } from '../components/ui/Button'
import { formatCurrency } from '../utils/currency'
import { getMonthLabel } from '../constants/months'
import { useFinanceStore } from '../store/useFinanceStore'
import { isCardBillPaid } from '../utils/calculations'

export function MonthView() {
  const {
    currentMonthKey, isClosed, bulkOpen, setBulkOpen, notesOpen, setNotesOpen,
    copyOpen, setCopyOpen, closeOpen, setCloseOpen, activeTab, setActiveTab,
    incomeSections, expenseSections, currentNotes, currentHighlights, currentLessons,
    currentSavingsGoal, savingsGoalPercent, totalIncome, totalExpenses, savingsRate,
    hasNotes, handleNotesChange, handleHighlightsChange, handleLessonsChange, handleSavingsGoalChange, appSettings,
    accumulatedBalance, carryoverBalance
  } = useMonthView()

  const [deductPaidByOthers, setDeductPaidByOthers] = useState(() => {
    return localStorage.getItem('deductPaidByOthers') === 'true'
  })

  const transactions = useFinanceStore((s) => s.transactions)
  const cardIds = appSettings.cardSections?.map((c: any) => c.id) ?? []

  const paidByOthersAmount = expenseSections.reduce((sum, section) => {
    const isCard = cardIds.includes(section.section)
    if (isCard) {
      if (!isCardBillPaid(transactions, section.section, currentMonthKey)) return sum
    }
    const sectionPaidByOthers = section.transactions
      .filter((t) => t.paidByOther === true && (isCard || t.isPaid !== false))
      .reduce((s, t) => s + t.amount, 0)
    return sum + sectionPaidByOthers
  }, 0)

  const handleDeductToggle = (val: boolean) => {
    setDeductPaidByOthers(val)
    localStorage.setItem('deductPaidByOthers', String(val))
  }

  const displayedExpenses = deductPaidByOthers ? Math.max(0, totalExpenses - paidByOthersAmount) : totalExpenses
  const displayedBalance = totalIncome - displayedExpenses
  const displayedSavingsRate = totalIncome > 0 ? ((totalIncome - displayedExpenses) / totalIncome) * 100 : 0
  const displayedAccumulated = accumulatedBalance + (deductPaidByOthers ? paidByOthersAmount : 0)

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
          <Button variant="secondary" size="sm" icon={<Copy size={13} />} onClick={() => setCopyOpen(true)} disabled={isClosed}>Copiar</Button>
          <Button variant={isClosed ? 'secondary' : 'danger'} size="sm" icon={isClosed ? <Unlock size={13} /> : <Lock size={13} />} onClick={() => setCloseOpen(true)}>{isClosed ? 'Reabrir' : 'Fechar'}</Button>
          <Button variant="secondary" size="sm" icon={<StickyNote size={13} />} onClick={() => setNotesOpen(!notesOpen)} className={hasNotes ? 'ring-2 ring-amber-400/50' : ''}>
            Notas {hasNotes && <span className="ml-1 w-2 h-2 rounded-full bg-amber-500" />}
          </Button>
          <Button variant="secondary" size="sm" icon={<Edit3 size={13} />} onClick={() => setBulkOpen(true)} disabled={isClosed}>Editar</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="glass-panel-lg p-6 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-gray-100/50 dark:border-gray-800/40">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resumo Financeiro</p>
          {paidByOthersAmount > 0 && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 transition-all hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40">
              <input
                type="checkbox"
                checked={deductPaidByOthers}
                onChange={(e) => handleDeductToggle(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              Abater despesas pagas por terceiros ({formatCurrency(paidByOthersAmount)})
            </label>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Receita</p>
            <p className="text-xl font-extrabold text-glow-positive">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="glass-card p-4 text-center flex flex-col justify-between min-h-[96px]">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Despesas</p>
              <p className="text-xl font-extrabold text-glow-negative">{formatCurrency(displayedExpenses)}</p>
            </div>
            {deductPaidByOthers && paidByOthersAmount > 0 && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Original: {formatCurrency(totalExpenses)}
              </p>
            )}
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Balanço</p>
            <p className={`text-2xl font-extrabold ${displayedBalance >= 0 ? 'text-glow-neutral' : 'text-glow-negative'}`}>{formatCurrency(displayedBalance)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Taxa de Poupança</p>
            <p className={`text-xl font-extrabold ${displayedSavingsRate >= savingsGoalPercent ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{displayedSavingsRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">meta: {savingsGoalPercent}%</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-2">Acumulado</p>
            <p className={`text-2xl font-extrabold ${displayedAccumulated >= 0 ? 'text-glow-positive' : 'text-glow-negative'}`}>{formatCurrency(displayedAccumulated)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              anterior: {formatCurrency(carryoverBalance)}
            </p>
          </div>
        </div>
      </div>

      <CardCashFlowPanel monthKey={currentMonthKey} />

      {/* Month notes & savings goal */}
      {notesOpen && (
        <div className="glass-panel-lg p-5 animate-slide-up">
          <div className="flex flex-wrap gap-6">
            <div className="flex-1 min-w-[250px]">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"><StickyNote size={14} /> Notas do mês</label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={3} placeholder="Observações sobre este mês..." value={currentNotes} onChange={(e) => handleNotesChange(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"><span className="text-amber-500">★</span> Destaques do mês</label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={3} placeholder="O que foi bom este mês? (um item por linha)" value={currentHighlights.join('\n')} onChange={(e) => handleHighlightsChange(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"><span className="text-indigo-500">💡</span> Lições aprendidas</label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={3} placeholder="O que você aprendeu este mês?" value={currentLessons} onChange={(e) => handleLessonsChange(e.target.value)}
              />
            </div>
            <div className="w-40">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"><Target size={14} /> Meta (%)</label>
              <input
                type="number" min="0" max="100" step="1"
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all"
                placeholder={String(appSettings.defaultSavingsGoalPercent)} value={currentSavingsGoal ?? ''} onChange={(e) => handleSavingsGoalChange(e.target.value)}
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
            activeTab === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <TrendingUp size={16} /> Receitas
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'expenses' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <TrendingDown size={16} /> Despesas
        </button>
      </div>

      <BulkEditModal open={bulkOpen} onClose={() => setBulkOpen(false)} monthKey={currentMonthKey} />
      <CopyTransactionsModal open={copyOpen} onClose={() => setCopyOpen(false)} monthKey={currentMonthKey} />
      <CloseMonthModal open={closeOpen} onClose={() => setCloseOpen(false)} monthKey={currentMonthKey} isClosed={isClosed} />

      {/* Section tables */}
      <div className="flex flex-col gap-4 pb-8">
        {activeTab === 'income' ? (
          <>
            <PendingSection monthKey={currentMonthKey} disabled={isClosed} type="income" />
            {incomeSections.map((section) => (
              <SectionTable key={section.section} summary={section} monthKey={currentMonthKey} disabled={isClosed} defaultOpen={section.transactions.length > 0} />
            ))}
            <ExtraordinarySection monthKey={currentMonthKey} disabled={isClosed} />
          </>
        ) : (
          <>
            <PendingSection monthKey={currentMonthKey} disabled={isClosed} type="expense" />
            {expenseSections.map((section) => (
              <SectionTable key={section.section} summary={section} monthKey={currentMonthKey} disabled={isClosed} defaultOpen={section.transactions.length > 0} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
