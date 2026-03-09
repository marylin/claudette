# Functionality Audit Plan

## Summary
Audit every IPC handler, button, and feature in Claudette to verify it works end-to-end. Fix stubs, dead wiring, and broken functionality found during exploration.

## Tasks

### Stubs & Missing Implementations
1. [S] Implement `sessions:resume` — pass sessionId to claude bridge with `--resume` flag
2. [S] Implement `sessions:delete` — delete JSONL file, cascade-delete checkpoints for that session
3. [M] Implement `agents:run` — prepend agent system prompt to user message, spawn `claude -p`, stream output
4. [S] Verify custom template save round-trip — create → list → use → delete all work

### Broken or Suspect Wiring
5. [S] Fix `--dangerously-skip-permissions` placement — currently appended after positional arg in CLI commands, must come before
6. [S] Verify `/clear` command works — `onClaudeCommand` event fires, renderer clears messages

### Edge Cases Already Handled (verified, no action)
- Empty project list → returns `[]`
- Malformed JSONL → lines skipped via try/catch
- Git on non-git folder → simple-git returns error, caught
- Spaces in paths → `path.join()` used everywhere

## Dependencies
- Task 2 depends on checkpoint-manager's `deleteCheckpointsForSession` (already exists)
- Task 3 is independent

## Open Questions
None — all answered.
