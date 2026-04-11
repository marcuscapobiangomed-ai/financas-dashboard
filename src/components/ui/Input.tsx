import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, prefix, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-gray-500 dark:text-gray-400 text-sm select-none">{prefix}</span>
          )}
          <input
            ref={ref}
            className={`input-glass ${prefix ? 'pl-8' : 'px-3'} ${error ? '!border-red-400 !focus:ring-red-400/50' : ''} disabled:opacity-50 ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
        {helper && !error && <span className="text-xs text-gray-500 dark:text-gray-400">{helper}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
