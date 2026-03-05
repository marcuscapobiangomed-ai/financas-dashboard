import { useState } from 'react'
import { TrendingUp, Plus, Pencil, Trash2, Play, Pause, Wallet } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Investment } from '../types/investment'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'

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
  name: string
  principal: string
  monthlyYieldPercent: string
  startMonth: string
  notes: string
}

function blankForm(): FormState {
  return { name: '', principal: '', monthlyYieldPercent: '', startMonth: getCurrentMonthKey(), notes: '' }
}

export function Investments() {
  const investments = useFinanceStore((s) => s.investments)
  const addInvestment = useFinanceStore((s) => s.addInvestment)
  const updateInvestment = useFinanceStore((s) => s.updateInvestment)
  const deleteInvestment = useFinanceStore((s) => s.deleteInvestment)
  const applyInvestmentYieldsToMonth = useFinanceStore((s) => s.applyInvestmentYieldsToMonth)
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const transactions = useFinanceStore((s) => s.transactions)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(blankForm())
  const [applyMsg, setApplyMsg] = useState('')

  // ── portfolio summary ───────────────────────────────────────────────────────

  const activeInvestments = investments.filter((i) => i.isActive)
  const totalPrincipal = activeInvestments.reduce((s, i) => s + i.principal, 0)
  const totalMonthlyYield = activeInvestments.reduce(
    (s, i) => s + (i.principal * i.monthlyYieldPercent / 100), 0
  )
  const totalAnnualYield = totalMonthlyYield * 12

  // ── applied yields this month ───────────────────────────────────────────────

  const appliedThisMonth = transactions.filter(
    (t) => t.monthKey === currentMonthKey && t.tags?.includes('investment-yield')
  )

  // ── form ────────────────────────────────────────────────────────────────────

  function openNew() {
    setEditingId(null)
    setForm(blankForm())
    setModalOpen(true)
  }

  function openEdit(inv: Investment) {
    setEditingId(inv.id)
    setForm({
      name: inv.name,
      principal: String(inv.principal),
      monthlyYieldPercent: String(inv.monthlyYieldPercent),
      startMonth: inv.startMonth,
      notes: inv.notes ?? '',
    })
    setModalOpen(true)
  }

  function handleSubmit() {
    const name = form.name.trim()
    const principal = parseFloat(form.principal)
    const yieldPct = parseFloat(form.monthlyYieldPercent)
    if (!name || isNaN(principal) || principal <= 0 || isNaN(yieldPct) || yieldPct <= 0) return

    const payload = { name, principal, monthlyYieldPercent: yieldPct, startMonth: form.startMonth, isActive: true, notes: form.notes.trim() || undefined }
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

  // ── render ──────────────────────────────────────────────────────────────────

  const monthlyRate = (inv: Investment) => `${inv.monthlyYieldPercent.toFixed(2)}% a.m.`
  const annualRate = (inv: Investment) => `≈ ${(inv.monthlyYieldPercent * 12).toFixed(1)}% a.a.`
  const monthlyYield = (inv: Investment) => inv.principal * inv.monthlyYieldPercent / 100

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

      {/* portfolio summary */}
      {activeInvestments.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total investido', value: fmt(totalPrincipal), color: 'text-gray-800' },
            { label: 'Rendimento mensal', value: fmt(totalMonthlyYield), color: 'text-emerald-600' },
            { label: 'Rendimento anual est.', value: fmt(totalAnnualYield), color: 'text-emerald-600' },
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
          <p className="text-xs text-gray-400 mt-1">Adicione suas aplicações para calcular os rendimentos mensais automaticamente.</p>
        </div>
      )}

      {/* investment list */}
      {investments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Carteira</h2>
          <div className="flex flex-col gap-2">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${inv.isActive ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{inv.name}</p>
                  <p className="text-xs text-gray-500">
                    {monthlyRate(inv)} · {annualRate(inv)} · desde {formatMonthKey(inv.startMonth)}
                  </p>
                  {inv.notes && <p className="text-xs text-gray-400 mt-0.5">{inv.notes}</p>}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-800">{fmt(inv.principal)}</p>
                  <p className="text-xs text-emerald-600">+{fmt(monthlyYield(inv))}/mês</p>
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
            ))}
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
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Tesouro Direto, CDB Nubank, LCI..."
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
              disabled={!form.name.trim() || !form.principal || parseFloat(form.principal) <= 0 || !form.monthlyYieldPercent || parseFloat(form.monthlyYieldPercent) <= 0}
            >
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
