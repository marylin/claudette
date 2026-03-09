# Claudette v1.1 — Features Plan
## Making Every Stubbed Feature Actually Work

**Version**: 1.1  
**Scope**: `src/main/` only — no new UI components  
**Target**: All 10 success criteria pass on clean Windows 10/11 install

---

## Phase Overview

| Phase | Name | Files Changed | Duration |
|---|---|---|---|
| 1 | Claude CLI Bridge | `claude-bridge.ts`, `ipc-handlers.ts` | Week 1 |
| 2 | Session Manager | `session-manager.ts`, `ipc-handlers.ts` | Week 1 |
| 3 | Project Management | `index.ts`, `ipc-handlers.ts`, new `config-manager.ts` | Week 2 |
| 4 | File System | new `fs-manager.ts`, `ipc-handlers.ts` | Week 2 |
| 5 | Git Manager | `git-manager.ts`, `ipc-handlers.ts` | Week 3 |
| 6 | Terminal PTY | new `pty-manager.ts`, `ipc-handlers.ts` | Week 3 |
| 7 | Usage Analytics | new `usage-analyzer.ts`, `ipc-handlers.ts` | Week 4 |
| 8 | CLAUDE.md + Settings | updated `ipc-handlers.ts` | Week 4 |
| 9 | Integration & Smoke Test | all files | Week 5 |

---

## Build Rules (Read Before Starting)

- **Never touch the renderer** unless a component needs a prop renamed to match real data shape — no new components, no UI changes
- **Every IPC handler returns `{ data }` on success or `{ error: string }` on failure** — never throw out of a handler
- **All paths through `path.join()` and `app.getPath('home')`** — no string concatenation, no hardcoded separators
- **Wrap every child_process and fs operation in try/catch** — the main process must never crash
- **One atomic git commit per completed task**

---

## Phase 1 — Claude CLI Bridge

> **Goal**: Chat panel sends a message and receives real streaming output from the `claude` CLI.

### Background

Claude Code CLI, when run with `--output-format stream-json`, writes newline-delimited JSON events to stdout. Each event has a `type` field. The types you'll encounter:

```
{ type: "system", subtype: "init", session_id: "...", tools: [...] }
{ type: "assistant", message: { content: [...], usage: {...} } }
{ type: "user", message: { content: [...] } }
{ type: "result", subtype: "success"|"error", result: "..." }
```

Permission prompts come through as plain text on stdout (not JSON), followed by a blocking read on stdin. You detect them by looking for patterns like `Do you want to proceed?` or `Allow Claude to` in non-JSON lines.

Tool use events appear inside `assistant.message.content` as blocks with `type: "tool_use"`.

### Tasks

- [ ] **1.1** — Detect `claude` CLI on startup
  ```typescript
  // src/main/claude-bridge.ts
  // Use which/where to find claude binary
  // On Windows: check %LOCALAPPDATA%\@anthropic\claude-code\bin\claude.cmd
  // Also check PATH via: child_process.execSync('where claude', { shell: true })
  // Store resolved path in ClaudeBridge.binaryPath
  // If not found: emit 'claude:not-found' to renderer with install instructions
  ```

- [ ] **1.2** — Implement `ClaudeBridge.spawn(projectPath, options)`
  ```typescript
  // Options: { sessionId?: string, model?: string, allowedTools?: string[] }
  // Build args array:
  //   ['--output-format', 'stream-json', '--cwd', projectPath]
  //   if sessionId: push '--resume', sessionId
  //   if model: push '--model', model
  // Use child_process.spawn(binaryPath, args, { cwd: projectPath, env: process.env })
  // Store process reference as this.process
  // Set this.status = 'running'
  ```

- [ ] **1.3** — Implement stdout line parser
  ```typescript
  // Buffer incomplete lines (stdout chunks may split mid-JSON)
  // On each \n, attempt JSON.parse of the line
  // If parse succeeds: call handleJsonEvent(parsed)
  // If parse fails: call handleRawLine(line) — permission prompts come through here
  ```

