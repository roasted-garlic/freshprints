# Intake Findings — Fresh Prints

> **Generated during Existing Project Intake (post–AppForge migration).** Inspection record from repository analysis. Facts tagged `[INFERRED]` unless confirmed by prior signoffs.

**Intake date:** 2026-06-24  
**Intake plan:** `docs/workflow/plans/fresh-prints-existing-project-intake-plan.md`  
**Signoff:** `docs/workflow/reviews/fresh-prints-existing-project-intake-signoff.md`

---

## What Was Inspected

| Area | Paths / artifacts reviewed | Depth |
|------|---------------------------|-------|
| Repository structure | Root, `electron/`, `src/renderer/`, `shared/`, `functions/` | Full |
| Package manifests | `package.json`, `functions/package.json` | Full |
| Source entry points | `electron/main.ts`, `src/renderer/src/routes/AppRoutes.tsx` | Full |
| Backend / API | `functions/src/`, `firestore.rules`, `storage.rules`, `firebase.json` | Read-only |
| Data layer | `docs/architecture/DATA_MODEL.md`, design/import types | Cross-check |
| Auth | `features/auth/`, Firestore rules, Cloud Functions | Cross-check |
| Tests | `**/*.test.ts` (13 files), `package.json` scripts | Full |
| CI/CD | `.github/` | None found `[INFERRED]` |
| AppForge migration | `AGENTS.md`, `.cursor/`, `docs/` layout | Full |
| Git tracking | `git ls-files` for `release/`, `dist-electron/`, `build/` | Full |
| Existing docs | All `docs/project/`, `architecture/`, `standards/`, `workflow/` | Full |

---

## Stack Detected

| Layer | Detection | Evidence | Confidence |
|-------|-----------|----------|------------|
| Language(s) | TypeScript | `.ts`, `.tsx` throughout | confirmed |
| Desktop UI | React 18 + React Router 7 | `package.json`, `AppRoutes.tsx` | confirmed |
| Desktop shell | Electron 30 + Vite 5 | `package.json`, `electron/main.ts` | confirmed |
| Backend | Firebase (Auth, Firestore, Storage, Functions) | `src/renderer/src/config/firebase.ts`, rules files | confirmed |
| Image processing | sharp (main process) | `package.json`, `electron/services/import/` | confirmed |
| ZIP handling | yauzl (main process) | `package.json`, import IPC | confirmed |
| Email (server) | Resend via Cloud Functions | `functions/package.json`, `resendEmailService.ts` | confirmed |
| Package manager | npm | `package-lock.json` | confirmed |
| Node (functions) | 20 | `functions/package.json` engines | confirmed |

---

## Scripts Detected

| Script | Command | Purpose |
|--------|---------|---------|
| dev | `vite` | Electron + renderer dev |
| build | `tsc && vite build && electron-builder` | Typecheck, bundle, package installer |
| lint | `eslint . --ext ts,tsx` | ESLint |
| preview | `vite preview` | Vite preview only |
| test | *not defined* | 13 `.test.ts` files exist but no runner script `[INFERRED]` |
| typecheck | *not separate* | Part of `build` via `tsc` | 

Functions (`functions/package.json`): `build`, `serve`, `deploy`, `logs`.

---

## Major Features Detected

| Feature / domain | Location | Notes |
|------------------|----------|-------|
| Authentication | `features/auth/` | Login, protected routes, profile cache |
| User management | `features/users/` + Cloud Functions | `createTeamUser`, `updateTeamUser` |
| Permissions | `features/permissions/` | Role-based `permissionService` |
| Design library | `features/designs/` | CRUD, categories, grid, derivatives URLs |
| Imports | `features/imports/` + `electron/ipc/import/` | Single/batch PNG, ZIP, derivatives |
| AI review | `features/ai-review/` | Page + `aiReviewStatus` on designs `[INFERRED]` partial UI |
| Dashboard | `features/dashboard/` | Shell route |
| Settings | `features/settings/` | Route present |
| Show queue | `features/show-queue/` | Placeholder page `[INFERRED]` |
| Customer requests | `features/customer-requests/` | Placeholder page `[INFERRED]` |
| Firebase connection UI | `features/firebase/` | Connection status display |

Routes confirmed in `AppRoutes.tsx`: `/`, `/designs`, `/imports`, `/ai-review`, `/show-queue`, `/customer-requests`, `/users`, `/settings`.

---

## Backend Detected

| Topic | Finding | Tag |
|-------|---------|-----|
| Provider | Firebase (Google) | confirmed |
| Auth | Firebase Auth + `users/{uid}` Firestore profile | confirmed |
| Data | Cloud Firestore with role helpers in rules | confirmed |
| Storage | Staff-only originals/thumbnails/previews paths | confirmed |
| Functions | Callable HTTP functions for team user ops + Resend email | confirmed |
| External | Resend (invitation email) | confirmed |

