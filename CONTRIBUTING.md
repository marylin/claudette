# Contributing to Claudette

Thank you for your interest in contributing! This guide will get you up and running.

## Development Setup

```bash
git clone https://github.com/whateverai/claudette.git
cd claudette
npm install
npm run start
```

## Project Structure

See `CLAUDE.md` for the full architecture breakdown, design system, and build order.

## Guidelines

- **TypeScript strict** — no `any` types
- **No new dependencies** without discussion — keep the bundle lean
- **Windows first** — test on Windows or at least use `path.join()` everywhere
- **Match the design system** — colors, spacing, and fonts are defined in `tailwind.config.js`
- **One PR = one feature** — keep it focused

## Before Submitting

```bash
npx tsc -p tsconfig.main.json    # TypeScript check
npx vite build                   # Renderer build
npm test                         # Unit tests
```

All three must pass.

## Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the checks above — all must pass
5. Open a PR with a clear description (use the PR template)

## Labels

- `good-first-issue` — great for newcomers
- `help-wanted` — we'd love community help here

## Reporting Bugs

Use GitHub Issues. Include your OS, Node version, and Claude Code version.

## Feature Requests

Open a GitHub Discussion before building anything large — let's align first.
