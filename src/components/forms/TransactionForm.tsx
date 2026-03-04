import { useState, useEffect, useRef } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Transaction, SectionType } from '../../types/transaction'
import { Category, CATEGORY_META } from '../../types/category'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { SECTION_LABELS, EXPENSE_SECTIONS, SECTION_CATEGORIES } from '../../constants/categories'
import { getCurrentMonthKey } from '../../constants/months'

interface TransactionFormProps {
  initial?: Partial<Transaction>
  defaultSection?: SectionType
  defaultMonthKey?: string
  onSave?: () => void
  onCancel?: () => void
  showSaveAndNew?: boolean
}

const INCOME_TYPES = ['Pagamento', 'Férias', 'PLR', 'Bônus', '13°', 'Outro']

export function TransactionForm({
  initial,
  defaultSection,
  defaultMonthKey,
  onSave,
  onCancel,
  showSaveAndNew,
}: TransactionFormProps) {
  const addTransaction = useFinanceStore((s) => s.addTransaction)
  const updateTransaction = useFinanceStore((s) => s.updateTransaction)
  const getDescriptionSuggestions = useFinanceStore((s) => s.getDescriptionSuggestions)
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)

  const monthKey = defaultMonthKey ?? currentMonthKey
  const today = new Date().toISOString().split('T')[0]

  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [section, setSection] = useState<SectionType>(initial?.section ?? defaultSection ?? 'gastos_diarios')
  const [category, setCategory] = useState<Category>(initial?.category ?? Category.ALIMENTACAO)
  const [date, setDate] = useState(initial?.date ?? `${monthKey}-01`)
  const [note, setNote] = useState(initial?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  useEffect(() => {
    if (description.length >= 2) {
      setSuggestions(getDescriptionSuggestions(description))
    } else {
      setSuggestions([])
    }
  }, [description, getDescriptionSuggestions])

  const availableCategories = SECTION_CATEGORIES[section] ?? Object.values(Category)

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!description.trim()) e.description = 'Descrição obrigatória'
    const num = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(num) || num <= 0) e.amount = 'Valor inválido'
    if (!date) e.date = 'Data obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(saveAndNew = false) {
    if (!validate()) return
    const num = parseFloat(amount.replace(',', '.'))
    const isIncome = section === 'entradas'
    const derivedMonthKey = date.length >= 7 ? date.substring(0, 7) : monthKey

    if (initial?.id) {
      updateTransaction(initial.id, {
        description: description.trim(),
        amount: num,
        section,
        category,
        date,
        monthKey: derivedMonthKey,
        type: isIncome ? 'income' : 'expense',
        note: note.trim() || undefined,
      })
    } else {
      addTransaction({
        description: description.trim(),
        amount: num,
        section,
        category,
        date,
        type: isIncome ? 'income' : 'expense',
        monthKey: derivedMonthKey,
        note: note.trim() || undefined,
      })
    }

    if (saveAndNew) {
      setDescription('')
      setAmount('')
      setNote('')
      amountRef.current?.focus()
    } else {
      onSave?.()
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => { e.preventDefault(); handleSubmit(false) }}
    >
      {/* Section Buttons */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Seção</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SECTION_LABELS) as SectionType[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {SECTION_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <Input
        ref={amountRef}
        label="Valor"
        type="number"
        step="0.01"
        min="0.01"
        prefix="R$"
        placeholder="0,00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />

      {/* Description with autocomplete */}
      <div className="relative">
        <Input
          label="Descrição"
          placeholder="Ex: Mercado, Conta de Luz..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          error={errors.description}
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                onMouseDown={() => setDescription(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category */}
      <Select
        label="Categoria"
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
      >
        {availableCategories.map((c) => (
          <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>
        ))}
      </Select>

      {/* Date */}
      <Input
        label="Data"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
      />

      {/* Note */}
      <Input
        label="Observação (opcional)"
        placeholder="Detalhes adicionais..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" className="flex-1">
          {initial?.id ? 'Salvar' : 'Adicionar'}
        </Button>
        {showSaveAndNew && !initial?.id && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSubmit(true)}
          >
            + Outro
          </Button>
        )}
      </div>
    </form>
  )
}
