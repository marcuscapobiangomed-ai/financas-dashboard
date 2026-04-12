import { useState } from 'react'
import { Settings as SettingsIcon, Download, Upload, Trash2, Plus, CreditCard, Pencil, Check, ArrowRightLeft, Bell, Database, Wallet, CheckCircle, AlertCircle, TrendingUp, Target, Palette, Layers, Merge, Replace, CalendarDays } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuthStore } from '../store/useAuthStore'
import { useSectionConfig } from '../hooks/useSectionConfig'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { downloadJSON, downloadCSV, transactionsToCSV, investmentsToCSV } from '../utils/exportData'
import { DEFAULT_CARD_SECTIONS } from '../constants/defaultBudget'
import { CardSection } from '../types/budget'
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, savePushSubscription } from '../lib/notifications'

export function Settings() {
  const appSettings = useFinanceStore((s) => s.appSettings)
  const updateAppSettings = useFinanceStore((s) => s.updateAppSettings)
  const exportData = useFinanceStore((s) => s.exportData)
  const importData = useFinanceStore((s) => s.importData)
  const clearAllData = useFinanceStore((s) => s.clearAllData)
  const migrateMonth = useFinanceStore((s) => s.migrateMonth)
  const transactions = useFinanceStore((s) => s.transactions)
  const { sectionLabels } = useSectionConfig()

  const [tab, setTab] = useState<'budget' | 'cards' | 'data'>('budget')
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

  // ── Card management ──────────────────────────────────────────────
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
    let num: any = value;
    if (value !== '') {
      num = parseInt(value, 10);
      if (isNaN(num)) num = '';
      if (typeof num === 'number' && num > 28) num = 28;
    }
    const updated = cardSections.map((c) => c.id === id ? { ...c, [field]: num } : c)
    updateAppSettings({ cardSections: updated })
  }

  function handleCardBillingBlur(id: string, field: 'closingDay' | 'dueDay') {
    const updated = cardSections.map((c) => {
      if (c.id === id) {
        let val = Number(c[field]);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 28) val = 28;
        return { ...c, [field]: val };
      }
      return c;
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
    const num = parseFloat(value) || 0
    updateAppSettings({
      defaultSectionLimits: { ...appSettings.defaultSectionLimits, [id]: num },
    })
  }

  function handleLimitChange(section: string, value: string) {
    const num = parseFloat(value) || 0
    updateAppSettings({
      defaultSectionLimits: { ...appSettings.defaultSectionLimits, [section]: num },
    })
  }

  function handleExportJSON() {
    const json = exportData()
    downloadJSON(json, `financas-backup-${new Date().toISOString().split('T')[0]}.json`)
    setExportSuccess('Backup completo exportado com sucesso!')
    setTimeout(() => setExportSuccess(null), 3000)
  }

  function handleExportCSV() {
    const csv = transactionsToCSV(transactions, sectionLabels)
    downloadCSV(csv, `financas-transacoes-${new Date().toISOString().split('T')[0]}.csv`)
    setExportSuccess('Transações exportadas com sucesso!')
    setTimeout(() => setExportSuccess(null), 3000)
  }

  function handleExportInvestmentsCSV() {
    const csv = investmentsToCSV(investments)
    downloadCSV(csv, `financas-investimentos-${new Date().toISOString().split('T')[0]}.csv`)
    setExportSuccess('Investimentos exportados com sucesso!')
    setTimeout(() => setExportSuccess(null), 3000)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      
      if (importMode === 'merge') {
        const ok = importData(text, true)
        if (ok) {
          setImportSuccess(true)
          setImportError('')
          setTimeout(() => setImportSuccess(false), 3000)
        } else {
          setImportError('Arquivo inválido. Use um backup gerado pelo app.')
        }
      } else {
        const ok = importData(text)
        if (ok) {
          setImportSuccess(true)
          setImportError('')
          setTimeout(() => setImportSuccess(false), 3000)
        } else {
          setImportError('Arquivo inválido. Use um backup gerado pelo app.')
        }
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
      if (window.confirm('Confirme: apagar todos os dados?')) {
        clearAllData()
      }
    }
  }

  const tabs = [
    { id: 'budget', label: 'Orçamento', icon: Wallet },
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'data', label: 'Dados', icon: Database },
  ] as const

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20">
          <SettingsIcon size={24} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Personalize o app conforme sua necessidade</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 p-1.5 rounded-2xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
              tab === id 
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ── CARTÕES tab ──────────────────────────────────────────── */}
      {tab === 'cards' && <>

      {/* Card Management */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20">
              <CreditCard size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Cartões de Crédito</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie seus cartões</p>
            </div>
          </div>
          <button
            onClick={handleAddCard}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 rounded-xl transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Adicionar cartão
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cardSections.map((card) => (
            <div key={card.id} className="group relative p-4 bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl hover:border-indigo-500/50 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Nome</label>
                  {editingCardId === card.id ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        className="flex-1 border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCardLabel(card.id)
                          if (e.key === 'Escape') setEditingCardId(null)
                        }}
                      />
                      <button
                        onClick={() => saveCardLabel(card.id)}
                        className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{card.label}</span>
                      <button
                        onClick={() => startEditCard(card)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Input
                  label="Limite"
                  type="number"
                  prefix="R$"
                  step="50"
                  min="0"
                  value={String(appSettings.defaultSectionLimits[card.id] ?? 500)}
                  onChange={(e) => handleCardLimitChange(card.id, e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1.5">
                    <CalendarDays size={10} />
                    Fechamento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    className="w-full border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                    value={card.closingDay === ('' as any) ? '' : (card.closingDay ?? 10)}
                    onChange={(e) => handleCardBillingChange(card.id, 'closingDay', e.target.value)}
                    onBlur={() => handleCardBillingBlur(card.id, 'closingDay')}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1.5">
                    <CalendarDays size={10} />
                    Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    className="w-full border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                    value={card.dueDay === ('' as any) ? '' : (card.dueDay ?? 20)}
                    onChange={(e) => handleCardBillingChange(card.id, 'dueDay', e.target.value)}
                    onBlur={() => handleCardBillingBlur(card.id, 'dueDay')}
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                Compras após dia {card.closingDay ?? 10} vão para a fatura do mês seguinte
              </p>
              {cardSections.length > 1 && (
                <button
                  onClick={() => handleRemoveCard(card.id)}
                  className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                  title="Remover cartão"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      </> /* end cards tab */}

      {/* ── ORÇAMENTO tab ────────────────────────────────────────── */}
      {tab === 'budget' && <>

      {/* Other Section Limits */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
            <Layers size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Limites de Orçamento</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Valores padrão para novas seções</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            { id: 'despesas_fixas', label: 'Despesas Fixas' },
            { id: 'gastos_diarios', label: 'Gastos com Dinheiro Físico' },
          ] as const).map(({ id, label }) => (
            <Input
              key={id}
              label={label}
              type="number"
              prefix="R$"
              value={String(appSettings.defaultSectionLimits[id] ?? 0)}
              onChange={(e) => handleLimitChange(id, e.target.value)}
              step="50"
              min="0"
            />
          ))}
        </div>
      </div>

      {/* Financial settings */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/20">
            <Target size={18} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Metas e Percentuais</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configurações financeiras padrões</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Meta de Poupança (%)"
            type="number"
            value={String(appSettings.defaultSavingsGoalPercent)}
            onChange={(e) => updateAppSettings({ defaultSavingsGoalPercent: Number(e.target.value) })}
            min="0"
            max="100"
            step="1"
          />
          <Input
            label="Dízimo padrão (%)"
            type="number"
            value={String(appSettings.defaultTithePercent)}
            onChange={(e) => updateAppSettings({ defaultTithePercent: Number(e.target.value) })}
            min="0"
            max="100"
            step="0.5"
          />
          <Input
            label="Oferta padrão (%)"
            type="number"
            value={String(appSettings.defaultOfferingPercent)}
            onChange={(e) => updateAppSettings({ defaultOfferingPercent: Number(e.target.value) })}
            min="0"
            max="100"
            step="0.5"
          />
          <Input
            label="Alertar a partir de (% do limite)"
            type="number"
            value={String(appSettings.alertThresholdPercent)}
            onChange={(e) => updateAppSettings({ alertThresholdPercent: Number(e.target.value) })}
            min="50"
            max="100"
            step="5"
          />
          <Input
            label="Saldo inicial"
            type="number"
            prefix="R$"
            value={String(appSettings.initialBalance ?? 0)}
            onChange={(e) => updateAppSettings({ initialBalance: Number(e.target.value) })}
            step="100"
          />
        </div>
      </div>

      {/* Reference Rates for Investments */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
            <TrendingUp size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Taxas de Referência</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Para cálculo de investimentos</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Alterar estas taxas recalcula automaticamente os rendimentos.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="CDI anual (%)"
            type="number"
            value={String(appSettings.cdiRateAnnual ?? 14.15)}
            onChange={(e) => updateAppSettings({ cdiRateAnnual: Number(e.target.value) })}
            min="0"
            max="100"
            step="0.01"
          />
          <Input
            label="IPCA anual (%)"
            type="number"
            value={String(appSettings.ipcaRateAnnual ?? 5.0)}
            onChange={(e) => updateAppSettings({ ipcaRateAnnual: Number(e.target.value) })}
            min="0"
            max="100"
            step="0.01"
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-pink-500/10 dark:bg-pink-500/20">
            <Palette size={18} className="text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Aparência</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Personalize o visual do app</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Modo Escuro</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Alternar entre tema claro e escuro</p>
          </div>
          <button
            onClick={() => updateAppSettings({ darkMode: !appSettings.darkMode })}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors cursor-pointer ${
              appSettings.darkMode ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${
              appSettings.darkMode ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <div className="flex items-center justify-between p-4 mt-4 bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tutorial Inicial</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rever as dicas de como usar o aplicativo</p>
          </div>
          <button
            onClick={() => updateAppSettings({ hasSeenTutorial: false })}
            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            Refazer
          </button>
        </div>
      </div>

      {/* Notifications */}
      {isNotificationSupported() && (
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/20">
            <Bell size={18} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Notificações</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Alertas e avisos</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Alertas de Orçamento</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Notificar ao atingir {appSettings.alertThresholdPercent}% do limite
            </p>
          </div>
          <button
            onClick={async () => {
              if (appSettings.notificationsEnabled) {
                updateAppSettings({ notificationsEnabled: false })
              } else {
                const perm = await requestNotificationPermission()
                setNotifPermission(perm)
                if (perm === 'granted') {
                  updateAppSettings({ notificationsEnabled: true })
                  if (userId) savePushSubscription(userId)
                }
              }
            }}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors cursor-pointer ${
              appSettings.notificationsEnabled && notifPermission === 'granted' ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${
              appSettings.notificationsEnabled && notifPermission === 'granted' ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
        {notifPermission === 'denied' && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 ml-1">
            Permissão de notificação bloqueada. Desbloqueie nas configurações do navegador.
          </p>
        )}
      </div>
      )}

      </> /* end budget tab */}

      {/* ── DADOS tab ────────────────────────────────────────────── */}
      {tab === 'data' && <>

      {/* Migrate Month */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20">
            <ArrowRightLeft size={18} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Migrar dados entre meses</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Copie transações de um mês para outro</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200/30 dark:border-blue-700/30">
          Use esta ferramenta para <strong>copiar</strong> todas as transações de um mês para outro. 
          Útil quando você registrou informações no mês errado ou quer começar um novo mês copiando dados do anterior.
        </p>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Mês de origem</label>
            <input
              type="month"
              className="w-full border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={migrateFrom}
              onChange={(e) => setMigrateFrom(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col items-center justify-center pt-5">
            <ArrowRightLeft size={20} className="text-gray-400 dark:text-gray-500 rotate-90 sm:rotate-0" />
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 hidden sm:block">copia para</span>
          </div>
          
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Mês de destino</label>
            <input
              type="month"
              className="w-full border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={migrateTo}
              onChange={(e) => setMigrateTo(e.target.value)}
            />
          </div>
          
          <Button onClick={handleMigrate} disabled={!migrateFrom || !migrateTo} className="mt-5">
            Migrar
          </Button>
        </div>
        
        {migrateMsg && (
          <p className={`text-sm mt-4 p-3 rounded-xl ${
            migrateMsg.includes('0 reg') || migrateMsg.includes('iguais') || migrateMsg.includes('Nenhum') 
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/30 dark:border-amber-700/30' 
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-700/30'
          }`}>
            {migrateMsg}
          </p>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-orange-500/10 dark:bg-orange-500/20">
            <Database size={18} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Dados</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie suas informações</p>
          </div>
        </div>

        {/* Export Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Download size={14} className="text-emerald-600" />
            Exportar Dados
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Baixe seus dados para backup ou para usar em outras ferramentas.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/30 dark:border-emerald-700/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer text-left group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Download size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Backup Completo</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Todas as transações</p>
              </div>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/30 dark:border-blue-700/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer text-left group"
            >
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Download size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">Transações CSV</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Para Excel/Planilhas</p>
              </div>
            </button>
            <button
              onClick={handleExportInvestmentsCSV}
              className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200/30 dark:border-purple-700/30 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer text-left group"
            >
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">Investimentos CSV</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Carteira de investimentos</p>
              </div>
            </button>
          </div>
          {exportSuccess && (
            <p className="text-sm mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-700/30 flex items-center gap-2">
              <CheckCircle size={16} />
              {exportSuccess}
            </p>
          )}
        </div>

        {/* Import Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Upload size={14} className="text-blue-600" />
            Importar Dados
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Restaure um backup anterior ou importe dados de outro sistema.
          </p>
          
          {/* Mode selection */}
          <div className="flex gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="w-4 h-4 text-indigo-600"
              />
              <div className="flex items-center gap-2">
                <Replace size={14} className="text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Substituir tudo</span>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                className="w-4 h-4 text-indigo-600"
              />
              <div className="flex items-center gap-2">
                <Merge size={14} className="text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Mesclar (juntar)</span>
              </div>
            </label>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {importMode === 'replace' 
              ? '⚠️ Substituirá TODOS os dados atuais pelos dados do backup.'
              : '➕ Adicionará os dados do backup aos dados existentes (sem duplicar).'}
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 p-4 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 rounded-xl transition-colors">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <Upload size={18} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Importar Backup</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Arquivo JSON do app</p>
              </div>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
          {importError && (
            <p className="text-sm mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200/30 dark:border-red-700/30 flex items-center gap-2">
              <AlertCircle size={16} />
              {importError}
            </p>
          )}
          {importSuccess && (
            <p className="text-sm mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-700/30 flex items-center gap-2">
              <CheckCircle size={16} />
              Dados importados com sucesso! Modo: {importMode === 'replace' ? 'Substituição' : 'Mesclagem'}
            </p>
          )}
        </div>

        {/* Danger Zone */}
        <div className="border-t border-gray-200/50 dark:border-white/10 pt-4 mt-1">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <Trash2 size={14} />
            Zona de Perigo
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.
          </p>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={handleClearData} className="justify-start h-12 w-full">
            Apagar todos os dados
          </Button>
        </div>
      </div>

      </> /* end data tab */}

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Dados sincronizados com Supabase · {transactions.length} transações registradas
      </p>
    </div>
  )
}
