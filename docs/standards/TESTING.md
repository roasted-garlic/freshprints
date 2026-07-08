# Testing

> Fresh Prints testing expectations and commands.

---

## Overview

Fresh Prints is a **two-app monorepo**: Fresh Prints Studio (Electron + Vite + React) and Fresh Prints Portal (Next.js), with shared packages and Firebase Cloud Functions. Run applicable checks before signoff on code changes.

---

## Required Checks Before Signoff

| Check | Command | When required |
|-------|---------|---------------|
| Lint | `npm run lint` | Code or config changes affecting TS/TSX |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | Studio/shared type changes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | Portal changes |
| Functions build | `npm --prefix functions run build` | Functions changes |
| Studio Vite build | `npx vite build` (from `apps/studio/`) | Studio build-affecting changes |
| Portal build | `npm run build:portal` | Portal release or build changes |
| Studio installer | `npm run build:studio` | Electron packaging changes |
| Unit tests | `npx tsx --test` (see below) | Logic changes with tests |

**Never claim tests passed unless they were actually run.**

---

## Commands Reference

### Lint

```bash
npm run lint
```

ESLint over TypeScript and TSX in Studio, Portal, and shared packages.

### Typecheck

```bash
npm --prefix apps/studio exec tsc -- --noEmit
npm run typecheck --workspace @fresh-prints/portal
npm --prefix functions run build
```

### Full unit test sweep

```bash
npx tsx --test packages/shared/src/**/*.test.ts apps/studio/src/**/*.test.ts apps/studio/electron/**/*.test.ts apps/portal/**/*.test.ts
```

On Windows PowerShell, run tests per directory or use the repo's documented sweep pattern from workflow state (82 test files as of 2026-07-08, post symmetric-apps-monorepo move).

There is **no** root `npm test` script — invoke `npx tsx --test` explicitly.

### Build

```bash
npm run build:studio    # tsc + vite + electron-builder
npm run build:portal    # Next.js production build
```

### Dev (manual testing)

```bash
npm run dev            # Studio + Portal together
npm run dev:studio     # Electron + Vite only
npm run dev:portal     # Next.js on port 3000 only
```

---

## Manual Testing

UI, Electron IPC, Firebase integration, and visual design often require manual verification. Use `.cursor/skills/manual-test-checkpoint` and record results in workflow signoff docs.

Setup guides: `docs/workflow/setup/`

---

## CI Expectations

`[TBD — document when CI is configured]`

Local commands should mirror CI where possible.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-08 | Phase 8 closeout — Portal commands, monorepo test paths |
| 2026-06-24 | Initial Fresh Prints testing doc (intake) |
