import { Zap } from 'lucide-react'
import { TransactionForm } from '../components/forms/TransactionForm'
import { useFinanceStore } from '../store/useFinanceStore'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'

export function QuickEntry() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-2">
        <Zap size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Lançamento Rápido</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-obsidian rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-xl p-6">
          <TransactionForm showSaveAndNew />
        </div>
        <RecentTransactions monthKey={currentMonthKey} />
      </div>
    </div>
  )
}
