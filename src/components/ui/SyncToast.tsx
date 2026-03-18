import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'

export function SyncToast() {
  const syncError = useFinanceStore((s) => s.syncError)
  const setSyncError = useFinanceStore((s) => s.setSyncError)

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!syncError) return
    const timer = setTimeout(() => setSyncError(null), 6000)
    return () => clearTimeout(timer)
  }, [syncError, setSyncError])

  if (!syncError) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up">
      <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 shadow-lg">
        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">Erro de sincronização</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">{syncError}</p>
        </div>
        <button
          onClick={() => setSyncError(null)}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
