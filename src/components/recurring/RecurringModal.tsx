import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { FormState, FormMode } from '../../hooks/useRecurringForm'
import { Category, CATEGORY_META } from '../../types/category'

interface RecurringModalProps {
  open: boolean
  onClose: () => void
  editingId: string | null
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  expenseSectionIds: string[]
  sectionLabels: Record<string, string>
  availableCategories: Category[]
  handleSectionChange: (section: string) => void
  onSubmit: () => void
  addMonths: (monthKey: string, n: number) => string
  formatMonthKey: (key: string) => string
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function RecurringModal({
  open,
  onClose,
  editingId,
  form,
  setForm,
  expenseSectionIds,
  sectionLabels,
  availableCategories,
  handleSectionChange,
  onSubmit,
  addMonths,
  formatMonthKey,
}: RecurringModalProps) {
  const isSubmitDisabled = !form.description.trim() || !form.amount || parseFloat(form.amount) <= 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingId ? 'Editar lançamento' : 'Novo lançamento recorrente'}
    >
      <div className="flex flex-col gap-4">
        {/* tipo */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Tipo</label>
          <div className="flex gap-2">
            {(['fixo', 'parcela'] as FormMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setForm((f) => ({ ...f, mode: m }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                  form.mode === m
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                }`}
              >
                {m === 'fixo' ? 'Gasto Fixo' : 'Parcelado'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
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
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Mês de início</label>
          <input
            type="month"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 dark:bg-gray-800 dark:text-gray-100"
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
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Mês de encerramento (opcional)</label>
            <input
              type="month"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 dark:bg-gray-800 dark:text-gray-100"
              value={form.endMonth}
              onChange={(e) => setForm((f) => ({ ...f, endMonth: e.target.value }))}
            />
          </div>
        )}

        {form.mode === 'parcela' && form.startMonth && form.installmentTotal && (
          <p className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg">
            De {formatMonthKey(form.startMonth)} até {formatMonthKey(addMonths(form.startMonth, parseInt(form.installmentTotal || '0') - 1))}
            {' '}· Total: {fmt((parseFloat(form.amount) || 0) * parseInt(form.installmentTotal || '0'))}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onSubmit} className="flex-1" disabled={isSubmitDisabled}>
            {editingId ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
