import { useCallback, useEffect, useRef, useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { useAppStore } from '../../store/app.store'
import { ResizeHandle } from '../shared/ResizeHandle'

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const [initialized, setInitialized] = useState(false)
  const [connected, setConnected] = useState(false)
  const [exited, setExited] = useState(false)
  const [height, setHeight] = useState(200)
  const setTerminalVisible = useAppStore((s) => s.setTerminalVisible)
  const currentProject = useAppStore((s) => s.currentProject)

  // Lazy load xterm.js + connect to PTY
  useEffect(() => {
    let mounted = true
    const cleanups: (() => void)[] = []

    async function initTerminal() {
      if (terminalRef.current || !containerRef.current) return

      try {
        const { Terminal } = await import('@xterm/xterm')
        const { FitAddon } = await import('@xterm/addon-fit')
        const { WebLinksAddon } = await import('@xterm/addon-web-links')

        if (!mounted || !containerRef.current) return

        // Import xterm CSS
        if (!document.querySelector('link[data-xterm-css]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'node_modules/@xterm/xterm/css/xterm.css'
          link.setAttribute('data-xterm-css', 'true')
          document.head.appendChild(link)
        }

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

        terminalRef.current = terminal
        setInitialized(true)

        // Forward keystrokes to PTY
        terminal.onData((data: string) => {
          window.electronAPI.sendTerminalInput?.(data)
        })

        // Receive PTY output
        const cleanupData = window.electronAPI.onTerminalData?.((payload) => {
          terminal.write(payload.data)
        })
        if (cleanupData) cleanups.push(cleanupData)

        // Handle PTY exit
        const cleanupExit = window.electronAPI.onTerminalExited?.(() => {
          setConnected(false)
          setExited(true)
          terminal.writeln('')
          terminal.writeln('\x1b[38;2;248;113;113m  Shell exited. Press the restart button to relaunch.\x1b[0m')
        })
        if (cleanupExit) cleanups.push(cleanupExit)

        // Handle PTY errors
        const cleanupError = window.electronAPI.onTerminalError?.((payload) => {
          terminal.writeln('')
          terminal.writeln(`\x1b[38;2;248;113;113m  ${payload.message}\x1b[0m`)
        })
        if (cleanupError) cleanups.push(cleanupError)

        // Start PTY
        const cols = terminal.cols
        const rows = terminal.rows
        const success = await window.electronAPI.startTerminal?.(cols, rows, currentProject || undefined)
        if (success) {
          setConnected(true)
          setExited(false)
        } else {
          terminal.writeln('\x1b[38;2;124;106;247m  Claudette Terminal\x1b[0m')
          terminal.writeln('\x1b[38;2;75;82;99m  Terminal unavailable — node-pty not loaded.\x1b[0m')
        }
      } catch (err) {
        console.error('Failed to initialize terminal:', err)
      }
    }

    initTerminal()

    return () => {
      mounted = false
      cleanups.forEach((fn) => fn())
      terminalRef.current?.dispose()
      terminalRef.current = null
      window.electronAPI.killTerminal?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Resize terminal on container size change
  useEffect(() => {
    if (fitAddonRef.current && initialized) {
      try {
        fitAddonRef.current.fit()
        if (connected && terminalRef.current) {
          const { cols, rows } = terminalRef.current
          window.electronAPI.resizeTerminal?.(cols, rows)
        }
      } catch {
        // ignore fit errors during transitions
      }
    }
  }, [height, initialized, connected])

  const handleResize = useCallback((delta: number) => {
    setHeight((h) => Math.max(100, Math.min(600, h - delta)))
  }, [])

  const handleRestart = useCallback(async () => {
    if (!terminalRef.current) return
    const terminal = terminalRef.current
    terminal.clear()
    setExited(false)
    const cols = terminal.cols
    const rows = terminal.rows
    const success = await window.electronAPI.startTerminal?.(cols, rows, currentProject || undefined)
    if (success) {
      setConnected(true)
    }
  }, [currentProject])

  return (
    <div style={{ height }}>
      <ResizeHandle direction="vertical" onResize={handleResize} />

      {/* Header */}
      <div className="h-7 px-3 flex items-center justify-between bg-bg-surface">
        <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Terminal</span>
        <div className="flex items-center gap-1">
          {exited && (
            <button
              onClick={handleRestart}
              className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text-primary rounded transition-colors"
              aria-label="Restart terminal"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => {
              window.electronAPI.killTerminal?.()
              setTerminalVisible(false)
            }}
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
