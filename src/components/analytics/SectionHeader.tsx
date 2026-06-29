import { ReactNode } from 'react'

interface SectionHeaderProps {
  icon: ReactNode
  title: string
  subtitle: string
}

export function SectionHeader({ icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 pt-2 pb-1">
      <div className="mt-0.5 text-indigo-500 dark:text-indigo-400 shrink-0">{icon}</div>
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  )
}
