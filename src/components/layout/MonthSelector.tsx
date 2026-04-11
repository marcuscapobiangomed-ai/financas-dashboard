import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { prevMonthKey, nextMonthKey, getMonthLabel } from '../../constants/months'

export function MonthSelector() {
  const currentMonthKey = useFinanceStore((s) => s.currentMonthKey)
  const setCurrentMonthKey = useFinanceStore((s) => s.setCurrentMonthKey)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setCurrentMonthKey(prevMonthKey(currentMonthKey))}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[140px] text-center">
        {getMonthLabel(currentMonthKey)}
      </span>
      <button
        onClick={() => setCurrentMonthKey(nextMonthKey(currentMonthKey))}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