- [ ] **1.4** — Implement `handleJsonEvent(event)`
  ```typescript
  // switch on event.type:
  // 'system' + subtype 'init':
  //   - store event.session_id to this.currentSessionId
  //   - emit 'claude:session-started' with session_id to renderer
  // 'assistant':
  //   - for each block in event.message.content:
  //     - type 'text': emit 'claude:output' with { text, type: 'assistant' }
  //     - type 'tool_use': emit 'claude:tool-event' with { name, input }
  //     - type 'thinking': emit 'claude:output' with { text, type: 'thinking' }
  //   - store event.message.usage to this.lastUsage
  // 'result':
  //   - emit 'claude:status' with { status: 'idle' }
  //   - if subtype 'error': emit 'claude:output' with { text: event.result, type: 'error' }
  ```

- [ ] **1.5** — Implement `handleRawLine(line)`
  ```typescript
  // Check for permission prompt patterns:
  // - line includes 'Do you want to proceed'
  // - line includes 'Allow Claude to'
  // - line includes '(y/n)' or '(Y/n)'
  // If match: emit 'claude:permission-request' with { prompt: line }
  //           set this.status = 'waiting-permission'
  // Otherwise: emit 'claude:output' with { text: line, type: 'stdout' }
  ```

- [ ] **1.6** — Implement `ClaudeBridge.sendMessage(text)`
  ```typescript
  // If process not running: reject with error
  // Write to stdin: this.process.stdin.write(text + '\n')
  // Set this.status = 'running'
  // Emit 'claude:status' with { status: 'running' }
  ```

- [ ] **1.7** — Implement `ClaudeBridge.sendPermissionResponse(approved: boolean)`
  ```typescript
  // Write 'y\n' or 'n\n' to process stdin
  // Set this.status = 'running'
  ```

- [ ] **1.8** — Implement `ClaudeBridge.stop()`
  ```typescript
  // Send SIGINT to process (process.kill('SIGINT'))
  // On Windows: use process.kill() — SIGINT not supported on Windows child_process
  // Set this.status = 'idle'
  ```

- [ ] **1.9** — Handle process exit and error events
  ```typescript
  // this.process.on('exit', (code) => {
  //   this.status = 'idle'
  //   emit 'claude:status' { status: 'idle' }
  //   if code !== 0: emit 'claude:output' { text: `Process exited with code ${code}`, type: 'error' }
  // })
  // this.process.on('error', (err) => {
  //   emit 'claude:status' { status: 'error' }
  //   emit 'claude:output' { text: err.message, type: 'error' }
  // })
  ```

- [ ] **1.10** — Wire IPC handlers
  ```typescript
  // ipc-handlers.ts:
  // 'claude:send': (_, { text }) => claudeBridge.sendMessage(text)
  // 'claude:stop': () => claudeBridge.stop()
  // 'claude:permission-respond': (_, { approved }) => claudeBridge.sendPermissionResponse(approved)
  // 'claude:get-status': () => ({ data: claudeBridge.status })
  ```

### Exit Criteria
- [ ] Typing a message in the chat panel produces real streaming output from `claude`
- [ ] A permission prompt appears in the UI when Claude tries to create a file
- [ ] Approving the permission allows Claude to proceed; denying stops the operation
- [ ] The session ID is captured and logged after the first message
- [ ] Stopping mid-run via the stop button terminates the process

---

## Phase 2 — Session Manager

> **Goal**: Sessions list shows real past conversations from `~/.claude/projects/`.

### Background

Claude Code stores session files at: `~/.claude/projects/<encoded-project-path>/<uuid>.jsonl`

The encoded project path replaces `/` with `-` and strips the leading `/`. On Windows, `C:\Users\foo\myproject` becomes `C-Users-foo-myproject`.

Each `.jsonl` file is a session. Each line in the file is a JSON event (same format as the stream).

### Tasks

- [ ] **2.1** — Implement `SessionManager.getProjectsDir()`
  ```typescript
  // return path.join(app.getPath('home'), '.claude', 'projects')
  ```

- [ ] **2.2** — Implement `SessionManager.encodePath(projectPath: string): string`
  ```typescript
  // On Windows: replace all \ and : with -
  // On macOS/Linux: replace leading / then all / with -
  // e.g. /home/user/myproject → home-user-myproject
  // e.g. C:\Users\foo\proj → C-Users-foo-proj
  ```

