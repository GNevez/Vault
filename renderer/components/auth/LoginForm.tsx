import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Gamepad2, User, Lock, Eye, EyeOff, Check, Chrome, CircleCheck, CircleX } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading, errorMsg } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Login successful!', { icon: <CircleCheck className="w-5 h-5 text-black" /> })
      router.push('/dashboard')
    } catch {
      toast.error('Login failed. Check your credentials.', { icon: <CircleX className="w-5 h-5 text-black" /> })
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
          Vault
        </h1>
        <p className="text-xs font-medium text-zinc-400 tracking-[0.2em] uppercase">
          Define Reality
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="group">
          <Input 
            icon={<User className="w-4 h-4 transition-colors group-focus-within:text-zinc-100" />}
            id="email" 
            name="email" 
            placeholder="Username" 
            type="text"
            required
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="button"
            className="absolute inset-y-0 right-3 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 pb-2">
          <div className="flex items-center">
            <input 
              className="h-4 w-4 appearance-none bg-background-dark border border-zinc-800 rounded checked:bg-white checked:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark cursor-pointer transition-colors peer" 
              id="remember-me" 
              name="remember-me" 
              type="checkbox"
            />
            <Check 
              className="absolute w-3 h-3 text-background-dark pointer-events-none opacity-0 peer-checked:opacity-100" 
              style={{ left: '0.125rem', top: '0.125rem' }}
              strokeWidth={4} 
            />
            <label className="ml-2 block text-xs text-zinc-400 font-medium cursor-pointer" htmlFor="remember-me">
              Remember me
            </label>
          </div>
          <a className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors" href="#">
            Forgot password?
          </a>
        </div>

        {errorMsg && (
          <div className="text-xs text-red-500 font-medium text-center">
            {errorMsg}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Sign In
        </Button>
      </form>

      <div className="relative mt-8 mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-900"></div>
        </div>
        <div className="relative flex justify-center text-[10px]">
          <span className="px-2 bg-background-dark text-zinc-500 uppercase tracking-widest font-medium">
            Or continue with
          </span>
        </div>
      </div>

      <Button variant="outline" type="button" className="w-full gap-2 text-zinc-300">
        <Chrome className="h-4 w-4 opacity-70" />
        Google
      </Button>

      <p className="mt-8 text-center text-xs text-zinc-500">
        No account?{' '}
        <button 
          onClick={onSwitchToRegister}
          className="font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer" type="button">
          Create one now
        </button>
      </p>
    </div>
  )
}
