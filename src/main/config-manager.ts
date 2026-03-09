import { app } from 'electron'
import path from 'path'
import fs from 'fs'

interface AppConfig {
  recentProjects: string[]
  lastOpenProject: string | null
}

const CONFIG_DIR = path.join(app.getPath('home'), '.claudette')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const MAX_RECENT = 10

let config: AppConfig = { recentProjects: [], lastOpenProject: null }
let loaded = false

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

function loadConfig(): AppConfig {
  if (loaded) return config
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) }
    }
  } catch {
    // Use defaults
  }
  loaded = true
  return config
}

function saveConfig(): void {
  try {
    ensureDir()
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save config:', err)
  }
}

export function getRecentProjects(): string[] {
  return loadConfig().recentProjects
}

export function addRecentProject(projectPath: string): void {
  loadConfig()
  // Remove if already present, then prepend
  config.recentProjects = config.recentProjects.filter(
    (p) => p.toLowerCase() !== projectPath.toLowerCase()
  )
  config.recentProjects.unshift(projectPath)
  // Trim to max
  if (config.recentProjects.length > MAX_RECENT) {
    config.recentProjects = config.recentProjects.slice(0, MAX_RECENT)
  }
  saveConfig()
}

export function getLastProject(): string | null {
  return loadConfig().lastOpenProject
}

export function setLastProject(projectPath: string | null): void {
  loadConfig()
  config.lastOpenProject = projectPath
  saveConfig()
}
