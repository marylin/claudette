import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.isMaximized().then(setIsMaximized)
    const cleanup = window.electronAPI.onMaximizeChange(setIsMaximized)
    return () => {
      cleanup()
    }
  }, [])

  return (
    <div className="h-title-bar bg-bg-base border-b border-border flex items-center justify-between drag-region shrink-0">
      {/* App title */}
      <div className="flex items-center gap-2 pl-3">
        <div className="w-4 h-4 rounded bg-accent flex items-center justify-center">
          <span className="text-[9px] font-bold text-text-primary leading-none">C</span>
        </div>
        <span className="text-xs font-medium text-text-secondary">Claudette</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center no-drag">
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="h-title-bar w-11 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          aria-label="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="h-title-bar w-11 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="h-title-bar w-11 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-error transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
