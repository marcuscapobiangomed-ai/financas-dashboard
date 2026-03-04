import { useState } from 'react'
import { Settings as SettingsIcon, Download, Upload, Trash2, RotateCcw } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { SECTION_LABELS, EXPENSE_SECTIONS } from '../constants/categories'
import { SectionType } from '../types/transaction'
import { downloadJSON, downloadCSV, transactionsToCSV } from '../utils/exportData'

export function Settings() {
  const appSettings = useFinanceStore((s) => s.appSettings)
  const updateAppSettings = useFinanceStore((s) => s.updateAppSettings)
  const exportData = useFinanceStore((s) => s.exportData)
  const importData = useFinanceStore((s) => s.importData)
  const clearAllData = useFinanceStore((s) => s.clearAllData)
  const transactions = useFinanceStore((s) => s.transactions)

  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  function handleLimitChange(section: SectionType, value: string) {
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

      {/* Section Limits */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Limites de Orçamento por Seção</h2>
        <div className="flex flex-col gap-4">
          {EXPENSE_SECTIONS.map((section) => (
            <Input
              key={section}
              label={SECTION_LABELS[section]}
              type="number"
              prefix="R$"
              value={String(appSettings.defaultSectionLimits[section] ?? 0)}
              onChange={(e) => handleLimitChange(section, e.target.value)}
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
