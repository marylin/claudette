# Product Requirements Document
## Claudette v1.1 — Making It Real

**Version**: 1.1  
**Status**: Draft  
**Author**: WhateverAI  
**Last Updated**: March 2026  
**Prerequisite**: Claudette v1.0 UI scaffold complete

---

## 1. Executive Summary

Claudette v1.0 shipped a complete UI scaffold: every panel renders, every tab exists, every component displays. But none of it does anything real. The Claude bridge doesn't actually run `claude`. The session list shows no real sessions. The git panel has no real diffs. The terminal has no real shell. The analytics shows no real data.

v1.1 is a single-focus release: **make every feature that exists in the UI actually work**. No new features. No new panels. Every line of code in this release lives in `src/main/` — the renderer barely changes. This is a backend engineering release.

**Definition of done**: A user can install Claudette, open a project folder, chat with Claude and see real streaming output, browse their real files, see their real git status, open a real terminal, and view their real token usage history. Everything works against real data, real processes, real filesystem.

---

## 2. What Is Currently Broken (And Why)

### 2.1 Claude Bridge (`claude-bridge.ts`)

**Current state**: Stub. May call `child_process.spawn('claude', ...)` but doesn't handle the full lifecycle.

**What's missing**:
- Claude CLI outputs a mix of JSON events, ANSI-escaped text, permission prompts, and raw stdout. Nothing parses this correctly yet.
- The `--output-format stream-json` flag is required to get structured output but likely not set.
- Permission prompts (`Do you want to proceed? (y/n)`) require writing to the child process stdin — this isn't wired up.
- The process can exit, crash, or hang. No reconnect logic exists.
- Session ID is returned in the first JSON event of a new session — nothing captures and persists this.
- `--resume <id>` for continuing sessions requires the stored session ID — nothing stores it.
- `--continue` for the most recent session in a directory also needs correct CWD — not set.
- Tool use events (file reads, writes, bash) come through the stream — nothing parses or surfaces them.

### 2.2 Session Manager (`session-manager.ts`)

**Current state**: Stub. Likely returns empty arrays or hardcoded mock data.

**What's missing**:
- Claude Code stores sessions as JSONL files at `~/.claude/projects/<encoded-path>/<session-id>.jsonl`
- Nothing reads this directory structure
- Nothing parses the JSONL format (each line is a JSON event: human turn, assistant turn, tool call, tool result, system)
- Session metadata (project path, message count, last updated, token totals) must be derived from parsing these files
- Nothing lists sessions by project, sorts by recency, or filters by status

### 2.3 Git Manager (`git-manager.ts`)

**Current state**: Stub. `simple-git` is imported but no real commands fire.

**What's missing**:
- `git status --porcelain` for file status list
- `git diff` for unstaged changes per file
- `git diff --staged` for staged changes per file  
- `git add <file>` / `git reset <file>` for stage/unstage
- `git commit -m <message>` for committing
- `git log --oneline -20` for recent commit history
- Branch detection for the current branch name
- Nothing watches the working directory for changes to refresh status automatically

### 2.4 Terminal (`TerminalPanel.tsx` / main process)

**Current state**: xterm.js renders a terminal UI but there is no PTY (pseudo-terminal) attached to it. It's a text display box, not a real terminal.

**What's missing**:
- `node-pty` is needed to spawn a real shell (PowerShell on Windows, bash/zsh on macOS/Linux)
- xterm.js must be connected to the PTY via IPC: keystrokes from renderer → main → PTY stdin; PTY stdout → main → renderer → xterm.js write
- Terminal resize events must be forwarded to the PTY (`pty.resize(cols, rows)`)
- The terminal must open in the current project directory
- Without node-pty, xterm.js is entirely decorative

### 2.5 File Explorer

**Current state**: Renders a file tree, likely with hardcoded or empty data.

**What's missing**:
- `fs.readdir` / `fs.stat` recursively building the real directory tree for the open project
- `chokidar` watching the directory so the tree updates when files are created/modified/deleted by Claude
- File content reading: clicking a file must read its content from disk and display it in the CodeViewer
- `.gitignore` parsing to respect ignored files (or at minimum, hiding `node_modules`)
- Nothing currently streams file change events to the renderer

