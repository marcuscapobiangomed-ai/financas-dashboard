import { useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuthStore } from '../store/useAuthStore'
import { useSectionConfig } from './useSectionConfig'
import { DEFAULT_CARD_SECTIONS } from '../constants/defaultBudget'
import { CardSection } from '../types/budget'
import { isNotificationSupported, getNotificationPermission } from '../lib/notifications'
import { downloadJSON, downloadCSV, transactionsToCSV, investmentsToCSV } from '../utils/exportData'

export function useSettings() {
  const appSettings = useFinanceStore((s) => s.appSettings)
  const updateAppSettings = useFinanceStore((s) => s.updateAppSettings)
  const exportData = useFinanceStore((s) => s.exportData)
  const importData = useFinanceStore((s) => s.importData)
  const clearAllData = useFinanceStore((s) => s.clearAllData)
  const migrateMonth = useFinanceStore((s) => s.migrateMonth)
  const transactions = useFinanceStore((s) => s.transactions)
  const { sectionLabels } = useSectionConfig()

  const [tab, setTab] = useState<'budget' | 'cards' | 'data' | 'ai'>('budget')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace')
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [migrateFrom, setMigrateFrom] = useState('')
  const [migrateTo, setMigrateTo] = useState('')
  const [migrateMsg, setMigrateMsg] = useState('')
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    if (isNotificationSupported()) return getNotificationPermission()
    return 'denied'
  })
  const userId = useAuthStore((s) => s.user?.id)
  const investments = useFinanceStore((s) => s.investments)
  const cardSections: CardSection[] = appSettings.cardSections ?? DEFAULT_CARD_SECTIONS

  function startEditCard(card: CardSection) {
    setEditingCardId(card.id)
    setEditingLabel(card.label)
  }

  function saveCardLabel(id: string) {
    const trimmed = editingLabel.trim()
    if (!trimmed) return
    const updated = cardSections.map((c) => c.id === id ? { ...c, label: trimmed } : c)
    updateAppSettings({ cardSections: updated })
    setEditingCardId(null)
  }

  function handleAddCard() {
    const id = `cartao_${Date.now()}`
    const newCard: CardSection = { id, label: `Cartão ${cardSections.length + 1}`, closingDay: 10, dueDay: 20 }
    updateAppSettings({
      cardSections: [...cardSections, newCard],
      defaultSectionLimits: { ...appSettings.defaultSectionLimits, [id]: 500 },
    })
    setEditingCardId(id)
    setEditingLabel(newCard.label)
  }

  function handleCardBillingChange(id: string, field: 'closingDay' | 'dueDay', value: string) {
    let num: number | '' = ''
    if (value !== '') {
      const parsed = parseInt(value, 10)
      num = isNaN(parsed) ? '' : parsed
      if (typeof num === 'number' && num > 28) num = 28
    }
    const updated = cardSections.map((c) => c.id === id ? { ...c, [field]: num } : c) as unknown as CardSection[]
    updateAppSettings({ cardSections: updated })
  }

  function handleCardBillingBlur(id: string, field: 'closingDay' | 'dueDay') {
    const updated = cardSections.map((c) => {
      if (c.id === id) {
        let val = Number(c[field])
        if (isNaN(val) || val < 1) val = 1
        if (val > 28) val = 28
        return { ...c, [field]: val }
      }
      return c
    })
    updateAppSettings({ cardSections: updated })
  }

  function handleRemoveCard(id: string) {
    if (cardSections.length <= 1) return
    if (!window.confirm('Remover este cartão? As transações registradas não serão excluídas.')) return
    const updated = cardSections.filter((c) => c.id !== id)
    updateAppSettings({ cardSections: updated })
  }

  function handleCardLimitChange(id: string, value: string) {
    updateAppSettings({ defaultSectionLimits: { ...appSettings.defaultSectionLimits, [id]: parseFloat(value) || 0 } })
  }

  function handleLimitChange(section: string, value: string) {
    updateAppSettings({ defaultSectionLimits: { ...appSettings.defaultSectionLimits, [section]: parseFloat(value) || 0 } })
  }

  function handleExportJSON() {
    downloadJSON(exportData(), `financas-backup-${new Date().toISOString().split('T')[0]}.json`)
    setExportSuccess('Backup completo exportado com sucesso!')
    setTimeout(() => setExportSuccess(null), 3000)
  }

  function handleExportCSV() {
    downloadCSV(transactionsToCSV(transactions, sectionLabels), `financas-transacoes-${new Date().toISOString().split('T')[0]}.csv`)
    setExportSuccess('Transações exportadas com sucesso!')
    setTimeout(() => setExportSuccess(null), 3000)
  }

  function handleExportInvestmentsCSV() {
    downloadCSV(investmentsToCSV(investments), `financas-investimentos-${new Date().toISOString().split('T')[0]}.csv`)
    setExportSuccess('Investimentos exportados com sucesso!')
    setTimeout(() => setExportSuccess(null), 3000)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importData(ev.target?.result as string, importMode === 'merge')
      if (ok) {
        setImportSuccess(true); setImportError('')
        setTimeout(() => setImportSuccess(false), 3000)
      } else {
        setImportError('Arquivo inválido. Use um backup gerado pelo app.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleMigrate() {
    if (!migrateFrom || !migrateTo) return
    if (migrateFrom === migrateTo) { setMigrateMsg('Os meses são iguais.'); return }
    const count = migrateMonth(migrateFrom, migrateTo)
    setMigrateMsg(count > 0 ? `${count} registro(s) migrado(s) para ${migrateTo}.` : 'Nenhum dado encontrado no mês de origem.')
    setTimeout(() => setMigrateMsg(''), 4000)
  }

  function handleClearData() {
    if (window.confirm('⚠️ Tem certeza? Isso apagará TODOS os dados permanentemente.')) {
      if (window.confirm('Confirme: apagar todos os dados?')) clearAllData()
    }
  }

  return {
    appSettings, updateAppSettings, transactions, tab, setTab, importError, importSuccess,
    importMode, setImportMode, exportSuccess, migrateFrom, setMigrateFrom, migrateTo, setMigrateTo,
    migrateMsg, editingCardId, setEditingCardId, editingLabel, setEditingLabel, notifPermission,
    setNotifPermission, userId, investments, cardSections, startEditCard, saveCardLabel,
    handleAddCard, handleCardBillingChange, handleCardBillingBlur, handleRemoveCard,
    handleCardLimitChange, handleLimitChange, handleExportJSON, handleExportCSV,
    handleExportInvestmentsCSV, handleImport, handleMigrate, handleClearData,
  }
}
