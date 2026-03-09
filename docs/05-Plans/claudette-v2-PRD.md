# Product Requirements Document
## Claudette v2 — Multi-Agent Visual Command Center

**Version**: 2.0  
**Status**: Draft  
**Author**: WhateverAI  
**Last Updated**: March 2026  
**Prerequisite**: Claudette v1 shipped and stable

---

## 1. Executive Summary

Claudette v1 solved the Windows GUI gap for Claude Code. v2 solves the **visibility gap** — the complete lack of visual feedback when Claude Code runs parallel subagents, spawns worktrees, and executes complex multi-agent workflows.

Claude Code is evolving from a single-agent CLI into a multi-agent orchestration platform. The tooling hasn't caught up. Developers running 4–8 parallel agents today have zero visual feedback on what each agent is doing, which worktree it's in, how far along it is, or what it changed. They're flying blind.

Claudette v2 turns that into a real-time visual command center — the kind of interface that makes a compelling screenshot, earns GitHub stars, and becomes the default tool for anyone doing serious Claude Code work.

**One-line pitch**: "See everything your agents are doing, in real time."

---

## 2. Problem Statement

### 2.1 The Multi-Agent Blindness Problem

Claude Code now supports:
- Parallel subagents running in isolated git worktrees
- Background agents with async completion
- Agent Teams for coordinated multi-model workflows

None of this is visible anywhere. Users get a terminal that shows one stream of text. When you have 4 agents running in parallel, you have 4 terminal windows. There's no overview, no coordination UI, no way to see the full picture at a glance.

### 2.2 The Skills Discovery Problem

The Claude Code skills ecosystem has exploded — 85,000+ skills indexed by March 2026. Discovery is entirely CLI-based (`/plugin marketplace`). There's no visual way to browse, preview, or compare skills. Most users don't install skills at all because they don't know what exists.

### 2.3 The MCP Management Problem

MCP servers are increasingly central to Claude Code workflows, but management is painful. Configuring them requires editing JSON by hand, token consumption is invisible until you're already paying for it, and there's no visual way to test connections. One Docker MCP server can silently consume 125k tokens per session.

### 2.4 The Hooks Complexity Problem

Hooks are one of Claude Code's most powerful features, but the JSON configuration syntax keeps most users away. There's no visual editor, no way to test hooks without running them, and no feedback on whether they're working correctly.

---

## 3. Goals & Non-Goals

### Goals

- Build the definitive visual interface for multi-agent Claude Code workflows
- Make parallel agent execution visible and manageable from a single screen
- Surface the Claude Code skills ecosystem with a visual browser and one-click install
- Provide a visual MCP marketplace with token usage monitoring per server
- Build a drag-and-drop hooks editor that makes hooks accessible to all users
- Add voice mode with push-to-talk UI that works on Windows
- Ship session replay so users can audit exactly what agents did
- Maintain the v1 promise: works with existing Claude Code subscription, no extra cost, one-click Windows installer

### Non-Goals

- Not building a new agent runtime — Claudette wraps Claude Code, it doesn't replace it
- Not building cloud sync or team features in v2 (v3 consideration)
- Not supporting non-Claude models in v2
- Not building a mobile app
- Not monetizing in v2 — still free and open source

---

## 4. Target Users

### Primary: The Multi-Agent Power User

- Already using Claudette v1 daily
- Running parallel agent workflows with isolated git worktrees
- Frustrated by terminal-only visibility when agents run in parallel
- Wants to see all agents at once without managing multiple terminal windows
- Windows 10/11, possibly also macOS

### Secondary: The Skills & Plugins Explorer

- Wants to extend Claude Code with skills and MCP servers
- Currently overwhelmed by the size of the ecosystem (85k+ skills)
- Would install more skills if discovery were visual and frictionless
- Doesn't want to edit JSON to configure MCP servers

---

## 5. User Stories

### Multi-Agent Dashboard

- As a developer running parallel agents, I want to see all active agents on one screen so I don't have to manage multiple terminal windows
- As a developer, I want to see each agent's live output stream so I can monitor progress without switching contexts
- As a developer, I want to see which files each agent has modified so I can understand what's being built
- As a developer, I want to stop a specific agent without affecting the others
- As a developer, I want to see when all agents have completed so I know the run is done

### Skills Browser

- As a developer, I want to search and browse Claude Code skills visually so I can discover tools I didn't know existed
- As a developer, I want to see a skill's description, install count, and GitHub stars before installing
- As a developer, I want to install a skill with one click so I don't have to copy CLI commands
- As a developer, I want to see which skills I have installed and manage them from one place

