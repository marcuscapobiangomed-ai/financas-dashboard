import { useState } from 'react'
import { Plus, Repeat, CreditCard, Pencil, Trash2, Play, Pause, CheckCircle2 } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { RecurringTemplate } from '../types/transaction'
import { Category, CATEGORY_META } from '../types/category'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { useSectionConfig } from '../hooks/useSectionConfig'

// ── helpers ──────────────────────────────────────────────────────────────────

function getCurrentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1 + n, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthsDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

function formatMonthKey(key: string): string {
  const [y, m] = key.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[Number(m) - 1]}/${y}`
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── blank form ────────────────────────────────────────────────────────────────

type FormMode = 'fixo' | 'parcela'

interface FormState {
  description: string
  amount: string
  category: Category
  section: string
  startMonth: string
  endMonth: string
  installmentTotal: string
  mode: FormMode
}

function blankForm(defaultSection: string): FormState {
  return {
    description: '',
    amount: '',
    category: Category.OUTROS,
    section: defaultSection,
    startMonth: getCurrentMonthKey(),
    endMonth: '',
    installmentTotal: '12',
    mode: 'fixo',
  }
}

// ── main component ────────────────────────────────────────────────────────────

export function Recurring() {
  const recurringTemplates = useFinanceStore((s) => s.recurringTemplates)
  const addRecurringTemplate = useFinanceStore((s) => s.addRecurringTemplate)
  const updateRecurringTemplate = useFinanceStore((s) => s.updateRecurringTemplate)
  const deleteRecurringTemplate = useFinanceStore((s) => s.deleteRecurringTemplate)
  const applyRecurringToMonth = useFinanceStore((s) => s.applyRecurringToMonth)
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const transactions = useFinanceStore((s) => s.transactions)

  const { sectionLabels, sectionOrder, sectionCategories } = useSectionConfig()

  const expenseSectionIds = sectionOrder.filter((s) => s !== 'entradas' && s !== 'extraordinario')
  const defaultSection = expenseSectionIds[0] ?? 'despesas_fixas'

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(blankForm(defaultSection))
  const [applyMsg, setApplyMsg] = useState('')

  const availableCategories = sectionCategories[form.section] ?? Object.values(Category).filter((c) => c !== Category.ENTRADAS)

  // ── derived lists ───────────────────────────────────────────────────────────

  const fixos = recurringTemplates.filter((t) => !t.installmentTotal)
  const parcelas = recurringTemplates.filter((t) => !!t.installmentTotal)

  function getInstallmentProgress(t: RecurringTemplate): { current: number; total: number; done: boolean } {
    if (!t.installmentTotal) return { current: 0, total: 0, done: false }
    const current = monthsDiff(t.startMonth, currentMonthKey) + 1
    const clamped = Math.max(1, Math.min(current, t.installmentTotal))
    return { current: clamped, total: t.installmentTotal, done: current > t.installmentTotal }
  }

  // ── form logic ──────────────────────────────────────────────────────────────

  function openNew() {
    setEditingId(null)
    setForm(blankForm(defaultSection))
    setModalOpen(true)
  }

  function openEdit(t: RecurringTemplate) {
    setEditingId(t.id)
    setForm({
      description: t.description,
      amount: String(t.amount),
      category: t.category,
      section: t.section,
      startMonth: t.startMonth,
      endMonth: t.endMonth ?? '',
      installmentTotal: t.installmentTotal ? String(t.installmentTotal) : '12',
      mode: t.installmentTotal ? 'parcela' : 'fixo',
    })
    setModalOpen(true)
  }

  function handleSectionChange(section: string) {
    const cats = sectionCategories[section] ?? []
    const newCat = cats.includes(form.category) ? form.category : (cats[0] ?? Category.OUTROS)
    setForm((f) => ({ ...f, section, category: newCat }))
  }

  function handleSubmit() {
    const description = form.description.trim()
    const amount = parseFloat(form.amount)
    if (!description || isNaN(amount) || amount <= 0) return

    let endMonth: string | undefined
    if (form.mode === 'parcela') {
      const total = parseInt(form.installmentTotal)
      if (!total || total < 1) return
      endMonth = addMonths(form.startMonth, total - 1)
    } else {
      endMonth = form.endMonth || undefined
    }

    const payload = {
      description,
      amount,
      category: form.category,
      section: form.section,
      isActive: true,
      startMonth: form.startMonth,
      endMonth,
      installmentTotal: form.mode === 'parcela' ? parseInt(form.installmentTotal) : undefined,
    }

    if (editingId) {
      updateRecurringTemplate(editingId, payload)
    } else {
      addRecurringTemplate(payload)
    }
    setModalOpen(false)
  }

  function handleDelete(id: string, description: string) {
    if (window.confirm(`Excluir "${description}"?`)) {
      deleteRecurringTemplate(id)
    }
  }

  function handleToggle(t: RecurringTemplate) {
    updateRecurringTemplate(t.id, { isActive: !t.isActive })
  }

  function handleApply() {
    const count = applyRecurringToMonth(currentMonthKey)
    setApplyMsg(count > 0
      ? `${count} lançamento(s) aplicados em ${formatMonthKey(currentMonthKey)}.`
      : `Nenhum lançamento novo para aplicar em ${formatMonthKey(currentMonthKey)}.`
    )
    setTimeout(() => setApplyMsg(''), 4000)
  }

  // ── row component ───────────────────────────────────────────────────────────

  function TemplateRow({ t }: { t: RecurringTemplate }) {
    const meta = CATEGORY_META[t.category]
    const prog = getInstallmentProgress(t)
    const alreadyApplied = transactions.some(
      (tx) => tx.monthKey === currentMonthKey && tx.recurringId === t.id
    )

    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${t.isActive ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
        {/* category dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: meta.color }}
        />

        {/* info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800 truncate">{t.description}</span>
            {prog.done && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 size={10} /> Concluída
              </span>
            )}
            {alreadyApplied && (
              <span className="text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                Aplicado {formatMonthKey(currentMonthKey)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500">{sectionLabels[t.section] ?? t.section}</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs" style={{ color: meta.color }}>{meta.label}</span>
            {t.installmentTotal && (
              <>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-500">
                  {prog.current}/{t.installmentTotal} parcelas
                </span>
              </>
            )}
            {!t.installmentTotal && t.endMonth && (
              <>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-500">até {formatMonthKey(t.endMonth)}</span>
              </>
            )}
          </div>
        </div>

        {/* amount */}
        <span className="text-sm font-semibold text-gray-800 shrink-0">{fmt(t.amount)}</span>

        {/* actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleToggle(t)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
            title={t.isActive ? 'Pausar' : 'Ativar'}
          >
            {t.isActive ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={() => openEdit(t)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => handleDelete(t.id, t.description)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    )
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Recorrentes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleApply}>
            Aplicar em {formatMonthKey(currentMonthKey)}
          </Button>
          <Button icon={<Plus size={14} />} onClick={openNew}>
            Novo
          </Button>
        </div>
      </div>

      {applyMsg && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-2">{applyMsg}</p>
      )}

      {recurringTemplates.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Repeat size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhum lançamento recorrente cadastrado.</p>
          <p className="text-xs text-gray-400 mt-1">Adicione gastos fixos mensais ou parcelas para aplicá-los automaticamente.</p>
        </div>
      )}

      {/* Fixos */}
      {fixos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Repeat size={14} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-700">Gastos Fixos</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{fixos.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {fixos.map((t) => <TemplateRow key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {/* Parcelas */}
      {parcelas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-700">Parcelas</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{parcelas.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {parcelas.map((t) => <TemplateRow key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar lançamento' : 'Novo lançamento recorrente'}
      >
        <div className="flex flex-col gap-4">
          {/* tipo */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Tipo</label>
            <div className="flex gap-2">
              {(['fixo', 'parcela'] as FormMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, mode: m }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                    form.mode === m
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {m === 'fixo' ? 'Gasto Fixo' : 'Parcelado'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {form.mode === 'fixo'
                ? 'Repete todo mês indefinidamente (ex: aluguel, plano de saúde, academia).'
                : 'Repete um número fixo de vezes com contador automático (ex: TV 12x, curso 6x).'}
            </p>
          </div>

          <Input
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Ex: Aluguel, TV Samsung 55..."
          />

          <Input
            label="Valor (R$)"
            type="number"
            prefix="R$"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />

          <Select
            label="Seção"
            value={form.section}
            onChange={(e) => handleSectionChange(e.target.value)}
          >
            {expenseSectionIds.map((id) => (
              <option key={id} value={id}>{sectionLabels[id] ?? id}</option>
            ))}
          </Select>

          <Select
            label="Categoria"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
          >
            {availableCategories.map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>
            ))}
          </Select>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Mês de início</label>
            <input
              type="month"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              value={form.startMonth}
              onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))}
            />
          </div>

          {form.mode === 'parcela' && (
            <Input
              label="Número de parcelas"
              type="number"
              min="1"
              max="360"
              value={form.installmentTotal}
              onChange={(e) => setForm((f) => ({ ...f, installmentTotal: e.target.value }))}
              placeholder="Ex: 12"
            />
          )}

          {form.mode === 'fixo' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mês de encerramento (opcional)</label>
              <input
                type="month"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                value={form.endMonth}
                onChange={(e) => setForm((f) => ({ ...f, endMonth: e.target.value }))}
              />
            </div>
          )}

          {form.mode === 'parcela' && form.startMonth && form.installmentTotal && (
            <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
              De {formatMonthKey(form.startMonth)} até {formatMonthKey(addMonths(form.startMonth, parseInt(form.installmentTotal || '0') - 1))}
              {' '}· Total: {fmt((parseFloat(form.amount) || 0) * parseInt(form.installmentTotal || '0'))}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1"
              disabled={!form.description.trim() || !form.amount || parseFloat(form.amount) <= 0}
            >
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
