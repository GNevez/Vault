import React, { useEffect, useRef, useState } from 'react'
import { Lock, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { AuthField, AuthHeading, FormAlert, RevealButton, SubmitButton, useCapsLock, type FieldStatus } from './AuthUi'

interface Props {
  /** Pre-fills the identifier, e.g. after switching back from sign-up. */
  initialIdentifier?: string
  onSuccess: () => void
}

export function LoginForm({ initialIdentifier = '', onSuccess }: Props) {
  const [identifier, setIdentifier] = useState(initialIdentifier)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const { login, isLoading, failure, clearFailure } = useAuth()
  const caps = useCapsLock()
  const identifierRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => { (initialIdentifier ? passwordRef : identifierRef).current?.focus() }, [initialIdentifier])

  const identifierStatus: FieldStatus = submitted && !identifier.trim() ? { tone: 'error', text: 'Informe seu usuário ou e-mail.' } : null
  const passwordStatus: FieldStatus = submitted && !password
    ? { tone: 'error', text: 'Informe sua senha.' }
    : caps.capsLock ? { tone: 'hint', text: 'Caps Lock está ativado.' } : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!identifier.trim()) { identifierRef.current?.focus(); return }
    if (!password) { passwordRef.current?.focus(); return }
    if (await login(identifier, password, remember)) { onSuccess(); return }
    // Wrong credentials: keep the identifier, clear and refocus the password.
    setPassword(''); setSubmitted(false)
    passwordRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="vault-rise">
      <AuthHeading title="Bem-vindo de volta" subtitle="Entre para continuar de onde parou." />

      {failure && <FormAlert>{failure.message}</FormAlert>}

      <div className="space-y-3">
        <AuthField
          ref={identifierRef}
          id="login-identifier"
          label="Usuário ou e-mail"
          icon={<User size={16} />}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={identifier}
          status={identifierStatus}
          onChange={e => { setIdentifier(e.target.value); if (failure) clearFailure() }}
        />
        <AuthField
          ref={passwordRef}
          id="login-password"
          label="Senha"
          icon={<Lock size={16} />}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          status={passwordStatus}
          onChange={e => { setPassword(e.target.value); if (failure) clearFailure() }}
          onKeyDown={caps.onKeyDown}
          onKeyUp={caps.onKeyUp}
          onBlur={caps.onBlur}
          trailing={<RevealButton visible={showPassword} onToggle={() => setShowPassword(v => !v)} />}
        />
      </div>

      <label className="mb-6 mt-4 flex w-fit cursor-pointer select-none items-center gap-2.5 text-[13px] text-zinc-400 hover:text-zinc-200">
        <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-line accent-[#d4a24e]" />
        Manter conectado
      </label>

      <SubmitButton busy={isLoading} busyLabel="Entrando…">Entrar</SubmitButton>
    </form>
  )
}