### 2.6 Usage / Analytics

**Current state**: Charts render with hardcoded or empty data.

**What's missing**:
- Token usage data lives in the JSONL session files at `~/.claude/projects/`
- Each assistant turn in the JSONL contains `usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }`
- Nothing currently reads these files and aggregates this data
- Cost calculation requires knowing the model (also in the JSONL) and applying current pricing
- The daily/weekly/monthly aggregation views have no real data source

### 2.7 CLAUDE.md Editor

**Current state**: Monaco editor renders, but likely doesn't load the real file or save changes back to disk.

**What's missing**:
- Read `<project-root>/CLAUDE.md` on project open (handle file not existing)
- Write changes back to `<project-root>/CLAUDE.md` on save (Ctrl+S)
- Also read/write `~/.claude/CLAUDE.md` for the global user-level file
- Dirty state indicator (unsaved changes)
- Auto-reload if the file changes on disk (Claude itself may modify it)

### 2.8 IPC Handlers (`ipc-handlers.ts`)

**Current state**: All channels are registered but most return empty responses, `null`, or `{ success: true }` without doing real work.

**What's missing**: Every handler needs a real implementation wired to the actual manager classes. Currently the managers are stubs and the handlers call the stubs.

### 2.9 Project Management

**Current state**: "Open project" may fire a dialog, but project state (path, name) is not persisted across restarts.

**What's missing**:
- Persist the last N opened projects to `~/.claudette/projects.json`
- Restore the last open project on app launch
- Project = a directory path. All other managers (git, file, claude, CLAUDE.md) must reinitialize when project changes.

---

## 3. Goals

- Every IPC channel defined in `src/shared/types.ts` returns real data from real system calls
- A user can have a complete end-to-end Claude Code conversation through the UI
- No mocked, hardcoded, or placeholder data anywhere in the production build
- All features work on Windows 10/11 as the primary target platform
- No new UI components, no new panels, no new features — only backend implementation

## 4. Non-Goals

- Not adding any features that aren't already in the v1 UI
- Not refactoring the renderer/component layer (unless a component needs a minor prop change to accept real data)
- Not adding tests in this release (tech debt, address in v1.2)
- Not supporting Claude API key auth — subscription plan via existing `claude` CLI only

---

## 5. Functional Requirements

### 5.1 Claude CLI Bridge

| ID | Requirement | Priority |
|---|---|---|
| R-01 | Detect `claude` CLI on PATH at app startup; show actionable error if not found | P0 |
| R-02 | Spawn `claude` with `--output-format stream-json` and correct `--cwd` | P0 |
| R-03 | Parse every JSON event type from the stream: `system`, `assistant`, `user`, `result`, `error` | P0 |
| R-04 | Detect permission prompts in the stream and emit a `claude:permission-request` event to renderer | P0 |
| R-05 | Accept y/n permission responses from renderer and write to child process stdin | P0 |
| R-06 | Capture the session ID from the first `system` event and persist it | P0 |
| R-07 | Support `--resume <session-id>` to continue a previous session | P0 |
| R-08 | Support `--continue` to resume the most recent session in the current project | P1 |
| R-09 | Parse tool use events (file read/write/edit, bash) and emit them separately as `claude:tool-event` | P1 |
| R-10 | Gracefully handle process exit, crash, and timeout — emit status to renderer, allow restart | P0 |
| R-11 | Support sending `--allowedTools` and `--dangerouslySkipPermissions` flags from settings | P2 |
| R-12 | Support `--model` flag to switch between Claude models | P2 |

### 5.2 Session Manager

| ID | Requirement | Priority |
|---|---|---|
| R-13 | Locate Claude Code session files at `~/.claude/projects/<encoded-path>/` on all platforms | P0 |
| R-14 | List all projects that have sessions, with display name derived from path | P0 |
| R-15 | For each project, list sessions sorted by last-modified timestamp | P0 |
| R-16 | Parse session JSONL to extract: message count, total tokens, model used, last message preview | P1 |
| R-17 | Delete a session by removing its JSONL file | P1 |
| R-18 | Watch the sessions directory for new sessions created by the running CLI process | P1 |

