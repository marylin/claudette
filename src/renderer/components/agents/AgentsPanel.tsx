import { useState, useEffect } from 'react'
import { Bot, Plus, Pencil, Trash2, Play } from 'lucide-react'
import { EmptyState } from '../shared/EmptyState'
import { Button } from '../shared/Button'
import { Badge } from '../shared/Badge'
import { useToast } from '../shared/ToastProvider'
import type { Agent, AgentModel } from '@shared/types'

export function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [editing, setEditing] = useState<Partial<Agent> | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const refresh = async () => {
    try {
      const list = await window.electronAPI.listAgents()
      setAgents(list)
    } catch (err) {
      toast('error', 'Failed to load agents')
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const handleSave = async () => {
    if (!editing?.name) return
    const isNew = !editing.id
    try {
      await window.electronAPI.saveAgent({
        id: editing.id || `agent-${Date.now()}`,
        name: editing.name,
        description: editing.description || '',
        systemPrompt: editing.systemPrompt || '',
        model: editing.model || 'claude-sonnet-4-5',
        allowedTools: editing.allowedTools || [],
        createdAt: editing.createdAt || new Date(),
        updatedAt: new Date(),
      } as Agent)
      toast('success', `Agent "${editing.name}" ${isNew ? 'created' : 'updated'}`)
      setEditing(null)
      refresh()
    } catch (err) {
      toast('error', `Failed to save agent: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDelete = async (id: string) => {
    const agent = agents.find((a) => a.id === id)
    try {
      await window.electronAPI.deleteAgent(id)
      toast('info', `Agent "${agent?.name || id}" deleted`)
      refresh()
    } catch (err) {
      toast('error', `Failed to delete agent: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (editing) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">{editing.id ? 'Edit Agent' : 'New Agent'}</h2>
        <Field label="Name" value={editing.name || ''} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="My Agent" />
        <Field label="Description" value={editing.description || ''} onChange={(v) => setEditing({ ...editing, description: v })} placeholder="What this agent does" />
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">System Prompt</label>
          <textarea value={editing.systemPrompt || ''} onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })} rows={6} className="w-full resize-none rounded-md border border-border bg-bg-base px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 select-text" placeholder="You are a helpful assistant that..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">Model</label>
          <select value={editing.model || 'claude-sonnet-4-5'} onChange={(e) => setEditing({ ...editing, model: e.target.value as AgentModel })} className="h-8 px-2.5 text-xs bg-bg-base border border-border rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50">
            <option value="claude-sonnet-4-5">Sonnet 4.5</option>
            <option value="claude-opus-4-5">Opus 4.5</option>
            <option value="claude-haiku-4-5">Haiku 4.5</option>
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-full text-xs text-text-muted">Loading...</div>

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState icon={<Bot className="w-10 h-10" />} title="No agents yet" description="Create custom agents with system prompts and model selection" action={{ label: 'Create Agent', onClick: () => setEditing({}) }} />
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-primary">Agents</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setEditing({})}>New Agent</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent) => (
          <div key={agent.id} className="border border-border rounded-lg p-4 bg-bg-surface hover:border-border-strong transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-text-primary">{agent.name}</span>
              </div>
              <Badge>{agent.model.replace('claude-', '').replace('-4-5', '')}</Badge>
            </div>
            {agent.description && <p className="text-xs text-text-secondary mb-3">{agent.description}</p>}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" icon={<Pencil className="w-3 h-3" />} onClick={() => setEditing(agent)}>Edit</Button>
              <Button variant="ghost" size="sm" icon={<Trash2 className="w-3 h-3" />} onClick={() => handleDelete(agent.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-primary mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full h-8 px-2.5 text-xs bg-bg-base border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50" />
    </div>
  )
}