- [ ] **2.3** — Implement `SessionManager.listProjects()`
  ```typescript
  // Read subdirectories of ~/.claude/projects/
  // For each subdir: decode path back to display name
  // Return: Array<{ encodedPath, displayName, sessionCount, lastUpdated }>
  // Sort by lastUpdated descending
  ```

- [ ] **2.4** — Implement `SessionManager.listSessions(projectPath: string)`
  ```typescript
  // encodedPath = encodePath(projectPath)
  // sessionDir = path.join(getProjectsDir(), encodedPath)
  // List all .jsonl files in sessionDir
  // For each file: read last line to get most recent event
  // Extract: session_id (from filename), lastUpdated (file mtime), 
  //          messageCount (line count), lastMessagePreview
  // Return sorted by lastUpdated descending
  ```

- [ ] **2.5** — Implement `SessionManager.getSessionTokens(sessionFilePath: string)`
  ```typescript
  // Parse all lines in the JSONL file
  // Sum up usage.input_tokens and usage.output_tokens from all assistant events
  // Return { inputTokens, outputTokens, model }
  // Note: model is in the system init event
  ```

- [ ] **2.6** — Implement `SessionManager.deleteSession(sessionFilePath: string)`
  ```typescript
  // fs.unlink(sessionFilePath)
  // If active session matches: notify renderer that session was deleted
  ```

- [ ] **2.7** — Wire IPC handlers
  ```typescript
  // 'projects:list': () => ({ data: await sessionManager.listProjects() })
  // 'sessions:list': (_, { projectPath }) => ({ data: await sessionManager.listSessions(projectPath) })
  // 'sessions:resume': (_, { sessionId }) => claudeBridge.setResumeSession(sessionId)
  // 'sessions:delete': (_, { sessionFilePath }) => sessionManager.deleteSession(sessionFilePath)
  ```

### Exit Criteria
- [ ] Sessions panel shows real sessions from `~/.claude/projects/`
- [ ] Clicking a session and selecting "Resume" loads it into the chat (bridge resumes with `--resume`)
- [ ] Deleting a session removes the JSONL file from disk
- [ ] Session list reflects correct last-updated timestamps

---

## Phase 3 — Project Management

> **Goal**: Opening a folder persists across restarts; all managers reinitialize on project change.

### Tasks

- [ ] **3.1** — Create `src/main/config-manager.ts`
  ```typescript
  // Manages ~/.claudette/config.json
  // Schema: { recentProjects: string[], lastOpenProject: string | null }
  // Methods:
  //   getRecentProjects(): string[]
  //   addRecentProject(path: string): void  // prepend, dedupe, max 10
  //   getLastProject(): string | null
  //   setLastProject(path: string): void
  ```

- [ ] **3.2** — Implement `dialog:open-folder` IPC handler
  ```typescript
  // dialog.showOpenDialog({ properties: ['openDirectory'] })
  // If cancelled: return { data: null }
  // If selected: 
  //   configManager.addRecentProject(path)
  //   configManager.setLastProject(path)
  //   emit 'project:changed' to all windows with { path }
  //   return { data: path }
  ```

- [ ] **3.3** — Implement project change lifecycle in `index.ts`
  ```typescript
  // On 'project:changed':
  //   claudeBridge.dispose()    // kill any running process
  //   gitManager.setProject(path)
  //   fsManager.setProject(path)
  //   ptyManager.setProject(path)
  //   sessionManager.setCurrentProject(path)
  // All managers must implement setProject(path) that reinitializes their watchers/state
  ```

- [ ] **3.4** — On app start, restore last project
  ```typescript
  // In app.whenReady():
  //   const lastProject = configManager.getLastProject()
  //   if lastProject && fs.existsSync(lastProject):
  //     emit 'project:changed' with { path: lastProject }
  ```

- [ ] **3.5** — Wire IPC handlers
  ```typescript
  // 'project:get-current': () => ({ data: configManager.getLastProject() })
  // 'project:get-recent': () => ({ data: configManager.getRecentProjects() })
  ```

