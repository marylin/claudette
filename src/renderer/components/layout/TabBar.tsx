import { MessageSquare, FolderTree, GitBranch, Bot, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore, type TabId } from '../../store/app.store'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
  shortcut: string
}

const tabs: Tab[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-3.5 h-3.5" />, shortcut: 'Ctrl+1' },
  { id: 'files', label: 'Files', icon: <FolderTree className="w-3.5 h-3.5" />, shortcut: 'Ctrl+2' },
  { id: 'git', label: 'Git', icon: <GitBranch className="w-3.5 h-3.5" />, shortcut: 'Ctrl+3' },
  { id: 'agents', label: 'Agents', icon: <Bot className="w-3.5 h-3.5" />, shortcut: 'Ctrl+4' },
  { id: 'usage', label: 'Usage', icon: <BarChart3 className="w-3.5 h-3.5" />, shortcut: 'Ctrl+5' },
]

export function TabBar() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  return (
    <div className="h-tab-bar bg-bg-surface border-b border-border flex items-end px-2 gap-0.5 shrink-0" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-label={`${tab.label} (${tab.shortcut})`}
          onClick={() => setActiveTab(tab.id)}
          className={clsx(
            'flex items-center gap-1.5 px-3 h-[34px] text-xs font-medium rounded-t-md transition-colors relative',
            activeTab === tab.id
              ? 'bg-bg-base text-text-primary border-t border-x border-border border-b-transparent -mb-px'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50'
          )}
          title={tab.shortcut}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
