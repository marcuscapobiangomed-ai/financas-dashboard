import { useFinanceStore } from '../store/useFinanceStore'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { BudgetProgressBars } from '../components/dashboard/BudgetProgressBars'
import { AlertBanner } from '../components/dashboard/AlertBanner'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'
import { CategoryPieChart } from '../components/charts/CategoryPieChart'
import { Card } from '../components/ui/Card'
import { daysRemainingInMonth } from '../utils/calculations'
import { getMonthLabel, getCurrentMonthKey } from '../constants/months'

export function Dashboard() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{getMonthLabel(currentMonthKey)}</h1>
          {currentMonthKey === getCurrentMonthKey() && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{daysRemainingInMonth()} dias restantes no mês</p>
          )}
        </div>
      </div>

      <AlertBanner monthKey={currentMonthKey} />

      <SummaryCards monthKey={currentMonthKey} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BudgetProgressBars monthKey={currentMonthKey} />

        <Card title="Despesas por Categoria" noPadding>
          <div className="p-2">
            <CategoryPieChart monthKey={currentMonthKey} />
          </div>
        </Card>
      </div>

      <RecentTransactions monthKey={currentMonthKey} />
    </div>
  )
}
