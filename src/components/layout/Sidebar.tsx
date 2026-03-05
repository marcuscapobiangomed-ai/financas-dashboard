import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, BarChart2, ArrowLeftRight,
  Zap, Settings, PiggyBank, AlertTriangle, Repeat,
} from 'lucide-react'
import { useBudgetAlerts } from '../../hooks/useBudgetAlerts'
import { useFinanceStore } from '../../store/useFinanceStore'
import { MonthSelector } from './MonthSelector'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/month', icon: Calendar, label: 'Lançamentos' },
  { to: '/quick', icon: Zap, label: 'Lançamento Rápido' },
  { to: '/recurring', icon: Repeat, label: 'Recorrentes' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/comparison', icon: ArrowLeftRight, label: 'Comparativo' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export function Sidebar() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const { hasAlerts } = useBudgetAlerts(currentMonthKey)

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-gray-100 px-3 py-4">
      <div className="flex items-center gap-2 px-3 mb-6">
        <PiggyBank size={24} className="text-indigo-600" />
        <span className="font-bold text-gray-900 text-base">Finanças</span>
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
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
        <div className="mx-3 mt-2 p-3 bg-red-50 rounded-lg flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 leading-snug">Limite ultrapassado em alguma seção</p>
        </div>
      )}
    </aside>
  )
}
