import React, { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
    const variants = {
      primary: 'bg-zinc-50 text-zinc-900 hover:bg-zinc-50/90 shadow-sm',
      secondary: 'bg-zinc-800 text-zinc-50 hover:bg-zinc-800/80 shadow-sm',
      outline: 'border border-zinc-800 bg-transparent text-zinc-50 hover:bg-zinc-800 hover:text-zinc-50',
      ghost: 'hover:bg-zinc-800 hover:text-zinc-50 text-zinc-400',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} h-10 px-4 py-2 ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && children}
      </button>
    )
  }
)

Button.displayName = 'Button'
