import { useState, useRef, useMemo } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Transaction, SectionType } from '../../types/transaction'
import { Category, CATEGORY_META } from '../../types/category'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { getBillingMonthKey, formatBillingMonth } from '../../utils/cardBilling'
import { CreditCard } from 'lucide-react'

interface TransactionFormProps {
  initial?: Partial<Transaction>
  defaultSection?: SectionType
  defaultMonthKey?: string
  onSave?: () => void
  onCancel?: () => void
  showSaveAndNew?: boolean
}

export function TransactionForm({
  initial,
  defaultSection,
  defaultMonthKey,
  onSave,
  onCancel,
  showSaveAndNew,
}: TransactionFormProps) {
  const addTransaction = useFinanceStore((s) => s.addTransaction)
  const addInstallmentTransactions = useFinanceStore((s) => s.addInstallmentTransactions)
  const addRecurringTemplate = useFinanceStore((s) => s.addRecurringTemplate)
  const updateTransaction = useFinanceStore((s) => s.updateTransaction)
  const getDescriptionSuggestions = useFinanceStore((s) => s.getDescriptionSuggestions)
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const { sectionLabels, sectionOrder, sectionCategories, cardSections } = useSectionConfig()
  const cardSectionIds = cardSections.map((c) => c.id)

  const monthKey = defaultMonthKey ?? currentMonthKey

  const initialSection = initial?.section ?? defaultSection ?? 'gastos_diarios'
  const initialCategory = useMemo(() => {
    if (initial?.category) return initial.category
    return sectionCategories[initialSection]?.[0] ?? Category.ALIMENTACAO
  }, [initial?.category, sectionCategories, initialSection])
  
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [section, setSection] = useState<SectionType>(initialSection)
  const [category, setCategory] = useState<Category>(initialCategory)
  const [date, setDate] = useState(initial?.date ?? `${monthKey}-01`)
  const [note, setNote] = useState(initial?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentCount, setInstallmentCount] = useState('2')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringEndMonth, setRecurringEndMonth] = useState('')
  const isCardSection = cardSectionIds.includes(section)
  const isExpenseSection = section !== 'entradas' && section !== 'extraordinario'
  const amountRef = useRef<HTMLInputElement>(null)

  // Card billing cycle calculation
  const currentCard = cardSections.find((c) => c.id === section)
  const billingMonthKey = useMemo(() => {
    if (!isCardSection || !currentCard || !date) return null
    return getBillingMonthKey(date, currentCard.closingDay ?? 10)
  }, [isCardSection, currentCard, date])
  const billingMonthLabel = billingMonthKey ? formatBillingMonth(billingMonthKey) : null

  const availableCategories = sectionCategories[section] ?? Object.values(Category)

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
    // For card sections, use billing month; for others, use the date's month.
    // BUG-1 FIX: If editing and the date/section hasn't changed, strictly preserve the initial monthKey
    // to avoid shifting the transaction into a newly calculated month unpredictably.
    const derivedMonthKey = (initial?.id && date === initial.date && section === initial.section && initial.monthKey)
      ? initial.monthKey
      : (isCardSection && billingMonthKey)
        ? billingMonthKey
        : (date.length >= 7 ? date.substring(0, 7) : monthKey)

    if (isInstallment && isCardSection) {
      const count = parseInt(installmentCount)
      if (isNaN(count) || count < 2) {
        setErrors((e) => ({ ...e, installmentCount: 'Mínimo 2 parcelas' }))
        return
      }
    }

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
    } else if (isInstallment && isCardSection) {
      addInstallmentTransactions(
        {
          description: description.trim(),
          amount: num,
          section,
          category,
          date,
          type: 'expense',
          note: note.trim() || undefined,
        },
        parseInt(installmentCount),
        currentCard?.closingDay
      )
    } else if (isRecurring && isExpenseSection && !initial?.id) {
      const templateId = addRecurringTemplate({
        description: description.trim(),
        amount: num,
        category,
        section,
        isActive: true,
        startMonth: derivedMonthKey,
        endMonth: recurringEndMonth || undefined,
      })
      addTransaction({
        description: description.trim(),
        amount: num,
        section,
        category,
        date,
        type: 'expense',
        monthKey: derivedMonthKey,
        isRecurring: true,
        recurringId: templateId,
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
      setIsInstallment(false)
      setInstallmentCount('2')
      setIsRecurring(false)
      setRecurringEndMonth('')
      amountRef.current?.focus()
    } else {
      const defaultSectionValue = defaultSection ?? 'gastos_diarios'
      const defaultCategoryValue = sectionCategories[defaultSectionValue]?.[0] ?? Category.ALIMENTACAO
      setDescription('')
      setAmount('')
      setSection(defaultSectionValue)
      setCategory(defaultCategoryValue)
      setNote('')
      setIsInstallment(false)
      setInstallmentCount('2')
      setIsRecurring(false)
      setRecurringEndMonth('')
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
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Seção</label>
        <div className="flex flex-wrap gap-1.5">
          {sectionOrder.filter((s) => s !== 'extraordinario').map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {sectionLabels[s]}
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
        min="0"
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
          onChange={(e) => {
            const val = e.target.value
            setDescription(val)
            if (val.length >= 2) {
              setSuggestions(getDescriptionSuggestions(val))
            } else {
              setSuggestions([])
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          error={errors.description}
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors"
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
        label={isCardSection ? 'Data da compra' : 'Data'}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
      />

      {/* Card billing info banner */}
      {isCardSection && billingMonthKey && date && currentCard && (
        <div className="flex items-start gap-2.5 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-700/40 rounded-xl text-xs">
          <CreditCard size={14} className="text-indigo-500 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
              Fatura: {billingMonthLabel}
            </span>
            <span className="text-indigo-600/70 dark:text-indigo-400/70">
              Compra dia {date.split('-')[2]}/{date.split('-')[1]} · Fechamento dia {currentCard.closingDay ?? 10} · Vencimento dia {currentCard.dueDay ?? 20}
            </span>
          </div>
        </div>
      )}

      {/* Installment toggle — only for card sections, new transactions */}
      {isCardSection && !initial?.id && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInstallment}
              onChange={(e) => setIsInstallment(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Parcelado</span>
          </label>
          {isInstallment && (
            <div className="flex items-center gap-3">
              <Input
                label="Parcelas"
                type="number"
                min="2"
                max="360"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
                error={errors.installmentCount}
              />
              {installmentCount && parseFloat(amount.replace(',', '.')) > 0 && (
                <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg mt-5 whitespace-nowrap">
                  {parseInt(installmentCount)}x de R$ {(parseFloat(amount.replace(',', '.')) || 0).toFixed(2)}
                  {' = Total R$ '}
                  {((parseFloat(amount.replace(',', '.')) || 0) * parseInt(installmentCount || '0')).toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recurring toggle — expense sections, not installment, new transactions */}
      {isExpenseSection && !isInstallment && !initial?.id && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Recorrente</span>
          </label>
          {isRecurring && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Até quando? (opcional)</label>
              <input
                type="month"
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                value={recurringEndMonth}
                onChange={(e) => setRecurringEndMonth(e.target.value)}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {recurringEndMonth
                  ? `Repete todo mês até ${recurringEndMonth}`
                  : 'Repete todo mês indefinidamente'}
              </p>
            </div>
          )}
        </div>
      )}

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
