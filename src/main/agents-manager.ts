import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { Agent } from '../shared/types'

const AGENTS_FILE = path.join(app.getPath('userData'), 'agents.json')

function readAgents(): Agent[] {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'))
    }
  } catch { /* ignore */ }
  return []
}

function writeAgents(agents: Agent[]): void {
  const dir = path.dirname(AGENTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8')
}

export function listAgents(): Agent[] {
  return readAgents()
}

export function saveAgent(agent: Agent): Agent {
  const agents = readAgents()
  const idx = agents.findIndex((a) => a.id === agent.id)
  if (idx >= 0) {
    agents[idx] = { ...agent, updatedAt: new Date() }
  } else {
    agents.push({ ...agent, id: agent.id || `agent-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() })
  }
  writeAgents(agents)
  return agents[idx >= 0 ? idx : agents.length - 1]
}

export function deleteAgent(agentId: string): void {
  const agents = readAgents().filter((a) => a.id !== agentId)
  writeAgents(agents)
}

export function getAgent(agentId: string): Agent | null {
  return readAgents().find((a) => a.id === agentId) || null
}
