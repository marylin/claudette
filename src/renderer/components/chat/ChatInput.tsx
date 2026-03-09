import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, Bookmark } from 'lucide-react'
import { clsx } from 'clsx'
import { TemplatePicker } from './TemplatePicker'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [templateOpen, setTemplateOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [value])

  // Focus textarea on mount
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isStreaming) return
      handleSend()
    }
    // Open template picker with / at start of empty input
    if (e.key === '/' && value === '') {
      e.preventDefault()
      setTemplateOpen(true)
    }
  }

  const handleTemplateSelect = (prompt: string) => {
    setValue(prompt)
    textareaRef.current?.focus()
  }

  return (
    <div className="border-t border-border bg-bg-surface px-4 py-3">
      <div className="flex gap-2 items-end max-w-4xl mx-auto relative">
        <TemplatePicker open={templateOpen} onClose={() => setTemplateOpen(false)} onSelect={handleTemplateSelect} />
        <button
          onClick={() => setTemplateOpen(!templateOpen)}
          disabled={disabled || isStreaming}
          className={clsx(
            'shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
            'text-text-muted hover:text-text-primary hover:bg-bg-elevated',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Templates"
          title="Templates (press / in empty input)"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Select a project to start...' : 'Message Claude... (Enter to send, Shift+Enter for newline)'}
            disabled={disabled || isStreaming}
            rows={1}
            className={clsx(
              'w-full resize-none rounded-lg border bg-bg-base px-3 py-2 text-sm text-text-primary',
              'placeholder:text-text-muted select-text',
              'focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'border-border'
            )}
          />
          {value.length > 0 && (
            <span className="absolute bottom-1.5 right-2 text-2xs text-text-muted">
              {value.length}
            </span>
          )}
        </div>

        {isStreaming ? (
          <button
            onClick={onStop}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-error/20 text-error hover:bg-error/30 transition-colors"
            aria-label="Stop"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={clsx(
              'shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
              value.trim() && !disabled
                ? 'bg-accent text-text-primary hover:bg-accent-hover'
                : 'bg-bg-elevated text-text-muted cursor-not-allowed'
            )}
            aria-label="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
