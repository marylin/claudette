import { useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import Editor from '@monaco-editor/react'

interface CodeViewerProps {
  filePath: string
  content: string
}

const extLangMap: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  md: 'markdown',
  css: 'css',
  html: 'html',
  py: 'python',
  rs: 'rust',
  go: 'go',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
}

export function CodeViewer({ filePath, content }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)

  const fileName = filePath.split(/[\\/]/).pop() || ''
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const language = extLangMap[ext] || 'plaintext'

  const lineCount = useMemo(() => content.split('\n').length, [content])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-border bg-bg-surface shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-text-primary truncate">{fileName}</span>
          <span className="text-2xs text-text-muted">{language}</span>
          <span className="text-2xs text-text-muted">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-2xs text-text-muted hover:text-text-primary rounded transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          value={content}
          language={language}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
            lineNumbers: 'on',
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            padding: { top: 8, bottom: 8 },
            domReadOnly: true,
          }}
        />
      </div>
    </div>
  )
}
