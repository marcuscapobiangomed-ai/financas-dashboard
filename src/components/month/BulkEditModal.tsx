import { useState, useMemo } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Category, CATEGORY_META } from '../../types/category'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../utils/currency'

interface Props {
  open: boolean
  onClose: () => void
  monthKey: string
}

export function BulkEditModal({ open, onClose, monthKey }: Props) {
  const transactions = useFinanceStore((s) => s.transactions)
  const updateTransaction = useFinanceStore((s) => s.updateTransaction)

  const monthTx = useMemo(
    () => transactions.filter((t) => t.monthKey === monthKey && t.type === 'expense'),
    [transactions, monthKey]
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [newCategory, setNewCategory] = useState<Category>(Category.OUTROS)
  const [done, setDone] = useState(false)

  const displayed = filterCategory === 'ALL'
    ? monthTx
    : monthTx.filter((t) => t.category === filterCategory)

  const allSelected = displayed.length > 0 && displayed.every((t) => selected.has(t.id))

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        displayed.forEach((t) => next.delete(t.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        displayed.forEach((t) => next.add(t.id))
        return next
      })
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleApply() {
    if (selected.size === 0) return
    selected.forEach((id) => updateTransaction(id, { category: newCategory }))
    setDone(true)
    setSelected(new Set())
    setTimeout(() => setDone(false), 2000)
  }

  function handleClose() {
    setSelected(new Set())
    setFilterCategory('ALL')
    setDone(false)
    onClose()
  }

  // Category options derived from transactions in month
  const usedCategories = useMemo(() => {
    const seen = new Set(monthTx.map((t) => t.category))
    return Object.values(Category).filter((c) => seen.has(c) && c !== Category.ENTRADAS && c !== Category.RENDIMENTOS)
  }, [monthTx])

  return (
    <Modal open={open} onClose={handleClose} title="Editar categorias em lote" size="lg">
      <div className="flex flex-col gap-4">
        {/* filter + select-all */}
        <div className="flex items-center gap-3">
          <Select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setSelected(new Set()) }}
            className="flex-1"
          >
            <option value="ALL">Todas as categorias</option>
            {usedCategories.map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>
            ))}
          </Select>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer shrink-0"
          >
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allSelected ? 'Desmarcar' : 'Selecionar todos'}
          </button>
        </div>

        {/* transaction list */}
        <div className="border border-gray-100 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          {displayed.length === 0 && (
            <p className="text-sm text-gray-400 p-4 text-center">Nenhuma transação encontrada.</p>
          )}
          {displayed.map((t) => {
            const meta = CATEGORY_META[t.category]
            const isChecked = selected.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleOne(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0 ${isChecked ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
              >
                {isChecked ? (
                  <CheckSquare size={15} className="text-indigo-600 shrink-0" />
                ) : (
                  <Square size={15} className="text-gray-300 shrink-0" />
                )}
                <span className="flex-1 text-sm text-gray-800 truncate">{t.description}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{ color: meta?.color, backgroundColor: meta?.bgColor }}
                >
                  {meta?.label ?? t.category}
                </span>
                <span className="text-sm font-medium text-gray-700 shrink-0 w-20 text-right">
                  {formatCurrency(t.amount)}
                </span>
              </button>
            )
          })}
        </div>

        {/* apply */}
        <div className="flex items-end gap-3 pt-1 border-t border-gray-100">
          <Select
            label={`Nova categoria para ${selected.size} item(s) selecionado(s)`}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Category)}
            className="flex-1"
            disabled={selected.size === 0}
          >
            {Object.values(Category)
              .filter((c) => c !== Category.ENTRADAS && c !== Category.RENDIMENTOS)
              .map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>
              ))}
          </Select>
          <Button onClick={handleApply} disabled={selected.size === 0}>
            {done ? 'Aplicado!' : 'Aplicar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