### Exit Criteria
- [ ] Opening a folder sets it as the active project
- [ ] Restarting the app reopens the last project automatically
- [ ] Recent projects list appears correctly in the sidebar

---

## Phase 4 — File System

> **Goal**: File explorer shows the real project directory tree and updates when files change.

### Tasks

- [ ] **4.1** — Create `src/main/fs-manager.ts`
  ```typescript
  // State: currentProjectPath, watcher (chokidar instance)
  ```

- [ ] **4.2** — Implement `FsManager.getTree(dirPath, depth = 0): FileNode[]`
  ```typescript
  // Use fs.readdirSync with { withFileTypes: true }
  // Skip: node_modules, .git, .claudette, dist, build, .next, __pycache__
  // For each entry:
  //   if directory: recurse (max depth 6 to avoid huge trees)
  //   if file: { name, path, type: 'file', size, extension }
  // Sort: directories first, then files, both alphabetical
  // Apply .gitignore rules using 'ignore' package if .gitignore exists
  ```

- [ ] **4.3** — Implement `FsManager.readFile(filePath: string)`
  ```typescript
  // Validate filePath is within currentProjectPath (security: prevent path traversal)
  // fs.readFile(filePath, 'utf8')
  // If binary file (check extension: .png, .jpg, .gif, .pdf, etc): return { binary: true }
  // Return { content, encoding: 'utf8', size }
  ```

- [ ] **4.4** — Implement `FsManager.startWatching(projectPath: string)`
  ```typescript
  // Stop existing watcher if any
  // chokidar.watch(projectPath, {
  //   ignored: /(node_modules|\.git|dist|build)/,
  //   ignoreInitial: true,
  //   depth: 8
  // })
  // On add/change/unlink/addDir/unlinkDir:
  //   debounce 200ms then emit 'fs:tree-updated' to renderer
  //   (debounce prevents flooding when Claude writes many files at once)
  ```

- [ ] **4.5** — Wire IPC handlers
  ```typescript
  // 'fs:readdir': (_, { path }) => ({ data: fsManager.getTree(path) })
  // 'fs:readfile': (_, { path }) => ({ data: await fsManager.readFile(path) })
  ```

### Exit Criteria
- [ ] File explorer shows the real directory tree of the open project
- [ ] Clicking a file opens its real content in the code viewer
- [ ] When Claude creates a file, it appears in the tree within 500ms
- [ ] `node_modules` and `.git` are never shown

---

## Phase 5 — Git Manager

> **Goal**: Git panel shows real status, real diffs, and can stage/commit.

### Tasks

- [ ] **5.1** — Initialize `simple-git` instance in `git-manager.ts`
  ```typescript
  // import simpleGit, { SimpleGit } from 'simple-git'
  // this.git = simpleGit(this.projectPath)
  // Add safety check: git.checkIsRepo() — if false, set this.isGitRepo = false
  // All methods must check isGitRepo and return empty state if false
  ```

- [ ] **5.2** — Implement `GitManager.getStatus()`
  ```typescript
  // const status = await this.git.status()
  // Return:
  // {
  //   branch: status.current,
  //   staged: status.staged.map(f => ({ path: f, status: 'staged' })),
  //   unstaged: status.modified.map(f => ({ path: f, status: 'modified' })),
  //   untracked: status.not_added.map(f => ({ path: f, status: 'untracked' })),
  //   deleted: status.deleted.map(f => ({ path: f, status: 'deleted' }))
  // }
  ```

- [ ] **5.3** — Implement `GitManager.getDiff(filePath, staged = false)`
  ```typescript
  // if staged: return await this.git.diff(['--staged', '--', filePath])
  // else: return await this.git.diff(['--', filePath])
  // Return raw unified diff string — DiffViewer component already handles rendering
  ```

- [ ] **5.4** — Implement stage/unstage/commit
  ```typescript
  // stageFile(path): await this.git.add(path)
  // unstageFile(path): await this.git.reset(['HEAD', '--', path])
  // commit(message): await this.git.commit(message)
  // All return { success: true } or { error: string }
  ```