### 5.3 Git Manager

| ID | Requirement | Priority |
|---|---|---|
| R-19 | Run `git status --porcelain` and return structured file status list | P0 |
| R-20 | Run `git diff <file>` for unstaged changes and return raw diff text | P0 |
| R-21 | Run `git diff --staged <file>` for staged changes | P0 |
| R-22 | Stage a file via `git add <path>` | P0 |
| R-23 | Unstage a file via `git reset HEAD <path>` | P0 |
| R-24 | Commit staged changes with a message via `git commit -m` | P0 |
| R-25 | Return current branch name | P1 |
| R-26 | Return last 20 commits via `git log --oneline -20` | P1 |
| R-27 | Watch project directory with `chokidar` and refresh git status on file change | P1 |
| R-28 | Handle non-git directories gracefully (return empty state, no errors thrown) | P0 |

### 5.4 Terminal (PTY)

| ID | Requirement | Priority |
|---|---|---|
| R-29 | Spawn a PTY using `node-pty` — PowerShell on Windows, `$SHELL` on macOS/Linux | P0 |
| R-30 | Open PTY in the current project directory | P0 |
| R-31 | Forward PTY stdout to renderer via `terminal:data` IPC channel | P0 |
| R-32 | Forward renderer keystrokes to PTY stdin via `terminal:input` IPC channel | P0 |
| R-33 | Forward terminal resize events to PTY via `terminal:resize` IPC channel | P0 |
| R-34 | Kill PTY and respawn when project changes | P1 |
| R-35 | Handle PTY process exit and show reconnect prompt in xterm.js | P1 |
| R-36 | Support multiple terminal tabs (each gets its own PTY instance) | P2 |

### 5.5 File System

| ID | Requirement | Priority |
|---|---|---|
| R-37 | Read project directory tree recursively, returning a `FileNode[]` structure | P0 |
| R-38 | Exclude `node_modules`, `.git`, and `.claudette` from the tree by default | P0 |
| R-39 | Read file contents from disk when a file node is clicked | P0 |
| R-40 | Watch project directory with `chokidar` and emit `fs:tree-updated` when files change | P1 |
| R-41 | Respect `.gitignore` rules when building tree (use `ignore` npm package) | P1 |
| R-42 | Return file metadata: size, last modified, encoding | P2 |

### 5.6 Usage Analytics

| ID | Requirement | Priority |
|---|---|---|
| R-43 | Scan all session JSONL files in `~/.claude/projects/` and aggregate token usage | P0 |
| R-44 | Extract per-turn usage: `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` | P0 |
| R-45 | Extract model name per session to apply correct pricing tier | P0 |
| R-46 | Calculate estimated cost using current Anthropic pricing (store pricing in `src/data/pricing.json`, updatable) | P1 |
| R-47 | Aggregate by day, week, and month for chart views | P1 |
| R-48 | Return per-project breakdown of token usage | P1 |
| R-49 | Cache aggregated results to `~/.claudette/usage-cache.json`; invalidate when new sessions are detected | P2 |

### 5.7 CLAUDE.md Editor

| ID | Requirement | Priority |
|---|---|---|
| R-50 | Read `<project-root>/CLAUDE.md` when project opens; return empty string if file doesn't exist | P0 |
| R-51 | Write editor content to `<project-root>/CLAUDE.md` on save | P0 |
| R-52 | Read and write `~/.claude/CLAUDE.md` for the global file | P0 |
| R-53 | Track dirty state (unsaved changes) and expose to renderer | P1 |
| R-54 | Watch the CLAUDE.md file on disk and reload if externally modified | P1 |

### 5.8 Project Management

| ID | Requirement | Priority |
|---|---|---|
| R-55 | Open folder dialog; set selected path as current project | P0 |
| R-56 | Persist recent projects list (max 10) to `~/.claudette/config.json` | P0 |
| R-57 | Restore last open project on app launch | P0 |
| R-58 | When project changes, reinitialize all managers with new project path | P0 |
| R-59 | Show project name (directory basename) in the title bar | P1 |

