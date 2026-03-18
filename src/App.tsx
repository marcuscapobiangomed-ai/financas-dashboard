import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
const IRReport = lazy(() => import('./pages/IRReport').then((m) => ({ default: m.IRReport })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))

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
  useRealtimeSync()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto">
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
              <Route path="/settings" element={<Settings />} />
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
