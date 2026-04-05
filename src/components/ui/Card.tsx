import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
  noPadding?: boolean
}

export function Card({ children, className = '', title, action, noPadding }: CardProps) {
  return (
    <div className={`glass-panel glass-panel-hover hover:-translate-y-0.5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
