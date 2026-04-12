import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  PiggyBank, LayoutDashboard, Calendar, BarChart2, Settings,
  TrendingUp, LogOut, Menu, X, ArrowLeftRight, Zap, Repeat, FileText,
} from 'lucide-react'
import { useBudgetAlerts } from '../../hooks/useBudgetAlerts'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAuthStore } from '../../store/useAuthStore'
import { MonthSelector } from './MonthSelector'
import { SyncIndicator } from './SyncIndicator'

const bottomNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/month', icon: Calendar, label: 'Lançamentos' },
  { to: '/investments', icon: TrendingUp, label: 'Invest.' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Config.' },
]

const drawerNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/month', icon: Calendar, label: 'Lançamentos' },
  { to: '/quick', icon: Zap, label: 'Lançamento Rápido' },
  { to: '/investments', icon: TrendingUp, label: 'Investimentos' },
  { to: '/recurring', icon: Repeat, label: 'Recorrentes' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/comparison', icon: ArrowLeftRight, label: 'Comparativo' },
  { to: '/ir-report', icon: FileText, label: 'Relatório IRPF' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export function TopBar() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const { hasAlerts } = useBudgetAlerts(currentMonthKey)
  const signOut = useAuthStore((s) => s.signOut)
  const user = useAuthStore((s) => s.user)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Mobile top header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/50 dark:border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1 -ml-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <PiggyBank size={20} className="text-indigo-600" />
          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Finanças</span>
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator />
          <MonthSelector />
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-gray-800 flex flex-col shadow-xl animate-slide-in">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <PiggyBank size={22} className="text-indigo-600" />
                <span className="font-bold text-gray-900 dark:text-gray-100">Finanças</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
              {drawerNavItems.map(({ to, icon: Icon, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                  {label === 'Dashboard' && hasAlerts && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500" />
                  )}
                </NavLink>
              ))}
            </nav>

            {user && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{user.email}</p>
                <button
                  onClick={() => { setDrawerOpen(false); signOut() }}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors w-full px-1 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100/50 dark:border-white/5 flex">
        {bottomNavItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
              }`
            }
          >
            {() => (
              <>
                <div className="relative">
                  <Icon size={18} />
                  {label === 'Dashboard' && hasAlerts && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Spacer so content is not hidden behind bottom nav on mobile */}
      <div className="md:hidden h-16" />
    </>
  )
}
