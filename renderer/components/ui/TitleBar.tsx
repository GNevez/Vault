import React from 'react'
import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
  const handleMinimize = () => {
    window.ipc.send('window-minimize', null)
  }

  const handleMaximize = () => {
    window.ipc.send('window-maximize', null)
  }

  const handleClose = () => {
    window.ipc.send('window-close', null)
  }

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

      {/* Window Controls */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={handleMinimize}
          className="flex items-center justify-center w-12 h-full text-gray-400 hover:bg-surface-dark hover:text-white transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button 
          onClick={handleMaximize}
          className="flex items-center justify-center w-12 h-full text-gray-400 hover:bg-surface-dark hover:text-white transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleClose}
          className="flex items-center justify-center w-12 h-full text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
