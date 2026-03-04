import { ReactNode } from 'react'
import { PiggyBank } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="text-gray-300">
        {icon ?? <PiggyBank size={48} />}
      </div>
      <p className="font-semibold text-gray-600">{title}</p>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
