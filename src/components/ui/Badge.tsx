import { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100/80 text-gray-700 border border-gray-200/50 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700/50',
  success: 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
  warning: 'bg-yellow-100/80 text-yellow-700 border border-yellow-200/50 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800/40 shadow-[0_0_8px_rgba(234,179,8,0.15)]',
  danger: 'bg-red-100/80 text-red-700 border border-red-200/50 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40 shadow-[0_0_8px_rgba(239,68,68,0.15)]',
  info: 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/50 dark:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-800/40 shadow-[0_0_8px_rgba(99,102,241,0.15)]',
  purple: 'bg-purple-100/80 text-purple-700 border border-purple-200/50 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800/40 shadow-[0_0_8px_rgba(168,85,247,0.15)]',
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
  style?: React.CSSProperties
}

export function Badge({ children, variant = 'default', className = '', style }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      style={style}
    >
      {children}
    </span>
  )
}
