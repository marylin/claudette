import { getMainWindow } from './index'

// node-pty types
interface IPty {
  onData: (callback: (data: string) => void) => void
  onExit: (callback: (e: { exitCode: number }) => void) => void
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: () => void
  pid: number
}

let ptyProcess: IPty | null = null
let currentProjectPath: string | null = null

function getNodePty(): typeof import('node-pty') | null {
  try {
    // Dynamic require — node-pty is a native module that may fail to load
    return require('node-pty')
  } catch (err) {
    console.error('Failed to load node-pty:', err)
    return null
  }
}

export function spawnShell(projectPath: string, cols: number, rows: number): boolean {
  dispose()

  const pty = getNodePty()
  if (!pty) {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('terminal:error', {
        message: 'Terminal unavailable: node-pty failed to load. Native module may need rebuilding.',
      })
    }
    return false
  }

  const shell = process.platform === 'win32'
    ? 'powershell.exe'
    : (process.env.SHELL || 'bash')

  try {
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: projectPath,
      env: process.env as Record<string, string>,
    })
    currentProjectPath = projectPath

    ptyProcess.onData((data: string) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:data', { data })
      }
    })

    ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
      ptyProcess = null
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:exited', { exitCode })
      }
    })

    return true
  } catch (err) {
    console.error('Failed to spawn PTY:', err)
    ptyProcess = null
    return false
  }
}

export function writeToPty(data: string): void {
  ptyProcess?.write(data)
}

export function resizePty(cols: number, rows: number): void {
  try {
    ptyProcess?.resize(cols, rows)
  } catch {
    // Ignore resize errors (can happen during teardown)
  }
}

export function dispose(): void {
  if (ptyProcess) {
    try {
      ptyProcess.kill()
    } catch {
      // Already dead
    }
    ptyProcess = null
  }
}

export function setProject(projectPath: string): void {
  // Kill existing PTY — renderer will re-request a new one
  if (currentProjectPath !== projectPath) {
    dispose()
    currentProjectPath = projectPath
  }
}

export function isRunning(): boolean {
  return ptyProcess !== null
}