- [ ] **5.5** — Implement `GitManager.getLog()`
  ```typescript
  // const log = await this.git.log({ maxCount: 20 })
  // Return log.all.map(c => ({ hash: c.hash.slice(0, 7), message: c.message, date: c.date, author: c.author_name }))
  ```

- [ ] **5.6** — Set up auto-refresh watcher
  ```typescript
  // Use chokidar to watch projectPath
  // On any file change: debounce 300ms, call getStatus(), emit 'git:status-updated' to renderer
  // This means the git panel refreshes automatically as Claude edits files
  ```

- [ ] **5.7** — Wire IPC handlers
  ```typescript
  // 'git:status': () => ({ data: await gitManager.getStatus() })
  // 'git:diff': (_, { path, staged }) => ({ data: await gitManager.getDiff(path, staged) })
  // 'git:stage': (_, { path }) => gitManager.stageFile(path)
  // 'git:unstage': (_, { path }) => gitManager.unstageFile(path)
  // 'git:commit': (_, { message }) => gitManager.commit(message)
  // 'git:log': () => ({ data: await gitManager.getLog() })
  ```

### Exit Criteria
- [ ] Git panel shows real list of modified/staged/untracked files
- [ ] Clicking a file in the git panel shows its real diff
- [ ] Stage button moves file to staged section
- [ ] Commit button creates a real commit (verify with `git log`)
- [ ] Git panel refreshes automatically when Claude edits a file

---

## Phase 6 — Terminal PTY

> **Goal**: Terminal tab is a real interactive shell, not a decorative text box.

### Background

`node-pty` spawns a pseudo-terminal. It must be rebuilt for the correct Electron version using `electron-rebuild`. The renderer's xterm.js instance sends keystrokes via IPC to the main process, which writes them to the PTY. The PTY writes output back to the renderer via IPC, which xterm.js renders.

**Critical Windows note**: `node-pty` on Windows requires Visual C++ Build Tools. The pre-built binary in electron-builder must target the correct Electron ABI. This is the most likely source of install failures — test on a clean Windows machine.

### Tasks

- [ ] **6.1** — Verify `node-pty` native build
  ```bash
  # In package.json postinstall script:
  # "postinstall": "electron-rebuild -f -w node-pty"
  # This rebuilds node-pty for the installed Electron version
  # Verify: require('node-pty') works in main process without error
  ```

- [ ] **6.2** — Create `src/main/pty-manager.ts`
  ```typescript
  import * as pty from 'node-pty'
  
  // spawnShell(projectPath: string, cols: number, rows: number):
  //   shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash')
  //   this.ptyProcess = pty.spawn(shell, [], {
  //     name: 'xterm-256color',
  //     cols,
  //     rows,
  //     cwd: projectPath,
  //     env: process.env
  //   })
  //   this.ptyProcess.onData((data) => {
  //     mainWindow.webContents.send('terminal:data', { data })
  //   })
  //   this.ptyProcess.onExit(() => {
  //     mainWindow.webContents.send('terminal:exited')
  //   })
  ```

- [ ] **6.3** — Implement `PtyManager.write(data: string)`
  ```typescript
  // this.ptyProcess.write(data)
  // This handles all keystrokes: regular chars, ctrl sequences, arrow keys, etc.
  ```

- [ ] **6.4** — Implement `PtyManager.resize(cols: number, rows: number)`
  ```typescript
  // this.ptyProcess.resize(cols, rows)
  // Called whenever the terminal panel is resized
  ```

- [ ] **6.5** — Wire IPC handlers
  ```typescript
  // 'terminal:start': (_, { cols, rows }) => ptyManager.spawnShell(currentProject, cols, rows)
  // 'terminal:input': (_, { data }) => ptyManager.write(data)
  // 'terminal:resize': (_, { cols, rows }) => ptyManager.resize(cols, rows)
  // 'terminal:kill': () => ptyManager.dispose()
  ```

