import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { useAppStore } from '../../store/app.store'

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const [initialized, setInitialized] = useState(false)
  const [height, setHeight] = useState(200)
  const setTerminalVisible = useAppStore((s) => s.setTerminalVisible)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  // Lazy load xterm.js
  useEffect(() => {
    let mounted = true

    async function initTerminal() {
      if (terminalRef.current || !containerRef.current) return

      try {
        const { Terminal } = await import('@xterm/xterm')
        const { FitAddon } = await import('@xterm/addon-fit')
        const { WebLinksAddon } = await import('@xterm/addon-web-links')

        if (!mounted || !containerRef.current) return

        // Import xterm CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'node_modules/@xterm/xterm/css/xterm.css'
        document.head.appendChild(link)

        const fitAddon = new FitAddon()
        fitAddonRef.current = fitAddon

        const terminal = new Terminal({
          theme: {
            background: '#0d0f12',
            foreground: '#f1f3f8',
            cursor: '#7c6af7',
            cursorAccent: '#0d0f12',
            selectionBackground: '#7c6af740',
            black: '#0d0f12',
            brightBlack: '#4b5263',
            white: '#f1f3f8',
            brightWhite: '#f1f3f8',
            blue: '#60a5fa',
            brightBlue: '#93bbfc',
            cyan: '#22d3ee',
            brightCyan: '#67e8f9',
            green: '#4ade80',
            brightGreen: '#86efac',
            magenta: '#7c6af7',
            brightMagenta: '#9b8dfb',
            red: '#f87171',
            brightRed: '#fca5a5',
            yellow: '#fb923c',
            brightYellow: '#fdba74',
          },
          fontFamily: "'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 13,
          lineHeight: 1.4,
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 5000,
        })

        terminal.loadAddon(fitAddon)
        terminal.loadAddon(new WebLinksAddon())
        terminal.open(containerRef.current)
        fitAddon.fit()

        terminal.writeln('\x1b[38;2;124;106;247m  Claudette Terminal\x1b[0m')
        terminal.writeln('\x1b[38;2;75;82;99m  Type commands or use the chat panel above.\x1b[0m')
        terminal.writeln('')

        terminalRef.current = terminal
        setInitialized(true)
      } catch (err) {
        console.error('Failed to initialize terminal:', err)
      }
    }

    initTerminal()

    return () => {
      mounted = false
      terminalRef.current?.dispose()
      terminalRef.current = null
    }
  }, [])

  // Resize terminal on container size change
  useEffect(() => {
    if (fitAddonRef.current && initialized) {
      try {
        fitAddonRef.current.fit()
      } catch {
        // ignore fit errors during transitions
      }
    }
  }, [height, initialized])

  // Drag resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startHeight.current = height

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startY.current - e.clientY
      setHeight(Math.max(100, Math.min(600, startHeight.current + delta)))
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div style={{ height }}>
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1 cursor-ns-resize hover:bg-accent/30 transition-colors"
      />

      {/* Header */}
      <div className="h-7 px-3 flex items-center justify-between bg-bg-surface">
        <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Terminal</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTerminalVisible(false)}
            className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text-primary rounded transition-colors"
            aria-label="Close terminal"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal container */}
      <div ref={containerRef} className="flex-1 px-1" style={{ height: height - 36 }} />
    </div>
  )
}
