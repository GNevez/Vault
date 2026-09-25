import React, { useId } from 'react';

export const fieldClass = 'w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-accent/60 disabled:opacity-50';

/** Page heading for one settings tab. */
export function SettingsPage({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-8 py-8">
    <h1 className="text-xl font-bold tracking-tight text-zinc-50">{title}</h1>
    {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
    <div className="mt-6 space-y-6">{children}</div>
  </div>;
}

/** A titled group of related settings. */
export function Section({ title, description, children, tone }: { title: string; description?: string; children: React.ReactNode; tone?: 'danger' }) {
  return <section className={`rounded-lg border bg-raised ${tone === 'danger' ? 'border-red-900/50' : 'border-line'}`}>
    <header className="border-b border-line px-5 py-3.5">
      <h2 className={`text-[13px] font-semibold ${tone === 'danger' ? 'text-red-400' : 'text-zinc-100'}`}>{title}</h2>
      {description && <p className="mt-0.5 text-xs leading-5 text-zinc-500">{description}</p>}
    </header>
    <div className="divide-y divide-line">{children}</div>
  </section>;
}

/** One setting: label and help on the left, the control on the right (or below with `stacked`). */
export function Row({ label, description, children, stacked, htmlFor }: { label: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; stacked?: boolean; htmlFor?: string }) {
  const text = <div className="min-w-0 flex-1">
    {htmlFor ? <label htmlFor={htmlFor} className="text-[13px] font-medium text-zinc-200">{label}</label> : <p className="text-[13px] font-medium text-zinc-200">{label}</p>}
    {description && <p className="mt-0.5 text-xs leading-5 text-zinc-500">{description}</p>}
  </div>;
  return <div className="px-5 py-4">
    {stacked ? <>{text}<div className="mt-3">{children}</div></> : <div className="flex items-center gap-6">{text}{children && <div className="shrink-0">{children}</div>}</div>}
  </div>;
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-40 ${checked ? 'bg-accent' : 'bg-zinc-700'}`}>
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
  </button>;
}

/** Toggle row: the whole label is clickable through the switch's aria-label. */
export function ToggleRow({ label, description, checked, onChange, disabled }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <Row label={label} description={description}><Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} /></Row>;
}

export function Slider({ value, min, max, step, onChange, label, format }: { value: number; min: number; max: number; step: number; onChange: (value: number) => void; label: string; format: (value: number) => string }) {
  const id = useId();
  return <div className="flex items-center gap-4">
    <input id={id} type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="h-1 w-full cursor-pointer accent-[#d4a24e]" />
    <output htmlFor={id} className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-400">{format(value)}</output>
  </div>;
}

export function Select({ value, onChange, options, label, disabled, id }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; label: string; disabled?: boolean; id?: string }) {
  return <select id={id} aria-label={label} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} className={`${fieldClass} cursor-pointer`}>
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}

export function Radio<T extends string>({ name, value, options, onChange, disabled }: { name: string; value: T; options: { value: T; label: string; description: string }[]; onChange: (value: T) => void; disabled?: boolean }) {
  return <div role="radiogroup" className="space-y-2">
    {options.map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 transition ${value === option.value ? 'border-accent/50 bg-accent/5' : 'border-line hover:bg-raised-hover'} ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="mt-0.5 accent-[#d4a24e]" />
      <span><span className="block text-[13px] font-medium text-zinc-200">{option.label}</span><span className="block text-xs leading-5 text-zinc-500">{option.description}</span></span>
    </label>)}
  </div>;
}

export const percent = (value: number) => `${Math.round(value * 100)}%`;