- [ ] **6.6** — Verify renderer-side xterm.js wiring (minimal renderer change)
  ```typescript
  // In TerminalPanel.tsx, confirm:
  // - term.onData(data => ipcRenderer.send('terminal:input', { data })) is wired
  // - ipcRenderer.on('terminal:data', (_, { data }) => term.write(data)) is wired
  // - ResizeObserver calls ipcRenderer.send('terminal:resize', { cols, rows }) on panel resize
  // If any of these are missing/mocked, add them
  ```

### Exit Criteria
- [ ] Terminal tab opens a real PowerShell on Windows
- [ ] Can type commands and see real output
- [ ] `cd`, `ls`/`dir`, `git log` all work correctly
- [ ] Resizing the terminal panel resizes the PTY correctly (no text wrapping artifacts)
- [ ] Terminal opens in the current project directory

---

## Phase 7 — Usage Analytics

> **Goal**: Analytics charts show real token usage from real session files.

### Tasks

- [ ] **7.1** — Create `src/main/usage-analyzer.ts`

- [ ] **7.2** — Implement `UsageAnalyzer.scanAllSessions()`
  ```typescript
  // Walk ~/.claude/projects/*/*.jsonl
  // For each file:
  //   Parse all lines
  //   Find system init event → get model name
  //   Sum all usage blocks from assistant events:
  //     input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens
  //   Get file mtime for the date
  //   Return: { date, projectPath, model, inputTokens, outputTokens, cacheTokens, sessionId }
  ```

- [ ] **7.3** — Create `src/data/pricing.json`
  ```json
  {
    "claude-opus-4-6": { "inputPer1M": 15.00, "outputPer1M": 75.00 },
    "claude-sonnet-4-6": { "inputPer1M": 3.00, "outputPer1M": 15.00 },
    "claude-haiku-4-5": { "inputPer1M": 0.80, "outputPer1M": 4.00 }
  }
  ```

- [ ] **7.4** — Implement `UsageAnalyzer.getAggregated(period: 'day'|'week'|'month')`
  ```typescript
  // Group session records by date bucket
  // For each bucket: sum tokens, calculate cost using pricing.json
  // Return array of { date, inputTokens, outputTokens, cost, sessionCount }
  // This is the data shape the Recharts components expect
  ```

- [ ] **7.5** — Implement `UsageAnalyzer.getByProject()`
  ```typescript
  // Group by projectPath
  // Return: { project, totalInputTokens, totalOutputTokens, totalCost, sessionCount }[]
  ```

- [ ] **7.6** — Wire IPC handler
  ```typescript
  // 'usage:get': (_, { period, groupBy }) => ({
  //   data: groupBy === 'project'
  //     ? await usageAnalyzer.getByProject()
  //     : await usageAnalyzer.getAggregated(period)
  // })
  ```

### Exit Criteria
- [ ] Analytics tab shows non-zero real token data if any sessions exist
- [ ] Daily/weekly/monthly toggle changes the chart data correctly
- [ ] By-project breakdown shows correct project names
- [ ] Cost estimates are reasonable (not wildly off from actual)

---

## Phase 8 — CLAUDE.md Editor + Settings

> **Goal**: CLAUDE.md editor loads real file, saves changes; settings panel reads/writes real config.

### Tasks

- [ ] **8.1** — Implement `claude-md:read` IPC handler
  ```typescript
  // (_, { scope }) where scope is 'project' | 'global'
  // 'project': read path.join(currentProjectPath, 'CLAUDE.md')
  // 'global': read path.join(app.getPath('home'), '.claude', 'CLAUDE.md')
  // If file doesn't exist: return { data: '' }
  // Else: return { data: fs.readFileSync(filePath, 'utf8') }
  ```

- [ ] **8.2** — Implement `claude-md:write` IPC handler
  ```typescript
  // (_, { content, scope })
  // Resolve path same as above
  // fs.writeFileSync(filePath, content, 'utf8')
  // Return { data: { success: true } }
  ```

- [ ] **8.3** — Add dirty-state tracking (renderer-side, minimal change)
  ```typescript
  // In ClaudemdEditor component, confirm onChange sets isDirty state
  // Confirm Ctrl+S calls ipcRenderer.invoke('claude-md:write', { content, scope })
  // If these aren't wired, add them
  ```

