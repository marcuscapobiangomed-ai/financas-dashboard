import { useState } from 'react'
import { Lock, Unlock, Copy, Edit3, StickyNote, Target, TrendingUp, TrendingDown, CreditCard } from 'lucide-react'
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
    incomeSections, currentNotes, currentHighlights, currentLessons,
    currentSavingsGoal, savingsGoalPercent, totalIncome, totalExpenses,
    hasNotes, handleNotesChange, handleHighlightsChange, handleLessonsChange, handleSavingsGoalChange, appSettings,
    accumulatedBalance, carryoverBalance, cashExpenseSections, cardExpenseSections
  } = useMonthView()

  const [deductPaidByOthers, setDeductPaidByOthers] = useState(() => {
    return localStorage.getItem('deductPaidByOthers') === 'true'
  })

  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  const transactions = useFinanceStore((s) => s.transactions)
  const cardIds = appSettings.cardSections?.map((c: any) => c.id) ?? []

  const paidByOthersAmount = cashExpenseSections.concat(cardExpenseSections).reduce((sum, section) => {
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
    <div className="flex flex-col lg:flex-row gap-6 -mx-4 px-4 -mt-4 pt-4 min-h-screen">
      {/* Coluna Esquerda: Controle, Resumo e Faturas */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-6">
        {/* Header & Controls */}
        <div className="glass-panel-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl tracking-tight font-extrabold text-gray-900 dark:text-white">
              {getMonthLabel(currentMonthKey)}
            </h1>
            {isClosed && (
              <span className="glass-card px-2.5 py-0.5 text-[10px] text-red-600 font-bold flex items-center gap-1">
                <Lock size={10} /> Mês fechado
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" className="w-full" icon={<Copy size={12} />} onClick={() => setCopyOpen(true)} disabled={isClosed}>Copiar</Button>
            <Button variant={isClosed ? 'secondary' : 'danger'} size="sm" className="w-full" icon={isClosed ? <Unlock size={12} /> : <Lock size={12} />} onClick={() => setCloseOpen(true)}>{isClosed ? 'Reabrir' : 'Fechar'}</Button>
            <Button variant="secondary" size="sm" icon={<StickyNote size={12} />} onClick={() => setNotesOpen(!notesOpen)} className={`col-span-2 w-full ${hasNotes ? 'ring-2 ring-amber-400/50' : ''}`}>
              Notas {hasNotes && <span className="ml-1 w-2 h-2 rounded-full bg-amber-500 inline-block" />}
            </Button>
            <Button variant="secondary" size="sm" className="col-span-2 w-full" icon={<Edit3 size={12} />} onClick={() => setBulkOpen(true)} disabled={isClosed}>Edição Rápida</Button>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="glass-panel-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-gray-100/50 dark:border-gray-800/40">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resumo Financeiro</p>
            {paidByOthersAmount > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-1 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 transition-all hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40">
                <input
                  type="checkbox"
                  checked={deductPaidByOthers}
                  onChange={(e) => handleDeductToggle(e.target.checked)}
                  className="w-3 h-3 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Abater terceiros
              </label>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3 text-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Receita</p>
              <p className="text-sm font-extrabold text-glow-positive">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Despesas</p>
              <p className="text-sm font-extrabold text-glow-negative">{formatCurrency(displayedExpenses)}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Balanço</p>
              <p className={`text-sm font-extrabold ${displayedBalance >= 0 ? 'text-glow-neutral' : 'text-glow-negative'}`}>{formatCurrency(displayedBalance)}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Poupança</p>
              <p className={`text-sm font-extrabold ${displayedSavingsRate >= savingsGoalPercent ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{displayedSavingsRate.toFixed(1)}%</p>
            </div>
            <div className="glass-card p-3 text-center col-span-2">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Acumulado</p>
              <p className={`text-base font-extrabold ${displayedAccumulated >= 0 ? 'text-glow-positive' : 'text-glow-negative'}`}>{formatCurrency(displayedAccumulated)}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">anterior: {formatCurrency(carryoverBalance)}</p>
            </div>
          </div>
        </div>

        {/* Contas & Faturas */}
        <CardCashFlowPanel monthKey={currentMonthKey} />

        {/* Month notes & savings goal */}
        {notesOpen && (
          <div className="glass-panel-lg p-5 flex flex-col gap-4 animate-slide-up">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"><StickyNote size={12} /> Notas do mês</label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={2} placeholder="Observações..." value={currentNotes} onChange={(e) => handleNotesChange(e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"><span className="text-amber-500">★</span> Destaques</label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={2} placeholder="Um por linha..." value={currentHighlights.join('\n')} onChange={(e) => handleHighlightsChange(e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">💡 Lições aprendidas</label>
              <textarea
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none transition-all"
                rows={2} placeholder="O que você aprendeu..." value={currentLessons} onChange={(e) => handleLessonsChange(e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"><Target size={12} /> Meta (%)</label>
              <input
                type="number" min="0" max="100" step="1"
                className="w-full border border-white/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all"
                placeholder={String(appSettings.defaultSavingsGoalPercent)} value={currentSavingsGoal ?? ''} onChange={(e) => handleSavingsGoalChange(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Coluna Direita: Lançamentos e Tabelas */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Tabs */}
        <div className="glass-card-lg p-1 flex gap-1">
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'income' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <TrendingUp size={16} /> Receitas
          </button>
          <button
            onClick={() => setActiveTab('expenses_cash')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'expenses_cash' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <TrendingDown size={16} /> Despesas Caixa
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'cards' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <CreditCard size={16} /> Cartões
          </button>
        </div>

        <BulkEditModal open={bulkOpen} onClose={() => setBulkOpen(false)} monthKey={currentMonthKey} />
        <CopyTransactionsModal open={copyOpen} onClose={() => setCopyOpen(false)} monthKey={currentMonthKey} />
        <CloseMonthModal open={closeOpen} onClose={() => setCloseOpen(false)} monthKey={currentMonthKey} isClosed={isClosed} />

        {/* Section tables */}
        <div className="flex flex-col gap-4 pb-8">
          {activeTab === 'income' && (
            <>
              <PendingSection monthKey={currentMonthKey} disabled={isClosed} type="income" />
              {incomeSections.map((section) => (
                <SectionTable key={section.section} summary={section} monthKey={currentMonthKey} disabled={isClosed} defaultOpen={section.transactions.length > 0} />
              ))}
              <ExtraordinarySection monthKey={currentMonthKey} disabled={isClosed} />
            </>
          )}

          {activeTab === 'expenses_cash' && (
            <>
              <PendingSection monthKey={currentMonthKey} disabled={isClosed} type="expense" />
              {cashExpenseSections.map((section) => (
                <SectionTable key={section.section} summary={section} monthKey={currentMonthKey} disabled={isClosed} defaultOpen={section.transactions.length > 0} />
              ))}
            </>
          )}

          {activeTab === 'cards' && (
            <>
              {cardExpenseSections.length === 0 ? (
                <div className="glass-panel-lg p-8 text-center text-gray-500 dark:text-gray-400 text-sm font-semibold">
                  Nenhum cartão cadastrado. Adicione cartões nas configurações.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Secondary card selector */}
                  <div className="flex flex-wrap gap-2">
                    {cardExpenseSections.map((card) => {
                      const cardMeta = appSettings.cardSections?.find((c: any) => c.id === card.section)
                      const isSelected = (activeCardId || cardExpenseSections[0]?.section) === card.section
                      return (
                        <button
                          key={card.section}
                          onClick={() => setActiveCardId(card.section)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                              : 'bg-white/40 dark:bg-gray-800/40 border-gray-200/50 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60'
                          }`}
                        >
                          {cardMeta?.label || card.label}
                        </button>
                      )
                    })}
                  </div>
                  {/* Selected Card Section Table */}
                  {(() => {
                    const currentSelectedId = activeCardId || cardExpenseSections[0]?.section
                    const currentCardSection = cardExpenseSections.find(s => s.section === currentSelectedId)
                    if (!currentCardSection) return null
                    return (
                      <SectionTable
                        key={currentCardSection.section}
                        summary={currentCardSection}
                        monthKey={currentMonthKey}
                        disabled={isClosed}
                        defaultOpen={true}
                      />
                    )
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
