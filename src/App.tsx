import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useFinanceStore } from './store/useFinanceStore'
import { useAuthStore } from './store/useAuthStore'
import { AuthGuard } from './components/auth/AuthGuard'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { QuickAddFAB } from './components/forms/QuickAddFAB'
import { Dashboard } from './pages/Dashboard'
import { MonthView } from './pages/MonthView'
import { Analytics } from './pages/Analytics'
import { YearComparison } from './pages/YearComparison'
import { QuickEntry } from './pages/QuickEntry'
import { Settings } from './pages/Settings'
import { Recurring } from './pages/Recurring'
import { Investments } from './pages/Investments'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

function AppShell() {
  const darkMode = useFinanceStore((s) => s.appSettings.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/month" element={<MonthView />} />
            <Route path="/quick" element={<QuickEntry />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/comparison" element={<YearComparison />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <QuickAddFAB />
    </div>
  )
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        } />
      </Routes>
    </BrowserRouter>
  )
}