### MCP Marketplace

- As a developer, I want to browse available MCP servers with descriptions and ratings
- As a developer, I want to see how many tokens each active MCP server consumes per session so I can make informed decisions about which to keep enabled
- As a developer, I want to add, configure, and test MCP servers without editing JSON
- As a developer, I want to disable specific MCP servers for specific projects

### Hooks Visual Editor

- As a developer, I want to create hooks without editing JSON so I can automate my workflow without a steep learning curve
- As a developer, I want to test a hook immediately after creating it
- As a developer, I want to see a log of recent hook executions and their outputs

### Voice Mode

- As a developer, I want a push-to-talk button so I can speak prompts instead of typing
- As a developer, I want visual feedback (waveform animation) while recording so I know it's listening

### Session Replay

- As a developer, I want to scrub through a past session like a timeline so I can see exactly what Claude did step by step
- As a developer, I want to see which files were modified at each point in the session
- As a developer, I want to jump to a specific point in a session and see the state of the codebase at that moment

---

## 6. Functional Requirements

### 6.1 Multi-Agent Dashboard

| ID | Requirement | Priority |
|---|---|---|
| F-01 | Detect all active Claude Code subagent processes on the system | P0 |
| F-02 | Display each agent in its own panel with live output stream | P0 |
| F-03 | Show agent metadata: worktree path, start time, status (running/idle/done/error) | P0 |
| F-04 | Show file modification count per agent, with list on hover | P1 |
| F-05 | Stop individual agents via kill button | P0 |
| F-06 | Show aggregate status: X of Y agents complete | P1 |
| F-07 | Auto-layout panels based on agent count (2-up, 4-up, 6-up grid) | P1 |
| F-08 | Expand any panel to full screen with double-click | P1 |
| F-09 | Show git diff summary per agent (files changed, lines added/removed) | P2 |
| F-10 | Merge view: show combined diff across all agents when wave completes | P2 |

### 6.2 Skills Browser

| ID | Requirement | Priority |
|---|---|---|
| F-11 | Fetch and display skills from skills.sh index | P0 |
| F-12 | Search skills by name, description, category | P0 |
| F-13 | Show skill metadata: author, install count, GitHub stars, last updated | P1 |
| F-14 | One-click install via Claude Code plugin system | P0 |
| F-15 | Show installed skills with enable/disable toggle | P0 |
| F-16 | Uninstall skill with confirmation dialog | P1 |
| F-17 | Category filter: dev tools, testing, git, DevOps, design, etc. | P1 |
| F-18 | "Trending this week" and "Most installed" sections | P2 |
| F-19 | Skill detail page: full README preview, changelog, GitHub link | P2 |

### 6.3 MCP Marketplace

| ID | Requirement | Priority |
|---|---|---|
| F-20 | Display curated list of popular MCP servers with descriptions | P0 |
| F-21 | Show token cost estimate per server (based on tool count × avg definition size) | P0 |
| F-22 | One-click add server to project or global config | P0 |
| F-23 | Visual form for server configuration (name, type, URL/command, env vars) | P0 |
| F-24 | Test connection button — verify MCP server responds | P1 |
| F-25 | Show active servers with real-time token consumption indicator | P1 |
| F-26 | Per-project enable/disable for each server | P1 |
| F-27 | Import from Claude Desktop config (one-click migration) | P2 |
| F-28 | Token budget warning: alert when active MCP servers exceed X% of context | P2 |

### 6.4 Hooks Visual Editor

| ID | Requirement | Priority |
|---|---|---|
| F-29 | Visual list of all configured hooks across user and project settings | P0 |
| F-30 | Create hook via form: event picker, matcher input, command input | P0 |
| F-31 | Event picker with descriptions of each hook type | P0 |
| F-32 | Edit and delete existing hooks | P0 |
| F-33 | "Test hook" button — runs command with mock input and shows stdout/stderr | P1 |
| F-34 | Execution log: last 20 hook runs with timestamp, input, output, exit code | P1 |
| F-35 | Toggle hook enabled/disabled without deleting | P1 |
| F-36 | Built-in hook templates: auto-format, block .env writes, git commit helper | P2 |
| F-37 | Scope selector: save to user settings vs. project settings | P1 |

### 6.5 Voice Mode

| ID | Requirement | Priority |
|---|---|---|
| F-47 | Push-to-talk button in chat input area | P0 |
| F-48 | Visual waveform animation while recording | P0 |
| F-49 | Transcription display before sending (allow edit) | P1 |
| F-50 | Keyboard shortcut for push-to-talk (Space bar hold) | P1 |
| F-51 | Works on Windows native (not just WSL) | P0 |
| F-52 | Volume level indicator | P2 |

