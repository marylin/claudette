import { useState, useMemo, memo } from 'react'
import { Copy, Check, ChevronRight, ChevronDown, User, Bot, Info } from 'lucide-react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@shared/types'
import { formatDistanceToNow } from 'date-fns'

interface MessageBubbleProps {
  message: Message
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const [showTimestamp, setShowTimestamp] = useState(false)

  if (message.role === 'system') {
    return (
      <div className="flex justify-center animate-fade-in">
        <div
          className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated rounded-lg text-xs text-text-muted max-w-[80%]"
          onMouseEnter={() => setShowTimestamp(true)}
          onMouseLeave={() => setShowTimestamp(false)}
        >
          <Info className="w-3 h-3 shrink-0" />
          <span className="select-text">{message.content}</span>
          {showTimestamp && (
            <span className="text-2xs text-text-muted shrink-0">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div
          className="flex gap-2 max-w-[80%]"
          onMouseEnter={() => setShowTimestamp(true)}
          onMouseLeave={() => setShowTimestamp(false)}
        >
          {showTimestamp && (
            <span className="text-2xs text-text-muted self-end shrink-0 pb-1">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
          )}
          <div className="bg-accent/15 border border-accent/20 rounded-lg px-3 py-2">
            <p className="text-sm text-text-primary whitespace-pre-wrap select-text">
              {message.content}
            </p>
          </div>
          <div className="w-6 h-6 rounded-md bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
            <User className="w-3.5 h-3.5 text-accent" />
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className="flex gap-2 max-w-[85%]"
        onMouseEnter={() => setShowTimestamp(true)}
        onMouseLeave={() => setShowTimestamp(false)}
      >
        <div className="w-6 h-6 rounded-md bg-bg-elevated flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-text-secondary" />
        </div>
        <div className="min-w-0">
          <div className="bg-bg-surface border border-border rounded-lg px-3 py-2 select-text">
            <MarkdownContent content={message.content} />
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-accent animate-blink ml-0.5 align-text-bottom" />
            )}
          </div>
          {showTimestamp && (
            <span className="text-2xs text-text-muted mt-0.5 block">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-sm text-text-primary mb-2 last:mb-0">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-text-primary mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-md font-semibold text-text-primary mb-1.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-text-primary mb-1">{children}</h3>
          ),
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-sm text-text-primary">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-accent hover:text-accent-hover underline transition-colors duration-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="px-1 py-0.5 bg-bg-elevated rounded text-xs font-mono text-accent">
                  {children}
                </code>
              )
            }
            const language = className?.replace('language-', '') || ''
            return <CodeBlock language={language}>{String(children).replace(/\n$/, '')}</CodeBlock>
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/50 pl-3 text-text-secondary italic mb-2">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="w-full text-sm border border-border rounded">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="text-left px-2 py-1 bg-bg-elevated border-b border-border text-xs font-medium text-text-secondary">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 border-b border-border/50 text-xs text-text-primary">
              {children}
            </td>
          ),
          hr: () => <hr className="border-border my-3" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-2 rounded-md overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-bg-elevated border-b border-border">
        <span className="text-2xs text-text-muted font-mono">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-primary transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre className="p-3 overflow-x-auto bg-bg-base">
        <code className="text-xs font-mono text-text-primary leading-relaxed">{children}</code>
      </pre>
    </div>
  )
}
