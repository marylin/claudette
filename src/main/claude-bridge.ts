import { spawn, ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import { getSettings } from './settings'
import { getMainWindow } from './index'
import type { ClaudeStatus } from '../shared/types'

let claudeProcess: ChildProcess | null = null
let currentStatus: ClaudeStatus = { status: 'idle' }
let currentSessionId: string | null = null

// Track streamed text so we can emit only new deltas
let lastEmittedTextLength = 0
let lastEmittedToolIds = new Set<string>()

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
  args: string[]
  useStreamJson?: boolean  // some subcommands don't support --output-format
}

const CLI_COMMANDS: Record<string, CliCommandMapping> = {
  '/doctor':  { args: ['doctor'], useStreamJson: false },
  '/config':  { args: ['config', 'list'], useStreamJson: false },
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
  let useStreamJson = true

  if (cliMapping) {
    args = [...cliMapping.args]
    useStreamJson = cliMapping.useStreamJson !== false
    if (settings.autoAcceptPermissions) {
      args.push('--dangerously-skip-permissions')
    }
  } else {
    // Normal message: use -p with stream-json for real-time output
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

  // Add stream-json output format for real-time streaming
  if (useStreamJson) {
    args.unshift('--output-format', 'stream-json')
  }

  spawnClaude(claudePath, args, useStreamJson)
}

function spawnClaude(claudePath: string, args: string[], parseJson: boolean): void {
  const isWin = process.platform === 'win32'

  // Reset streaming state
  lastEmittedTextLength = 0
  lastEmittedToolIds = new Set()
  currentSessionId = null

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

  // For non-stream-json mode, buffer output like before
  let rawBuffer = ''
  let rawFlushTimer: NodeJS.Timeout | null = null

  function flushRawBuffer() {
    if (rawBuffer) {
      sendOutput(rawBuffer, 'stdout')
      rawBuffer = ''
    }
    rawFlushTimer = null
  }

  stdout.on('line', (line) => {
    if (!line.trim()) return

    if (parseJson) {
      // Try to parse as stream-json event
      try {
        const event = JSON.parse(line)
        handleStreamEvent(event)
        return
      } catch {
        // Not JSON — permission prompt or other raw output
      }
    }

    // Raw line handling (non-JSON or fallback)
    if (isPermissionPrompt(line)) {
      if (rawFlushTimer) { clearTimeout(rawFlushTimer); flushRawBuffer() }
      updateStatus({ status: 'waiting-permission', message: line })
      sendOutput(line, 'system')
      return
    }

    rawBuffer += (rawBuffer ? '\n' : '') + line
    if (!rawFlushTimer) {
      rawFlushTimer = setTimeout(flushRawBuffer, 16)
    }
  })

  stderr.on('line', (line) => {
    if (!line.trim()) return
    sendOutput(line, 'stderr')
  })

  claudeProcess.on('close', (code) => {
    if (rawFlushTimer) {
      clearTimeout(rawFlushTimer)
      flushRawBuffer()
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

/**
 * Handle a parsed stream-json event from the Claude CLI.
 *
 * Event types:
 * - system (subtype: init) — session start, contains session_id
 * - assistant — contains message.content blocks (text, tool_use, thinking)
 * - result — final result, session complete
 */
function handleStreamEvent(event: any): void {
  if (!event || !event.type) return

  switch (event.type) {
    case 'system': {
      if (event.subtype === 'init' && event.session_id) {
        currentSessionId = event.session_id
      }
      break
    }

    case 'assistant': {
      const content = event.message?.content
      if (!Array.isArray(content)) break

      // Extract all text from content blocks
      let fullText = ''
      for (const block of content) {
        if (block.type === 'text') {
          fullText += block.text || ''
        } else if (block.type === 'thinking') {
          // Could surface thinking separately if needed
        } else if (block.type === 'tool_use') {
          // Emit tool use events as system messages (once per tool call)
          const toolId = block.id || `${block.name}-${Date.now()}`
          if (!lastEmittedToolIds.has(toolId)) {
            lastEmittedToolIds.add(toolId)
            const toolName = block.name || 'unknown'
            const toolInput = block.input || {}
            const summary = summarizeToolUse(toolName, toolInput)
            sendOutput(summary, 'system')
          }
        }
      }

      // Emit only the NEW text (delta since last emit)
      if (fullText.length > lastEmittedTextLength) {
        const delta = fullText.slice(lastEmittedTextLength)
        sendOutput(delta, 'stdout')
        lastEmittedTextLength = fullText.length
      }
      break
    }

    case 'result': {
      // The result event signals completion
      // If there's a result text we haven't emitted yet, emit it
      if (event.result && typeof event.result === 'string') {
        if (lastEmittedTextLength === 0) {
          // We never got assistant events — emit the final result directly
          sendOutput(event.result, 'stdout')
        }
      }

      if (event.subtype === 'error') {
        const errText = event.error || event.result || 'Unknown error'
        sendOutput(`Error: ${errText}`, 'system')
      }

      // Capture session ID from result if we missed it earlier
      if (event.session_id && !currentSessionId) {
        currentSessionId = event.session_id
      }
      break
    }
  }
}

/**
 * Create a human-readable summary of a tool use event.
 */
function summarizeToolUse(name: string, input: any): string {
  switch (name) {
    case 'Read':
    case 'read':
      return `📄 Reading ${input.file_path || input.path || 'file'}...`
    case 'Write':
    case 'write':
      return `✏️ Writing ${input.file_path || input.path || 'file'}...`
    case 'Edit':
    case 'edit':
      return `📝 Editing ${input.file_path || input.path || 'file'}...`
    case 'Bash':
    case 'bash':
      return `💻 Running: \`${truncate(input.command || input.cmd || '', 80)}\``
    case 'Glob':
    case 'glob':
      return `🔍 Searching for ${input.pattern || 'files'}...`
    case 'Grep':
    case 'grep':
      return `🔍 Searching for "${truncate(input.pattern || '', 40)}"...`
    default:
      return `🔧 Using tool: ${name}`
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s
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

export function getCurrentSessionId(): string | null {
  return currentSessionId
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
