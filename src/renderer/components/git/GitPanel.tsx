import { useState, useEffect, useCallback } from 'react'
import { GitBranch, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import { EmptyState } from '../shared/EmptyState'
import { Badge } from '../shared/Badge'
import { Button } from '../shared/Button'
import { useAppStore } from '../../store/app.store'
import { useToast } from '../shared/ToastProvider'
import { DiffViewer } from './DiffViewer'
import { CommitPanel } from './CommitPanel'
import type { GitStatus, GitFile } from '@shared/types'

export function GitPanel() {
  const activeProject = useAppStore((s) => s.activeProject)
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diff, setDiff] = useState('')

  const refresh = useCallback(async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      const s = await window.electronAPI.getGitStatus(activeProject.path)
      setStatus(s)
    } catch { /* ignore */ }
    setLoading(false)
  }, [activeProject])

  useEffect(() => { refresh() }, [refresh])

  // Poll every 3s
  useEffect(() => {
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [refresh])

  const handleSelectFile = async (file: GitFile) => {
    if (!activeProject) return
    setSelectedFile(file.path)
    try {
      const d = await window.electronAPI.getGitDiff(activeProject.path, file.path)
      setDiff(d)
    } catch {
      setDiff('')
      toast('error', `Failed to load diff for ${file.path}`)
    }
  }

  const handleStage = async (files: string[]) => {
    if (!activeProject) return
    await window.electronAPI.gitStage(activeProject.path, files)
    refresh()
  }

  const handleUnstage = async (files: string[]) => {
    if (!activeProject) return
    await window.electronAPI.gitUnstage(activeProject.path, files)
    refresh()
  }

  const { toast } = useToast()

  const handleCommit = async (message: string) => {
    if (!activeProject) return
    try {
      await window.electronAPI.gitCommit(activeProject.path, message)
      toast('success', `Committed: ${message.slice(0, 50)}`)
      refresh()
      setSelectedFile(null)
      setDiff('')
    } catch (err) {
      toast('error', `Commit failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState icon={<GitBranch className="w-10 h-10" />} title="No project selected" />
      </div>
    )
  }

  if (status && !status.isRepo) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState icon={<GitBranch className="w-10 h-10" />} title="Not a git repository" description="This project folder is not initialized with git" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left: file list + commit */}
      <div className="w-72 border-r border-border flex flex-col shrink-0">
        {/* Branch header */}
        <div className="h-9 px-3 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-text-primary">{status?.branch || '...'}</span>
            {(status?.ahead ?? 0) > 0 && <Badge variant="info"><ArrowUp className="w-2.5 h-2.5" /> {status!.ahead}</Badge>}
            {(status?.behind ?? 0) > 0 && <Badge variant="warning"><ArrowDown className="w-2.5 h-2.5" /> {status!.behind}</Badge>}
          </div>
          <button onClick={refresh} className="text-text-muted hover:text-text-primary transition-colors" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Changed files */}
        <div className="flex-1 overflow-y-auto py-1">
          {status?.files.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-text-muted">No changes</div>
          )}
          {status?.files.map((file) => (
            <button
              key={file.path}
              onClick={() => handleSelectFile(file)}
              className={`w-full px-3 py-1 flex items-center gap-2 text-xs text-left transition-colors duration-100 ${
                selectedFile === file.path ? 'bg-accent/10 text-text-primary' : 'text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              <StatusBadge status={file.status} />
              <span className="truncate flex-1 font-mono">{file.path}</span>
              {file.staged && <span className="text-2xs text-success">staged</span>}
            </button>
          ))}
        </div>

        {/* Commit panel */}
        <CommitPanel
          files={status?.files || []}
          onStage={handleStage}
          onUnstage={handleUnstage}
          onCommit={handleCommit}
        />
      </div>

      {/* Right: diff */}
      <div className="flex-1 min-w-0">
        {selectedFile ? (
          <DiffViewer filePath={selectedFile} diff={diff} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState icon={<GitBranch className="w-8 h-8" />} title="Select a file" description="Click a changed file to view its diff" />
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: GitFile['status'] }) {
  const colors: Record<string, string> = {
    modified: 'text-warning',
    added: 'text-success',
    deleted: 'text-error',
    renamed: 'text-info',
    untracked: 'text-text-muted',
  }
  const labels: Record<string, string> = { modified: 'M', added: 'A', deleted: 'D', renamed: 'R', untracked: 'U' }
  return <span className={`text-2xs font-bold font-mono w-3 ${colors[status] || ''}`}>{labels[status] || '?'}</span>
}
