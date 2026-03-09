import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcutsProps {
  open: boolean
  onClose: () => void
}

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['Ctrl', '1'], action: 'Go to Chat' },
    { keys: ['Ctrl', '2'], action: 'Go to Files' },
    { keys: ['Ctrl', '3'], action: 'Go to Git' },
    { keys: ['Ctrl', '4'], action: 'Go to Agents' },
    { keys: ['Ctrl', '5'], action: 'Go to Usage' },
  ]},
  { category: 'Panels', items: [
    { keys: ['Ctrl', 'B'], action: 'Toggle sidebar' },
    { keys: ['Ctrl', '`'], action: 'Toggle terminal' },
    { keys: ['Ctrl', 'K'], action: 'Command palette' },
  ]},
  { category: 'Editing', items: [
    { keys: ['Ctrl', 'S'], action: 'Save CLAUDE.md' },
    { keys: ['Ctrl', 'Enter'], action: 'Send message' },
    { keys: ['Escape'], action: 'Close panel / Stop Claude' },
  ]},
  { category: 'General', items: [
    { keys: ['?'], action: 'Show this help' },
  ]},
]

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative bg-bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.action} className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">{item.action}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-text-muted text-2xs mx-0.5">+</span>}
                          <kbd className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-2xs font-mono text-text-primary bg-bg-elevated border border-border rounded">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
