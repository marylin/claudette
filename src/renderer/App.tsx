import { useEffect, useState } from 'react'
import { TitleBar } from './components/layout/TitleBar'
import { Sidebar } from './components/layout/Sidebar'
import { TabBar } from './components/layout/TabBar'
import { StatusBar } from './components/layout/StatusBar'
import { ChatPanel } from './components/chat/ChatPanel'
import { TerminalPanel } from './components/terminal/TerminalPanel'
import { FileExplorer } from './components/files/FileExplorer'
import { GitPanel } from './components/git/GitPanel'
import { AgentsPanel } from './components/agents/AgentsPanel'
import { UsagePanel } from './components/analytics/UsagePanel'
import { SettingsPanel } from './components/shared/SettingsPanel'
import { CommandPalette } from './components/shared/CommandPalette'
import { KeyboardShortcuts } from './components/shared/KeyboardShortcuts'
import { useAppStore, type TabId } from './store/app.store'

function MainPanel() {
  const activeTab = useAppStore((s) => s.activeTab)

  switch (activeTab) {
    case 'chat':
      return <ChatPanel />
    case 'files':
      return <FileExplorer />
    case 'git':
      return <GitPanel />
    case 'agents':
      return <AgentsPanel />
    case 'usage':
      return <UsagePanel />
    default:
      return <ChatPanel />
  }
}

export default function App() {
  const terminalVisible = useAppStore((s) => s.terminalVisible)
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const toggleTerminal = useAppStore((s) => s.toggleTerminal)
  const setSettings = useAppStore((s) => s.setSettings)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const settings = useAppStore((s) => s.settings)

  // Load settings on mount
  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings)
  }, [setSettings])

  // Apply font size setting to root
  useEffect(() => {
    if (settings?.fontSize) {
      document.documentElement.style.fontSize = `${settings.fontSize}px`
    }
  }, [settings?.fontSize])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const tabMap: Record<string, TabId> = {
          '1': 'chat',
          '2': 'files',
          '3': 'git',
          '4': 'agents',
          '5': 'usage',
        }

        if (tabMap[e.key]) {
          e.preventDefault()
          setActiveTab(tabMap[e.key])
          return
        }

        if (e.key === 'b') {
          e.preventDefault()
          toggleSidebar()
          return
        }

        if (e.key === '`') {
          e.preventDefault()
          toggleTerminal()
          return
        }

        if (e.key === 'k') {
          e.preventDefault()
          setCommandPaletteOpen((o) => !o)
          return
        }
      }

      // ? key (no modifier) for keyboard shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        if (!isInput) {
          e.preventDefault()
          setShortcutsOpen((o) => !o)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveTab, toggleSidebar, toggleTerminal])

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-base">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TabBar />
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <MainPanel />
          </div>
          {terminalVisible && (
            <div className="border-t border-border">
              <TerminalPanel />
            </div>
          )}
        </div>
      </div>
      <StatusBar />
      {settingsOpen && <SettingsPanel />}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
