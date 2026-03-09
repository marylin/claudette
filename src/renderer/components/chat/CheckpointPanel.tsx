import { useEffect, useState, useCallback } from 'react'
import { Bookmark, Plus, Trash2, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { useSessionStore } from '../../store/session.store'
import { useAppStore } from '../../store/app.store'
import { Button } from '../shared/Button'
import { Tooltip } from '../shared/Tooltip'
import type { Checkpoint } from '@shared/types'

interface CheckpointPanelProps {
  collapsed?: boolean
}

export function CheckpointPanel({ collapsed = true }: CheckpointPanelProps) {
  const [expanded, setExpanded] = useState(!collapsed)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const messages = useSessionStore((s) => s.messages)
  const activeProject = useAppStore((s) => s.activeProject)

  const fetchCheckpoints = useCallback(async () => {
    if (!activeSessionId) {
      setCheckpoints([])
      return
    }
    setLoading(true)
    try {
      const cps = await window.electronAPI.listCheckpoints(activeSessionId)
      setCheckpoints(cps)
    } catch {
      setCheckpoints([])
    }
    setLoading(false)
  }, [activeSessionId])

  useEffect(() => {
    fetchCheckpoints()
  }, [fetchCheckpoints])

  const handleCreate = async () => {
    if (!newName.trim() || !activeSessionId || !activeProject) return

    // Get current git ref if available
    let gitRef: string | undefined
    try {
      const gitStatus = await window.electronAPI.getGitStatus(activeProject.path)
      if (gitStatus?.branch) {
        const log = await window.electronAPI.getGitLog(activeProject.path, 1)
        if (log?.[0]?.hash) gitRef = log[0].hash
      }
    } catch {
      // No git, that's fine
    }

    await window.electronAPI.createCheckpoint({
      sessionId: activeSessionId,
      projectPath: activeProject.path,
      name: newName.trim(),
      messageIndex: messages.length,
      gitRef,
    })

    setNewName('')
    setCreating(false)
    fetchCheckpoints()
  }

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteCheckpoint(id)
    fetchCheckpoints()
  }

  if (!activeSessionId) return null

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-2xs text-text-muted hover:text-text-secondary transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Bookmark className="w-3 h-3" />
        <span className="font-medium uppercase tracking-wider">Checkpoints</span>
        {checkpoints.length > 0 && (
          <span className="ml-auto text-text-muted">{checkpoints.length}</span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {loading && <div className="text-2xs text-text-muted py-1">Loading...</div>}

          {!loading && checkpoints.length === 0 && !creating && (
            <div className="text-2xs text-text-muted py-1">
              No checkpoints. Save your progress at any point.
            </div>
          )}

          {checkpoints.map((cp) => (
            <div
              key={cp.id}
              className="flex items-start gap-2 py-1 group"
            >
              <Bookmark className="w-3 h-3 text-accent mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-primary truncate">{cp.name}</div>
                <div className="flex items-center gap-2 text-2xs text-text-muted">
                  <span>{cp.messageIndex} messages</span>
                  {cp.gitRef && (
                    <Tooltip content={cp.gitRef}>
                      <span className="font-mono">{cp.gitRef.slice(0, 7)}</span>
                    </Tooltip>
                  )}
                  <span>{formatDistanceToNow(new Date(cp.timestamp), { addSuffix: true })}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(cp.id)}
                className="w-4 h-4 flex items-center justify-center text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label="Delete checkpoint"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {creating ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setCreating(false); setNewName('') }
                }}
                placeholder="Checkpoint name..."
                className="flex-1 h-6 px-1.5 text-2xs bg-bg-base border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="text-2xs text-accent hover:text-accent-hover disabled:opacity-40"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 text-2xs text-accent hover:text-accent-hover transition-colors"
            >
              <Plus className="w-3 h-3" />
              Save Checkpoint
            </button>
          )}
        </div>
      )}
    </div>
  )
}
