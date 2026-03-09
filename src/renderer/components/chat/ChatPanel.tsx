import { useEffect, useRef } from 'react'
import { MessageSquare, ArrowDown, AlertTriangle, RefreshCw } from 'lucide-react'
import { useClaudeBridge } from '../../hooks/useClaudeBridge'
import { useAppStore } from '../../store/app.store'
import { useSessionStore } from '../../store/session.store'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { StreamingIndicator } from './StreamingIndicator'
import { EmptyState } from '../shared/EmptyState'
import { CheckpointPanel } from './CheckpointPanel'
import { useState } from 'react'

export function ChatPanel() {
  const { sendMessage, stopClaude, isStreaming, messages } = useClaudeBridge()
  const activeProject = useAppStore((s) => s.activeProject)
  const claudeStatus = useAppStore((s) => s.claudeStatus)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isAutoScrolling = useRef(true)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAutoScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    isAutoScrolling.current = isAtBottom
    setShowScrollButton(!isAtBottom)
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      isAutoScrolling.current = true
      setShowScrollButton(false)
    }
  }

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<MessageSquare className="w-10 h-10" />}
          title="No project selected"
          description="Select a project from the sidebar to start chatting with Claude"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Claude crash banner */}
      {claudeStatus.status === 'error' && (
        <div className="px-4 py-2 bg-error-muted border-b border-error/30 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-error flex-shrink-0" />
          <span className="text-xs text-error flex-1">
            {claudeStatus.message || 'Claude stopped unexpectedly'}
          </span>
          <button
            onClick={() => sendMessage('')}
            className="flex items-center gap-1 text-2xs text-error hover:text-text-primary transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Restart
          </button>
        </div>
      )}

      {/* Checkpoints */}
      <CheckpointPanel />

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={<MessageSquare className="w-10 h-10" />}
              title="Start a conversation with Claude"
              description="Type a message below to begin. Claude will work in your project directory."
            />
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <StreamingIndicator />
        )}
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 w-8 h-8 bg-bg-elevated border border-border rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-overlay transition-colors shadow-lg z-10"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopClaude}
        isStreaming={isStreaming}
        disabled={!activeProject}
      />
    </div>
  )
}
