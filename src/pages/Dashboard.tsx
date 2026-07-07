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

      {/*
        Full-width layout with a 3-column main area + 1-column sidebar.
        At xl (≥1280px): 3 cols main + 1 col right sidebar = 4-col grid.
        At lg (≥1024px): 2 cols main + 1 col right sidebar = 3-col grid.
        Below lg: single-column stack.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* ── Left / Main Area (3 cols on xl, 2 cols on lg) ──────────────── */}
        <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-6">

          {/* Row 1: 4 summary stat cards */}
          <SummaryCards monthKey={currentMonthKey} />

          {/* Row 2: Card cash flow panel — full width of this column */}
          <CardCashFlowPanel monthKey={currentMonthKey} />

          {/* Row 3: Mini charts side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CashFlowMiniChart monthKey={currentMonthKey} />
            <DailySpendingPace monthKey={currentMonthKey} />
          </div>

          {/* Row 4: Income vs Expense timeline — full width */}
          <IncomeExpenseTimeline monthKey={currentMonthKey} />

          {/* Row 5: Budget progress + Category pie side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BudgetProgressBars monthKey={currentMonthKey} />
            <Card title="Despesas por Categoria" noPadding>
              <div className="p-3">
                <CategoryPieChart monthKey={currentMonthKey} />
              </div>
            </Card>
          </div>
        </div>

        {/* ── Right Sidebar (1 col always) ───────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <PendingSummaryCard monthKey={currentMonthKey} />
          <RecentTransactions monthKey={currentMonthKey} />
        </div>
      </div>
    </div>
  )
}
