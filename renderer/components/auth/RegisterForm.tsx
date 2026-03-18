import React, { useState } from 'react'
import { Gamepad2, User, Lock, Eye, EyeOff, Mail, CircleCheck, CircleX, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState('')
  const { register, isLoading, errorMsg } = useAuth()

  const evaluatePasswordStrength = (pass: string) => {
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++
    return score
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (evaluatePasswordStrength(password) < 3) {
      setValidationError('Password is too weak. Must contain at least 8 characters, one uppercase, and one number/special character.')
      toast.warning('Password too weak', { icon: <AlertTriangle className="w-5 h-5 text-black" /> })
      return
    }

    try {
      await register(email, username, password)
      toast.success('Registration successful! Please login.', { icon: <CircleCheck className="w-5 h-5 text-black" /> })
      onSwitchToLogin()
    } catch {
      toast.error('Registration failed. Username or email might be taken.', { icon: <CircleX className="w-5 h-5 text-black" /> })
    }
  }

  return (
    <div 
      className="w-full relative min-h-full max-w-[320px] mx-auto flex flex-col justify-center"
      style={{ WebkitAppRegion: 'no-drag' } as any}
    >
      <div className="text-center mb-10 mt-10">
        <div className="flex justify-center mb-6">
          <Gamepad2 className="w-16 h-16 text-zinc-100 drop-shadow-lg" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-3xl font-black text-zinc-50 tracking-tight mb-2 uppercase">
          Join Vault
        </h1>
        <p className="text-xs font-medium text-zinc-400 tracking-[0.2em] uppercase">
          Define Reality
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="group">
          <Input 
            icon={<Mail className="w-4 h-4 transition-colors group-focus-within:text-zinc-100" />}
            id="email" 
            name="email" 
            placeholder="Email Address" 
            type="email"
            required
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="group">
          <Input 
            icon={<User className="w-4 h-4 transition-colors group-focus-within:text-zinc-100" />}
            id="username" 
            name="username" 
            placeholder="Username" 
            type="text"
            required
            className="h-11"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="group relative">
          <Input 
            icon={<Lock className="w-4 h-4 transition-colors group-focus-within:text-zinc-100" />}
            id="password" 
            name="password" 
            placeholder="Password" 
            type={showPassword ? 'text' : 'password'}
            required
            className="h-11 pr-10"
            value={password}
            onChange={(e) => {
                setPassword(e.target.value)
                setValidationError('')
            }}
          />
          <button 
            type="button"
            className="absolute inset-y-0 right-3 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {(validationError || errorMsg) && (
          <div className="text-xs text-red-500 font-medium text-center">
            {validationError || errorMsg}
          </div>
        )}

        <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      <div className="relative mt-8 mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-900"></div>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-zinc-500">
        Already have an account?{' '}
        <button 
          onClick={onSwitchToLogin}
          className="font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer" type="button">
          Sign In
        </button>
      </p>
    </div>
  )
}
