# Claudette v2 — Features Plan
## Build Order, Phases & Exit Criteria

**Version**: 2.0  
**Framework**: GSD (Get Shit Done)  
**Stack**: Electron 31 + React 18 + TypeScript + Tailwind + shadcn/ui (same as v1)

---

## Overview

| Phase | Name | Duration | Features |
|---|---|---|---|
| 1 | Foundation | Week 1–2 | Process detection, new tab routing, shared infra |
| 2 | Multi-Agent Dashboard | Week 3–4 | The flagship feature — parallel agent panels |
| 3 | Skills Browser | Week 5–6 | Skills index, search, one-click install |
| 4 | MCP Marketplace | Week 7 | Server catalog, token tracking, config editor |
| 5 | Hooks Visual Editor | Week 8 | Form-based hook creation, test runner, execution log |
| 6 | Voice Mode | Week 9 | Push-to-talk, waveform, transcription preview |
| 7 | Session Replay | Week 10–11 | JSONL parser, scrubber timeline, file change viewer |
| 8 | Polish & Release | Week 12–13 | Regression testing, README update, Product Hunt |

---

## Phase 1 — Foundation
> **Goal**: All v2 infrastructure in place before building any features. No regressions on v1.

### Tasks

- [ ] **1.1** Bump Electron to latest stable, audit v1 deps for updates
- [ ] **1.2** Add `AgentProcess` and `AgentSession` types to `src/shared/types.ts`
- [ ] **1.3** Add `SkillEntry`, `McpServer`, `Hook`, `ReplaySession` types
- [ ] **1.4** Create `src/main/agent-watcher.ts` — polls running `claude` processes via `ps`/`wmic`, maps PIDs to worktree paths
- [ ] **1.5** Add IPC channels: `agents:list-processes`, `agents:kill`, `agents:output-stream`
- [ ] **1.6** Add new tabs to `TabBar`: **Agents**, **Skills**, **MCP**, **Hooks**, **Replay**
- [ ] **1.7** Create stub components for each new panel (empty state placeholder)
- [ ] **1.8** Extend Zustand store: `useAgentStore`, `useSkillsStore`, `useMcpStore`
- [ ] **1.9** Create `src/main/settings-manager.ts` — unified read/write for `~/.claude/settings.json` and project-level `.claude/settings.json`
- [ ] **1.10** Regression test all v1 features: chat, file explorer, git panel, terminal, analytics, CLAUDE.md editor

### Exit Criteria
- [ ] All v1 features pass manual regression test
- [ ] New tabs visible in UI (empty state, no errors)
- [ ] `agent-watcher.ts` correctly detects a manually spawned `claude` process in testing
- [ ] All new types compile without errors

---

## Phase 2 — Multi-Agent Dashboard
> **Goal**: A live visual grid showing all active Claude Code subagents with real-time output streams.

### Tasks

#### Process Detection
- [ ] **2.1** `agent-watcher.ts`: poll every 500ms for active `claude` CLI processes
- [ ] **2.2** Parse process args to extract `--worktree` path and `--session` ID
- [ ] **2.3** Associate each process with its project by matching worktree path to known projects
- [ ] **2.4** Emit `agents:process-list-updated` event to renderer on change
- [ ] **2.5** Attach to each process's stdout/stderr and pipe through `agents:output:{pid}` IPC channel

#### Dashboard UI (`src/renderer/components/agents/`)
- [ ] **2.6** `AgentsDashboard.tsx` — root panel, manages grid layout
- [ ] **2.7** `AgentGrid.tsx` — responsive grid: 1-up (1 agent), 2-up (2), 2×2 (3–4), 2×3 (5–6), 3×3 (7–9)
- [ ] **2.8** `AgentPanel.tsx` — individual agent card with:
  - Header: agent name/ID, worktree name, elapsed time, status badge
  - Status border color: green (running), yellow (waiting for permission), blue (done), red (error)
  - Scrolling output stream (xterm.js instance, read-only)
  - File change count badge (hover → shows file list)
  - Stop button (sends SIGTERM to process)
