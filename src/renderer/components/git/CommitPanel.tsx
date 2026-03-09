import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '../shared/Button'
import type { GitFile } from '@shared/types'

interface CommitPanelProps {
  files: GitFile[]
  onStage: (files: string[]) => void
  onUnstage: (files: string[]) => void
  onCommit: (message: string) => void
}

export function CommitPanel({ files, onStage, onUnstage, onCommit }: CommitPanelProps) {
  const [message, setMessage] = useState('')
  const [committing, setCommitting] = useState(false)

  const stagedFiles = files.filter((f) => f.staged)
  const unstagedFiles = files.filter((f) => !f.staged)

  const handleStageAll = () => onStage(unstagedFiles.map((f) => f.path))
  const handleUnstageAll = () => onUnstage(stagedFiles.map((f) => f.path))

  const handleCommit = async () => {
    if (!message.trim() || stagedFiles.length === 0) return
    setCommitting(true)
    try {
      await onCommit(message.trim())
      setMessage('')
    } catch (err) {
      console.error('Commit failed:', err)
    }
    setCommitting(false)
  }

  return (
    <div className="border-t border-border p-3 space-y-2">
      {/* Stage/unstage buttons */}
      <div className="flex items-center justify-between text-2xs">
        <span className="text-text-muted">{stagedFiles.length} staged / {unstagedFiles.length} unstaged</span>
        <div className="flex gap-1">
          {unstagedFiles.length > 0 && (
            <button onClick={handleStageAll} className="text-accent hover:text-accent-hover transition-colors duration-100">Stage all</button>
          )}
          {stagedFiles.length > 0 && (
            <button onClick={handleUnstageAll} className="text-text-muted hover:text-text-primary transition-colors duration-100">Unstage all</button>
          )}
        </div>
      </div>

      {/* Commit message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Commit message..."
        rows={2}
        className="w-full resize-none rounded-md border border-border bg-bg-base px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 select-text"
      />

      <Button
        variant="primary"
        size="sm"
        onClick={handleCommit}
        disabled={!message.trim() || stagedFiles.length === 0}
        loading={committing}
        icon={<Check className="w-3.5 h-3.5" />}
        className="w-full"
      >
        Commit ({stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''})
      </Button>
    </div>
  )
}
