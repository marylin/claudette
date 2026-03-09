import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  handleHardReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center h-full bg-bg-base">
          <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center">
            <div className="p-3 rounded-xl bg-error-muted">
              <AlertTriangle className="w-8 h-8 text-error" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-text-primary">Something went wrong</h2>
              <p className="text-xs text-text-secondary">
                An unexpected error occurred. Try reloading the panel, or restart Claudette if the issue persists.
              </p>
            </div>
            {this.state.error && (
              <pre className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-2xs text-error font-mono text-left overflow-x-auto max-h-32 custom-scrollbar">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={this.handleReload} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Try Again
              </Button>
              <Button variant="ghost" size="sm" onClick={this.handleHardReload}>
                Reload App
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
