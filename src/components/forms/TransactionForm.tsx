import { Transaction, SectionType } from '../../types/transaction'
import { Category, CATEGORY_META } from '../../types/category'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useTransactionForm } from '../../hooks/useTransactionForm'
import { BillingBanner } from './BillingBanner'
import { InstallmentFields } from './InstallmentFields'
import { RecurringFields } from './RecurringFields'

interface TransactionFormProps {
  initial?: Partial<Transaction>
  defaultSection?: SectionType
  defaultMonthKey?: string
  onSave?: () => void
  onCancel?: () => void
  showSaveAndNew?: boolean
}

export function TransactionForm({
  initial, defaultSection, defaultMonthKey, onSave, onCancel, showSaveAndNew,
}: TransactionFormProps) {
  const {
    description, setDescription, amount, setAmount, section, setSection, category, setCategory, date, setDate, note, setNote,
    errors, suggestions, showSuggestions, setShowSuggestions, isInstallment, setIsInstallment,
    installmentCount, setInstallmentCount, isRecurring, setIsRecurring, recurringEndMonth, setRecurringEndMonth,
    paidByOther, setPaidByOther, paidByName, setPaidByName,
    amountRef, isCardSection, isExpenseSection, currentCard, billingMonthLabel, availableCategories,
    sectionOrder, sectionLabels, handleSubmit, handleDescriptionChange,
  } = useTransactionForm({ initial, defaultSection, defaultMonthKey, onSave })

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(false) }}>
      {/* Section Buttons */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Seção</label>
        <div className="flex flex-wrap gap-1.5">
          {sectionOrder.filter((s) => s !== 'extraordinario').map((s) => (
            <button
              key={s} type="button" onClick={() => setSection(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {sectionLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <Input ref={amountRef} label="Valor" type="number" step="0.01" min="0" prefix="R$" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />

      {/* Description with autocomplete */}
      <div className="relative">
        <Input
          label="Descrição" placeholder="Ex: Mercado, Conta de Luz..." value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          error={errors.description} autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s} type="button" onMouseDown={() => handleDescriptionChange(s)}
                className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category */}
      <Select label="Categoria" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
        {availableCategories.map((c) => (<option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>))}
      </Select>

      {/* Date */}
      <Input label={isCardSection ? 'Data da compra' : 'Data'} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />

      {/* Card billing info banner */}
      <BillingBanner billingMonthLabel={billingMonthLabel} date={date} currentCard={currentCard} />

      {/* Installment toggle */}
      {isCardSection && !initial?.id && (
        <InstallmentFields isInstallment={isInstallment} setIsInstallment={setIsInstallment} installmentCount={installmentCount} setInstallmentCount={setInstallmentCount} amount={amount} error={errors.installmentCount} />
      )}

      {/* Recurring toggle */}
      {isExpenseSection && !isInstallment && !initial?.id && (
        <RecurringFields isRecurring={isRecurring} setIsRecurring={setIsRecurring} recurringEndMonth={recurringEndMonth} setRecurringEndMonth={setRecurringEndMonth} />
      )}

      {/* Paid by other (expense only) */}
      {isExpenseSection && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={paidByOther}
              onChange={(e) => setPaidByOther(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pago por outro</span>
          </label>
          {paidByOther && (
            <Input
              label="Quem vai pagar?"
              placeholder="Ex: pais, mãe, irmão..."
              value={paidByName}
              onChange={(e) => setPaidByName(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Note */}
      <Input label="Observação (opcional)" placeholder="Detalhes adicionais..." value={note} onChange={(e) => setNote(e.target.value)} />

      <div className="flex gap-2 pt-1">
        {onCancel && (<Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>)}
        <Button type="submit" variant="primary" className="flex-1">{initial?.id ? 'Salvar' : 'Adicionar'}</Button>
        {showSaveAndNew && !initial?.id && (<Button type="button" variant="secondary" onClick={() => handleSubmit(true)}>+ Outro</Button>)}
      </div>
    </form>
  )
}
