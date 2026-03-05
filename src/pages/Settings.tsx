import { useState } from 'react'
import { Settings as SettingsIcon, Download, Upload, Trash2, Plus, CreditCard, Pencil, Check } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { downloadJSON, downloadCSV, transactionsToCSV } from '../utils/exportData'
import { DEFAULT_CARD_SECTIONS } from '../constants/defaultBudget'
import { CardSection } from '../types/budget'

export function Settings() {
  const appSettings = useFinanceStore((s) => s.appSettings)
  const updateAppSettings = useFinanceStore((s) => s.updateAppSettings)
  const exportData = useFinanceStore((s) => s.exportData)
  const importData = useFinanceStore((s) => s.importData)
  const clearAllData = useFinanceStore((s) => s.clearAllData)
  const transactions = useFinanceStore((s) => s.transactions)

  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')

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
    const newCard: CardSection = { id, label: `Cartão ${cardSections.length + 1}` }
    updateAppSettings({
      cardSections: [...cardSections, newCard],
      defaultSectionLimits: { ...appSettings.defaultSectionLimits, [id]: 500 },
    })
    setEditingCardId(id)
    setEditingLabel(newCard.label)
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
  }

  function handleExportCSV() {
    const csv = transactionsToCSV(transactions)
    downloadCSV(csv, `financas-transacoes-${new Date().toISOString().split('T')[0]}.csv`)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const ok = importData(text)
      if (ok) {
        setImportSuccess(true)
        setImportError('')
        setTimeout(() => setImportSuccess(false), 3000)
      } else {
        setImportError('Arquivo inválido. Use um backup gerado pelo app.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleClearData() {
    if (window.confirm('⚠️ Tem certeza? Isso apagará TODOS os dados permanentemente.')) {
      if (window.confirm('Confirme: apagar todos os dados?')) {
        clearAllData()
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex items-center gap-2">
        <SettingsIcon size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
      </div>

      {/* Card Management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-700">Cartões de Crédito</h2>
          </div>
          <button
            onClick={handleAddCard}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            <Plus size={13} />
            Adicionar cartão
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {cardSections.map((card) => (
            <div key={card.id} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 block mb-1">Nome</label>
                {editingCardId === card.id ? (
                  <div className="flex gap-1.5">
                    <input
                      autoFocus
                      className="flex-1 border border-indigo-300 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCardLabel(card.id)
                        if (e.key === 'Escape') setEditingCardId(null)
                      }}
                    />
                    <button
                      onClick={() => saveCardLabel(card.id)}
                      className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800">{card.label}</span>
                    <button
                      onClick={() => startEditCard(card)}
                      className="p-1 rounded text-gray-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                )}
              </div>
              <div className="w-36">
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
              {cardSections.length > 1 && (
                <button
                  onClick={() => handleRemoveCard(card.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer mb-0.5"
                  title="Remover cartão"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Other Section Limits */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Limites de Orçamento</h2>
        <div className="flex flex-col gap-4">
          {([
            { id: 'despesas_fixas', label: 'Despesas Fixas' },
            { id: 'gastos_diarios', label: 'Gastos do Dia a Dia' },
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Metas e Percentuais</h2>
        <div className="flex flex-col gap-4">
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
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Dados</h2>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" icon={<Download size={14} />} onClick={handleExportJSON} className="justify-start">
            Exportar backup (JSON)
          </Button>
          <Button variant="secondary" icon={<Download size={14} />} onClick={handleExportCSV} className="justify-start">
            Exportar transações (CSV)
          </Button>
          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
              <Upload size={14} />
              Importar backup (JSON)
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            {importError && <p className="text-xs text-red-600 mt-1">{importError}</p>}
            {importSuccess && <p className="text-xs text-emerald-600 mt-1">Dados importados com sucesso!</p>}
          </div>
          <div className="border-t border-gray-100 pt-3 mt-1">
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={handleClearData} className="justify-start">
              Apagar todos os dados
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Dados salvos localmente no seu navegador · {transactions.length} transações registradas
      </p>
    </div>
  )
}