- [ ] **2.9** `AgentStatusBar.tsx` — top bar: "X of Y agents complete", aggregate token usage, elapsed wall time
- [ ] **2.10** `AgentEmptyState.tsx` — shown when no agents running; explains how to spawn agents via GSD or `claude --worktree`
- [ ] **2.11** Double-click any panel → expand to full screen overlay with full-size terminal
- [ ] **2.12** `useAgentProcesses.ts` hook — subscribes to `agents:process-list-updated`, manages per-agent output buffers

#### File Change Tracking
- [ ] **2.13** `agent-watcher.ts`: watch each worktree directory with `chokidar`, track new/modified/deleted files per agent PID
- [ ] **2.14** Emit `agents:files-changed:{pid}` with diff summary (count + paths)
- [ ] **2.15** `AgentFileList.tsx` — popover on file badge showing tree of changed files with M/A/D indicators

#### Wave Completion
- [ ] **2.16** Detect when all agents reach "done" status
- [ ] **2.17** Show run-complete notification with summary: total files changed, total tokens used, wall time
- [ ] **2.18** Auto-collapse completed agents to compact row (re-expandable)

### Exit Criteria
- [ ] Dashboard correctly displays 4 simultaneously running agents
- [ ] Each panel shows live output within 100ms of process writing to stdout
- [ ] Stop button kills the correct process without affecting others
- [ ] File change count updates in real time as agent edits files
- [ ] Grid layout adapts correctly for 1, 2, 4, and 6 agents

---

## Phase 3 — Skills Browser
> **Goal**: Visual marketplace for Claude Code skills with one-click install.

### Tasks

#### Data Layer
- [ ] **4.1** `src/main/skills-manager.ts` — fetch skills index from skills.sh API
- [ ] **4.2** Cache index to `~/.claudette/skills-cache.json` with 1-hour TTL
- [ ] **4.3** On cache miss or offline: serve stale cache with "offline" banner
- [ ] **4.4** Parse locally installed skills from `~/.claude/plugins/` directory
- [ ] **4.5** IPC channels: `skills:list`, `skills:search`, `skills:install`, `skills:uninstall`, `skills:toggle`

#### Skills Browser UI (`src/renderer/components/skills/`)
- [ ] **4.6** `SkillsBrowser.tsx` — root panel with search bar, filters, and grid
- [ ] **4.7** `SkillsSearchBar.tsx` — debounced search with instant filter
- [ ] **4.8** `SkillsCategoryFilter.tsx` — pill buttons: All, Dev Tools, Testing, Git, DevOps, Design, AI/Agents, Other
- [ ] **4.9** `SkillCard.tsx` — card showing:
  - Skill name + author
  - Short description (2 lines max)
  - Category badge
  - GitHub stars + install count
  - "Installed" badge if already installed
  - Install / Uninstall button
- [ ] **4.10** `SkillDetail.tsx` — slide-in panel on card click showing:
  - Full README (markdown rendered)
  - Author, version, last updated
  - GitHub link
  - Install/uninstall button
- [ ] **4.11** `InstalledSkills.tsx` — tab within Skills showing only installed skills with enable/disable toggle
- [ ] **4.12** `SkillsHero.tsx` — "Trending this week" and "Most installed" horizontal scroll sections at top

### Exit Criteria
- [ ] Skills index loads and displays within 2 seconds on first open
- [ ] Search filters results in real time with no debounce lag over 150ms
- [ ] Install button runs correct Claude Code CLI command and confirms success
- [ ] Installed skills list reflects actual state of `~/.claude/plugins/`
- [ ] Offline mode shows stale data with clear indicator, no crashes

---

## Phase 4 — MCP Marketplace
> **Goal**: Visual MCP server management with token cost visibility.

### Tasks

#### Data Layer
- [ ] **5.1** `src/main/mcp-manager.ts` — read/write MCP server configs from `~/.claude/mcp_servers.json` and project-level config
- [ ] **5.2** Maintain a curated `src/data/mcp-catalog.json` with top 50 popular servers (name, description, type, install command, typical token cost)
- [ ] **5.3** Parse active MCP servers from Claude Code session data to estimate real-time token usage
- [ ] **5.4** IPC channels: `mcp:list-catalog`, `mcp:list-active`, `mcp:add`, `mcp:remove`, `mcp:test`, `mcp:toggle`

