import { useState, useMemo, useCallback } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useSectionConfig } from './useSectionConfig'
import { getLast12MonthKeys } from '../constants/months'
import { Transaction } from '../types/transaction'

interface UseCopyTransactionsProps {
  onClose: () => void
  monthKey: string
}

export function useCopyTransactions({ onClose, monthKey }: UseCopyTransactionsProps) {
  const transactions = useFinanceStore((s) => s.transactions)
  const monthSettings = useFinanceStore((s) => s.monthSettings)
  const { sectionLabels } = useSectionConfig()

  const [sourceMonth, setSourceMonth] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['entradas']))
  const [done, setDone] = useState(false)

  const availableMonths = useMemo(() => {
    const allMonths = getLast12MonthKeys(monthKey)
    return allMonths.filter((m) => {
      if (m === monthKey) return false
      const hasTransactions = transactions.some((t) => t.monthKey === m)
      return hasTransactions
    })
  }, [monthKey, transactions])

  const sourceTransactions = useMemo(() => {
    if (!sourceMonth) return []
    return transactions.filter((t) => t.monthKey === sourceMonth)
  }, [transactions, sourceMonth])

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => t.monthKey === monthKey)
  }, [transactions, monthKey])

  const existingSet = useMemo(() => {
    return new Set(
      currentMonthTransactions.map((t) => `${t.section}:${t.description}`)
    )
  }, [currentMonthTransactions])

  const transactionsBySection = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {}
    sourceTransactions.forEach((t) => {
      if (!grouped[t.section]) grouped[t.section] = []
      grouped[t.section].push(t)
    })
    Object.keys(grouped).forEach((section) => {
      grouped[section].sort((a, b) => {
        if (a.type === 'income' && b.type !== 'income') return -1
        if (a.type !== 'income' && b.type === 'income') return 1
        return a.description.localeCompare(b.description)
      })
    })
    return grouped
  }, [sourceTransactions])

  const alreadyCopied = useCallback((t: Transaction) => {
    return existingSet.has(`${t.section}:${t.description}`)
  }, [existingSet])

  const handleSelectSourceMonth = useCallback((month: string) => {
    setSourceMonth(month)
    setSelected(new Set())
    setExpandedSections(new Set(['entradas']))
  }, [])

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAllInSection = useCallback((section: string) => {
    const sectionTx = transactionsBySection[section] || []
    const notCopied = sectionTx.filter((t) => !alreadyCopied(t))
    const allSelected = notCopied.every((t) => selected.has(t.id))
    
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        notCopied.forEach((t) => next.delete(t.id))
      } else {
        notCopied.forEach((t) => next.add(t.id))
      }
      return next
    })
  }, [transactionsBySection, alreadyCopied, selected])

  const handleCopy = useCallback(() => {
    if (selected.size === 0) return
    
    const toCopy = sourceTransactions.filter((t) => selected.has(t.id))
    const now = new Date().toISOString()
    const newTransactions: Transaction[] = toCopy.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      monthKey,
      date: `${monthKey}-01`,
      isPaid: false,
      createdAt: now,
      updatedAt: now,
    }))

    useFinanceStore.getState().addTransactions(newTransactions)
    setDone(true)
    
    const currentCopied = Array.isArray(monthSettings[monthKey]?.copiedFromMonths)
      ? monthSettings[monthKey]!.copiedFromMonths!
      : []
    if (!currentCopied.includes(sourceMonth)) {
      useFinanceStore.getState().updateMonthSettings(monthKey, {
        copiedFromMonths: [...currentCopied, sourceMonth]
      })
    }

    setTimeout(() => {
      setDone(false)
      onClose()
    }, 1500)
  }, [selected, sourceTransactions, monthKey, sourceMonth, monthSettings, onClose])

  const handleClose = useCallback(() => {
    setSourceMonth('')
    setSelected(new Set())
    setExpandedSections(new Set())
    setDone(false)
    onClose()
  }, [onClose])

  const copiedFromMonths = Array.isArray(monthSettings[monthKey]?.copiedFromMonths)
    ? monthSettings[monthKey]!.copiedFromMonths!
    : []

  return {
    sourceMonth,
    setSourceMonth,
    selected,
    setSelected,
    expandedSections,
    setExpandedSections,
    done,
    setDone,
    availableMonths,
    sourceTransactions,
    existingSet,
    transactionsBySection,
    alreadyCopied,
    handleSelectSourceMonth,
    toggleSection,
    toggleOne,
    toggleAllInSection,
    handleCopy,
    handleClose,
    copiedFromMonths,
    sectionLabels
  }
}
