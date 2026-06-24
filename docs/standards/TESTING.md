# Testing

> Fresh Prints testing expectations and commands.

---

## Overview

Fresh Prints is an Electron + React + TypeScript application with Firebase backend. Run applicable checks before signoff on code changes.

---

## Required Checks Before Signoff

| Check | Command | When required |
|-------|---------|---------------|
| Lint | `npm run lint` | Code or config changes affecting TS/TSX |
| Typecheck | `tsc` (via `npm run build` first step) | Type changes |
| Build | `npm run build` | Release or build-affecting changes |
| Unit tests | N/A — no test runner configured yet | Document if added later |

**Never claim tests passed unless they were actually run.**

---

## Commands Reference

### Lint

```bash
npm run lint
```

ESLint over TypeScript and TSX sources.

### Build

```bash
npm run build
```

Runs TypeScript compile, Vite build, and electron-builder packaging.

### Dev (manual testing)

```bash
npm run dev
```

---

## Manual Testing

UI, Electron IPC, Firebase integration, and visual design often require manual verification. Use `.cursor/skills/manual-test-checkpoint` and record results in workflow signoff docs.

Setup and auth testing guides: `docs/workflow/setup/auth-testing-guide.md`

---

## CI Expectations

`[TBD — document when CI is configured]`

Local commands should mirror CI where possible.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-24 | Initial Fresh Prints testing doc from AppForge template |