### 6.6 Session Replay

| ID | Requirement | Priority |
|---|---|---|
| F-53 | Parse session JSONL to reconstruct message timeline | P0 |
| F-54 | Scrubber timeline showing all messages and tool calls chronologically | P0 |
| F-55 | Click any point on timeline to jump to that message | P0 |
| F-56 | Show which files were modified at each step | P1 |
| F-57 | Show tool calls (read/write/bash) inline in timeline | P1 |
| F-58 | Export session as markdown report | P2 |
| F-59 | Search within session (keyword highlighting) | P2 |
| F-60 | Compare two sessions side by side | P3 |

---

## 7. Non-Functional Requirements

### Performance
- Multi-agent dashboard must render 8 simultaneous live streams at < 50ms render lag
- Skills browser initial load: < 2 seconds (cache index locally, refresh in background)
- Session replay scrubber must be smooth at 60fps even for sessions with 1000+ messages

### Windows Compatibility
- Voice mode must work on Windows 10/11 native (no WSL requirement)
- All new features tested on Windows before macOS
- Multi-agent process detection must use Windows-compatible APIs

### Reliability
- If skills.sh is unreachable, show cached index with "offline" indicator
- Agent dashboard must handle process crashes without freezing the UI

### Bundle Size
- v2 installer target: < 200MB (up from < 150MB for v1)
- New dependencies must be evaluated for size impact before adding

---

## 8. Design Requirements

### New Visual Patterns for v2

**Multi-agent grid**: Dense, information-rich layout. Each agent panel has a colored status border (green = running, yellow = waiting, blue = done, red = error). Agent panels have a minimal header and a scrolling output stream. Think Bloomberg terminal meets VS Code.

**Skills browser**: Card-based grid layout with install count, stars, and category badge. Clean, similar to VS Code extension marketplace aesthetic but darker and denser.

**Hooks editor**: Table-based list with inline edit. Monospace font for command fields. Test results appear in a collapsible panel below each hook.

### Consistent with v1 Design System
- Same color tokens (`#0d0f12` background, `#7c6af7` accent, Geist font)
- Same spacing scale
- Same component library (shadcn/ui)
- New panels integrate as new tabs in the existing tab bar

---

## 9. Success Metrics

### GitHub Traction (3 months post v2 launch)
- 5,000+ total GitHub stars (up from v1 baseline)
- v2 announcement tweet: 500+ retweets
- Featured in Claude Code official changelog or community showcase
- At least one YouTube video from a developer YouTuber demoing the multi-agent dashboard

### Quality
- Zero regressions on v1 features
- Multi-agent dashboard screenshot becomes the repo's primary banner image
- Voice mode works first-try on Windows for 90%+ of users

### Ecosystem Contribution
- Skills browser drives measurable installs back to skills.sh (trackable via referrer)
- MCP marketplace references become citations in MCP server READMEs

---

## 10. Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Can we reliably detect subagent processes cross-platform? Need to identify claude CLI child processes by PID and associate them with worktrees. | Open |
| 2 | Does skills.sh have a public API or do we need to scrape/mirror the index? | Open |
| 3 | What's the right UX when 6+ parallel agents each need a panel? Do we cap at 6? Paginate? | Open |
| 4 | Should voice transcription happen locally (whisper.cpp) or via API? Local = private + no cost. API = better accuracy. | Open |
| 5 | Session replay for very long sessions (10k+ messages) — full parse on open or lazy load? | Deferred |

---

## 11. Dependencies

| Dependency | Purpose | Risk |
|---|---|---|
| Claude Code subagent process model | Multi-agent dashboard relies on being able to detect/attach to subagent processes | High — undocumented internals |
| skills.sh public index | Skills browser needs a data source | Medium — third party |
| Web Speech API / whisper.cpp | Voice mode transcription | Medium — Windows native support varies |
| MCP server registry | Marketplace needs a curated list | Low — can maintain manually |

---

## 12. Timeline

| Milestone | Deliverable | Target |
|---|---|---|
| v2.0-alpha | Multi-agent dashboard | Month 1 |
| v2.0-beta | Skills browser + MCP marketplace | Month 2 |
| v2.0-rc | Hooks editor + voice mode + session replay | Month 3 |
| v2.0 | Full release, updated README with new screenshots, Product Hunt relaunch | Month 4 |
