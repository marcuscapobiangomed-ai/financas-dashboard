import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, BarChart2, ArrowLeftRight,
  Settings, PiggyBank, AlertTriangle, TrendingUp, LogOut, FileText,
} from 'lucide-react'
import { useBudgetAlerts } from '../../hooks/useBudgetAlerts'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAuthStore } from '../../store/useAuthStore'
import { MonthSelector } from './MonthSelector'
import { SyncIndicator } from './SyncIndicator'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/month', icon: Calendar, label: 'Lançamentos' },
  { to: '/investments', icon: TrendingUp, label: 'Investimentos' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/comparison', icon: ArrowLeftRight, label: 'Comparativo' },
  { to: '/ir-report', icon: FileText, label: 'Relatório IRPF' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export function Sidebar() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const { hasAlerts } = useBudgetAlerts(currentMonthKey)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border-r border-gray-100/50 dark:border-white/5 px-3 py-4">
      <div className="flex items-center justify-between px-3 mb-6">
        <div className="flex items-center gap-2">
          <PiggyBank size={24} className="text-indigo-600" />
          <span className="font-bold text-gray-900 dark:text-gray-100 text-base">Finanças</span>
        </div>
        <SyncIndicator />
      </div>

      <div className="px-3 mb-4">
        <MonthSelector />
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
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

      {hasAlerts && (
        <div className="mx-3 mt-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-400 leading-snug">Limite ultrapassado em alguma seção</p>
        </div>
      )}

      {user && (
        <div className="mt-4 mx-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{user.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors w-full px-1 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}
    </aside>
  )
}
