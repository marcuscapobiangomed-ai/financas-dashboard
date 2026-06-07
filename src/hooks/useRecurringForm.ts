import { useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { RecurringTemplate } from '../types/transaction'
import { Category } from '../types/category'
import { useSectionConfig } from './useSectionConfig'
import { monthsDiff as _monthsDiff } from '../store/financeStoreHelpers'

/** Re-exported for consumers that import monthsDiff from this module. */
export const monthsDiff = _monthsDiff

export type FormMode = 'fixo' | 'parcela'

export interface FormState {
  description: string
  amount: string
  category: Category
  section: string
  startMonth: string
  endMonth: string
  installmentTotal: string
  mode: FormMode
}

export function getCurrentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1 + n, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function blankForm(defaultSection: string): FormState {
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

export function useRecurringForm() {
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
      if (endMonth && endMonth < form.startMonth) return
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

  function formatMonthKey(key: string): string {
    const [y, m] = key.split('-')
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${months[Number(m) - 1]}/${y}`
  }

  function handleApply() {
    const count = applyRecurringToMonth(currentMonthKey)
    setApplyMsg(count > 0
      ? `${count} lançamento(s) aplicados em ${formatMonthKey(currentMonthKey)}.`
      : `Nenhum lançamento novo para aplicar em ${formatMonthKey(currentMonthKey)}.`
    )
    setTimeout(() => setApplyMsg(''), 4000)
  }

  return {
    recurringTemplates,
    transactions,
    sectionLabels,
    expenseSectionIds,
    modalOpen,
    setModalOpen,
    editingId,
    form,
    setForm,
    applyMsg,
    availableCategories,
    openNew,
    openEdit,
    handleSectionChange,
    handleSubmit,
    handleDelete,
    handleToggle,
    handleApply,
    formatMonthKey,
  }
}