---

## Database or Data Layer Detected

| Topic | Finding | Tag |
|-------|---------|-----|
| Store type | Cloud Firestore | confirmed |
| Rules | `firestore.rules` in repo root | confirmed |
| Storage rules | `storage.rules` in repo root | confirmed |
| Types | `features/designs/types/`, `shared/types/` | confirmed |
| Key collections | `users`, `designs`, `categories` `[INFERRED]` from rules and services |

---

## Auth Detected

| Topic | Finding | Tag |
|-------|---------|-----|
| Provider | Firebase Authentication | confirmed |
| Roles | owner, admin, helper, customer in Firestore rules | confirmed |
| Client enforcement | `ProtectedRoute` + `permissionService` | confirmed |
| Server enforcement | Firestore/Storage rules + Cloud Functions caller checks | confirmed |

---

## Testing Detected

| Topic | Finding | Tag |
|-------|---------|-----|
| Unit tests | 13 `.test.ts` files (shared utils, design services) | confirmed |
| Test runner | No `npm test` in root `package.json` | confirmed |
| CI | No `.github/workflows` found | `[INFERRED]` |
| Lint | `npm run lint` — passes in intake validation | confirmed |

---

## Deployment Detected

| Topic | Finding | Tag |
|-------|---------|-----|
| Desktop packaging | electron-builder → `release/` | confirmed |
| Firebase deploy | Documented in setup guides; not run during intake | — |
| Environments | `.env.example` for Vite Firebase vars; `.env.local` present locally (not tracked) | confirmed |

---

## AppForge Migration Verification

| Check | Result |
|-------|--------|
| `AGENTS.md` exists | ✅ |
| `.cursor/` exists | ✅ |
| `.cursor/workflow/state.md` + `state-template.md` | ✅ |
| `.appforge-temp/` absent | ✅ |
| `docs/appforge-development/` absent | ✅ |
| `docs/_migration-backup/` gitignored | ✅ |
| Old `docs/plans/`, `reviews/`, `setup/` active folders | ✅ Absent |
| `docs/workflow/plans/`, `reviews/`, `setup/` | ✅ Present |
| Old root docs (`docs/ARCHITECTURE.md`, etc.) | ✅ Removed |

**Stale references fixed (active files):** `docs/WORKFLOWS.md`, `docs/workflow/setup/*.md` (partial), `AGENTS.md` (electron paths), `docs/architecture/ARCHITECTURE.md` (electron paths).

**Historical artifacts:** Phase 1–3 workflow docs under `docs/workflow/plans/` and `reviews/` retain old path references by design (historical record).

---

## Doc vs Code Mismatches Found

| Doc | Issue | Resolution |
|-----|-------|------------|
| `ROADMAP.md` header | Said Phase 1 Active; code at Phase 3D | Updated in intake |
| `AGENTS.md` / `ARCHITECTURE.md` | Referenced `src/main/`, `features/` at root | Updated to `electron/`, `src/renderer/src/features/` |
| `TESTING.md` | Accurate for lint/build; no test script | Documented gap |
| `PROJECT_HEALTH.md`, `TECH_DEBT.md` | Templates only | Populated in intake |

---

## Security Observations (document only)

| Observation | Severity | Tag |
|-------------|----------|-----|
| `release/` contains packaged installers tracked in git (79 files) | Medium | `[INFERRED]` repo bloat, not secret exposure |
| Broad preload IPC surface noted in Phase 3A reviews | Medium | See `docs/workflow/reviews/phase-3a-kickoff.md` (historical) |
| Storage rules deploy per environment | Medium | `[NEEDS HUMAN INPUT]` per Phase 3C signoff condition C1 |
| `.env.local` not tracked | Good | confirmed |

---

## Human Input Needed

| # | Topic | Why |
|---|-------|-----|
| H1 | Firebase project IDs / production vs dev | Not stored in repo — confirm environment strategy |
| H2 | Storage rules deployed to all target projects? | Phase 3C signoff condition C1 |
| H3 | GitHub remote / branch merge plan | Migration branch `fresh-prints-appforge-migration` status `[NEEDS HUMAN INPUT]` |
| H4 | Priority between git artifact cleanup vs Phase 3D DPI work | Business preference |

---

## Recommended Next Phases

| Priority | Phase | Rationale |
|----------|-------|-----------|
| **P0** | `git-generated-output-cleanup` | 79 `release/` + 3 `dist-electron/` files tracked before GitHub push |
| **P1** | Phase 3D — Print size & DPI normalization | `docs/workflow/plans/print-size-dpi-normalization-plan.md`; foundation partially implemented |
| **P2** | Add `npm test` + CI | 13 test files with no runner script |

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-24 | Post-migration Existing Project Intake |
