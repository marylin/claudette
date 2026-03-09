import { spawn, ChildProcess } from 'child_process'
import { getSettings } from './settings'
import { getMainWindow } from './index'
import type { ClaudeStatus } from '../shared/types'

let claudeProcess: ChildProcess | null = null
let currentStatus: ClaudeStatus = { status: 'idle' }
let currentSessionId: string | null = null

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

interface CliCommandMapping {
  args: string[]
  useStreamJson?: boolean
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
    args = ['-p']
    if (settings.autoAcceptPermissions) {
      args.push('--dangerously-skip-permissions')
    }
    if (sessionId) {
      args.push('--resume', sessionId)
    }
    args.push(trimmed)
  }

  if (useStreamJson) {
    args.unshift('--output-format', 'stream-json')
  }

  spawnClaude(claudePath, args, useStreamJson)
}

function spawnClaude(claudePath: string, args: string[], parseJson: boolean): void {
  // Clean environment to prevent "nested session" rejection
  const cleanEnv = { ...process.env }
  delete cleanEnv.CLAUDECODE
  delete cleanEnv.CLAUDE_CODE_ENTRYPOINT

  const isWin = process.platform === 'win32'

  if (isWin) {
    // On Windows, quote args with spaces for cmd.exe, then use
    // /s /c with windowsVerbatimArguments to pass the command line exactly
    const quoted = args.map((a) => (a.includes(' ') ? `"${a}"` : a))
    const cmdLine = `${claudePath} ${quoted.join(' ')}`
    console.log('[claude-bridge] spawn:', cmdLine)
    claudeProcess = spawn('cmd.exe', ['/s', '/c', `"${cmdLine}"`], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: cleanEnv,
      windowsVerbatimArguments: true,
    })
  } else {
    console.log('[claude-bridge] spawn:', claudePath, args.join(' '))
    claudeProcess = spawn(claudePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    })
  }

  updateStatus({ status: 'running' })

  // Track state for JSON streaming
  let emittedTextLength = 0
  let seenToolIds = new Set<string>()
  let lineBuffer = ''

  // Raw data events for lowest latency
  claudeProcess.stdout!.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    console.log('[claude-bridge] stdout chunk:', text.length, 'bytes')
    lineBuffer += text

    const parts = lineBuffer.split('\n')
    lineBuffer = parts.pop()!

    for (const rawLine of parts) {
      const line = rawLine.trim()
      if (!line) continue
      console.log('[claude-bridge] line:', line.slice(0, 200))

      if (parseJson) {
        let parsed: any = null
        try {
          parsed = JSON.parse(line)
        } catch {
          // Not JSON
        }

        if (parsed && typeof parsed === 'object') {
          const type = parsed.type

          if (type === 'system' && parsed.session_id) {
            currentSessionId = parsed.session_id
            console.log('[claude-bridge] session:', currentSessionId)
            continue
          }

          if (type === 'assistant') {
            const content = parsed.message?.content
            if (Array.isArray(content)) {
              let fullText = ''
              for (const block of content) {
                if (block.type === 'text' && block.text) {
                  fullText += block.text
                } else if (block.type === 'tool_use') {
                  const toolId = block.id || `${block.name}-${Math.random()}`
                  if (!seenToolIds.has(toolId)) {
                    seenToolIds.add(toolId)
                    sendOutput(summarizeTool(block.name, block.input), 'system')
                  }
                }
              }
              if (fullText.length > emittedTextLength) {
                sendOutput(fullText.slice(emittedTextLength), 'stdout')
                emittedTextLength = fullText.length
              }
              continue
            }
            if (typeof parsed.message?.content === 'string') {
              const t = parsed.message.content
              if (t.length > emittedTextLength) {
                sendOutput(t.slice(emittedTextLength), 'stdout')
                emittedTextLength = t.length
              }
              continue
            }
          }

          // content_block_delta (API-style streaming)
          if (type === 'content_block_delta' && parsed.delta?.text) {
            sendOutput(parsed.delta.text, 'stdout')
            continue
          }

          if (type === 'result') {
            if (parsed.session_id) currentSessionId = parsed.session_id
            if (emittedTextLength === 0 && parsed.result && typeof parsed.result === 'string') {
              sendOutput(parsed.result, 'stdout')
            }
            if (parsed.subtype === 'error' || parsed.is_error) {
              sendOutput(parsed.error || parsed.result || 'Unknown error', 'system')
            }
            continue
          }

          // Unrecognized JSON — show raw so user always sees something
          console.log('[claude-bridge] unrecognized event type:', type)
          sendOutput(line, 'stdout')
          continue
        }
      }

      // Raw text
      if (isPermissionPrompt(line)) {
        updateStatus({ status: 'waiting-permission', message: line })
        sendOutput(line, 'system')
      } else {
        sendOutput(line, 'stdout')
      }
    }
  })

  claudeProcess.stderr!.on('data', (chunk: Buffer) => {
    const text = chunk.toString().trim()
    if (text) {
      console.log('[claude-bridge] stderr:', text)
      sendOutput(text, 'stderr')
    }
  })

  claudeProcess.on('close', (code) => {
    console.log('[claude-bridge] process exited, code:', code)
    const remaining = lineBuffer.trim()
    if (remaining) {
      console.log('[claude-bridge] flushing remaining:', remaining.slice(0, 200))
      sendOutput(remaining, 'stdout')
    }
    lineBuffer = ''
    claudeProcess = null
    updateStatus({
      status: code === 0 ? 'idle' : 'error',
      message: code !== 0 ? `Process exited with code ${code}` : undefined,
    })
  })

  claudeProcess.on('error', (err) => {
    console.log('[claude-bridge] spawn error:', err.message)
    claudeProcess = null
    updateStatus({ status: 'error', message: err.message })
    sendOutput(`Error: ${err.message}`, 'system')
  })
}

function summarizeTool(name: string, input: any): string {
  if (!name) return '🔧 Using tool...'
  const n = name.toLowerCase()
  if (n === 'read') return `📄 Reading ${input?.file_path || input?.path || 'file'}...`
  if (n === 'write') return `✏️ Writing ${input?.file_path || input?.path || 'file'}...`
  if (n === 'edit') return `📝 Editing ${input?.file_path || input?.path || 'file'}...`
  if (n === 'bash') return `💻 Running: \`${(input?.command || '').slice(0, 80)}\``
  if (n === 'glob') return `🔍 Searching for ${input?.pattern || 'files'}...`
  if (n === 'grep') return `🔍 Searching for "${(input?.pattern || '').slice(0, 40)}"...`
  return `🔧 ${name}`
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
