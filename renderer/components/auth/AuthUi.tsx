import React, { forwardRef, useEffect, useState } from 'react'
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { HERO_GAMES, heroOf, type FeaturedGame } from '../../lib/featured-games'
import { WindowControls } from '../ui/TitleBar'
import { BrandLogo, Slogan } from '../ui/Brand'

const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

/**
 * Frame for the sign-in window (460 × 680, frameless): window controls, a quiet backdrop
 * taken from a featured game, the wordmark and the form. Content scrolls if it outgrows the window.
 */
/** `compact` shrinks the brand block so the longer sign-up form fits the window without scrolling. */
export function AuthLayout({ children, footer, compact = false }: { children: React.ReactNode; footer: React.ReactNode; compact?: boolean }) {
  const [backdrop, setBackdrop] = useState<FeaturedGame | null>(null)
  const [loaded, setLoaded] = useState(false)
  // Picked on the client so the static export renders the same markup everywhere.
  useEffect(() => { setBackdrop(HERO_GAMES[Math.floor(Math.random() * HERO_GAMES.length)]) }, [])

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background-dark">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[340px] overflow-hidden">
        {backdrop && <img src={heroOf(backdrop)} alt="" draggable={false} onLoad={() => setLoaded(true)}
          className={`h-full w-full scale-105 object-cover blur-[2px] transition-opacity duration-1000 ${loaded ? 'opacity-40' : 'opacity-0'}`} />}
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/40 via-background-dark/80 to-background-dark" />
        <div className="absolute -top-24 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <header className="relative z-10 flex h-10 shrink-0 items-center justify-end">
        <WindowControls maximize={false} />
      </header>

      <main className="vault-scroll relative z-10 min-h-0 flex-1 overflow-y-auto" style={noDrag}>
        <div className="mx-auto flex min-h-full w-full max-w-[344px] flex-col px-1 pb-5">
          <div className={`text-center transition-[padding] duration-300 ${compact ? 'pb-5 pt-1' : 'pb-8 pt-6'}`}>
            <BrandLogo className={`mx-auto w-auto drop-shadow-[0_6px_24px_rgba(212,162,78,0.18)] transition-[height] duration-300 ${compact ? 'h-14' : 'h-[84px]'}`} />
            <Slogan className={`font-medium tracking-[0.02em] text-zinc-400 ${compact ? 'mt-2 text-xs' : 'mt-4 text-[13px]'}`} />
          </div>
          {children}
          <div className={`mt-auto text-center text-[13px] text-zinc-500 ${compact ? 'pt-5' : 'pt-8'}`}>{footer}</div>
        </div>
      </main>
    </div>
  )
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className={subtitle ? 'mb-6' : 'mb-4'}>
      <h1 className="text-xl font-bold tracking-tight text-zinc-50">{title}</h1>
      {subtitle && <p className="mt-1 text-[13px] leading-5 text-zinc-500">{subtitle}</p>}
    </div>
  )
}

export type FieldStatus = { tone: 'error' | 'success' | 'hint' | 'pending'; text: string } | null

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  icon: React.ReactNode
  status?: FieldStatus
  /** Right-side control inside the input, e.g. the show-password toggle. */
  trailing?: React.ReactNode
}

/** Labelled input with a leading icon and one line of status (error, success, hint) announced to screen readers. */
export const AuthField = forwardRef<HTMLInputElement, FieldProps>(({ id, label, icon, status, trailing, className = '', ...props }, ref) => {
  const invalid = status?.tone === 'error'
  const messageId = `${id}-message`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-zinc-400">{label}</label>
      <div className="group relative">
        <span className={`pointer-events-none absolute inset-y-0 left-3 flex items-center transition-colors ${invalid ? 'text-red-400/80' : 'text-zinc-500 group-focus-within:text-accent'}`}>{icon}</span>
        <input
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={status ? messageId : undefined}
          className={`h-10 w-full rounded-md border bg-panel pl-10 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition ${trailing ? 'pr-11' : 'pr-3'} ${invalid ? 'border-red-500/60 focus:ring-2 focus:ring-red-500/15' : 'border-line hover:border-zinc-700 focus:border-accent/60 focus:ring-2 focus:ring-accent/15'} ${className}`}
          {...props}
        />
        {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
      </div>
      <div id={messageId} aria-live="polite" className={status ? 'pt-1' : ''}>
        {status && <p className={`flex items-center gap-1.5 text-xs ${{ error: 'text-red-400', success: 'text-emerald-400', hint: 'text-zinc-500', pending: 'text-zinc-500' }[status.tone]}`}>
          {status.tone === 'error' && <AlertCircle size={13} className="shrink-0" />}
          {status.tone === 'success' && <Check size={13} className="shrink-0" />}
          {status.tone === 'pending' && <Loader2 size={13} className="shrink-0 animate-spin" />}
          {status.text}
        </p>}
      </div>
    </div>
  )
})
AuthField.displayName = 'AuthField'

export function RevealButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible}
      className="grid h-9 w-9 place-items-center rounded-md text-zinc-500 transition hover:bg-raised hover:text-zinc-200 focus-visible:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}

/** Tracks Caps Lock from key events on the password field. */
export function useCapsLock() {
  const [on, setOn] = useState(false)
  const track = (e: React.KeyboardEvent<HTMLInputElement>) => setOn(e.getModifierState?.('CapsLock') ?? false)
  return { capsLock: on, onKeyDown: track, onKeyUp: track, onBlur: () => setOn(false) }
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="vault-rise mb-4 flex items-start gap-2.5 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[13px] leading-5 text-red-300">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />{children}
    </div>
  )
}

export function SubmitButton({ busy, children, busyLabel }: { busy: boolean; children: React.ReactNode; busyLabel: string }) {
  return (
    <button type="submit" disabled={busy} aria-busy={busy}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-ink shadow-[0_8px_24px_-10px_rgba(212,162,78,0.55)] transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark active:translate-y-px disabled:cursor-wait disabled:opacity-80">
      {busy ? <><Loader2 size={16} className="animate-spin" />{busyLabel}</> : children}
    </button>
  )
}
