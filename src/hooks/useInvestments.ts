import { useState, useEffect } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Investment, InvestmentType } from '../types/investment'
import { getInvestmentMeta } from '../constants/investmentTypes'
import { getCurrentMonthKey } from '../constants/months'

export interface FormState {
  investmentType: InvestmentType
  name: string
  principal: string
  cdiPercent: string
  ipcaPercent: string
  monthlyYieldPercent: string
  startMonth: string
  startDate: string
  endDate: string
  notes: string
  ticker: string
  shares: string
  averagePrice: string
}

export function blankForm(): FormState {
  return {
    investmentType: 'cdb',
    name: '',
    principal: '',
    cdiPercent: '100',
    ipcaPercent: '',
    monthlyYieldPercent: '',
    startMonth: getCurrentMonthKey(),
    startDate: '',
    endDate: '',
    notes: '',
    ticker: '',
    shares: '',
    averagePrice: '',
  }
}

export function useInvestments() {
  const investments = useFinanceStore((s) => s.investments)
  const addInvestment = useFinanceStore((s) => s.addInvestment)
  const updateInvestment = useFinanceStore((s) => s.updateInvestment)
  const deleteInvestment = useFinanceStore((s) => s.deleteInvestment)
  const applyInvestmentYieldsToMonth = useFinanceStore((s) => s.applyInvestmentYieldsToMonth)
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const transactions = useFinanceStore((s) => s.transactions)
  const appSettings = useFinanceStore((s) => s.appSettings)
  const updateAppSettings = useFinanceStore((s) => s.updateAppSettings)
  const fetchLatestRates = useFinanceStore((s) => s.fetchLatestRates)
  const ratesFetching = useFinanceStore((s) => s.ratesFetching)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(blankForm())
  const [activeTab, setActiveTab] = useState<'all' | 'fixed' | 'variable' | string>('all')
  const [applyMsg, setApplyMsg] = useState('')
  const [editingRates, setEditingRates] = useState(false)
  const [tempCdi, setTempCdi] = useState('')
  const [tempIpca, setTempIpca] = useState('')
  const [selicDisplay, setSelicDisplay] = useState<number | null>(null)
  const [rateMsg, setRateMsg] = useState('')

  const cdiRate = appSettings.cdiRateAnnual ?? 14.15
  const ipcaRate = appSettings.ipcaRateAnnual ?? 5.0

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

  function handleApply() {
    const count = applyInvestmentYieldsToMonth(currentMonthKey)
    setApplyMsg(
      count > 0
        ? `${count} rendimento(s) aplicados em ${currentMonthKey}.`
        : 'Rendimentos já aplicados ou nenhum investimento ativo.'
    )
    setTimeout(() => setApplyMsg(''), 4000)
  }

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
      startDate: inv.startDate ?? '',
      endDate: inv.endDate ?? '',
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

  function saveRates() {
    const newCdi = parseFloat(tempCdi)
    const newIpca = parseFloat(tempIpca)
    const updates: Record<string, number> = {}
    if (!isNaN(newCdi) && newCdi > 0) updates.cdiRateAnnual = newCdi
    if (!isNaN(newIpca) && newIpca >= 0) updates.ipcaRateAnnual = newIpca
    if (Object.keys(updates).length > 0) {
      updateAppSettings(updates)
    }
    setEditingRates(false)
  }

  function openEditRates() {
    setTempCdi(String(cdiRate))
    setTempIpca(String(ipcaRate))
    setEditingRates(true)
  }

  return {
    investments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    currentMonthKey,
    transactions,
    appSettings,
    updateAppSettings,
    ratesFetching,
    modalOpen,
    setModalOpen,
    editingId,
    form,
    setForm,
    activeTab,
    setActiveTab,
    applyMsg,
    editingRates,
    setEditingRates,
    tempCdi,
    setTempCdi,
    tempIpca,
    setTempIpca,
    selicDisplay,
    rateMsg,
    cdiRate,
    ipcaRate,
    handleRefreshRates,
    handleApply,
    openNew,
    openEdit,
    handleTypeChange,
    saveRates,
    openEditRates,
  }
}
