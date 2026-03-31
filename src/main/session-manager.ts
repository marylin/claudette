import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { Project, Session } from '../shared/types'

const CLAUDE_DIR = path.join(app.getPath('home'), '.claude')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

export function listProjects(): Project[] {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) return []

    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    const projects: Project[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const projectDir = path.join(PROJECTS_DIR, entry.name)
      const decodedPath = decodeProjectDirName(entry.name)
      const sessions = listSessionsForPath(projectDir)

      const lastSession =
        sessions.length > 0 ? sessions.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)) : null

      projects.push({
        id: entry.name,
        name: path.basename(decodedPath),
        path: decodedPath,
        encodedPath: entry.name,
        lastSessionAt: lastSession?.updatedAt ?? null,
        sessionCount: sessions.length,
        hasClaudeMd: fs.existsSync(path.join(decodedPath, 'CLAUDE.md')),
      })
    }

    projects.sort((a, b) => {
      if (!a.lastSessionAt && !b.lastSessionAt) return 0
      if (!a.lastSessionAt) return 1
      if (!b.lastSessionAt) return -1
      return new Date(b.lastSessionAt).getTime() - new Date(a.lastSessionAt).getTime()
    })

    return projects
  } catch (err) {
    console.error('Failed to list projects:', err)
    return []
  }
}

export function listSessions(projectPath: string): Session[] {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) return []

    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const decoded = decodeProjectDirName(entry.name)
      if (normalizePath(decoded) === normalizePath(projectPath)) {
        return listSessionsForPath(path.join(PROJECTS_DIR, entry.name))
      }
    }

    return []
  } catch (err) {
    console.error('Failed to list sessions:', err)
    return []
  }
}

export function deleteSession(projectDir: string, sessionId: string): void {
  const sessionFile = path.join(projectDir, `${sessionId}.jsonl`)
  try {
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile)
    }
  } catch (err) {
    console.error('Failed to delete session:', err)
  }
}

function listSessionsForPath(projectDir: string): Session[] {
  const sessions: Session[] = []

  try {
    const files = fs.readdirSync(projectDir)
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue
      const filePath = path.join(projectDir, file)
      const session = parseSessionFile(filePath)
      if (session) sessions.push(session)
    }
  } catch {
    // Skip unreadable dirs
  }

  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return sessions
}

function parseSessionFile(filePath: string): Session | null {
  try {
    const stat = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    if (lines.length === 0) return null

    let messageCount = 0
    let summary: string | undefined
    let totalTokens = 0

    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        messageCount++

        if (entry.role === 'user' && !summary) {
          const text =
            typeof entry.content === 'string' ? entry.content : entry.content?.[0]?.text || ''
          summary = text.slice(0, 120)
        }

        if (entry.usage) {
          totalTokens += (entry.usage.input_tokens || 0) + (entry.usage.output_tokens || 0)
        }
      } catch {
        // Skip malformed lines
      }
    }

    return {
      id: path.basename(filePath, '.jsonl'),
      projectPath: path.dirname(filePath),
      createdAt: stat.birthtime,
      updatedAt: stat.mtime,
      messageCount,
      summary,
      tokenCount: totalTokens || undefined,
    }
  } catch {
    return null
  }
}

function decodeProjectDirName(encodedName: string): string {
  try {
    const decoded = decodeURIComponent(encodedName)
    if (fs.existsSync(decoded)) return decoded
  } catch {
    // Not URL encoded
  }

  if (process.platform === 'win32') {
    const parts = encodedName.split('-')
    if (parts.length > 1 && parts[0].length === 1) {
      const winPath = parts[0] + ':\\' + parts.slice(1).join('\\')
      if (fs.existsSync(winPath)) return winPath
    }
  }

  const slashPath = encodedName.replace(/-/g, '/')
  if (fs.existsSync(slashPath)) return slashPath

  return encodedName
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase()
}
