# Playwright Demo Video Upgrade Plan

## Summary
The current Playwright capture test (`tests/e2e/capture-assets.spec.ts`, test 10) only navigates tabs, toggles sidebar, and opens/closes the command palette — it never actually uses the app. Upgrade it to perform realistic interactions: type a chat message, browse files, view diffs, create an agent, use the command palette properly, and interact with settings. This produces a much more compelling demo.webm.

## Tasks
1. [M] Rewrite test 10 "Full walkthrough for video" — replace tab-cycling with a scripted demo flow that exercises real UI interactions across all major features
   - Chat: type a message in textarea, click Send (won't actually connect to Claude but shows the input UX)
   - Files: switch to Files tab, type in filter input, click a file/folder if items exist
   - Git: switch to Git tab, click a changed file to view diff, click in commit message textarea, type a message
   - Agents: switch to Agents tab, click "New Agent", fill name/description/system prompt fields, select model, click Save
   - Usage: switch to Usage tab, click Refresh
   - Command Palette: open with Ctrl+K, type a search query, arrow-down to select, press Enter
   - Settings: open settings, change font size slider, toggle a checkbox, close
   - Terminal: open terminal, pause, close
   - Sidebar: collapse/expand, click a project if available
   - End on Chat tab with a clean view
2. [S] Add helper functions for common interactions (fillInput, clickByLabel, clickByText) to reduce test verbosity
3. [S] Increase video pause timings at key moments (after typing, after transitions) so the video reads well at normal playback speed
4. [S] Add a `render:webm` or `capture:video` npm script to package.json for easy re-generation

## Dependencies
- Task 2 before Task 1 (helpers used throughout the walkthrough)
- Task 3 is integrated into Task 1

## Open Questions
None — the app's interactive elements are well-mapped via aria-labels and placeholders.
