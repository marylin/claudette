import { query, type Query } from '@anthropic-ai/claude-agent-sdk'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { getSettings } from './settings'
import { getMainWindow } from './index'
import type { ClaudeStatus, ToolUseEvent, CostEvent, PermissionMode } from '../shared/types'

let activeQuery: Query | null = null
let abortController: AbortController | null = null
let currentStatus: ClaudeStatus = { status: 'idle' }
let currentSessionId: string | null = null
let currentProjectPath: string | null = null

// ─── File-based debug logging (SDK captures stdout/stderr) ──────────

let _logFile: string | null = null
function getLogFile(): string {
  if (!_logFile) {
    _logFile = path.join(app.getPath('userData'), 'claude-bridge.log')
    try { fs.writeFileSync(_logFile, '') } catch { /* ignore */ }
  }
  return _logFile
}

function debugLog(...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${args.map(a =>
    typeof a === 'object' ? JSON.stringify(a) : String(a)
  ).join(' ')}\n`
  try {
    fs.appendFileSync(getLogFile(), line)
  } catch {
    // Ignore write errors
  }
  // Also emit to renderer debug panel
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('claude:debug', { message: line.trim() })
  }
}

// ─── Local slash commands (never sent to Claude) ────────────────────

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
      '`/compact` — Compact conversation context',
      '`/review` — Review code changes',
      '`/test` — Run project tests',
      '`/commit` — Commit staged changes',
      '`/init` — Initialize CLAUDE.md',
    ].join('\n'),
  }),
}

// ─── Slash commands mapped to prompts sent through the SDK ──────────

const PROMPT_COMMANDS: Record<string, string> = {
  '/cost': 'Show my token usage and cost for this session',
  '/status': 'Show a brief project status summary',
  '/compact': 'Summarize our conversation so far in a compact form',
  '/review': 'Review the current code changes (git diff) and provide feedback',
  '/test': 'Run the project test suite and report results',
  '/commit': 'Stage and commit the current changes with an appropriate commit message',
  '/init': 'Initialize a CLAUDE.md file for this project with sensible defaults',
}

// ─── Public API ─────────────────────────────────────────────────────

export function setProjectPath(projectPath: string): void {
  currentProjectPath = projectPath
  debugLog('setProjectPath:', projectPath)
}

export function sendMessage(message: string, sessionId?: string): void {
  const trimmed = message.trim()
  const commandName = trimmed.split(/\s/)[0].toLowerCase()

  // Handle local commands
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

  // Stop any running query
  if (activeQuery) {
    stopClaude()
  }

  // Resolve prompt
  const prompt = PROMPT_COMMANDS[commandName] || trimmed

  // Run the query — MUST catch unhandled rejections
  runQuery(prompt, sessionId).catch((err) => {
    debugLog('Unhandled runQuery error:', err?.message || err)
    sendOutput(`Error: ${err?.message || 'Unknown error'}`, 'system')
    updateStatus({ status: 'error', message: err?.message })
  })
}

export function stopClaude(): void {
  debugLog('stopClaude called')
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  if (activeQuery) {
    try {
      activeQuery.close()
    } catch {
      // Already closed
    }
    activeQuery = null
  }
  updateStatus({ status: 'idle' })
}

export function getClaudeStatus(): ClaudeStatus {
  return currentStatus
}

export function getCurrentSessionId(): string | null {
  return currentSessionId
}

// ─── Core query runner ──────────────────────────────────────────────

async function runQuery(prompt: string, sessionId?: string): Promise<void> {
  const settings = getSettings()

  abortController = new AbortController()
  updateStatus({ status: 'running' })

  // Build options — bypass permissions entirely since the GUI is the UX layer.
  // Using 'default' or 'acceptEdits' with canUseTool causes ZodError in the
  // SDK's internal permission validation pipeline (no stdin in Electron).
  const options: Record<string, unknown> = {
    abortController,
    includePartialMessages: true,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    maxTurns: 200,
  }

  // Working directory
  if (currentProjectPath) {
    options.cwd = currentProjectPath
  }

  // Model
  if (settings.defaultModel) {
    options.model = settings.defaultModel
  }

  // Session resume
  if (sessionId) {
    options.resume = sessionId
  }

  // Clean env to avoid nested session issues
  const cleanEnv = { ...process.env }
  delete cleanEnv.CLAUDECODE
  delete cleanEnv.CLAUDE_CODE_ENTRYPOINT
  options.env = cleanEnv

  debugLog('runQuery starting', {
    prompt: prompt.slice(0, 100),
    permissionMode: options.permissionMode,
    model: options.model,
    cwd: options.cwd,
    sessionId: sessionId || null,
  })

  try {
    activeQuery = query({ prompt, options: options as any })
    debugLog('query() returned, starting iteration')

    // Track seen tool IDs to avoid duplicate summaries
    const seenToolIds = new Set<string>()
    let messageCount = 0

    for await (const message of activeQuery) {
      messageCount++
      if (abortController?.signal.aborted) {
        debugLog('Aborted after', messageCount, 'messages')
        break
      }

      handleMessage(message, seenToolIds, messageCount)
    }

    debugLog('query iteration complete,', messageCount, 'messages')
    updateStatus({ status: 'idle' })
  } catch (err: any) {
    if (err.name === 'AbortError' || abortController?.signal.aborted) {
      debugLog('query aborted')
      updateStatus({ status: 'idle' })
    } else {
      debugLog('query error:', err.message, err.stack)
      sendOutput(`Error: ${err.message}`, 'system')
      updateStatus({ status: 'error', message: err.message })
    }
  } finally {
    activeQuery = null
    abortController = null
  }
}

// ─── Message handler ────────────────────────────────────────────────

function handleMessage(message: any, seenToolIds: Set<string>, msgNum: number): void {
  const type = message.type

  // System init — captures session ID, model info
  if (type === 'system') {
    if (message.subtype === 'init') {
      if (message.session_id) {
        currentSessionId = message.session_id
        emitSession(message.session_id)
      }
      debugLog(`#${msgNum} system.init session=${message.session_id} model=${message.model}`)
    } else if (message.subtype === 'status') {
      debugLog(`#${msgNum} system.status:`, message.status)
    } else {
      debugLog(`#${msgNum} system.${message.subtype}`)
    }
    return
  }

  // Streaming deltas — token-level text streaming
  if (type === 'stream_event') {
    const event = message.event
    if (!event) return

    // content_block_delta with text
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      sendOutput(event.delta.text, 'stdout')
    }
    // Log non-delta events at lower frequency
    else if (event.type === 'message_start' || event.type === 'message_stop') {
      debugLog(`#${msgNum} stream_event.${event.type}`)
    }
    return
  }

  // Complete assistant turn — extract tool uses and full text
  if (type === 'assistant') {
    debugLog(`#${msgNum} assistant message`)
    const content = message.message?.content
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'tool_use') {
          const toolId = block.id || `${block.name}-${Math.random()}`
          if (!seenToolIds.has(toolId)) {
            seenToolIds.add(toolId)
            emitToolUse(block.name, toolId, block.input || {})
            debugLog(`  tool_use: ${block.name}`)
          }
        }
      }
    }
    return
  }

  // Tool use summary
  if (type === 'tool_use_summary') {
    if (message.summary) {
      sendOutput(message.summary, 'system')
    }
    return
  }

  // Result — completion, cost, errors
  if (type === 'result') {
    debugLog(`#${msgNum} result: subtype=${message.subtype} cost=${message.total_cost_usd}`)

    if (message.session_id) {
      currentSessionId = message.session_id
      emitSession(message.session_id)
    }

    // Emit cost info
    if (message.total_cost_usd !== undefined) {
      emitCost({
        totalCostUsd: message.total_cost_usd || 0,
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
        numTurns: message.num_turns || 0,
        durationMs: message.duration_ms || 0,
      })
    }

    // Handle errors
    if (message.subtype && message.subtype !== 'success') {
      const errorMsg = message.result || message.error || `Query ended: ${message.subtype}`
      sendOutput(errorMsg, 'system')
    }
    return
  }

  // Tool progress — show elapsed time
  if (type === 'tool_progress') {
    return
  }

  // Rate limit — debug only, don't spam the chat
  if (type === 'rate_limit_event') {
    debugLog(`#${msgNum} rate_limit_event`)
    return
  }

  // Catch-all for unrecognized message types
  debugLog(`#${msgNum} unhandled message type: ${type}`)
}

