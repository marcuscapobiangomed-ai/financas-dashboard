import { Palette, Bell } from 'lucide-react'
import { AppSettings } from '../../types/budget'
import { isNotificationSupported, requestNotificationPermission, savePushSubscription } from '../../lib/notifications'

interface PreferencesSettingsProps {
  appSettings: AppSettings
  updateAppSettings: (updates: Partial<AppSettings>) => void
  notifPermission: NotificationPermission
  setNotifPermission: (perm: NotificationPermission) => void
  userId: string | undefined
}

export function PreferencesSettings({
  appSettings,
  updateAppSettings,
  notifPermission,
  setNotifPermission,
  userId,
}: PreferencesSettingsProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
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
    </div>
  )
}