- [ ] **8.4** — Implement `settings:get` IPC handler
  ```typescript
  // Read ~/.claude/settings.json — return {} if doesn't exist
  // Also read .claude/settings.json in project root — merge, project takes precedence
  ```

- [ ] **8.5** — Implement `settings:set` IPC handler
  ```typescript
  // (_, { settings, scope }) where scope is 'user' | 'project'
  // For 'user': write to ~/.claude/settings.json
  // For 'project': write to <projectPath>/.claude/settings.json (create dir if needed)
  ```

- [ ] **8.6** — Implement `agents:list`, `agents:save`, `agents:delete`, `agents:run` IPC handlers
  ```typescript
  // Claude Code agent definitions live at ~/.claude/agents/<name>.md
  // agents:list: fs.readdir of that directory, return parsed agent files
  // agents:save: write <name>.md file with the agent definition
  // agents:delete: fs.unlink the file
  // agents:run: spawn claude-bridge with extra system prompt from the agent file
  ```

### Exit Criteria
- [ ] CLAUDE.md tab loads the real file content from the project root
- [ ] Editing and saving writes changes to disk (verify with file explorer or terminal)
- [ ] Global CLAUDE.md toggle loads `~/.claude/CLAUDE.md`
- [ ] Settings page loads real settings from `~/.claude/settings.json`

---

## Phase 9 — Integration & Smoke Test

> **Goal**: All 10 success criteria pass on a clean Windows 10/11 machine.

### Tasks

- [ ] **9.1** — Run `electron-rebuild` and verify `node-pty` loads without error on Windows
- [ ] **9.2** — Build Windows installer (`npm run dist`) and install on a clean VM
- [ ] **9.3** — Walk through all 10 success criteria manually, log failures

### Success Criteria Checklist
- [ ] 1. Claudette installs on clean Windows from `.exe` — no errors on first launch
- [ ] 2. Open a project folder containing a git repo — project name appears in title bar
- [ ] 3. Type a message in chat — see real streaming output from `claude`
- [ ] 4. Claude attempts a file write — permission prompt appears in UI — approve it — file is created
- [ ] 5. Created file appears in file explorer within 1 second
- [ ] 6. Created file appears as untracked in git panel
- [ ] 7. Stage the file, write a commit message, click Commit — `git log` shows the commit
- [ ] 8. Open terminal tab — PowerShell starts in project directory — `dir` shows real files
- [ ] 9. Analytics tab shows non-zero token data from past sessions
- [ ] 10. Edit CLAUDE.md, press Ctrl+S — file on disk is updated

### Bug Fix Buffer
- [ ] **9.4** — Fix any bugs found in 9.3 until all 10 criteria pass
- [ ] **9.5** — Final Windows installer build and smoke test

---

## New / Heavily Modified Files

```
src/
├── main/
│   ├── claude-bridge.ts      ← REWRITE — was a stub, now real process management
│   ├── session-manager.ts    ← REWRITE — was a stub, now reads real ~/.claude/projects/
│   ├── git-manager.ts        ← REWRITE — was a stub, now real simple-git calls
│   ├── ipc-handlers.ts       ← REWRITE — all stubs replaced with real implementations
│   ├── config-manager.ts     ← NEW — ~/.claudette/config.json persistence
│   ├── fs-manager.ts         ← NEW — real filesystem tree + chokidar watcher
│   ├── pty-manager.ts        ← NEW — node-pty shell management
│   └── usage-analyzer.ts     ← NEW — JSONL session file parser + token aggregation
└── data/
    └── pricing.json           ← NEW — Anthropic model pricing for cost calculation
```

---

## GSD Prompt to Start Building

```
Read CLAUDE.md. Your task is to implement all the stubbed backend functionality 
in Claudette v1.1. Start with Phase 1 (Claude CLI Bridge) in src/main/claude-bridge.ts.
Do not add any new UI components. Do not modify any renderer files unless a comment 
in a task explicitly says to. Every IPC handler must return real data, never mocked data.
Never ask questions — all implementation decisions are in the features plan.
One atomic git commit per completed task.
```
