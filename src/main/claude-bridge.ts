import { spawn, ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import { getSettings } from './settings'
import { getMainWindow } from './index'
import type { ClaudeStatus } from '../shared/types'

let claudeProcess: ChildProcess | null = null
let currentStatus: ClaudeStatus = { status: 'idle' }

// Slash commands handled entirely in the app (never sent to CLI)
type LocalCommandHandler = () => { output: string; action?: 'clear' }

const LOCAL_COMMANDS: Record<string, LocalCommandHandler> = {
  '/clear': () => ({ output: 'Conversation cleared.', action: 'clear' }),
  '/help': () => ({
    output: [
      '**Available Commands**',
      '',
      '`/clear` — Clear conversation history',
      '`/help` — Show this help',
      '`/cost` — Show token usage and cost',
      '`/status` — Show project status',
      '`/config` — Show current configuration',
      '`/doctor` — Check Claude Code health',
      '`/compact` — Compact conversation context',
      '`/review` — Review code changes',
      '`/test` — Run project tests',
      '`/commit` — Commit staged changes',
      '`/init` — Initialize CLAUDE.md',
      '`/login` — Switch account or log in',
      '`/logout` — Log out',
    ].join('\n'),
  }),
}

// Slash commands mapped to CLI subcommands/flags (spawned differently than -p)
interface CliCommandMapping {
  args: string[]  // CLI arguments to use instead of -p
  needsProject?: boolean
}

const CLI_COMMANDS: Record<string, CliCommandMapping> = {
  '/doctor':  { args: ['doctor'] },
  '/config':  { args: ['config', 'list'] },
  '/cost':    { args: ['-p', 'Show my token usage and cost for this session'] },
  '/status':  { args: ['-p', 'Show a brief project status summary'] },
  '/compact': { args: ['-p', 'Summarize our conversation so far in a compact form'] },
  '/review':  { args: ['-p', 'Review the current code changes (git diff) and provide feedback'] },
  '/test':    { args: ['-p', 'Run the project test suite and report results'] },
  '/commit':  { args: ['-p', 'Stage and commit the current changes with an appropriate commit message'] },
  '/init':    { args: ['-p', 'Initialize a CLAUDE.md file for this project with sensible defaults'] },
}

export function sendMessage(message: string, sessionId?: string): void {
  const trimmed = message.trim()
  const commandName = trimmed.split(/\s/)[0].toLowerCase()

  // Check for local-only commands first
  if (LOCAL_COMMANDS[commandName]) {
    const result = LOCAL_COMMANDS[commandName]()
    updateStatus({ status: 'running' })

    if (result.action === 'clear') {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('claude:command', { action: 'clear' })
      }
    }

    sendOutput(result.output, 'stdout')
    updateStatus({ status: 'idle' })
    return
  }

  // Check for CLI-mapped commands
  const cliMapping = CLI_COMMANDS[commandName]

  const settings = getSettings()
  const claudePath = settings.claudePath || 'claude'

  if (claudeProcess) {
    stopClaude()
  }

  let args: string[]

  if (cliMapping) {
    // Use the mapped CLI arguments
    args = [...cliMapping.args]
    if (settings.autoAcceptPermissions) {
      args.push('--dangerously-skip-permissions')
    }
  } else {
    // Normal message: flags first, positional message last
    args = ['-p']

    if (settings.autoAcceptPermissions) {
      args.push('--dangerously-skip-permissions')
    }

    if (sessionId) {
      args.push('--resume', sessionId)
    }

    // Message goes as positional argument (after all flags)
    args.push(trimmed)
  }

  spawnClaude(claudePath, args)
}

function spawnClaude(claudePath: string, args: string[]): void {
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
  return patterns.some(p => p.test(line))
}
