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
| Unit tests | 13 `*.test.ts` files in repo | **Not wired** — no `npm test` in `package.json` `[INFERRED]` |

**Never claim tests passed unless they were actually run.**

### Test files detected (intake 2026-06-24)

Locations include `shared/utils/*.test.ts`, `features/designs/**/*.test.ts`, `features/permissions/**/*.test.ts`. Add a test runner in a future managed phase (`testing-and-ci-bootstrap`).

---

## Commands Reference

### Lint

```bash
npm run lint
```

ESLint over TypeScript and TSX sources.

### Typecheck (standalone)

```bash
npx tsc --noEmit
```

Runs TypeScript compiler without emit. Also runs as first step of `npm run build`.

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
