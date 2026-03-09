import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { Checkpoint } from '../shared/types'

const CHECKPOINTS_FILE = path.join(app.getPath('userData'), 'checkpoints.json')

let checkpoints: Checkpoint[] = []
let loaded = false

function load(): void {
  if (loaded) return
  try {
    if (fs.existsSync(CHECKPOINTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINTS_FILE, 'utf-8'))
      checkpoints = Array.isArray(data) ? data : []
    }
  } catch {
    checkpoints = []
  }
  loaded = true
}

function save(): void {
  try {
    const dir = path.dirname(CHECKPOINTS_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(CHECKPOINTS_FILE, JSON.stringify(checkpoints, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save checkpoints:', err)
  }
}

export function listCheckpoints(sessionId?: string): Checkpoint[] {
  load()
  if (sessionId) {
    return checkpoints.filter((c) => c.sessionId === sessionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
  return checkpoints.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function createCheckpoint(data: {
  sessionId: string
  projectPath: string
  name: string
  description?: string
  messageIndex: number
  gitRef?: string
}): Checkpoint {
  load()
  const checkpoint: Checkpoint = {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    timestamp: new Date(),
  }
  checkpoints.push(checkpoint)
  save()
  return checkpoint
}

export function deleteCheckpoint(id: string): boolean {
  load()
  const before = checkpoints.length
  checkpoints = checkpoints.filter((c) => c.id !== id)
  if (checkpoints.length < before) {
    save()
    return true
  }
  return false
}

export function getCheckpoint(id: string): Checkpoint | null {
  load()
  return checkpoints.find((c) => c.id === id) || null
}

export function deleteCheckpointsForSession(sessionId: string): number {
  load()
  const before = checkpoints.length
  checkpoints = checkpoints.filter((c) => c.sessionId !== sessionId)
  const deleted = before - checkpoints.length
  if (deleted > 0) save()
  return deleted
}
