import React, { useEffect, useRef, useState } from 'react'
import { AtSign, Check, KeyRound, Lock, Mail } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useAuth, type AuthField as FieldName } from '../../hooks/useAuth'
import { AuthField, AuthHeading, FormAlert, RevealButton, SubmitButton, useCapsLock, type FieldStatus } from './AuthUi'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME = /^[A-Za-z0-9_.]{3,32}$/
const USERNAME_RULE = 'De 3 a 32 caracteres: letras, números, _ ou ponto.'

// Mirrors AuthRules.PasswordProblem on the API (char.IsLetter ≈ \p{L}, so accented letters count as letters).
const LETTER = new RegExp('\\p{L}', 'u')
const NON_LETTER = new RegExp('[^\\p{L}]', 'u')
const RULES = [
  { label: '8+ caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Uma letra', test: (p: string) => LETTER.test(p) },
  { label: 'Um número ou símbolo', test: (p: string) => NON_LETTER.test(p) },
]
const STRENGTH = [
  { label: 'Muito fraca', bar: 'bg-red-500' },
  { label: 'Fraca', bar: 'bg-red-400' },
  { label: 'Razoável', bar: 'bg-amber-400' },
  { label: 'Boa', bar: 'bg-accent' },
  { label: 'Forte', bar: 'bg-emerald-400' },
]
function strengthOf(p: string) {
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++
  return RULES.every(r => r.test(p)) ? Math.max(score, 1) : Math.min(score, 1)
}

type Availability = { state: 'idle' | 'checking' | 'available' | 'taken'; message?: string; for?: string }

interface Props { onSuccess: () => void }