### 5.9 IPC Handler Completeness

Every channel in `IpcChannels` must have a real implementation. Current stub handlers that must be replaced:

| Channel | Required Implementation |
|---|---|
| `claude:send` | Spawn/write to claude-bridge child process |
| `claude:stop` | Send SIGINT to child process |
| `projects:list` | Scan `~/.claude/projects/` |
| `sessions:list` | List JSONL files for a project path |
| `sessions:resume` | Set session ID, pass `--resume` on next send |
| `sessions:delete` | Delete JSONL file |
| `git:status` | `simple-git` status |
| `git:diff` | `simple-git` diff for a file |
| `git:stage` | `simple-git` add |
| `git:unstage` | `simple-git` reset |
| `git:commit` | `simple-git` commit |
| `agents:list` | Read `~/.claude/agents/` directory |
| `agents:save` | Write agent definition file |
| `agents:delete` | Delete agent definition file |
| `agents:run` | Spawn claude-bridge with agent system prompt |
| `claude-md:read` | `fs.readFile` on CLAUDE.md |
| `claude-md:write` | `fs.writeFile` on CLAUDE.md |
| `usage:get` | Aggregate from JSONL session files |
| `settings:get` | Read `~/.claude/settings.json` |
| `settings:set` | Write `~/.claude/settings.json` |
| `fs:readdir` | Recursive directory tree |
| `fs:readfile` | File contents |
| `dialog:open-folder` | Electron dialog |

---

## 6. Non-Functional Requirements

### Platform
- `node-pty` requires native compilation — must be pre-built for Windows x64 in the electron-builder config using `electron-rebuild`
- All file paths must use `path.join()` and `app.getPath('home')` — never string concatenation or `~`
- Claude CLI location detection must check both PATH and common install locations (`%LOCALAPPDATA%\@anthropic\claude-code\bin\` on Windows)

### Reliability
- Claude process crash must not crash the Electron main process — always wrapped in try/catch with error forwarded to renderer
- IPC handlers must never throw unhandled exceptions — all errors must be returned as `{ error: string }` in the response
- File watchers must be disposed when project changes or app closes — no watcher leaks

### Security
- Never pass user-provided strings directly to `child_process.exec` — always use `spawn` with args array
- Validate all IPC inputs before passing to file system or git operations

---

## 7. Success Criteria

A tester with no prior Claudette experience should be able to:

1. Install Claudette on a clean Windows machine
2. Open a project folder containing a git repo
3. Type a message in the chat and see real streaming output from `claude`
4. See a real permission prompt when Claude tries to write a file, and approve it
5. See the file appear in the file explorer immediately after Claude creates it
6. See the file appear as untracked in the git panel
7. Stage the file, write a commit message, and commit it — all from the git panel
8. Open the terminal tab and run `git log --oneline` in a real PowerShell shell
9. Open the Analytics tab and see real token counts from past sessions
10. Edit CLAUDE.md and save it — verify the file changed on disk

If all 10 work, v1.1 is done.

---

## 8. Dependencies

| Package | Purpose | Notes |
|---|---|---|
| `node-pty` | Real PTY for terminal | Requires native rebuild — already in v1 package.json but may not be rebuilt |
| `simple-git` | Git operations | Already in v1 package.json |
| `chokidar` | File watching | Already in v1 package.json |
| `ignore` | .gitignore parsing | Add if not already present |
| `electron-rebuild` | Rebuild native modules for Electron | Must run post-install |

---

## 9. Timeline

| Milestone | Deliverable | Target |
|---|---|---|
| v1.1-alpha | Claude bridge + session manager working end-to-end | Week 1–2 |
| v1.1-beta | Git manager + terminal PTY + file system watcher | Week 3 |
| v1.1-rc | Analytics + CLAUDE.md + all IPC handlers complete | Week 4 |
| v1.1 | All 10 success criteria pass on clean Windows install | Week 5 |
