import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { Workspace } from '../shared/types'

const WORKSPACES_FILE = path.join(app.getPath('userData'), 'workspaces.json')

let workspaces: Workspace[] = []
let loaded = false

function loadWorkspaces(): void {
  if (loaded) return
  try {
    if (fs.existsSync(WORKSPACES_FILE)) {
      const data = JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf-8'))
      workspaces = Array.isArray(data) ? data : []
    }
  } catch {
    workspaces = []
  }
  loaded = true
}

function saveWorkspaces(): void {
  try {
    const dir = path.dirname(WORKSPACES_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(workspaces, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save workspaces:', err)
  }
}

export function listWorkspaces(): Workspace[] {
  loadWorkspaces()
  return workspaces
}

export function createWorkspace(name: string, projectPaths: string[] = []): Workspace {
  loadWorkspaces()
  const workspace: Workspace = {
    id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    projectPaths,
    activeProjectPath: projectPaths[0] || null,
    createdAt: new Date(),
  }
  workspaces.push(workspace)
  saveWorkspaces()
  return workspace
}

export function updateWorkspace(id: string, updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>): Workspace | null {
  loadWorkspaces()
  const idx = workspaces.findIndex((w) => w.id === id)
  if (idx === -1) return null
  workspaces[idx] = { ...workspaces[idx], ...updates }
  saveWorkspaces()
  return workspaces[idx]
}

export function deleteWorkspace(id: string): boolean {
  loadWorkspaces()
  const before = workspaces.length
  workspaces = workspaces.filter((w) => w.id !== id)
  if (workspaces.length < before) {
    saveWorkspaces()
    return true
  }
  return false
}

export function addProjectToWorkspace(workspaceId: string, projectPath: string): Workspace | null {
  loadWorkspaces()
  const workspace = workspaces.find((w) => w.id === workspaceId)
  if (!workspace) return null
  if (!workspace.projectPaths.includes(projectPath)) {
    workspace.projectPaths.push(projectPath)
    if (!workspace.activeProjectPath) {
      workspace.activeProjectPath = projectPath
    }
    saveWorkspaces()
  }
  return workspace
}

export function removeProjectFromWorkspace(workspaceId: string, projectPath: string): Workspace | null {
  loadWorkspaces()
  const workspace = workspaces.find((w) => w.id === workspaceId)
  if (!workspace) return null
  workspace.projectPaths = workspace.projectPaths.filter((p) => p !== projectPath)
  if (workspace.activeProjectPath === projectPath) {
    workspace.activeProjectPath = workspace.projectPaths[0] || null
  }
  saveWorkspaces()
  return workspace
}
