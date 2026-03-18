import React, { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, icon, type, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3 text-zinc-500 flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          className={`
            flex h-10 w-full rounded-md border border-zinc-800 bg-background-dark px-3 py-2 text-sm 
            ring-offset-background-dark file:border-0 file:bg-transparent file:text-sm file:font-medium 
            placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 
            focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
            transition-colors duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'
