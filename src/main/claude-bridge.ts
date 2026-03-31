import { spawn, ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import { getSettings } from './settings'
import { getMainWindow } from './index'
import type { ClaudeStatus } from '../shared/types'

let claudeProcess: ChildProcess | null = null
let currentStatus: ClaudeStatus = { status: 'idle' }

export function sendMessage(message: string, sessionId?: string): void {
  const settings = getSettings()
  const claudePath = settings.claudePath || 'claude'

  if (claudeProcess) {
    stopClaude()
  }

  const args: string[] = []

  if (settings.autoAcceptPermissions) {
    args.push('--dangerously-skip-permissions')
  }

  if (sessionId) {
    args.push('--resume', sessionId)
  }

  args.push('--prompt', message)

  const isWin = process.platform === 'win32'

  if (isWin) {
    claudeProcess = spawn('cmd', ['/c', claudePath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
  } else {
    claudeProcess = spawn(claudePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  }

  updateStatus({ status: 'running' })

  const stdout = createInterface({ input: claudeProcess.stdout! })
  const stderr = createInterface({ input: claudeProcess.stderr! })

  let outputBuffer = ''
  let flushTimer: NodeJS.Timeout | null = null

  function flushOutput() {
    if (outputBuffer) {
      sendOutput(outputBuffer, 'stdout')
      outputBuffer = ''
    }
    flushTimer = null
  }

  stdout.on('line', (line) => {
    if (isPermissionPrompt(line)) {
      flushOutput()
      updateStatus({ status: 'waiting-permission', message: line })
      sendOutput(line, 'system')
      return
    }

    outputBuffer += (outputBuffer ? '\n' : '') + line

    if (!flushTimer) {
      flushTimer = setTimeout(flushOutput, 16)
    }
  })

  stderr.on('line', (line) => {
    sendOutput(line, 'stderr')
  })

  claudeProcess.on('close', (code) => {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushOutput()
    }

    claudeProcess = null
    updateStatus({
      status: code === 0 ? 'idle' : 'error',
      message: code !== 0 ? `Process exited with code ${code}` : undefined,
    })
  })

  claudeProcess.on('error', (err) => {
    claudeProcess = null
    updateStatus({ status: 'error', message: err.message })
    sendOutput(`Error: ${err.message}`, 'system')
  })
}

export function sendMessageWithAgent(
  agentSystemPrompt: string,
  prompt: string,
  sessionId?: string
): void {
  const fullPrompt = `[System instructions for this agent]\n${agentSystemPrompt}\n\n[User prompt]\n${prompt}`
  sendMessage(fullPrompt, sessionId)
}

export function stopClaude(): void {
  if (claudeProcess) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(claudeProcess.pid), '/f', '/t'], {
        windowsHide: true,
      })
    } else {
      claudeProcess.kill('SIGTERM')
    }
    claudeProcess = null
    updateStatus({ status: 'idle' })
  }
}

export function getClaudeStatus(): ClaudeStatus {
  return currentStatus
}

function sendOutput(text: string, type: 'stdout' | 'stderr' | 'system'): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('claude:output', { text, type })
  }
}

function updateStatus(status: ClaudeStatus): void {
  currentStatus = status
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('claude:status', status)
  }
}

function isPermissionPrompt(line: string): boolean {
  const patterns = [
    /Do you want to allow/i,
    /Allow this action/i,
    /Permission required/i,
    /\[Y\/n\]/i,
    /\[y\/N\]/i,
  ]
  return patterns.some((p) => p.test(line))
}
