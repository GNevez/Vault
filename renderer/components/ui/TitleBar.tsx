import React from 'react'
import { Minus, Square, X } from 'lucide-react'

/** Minimize / maximize / close for the frameless Electron window. */
export function WindowControls({ className = '' }: { className?: string }) {
  const button = 'flex items-center justify-center w-12 h-full text-zinc-500 hover:bg-white/5 hover:text-white transition-colors'
  return (
    <div className={`flex h-full ${className}`} style={{ WebkitAppRegion: 'no-drag' } as any}>
      <button aria-label="Minimizar" onClick={() => window.ipc?.send('window-minimize', null)} className={button}>
        <Minus className="w-4 h-4" />
      </button>
      <button aria-label="Maximizar" onClick={() => window.ipc?.send('window-maximize', null)} className={button}>
        <Square className="w-3.5 h-3.5" />
      </button>
      <button aria-label="Fechar" onClick={() => window.ipc?.send('window-close', null)} className={`${button} hover:bg-red-500`}>
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
