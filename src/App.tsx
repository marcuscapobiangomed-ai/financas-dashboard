import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
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
            </Routes>
          </main>
        </div>
        <QuickAddFAB />
      </div>
    </BrowserRouter>
  )
}