// ─── IPC emitters ───────────────────────────────────────────────────

function sendOutput(text: string, type: 'stdout' | 'stderr' | 'system'): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('claude:output', { text, type })
  } else {
    debugLog('sendOutput failed: no valid window', { text: text.slice(0, 80), type })
  }
}

function updateStatus(status: ClaudeStatus): void {
  currentStatus = status
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('claude:status', status)
  }
}

function emitSession(sessionId: string): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('claude:session', { sessionId })
  }
}

function emitToolUse(toolName: string, toolUseId: string, input: Record<string, unknown>): void {
  const summary = summarizeTool(toolName, input)
  const event: ToolUseEvent = { toolName, toolUseId, input, summary }
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('claude:tool-use', event)
    // Also send as system message for backward compat
    sendOutput(summary, 'system')
  }
}

function emitCost(cost: CostEvent): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('claude:cost', cost)
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function summarizeTool(name: string, input: Record<string, unknown>): string {
  if (!name) return 'Using tool...'
  const n = name.toLowerCase()
  if (n === 'read') return `Reading ${input.file_path || input.path || 'file'}...`
  if (n === 'write') return `Writing ${input.file_path || input.path || 'file'}...`
  if (n === 'edit') return `Editing ${input.file_path || input.path || 'file'}...`
  if (n === 'bash') return `Running: \`${String(input.command || '').slice(0, 80)}\``
  if (n === 'glob') return `Searching for ${input.pattern || 'files'}...`
  if (n === 'grep') return `Searching for "${String(input.pattern || '').slice(0, 40)}"...`
  return `${name}`
}

function mapPermissionMode(settings: { permissionMode?: PermissionMode; autoAcceptPermissions?: boolean }): string {
  if (settings.permissionMode && settings.permissionMode !== 'default') {
    return settings.permissionMode
  }
  // Legacy fallback
  if (settings.autoAcceptPermissions) {
    return 'bypassPermissions'
  }
  return 'default'
}
