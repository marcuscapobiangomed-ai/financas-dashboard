import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X, PiggyBank, AlertTriangle, LayoutDashboard, Calendar, BarChart2, ArrowLeftRight, Zap, Settings } from 'lucide-react'
import { useBudgetAlerts } from '../../hooks/useBudgetAlerts'
import { useFinanceStore } from '../../store/useFinanceStore'
import { MonthSelector } from './MonthSelector'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/month', icon: Calendar, label: 'Lançamentos' },
  { to: '/quick', icon: Zap, label: 'Lançamento Rápido' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/comparison', icon: ArrowLeftRight, label: 'Comparativo' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export function TopBar() {
  const [open, setOpen] = useState(false)
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const { hasAlerts } = useBudgetAlerts(currentMonthKey)

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank size={20} className="text-indigo-600" />
          <span className="font-bold text-gray-900 text-sm">Finanças</span>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector />
          <button
            onClick={() => setOpen(true)}
            className="relative p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <Menu size={18} />
            {hasAlerts && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-900">Menu</span>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            {navItems.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
