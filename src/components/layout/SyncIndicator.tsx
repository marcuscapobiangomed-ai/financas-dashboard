import { useFinanceStore } from '../../store/useFinanceStore'
import { Cloud, CloudOff, CloudCog, CloudAlert } from 'lucide-react'

export function SyncIndicator() {
  const syncStatus = useFinanceStore((s) => s.syncStatus)
  const queueLength = useFinanceStore((s) => s.syncQueue.length)

  if (syncStatus === 'idle') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50/50 dark:bg-green-900/20 text-green-600 rounded-lg" title="Todas as alterações foram salvas">
        <Cloud size={16} />
        <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">Salvo</span>
      </div>
    )
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg animate-pulse" title="Sincronizando com a nuvem...">
        <CloudCog size={16} className="animate-spin-slow" />
        <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">Salvando...</span>
      </div>
    )
  }
  
  if (syncStatus === 'offline') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50/50 dark:bg-amber-900/20 text-amber-600 rounded-lg" title="Você está offline. As alterações serão salvas depois.">
        <CloudOff size={16} />
        <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">Offline {queueLength > 0 && `(${queueLength})`}</span>
      </div>
    )
  }

  if (syncStatus === 'error') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50/50 dark:bg-red-900/20 text-red-600 rounded-lg" title="Erro ao salvar na nuvem">
        <CloudAlert size={16} />
        <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">Erro</span>
      </div>
    )
  }

  return null
}
