import { useState } from 'react'
import { TrendingUp, Plus, Pencil, Trash2, Play, Pause, Wallet, ShieldCheck, Settings2 } from 'lucide-react'
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
  getIRBracketLabel,
  getEffectiveAnnualRate,
  effectiveAnnualRate,
  effectiveAnnualRateIPCA,
  poupancaAnnualRate,
  annualToMonthly,
  annualToDaily,
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
  const [applyMsg, setApplyMsg] = useState('')
  const [editingRates, setEditingRates] = useState(false)
  const [tempCdi, setTempCdi] = useState('')
  const [tempIpca, setTempIpca] = useState('')

  const cdiRate = appSettings.cdiRateAnnual ?? 14.15
  const ipcaRate = appSettings.ipcaRateAnnual ?? 5.0

  // ── portfolio summary ───────────────────────────────────────────────────────

  const activeInvestments = investments.filter((i) => i.isActive)
  const totalPrincipal = activeInvestments.reduce((s, i) => s + i.principal, 0)
  const totalMonthlyYieldGross = activeInvestments.reduce(
    (s, i) => s + (i.principal * i.monthlyYieldPercent / 100), 0
  )

  const totalMonthlyTax = activeInvestments.reduce((s, i) => {
    const meta = getInvestmentMeta(i.investmentType)
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

  // ── form helpers ──────────────────────────────────────────────────────────────

  const selectedMeta = getInvestmentMeta(form.investmentType)

  function getFormPreview() {
    const principal = parseFloat(form.principal) || 0
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
    }))
  }

  function handleSubmit() {
    const name = form.name.trim()
    const principal = parseFloat(form.principal)
    if (!name || isNaN(principal) || principal <= 0) return

    const cdiPct = parseFloat(form.cdiPercent) || undefined
    const ipcaPct = parseFloat(form.ipcaPercent) || undefined
    const manualYield = parseFloat(form.monthlyYieldPercent) || 0

    // For manual type, require a yield
    if (form.investmentType === 'manual' && manualYield <= 0) return
    // For CDI types (non-poupanca), require cdiPercent
    if (selectedMeta.yieldInputMode === 'cdi_percent' && form.investmentType !== 'poupanca' && (!cdiPct || cdiPct <= 0)) return

    const payload = {
      name,
      principal,
      monthlyYieldPercent: manualYield,
      startMonth: form.startMonth,
      isActive: true,
      notes: form.notes.trim() || undefined,
      investmentType: form.investmentType as InvestmentType,
      cdiPercent: cdiPct,
      ipcaPercent: ipcaPct,
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

  function getInvTax(inv: Investment) {
    const meta = getInvestmentMeta(inv.investmentType)
    const proj = getInvProjection(inv)
    const days = daysSinceStartMonth(inv.startMonth)
    return { ...netYieldAfterIR(proj.monthlyAmount, days, meta.isTaxExempt), days, isTaxExempt: meta.isTaxExempt }
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
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900">Investimentos</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleApply}>
            Aplicar rendimentos — {formatMonthKey(currentMonthKey)}
          </Button>
          <Button icon={<Plus size={14} />} onClick={openNew}>
            Novo
          </Button>
        </div>
      </div>

      {applyMsg && (
        <p className="text-sm bg-emerald-50 text-emerald-700 rounded-lg px-4 py-2">{applyMsg}</p>
      )}

      {/* CDI/IPCA rate banner */}
      <div className="flex items-center gap-3 bg-indigo-50 rounded-xl border border-indigo-100 px-4 py-2.5">
        <Settings2 size={14} className="text-indigo-500 shrink-0" />
        {editingRates ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <label className="text-xs text-indigo-700">CDI:</label>
            <input
              type="number"
              step="0.01"
              className="w-20 border border-indigo-200 rounded px-2 py-0.5 text-xs"
              value={tempCdi}
              onChange={(e) => setTempCdi(e.target.value)}
            />
            <span className="text-xs text-indigo-500">% a.a.</span>
            <span className="text-indigo-300 mx-1">|</span>
            <label className="text-xs text-indigo-700">IPCA:</label>
            <input
              type="number"
              step="0.01"
              className="w-20 border border-indigo-200 rounded px-2 py-0.5 text-xs"
              value={tempIpca}
              onChange={(e) => setTempIpca(e.target.value)}
            />
            <span className="text-xs text-indigo-500">% a.a.</span>
            <button onClick={saveRates} className="text-xs text-indigo-600 font-semibold hover:underline ml-2 cursor-pointer">Salvar</button>
            <button onClick={() => setEditingRates(false)} className="text-xs text-gray-400 hover:underline cursor-pointer">Cancelar</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-indigo-700 font-medium">CDI: {cdiRate.toFixed(2)}% a.a.</span>
            <span className="text-indigo-300 mx-1">|</span>
            <span className="text-xs text-indigo-700 font-medium">IPCA: {ipcaRate.toFixed(2)}% a.a.</span>
            <button onClick={openEditRates} className="text-xs text-indigo-500 hover:text-indigo-700 ml-2 cursor-pointer">Editar</button>
          </div>
        )}
      </div>

      {/* portfolio summary */}
      {activeInvestments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total investido', value: fmt(totalPrincipal), color: 'text-gray-800' },
            { label: 'Rend. mensal bruto', value: fmt(totalMonthlyYieldGross), color: 'text-emerald-600' },
            { label: 'Rend. mensal líquido', value: fmt(totalMonthlyNet), color: 'text-emerald-700' },
            { label: 'IR estimado/mês', value: fmt(totalMonthlyTax), color: 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-base font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* applied this month */}
      {appliedThisMonth.length > 0 && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Rendimentos de {formatMonthKey(currentMonthKey)}</span>
          </div>
          <div className="flex flex-col gap-1">
            {appliedThisMonth.map((t) => (
              <div key={t.id} className="flex justify-between text-sm">
                <span className="text-emerald-800">{t.description}</span>
                <span className="font-semibold text-emerald-700">{fmt(t.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-1 mt-1 border-t border-emerald-200">
              <span className="text-emerald-800">Total</span>
              <span className="text-emerald-700">{fmt(appliedThisMonth.reduce((s, t) => s + t.amount, 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* empty state */}
      {investments.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <TrendingUp size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhum investimento cadastrado.</p>
          <p className="text-xs text-gray-400 mt-1">Adicione suas aplicações para calcular os rendimentos automaticamente.</p>
        </div>
      )}

      {/* investment list */}
      {investments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Carteira</h2>
          <div className="flex flex-col gap-3">
            {investments.map((inv) => {
              const proj = getInvProjection(inv)
              const tax = getInvTax(inv)
              const meta = getInvestmentMeta(inv.investmentType)

              return (
                <div
                  key={inv.id}
                  className={`p-3 rounded-lg border transition-colors ${inv.isActive ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp size={14} className="text-emerald-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-800">{inv.name}</p>
                        <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">
                          {meta.label}
                        </span>
                        {tax.isTaxExempt && (
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <ShieldCheck size={9} /> Isento IR
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {getInvRateLabel(inv)} · {proj.annualRate.toFixed(2)}% a.a. · desde {formatMonthKey(inv.startMonth)}
                      </p>
                      {inv.notes && <p className="text-xs text-gray-400 mt-0.5">{inv.notes}</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">{fmt(inv.principal)}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateInvestment(inv.id, { isActive: !inv.isActive })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                        title={inv.isActive ? 'Pausar' : 'Ativar'}
                      >
                        {inv.isActive ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                      <button
                        onClick={() => openEdit(inv)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir "${inv.name}"?`)) deleteInvestment(inv.id)
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* projections row */}
                  <div className="mt-2 pt-2 border-t border-gray-50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="text-emerald-600">+{fmt(proj.dailyAmount)}/dia</span>
                    <span className="text-emerald-600 font-semibold">+{fmt(proj.monthlyAmount)}/mês</span>
                    <span className="text-emerald-600">+{fmt(proj.annualAmount)}/ano</span>
                    {!tax.isTaxExempt && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-red-400">IR: {getIRBracketLabel(tax.days)}</span>
                        <span className="text-emerald-700 font-semibold">Líq: {fmt(tax.netYield)}/mês</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
            <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de investimento</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
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
                <p className="text-xs text-indigo-500 mt-1">
                  {form.cdiPercent}% x CDI ({cdiRate.toFixed(2)}%) = {effectiveAnnualRate(parseFloat(form.cdiPercent) || 0, cdiRate).toFixed(2)}% a.a.
                  {' · '}{annualToMonthly(effectiveAnnualRate(parseFloat(form.cdiPercent) || 0, cdiRate)).toFixed(4)}% a.m.
                </p>
              )}
            </div>
          )}

          {form.investmentType === 'poupanca' && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-600">
                Rendimento calculado automaticamente: 70% da Selic
              </p>
              <p className="text-xs text-indigo-500 mt-0.5">
                = {poupancaAnnualRate(cdiRate).toFixed(2)}% a.a. · {annualToMonthly(poupancaAnnualRate(cdiRate)).toFixed(4)}% a.m.
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
              {form.ipcaPercent && (
                <p className="text-xs text-indigo-500 mt-1">
                  IPCA ({ipcaRate.toFixed(2)}%) + {form.ipcaPercent}% = {effectiveAnnualRateIPCA(parseFloat(form.ipcaPercent) || 0, ipcaRate).toFixed(2)}% a.a.
                </p>
              )}
            </div>
          )}

          {selectedMeta.yieldInputMode === 'manual_monthly' && (
            <div>
              <Input
                label="Rendimento mensal (%)"
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyYieldPercent}
                onChange={(e) => setForm((f) => ({ ...f, monthlyYieldPercent: e.target.value }))}
                placeholder="Ex: 0.80"
              />
              {form.principal && form.monthlyYieldPercent && (
                <p className="text-xs text-emerald-600 mt-1">
                  = {fmt(parseFloat(form.principal || '0') * parseFloat(form.monthlyYieldPercent || '0') / 100)}/mês
                  {' · '}≈ {(parseFloat(form.monthlyYieldPercent || '0') * 12).toFixed(1)}% ao ano
                </p>
              )}
            </div>
          )}

          {/* Live preview */}
          {preview && (
            <div className="bg-emerald-50 rounded-lg px-3 py-2.5 border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Projeção de rendimento bruto</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-emerald-600">
                <span>Diário: <strong>{fmt(preview.dailyAmount)}</strong></span>
                <span>Mensal: <strong>{fmt(preview.monthlyAmount)}</strong></span>
                <span>Anual: <strong>{fmt(preview.annualAmount)}</strong></span>
              </div>
              <p className="text-[10px] text-emerald-500 mt-1">
                {preview.dailyRate.toFixed(4)}% a.d. · {preview.monthlyRate.toFixed(4)}% a.m. · {preview.annualRate.toFixed(2)}% a.a.
              </p>
              {!selectedMeta.isTaxExempt && (
                <p className="text-[10px] text-red-400 mt-0.5">
                  IR regressivo: 22,5% (até 6m) → 20% (1a) → 17,5% (2a) → 15% (2a+)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Início do rastreamento</label>
            <input
              type="month"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
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
              disabled={!form.name.trim() || !form.principal || parseFloat(form.principal) <= 0}
            >
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
