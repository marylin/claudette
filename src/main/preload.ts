import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe API to the renderer process via contextBridge
const electronAPI = {
  // Claude process
  sendMessage: (message: string, sessionId?: string) =>
    ipcRenderer.invoke('claude:send', message, sessionId),
  stopClaude: () => ipcRenderer.invoke('claude:stop'),
  onClaudeOutput: (callback: (data: { text: string; type: 'stdout' | 'stderr' | 'system' }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { text: string; type: 'stdout' | 'stderr' | 'system' }) => callback(data)
    ipcRenderer.on('claude:output', listener)
    return () => ipcRenderer.removeListener('claude:output', listener)
  },
  onClaudeStatus: (callback: (data: { status: string; message?: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { status: string; message?: string }) => callback(data)
    ipcRenderer.on('claude:status', listener)
    return () => ipcRenderer.removeListener('claude:status', listener)
  },

  // Projects
  listProjects: () => ipcRenderer.invoke('projects:list'),

  // Sessions
  listSessions: (projectPath: string) => ipcRenderer.invoke('sessions:list', projectPath),
  resumeSession: (sessionId: string) => ipcRenderer.invoke('sessions:resume', sessionId),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('sessions:delete', sessionId),

  // Git
  getGitStatus: (projectPath: string) => ipcRenderer.invoke('git:status', projectPath),
  getGitDiff: (projectPath: string, filePath: string) => ipcRenderer.invoke('git:diff', projectPath, filePath),
  gitStage: (projectPath: string, files: string[]) => ipcRenderer.invoke('git:stage', projectPath, files),
  gitUnstage: (projectPath: string, files: string[]) => ipcRenderer.invoke('git:unstage', projectPath, files),
  gitCommit: (projectPath: string, message: string) => ipcRenderer.invoke('git:commit', projectPath, message),
  getGitRemoteUrl: (projectPath: string) => ipcRenderer.invoke('git:remote-url', projectPath),
  getGitLog: (projectPath: string, count?: number) => ipcRenderer.invoke('git:log', projectPath, count),

  // Agents
  listAgents: () => ipcRenderer.invoke('agents:list'),
  saveAgent: (agent: unknown) => ipcRenderer.invoke('agents:save', agent),
  deleteAgent: (agentId: string) => ipcRenderer.invoke('agents:delete', agentId),
  runAgent: (agentId: string, prompt: string) => ipcRenderer.invoke('agents:run', agentId, prompt),

  // CLAUDE.md
  readClaudeMd: (projectPath: string) => ipcRenderer.invoke('claude-md:read', projectPath),
  writeClaudeMd: (projectPath: string, content: string) => ipcRenderer.invoke('claude-md:write', projectPath, content),

  // Templates
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  saveTemplate: (template: unknown) => ipcRenderer.invoke('templates:save', template),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id),
  resolveTemplate: (prompt: string, variables: Record<string, string>) => ipcRenderer.invoke('templates:resolve', prompt, variables),

  // MCP Servers
  listMcpServers: (projectPath?: string) => ipcRenderer.invoke('mcp:list', projectPath),
  addMcpServer: (server: unknown, projectPath?: string) => ipcRenderer.invoke('mcp:add', server, projectPath),
  removeMcpServer: (name: string, scope: string, projectPath?: string) => ipcRenderer.invoke('mcp:remove', name, scope, projectPath),
  toggleMcpServer: (name: string, scope: string, enabled: boolean, projectPath?: string) => ipcRenderer.invoke('mcp:toggle', name, scope, enabled, projectPath),

  // Workspaces
  listWorkspaces: () => ipcRenderer.invoke('workspaces:list'),
  createWorkspace: (name: string, projectPaths?: string[]) => ipcRenderer.invoke('workspaces:create', name, projectPaths),
  updateWorkspace: (id: string, updates: unknown) => ipcRenderer.invoke('workspaces:update', id, updates),
  deleteWorkspace: (id: string) => ipcRenderer.invoke('workspaces:delete', id),
  addProjectToWorkspace: (workspaceId: string, projectPath: string) => ipcRenderer.invoke('workspaces:add-project', workspaceId, projectPath),
  removeProjectFromWorkspace: (workspaceId: string, projectPath: string) => ipcRenderer.invoke('workspaces:remove-project', workspaceId, projectPath),

  // Checkpoints
  listCheckpoints: (sessionId?: string) => ipcRenderer.invoke('checkpoints:list', sessionId),
  createCheckpoint: (data: unknown) => ipcRenderer.invoke('checkpoints:create', data),
  deleteCheckpoint: (id: string) => ipcRenderer.invoke('checkpoints:delete', id),
  getCheckpoint: (id: string) => ipcRenderer.invoke('checkpoints:get', id),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:status'),
  onUpdateStatus: (callback: (status: any) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: any) => callback(status)
    ipcRenderer.on('updater:status', listener)
    return () => ipcRenderer.removeListener('updater:status', listener)
  },

  // Usage
  getUsage: () => ipcRenderer.invoke('usage:get'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:set', settings),

  // File system
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readdir', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readfile', filePath),
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized)
    ipcRenderer.on('window:maximize-change', listener)
    return () => ipcRenderer.removeListener('window:maximize-change', listener)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI
