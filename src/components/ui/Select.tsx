import { SelectHTMLAttributes, ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export function Select({ label, error, children, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={`w-full border rounded-lg text-sm px-3 py-2 bg-white transition-colors outline-none appearance-none cursor-pointer
          ${error
            ? 'border-red-400 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'
          }
          disabled:bg-gray-50 disabled:text-gray-400
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
