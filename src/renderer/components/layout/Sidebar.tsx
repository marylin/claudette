import { useEffect, useState } from 'react'
import { FolderOpen, ChevronRight, ChevronDown, Plus, PanelLeftClose, PanelLeft, Clock, MessageSquare, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../../store/app.store'
import { useProjectStore } from '../../store/project.store'
import { useSessionStore } from '../../store/session.store'
import { EmptyState } from '../shared/EmptyState'
import { Button } from '../shared/Button'
import { formatDistanceToNow } from 'date-fns'
import type { Project, Session } from '@shared/types'

export function Sidebar() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const activeProject = useAppStore((s) => s.activeProject)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const projects = useProjectStore((s) => s.projects)
  const loading = useProjectStore((s) => s.loading)
  const fetchProjects = useProjectStore((s) => s.fetchProjects)

  const [expandedProject, setExpandedProject] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleOpenFolder = async () => {
    const folderPath = await window.electronAPI.openFolder()
    if (folderPath) {
      fetchProjects()
    }
  }

  const handleSelectProject = (project: Project) => {
    setActiveProject(project)
    setExpandedProject(expandedProject === project.id ? null : project.id)
  }

  if (sidebarCollapsed) {
    return (
      <div className="w-sidebar-collapsed bg-bg-surface border-r border-border flex flex-col items-center py-2 gap-1 shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <div className="w-6 border-t border-border my-1" />
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => handleSelectProject(project)}
            className={clsx(
              'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
              activeProject?.id === project.id
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            )}
            title={project.name}
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        ))}
        <button
          onClick={handleOpenFolder}
          className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors mt-auto"
          aria-label="Open folder"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-sidebar bg-bg-surface border-r border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="h-tab-bar px-3 flex items-center justify-between border-b border-border shrink-0">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Projects</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenFolder}
            className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary rounded transition-colors"
            aria-label="Open folder"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleSidebar}
            className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary rounded transition-colors"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading && projects.length === 0 && (
          <div className="px-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-bg-elevated rounded-md mb-1 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <EmptyState
            icon={<FolderOpen className="w-8 h-8" />}
            title="No projects yet"
            description="Open a folder to start working with Claude"
            action={{ label: 'Open Folder', onClick: handleOpenFolder }}
          />
        )}

        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            isActive={activeProject?.id === project.id}
            isExpanded={expandedProject === project.id}
            onSelect={() => handleSelectProject(project)}
          />
        ))}
      </div>
    </div>
  )
}

function ProjectItem({
  project,
  isActive,
  isExpanded,
  onSelect,
}: {
  project: Project
  isActive: boolean
  isExpanded: boolean
  onSelect: () => void
}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const setActiveSessionId = useSessionStore((s) => s.setActiveSessionId)
  const clearMessages = useSessionStore((s) => s.clearMessages)

  useEffect(() => {
    if (isExpanded) {
      setLoadingSessions(true)
      window.electronAPI.listSessions(project.path).then((s: Session[]) => {
        setSessions(s)
        setLoadingSessions(false)
      }).catch(() => {
        setSessions([])
        setLoadingSessions(false)
      })
    }
  }, [isExpanded, project.path])

  const handleNewSession = () => {
    clearMessages()
    setActiveSessionId(null)
  }

  const handleResumeSession = (session: Session) => {
    setActiveSessionId(session.id)
  }

  return (
    <div>
      <button
        onClick={onSelect}
        className={clsx(
          'w-full px-3 py-2 flex items-start gap-2 text-left transition-colors',
          isActive ? 'bg-accent/10 text-text-primary' : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
        )}
      >
        <div className="mt-0.5 shrink-0">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-accent" />
            <span className="text-sm font-medium truncate">{project.name}</span>
            {project.hasClaudeMd && <FileText className="w-3 h-3 text-accent shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {project.lastSessionAt && (
              <span className="text-2xs text-text-muted flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatDistanceToNow(new Date(project.lastSessionAt), { addSuffix: true })}
              </span>
            )}
            <span className="text-2xs text-text-muted">
              {project.sessionCount} session{project.sessionCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </button>

      {/* Sessions list */}
      {isExpanded && (
        <div className="pl-7 pr-2 py-1 space-y-0.5">
          <button
            onClick={handleNewSession}
            className="w-full px-2 py-1.5 flex items-center gap-1.5 text-xs text-accent hover:bg-accent/10 rounded-md transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Session
          </button>

          {loadingSessions && (
            <div className="px-2 py-1 text-2xs text-text-muted">Loading sessions...</div>
          )}

          {!loadingSessions && sessions.length === 0 && (
            <div className="px-2 py-2 text-2xs text-text-muted">No previous sessions</div>
          )}

          {sessions.slice(0, 10).map((session) => (
            <button
              key={session.id}
              onClick={() => handleResumeSession(session)}
              className="w-full px-2 py-1.5 text-left hover:bg-bg-elevated rounded-md transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-text-muted shrink-0" />
                <span className="text-xs text-text-secondary truncate group-hover:text-text-primary">
                  {session.summary || 'Untitled session'}
                </span>
              </div>
              <div className="text-2xs text-text-muted mt-0.5 pl-[18px]">
                {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                {session.messageCount > 0 && ` · ${session.messageCount} msgs`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
