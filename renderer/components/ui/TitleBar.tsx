import React, { useEffect, useState } from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'

/** Minimize / maximize / close for the frameless Electron window. */
export function WindowControls({ className = '', maximize = true }: { className?: string; maximize?: boolean }) {
  const [maximized, setMaximized] = useState(false)
  useEffect(() => {
    if (!maximize || !window.ipc) return
    window.ipc.invoke('window-state').then((s: any) => setMaximized(!!s?.maximized)).catch(() => {})
    return window.ipc.on('window-state', (s: any) => setMaximized(!!(s as { maximized?: boolean })?.maximized))
  }, [maximize])

  const button = 'flex items-center justify-center w-12 h-full text-zinc-500 hover:bg-white/5 hover:text-white transition-colors'
  return (
    <div className={`flex h-full ${className}`} style={{ WebkitAppRegion: 'no-drag' } as any}>
      <button aria-label="Minimizar" title="Minimizar" onClick={() => window.ipc?.send('window-minimize', null)} className={button}>
        <Minus className="w-4 h-4" />
      </button>
      {maximize && <button aria-label={maximized ? 'Restaurar' : 'Maximizar'} title={maximized ? 'Restaurar' : 'Maximizar'} onClick={() => window.ipc?.send('window-maximize', null)} className={button}>
        {maximized ? <Copy className="w-3.5 h-3.5 -scale-x-100" /> : <Square className="w-3.5 h-3.5" />}
      </button>}
      <button aria-label="Fechar" title="Fechar" onClick={() => window.ipc?.send('window-close', null)} className={`${button} hover:bg-red-500`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function TitleBar() {
  return (
    <div
      className="w-full h-8 shrink-0 flex items-center justify-between bg-background-dark border-b border-border-thin select-none z-50 rounded-t-[12px] overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* App Logo / Title */}
      <div className="flex items-center px-4">
        <span className="text-xs font-semibold text-gray-400 tracking-[0.1em] uppercase">
          VAULT
        </span>
      </div>

      <WindowControls />
    </div>
  )
}
