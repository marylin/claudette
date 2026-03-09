import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { UsageData, DailyUsage } from '../shared/types'

const CLAUDE_DIR = path.join(app.getPath('home'), '.claude')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

// Pricing per million tokens (USD) — updated for current models
const MODEL_PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6':            { input: 15,  output: 75,  cacheWrite: 18.75, cacheRead: 1.5 },
  'claude-opus-4-5-20250520':   { input: 15,  output: 75,  cacheWrite: 18.75, cacheRead: 1.5 },
  'claude-sonnet-4-6':          { input: 3,   output: 15,  cacheWrite: 3.75,  cacheRead: 0.3 },
  'claude-sonnet-4-5-20251101': { input: 3,   output: 15,  cacheWrite: 3.75,  cacheRead: 0.3 },
  'claude-haiku-4-5-20251001':  { input: 0.8, output: 4,   cacheWrite: 1,     cacheRead: 0.08 },
}

const DEFAULT_PRICING = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 }

interface ParsedEntry {
  model: string
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
  timestamp: string // ISO date
}

// Cache parsed data to avoid re-reading unchanged files
const fileCache = new Map<string, { mtime: number; entries: ParsedEntry[] }>()

function getModelPricing(model: string) {
  // Try exact match first, then prefix match
  if (MODEL_PRICING[model]) return MODEL_PRICING[model]
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(key.split('-').slice(0, -1).join('-'))) return pricing
  }
  return DEFAULT_PRICING
}

function calculateCost(entry: ParsedEntry): number {
  const pricing = getModelPricing(entry.model)
  return (
    (entry.inputTokens * pricing.input) / 1_000_000 +
    (entry.outputTokens * pricing.output) / 1_000_000 +
    (entry.cacheWriteTokens * pricing.cacheWrite) / 1_000_000 +
    (entry.cacheReadTokens * pricing.cacheRead) / 1_000_000
  )
}

function parseSessionFile(filePath: string): ParsedEntry[] {
  try {
    const stat = fs.statSync(filePath)
    const cached = fileCache.get(filePath)
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.entries
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)
    const entries: ParsedEntry[] = []

    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        // Only process assistant messages that have usage data
        if (entry.message?.role !== 'assistant') continue
        if (!entry.message?.usage) continue

        const usage = entry.message.usage
        entries.push({
          model: entry.message.model || 'unknown',
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          cacheWriteTokens: usage.cache_creation_input_tokens || 0,
          cacheReadTokens: usage.cache_read_input_tokens || 0,
          timestamp: entry.timestamp || stat.mtime.toISOString(),
        })
      } catch {
        // Skip malformed lines
      }
    }

    fileCache.set(filePath, { mtime: stat.mtimeMs, entries })
    return entries
  } catch {
    return []
  }
}

function getAllEntries(): ParsedEntry[] {
  if (!fs.existsSync(PROJECTS_DIR)) return []

  const allEntries: ParsedEntry[] = []

  try {
    const projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    for (const dir of projectDirs) {
      if (!dir.isDirectory()) continue
      const projectPath = path.join(PROJECTS_DIR, dir.name)

      try {
        const files = fs.readdirSync(projectPath)
        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue
          const entries = parseSessionFile(path.join(projectPath, file))
          allEntries.push(...entries)
        }
      } catch {
        // Skip unreadable project dirs
      }
    }
  } catch {
    // Projects dir unreadable
  }

  return allEntries
}

export function getUsageData(): UsageData {
  const entries = getAllEntries()

  // Aggregate by day
  const dailyMap = new Map<string, DailyUsage>()
  const modelMap = new Map<string, { inputTokens: number; outputTokens: number; cost: number }>()
  let totalInput = 0
  let totalOutput = 0
  let totalCost = 0
  const sessionIds = new Set<string>()

  for (const entry of entries) {
    const date = entry.timestamp.slice(0, 10) // YYYY-MM-DD
    const cost = calculateCost(entry)

    // Daily aggregation
    const existing = dailyMap.get(date) || {
      date,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      sessions: 0,
    }
    existing.inputTokens += entry.inputTokens + entry.cacheWriteTokens + entry.cacheReadTokens
    existing.outputTokens += entry.outputTokens
    existing.cost += cost
    dailyMap.set(date, existing)

    // Model aggregation
    const modelKey = normalizeModelName(entry.model)
    const modelData = modelMap.get(modelKey) || { inputTokens: 0, outputTokens: 0, cost: 0 }
    modelData.inputTokens += entry.inputTokens + entry.cacheWriteTokens + entry.cacheReadTokens
    modelData.outputTokens += entry.outputTokens
    modelData.cost += cost
    modelMap.set(modelKey, modelData)

    // Totals
    totalInput += entry.inputTokens + entry.cacheWriteTokens + entry.cacheReadTokens
    totalOutput += entry.outputTokens
    totalCost += cost
  }

  // Count sessions from JSONL files
  try {
    if (fs.existsSync(PROJECTS_DIR)) {
      const projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
      for (const dir of projectDirs) {
        if (!dir.isDirectory()) continue
        try {
          const files = fs.readdirSync(path.join(PROJECTS_DIR, dir.name))
          for (const file of files) {
            if (file.endsWith('.jsonl')) sessionIds.add(file)
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }

  // Sort daily by date
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Convert model map to record
  const byModel: Record<string, { inputTokens: number; outputTokens: number; cost: number }> = {}
  for (const [model, data] of modelMap) {
    byModel[model] = data
  }

  return {
    daily,
    total: {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cost: totalCost,
      sessions: sessionIds.size,
    },
    byModel,
  }
}

function normalizeModelName(model: string): string {
  // Strip date suffixes for cleaner grouping
  if (model.includes('opus-4-6') || model.includes('opus-4-5')) return 'Claude Opus'
  if (model.includes('sonnet-4-6') || model.includes('sonnet-4-5')) return 'Claude Sonnet'
  if (model.includes('haiku-4-5')) return 'Claude Haiku'
  if (model.includes('opus')) return 'Claude Opus'
  if (model.includes('sonnet')) return 'Claude Sonnet'
  if (model.includes('haiku')) return 'Claude Haiku'
  return model
}
