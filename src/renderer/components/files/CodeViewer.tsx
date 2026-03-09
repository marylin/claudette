import { useMemo } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import path from 'path'

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
  sh: 'bash',
  bash: 'bash',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
}

export function CodeViewer({ filePath, content }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)

  const fileName = filePath.split(/[\\/]/).pop() || ''
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const language = extLangMap[ext] || 'text'

  const lines = useMemo(() => content.split('\n'), [content])

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
          <span className="text-2xs text-text-muted">{lines.length} lines</span>
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

      {/* Code area */}
      <div className="flex-1 overflow-auto bg-bg-base select-text">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-bg-elevated/50 transition-colors duration-100">
                <td className="text-right px-3 py-0 text-2xs text-text-muted select-none w-12 align-top font-mono border-r border-border/50">
                  {idx + 1}
                </td>
                <td className="px-3 py-0 font-mono text-xs text-text-primary whitespace-pre overflow-x-auto">
                  {line || '\u00A0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