export function RegisterForm({ onSuccess }: Props) {
  const [values, setValues] = useState({ email: '', username: '', password: '', confirm: '' })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' })
  const { register, isLoading, failure, clearFailure } = useAuth()
  const caps = useCapsLock()
  const refs = { email: useRef<HTMLInputElement>(null), username: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null), confirm: useRef<HTMLInputElement>(null) }

  useEffect(() => { refs.email.current?.focus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Live username availability, debounced; stale answers are ignored via `for`.
  const username = values.username.trim()
  useEffect(() => {
    if (!USERNAME.test(username)) { setAvailability({ state: 'idle' }); return }
    setAvailability({ state: 'checking', for: username })
    const timer = setTimeout(async () => {
      try {
        const result = await apiFetch(`/api/Auth/username-available?username=${encodeURIComponent(username)}`)
        setAvailability(a => a.for === username ? { state: result.available ? 'available' : 'taken', message: result.message, for: username } : a)
      } catch {
        setAvailability(a => a.for === username ? { state: 'idle' } : a)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [username])

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(v => ({ ...v, [field]: e.target.value }))
    if (failure) clearFailure()
  }
  const touch = (field: string) => () => setTouched(t => ({ ...t, [field]: true }))

  const problems = {
    email: !values.email.trim() ? 'Informe seu e-mail.' : !EMAIL.test(values.email.trim()) ? 'Informe um e-mail válido.' : '',
    username: !username ? 'Escolha um nome de usuário.' : !USERNAME.test(username) ? USERNAME_RULE : availability.state === 'taken' ? availability.message ?? 'Este nome de usuário já está em uso.' : '',
    password: !values.password ? 'Crie uma senha.' : RULES.some(r => !r.test(values.password)) ? 'A senha ainda não atende aos requisitos.' : '',
    confirm: !values.confirm ? 'Confirme sua senha.' : values.confirm !== values.password ? 'As senhas não conferem.' : '',
  }
  // Server-side conflicts (e.g. e-mail already registered) land on their field.
  const serverError = (field: FieldName) => failure?.field === field ? failure.message : ''
  const shown = (field: keyof typeof problems) => (touched[field] && problems[field]) || serverError(field as FieldName)

  const usernameStatus: FieldStatus = shown('username') ? { tone: 'error', text: shown('username') }
    : availability.state === 'checking' ? { tone: 'pending', text: 'Verificando disponibilidade…' }
    : availability.state === 'available' ? { tone: 'success', text: 'Disponível.' }
    : { tone: 'hint', text: USERNAME_RULE }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, username: true, password: true, confirm: true })
    const firstInvalid = (Object.keys(problems) as (keyof typeof problems)[]).find(field => problems[field])
    if (firstInvalid) { refs[firstInvalid].current?.focus(); return }
    if (await register(values.email, username, values.password)) onSuccess()
  }

  // A conflict reported by the server moves focus to the field it belongs to.
  useEffect(() => {
    if (failure?.field === 'email' || failure?.field === 'username' || failure?.field === 'password') refs[failure.field].current?.focus()
  }, [failure]) // eslint-disable-line react-hooks/exhaustive-deps

  const strength = strengthOf(values.password)
  const generalFailure = failure && !failure.field ? failure.message : ''

  return (
    <form onSubmit={handleSubmit} noValidate className="vault-rise">
      <AuthHeading title="Crie sua conta" />

      {generalFailure && <FormAlert>{generalFailure}</FormAlert>}

      <div className="space-y-3">
        <AuthField ref={refs.email} id="register-email" label="E-mail" icon={<Mail size={16} />} type="email" autoComplete="email" spellCheck={false}
          value={values.email} onChange={set('email')} onBlur={touch('email')}
          status={shown('email') ? { tone: 'error', text: shown('email') } : null} />

        <AuthField ref={refs.username} id="register-username" label="Nome de usuário" icon={<AtSign size={16} />} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={32}
          value={values.username} onChange={set('username')} onBlur={touch('username')} status={usernameStatus} />

        <div>
          <AuthField ref={refs.password} id="register-password" label="Senha" icon={<Lock size={16} />} type={showPassword ? 'text' : 'password'} autoComplete="new-password" maxLength={128}
            value={values.password} onChange={set('password')}
            onKeyDown={caps.onKeyDown} onKeyUp={caps.onKeyUp} onBlur={() => { caps.onBlur(); touch('password')() }}
            status={serverError('password') ? { tone: 'error', text: serverError('password') } : caps.capsLock ? { tone: 'hint', text: 'Caps Lock está ativado.' } : null}
            trailing={<RevealButton visible={showPassword} onToggle={() => setShowPassword(v => !v)} />} />
          <PasswordMeter password={values.password} strength={strength} flagMissing={!!touched.password} />
        </div>

        <AuthField ref={refs.confirm} id="register-confirm" label="Confirmar senha" icon={<KeyRound size={16} />} type={showPassword ? 'text' : 'password'} autoComplete="new-password" maxLength={128}
          value={values.confirm} onChange={set('confirm')} onBlur={touch('confirm')}
          status={shown('confirm') ? { tone: 'error', text: shown('confirm') } : values.confirm && values.confirm === values.password ? { tone: 'success', text: 'As senhas conferem.' } : null} />
      </div>

      <div className="mt-5">
        <SubmitButton busy={isLoading} busyLabel="Criando conta…">Criar conta</SubmitButton>
      </div>
    </form>
  )
}

/** Strength bar with the required rules on one line; unmet rules turn red once the user tried to move on. */
function PasswordMeter({ password, strength, flagMissing }: { password: string; strength: number; flagMissing: boolean }) {
  const level = STRENGTH[strength]
  return (
    <div className="pt-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4].map(i => <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${password && i <= strength ? level.bar : 'bg-zinc-800'}`} />)}
        </div>
        <span className="w-16 text-right text-[11px] text-zinc-500">{password ? level.label : ''}</span>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {RULES.map(rule => {
          const ok = rule.test(password)
          const tone = ok ? 'text-emerald-400' : flagMissing ? 'text-red-400' : 'text-zinc-500'
          const ring = ok ? 'border-emerald-400 bg-emerald-400/15' : flagMissing ? 'border-red-400/70' : 'border-zinc-700'
          return <li key={rule.label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${tone}`}>
            <span className={`grid h-3 w-3 place-items-center rounded-full border transition-colors ${ring}`}>{ok && <Check size={8} strokeWidth={3.5} />}</span>
            {rule.label}<span className="sr-only">{ok ? ' — atendido' : ' — pendente'}</span>
          </li>
        })}
      </ul>
    </div>
  )
}
