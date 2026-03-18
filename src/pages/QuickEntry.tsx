import { Zap } from 'lucide-react'
import { TransactionForm } from '../components/forms/TransactionForm'
import { useFinanceStore } from '../store/useFinanceStore'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'

export function QuickEntry() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Zap size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Lançamento Rápido</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <TransactionForm showSaveAndNew />
      </div>

      <RecentTransactions monthKey={currentMonthKey} />
    </div>
  )
}
