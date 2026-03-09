import { useState, useEffect, useMemo } from 'react'
import { FileCode, Search, Bookmark, Trash2, Plus, ChevronRight } from 'lucide-react'
import { Button } from '../shared/Button'
import { useToast } from '../shared/ToastProvider'

interface PromptTemplate {
  id: string
  name: string
  description: string
  prompt: string
  variables: string[]
  category: 'builtin' | 'custom'
}

interface TemplatePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (prompt: string) => void
}

export function TemplatePicker({ open, onClose, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PromptTemplate | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [showCreate, setShowCreate] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      window.electronAPI.listTemplates().then(setTemplates).catch(() => toast('error', 'Failed to load templates'))
      setSearch('')
      setSelected(null)
      setShowCreate(false)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return templates
    const q = search.toLowerCase()
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    )
  }, [templates, search])

  const builtins = filtered.filter((t) => t.category === 'builtin')
  const customs = filtered.filter((t) => t.category === 'custom')

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelected(template)
    const vars: Record<string, string> = {}
    template.variables.forEach((v) => { vars[v] = '' })
    setVariables(vars)
  }

  const handleUse = async () => {
    if (!selected) return
    try {
      const resolved = await window.electronAPI.resolveTemplate(selected.prompt, variables)
      onSelect(resolved)
      onClose()
    } catch (err) {
      toast('error', 'Failed to resolve template')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI.deleteTemplate(id)
      toast('info', 'Template deleted')
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      toast('error', 'Failed to delete template')
    }
  }

  if (!open) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-20">
      <div className="bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-in-up max-h-[400px]">
        {showCreate ? (
          <CreateTemplate
            onSave={() => {
              setShowCreate(false)
              window.electronAPI.listTemplates().then(setTemplates).catch(() => {})
            }}
            onCancel={() => setShowCreate(false)}
          />
        ) : selected ? (
          <TemplateDetail
            template={selected}
            variables={variables}
            onChangeVar={(key, val) => setVariables({ ...variables, [key]: val })}
            onUse={handleUse}
            onBack={() => setSelected(null)}
          />
        ) : (
          <>
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="w-3.5 h-3.5 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
                autoFocus
              />
              <Button variant="ghost" size="sm" icon={<Plus className="w-3 h-3" />} onClick={() => setShowCreate(true)}>
                New
              </Button>
            </div>

            {/* Template list */}
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar py-1">
              {builtins.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 text-2xs font-medium text-text-muted uppercase tracking-wider">Built-in</div>
                  {builtins.map((t) => (
                    <TemplateRow key={t.id} template={t} onClick={() => handleSelectTemplate(t)} />
                  ))}
                </>
              )}
              {customs.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 text-2xs font-medium text-text-muted uppercase tracking-wider">Custom</div>
                  {customs.map((t) => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      onClick={() => handleSelectTemplate(t)}
                      onDelete={() => handleDelete(t.id)}
                    />
                  ))}
                </>
              )}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-text-muted">
                  No templates found
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TemplateRow({
  template,
  onClick,
  onDelete,
}: {
  template: PromptTemplate
  onClick: () => void
  onDelete?: () => void
}) {
  return (
    <div className="flex items-center group">
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-elevated transition-colors"
      >
        <Bookmark className="w-3.5 h-3.5 text-accent flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-xs text-text-primary truncate">{template.name}</div>
          <div className="text-2xs text-text-muted truncate">{template.description}</div>
        </div>
        <ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0 ml-auto" />
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="px-2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all duration-100"
          aria-label="Delete template"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function TemplateDetail({
  template,
  variables,
  onChangeVar,
  onUse,
  onBack,
}: {
  template: PromptTemplate
  variables: Record<string, string>
  onChangeVar: (key: string, value: string) => void
  onUse: () => void
  onBack: () => void
}) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-text-muted hover:text-text-primary text-xs">
          &larr; Back
        </button>
        <span className="text-sm font-medium text-text-primary">{template.name}</span>
      </div>

      <pre className="text-2xs text-text-secondary bg-bg-elevated p-2 rounded-md max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
        {template.prompt}
      </pre>

      {template.variables.length > 0 && (
        <div className="space-y-2">
          <div className="text-2xs text-text-muted">Fill in variables:</div>
          {template.variables.map((varName) => (
            <div key={varName}>
              <label className="text-2xs text-text-secondary mb-0.5 block">{`{{${varName}}}`}</label>
              <input
                value={variables[varName] || ''}
                onChange={(e) => onChangeVar(varName, e.target.value)}
                placeholder={varName}
                className="w-full h-7 px-2 text-xs bg-bg-base border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
          ))}
        </div>
      )}

      <Button variant="primary" size="sm" onClick={onUse} className="w-full">
        Use Template
      </Button>
    </div>
  )
}

function CreateTemplate({
  onSave,
  onCancel,
}: {
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (!name.trim() || !prompt.trim()) return
    setSaving(true)
    try {
      await window.electronAPI.saveTemplate({
        id: `custom-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        prompt: prompt.trim(),
      })
      toast('success', `Template "${name}" created`)
      onSave()
    } catch (err) {
      toast('error', 'Failed to save template')
    }
    setSaving(false)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary text-xs">
          &larr; Back
        </button>
        <span className="text-sm font-medium text-text-primary">New Template</span>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        className="w-full h-7 px-2 text-xs bg-bg-base border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
        className="w-full h-7 px-2 text-xs bg-bg-base border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt template... Use {{variable}} for placeholders"
        rows={4}
        className="w-full resize-none px-2 py-1.5 text-xs font-mono bg-bg-base border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 select-text"
      />
      <div className="text-2xs text-text-muted">
        Use <code className="px-1 py-0.5 bg-bg-elevated rounded text-accent">{'{{variable}}'}</code> for placeholders
      </div>
      <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={!name.trim() || !prompt.trim()}>
        Create Template
      </Button>
    </div>
  )
}
