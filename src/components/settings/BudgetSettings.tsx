import { Wallet, Target, TrendingUp } from 'lucide-react'
import { Input } from '../ui/Input'
import { AppSettings } from '../../types/budget'
import { PreferencesSettings } from './PreferencesSettings'

interface BudgetSettingsProps {
  appSettings: AppSettings
  updateAppSettings: (updates: Partial<AppSettings>) => void
  handleLimitChange: (section: string, value: string) => void
  notifPermission: NotificationPermission
  setNotifPermission: (perm: NotificationPermission) => void
  userId: string | undefined
}

export function BudgetSettings({
  appSettings,
  updateAppSettings,
  handleLimitChange,
  notifPermission,
  setNotifPermission,
  userId,
}: BudgetSettingsProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Other Section Limits */}
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
            <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
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

      <PreferencesSettings
        appSettings={appSettings}
        updateAppSettings={updateAppSettings}
        notifPermission={notifPermission}
        setNotifPermission={setNotifPermission}
        userId={userId}
      />
    </div>
  )
}