#### MCP UI (`src/renderer/components/mcp/`)
- [ ] **5.5** `McpMarketplace.tsx` — root panel: catalog on left, active servers on right
- [ ] **5.6** `McpCatalogList.tsx` — scrollable list of curated servers with:
  - Server name, description, type (URL/stdio)
  - Token cost estimate badge (Low / Medium / High based on tool count)
  - "Add" button
- [ ] **5.7** `McpActiveList.tsx` — all configured servers with:
  - Enabled/disabled toggle
  - Live token consumption gauge (updated per session)
  - Edit and Remove buttons
  - Connection status indicator (green dot = connected, red = error)
- [ ] **5.8** `McpConfigForm.tsx` — modal for add/edit:
  - Server name, type selector (URL / stdio / docker)
  - URL or command fields (shown conditionally by type)
  - Environment variables section (key/value pairs, values masked)
  - Scope selector: global vs. current project
- [ ] **5.9** `McpTestButton.tsx` — fires test connection, shows result inline (response time or error message)
- [ ] **5.10** `McpTokenWarning.tsx` — banner shown when active servers will consume > 20% of context budget
- [ ] **5.11** `McpImportButton.tsx` — import servers from Claude Desktop `claude_desktop_config.json` (file picker)

### Exit Criteria
- [ ] Curated catalog shows at least 30 servers with accurate descriptions
- [ ] Add server via form correctly writes to config file
- [ ] Test connection works for at least URL-type MCP servers
- [ ] Token cost badge reflects approximate tool count per server
- [ ] Toggle enable/disable correctly updates config and reflects in next Claude session

---

## Phase 5 — Hooks Visual Editor
> **Goal**: Create and manage Claude Code hooks without touching JSON.

### Tasks

#### Data Layer
- [ ] **6.1** `src/main/hooks-manager.ts` — read/write hooks from user `~/.claude/settings.json` and project `.claude/settings.json`
- [ ] **6.2** Maintain execution log: last 50 hook runs stored to `~/.claudette/hooks-log.json`
- [ ] **6.3** IPC channels: `hooks:list`, `hooks:create`, `hooks:update`, `hooks:delete`, `hooks:test`, `hooks:toggle`, `hooks:log`

#### Hooks UI (`src/renderer/components/hooks/`)
- [ ] **6.4** `HooksEditor.tsx` — root panel: hooks list on left, editor/log on right
- [ ] **6.5** `HooksList.tsx` — table with columns: Event, Matcher, Command (truncated), Enabled, Actions
  - Sorted by event type
  - Color-coded by event: PreToolUse (yellow), PostToolUse (blue), SessionStart (green), Notification (purple)
- [ ] **6.6** `HookForm.tsx` — create/edit form:
  - Event dropdown with description tooltip for each type
  - Matcher text field with regex hints
  - Command text field (monospace)
  - Timeout (ms) numeric input
  - `once: true` toggle
  - Scope: user vs. project
- [ ] **6.7** `HookTestPanel.tsx` — "Test Hook" section:
  - Mock input JSON editor
  - Run button
  - stdout/stderr output in monospace box
  - Exit code badge
- [ ] **6.8** `HookTemplates.tsx` — "Start from template" section with pre-built templates:
  - Auto-format on file write (Prettier)
  - Block writes to `.env` files
  - Desktop notification on task complete
  - Run tests after Edit
  - Lint on write
- [ ] **6.9** `HookExecutionLog.tsx` — collapsible section below each hook showing last 5 runs: timestamp, exit code, truncated output
- [ ] **6.10** `HookScopeToggle.tsx` — switch between editing user-level vs. project-level hooks

### Exit Criteria
- [ ] All existing hooks from settings.json display correctly in the list
- [ ] Creating a hook via form correctly writes valid JSON to settings file
- [ ] Template hooks can be installed with one click and immediately appear in list
- [ ] Test runner executes a simple echo command and shows output correctly
- [ ] Delete hook with confirmation works and persists

---

## Phase 6 — Voice Mode
> **Goal**: Push-to-talk voice input that works on Windows native.

