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
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-gray-500 text-sm select-none">{prefix}</span>
          )}
          <input
            ref={ref}
            className={`w-full border rounded-lg text-sm transition-colors outline-none
              ${prefix ? 'pl-8' : 'px-3'} py-2
              ${error
                ? 'border-red-400 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                : 'border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'
              }
              disabled:bg-gray-50 disabled:text-gray-400
              ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
        {helper && !error && <span className="text-xs text-gray-500">{helper}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
