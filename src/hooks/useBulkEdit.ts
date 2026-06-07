import { useState, useMemo, useCallback } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Category } from '../types/category'
import { useSectionConfig } from './useSectionConfig'

interface UseBulkEditProps {
  onClose: () => void
  monthKey: string
}

type EditField = 'category' | 'section' | 'description' | null

export function useBulkEdit({ onClose, monthKey }: UseBulkEditProps) {
  const transactions = useFinanceStore((s) => s.transactions)
  const bulkUpdateTransactions = useFinanceStore((s) => s.bulkUpdateTransactions)
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

  const toggleAll = useCallback(() => {
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
  }, [allSelected, displayed])

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const startEdit = useCallback((field: EditField) => {
    setEditField(field)
    setEditValue('')
  }, [])

  const applyEdit = useCallback(() => {
    if (selected.size === 0 || !editField) return

    const updates: { category?: Category; section?: string; description?: string } = {}
    
    if (editField === 'category') {
      updates.category = editValue as Category
    } else if (editField === 'section') {
      updates.section = editValue
    } else if (editField === 'description') {
      updates.description = editValue
    }

    bulkUpdateTransactions(Array.from(selected), updates)
    
    setDone(true)
    setEditField(null)
    setEditValue('')
    setTimeout(() => setDone(false), 2000)
  }, [selected, editField, editValue, bulkUpdateTransactions])

  const handleClose = useCallback(() => {
    setSearch('')
    setFilterSection('ALL')
    setFilterCategory('ALL')
    setSelected(new Set())
    setEditField(null)
    setDone(false)
    onClose()
  }, [onClose])

  return {
    search,
    setSearch,
    filterSection,
    setFilterSection,
    filterCategory,
    setFilterCategory,
    selected,
    setSelected,
    editField,
    setEditField,
    editValue,
    setEditValue,
    done,
    displayed,
    allSelected,
    usedCategories,
    usedSections,
    sectionLabels,
    sectionOrder,
    toggleAll,
    toggleOne,
    startEdit,
    applyEdit,
    handleClose
  }
}
