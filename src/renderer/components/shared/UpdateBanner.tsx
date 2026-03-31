import { useEffect, useState } from 'react'
import { Download, RefreshCw, X, ArrowUpCircle } from 'lucide-react'
import { Button } from './Button'

interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error'
  info?: { version?: string; releaseNotes?: string }
  progress?: { percent: number }
  error?: string
}

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Get initial status
    window.electronAPI?.getUpdateStatus?.().then(setStatus)

    // Listen for status changes
    const cleanup = window.electronAPI?.onUpdateStatus?.((s: UpdateStatus) => {
      setStatus(s)
      setDismissed(false) // Show banner again on new state
    })
    return () => {
      cleanup?.()
    }
  }, [])

  if (dismissed) return null
  if (status.state === 'idle' || status.state === 'checking' || status.state === 'not-available')
    return null

  if (status.state === 'error') return null // Silently ignore update errors

  return (
    <div className="bg-accent/10 border-b border-accent/20 px-3 py-1.5 flex items-center gap-2 text-xs shrink-0">
      {status.state === 'available' && (
        <>
          <ArrowUpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-text-primary">
            Claudette <strong>{status.info?.version}</strong> is available
          </span>
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-3 h-3" />}
            onClick={() => window.electronAPI?.downloadUpdate?.()}
          >
            Download
          </Button>
        </>
      )}

      {status.state === 'downloading' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
          <span className="text-text-primary">
            Downloading update... {Math.round(status.progress?.percent ?? 0)}%
          </span>
          <div className="flex-1 max-w-[200px] h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${status.progress?.percent ?? 0}%` }}
            />
          </div>
        </>
      )}

      {status.state === 'ready' && (
        <>
          <ArrowUpCircle className="w-3.5 h-3.5 text-success shrink-0" />
          <span className="text-text-primary">
            Update <strong>{status.info?.version}</strong> ready — restart to apply
          </span>
          <Button variant="primary" size="sm" onClick={() => window.electronAPI?.installUpdate?.()}>
            Restart Now
          </Button>
        </>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="ml-auto text-text-muted hover:text-text-primary transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
