import { useState, useEffect } from 'react'
import { Download, CheckCircle, FolderOpen, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from './Button'
import { useAppStore } from '../../store/app.store'
import { useProjectStore } from '../../store/project.store'

type Step = 'detect' | 'not-found' | 'ready'

export function Onboarding() {
  const [step, setStep] = useState<Step>('detect')
  const [detecting, setDetecting] = useState(true)
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const fetchProjects = useProjectStore((s) => s.fetchProjects)

  useEffect(() => {
    checkClaude()
  }, [])

  const checkClaude = async () => {
    setDetecting(true)
    try {
      const currentSettings = await window.electronAPI.getSettings()
      setSettings(currentSettings)
      if (currentSettings.claudePath) {
        setStep('ready')
      } else {
        setStep('not-found')
      }
    } catch {
      setStep('not-found')
    }
    setDetecting(false)
  }

  const handleOpenFolder = async () => {
    const folder = await window.electronAPI.openFolder()
    if (folder) {
      await fetchProjects()
    }
  }

  const handleSkip = () => {
    setStep('ready')
  }

  return (
    <div className="flex items-center justify-center h-full bg-bg-base">
      <div className="max-w-md w-full p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-lg font-bold text-text-primary">C</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Claudette</h1>
            <p className="text-xs text-text-muted">The GUI that Claude Code should have shipped with</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1: Detect Claude */}
          <StepCard
            number={1}
            title="Claude Code CLI"
            active={step === 'detect' || step === 'not-found'}
            done={step === 'ready'}
          >
            {detecting ? (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Detecting Claude Code installation...
              </div>
            ) : step === 'not-found' ? (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Claude Code CLI was not found on your system.
                </p>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                    Install Guide
                  </Button>
                  <Button variant="ghost" size="sm" onClick={checkClaude} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                    Retry
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSkip}>
                    Skip
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="w-4 h-4" />
                Claude Code found: {settings?.claudePath}
              </div>
            )}
          </StepCard>

          {/* Step 2: Open project */}
          {step === 'ready' && (
            <StepCard number={2} title="Open a Project" active>
              <p className="text-sm text-text-secondary mb-3">
                Open a folder to start working with Claude.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenFolder}
                icon={<FolderOpen className="w-3.5 h-3.5" />}
              >
                Open Project Folder
              </Button>
            </StepCard>
          )}
        </div>
      </div>
    </div>
  )
}

function StepCard({
  number,
  title,
  active,
  done,
  children,
}: {
  number: number
  title: string
  active?: boolean
  done?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        active ? 'border-accent/50 bg-bg-surface' : done ? 'border-success/30 bg-bg-surface/50' : 'border-border bg-bg-base'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-bold ${
            done ? 'bg-success text-bg-base' : active ? 'bg-accent text-text-primary' : 'bg-bg-elevated text-text-muted'
          }`}
        >
          {done ? <CheckCircle className="w-3 h-3" /> : number}
        </div>
        <span className="text-sm font-medium text-text-primary">{title}</span>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  )
}
