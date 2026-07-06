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
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{getMonthLabel(currentMonthKey)}</h1>
          {currentMonthKey === getCurrentMonthKey() && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{daysRemainingInMonth()} dias restantes no mês</p>
          )}
        </div>
      </div>

      <div className="bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800 p-4 rounded-2xl">
        <h3 className="font-bold text-indigo-950 dark:text-indigo-300 text-sm mb-2">Despesas Recorrentes Ativas:</h3>
        <ul className="list-disc pl-5 text-xs text-indigo-800 dark:text-indigo-400 space-y-1">
          {useFinanceStore.getState().recurringTemplates.map((t) => (
            <li key={t.id}>
              <strong>{t.description}</strong>: R$ {t.amount} (Seção: {t.section})
            </li>
          ))}
          {useFinanceStore.getState().recurringTemplates.length === 0 && (
            <li>Nenhuma despesa recorrente cadastrada no store.</li>
          )}
        </ul>
      </div>

      <AlertBanner monthKey={currentMonthKey} />

      <SummaryCards monthKey={currentMonthKey} />

      <PendingSummaryCard monthKey={currentMonthKey} />

      <CardCashFlowPanel monthKey={currentMonthKey} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CashFlowMiniChart monthKey={currentMonthKey} />
        <DailySpendingPace monthKey={currentMonthKey} />
      </div>

      <IncomeExpenseTimeline monthKey={currentMonthKey} />

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
