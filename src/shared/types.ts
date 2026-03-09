// src/shared/types.ts
// Single source of truth for all types shared between main and renderer

export interface Project {
  id: string
  name: string
  path: string
  encodedPath: string
  lastSessionAt: Date | null
  sessionCount: number
  hasClaudeMd: boolean
}

export interface Session {
  id: string
  projectPath: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
  summary?: string
  tokenCount?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: Date
  tokenCount?: number
  isStreaming?: boolean
}

export type AgentModel =
  | 'claude-sonnet-4-5'
  | 'claude-opus-4-5'
  | 'claude-haiku-4-5'
  | 'claude-sonnet-4-5-20251101'

export interface Agent {
  id: string
  name: string
  description: string
  systemPrompt: string
  model: AgentModel
  allowedTools: string[]
  icon?: string
  createdAt: Date
  updatedAt: Date
}

export interface GitFile {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
}

export interface GitStatus {
  branch: string
  files: GitFile[]
  ahead: number
  behind: number
  isRepo: boolean
}

export interface DailyUsage {
  date: string
  inputTokens: number
  outputTokens: number
  cost: number
  sessions: number
}

export interface UsageData {
  daily: DailyUsage[]
  total: {
    inputTokens: number
    outputTokens: number
    cost: number
    sessions: number
  }
  byModel: Record<string, {
    inputTokens: number
    outputTokens: number
    cost: number
  }>
}

export interface Settings {
  claudePath: string
  defaultModel: AgentModel
  autoAcceptPermissions: boolean
  terminalVisible: boolean
  sidebarCollapsed: boolean
  fontSize: number
  theme: 'dark' // only dark for now
}

export interface ClaudeStatus {
  status: 'idle' | 'running' | 'waiting-permission' | 'error'
  message?: string
}

export interface Workspace {
  id: string
  name: string
  projectPaths: string[]
  activeProjectPath: string | null
  createdAt: Date
}

export interface Checkpoint {
  id: string
  sessionId: string
  projectPath: string
  name: string
  description?: string
  timestamp: Date
  messageIndex: number
  gitRef?: string
}

export type IpcChannels = {
  // Claude process
  'claude:send': (message: string, sessionId?: string) => void
  'claude:stop': () => void
  'claude:output': { text: string; type: 'stdout' | 'stderr' | 'system' }
  'claude:status': ClaudeStatus

  // Projects
  'projects:list': () => Project[]

  // Sessions
  'sessions:list': (projectPath: string) => Session[]
  'sessions:resume': (sessionId: string) => void
  'sessions:delete': (sessionId: string) => void

  // Git
  'git:status': (projectPath: string) => GitStatus
  'git:diff': (projectPath: string, filePath: string) => string
  'git:stage': (projectPath: string, files: string[]) => void
  'git:unstage': (projectPath: string, files: string[]) => void
  'git:commit': (projectPath: string, message: string) => void

  // Agents
  'agents:list': () => Agent[]
  'agents:save': (agent: Agent) => Agent
  'agents:delete': (agentId: string) => void
  'agents:run': (agentId: string, prompt: string) => void

  // CLAUDE.md
  'claude-md:read': (projectPath: string) => string | null
  'claude-md:write': (projectPath: string, content: string) => void

  // Usage
  'usage:get': () => UsageData

  // Settings
  'settings:get': () => Settings
  'settings:set': (settings: Partial<Settings>) => Settings

  // File system
  'fs:readdir': (dirPath: string) => FileNode[]
  'fs:readfile': (filePath: string) => string
  'dialog:open-folder': () => string | null
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  extension?: string
}
