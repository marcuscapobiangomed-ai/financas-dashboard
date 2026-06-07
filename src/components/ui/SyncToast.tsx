import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Cloud, CloudOff, Loader2, RefreshCw, X } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'

/** Format an ISO timestamp as "HH:MM" in local time. */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function SyncToast() {
  const syncStatus = useFinanceStore((s) => s.syncStatus)
  const syncError = useFinanceStore((s) => s.syncError)
  const syncQueue = useFinanceStore((s) => s.syncQueue)
  const lastSyncedAt = useFinanceStore((s) => s.lastSyncedAt)
  const setSyncError = useFinanceStore((s) => s.setSyncError)
  const retrySyncNow = useFinanceStore((s) => s.retrySyncNow)

  // Auto-dismiss the success toast after 3s
  const [showIdle, setShowIdle] = useState(false)
  useEffect(() => {
    if (syncStatus === 'idle' && lastSyncedAt) {
      setShowIdle(true)
      const t = setTimeout(() => setShowIdle(false), 3000)
      return () => clearTimeout(t)
    }
  }, [syncStatus, lastSyncedAt])

  // Auto-dismiss error after 8s
  useEffect(() => {
    if (!syncError) return
    const t = setTimeout(() => setSyncError(null), 8000)
    return () => clearTimeout(t)
  }, [syncError, setSyncError])

  // ── Error state ────────────────────────────────────────────────────────────
  if (syncStatus === 'error' && syncError) {
    return (
      <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up">
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 shadow-lg">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Erro de sincronização</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 line-clamp-2">{syncError}</p>
            <button
              onClick={() => { setSyncError(null); retrySyncNow() }}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} />
              Tentar novamente
            </button>
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

  // ── Offline / queued state ─────────────────────────────────────────────────
  if (syncStatus === 'offline') {
    return (
      <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up">
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 shadow-lg">
          <CloudOff size={16} className="text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Você está offline</p>
            {syncQueue.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {syncQueue.length} alteração{syncQueue.length !== 1 ? 'ões' : ''} pendente{syncQueue.length !== 1 ? 's' : ''} — serão salvas ao reconectar
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Syncing state ──────────────────────────────────────────────────────────
  if (syncStatus === 'syncing') {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
        <div className="flex items-center gap-2.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-2.5 shadow-lg">
          <Loader2 size={14} className="text-indigo-500 animate-spin shrink-0" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Salvando...</span>
        </div>
      </div>
    )
  }

  // ── Idle / success state ───────────────────────────────────────────────────
  if (showIdle && lastSyncedAt) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
        <div className="flex items-center gap-2.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5 shadow-lg">
          <CheckCircle size={14} className="text-green-500 shrink-0" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Salvo às {formatTime(lastSyncedAt)}
          </span>
        </div>
      </div>
    )
  }

  // ── Subtle persistent indicator when idle (no active sync needed) ──────────
  // Only show the cloud icon if Supabase is configured but no sync has happened yet
  if (syncStatus === 'idle' && !lastSyncedAt) {
    return null
  }

  return null
}
