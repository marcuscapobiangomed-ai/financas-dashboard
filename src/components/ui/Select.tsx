import { SelectHTMLAttributes, ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export function Select({ label, error, children, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <select
        className={`w-full border rounded-lg text-sm px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors outline-none appearance-none cursor-pointer
          ${error
            ? 'border-red-400 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-400'
          }
          disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  )
}
