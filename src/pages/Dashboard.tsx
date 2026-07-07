import { useFinanceStore } from '../store/useFinanceStore'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { PendingSummaryCard } from '../components/dashboard/PendingSummaryCard'
import { BudgetProgressBars } from '../components/dashboard/BudgetProgressBars'
import { AlertBanner } from '../components/dashboard/AlertBanner'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'
import { CardCashFlowPanel } from '../components/dashboard/CardCashFlowPanel'
import { CashFlowMiniChart } from '../components/dashboard/CashFlowMiniChart'
import { DailySpendingPace } from '../components/dashboard/DailySpendingPace'
import { IncomeExpenseTimeline } from '../components/dashboard/IncomeExpenseTimeline'
import { CategoryPieChart } from '../components/charts/CategoryPieChart'
import { Card } from '../components/ui/Card'
import { daysRemainingInMonth } from '../utils/calculations'
import { getMonthLabel, getCurrentMonthKey } from '../constants/months'

export function Dashboard() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-outfit text-gray-900 dark:text-gray-100">{getMonthLabel(currentMonthKey)}</h1>
          {currentMonthKey === getCurrentMonthKey() && (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">{daysRemainingInMonth()} dias restantes no mês</p>
          )}
        </div>
      </div>

      <AlertBanner monthKey={currentMonthKey} />

      {/* Main Grid Layout (70% Left, 30% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Stats, Charts, Analytics) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SummaryCards monthKey={currentMonthKey} />

          <CardCashFlowPanel monthKey={currentMonthKey} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CashFlowMiniChart monthKey={currentMonthKey} />
            <DailySpendingPace monthKey={currentMonthKey} />
          </div>

          <IncomeExpenseTimeline monthKey={currentMonthKey} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BudgetProgressBars monthKey={currentMonthKey} />
            
            <Card title="Despesas por Categoria" noPadding>
              <div className="p-3">
                <CategoryPieChart monthKey={currentMonthKey} />
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column (Cards billing status, Transactions, Alerts) */}
        <div className="flex flex-col gap-6">
          <PendingSummaryCard monthKey={currentMonthKey} />
          <RecentTransactions monthKey={currentMonthKey} />
        </div>
      </div>
    </div>
  )
}
