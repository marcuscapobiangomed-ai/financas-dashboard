import { NavLink } from 'react-router-dom'
import { PiggyBank, LayoutDashboard, Calendar, BarChart2, Settings, Repeat, TrendingUp, LogOut } from 'lucide-react'
import { useBudgetAlerts } from '../../hooks/useBudgetAlerts'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAuthStore } from '../../store/useAuthStore'
import { MonthSelector } from './MonthSelector'

const bottomNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/month', icon: Calendar, label: 'Lançamentos' },
  { to: '/recurring', icon: Repeat, label: 'Recorrentes' },
  { to: '/investments', icon: TrendingUp, label: 'Invest.' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Config.' },
]

export function TopBar() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const { hasAlerts } = useBudgetAlerts(currentMonthKey)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <>
      {/* Mobile top header */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank size={20} className="text-indigo-600" />
          <span className="font-bold text-gray-900 text-sm">Finanças</span>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector />
          <button
            onClick={signOut}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex">
        {bottomNavItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
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
