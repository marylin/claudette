import { IpcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { sendMessage, stopClaude } from './claude-bridge'
import { listProjects, listSessions } from './session-manager'
import { getSettings, updateSettings } from './settings'
import { getGitStatus, getGitDiff, gitStage, gitUnstage, gitCommit, getGitRemoteUrl, getGitLog } from './git-manager'
import { listAgents, saveAgent, deleteAgent } from './agents-manager'
import { getUsageData } from './usage-analyzer'
import { listMcpServers, addMcpServer, removeMcpServer, toggleMcpServer } from './mcp-manager'
import { listTemplates, saveTemplate, deleteTemplate, resolveTemplate } from './template-manager'
import { checkForUpdates, downloadUpdate, installUpdate, getUpdateStatus } from './auto-updater'
import { listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, addProjectToWorkspace, removeProjectFromWorkspace } from './workspace-manager'
import { listCheckpoints, createCheckpoint, deleteCheckpoint, getCheckpoint } from './checkpoint-manager'
import type { Agent, FileNode, Workspace } from '../shared/types'

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', '.next', '__pycache__',
  '.venv', 'venv', '.cache', 'coverage', '.turbo', '.nuxt',
])

export function registerIpcHandlers(ipcMain: IpcMain): void {
  // Claude process
  ipcMain.handle('claude:send', (_event, message: string, sessionId?: string) => {
    sendMessage(message, sessionId)
  })

  ipcMain.handle('claude:stop', () => {
    stopClaude()
  })

  // Projects
  ipcMain.handle('projects:list', () => {
    return listProjects()
  })

  // Sessions
  ipcMain.handle('sessions:list', (_event, projectPath: string) => {
    return listSessions(projectPath)
  })

  ipcMain.handle('sessions:resume', (_event, _sessionId: string) => {
    // Resume is handled via claude:send with sessionId
  })

  ipcMain.handle('sessions:delete', (_event, _sessionId: string) => {
    // TODO: implement session deletion
  })

  // Git (stubs for Phase 0.2)
  ipcMain.handle('git:status', (_event, projectPath: string) => {
    return getGitStatus(projectPath)
  })

  ipcMain.handle('git:diff', (_event, projectPath: string, filePath: string) => {
    return getGitDiff(projectPath, filePath)
  })

  ipcMain.handle('git:stage', (_event, projectPath: string, files: string[]) => {
    return gitStage(projectPath, files)
  })
  ipcMain.handle('git:unstage', (_event, projectPath: string, files: string[]) => {
    return gitUnstage(projectPath, files)
  })
  ipcMain.handle('git:commit', (_event, projectPath: string, message: string) => {
    return gitCommit(projectPath, message)
  })
  ipcMain.handle('git:remote-url', (_event, projectPath: string) => {
    return getGitRemoteUrl(projectPath)
  })
  ipcMain.handle('git:log', (_event, projectPath: string, count?: number) => {
    return getGitLog(projectPath, count)
  })

  // Agents
  ipcMain.handle('agents:list', () => listAgents())
  ipcMain.handle('agents:save', (_event, agent: Agent) => saveAgent(agent))
  ipcMain.handle('agents:delete', (_event, agentId: string) => deleteAgent(agentId))
  ipcMain.handle('agents:run', (_event, _agentId: string, _prompt: string) => {})

  // CLAUDE.md
  ipcMain.handle('claude-md:read', (_event, projectPath: string) => {
    const mdPath = path.join(projectPath, 'CLAUDE.md')
    try {
      if (fs.existsSync(mdPath)) {
        return fs.readFileSync(mdPath, 'utf-8')
      }
      return null
    } catch {
      return null
    }
  })

  ipcMain.handle('claude-md:write', (_event, projectPath: string, content: string) => {
    const mdPath = path.join(projectPath, 'CLAUDE.md')
    fs.writeFileSync(mdPath, content, 'utf-8')
  })

  // MCP Servers
  ipcMain.handle('mcp:list', (_event, projectPath?: string) => {
    return listMcpServers(projectPath)
  })

  ipcMain.handle('mcp:add', (_event, server: any, projectPath?: string) => {
    return addMcpServer(server, projectPath)
  })

  ipcMain.handle('mcp:remove', (_event, name: string, scope: string, projectPath?: string) => {
    return removeMcpServer(name, scope as 'global' | 'project', projectPath)
  })

  ipcMain.handle('mcp:toggle', (_event, name: string, scope: string, enabled: boolean, projectPath?: string) => {
    return toggleMcpServer(name, scope as 'global' | 'project', enabled, projectPath)
  })

  // Templates
  ipcMain.handle('templates:list', () => listTemplates())
  ipcMain.handle('templates:save', (_event, template: any) => saveTemplate(template))
  ipcMain.handle('templates:delete', (_event, id: string) => deleteTemplate(id))
  ipcMain.handle('templates:resolve', (_event, prompt: string, variables: Record<string, string>) => resolveTemplate(prompt, variables))

  // Usage
  ipcMain.handle('usage:get', () => {
    return getUsageData()
  })

  // Settings
  ipcMain.handle('settings:get', () => {
    return getSettings()
  })

  ipcMain.handle('settings:set', (_event, partial: Record<string, unknown>) => {
    return updateSettings(partial as any)
  })

  // Workspaces
  ipcMain.handle('workspaces:list', () => listWorkspaces())
  ipcMain.handle('workspaces:create', (_event, name: string, projectPaths?: string[]) => createWorkspace(name, projectPaths))
  ipcMain.handle('workspaces:update', (_event, id: string, updates: Partial<Workspace>) => updateWorkspace(id, updates))
  ipcMain.handle('workspaces:delete', (_event, id: string) => deleteWorkspace(id))
  ipcMain.handle('workspaces:add-project', (_event, workspaceId: string, projectPath: string) => addProjectToWorkspace(workspaceId, projectPath))
  ipcMain.handle('workspaces:remove-project', (_event, workspaceId: string, projectPath: string) => removeProjectFromWorkspace(workspaceId, projectPath))

  // Checkpoints
  ipcMain.handle('checkpoints:list', (_event, sessionId?: string) => listCheckpoints(sessionId))
  ipcMain.handle('checkpoints:create', (_event, data: any) => createCheckpoint(data))
  ipcMain.handle('checkpoints:delete', (_event, id: string) => deleteCheckpoint(id))
  ipcMain.handle('checkpoints:get', (_event, id: string) => getCheckpoint(id))

  // Auto-updater
  ipcMain.handle('updater:check', () => checkForUpdates())
  ipcMain.handle('updater:download', () => downloadUpdate())
  ipcMain.handle('updater:install', () => installUpdate())
  ipcMain.handle('updater:status', () => getUpdateStatus())

  // File system
  ipcMain.handle('fs:readdir', (_event, dirPath: string) => {
    return readDirectory(dirPath)
  })

  ipcMain.handle('fs:readfile', (_event, filePath: string) => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return ''
    }
  })

  // Dialog
  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Project Folder',
    })
    return result.canceled ? null : result.filePaths[0]
  })
}

function readDirectory(dirPath: string, depth = 0): FileNode[] {
  if (depth > 5) return []

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue
      if (IGNORED_DIRS.has(entry.name)) continue

      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children: readDirectory(fullPath, depth + 1),
        })
      } else {
        nodes.push({
          name: entry.name,
          path: fullPath,
          type: 'file',
          extension: path.extname(entry.name).slice(1),
        })
      }
    }

    // Sort: directories first, then files, alphabetically
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return nodes
  } catch {
    return []
  }
}