### Tasks

- [ ] **7.1** Audit Windows audio API options: Web Speech API (Chromium built-in), `node-record-lpcm16`, or whisper.cpp via native addon
- [ ] **7.2** Decision: use Chromium's built-in `webkitSpeechRecognition` (zero deps, works in Electron renderer) — fallback to `node-record-lpcm16` + whisper.cpp if unavailable
- [ ] **7.3** `src/renderer/hooks/useVoiceInput.ts` — manages recording state, transcription, error handling
- [ ] **7.4** `VoicePushToTalk.tsx` — button in `ChatInput.tsx`:
  - Mic icon, click-to-hold or click-to-toggle mode
  - Recording state: button pulses red
  - Waveform animation using Web Audio API `AnalyserNode`
- [ ] **7.5** `VoiceTranscriptPreview.tsx` — after recording, show transcribed text in the chat input for review before sending
  - User can edit transcription before submitting
  - Auto-send option (toggle in settings)
- [ ] **7.6** Keyboard shortcut: hold `Ctrl+Space` to record, release to transcribe
- [ ] **7.7** Settings toggle: voice mode on/off, auto-send on/off, shortcut customization
- [ ] **7.8** Error handling: mic permission denied → clear prompt to enable in system settings; no speech detected → subtle indicator, don't show error toast

### Exit Criteria
- [ ] Push-to-talk works on Windows 10 and Windows 11 native (not WSL)
- [ ] Waveform animates while recording
- [ ] Transcribed text appears in chat input correctly for a test sentence
- [ ] `Ctrl+Space` shortcut works without focus issues
- [ ] Mic permission denied state handled gracefully with instructions

---

## Phase 7 — Session Replay
> **Goal**: Scrub through any past Claude Code session like a video timeline.

### Tasks

#### Parser
- [ ] **8.1** `src/main/session-parser.ts` — parse Claude Code JSONL session files from `~/.claude/projects/`
- [ ] **8.2** Build `ReplaySession` model: ordered array of `ReplayEvent` (message | tool_call | tool_result | system)
- [ ] **8.3** For each tool call, extract: tool name, input params, result, timestamp, duration
- [ ] **8.4** For file write/edit tool calls, capture before/after content diff
- [ ] **8.5** IPC channels: `replay:list-sessions`, `replay:load`, `replay:search`

#### Replay UI (`src/renderer/components/replay/`)
- [ ] **8.6** `SessionReplay.tsx` — root panel: session picker + replay view
- [ ] **8.7** `SessionPicker.tsx` — list of past sessions with project name, date, message count, token count
  - Search by project, date range, or keyword
  - Sorted by most recent
- [ ] **8.8** `ReplayTimeline.tsx` — horizontal scrubber with event markers:
  - User messages (white dot)
  - Assistant messages (violet dot)
  - File writes (yellow dot)
  - Bash commands (orange dot)
  - Errors (red dot)
  - Click any dot → jump to that event
- [ ] **8.9** `ReplayMessageView.tsx` — main content area showing messages at current scrubber position
  - Renders all messages up to selected point
  - Highlights currently selected message
- [ ] **8.10** `ReplayFileChanges.tsx` — side panel showing files modified up to current point
  - Click file → show diff (before/after) in Monaco diff editor
- [ ] **8.11** `ReplayToolCallList.tsx` — collapsible section per assistant turn showing tool calls with inputs/outputs
- [ ] **8.12** `ReplayExporter.tsx` — "Export as Markdown" button: generates clean session transcript with tool calls summarized
- [ ] **8.13** Keyword search within session: highlight matching messages, jump between matches

### Exit Criteria
- [ ] Sessions from `~/.claude/projects/` load and parse correctly
- [ ] Scrubber moves smoothly through a 200-message session
- [ ] Clicking a timeline dot scrolls message view to that event
- [ ] File changes panel shows correct list of modified files at scrubber position
- [ ] Export to markdown produces a readable file

---

## Phase 8 — Polish & Release
> **Goal**: Zero regressions, updated README, Product Hunt launch.

### Tasks

