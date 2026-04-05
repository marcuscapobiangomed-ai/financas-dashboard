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

  let barColor = ''
  let glow = ''

  if (isOver) {
    barColor = 'bg-gradient-to-r from-red-600 to-red-400'
    glow = 'shadow-[0_0_10px_rgba(239,68,68,0.6)]'
  } else if (isWarning) {
    barColor = 'bg-gradient-to-r from-amber-600 to-yellow-400'
    glow = 'shadow-[0_0_10px_rgba(245,158,11,0.6)]'
  } else {
    barColor = 'bg-gradient-to-r from-emerald-600 to-teal-400'
    glow = 'shadow-[0_0_10px_rgba(16,185,129,0.5)]'
  }

  const trackColor = isOver ? 'bg-red-100 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20' : 'bg-gray-200/50 dark:bg-gray-700/50 border border-black/5 dark:border-white/5'

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${trackColor} rounded-full overflow-hidden ${height === 'sm' ? 'h-1.5' : 'h-2.5'} backdrop-blur-sm`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor} ${glow}`}
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
