import { useState, useEffect } from 'react'
import { TrendingUp, Plus, Pencil, Trash2, Play, Pause, Wallet, ShieldCheck, Settings2, RefreshCw, BarChart3, LineChart, PieChart } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Investment, InvestmentType } from '../types/investment'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { INVESTMENT_TYPES, getInvestmentMeta } from '../constants/investmentTypes'
import {
  computeProjection,
  daysSinceStartMonth,
  netYieldAfterIR,
  getEffectiveAnnualRate,
  effectiveAnnualRate,
  effectiveAnnualRateIPCA,
  poupancaAnnualRate,
} from '../utils/investmentCalc'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatMonthKey(key: string) {
  const [y, m] = key.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[Number(m) - 1]}/${y}`
}

function getCurrentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface FormState {
  investmentType: InvestmentType
  name: string
  principal: string
  cdiPercent: string
  ipcaPercent: string
  monthlyYieldPercent: string
  startMonth: string
  notes: string
  // Variable income
  ticker: string
  shares: string
  averagePrice: string
}

function blankForm(): FormState {
  return {
    investmentType: 'cdb',
    name: '',
    principal: '',
    cdiPercent: '100',
    ipcaPercent: '',
    monthlyYieldPercent: '',
    startMonth: getCurrentMonthKey(),
    notes: '',
    ticker: '',
    shares: '',
    averagePrice: '',
  }
}

export function Investments() {
  const investments = useFinanceStore((s) => s.investments)
  const addInvestment = useFinanceStore((s) => s.addInvestment)
  const updateInvestment = useFinanceStore((s) => s.updateInvestment)
  const deleteInvestment = useFinanceStore((s) => s.deleteInvestment)
  const applyInvestmentYieldsToMonth = useFinanceStore((s) => s.applyInvestmentYieldsToMonth)
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const transactions = useFinanceStore((s) => s.transactions)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const updateAppSettings = useFinanceStore((s) => s.updateAppSettings)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(blankForm())
  const [activeTab, setActiveTab] = useState<'all' | 'fixed' | 'variable' | string>('all')
  const [applyMsg, setApplyMsg] = useState('')
  const fetchLatestRates = useFinanceStore((s) => s.fetchLatestRates)
  const ratesFetching = useFinanceStore((s) => s.ratesFetching)
  const [editingRates, setEditingRates] = useState(false)
  const [tempCdi, setTempCdi] = useState('')
  const [tempIpca, setTempIpca] = useState('')
  const [selicDisplay, setSelicDisplay] = useState<number | null>(null)
  const [rateMsg, setRateMsg] = useState('')

  const cdiRate = appSettings.cdiRateAnnual ?? 14.15
  const ipcaRate = appSettings.ipcaRateAnnual ?? 5.0

  // Auto-fetch rates if stale (>24h)
  useEffect(() => {
    const last = appSettings.ratesLastUpdated
    if (!last || Date.now() - new Date(last).getTime() > 24 * 60 * 60 * 1000) {
      fetchLatestRates().then((r) => {
        if (r?.selic) setSelicDisplay(r.selic)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefreshRates() {
    const r = await fetchLatestRates()
    if (r) {
      setRateMsg('Taxas atualizadas via Banco Central!')
      if (r.selic) setSelicDisplay(r.selic)
      setTimeout(() => setRateMsg(''), 3000)
    } else {
      setRateMsg('Erro ao buscar taxas do BCB.')
      setTimeout(() => setRateMsg(''), 3000)
    }
  }

  // ── portfolio summary ───────────────────────────────────────────────────────

  const activeInvestments = investments.filter((i) => i.isActive)
  const totalPrincipal = activeInvestments.reduce((s, i) => s + i.principal, 0)
  
  const fixedInvestments = activeInvestments.filter(i => {
    const m = getInvestmentMeta(i.investmentType)
    return m.yieldInputMode !== 'variable_income'
  })
  const variableInvestments = activeInvestments.filter(i => {
    const m = getInvestmentMeta(i.investmentType)
    return m.yieldInputMode === 'variable_income'
  })

  const totalFixed = fixedInvestments.reduce((s, i) => s + i.principal, 0)
  const totalVariable = variableInvestments.reduce((s, i) => s + i.principal, 0)

  const totalMonthlyYieldGross = activeInvestments.reduce(
    (s, i) => s + (i.principal * i.monthlyYieldPercent / 100), 0
  )

  const totalMonthlyTax = activeInvestments.reduce((s, i) => {
    const meta = getInvestmentMeta(i.investmentType)
    if (meta.yieldInputMode === 'variable_income') return s // Simplified: no automatic tax for variable here
    const monthlyAmt = i.principal * i.monthlyYieldPercent / 100
    const days = daysSinceStartMonth(i.startMonth)
    const { taxAmount } = netYieldAfterIR(monthlyAmt, days, meta.isTaxExempt)
    return s + taxAmount
  }, 0)
  const totalMonthlyNet = totalMonthlyYieldGross - totalMonthlyTax

  // ── applied yields this month ───────────────────────────────────────────────

  const appliedThisMonth = transactions.filter(
    (t) => t.monthKey === currentMonthKey && t.tags?.includes('investment-yield')
  )

  const filteredInvestments = investments.filter(i => {
    if (activeTab === 'all') return true
    const m = getInvestmentMeta(i.investmentType)
    if (activeTab === 'fixed') return m.yieldInputMode !== 'variable_income'
    if (activeTab === 'variable') return m.yieldInputMode === 'variable_income'
    return true
  })

  // ── form helpers ──────────────────────────────────────────────────────────────

  const selectedMeta = getInvestmentMeta(form.investmentType)

  function getFormPreview() {
    let principal = parseFloat(form.principal) || 0
    
    if (selectedMeta.yieldInputMode === 'variable_income') {
      const sh = parseFloat(form.shares) || 0
      const pr = parseFloat(form.averagePrice) || 0
      principal = sh * pr
    }

    if (principal <= 0) return null

    let annualRate = 0
    if (selectedMeta.yieldInputMode === 'cdi_percent') {
      if (form.investmentType === 'poupanca') {
        annualRate = poupancaAnnualRate(cdiRate)
      } else {
        const cdiPct = parseFloat(form.cdiPercent) || 0
        if (cdiPct <= 0) return null
        annualRate = effectiveAnnualRate(cdiPct, cdiRate)
      }
    } else if (selectedMeta.yieldInputMode === 'ipca_plus') {
      const spread = parseFloat(form.ipcaPercent) || 0
      annualRate = effectiveAnnualRateIPCA(spread, ipcaRate)
    } else if (selectedMeta.yieldInputMode === 'variable_income') {
      const m = parseFloat(form.monthlyYieldPercent) || 0
      annualRate = m * 12
    } else {
      const m = parseFloat(form.monthlyYieldPercent) || 0
      if (m <= 0) return null
      annualRate = m * 12
    }

    return computeProjection(principal, annualRate)
  }

  const preview = getFormPreview()

  function openNew() {
    setEditingId(null)
    setForm(blankForm())
    setModalOpen(true)
  }

  function openEdit(inv: Investment) {
    setEditingId(inv.id)
    setForm({
      investmentType: inv.investmentType ?? 'manual',
      name: inv.name,
      principal: String(inv.principal),
      cdiPercent: inv.cdiPercent != null ? String(inv.cdiPercent) : '100',
      ipcaPercent: inv.ipcaPercent != null ? String(inv.ipcaPercent) : '',
      monthlyYieldPercent: String(inv.monthlyYieldPercent),
      startMonth: inv.startMonth,
      notes: inv.notes ?? '',
      ticker: inv.ticker ?? '',
      shares: inv.shares != null ? String(inv.shares) : '',
      averagePrice: inv.averagePrice != null ? String(inv.averagePrice) : '',
    })
    setModalOpen(true)
  }

  function handleTypeChange(type: InvestmentType) {
    const meta = getInvestmentMeta(type)
    setForm((f) => ({
      ...f,
      investmentType: type,
      name: f.name || meta.label,
      cdiPercent: type === 'poupanca' ? '' : f.cdiPercent || '100',
      ipcaPercent: f.ipcaPercent,
      monthlyYieldPercent: f.monthlyYieldPercent,
      ticker: meta.yieldInputMode === 'variable_income' ? f.ticker : '',
      shares: meta.yieldInputMode === 'variable_income' ? f.shares : '',
      averagePrice: meta.yieldInputMode === 'variable_income' ? f.averagePrice : '',
    }))
  }

  function handleSubmit() {
    const name = form.name.trim()
    
    let principal = parseFloat(form.principal)
    const sharesNum = parseFloat(form.shares)
    const avgPriceNum = parseFloat(form.averagePrice)

    if (selectedMeta.yieldInputMode === 'variable_income') {
      if (isNaN(sharesNum) || isNaN(avgPriceNum) || sharesNum <= 0 || avgPriceNum <= 0) return
      principal = sharesNum * avgPriceNum
    } else {
      if (isNaN(principal) || principal <= 0) return
    }

    const cdiPct = parseFloat(form.cdiPercent) || undefined
    const ipcaPct = parseFloat(form.ipcaPercent) || undefined
    const manualYield = parseFloat(form.monthlyYieldPercent) || 0

    if (form.investmentType === 'manual' && manualYield <= 0) return
    if (selectedMeta.yieldInputMode === 'cdi_percent' && form.investmentType !== 'poupanca' && (!cdiPct || cdiPct <= 0)) return

    const payload: Omit<Investment, 'id'> = {
      name: name || (form.ticker ? form.ticker.toUpperCase() : selectedMeta.label),
      principal,
      monthlyYieldPercent: manualYield,
      startMonth: form.startMonth,
      isActive: true,
      notes: form.notes.trim() || undefined,
      investmentType: form.investmentType as InvestmentType,
      cdiPercent: cdiPct,
      ipcaPercent: ipcaPct,
      ticker: form.ticker.toUpperCase().trim() || undefined,
      shares: sharesNum || undefined,
      averagePrice: avgPriceNum || undefined,
    }

    if (editingId) {
      updateInvestment(editingId, payload)
    } else {
      addInvestment(payload)
    }
    setModalOpen(false)
  }

  function handleApply() {
    const count = applyInvestmentYieldsToMonth(currentMonthKey)
    setApplyMsg(
      count > 0
        ? `${count} rendimento(s) aplicados em ${formatMonthKey(currentMonthKey)}.`
        : 'Rendimentos já aplicados ou nenhum investimento ativo.'
    )
    setTimeout(() => setApplyMsg(''), 4000)
  }

  function openEditRates() {
    setTempCdi(String(cdiRate))
    setTempIpca(String(ipcaRate))
    setEditingRates(true)
  }

  function saveRates() {
    const newCdi = parseFloat(tempCdi)
    const newIpca = parseFloat(tempIpca)
    if (!isNaN(newCdi) && newCdi > 0) updateAppSettings({ cdiRateAnnual: newCdi })
    if (!isNaN(newIpca) && newIpca >= 0) updateAppSettings({ ipcaRateAnnual: newIpca })
    setEditingRates(false)
  }

  // ── card display helpers ──────────────────────────────────────────────────────

  function getInvProjection(inv: Investment) {
    const annual = getEffectiveAnnualRate(
      inv.investmentType, inv.cdiPercent, inv.ipcaPercent,
      cdiRate, ipcaRate, inv.monthlyYieldPercent
    )
    return computeProjection(inv.principal, annual)
  }

  function getInvRateLabel(inv: Investment) {
    const type = inv.investmentType ?? 'manual'
    if (type === 'poupanca') return 'Poupança'
    if (type === 'tesouro_ipca') return `IPCA + ${inv.ipcaPercent ?? 0}%`
    if (type !== 'manual' && inv.cdiPercent) return `${inv.cdiPercent}% do CDI`
    return `${inv.monthlyYieldPercent.toFixed(2)}% a.m.`
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8 w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-900/40 dark:to-cyan-900/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-display">Investimentos</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie sua carteira de investimentos</p>
            </div>
          </div>
          <Button icon={<Plus size={18} />} onClick={openNew} className="shadow-lg shadow-indigo-500/20 px-6 py-3 text-sm">
            Novo Investimento
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/30 dark:border-white/5">
          {[
            { id: 'all', label: 'Tudo', icon: BarChart3 },
            { id: 'fixed', label: 'Renda Fixa', icon: LineChart },
            { id: 'variable', label: 'Renda Var.', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {applyMsg && (
        <p className="text-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg px-4 py-2">{applyMsg}</p>
      )}

      {/* CDI/IPCA rate banner */}
      <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 px-4 py-2.5">
        <Settings2 size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
        {editingRates ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <label className="text-xs text-indigo-700 dark:text-indigo-300">CDI:</label>
            <input
              type="number"
              step="0.01"
              className="w-20 border border-indigo-200 dark:border-indigo-700 rounded px-2 py-0.5 text-xs dark:bg-gray-800 dark:text-gray-100"
              value={tempCdi}
              onChange={(e) => setTempCdi(e.target.value)}
            />
            <span className="text-xs text-indigo-500 dark:text-indigo-400">% a.a.</span>
            <span className="text-indigo-300 dark:text-indigo-600 mx-1">|</span>
            <label className="text-xs text-indigo-700 dark:text-indigo-300">IPCA:</label>
            <input
              type="number"
              step="0.01"
              className="w-20 border border-indigo-200 dark:border-indigo-700 rounded px-2 py-0.5 text-xs dark:bg-gray-800 dark:text-gray-100"
              value={tempIpca}
              onChange={(e) => setTempIpca(e.target.value)}
            />
            <span className="text-xs text-indigo-500 dark:text-indigo-400">% a.a.</span>
            <button onClick={saveRates} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-2 cursor-pointer">Salvar</button>
            <button onClick={() => setEditingRates(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:underline cursor-pointer">Cancelar</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 flex-wrap">
            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">CDI: {cdiRate.toFixed(2)}%</span>
            <span className="text-indigo-300 dark:text-indigo-600 mx-1">|</span>
            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">IPCA: {ipcaRate.toFixed(2)}%</span>
            {selicDisplay && (
              <>
                <span className="text-indigo-300 dark:text-indigo-600 mx-1">|</span>
                <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Selic: {selicDisplay.toFixed(2)}%</span>
              </>
            )}
            <button onClick={openEditRates} className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 ml-2 cursor-pointer">Editar</button>
            <button
              onClick={handleRefreshRates}
              disabled={ratesFetching}
              className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 ml-1 cursor-pointer disabled:opacity-50"
              title="Atualizar taxas via Banco Central"
            >
              <RefreshCw size={12} className={ratesFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {rateMsg && (
        <p className={`text-xs px-4 py-2 rounded-lg ${rateMsg.includes('Erro') ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'}`}>{rateMsg}</p>
      )}

      {/* portfolio summary */}
      {activeInvestments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel-lg p-5 flex flex-col justify-between">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Patrimônio Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalPrincipal)}</p>
          </div>
          <div className="glass-panel-lg p-5 border-t-4 border-t-indigo-500">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Renda Fixa</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalFixed)}</p>
          </div>
          <div className="glass-panel-lg p-5 border-t-4 border-t-emerald-500">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Renda Var.</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalVariable)}</p>
          </div>
          <div className="glass-panel-lg p-5 bg-gradient-to-br from-emerald-50/80 to-cyan-50/80 dark:from-emerald-900/30 dark:to-cyan-900/20">
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Rend. Mensal Liq.</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{fmt(totalMonthlyNet)}</p>
          </div>
        </div>
      )}

      {/* rendimentos aplicados info */}
      <div className="flex items-center justify-between">
           <Button variant="secondary" size="sm" onClick={handleApply} className="text-xs h-9 px-3">
            Aplicar rendimentos — {formatMonthKey(currentMonthKey)}
          </Button>
      </div>

      {/* applied this month */}
      {appliedThisMonth.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Rendimentos de {formatMonthKey(currentMonthKey)}</span>
          </div>
          <div className="flex flex-col gap-1">
            {appliedThisMonth.map((t) => (
              <div key={t.id} className="flex justify-between text-sm">
                <span className="text-emerald-800 dark:text-emerald-200">{t.description}</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{fmt(t.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-1 mt-1 border-t border-emerald-200 dark:border-emerald-700">
              <span className="text-emerald-800 dark:text-emerald-200">Total</span>
              <span className="text-emerald-700 dark:text-emerald-300">{fmt(appliedThisMonth.reduce((s, t) => s + t.amount, 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* investment list */}
      {filteredInvestments.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {activeTab === 'all' ? 'Sua Carteira' : activeTab === 'fixed' ? 'Renda Fixa' : 'Renda Variável'}
            </h2>
            <span className="text-[10px] font-bold text-gray-400">{filteredInvestments.length} ATIVOS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInvestments.map((inv) => {
              const proj = getInvProjection(inv)
              const meta = getInvestmentMeta(inv.investmentType)
              const isVariable = meta.yieldInputMode === 'variable_income'

              return (
                <div
                  key={inv.id}
                  className={`glass-panel-lg p-6 flex flex-col gap-4 group relative overflow-hidden transition-all hover:scale-[1.01] ${!inv.isActive ? 'opacity-60 grayscale' : ''}`}
                >
                  {/* Neon glow indicator */}
                  <div className={`absolute inset-x-0 top-0 h-1 ${isVariable ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_20px_rgba(16,185,129,0.6)]' : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]'}`} />
                  
                  {/* Header */}
                  <div className="flex items-start justify-between pt-2">
                    <div className="flex gap-4 items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white/20 shadow-lg ${isVariable ? 'bg-gradient-to-br from-emerald-100 to-cyan-50 dark:from-emerald-900/50 dark:to-cyan-900/30 text-emerald-600' : 'bg-gradient-to-br from-indigo-100 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/30 text-indigo-600'}`}>
                        {isVariable ? <PieChart size={24} /> : <LineChart size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{inv.name}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {inv.ticker && (
                            <span className="text-xs font-extrabold bg-gray-900/10 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-lg border border-gray-200/30 dark:border-white/10">
                              {inv.ticker}
                            </span>
                          )}
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isVariable ? 'bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}`}>
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Main value */}
                    <div className="text-right">
                      <p className="text-xl font-black text-gray-900 dark:text-gray-100">{fmt(inv.principal)}</p>
                      <span className="text-xs text-gray-500">desde {formatMonthKey(inv.startMonth)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100/50 dark:border-white/5">
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Rendimento/mês</span>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">+{fmt(proj.monthlyAmount)}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Rendimento/ano</span>
                      <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">+{fmt(proj.annualAmount)}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Taxa a.a.</span>
                      <p className="text-base font-bold text-gray-700 dark:text-gray-300">{proj.annualRate.toFixed(2)}%</p>
                    </div>
                    {!isVariable && (
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tipo</span>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{getInvRateLabel(inv)}</p>
                      </div>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100/50 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${inv.isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-gray-400'}`} />
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{inv.isActive ? 'ATIVO' : 'PAUSADO'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateInvestment(inv.id, { isActive: !inv.isActive })}
                        className="p-2.5 rounded-xl bg-gray-100/50 dark:bg-white/5 text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all"
                        title={inv.isActive ? 'Pausar' : 'Ativar'}
                      >
                        {inv.isActive ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button
                        onClick={() => openEdit(inv)}
                        className="p-2.5 rounded-xl bg-gray-100/50 dark:bg-white/5 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir "${inv.name}"?`)) deleteInvestment(inv.id)
                        }}
                        className="p-2.5 rounded-xl bg-gray-100/50 dark:bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3">
          <BarChart3 size={32} className="text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum investimento encontrado nesta categoria.</p>
           <Button variant="secondary" size="sm" onClick={openNew}>Adicionar Primeiro</Button>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar investimento' : 'Novo investimento'}
      >
        <div className="flex flex-col gap-4">
          {/* Investment type selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Tipo de investimento</label>
            <select
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 bg-white dark:bg-gray-800 dark:text-gray-100"
              value={form.investmentType}
              onChange={(e) => handleTypeChange(e.target.value as InvestmentType)}
            >
              {INVESTMENT_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.label} — {t.description}</option>
              ))}
            </select>
            {selectedMeta.isTaxExempt && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <ShieldCheck size={11} /> Isento de Imposto de Renda
              </p>
            )}
          </div>

          {selectedMeta.yieldInputMode === 'variable_income' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input
                  label="Ticker"
                  value={form.ticker}
                  onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
                  placeholder="Ex: PETR4, IVVB11..."
                />
              </div>
              <Input
                label="Quantidade"
                type="number"
                value={form.shares}
                onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                placeholder="Ex: 100"
              />
              <Input
                label="Preço Médio"
                type="number"
                prefix="R$"
                value={form.averagePrice}
                onChange={(e) => setForm((f) => ({ ...f, averagePrice: e.target.value }))}
                placeholder="Ex: 35.50"
              />
              {form.shares && form.averagePrice && (
                 <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-white/5 text-[10px] font-bold text-gray-500 uppercase">
                    Total Investido: <span className="text-indigo-600 dark:text-indigo-400">{fmt((parseFloat(form.shares) || 0) * (parseFloat(form.averagePrice) || 0))}</span>
                 </div>
              )}
            </div>
          ) : (
            <>
              <Input
                label="Nome"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={`Ex: ${selectedMeta.label} Nubank, ${selectedMeta.label} Inter...`}
              />

              <Input
                label="Valor investido (R$)"
                type="number"
                prefix="R$"
                min="0"
                step="100"
                value={form.principal}
                onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))}
              />
            </>
          )}

          {/* Conditional yield fields */}
          {selectedMeta.yieldInputMode === 'cdi_percent' && form.investmentType !== 'poupanca' && (
            <div>
              <Input
                label="% do CDI"
                type="number"
                min="0"
                step="1"
                value={form.cdiPercent}
                onChange={(e) => setForm((f) => ({ ...f, cdiPercent: e.target.value }))}
                placeholder="Ex: 116"
              />
              {form.cdiPercent && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                  {form.cdiPercent}% x CDI ({cdiRate.toFixed(2)}%) = {effectiveAnnualRate(parseFloat(form.cdiPercent) || 0, cdiRate).toFixed(2)}% a.a.
                </p>
              )}
            </div>
          )}

          {form.investmentType === 'poupanca' && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Rendimento calculado automaticamente: 70% da Selic
              </p>
            </div>
          )}

          {selectedMeta.yieldInputMode === 'ipca_plus' && (
            <div>
              <Input
                label="% acima do IPCA (spread)"
                type="number"
                min="0"
                step="0.1"
                value={form.ipcaPercent}
                onChange={(e) => setForm((f) => ({ ...f, ipcaPercent: e.target.value }))}
                placeholder="Ex: 6.5"
              />
            </div>
          )}

          {(selectedMeta.yieldInputMode === 'manual_monthly' || selectedMeta.yieldInputMode === 'variable_income') && (
            <div>
              <Input
                label={selectedMeta.yieldInputMode === 'variable_income' ? "Dividendos mensais est. (%)" : "Rendimento mensal (%)"}
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyYieldPercent}
                onChange={(e) => setForm((f) => ({ ...f, monthlyYieldPercent: e.target.value }))}
                placeholder="Ex: 0.80"
              />
            </div>
          )}

          {/* Live preview */}
          {preview && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3 py-2.5 border border-emerald-100 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Rendimento estimado</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-emerald-600">
                <span>Mensal: <strong>{fmt(preview.monthlyAmount)}</strong></span>
                <span>Anual: <strong>{fmt(preview.annualAmount)}</strong></span>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Início do rastreamento</label>
            <input
              type="month"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 dark:bg-gray-800 dark:text-gray-100"
              value={form.startMonth}
              onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))}
            />
          </div>

          <Input
            label="Observações (opcional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Ex: vence em dez/2026, resgate automático..."
          />

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={(selectedMeta.yieldInputMode !== 'variable_income' && (!form.name.trim() || !form.principal || parseFloat(form.principal) <= 0)) || (selectedMeta.yieldInputMode === 'variable_income' && (!form.ticker || !form.shares || !form.averagePrice))}
            >
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
