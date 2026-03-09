import chokidar from 'chokidar'
import { getMainWindow } from './index'

let watcher: chokidar.FSWatcher | null = null
let debounceTimer: NodeJS.Timeout | null = null
let gitDebounceTimer: NodeJS.Timeout | null = null

const IGNORED = /(node_modules|\.git|dist|build|\.next|__pycache__|\.venv|venv|coverage|\.turbo|\.nuxt)/

export function startWatching(projectPath: string): void {
  stopWatching()

  watcher = chokidar.watch(projectPath, {
    ignored: IGNORED,
    ignoreInitial: true,
    depth: 8,
    persistent: true,
  })

  const onChange = () => {
    // Debounce fs:tree-updated
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('fs:tree-updated')
      }
    }, 200)

    // Debounce git:status-updated
    if (gitDebounceTimer) clearTimeout(gitDebounceTimer)
    gitDebounceTimer = setTimeout(() => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('git:status-updated')
      }
    }, 300)
  }

  watcher.on('add', onChange)
  watcher.on('change', onChange)
  watcher.on('unlink', onChange)
  watcher.on('addDir', onChange)
  watcher.on('unlinkDir', onChange)
}

export function stopWatching(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (gitDebounceTimer) {
    clearTimeout(gitDebounceTimer)
    gitDebounceTimer = null
  }
  if (watcher) {
    watcher.close()
    watcher = null
  }
}

export function watchFile(filePath: string, callback: () => void): () => void {
  const fileWatcher = chokidar.watch(filePath, {
    ignoreInitial: true,
    persistent: true,
  })
  fileWatcher.on('change', callback)
  return () => { fileWatcher.close() }
}
