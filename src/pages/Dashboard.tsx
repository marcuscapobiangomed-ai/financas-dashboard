import { useFinanceStore } from '../store/useFinanceStore'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { PendingSummaryCard } from '../components/dashboard/PendingSummaryCard'
import { BudgetProgressBars } from '../components/dashboard/BudgetProgressBars'
import { AlertBanner } from '../components/dashboard/AlertBanner'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'
import { CardCashFlowPanel } from '../components/dashboard/CardCashFlowPanel'
import { DailySpendingPace } from '../components/dashboard/DailySpendingPace'
import { daysRemainingInMonth } from '../utils/calculations'
import { getMonthLabel, getCurrentMonthKey } from '../constants/months'

export function Dashboard() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-outfit text-gray-900 dark:text-gray-100">
            {getMonthLabel(currentMonthKey)}
          </h1>
          {currentMonthKey === getCurrentMonthKey() && (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
              {daysRemainingInMonth()} dias restantes no mês
            </p>
          )}
        </div>
      </div>

      {/* Alertas — só aparece quando há problema */}
      <AlertBanner monthKey={currentMonthKey} />

      {/*
        Layout: coluna principal (3/4) + sidebar (1/4)
        xl ≥1280px: 4 colunas (3 main + 1 sidebar)
        lg ≥1024px: 3 colunas (2 main + 1 sidebar)
        < lg: coluna única empilhada
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* ── Coluna Principal ───────────────────────────── */}
        <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-6">

          {/* 1. Números do mês: saldo acumulado + 4 cards */}
          <SummaryCards monthKey={currentMonthKey} />

          {/* 2. Orçamento por seção — limites configurados */}
          <BudgetProgressBars monthKey={currentMonthKey} />

          {/* 3. Ritmo de gastos + Cartões & Faturas lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DailySpendingPace monthKey={currentMonthKey} />
            <CardCashFlowPanel monthKey={currentMonthKey} />
          </div>
        </div>

        {/* ── Sidebar Direita ────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <PendingSummaryCard monthKey={currentMonthKey} />
          <RecentTransactions monthKey={currentMonthKey} />
        </div>
      </div>
    </div>
  )
}
