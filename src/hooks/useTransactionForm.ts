import { useState, useRef, useMemo, useCallback } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useSectionConfig } from './useSectionConfig'
import { Transaction, SectionType } from '../types/transaction'
import { Category } from '../types/category'
import { getBillingMonthKey, formatBillingMonth } from '../utils/cardBilling'

interface UseTransactionFormProps {
  initial?: Partial<Transaction>; defaultSection?: SectionType; defaultMonthKey?: string; onSave?: () => void
}

export function useTransactionForm({ initial, defaultSection, defaultMonthKey, onSave }: UseTransactionFormProps) {
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
  const initialCategory = useMemo(() => initial?.category ?? sectionCategories[initialSection]?.[0] ?? Category.ALIMENTACAO, [initial?.category, sectionCategories, initialSection])

  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [section, setSection] = useState<SectionType>(initialSection)
  const [category, setCategory] = useState<Category>(initialCategory)
  const [date, setDate] = useState(initial?.date ?? `${monthKey}-01`)
  const [note, setNote] = useState(initial?.note ?? '')
  const [paidByOther, setPaidByOther] = useState(initial?.paidByOther ?? false)
  const [paidByName, setPaidByName] = useState(initial?.paidByName ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentCount, setInstallmentCount] = useState('2')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringEndMonth, setRecurringEndMonth] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)

  const isCardSection = cardSectionIds.includes(section)
  const isExpenseSection = section !== 'entradas' && section !== 'extraordinario'
  const currentCard = cardSections.find((c) => c.id === section)
  const billingMonthKey = useMemo(() => {
    if (!isCardSection || !currentCard || !date) return null
    return getBillingMonthKey(date, currentCard.closingDay ?? 10)
  }, [isCardSection, currentCard, date])
  const billingMonthLabel = billingMonthKey ? formatBillingMonth(billingMonthKey) : null
  const availableCategories = sectionCategories[section] ?? Object.values(Category)

  const handleSectionChange = useCallback((newSection: SectionType) => {
    setSection(newSection)
    setCategory(sectionCategories[newSection]?.[0] ?? Category.ALIMENTACAO)
  }, [sectionCategories])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (!description.trim()) e.description = 'Descrição obrigatória'
    const num = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(num) || num <= 0) e.amount = 'Valor inválido'
    if (!date) e.date = 'Data obrigatória'
    if (isInstallment && isCardSection) {
      const count = parseInt(installmentCount)
      if (isNaN(count) || count < 2) {
        e.installmentCount = 'Mínimo 2 parcelas'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }, [description, amount, date, isInstallment, isCardSection, installmentCount])

  const handleSubmit = useCallback((saveAndNew = false) => {
    if (!validate()) return
    const num = parseFloat(amount.replace(',', '.'))
    const isIncome = section === 'entradas'
    const derivedMonthKey = (initial?.id && date === initial.date && section === initial.section && initial.monthKey)
      ? initial.monthKey
      : (isCardSection && billingMonthKey) ? billingMonthKey : (date.length >= 7 ? date.substring(0, 7) : monthKey)

    const paidFields = paidByOther
      ? { paidByOther: true, paidByName: paidByName.trim() || undefined }
      : {}

    if (initial?.id) {
      updateTransaction(initial.id, {
        description: description.trim(), amount: num, section, category, date,
        monthKey: derivedMonthKey, type: isIncome ? 'income' : 'expense',
        note: note.trim() || undefined, ...paidFields,
      })
    } else if (isInstallment && isCardSection) {
      addInstallmentTransactions(
        { description: description.trim(), amount: num, section, category, date, type: 'expense',
          note: note.trim() || undefined, ...paidFields },
        parseInt(installmentCount), currentCard?.closingDay
      )
    } else if (isRecurring && isExpenseSection && !initial?.id) {
      const templateId = addRecurringTemplate({
        description: description.trim(), amount: num, category, section, isActive: true,
        startMonth: derivedMonthKey, endMonth: recurringEndMonth || undefined,
      })
      addTransaction({
        description: description.trim(), amount: num, section, category, date, type: 'expense',
        monthKey: derivedMonthKey, isRecurring: true, recurringId: templateId,
        note: note.trim() || undefined, ...paidFields,
      })
    } else {
      addTransaction({
        description: description.trim(), amount: num, section, category, date,
        type: isIncome ? 'income' : 'expense', monthKey: derivedMonthKey,
        note: note.trim() || undefined, ...paidFields,
      })
    }

    const reset = () => {
      setDescription(''); setAmount(''); setNote(''); setIsInstallment(false)
      setInstallmentCount('2'); setIsRecurring(false); setRecurringEndMonth('')
      setPaidByOther(false); setPaidByName('')
    }

    if (saveAndNew) {
      reset(); amountRef.current?.focus()
    } else {
      const defS = defaultSection ?? 'gastos_diarios'
      reset(); setSection(defS); setCategory(sectionCategories[defS]?.[0] ?? Category.ALIMENTACAO); onSave?.()
    }
  }, [
    validate, amount, section, initial, date, isCardSection, billingMonthKey, monthKey,
    isInstallment, installmentCount, updateTransaction, addInstallmentTransactions,
    currentCard, isRecurring, isExpenseSection, addRecurringTemplate, addTransaction,
    description, category, note, paidByOther, paidByName, recurringEndMonth, defaultSection, sectionCategories, onSave
  ])

  const handleDescriptionChange = useCallback((val: string) => {
    setDescription(val)
    setSuggestions(val.length >= 2 ? getDescriptionSuggestions(val) : [])
  }, [getDescriptionSuggestions])

  const selectSuggestion = useCallback((val: string) => {
    setDescription(val); setSuggestions([])
  }, [])

  return {
    description, setDescription, amount, setAmount, section, setSection: handleSectionChange,
    category, setCategory, date, setDate, note, setNote, errors, setErrors, suggestions,
    showSuggestions, setShowSuggestions, isInstallment, setIsInstallment, installmentCount,
    setInstallmentCount, isRecurring, setIsRecurring, recurringEndMonth, setRecurringEndMonth,
    paidByOther, setPaidByOther, paidByName, setPaidByName,
    amountRef, isCardSection, isExpenseSection, currentCard, billingMonthKey, billingMonthLabel,
    availableCategories, sectionOrder, sectionLabels, handleSubmit, handleDescriptionChange, selectSuggestion
  }
}
