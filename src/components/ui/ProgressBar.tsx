interface ProgressBarProps {
  value: number  // 0-100+
  limit?: number
  showLabel?: boolean
  height?: 'sm' | 'md'
  alertThreshold?: number
}

export function ProgressBar({ value, showLabel, height = 'sm', alertThreshold = 80 }: ProgressBarProps) {
  const capped = Math.min(value, 100)
  const isOver = value > 100
  const isWarning = !isOver && value >= alertThreshold

  const barColor = isOver
    ? 'bg-red-500'
    : isWarning
    ? 'bg-yellow-400'
    : 'bg-emerald-500'

  const trackColor = isOver ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${trackColor} rounded-full overflow-hidden ${height === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${capped}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium min-w-[36px] text-right ${isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-500 dark:text-gray-400'}`}>
          {value.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
