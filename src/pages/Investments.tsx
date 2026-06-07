import { TrendingUp, Plus, Wallet, BarChart3, LineChart, PieChart } from 'lucide-react'
import { useInvestments } from '../hooks/useInvestments'
import { InvestmentsSummary } from '../components/investments/InvestmentsSummary'
import { RatesBanner } from '../components/investments/RatesBanner'
import { InvestmentCard } from '../components/investments/InvestmentCard'
import { InvestmentModal } from '../components/investments/InvestmentModal'
import { Button } from '../components/ui/Button'
import { getInvestmentMeta } from '../constants/investmentTypes'
import { Investment, InvestmentType } from '../types/investment'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatMonthKey(key: string) {
  const [y, m] = key.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[Number(m) - 1]}/${y}`
}

export function Investments() {
  const {
    investments, addInvestment, updateInvestment, deleteInvestment, currentMonthKey, transactions,
    modalOpen, setModalOpen, editingId, form, setForm, activeTab, setActiveTab, applyMsg, editingRates,
    setEditingRates, tempCdi, setTempCdi, tempIpca, setTempIpca, selicDisplay, rateMsg, cdiRate, ipcaRate,
    handleRefreshRates, handleApply, openNew, openEdit, handleTypeChange, saveRates, openEditRates,
  } = useInvestments()

  const appliedThisMonth = transactions.filter((t) => t.monthKey === currentMonthKey && t.tags?.includes('investment-yield'))

  const filteredInvestments = investments.filter((i) => {
    if (activeTab === 'all') return true
    const m = getInvestmentMeta(i.investmentType)
    return activeTab === 'fixed' ? m.yieldInputMode !== 'variable_income' : m.yieldInputMode === 'variable_income'
  })

  function handleSubmitForm() {
    const name = form.name.trim(), selectedMeta = getInvestmentMeta(form.investmentType)
    let principal = parseFloat(form.principal)
    const sharesNum = parseFloat(form.shares), avgPriceNum = parseFloat(form.averagePrice)
    if (selectedMeta.yieldInputMode === 'variable_income') principal = sharesNum * avgPriceNum

    const payload: Omit<Investment, 'id'> = {
      name: name || (form.ticker ? form.ticker.toUpperCase() : selectedMeta.label),
      principal, monthlyYieldPercent: parseFloat(form.monthlyYieldPercent) || 0,
      startMonth: form.startMonth, isActive: true, notes: form.notes.trim() || undefined,
      investmentType: form.investmentType as InvestmentType,
      cdiPercent: parseFloat(form.cdiPercent) || undefined, ipcaPercent: parseFloat(form.ipcaPercent) || undefined,
      ticker: form.ticker.toUpperCase().trim() || undefined, shares: sharesNum || undefined, averagePrice: avgPriceNum || undefined,
    }

    if (editingId) updateInvestment(editingId, payload); else addInvestment(payload)
    setModalOpen(false)
  }

  return (
    <div className="flex flex-col gap-8 w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-900/40 dark:to-cyan-900/30 flex items-center justify-center shadow-lg shadow-emerald-500/20"><TrendingUp size={28} className="text-emerald-600 dark:text-emerald-400" /></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-display font-sans">Investimentos</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie sua carteira de investimentos</p>
            </div>
          </div>
          <Button icon={<Plus size={18} />} onClick={openNew} className="shadow-lg shadow-indigo-500/20 px-6 py-3 text-sm">Novo Investimento</Button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/30 dark:border-white/5">
          {[
            { id: 'all', label: 'Tudo', icon: BarChart3 },
            { id: 'fixed', label: 'Renda Fixa', icon: LineChart },
            { id: 'variable', label: 'Renda Var.', icon: PieChart },
          ].map((tabItem) => {
            const Icon = tabItem.icon, isActive = activeTab === tabItem.id
            return (
              <button key={tabItem.id} onClick={() => setActiveTab(tabItem.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${isActive ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <Icon size={14} /> {tabItem.label}
              </button>
            )
          })}
        </div>
      </div>

      {applyMsg && <p className="text-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg px-4 py-2">{applyMsg}</p>}

      <RatesBanner
        cdiRate={cdiRate} ipcaRate={ipcaRate} selicDisplay={selicDisplay} editingRates={editingRates}
        tempCdi={tempCdi} tempIpca={tempIpca} ratesFetching={false} rateMsg={rateMsg}
        setTempCdi={setTempCdi} setTempIpca={setTempIpca} setEditingRates={setEditingRates}
        saveRates={saveRates} openEditRates={openEditRates} handleRefreshRates={handleRefreshRates}
      />

      <InvestmentsSummary investments={investments} />

      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={handleApply} className="text-xs h-9 px-3">Aplicar rendimentos — {formatMonthKey(currentMonthKey)}</Button>
      </div>

      {appliedThisMonth.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800 p-4">
          <div className="flex items-center gap-2 mb-2"><Wallet size={14} className="text-emerald-600" /><span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Rendimentos de {formatMonthKey(currentMonthKey)}</span></div>
          <div className="flex flex-col gap-1">
            {appliedThisMonth.map((t) => (
              <div key={t.id} className="flex justify-between text-sm"><span className="text-emerald-800 dark:text-emerald-200">{t.description}</span><span className="font-semibold text-emerald-700 dark:text-emerald-300">{fmt(t.amount)}</span></div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-1 mt-1 border-t border-emerald-200 dark:border-emerald-700">
              <span className="text-emerald-800 dark:text-emerald-200">Total</span>
              <span className="text-emerald-700 dark:text-emerald-300">{fmt(appliedThisMonth.reduce((s, t) => s + t.amount, 0))}</span>
            </div>
          </div>
        </div>
      )}

      {filteredInvestments.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{activeTab === 'all' ? 'Sua Carteira' : activeTab === 'fixed' ? 'Renda Fixa' : 'Renda Variável'}</h2>
            <span className="text-[10px] font-bold text-gray-400">{filteredInvestments.length} ATIVOS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInvestments.map((inv) => (
              <InvestmentCard key={inv.id} inv={inv} cdiRate={cdiRate} ipcaRate={ipcaRate} onUpdate={updateInvestment} onEdit={openEdit} onDelete={deleteInvestment} />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3">
          <BarChart3 size={32} className="text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum investimento encontrado nesta categoria.</p>
          <Button variant="secondary" size="sm" onClick={openNew}>Adicionar Primeiro</Button>
        </div>
      )}

      <InvestmentModal
        open={modalOpen} onClose={() => setModalOpen(false)} editingId={editingId} form={form}
        setForm={setForm} cdiRate={cdiRate} ipcaRate={ipcaRate} handleTypeChange={handleTypeChange} onSubmit={handleSubmitForm}
      />
    </div>
  )
}
