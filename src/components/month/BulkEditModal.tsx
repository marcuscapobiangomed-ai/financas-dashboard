import { useState, useMemo } from 'react'
import { CheckSquare, Square, Search, Save, X } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { Category, CATEGORY_META } from '../../types/category'
import { useSectionConfig } from '../../hooks/useSectionConfig'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../utils/currency'

interface Props {
  open: boolean
  onClose: () => void
  monthKey: string
}

type EditField = 'category' | 'section' | 'description' | null

export function BulkEditModal({ open, onClose, monthKey }: Props) {
  const transactions = useFinanceStore((s) => s.transactions)
  const updateTransaction = useFinanceStore((s) => s.updateTransaction)
  const { sectionLabels, sectionOrder } = useSectionConfig()

  const monthTx = useMemo(
    () => transactions.filter((t) => t.monthKey === monthKey),
    [transactions, monthKey]
  )

  const [search, setSearch] = useState('')
  const [filterSection, setFilterSection] = useState<string>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editField, setEditField] = useState<EditField>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [done, setDone] = useState(false)

  const displayed = useMemo(() => {
    return monthTx.filter((t) => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterSection !== 'ALL' && t.section !== filterSection) return false
      if (filterCategory !== 'ALL' && t.category !== filterCategory) return false
      return true
    })
  }, [monthTx, search, filterSection, filterCategory])

  const allSelected = displayed.length > 0 && displayed.every((t) => selected.has(t.id))

  const usedCategories = useMemo(() => {
    const seen = new Set(monthTx.map((t) => t.category))
    return Object.values(Category).filter((c) => seen.has(c))
  }, [monthTx])

  const usedSections = useMemo(() => {
    const seen = new Set(monthTx.map((t) => t.section))
    return [...new Set([...sectionOrder, ...Array.from(seen)])].filter((s) => seen.has(s))
  }, [monthTx, sectionOrder])

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

  function startEdit(field: EditField) {
    setEditField(field)
    setEditValue('')
  }

  function applyEdit() {
    if (selected.size === 0 || !editField) return

    const updates: { category?: Category; section?: string; description?: string } = {}
    
    if (editField === 'category') {
      updates.category = editValue as Category
    } else if (editField === 'section') {
      updates.section = editValue
    } else if (editField === 'description') {
      updates.description = editValue
    }

    selected.forEach((id) => updateTransaction(id, updates))
    
    setDone(true)
    setEditField(null)
    setEditValue('')
    setTimeout(() => setDone(false), 2000)
  }

  function handleClose() {
    setSearch('')
    setFilterSection('ALL')
    setFilterCategory('ALL')
    setSelected(new Set())
    setEditField(null)
    setDone(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Edição em massa" size="lg">
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <Select
            value={filterSection}
            onChange={(e) => { setFilterSection(e.target.value); setSelected(new Set()) }}
            className="w-36"
          >
            <option value="ALL">Todas seções</option>
            {usedSections.map((s) => (
              <option key={s} value={s}>{sectionLabels[s] ?? s}</option>
            ))}
          </Select>
          <Select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setSelected(new Set()) }}
            className="w-40"
          >
            <option value="ALL">Todas categorias</option>
            {usedCategories.map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>
            ))}
          </Select>
        </div>

        {/* Selection info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {displayed.length} transações · {selected.size} selecionada(s)
          </span>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>

        {/* Transaction list */}
        <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          {displayed.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 p-4 text-center">Nenhuma transação encontrada.</p>
          )}
          {displayed.map((t) => {
            const meta = CATEGORY_META[t.category]
            const isChecked = selected.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleOne(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${isChecked ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                {isChecked ? (
                  <CheckSquare size={15} className="text-indigo-600 shrink-0" />
                ) : (
                  <Square size={15} className="text-gray-300 dark:text-gray-600 shrink-0" />
                )}
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{t.description}</span>
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ color: meta?.color, backgroundColor: meta?.bgColor }}>
                  {meta?.label ?? t.category}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 w-20 truncate">
                  {sectionLabels[t.section] ?? t.section}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 w-20 text-right">
                  {formatCurrency(t.amount)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Edit actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {editField ? (
            <div className="flex-1 flex items-center gap-2">
              {editField === 'category' ? (
                <Select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1"
                  autoFocus
                >
                  <option value="">Selecione a categoria</option>
                  {Object.values(Category).map((c) => (
                    <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>
                  ))}
                </Select>
              ) : editField === 'section' ? (
                <Select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1"
                  autoFocus
                >
                  <option value="">Selecione a seção</option>
                  {sectionOrder.filter((s) => s !== 'extraordinario').map((s) => (
                    <option key={s} value={s}>{sectionLabels[s] ?? s}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Nova descrição"
                  className="flex-1"
                  autoFocus
                />
              )}
              <Button onClick={applyEdit} disabled={selected.size === 0 || !editValue}>
                <Save size={16} />
              </Button>
              <Button variant="ghost" onClick={() => setEditField(null)}>
                <X size={16} />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm text-gray-500 shrink-0">
                {done ? 'Aplicado!' : `Editar ${selected.size} item(s):`}
              </span>
              {!done && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit('category')}
                    disabled={selected.size === 0}
                  >
                    Categoria
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit('section')}
                    disabled={selected.size === 0}
                  >
                    Seção
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit('description')}
                    disabled={selected.size === 0}
                  >
                    Descrição
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}