import { create } from 'zustand'
import type { Workspace } from '@shared/types'

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  loading: boolean

  // Actions
  fetchWorkspaces: () => Promise<void>
  setActiveWorkspace: (id: string | null) => void
  createWorkspace: (name: string, projectPaths?: string[]) => Promise<Workspace>
  deleteWorkspace: (id: string) => Promise<void>
  addProject: (projectPath: string) => Promise<void>
  removeProject: (projectPath: string) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: false,

  fetchWorkspaces: async () => {
    set({ loading: true })
    try {
      const workspaces = await window.electronAPI.listWorkspaces()
      set({ workspaces, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  createWorkspace: async (name, projectPaths) => {
    const workspace = await window.electronAPI.createWorkspace(name, projectPaths)
    set((s) => ({ workspaces: [...s.workspaces, workspace] }))
    return workspace
  },

  deleteWorkspace: async (id) => {
    await window.electronAPI.deleteWorkspace(id)
    set((s) => ({
      workspaces: s.workspaces.filter((w) => w.id !== id),
      activeWorkspaceId: s.activeWorkspaceId === id ? null : s.activeWorkspaceId,
    }))
  },

  addProject: async (projectPath) => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    const updated = await window.electronAPI.addProjectToWorkspace(activeWorkspaceId, projectPath)
    if (updated) {
      set((s) => ({
        workspaces: s.workspaces.map((w) => (w.id === activeWorkspaceId ? updated : w)),
      }))
    }
  },

  removeProject: async (projectPath) => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    const updated = await window.electronAPI.removeProjectFromWorkspace(activeWorkspaceId, projectPath)
    if (updated) {
      set((s) => ({
        workspaces: s.workspaces.map((w) => (w.id === activeWorkspaceId ? updated : w)),
      }))
    }
  },
}))
