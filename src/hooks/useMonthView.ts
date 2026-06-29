import { useState, useCallback } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useMonthData } from './useMonthData'

export function useMonthView() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const updateMonthSettings = useFinanceStore((s) => s.updateMonthSettings)
  const monthSettings = useFinanceStore((s) => s.monthSettings)
  const { sections, income, totalExpenses, isClosed, extraordinaryIncome, accumulatedBalance, carryoverBalance } = useMonthData(currentMonthKey)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income')

  const incomeSections = sections.filter(s => s.section === 'entradas')
  const expenseSections = sections.filter(s => s.section !== 'entradas')

  const currentNotes = monthSettings[currentMonthKey]?.notes ?? ''
  const currentHighlights = monthSettings[currentMonthKey]?.highlights ?? []
  const currentLessons = monthSettings[currentMonthKey]?.lessons ?? ''
  const currentSavingsGoal = monthSettings[currentMonthKey]?.savingsGoal
  const appSettings = useFinanceStore((s) => s.appSettings)
  const savingsGoalPercent = currentSavingsGoal ?? appSettings.defaultSavingsGoalPercent
  const totalIncome = income + extraordinaryIncome
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
  const hasNotes = currentNotes.length > 0 || currentHighlights.length > 0 || currentLessons.length > 0

  const handleNotesChange = useCallback((value: string) => {
    updateMonthSettings(currentMonthKey, { notes: value })
  }, [currentMonthKey, updateMonthSettings])

  const handleHighlightsChange = useCallback((value: string) => {
    updateMonthSettings(currentMonthKey, { highlights: value.split('\n').filter(h => h.trim()) })
  }, [currentMonthKey, updateMonthSettings])

  const handleLessonsChange = useCallback((value: string) => {
    updateMonthSettings(currentMonthKey, { lessons: value })
  }, [currentMonthKey, updateMonthSettings])

  const handleSavingsGoalChange = useCallback((value: string) => {
    const num = parseFloat(value)
    updateMonthSettings(currentMonthKey, { savingsGoal: isNaN(num) ? undefined : num })
  }, [currentMonthKey, updateMonthSettings])

  return {
    currentMonthKey,
    isClosed,
    bulkOpen,
    setBulkOpen,
    notesOpen,
    setNotesOpen,
    copyOpen,
    setCopyOpen,
    closeOpen,
    setCloseOpen,
    activeTab,
    setActiveTab,
    incomeSections,
    expenseSections,
    currentNotes,
    currentHighlights,
    currentLessons,
    currentSavingsGoal,
    savingsGoalPercent,
    totalIncome,
    totalExpenses,
    savingsRate,
    hasNotes,
    handleNotesChange,
    handleHighlightsChange,
    handleLessonsChange,
    handleSavingsGoalChange,
    appSettings,
    accumulatedBalance,
    carryoverBalance
  }
}