#### Testing
- [ ] **9.1** Full manual regression pass on all v1 features
- [ ] **9.2** Manual test each v2 feature against exit criteria above
- [ ] **9.3** Windows 10 + Windows 11 test pass (both native and WSL)
- [ ] **9.4** macOS smoke test (no regressions)
- [ ] **9.5** Electron-builder: verify `.exe` installer works on clean Windows machine with no prior Claudette install

#### README & Docs
- [ ] **9.6** New README hero screenshot: multi-agent dashboard with 4 active agents
- [ ] **9.7** Add v2 feature section to README with GIFs for:
  - Multi-agent dashboard (auto-generated GIF of agents running)
  - GSD panel phase timeline
  - Skills browser one-click install
- [ ] **9.8** Update CHANGELOG.md with full v2 feature list
- [ ] **9.9** Add `docs/v2/` with per-feature setup guides

#### Release
- [ ] **9.10** Tag `v2.0.0-rc1`, build Windows installer, share with 3–5 beta testers
- [ ] **9.11** Address all beta feedback
- [ ] **9.12** Tag `v2.0.0`, publish GitHub Release with installer attached
- [ ] **9.13** Post announcement: Twitter/X thread with multi-agent dashboard GIF as first tweet
- [ ] **9.14** Submit to Product Hunt (schedule for Tuesday 12:01 AM PT)
- [ ] **9.15** Post to r/ClaudeAI, Hacker News "Show HN", DEV.to

### Exit Criteria
- [ ] All v2 feature exit criteria passed
- [ ] v2.0.0 GitHub Release published with signed Windows `.exe`
- [ ] README shows multi-agent dashboard screenshot as primary hero
- [ ] Product Hunt submission live

---

## New Files Added in v2

```
src/
├── main/
│   ├── agent-watcher.ts        # Process detection + file watching per agent
│   ├── skills-manager.ts       # skills.sh API + local install management
│   ├── mcp-manager.ts          # MCP config read/write + token tracking
│   ├── hooks-manager.ts        # settings.json hooks read/write + exec log
│   ├── session-parser.ts       # JSONL session → ReplaySession model
│   └── settings-manager.ts     # Unified settings.json handler
├── data/
│   └── mcp-catalog.json        # Curated MCP server list
└── renderer/
    └── components/
        ├── agents/
        │   ├── AgentsDashboard.tsx
        │   ├── AgentGrid.tsx
        │   ├── AgentPanel.tsx
        │   ├── AgentStatusBar.tsx
        │   ├── AgentFileList.tsx
        │   └── AgentEmptyState.tsx
        ├── skills/
        │   ├── SkillsBrowser.tsx
        │   ├── SkillsSearchBar.tsx
        │   ├── SkillsCategoryFilter.tsx
        │   ├── SkillCard.tsx
        │   ├── SkillDetail.tsx
        │   ├── InstalledSkills.tsx
        │   └── SkillsHero.tsx
        ├── mcp/
        │   ├── McpMarketplace.tsx
        │   ├── McpCatalogList.tsx
        │   ├── McpActiveList.tsx
        │   ├── McpConfigForm.tsx
        │   ├── McpTestButton.tsx
        │   ├── McpTokenWarning.tsx
        │   └── McpImportButton.tsx
        ├── hooks/
        │   ├── HooksEditor.tsx
        │   ├── HooksList.tsx
        │   ├── HookForm.tsx
        │   ├── HookTestPanel.tsx
        │   ├── HookTemplates.tsx
        │   ├── HookExecutionLog.tsx
        │   └── HookScopeToggle.tsx
        ├── voice/
        │   └── VoicePushToTalk.tsx
        └── replay/
            ├── SessionReplay.tsx
            ├── SessionPicker.tsx
            ├── ReplayTimeline.tsx
            ├── ReplayMessageView.tsx
            ├── ReplayFileChanges.tsx
            ├── ReplayToolCallList.tsx
            └── ReplayExporter.tsx
```

---

## GSD Prompt to Start Building

```
Read CLAUDE.md and build Claudette v2 following the features plan.
Start with Phase 1 (Foundation). Never ask questions — all architectural 
decisions are pre-made. One atomic git commit per completed task. 
Write blockers to SUMMARY.md before stopping.
```
