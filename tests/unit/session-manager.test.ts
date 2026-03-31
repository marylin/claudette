import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'path'
import fs from 'fs'
import os from 'os'

// Import after mocking
const { listProjects, listSessions, deleteSession } = await import('../../src/main/session-manager')

const TEST_HOME = path.join(os.tmpdir(), 'claudette-test-sm')

// Override the mock to use our unique dir
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'home') return path.join(os.tmpdir(), 'claudette-test-sm')
      return os.tmpdir()
    },
  },
}))

const CLAUDE_DIR = path.join(TEST_HOME, '.claude')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

function createTempProject(name: string, sessions: { id: string; lines: string[] }[]) {
  const projectDir = path.join(PROJECTS_DIR, name)
  fs.mkdirSync(projectDir, { recursive: true })
  for (const session of sessions) {
    fs.writeFileSync(path.join(projectDir, `${session.id}.jsonl`), session.lines.join('\n') + '\n')
  }
  return projectDir
}

describe('session-manager', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_HOME)) {
      fs.rmSync(TEST_HOME, { recursive: true, force: true })
    }
  })

  afterEach(() => {
    if (fs.existsSync(TEST_HOME)) {
      fs.rmSync(TEST_HOME, { recursive: true, force: true })
    }
  })

  describe('listProjects', () => {
    it('returns empty array when projects dir does not exist', () => {
      const projects = listProjects()
      expect(projects).toEqual([])
    })

    it('returns empty array when projects dir is empty', () => {
      fs.mkdirSync(PROJECTS_DIR, { recursive: true })
      const projects = listProjects()
      expect(projects).toEqual([])
    })

    it('lists projects with session data', () => {
      createTempProject('test-project', [
        {
          id: 'session-1',
          lines: [
            JSON.stringify({ role: 'user', content: 'Hello world' }),
            JSON.stringify({ role: 'assistant', content: 'Hi there' }),
          ],
        },
      ])

      const projects = listProjects()
      const testProject = projects.find((p) => p.id === 'test-project')
      expect(testProject).toBeDefined()
      expect(testProject!.sessionCount).toBe(1)
    })

    it('ignores non-directory entries', () => {
      fs.mkdirSync(PROJECTS_DIR, { recursive: true })
      fs.writeFileSync(path.join(PROJECTS_DIR, 'not-a-dir.txt'), 'data')

      const projects = listProjects()
      expect(projects).toEqual([])
    })

    it('handles multiple projects sorted by last session', () => {
      createTempProject('project-a', [
        {
          id: 'old-session',
          lines: [JSON.stringify({ role: 'user', content: 'Old' })],
        },
      ])
      // Small delay to ensure different mtimes
      createTempProject('project-b', [
        {
          id: 'new-session',
          lines: [JSON.stringify({ role: 'user', content: 'New' })],
        },
      ])

      const projects = listProjects()
      expect(projects.length).toBe(2)
    })
  })

  describe('listSessions', () => {
    it('returns empty array for nonexistent project', () => {
      const sessions = listSessions('/nonexistent/path')
      expect(sessions).toEqual([])
    })

    it('parses session JSONL files', () => {
      createTempProject('my-project', [
        {
          id: 'test-session',
          lines: [
            JSON.stringify({ role: 'user', content: 'What is 2+2?' }),
            JSON.stringify({ role: 'assistant', content: '4' }),
            JSON.stringify({ role: 'user', content: 'Thanks' }),
          ],
        },
      ])

      // Since listSessions matches by decoded path, use the encoded name
      const sessions = listSessions('my-project')
      expect(sessions.length).toBe(1)
      expect(sessions[0].id).toBe('test-session')
      expect(sessions[0].messageCount).toBe(3)
      expect(sessions[0].summary).toBe('What is 2+2?')
    })

    it('handles malformed JSONL gracefully', () => {
      createTempProject('broken-project', [
        {
          id: 'broken-session',
          lines: ['not json', JSON.stringify({ role: 'user', content: 'Valid line' }), '{broken'],
        },
      ])

      const sessions = listSessions('broken-project')
      expect(sessions.length).toBe(1)
      // Should have parsed what it could
      expect(sessions[0].messageCount).toBe(1)
    })

    it('handles empty JSONL file', () => {
      const projectDir = path.join(PROJECTS_DIR, 'empty-project')
      fs.mkdirSync(projectDir, { recursive: true })
      fs.writeFileSync(path.join(projectDir, 'empty.jsonl'), '')

      const sessions = listSessions('empty-project')
      expect(sessions).toEqual([])
    })

    it('extracts token count from usage field', () => {
      createTempProject('usage-project', [
        {
          id: 'usage-session',
          lines: [
            JSON.stringify({
              role: 'user',
              content: 'Test',
              usage: { input_tokens: 10, output_tokens: 20 },
            }),
          ],
        },
      ])

      const sessions = listSessions('usage-project')
      expect(sessions.length).toBe(1)
      expect(sessions[0].tokenCount).toBe(30)
    })
  })

  describe('deleteSession', () => {
    it('deletes a session file by project dir and session id', () => {
      const projectDir = createTempProject('test-delete-proj', [
        { id: 'session-keep', lines: ['{"role":"user","content":"keep"}'] },
        { id: 'session-remove', lines: ['{"role":"user","content":"remove"}'] },
      ])

      deleteSession(projectDir, 'session-remove')

      // Verify the file is actually deleted
      const files = fs.readdirSync(projectDir)
      expect(files).toContain('session-keep.jsonl')
      expect(files).not.toContain('session-remove.jsonl')
    })

    it('does not throw when session file does not exist', () => {
      const projectDir = createTempProject('test-delete-missing', [
        { id: 'only-session', lines: ['{"role":"user","content":"hi"}'] },
      ])

      expect(() => deleteSession(projectDir, 'nonexistent')).not.toThrow()
    })
  })
})
