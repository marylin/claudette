import { useEffect, useState } from 'react'
import { Layers, Plus, X, Edit3 } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspaceStore } from '../../store/workspace.store'
import { Tooltip } from '../shared/Tooltip'
import type { Workspace } from '@shared/types'

export function WorkspaceBar() {
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces)
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace)
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const ws = await createWorkspace(newName.trim())
    setActiveWorkspace(ws.id)
    setNewName('')
    setCreating(false)
  }

  if (workspaces.length === 0 && !creating) {
    return (
      <div className="px-2 py-1.5 border-b border-border">
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-2xs text-text-muted hover:text-text-secondary rounded-md hover:bg-bg-elevated transition-colors"
        >
          <Layers className="w-3 h-3" />
          <span>Create Workspace</span>
        </button>
      </div>
    )
  }

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-0.5 px-1.5 py-1 overflow-x-auto scrollbar-none">
        {workspaces.map((ws) => (
          <WorkspaceTab
            key={ws.id}
            workspace={ws}
            isActive={activeWorkspaceId === ws.id}
            onSelect={() => setActiveWorkspace(ws.id)}
            onClose={() => deleteWorkspace(ws.id)}
          />
        ))}

        {!creating && (
          <Tooltip content="New workspace">
            <button
              onClick={() => setCreating(true)}
              className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text-primary rounded transition-colors shrink-0"
            >
              <Plus className="w-3 h-3" />
            </button>
          </Tooltip>
        )}
      </div>

      {creating && (
        <div className="px-2 pb-1.5 flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            placeholder="Workspace name..."
            className="flex-1 h-6 px-1.5 text-2xs bg-bg-base border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="text-2xs text-accent hover:text-accent-hover disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

function WorkspaceTab({
  workspace,
  isActive,
  onSelect,
  onClose,
}: {
  workspace: Workspace
  isActive: boolean
  onSelect: () => void
  onClose: () => void
}) {
  return (
    <div
      className={clsx(
        'group flex items-center gap-1 px-2 py-1 text-2xs rounded-md cursor-pointer transition-colors max-w-[120px]',
        isActive
          ? 'bg-accent/15 text-accent'
          : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
      )}
      onClick={onSelect}
    >
      <Layers className="w-3 h-3 shrink-0" />
      <span className="truncate">{workspace.name}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="w-3 h-3 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-error transition-opacity shrink-0"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}
