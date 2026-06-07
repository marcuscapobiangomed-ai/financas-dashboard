interface RecurringFieldsProps {
  isRecurring: boolean
  setIsRecurring: (v: boolean) => void
  recurringEndMonth: string
  setRecurringEndMonth: (v: string) => void
}

export function RecurringFields({
  isRecurring,
  setIsRecurring,
  recurringEndMonth,
  setRecurringEndMonth,
}: RecurringFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Recorrente</span>
      </label>
      {isRecurring && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Até quando? (opcional)</label>
          <input
            type="month"
            className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            value={recurringEndMonth}
            onChange={(e) => setRecurringEndMonth(e.target.value)}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {recurringEndMonth
              ? `Repete todo mês até ${recurringEndMonth}`
              : 'Repete todo mês indefinidamente'}
          </p>
        </div>
      )}
    </div>
  )
}
