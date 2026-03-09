import { useState, useEffect } from 'react'
import { Terminal, Settings, Github } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../../store/app.store'
import { Tooltip } from '../shared/Tooltip'

export function StatusBar() {
  const claudeStatus = useAppStore((s) => s.claudeStatus)
  const activeProject = useAppStore((s) => s.activeProject)
  const terminalVisible = useAppStore((s) => s.terminalVisible)
  const toggleTerminal = useAppStore((s) => s.toggleTerminal)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const [repoUrl, setRepoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (activeProject) {
      window.electronAPI.getGitRemoteUrl(activeProject.path).then(setRepoUrl)
    } else {
      setRepoUrl(null)
    }
  }, [activeProject])

  const statusColor = {
    idle: 'bg-text-muted',
    running: 'bg-success',
    'waiting-permission': 'bg-warning',
    error: 'bg-error',
  }[claudeStatus.status]

  const statusLabel = {
    idle: 'Idle',
    running: 'Running',
    'waiting-permission': 'Waiting',
    error: 'Error',
  }[claudeStatus.status]

  return (
    <div className="h-status-bar bg-bg-surface border-t border-border flex items-center justify-between px-3 text-2xs shrink-0">
      {/* Left: Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={clsx('w-2 h-2 rounded-full', statusColor)} />
          <span className="text-text-muted">{statusLabel}</span>
        </div>
        {activeProject && (
          <span className="text-text-secondary">{activeProject.name}</span>
        )}
      </div>

      {/* Right: GitHub + Terminal toggle */}
      <div className="flex items-center gap-3">
        {repoUrl && (
          <Tooltip content="Open on GitHub">
            <button
              onClick={() => window.open(repoUrl, '_blank')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-text-muted hover:text-text-secondary transition-colors"
            >
              <Github className="w-3 h-3" />
            </button>
          </Tooltip>
        )}
        <Tooltip content="Toggle terminal (Ctrl+`)">
          <button
            onClick={toggleTerminal}
            className={clsx(
              'flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors',
              terminalVisible
                ? 'text-accent bg-accent/10'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <Terminal className="w-3 h-3" />
            <span>Terminal</span>
          </button>
        </Tooltip>
        <Tooltip content="Settings">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-text-muted hover:text-text-secondary transition-colors"
          >
            <Settings className="w-3 h-3" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
