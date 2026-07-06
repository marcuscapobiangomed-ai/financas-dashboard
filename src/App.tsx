import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useFinanceStore } from './store/useFinanceStore'
import { useAuthStore } from './store/useAuthStore'
import { AuthGuard } from './components/auth/AuthGuard'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { QuickAddFAB } from './components/forms/QuickAddFAB'
import { SyncToast } from './components/ui/SyncToast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { useRealtimeSync } from './hooks/useRealtimeSync'

// Lazy-loaded pages — each becomes a separate chunk
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const MonthView = lazy(() => import('./pages/MonthView').then((m) => ({ default: m.MonthView })))
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })))
const YearComparison = lazy(() => import('./pages/YearComparison').then((m) => ({ default: m.YearComparison })))
const QuickEntry = lazy(() => import('./pages/QuickEntry').then((m) => ({ default: m.QuickEntry })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const Recurring = lazy(() => import('./pages/Recurring').then((m) => ({ default: m.Recurring })))
const Investments = lazy(() => import('./pages/Investments').then((m) => ({ default: m.Investments })))
const CashFlow = lazy(() => import('./pages/CashFlow').then((m) => ({ default: m.CashFlow })))
const IRReport = lazy(() => import('./pages/IRReport').then((m) => ({ default: m.IRReport })))
const Import = lazy(() => import('./pages/Import').then((m) => ({ default: m.Import })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))
const SyncTest = lazy(() => import('./pages/SyncTest').then((m) => ({ default: m.SyncTest })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}

function MigrationBanner() {
  const migrated = useAuthStore((s) => s.migrated)
  const [dismissed, setDismissed] = useState(false)

  if (!migrated || dismissed) return null

  return (
    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4 flex items-center gap-3">
      <span className="text-green-600 text-lg">&#10003;</span>
      <p className="text-sm text-green-800 dark:text-green-300 flex-1">
        Seus dados anteriores foram recuperados do navegador e sincronizados com sua conta.
      </p>
      <button onClick={() => setDismissed(true)} className="text-green-400 hover:text-green-600 text-sm cursor-pointer">
        Fechar
      </button>
    </div>
  )
}


function AppShell() {
  const darkMode = useFinanceStore((s) => s.appSettings.darkMode)
  const syncStatus = useFinanceStore((s) => s.syncStatus)
  const location = useLocation()
  const isIRPage = location.pathname === '/ir-report'
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useRealtimeSync()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    // Developer migration: Shift "Passagem" installments back by 1 month
    const store = useFinanceStore.getState()
    const passageTxs = store.transactions.filter(
      (t) => t.description.toLowerCase().includes('passagem')
    )
    if (passageTxs.length > 0 && !localStorage.getItem('passagem_migration_july_done_v4')) {
      console.log('[Dev Migration] Migrating Passagem transactions:', passageTxs)
      const uid = useAuthStore.getState().user?.id
      
      const updatedTxs = passageTxs.map((t) => {
        const [year, month, day] = t.date.split('-').map(Number)
        let newYear = year
        let newMonth = month - 1
        if (newMonth === 0) {
          newMonth = 12
          newYear = year - 1
        }
        const newMonthKey = `${newYear}-${String(newMonth).padStart(2, '0')}`
        const newDate = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}`
        return {
          ...t,
          monthKey: newMonthKey,
          date: newDate,
          updatedAt: new Date().toISOString()
        }
      })

      // Update local store directly bypassing month closed checks
      useFinanceStore.setState((state) => ({
        transactions: state.transactions.map((t) => {
          const match = updatedTxs.find((ut) => ut.id === t.id)
          return match ? match : t
        })
      }))

      // Sync each updated transaction to Supabase
      if (uid) {
        import('./sync').then(({ syncRemote }) => {
          updatedTxs.forEach((ut) => {
            syncRemote('upsertTransaction', uid, ut)
          })
        })
      }

      localStorage.setItem('passagem_migration_july_done_v4', 'true')
      console.log('[Dev Migration] Passagem migration done!')
    }
  }, [])

  useEffect(() => {
    // Developer migration: Remove the 4 recurring templates and their transactions
    const store = useFinanceStore.getState()
    const targetDescriptions = [
      'produtos naturais',
      'clash royale',
      'cartório',
      'ifood - laura brava',
    ]

    if (!localStorage.getItem('remove_4_recurring_v2')) {
      const uid = useAuthStore.getState().user?.id
      console.log('[Dev Migration] Removing 4 recurring templates and transactions...')

      // 1. Identify templates to delete
      const templatesToDelete = store.recurringTemplates.filter((t) =>
        targetDescriptions.includes(t.description.toLowerCase().trim())
      )
      const templateIds = templatesToDelete.map((t) => t.id)

      // 2. Identify transactions to delete (either by matching description or recurringId)
      const txsToDelete = store.transactions.filter((t) =>
        targetDescriptions.includes(t.description.toLowerCase().trim()) ||
        (t.recurringId && templateIds.includes(t.recurringId))
      )
      const txIds = txsToDelete.map((t) => t.id)

      console.log('Templates being deleted:', templatesToDelete)
      console.log('Transactions being deleted:', txsToDelete)

      // Update store state
      useFinanceStore.setState((state) => ({
        recurringTemplates: state.recurringTemplates.filter((t) => !templateIds.includes(t.id)),
        transactions: state.transactions.filter((t) => !txIds.includes(t.id))
      }))

      // Sync deletes to Supabase
      if (uid) {
        import('./sync').then(({ syncRemote }) => {
          templateIds.forEach((id) => {
            syncRemote('deleteRecurringTemplateRemote', id)
          })
          txIds.forEach((id) => {
            syncRemote('deleteTransactionRemote', id)
          })
        })
      }

      localStorage.setItem('remove_4_recurring_v2', 'true')
      console.log('[Dev Migration] Finished removing 4 recurring items!')
    }
  }, [])

  // ── Periodic retry when syncStatus is 'error' ──────────────────────────
  useEffect(() => {
    if (syncStatus === 'error' && navigator.onLine && !retryTimerRef.current) {
      retryTimerRef.current = setInterval(() => {
        const store = useFinanceStore.getState()
        if (store.syncStatus === 'error' && navigator.onLine) {
          store.setSyncError(null)
          store.setSyncStatus('offline')
          store.processSyncQueue()
        }
      }, 30_000)
    } else if (syncStatus !== 'error' && retryTimerRef.current) {
      clearInterval(retryTimerRef.current)
      retryTimerRef.current = null
    }

    return () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [syncStatus])

  useEffect(() => {
    // When browser goes back online: clear error state and process queued items
    const handleOnline = () => {
      const store = useFinanceStore.getState()
      if (store.syncStatus === 'error') {
        store.setSyncError(null)
        store.setSyncStatus('offline')
      }
      store.processSyncQueue()
    }

    // When user returns to the tab: check for pending sync and recover
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const store = useFinanceStore.getState()
      if (store.syncQueue.length > 0 || store.syncStatus === 'error' || store.syncStatus === 'offline') {
        if (store.syncStatus === 'error') {
          store.setSyncError(null)
          store.setSyncStatus('offline')
        }
        if (navigator.onLine) {
          store.processSyncQueue()
        }
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-gray-50 dark:from-indigo-950/20 dark:via-gray-900 dark:to-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className={`flex-1 p-4 md:p-6 ${isIRPage ? 'max-w-full' : 'max-w-5xl'} w-full mx-auto`}>
          <MigrationBanner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/month" element={<MonthView />} />
              <Route path="/quick" element={<QuickEntry />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/comparison" element={<YearComparison />} />
              <Route path="/recurring" element={<Recurring />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/ir-report" element={<IRReport />} />
              <Route path="/cashflow" element={<CashFlow />} />
              <Route path="/import" element={<Import />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/sync-test" element={<SyncTest />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <QuickAddFAB />
      <SyncToast />
    </div>
  )
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/*" element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
