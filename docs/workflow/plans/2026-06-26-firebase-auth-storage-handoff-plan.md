# Plan: Firebase Auth, Firestore & Storage Handoff Package

| Field | Value |
|-------|-------|
| Date | 2026-06-26 |
| Author | Managing Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-06-26-firebase-auth-storage-handoff-review.md |

---

## Goal

Create a portable documentation package under `docs/handoffs/firebase-auth-storage/` that teaches another AI (and human developer) how Fresh Prints implemented Firebase Authentication, Firestore, and Firebase Storage — including code patterns, security rules, env config, and service-layer conventions — so the same foundation can be replicated in a different application without re-deriving it from scratch.

## Background

Fresh Prints is an Electron + React (Vite) app with Firebase as the sole backend. Auth, authorization data, metadata, and file storage follow clear layering (components → hooks → services → Firebase SDK). Another project needs the same Firebase foundation documented with repo-accurate citations, portable vs project-specific labels, replication checklist, and mermaid diagrams.

This phase is **documentation only**. No application code changes.

## Scope

### In Scope

- Repo inspection of actual implementation (code is source of truth)
- Auth: Firebase Auth (email/password), persistence, session, profile bootstrap after login
- Firestore: initialization, collection access patterns, document standards, service layer, timestamps, error handling
- Storage: path conventions, upload/download patterns, metadata-vs-files separation
- Security rules: `firestore.rules`, `storage.rules` — philosophy and reusable rule patterns
- Environment: `VITE_FIREBASE_*` vars, `src/renderer/src/config/env.ts`, `src/renderer/src/config/firebase.ts`
- Permissions: role model, `permissionService`, UI gates (`RoleGate`, `ProtectedRoute`)
- User records: `users/{uid}` Firestore profile required after Auth login
- Firebase project wiring: `firebase.json`, indexes, deploy commands
- Cloud Functions touchpoints (`createTeamUser`, `updateTeamUser`) — optional/advanced only
- Cross-reference existing docs; flag mismatches
- Seven handoff documents per required structure
- Replication checklist, file map, mermaid diagrams, target-app prompt

### Out of Scope

- Product domain (designs, imports, AI enrichment, show queues, customer requests)
- Full Cloud Functions / AI pipeline replication
- Production deploy execution or secret setup
- Modifying Fresh Prints code or rules
- Inventing requirements not present in the repo

---

## Affected Areas

### Files / Modules (expected)

**New (create):**

- `docs/handoffs/firebase-auth-storage/README.md`
- `docs/handoffs/firebase-auth-storage/01-architecture.md`
- `docs/handoffs/firebase-auth-storage/02-implementation-guide.md`
- `docs/handoffs/firebase-auth-storage/03-code-patterns.md`
- `docs/handoffs/firebase-auth-storage/04-security-rules.md`
- `docs/handoffs/firebase-auth-storage/05-environment-and-setup.md`
- `docs/handoffs/firebase-auth-storage/06-adaptation-notes.md`

**Read-only inspection (cite, do not modify):**

- `src/renderer/src/config/firebase.ts`, `env.ts`
- `src/renderer/src/features/auth/**`
- `src/renderer/src/features/users/**`
- `src/renderer/src/features/permissions/**`
- `src/renderer/src/features/firebase/**`
- `src/renderer/src/features/designs/services/designService.ts` (pattern exemplar)
- `src/renderer/src/features/designs/services/designDerivativeStorageService.ts`
- `src/renderer/src/features/imports/services/importUploadService.ts`
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`
- `functions/src/createTeamUser.ts`, `functions/src/updateTeamUser.ts`
- `docs/architecture/FIREBASE.md`, `BACKEND.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`
- `docs/workflow/setup/firebase-*.md`, `firestore-setup.md`, `auth-testing-guide.md`

### Architecture Impact

- [x] None (documentation export only)

### Security Impact

- [x] None — handoff documents patterns; no credential exposure
- Document: never include real API keys or project IDs from `.env`

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] None

### Migration Impact

- [x] None

---

## Approach

1. **Initialize workflow state** for phase `firebase-auth-storage-handoff`; set Plan phase.
2. **Inspect primary source files** listed in user request; expand where gaps found.
3. **Compare code vs existing docs** (`FIREBASE.md`, `DATA_MODEL.md`, setup guides); note accurate sections and mismatches in handoff docs.
4. **Author doc package** in prescribed order:
   - `README.md` — index, 5-minute summary, file map, replication checklist summary, target-app prompt
   - `01-architecture.md` — layers, auth→profile→permissions, three mermaid diagrams
   - `02-implementation-guide.md` — ordered replication steps for greenfield app
   - `03-code-patterns.md` — annotated excerpts with paths (init, auth, user, firestore, storage)
   - `04-security-rules.md` — portable rule helpers, users collection deny-write, staff checks
   - `05-environment-and-setup.md` — env vars, console steps, deploy commands, links to setup guides
   - `06-adaptation-notes.md` — Electron vs web, bundler, monorepo, emulators
5. **Label each section** portable vs Fresh Prints–specific.
6. **Test phase:** verify all cited paths exist; check internal links; skip `npm run lint` (no tooling config changes).
7. **Signoff** with test report.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | N/A — docs only | no |
| Lint | Skip — no markdown tooling config changes | no |
| Path citation verify | Script/grep: all cited `src/`, `firestore.rules`, etc. paths exist | yes |

### Manual

- [ ] Optional: human reviews handoff accuracy before using on target app
- [ ] Broken link check on internal doc links

---

## Human Checkpoints Anticipated

- [ ] Optional: human reviews handoff accuracy before using on target app
- [x] None required to complete doc authoring

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale `FIREBASE.md` vs current code | Medium | Code is source of truth; flag mismatches in handoff |
| Over-copying domain-specific rules (designs) | Medium | Extract portable user/auth/storage patterns only |
| Credential leakage in examples | High | Use placeholders only; never read `.env` values into docs |
| Target app assumes Cloud Functions required | Low | Document console bootstrap + optional Functions path |

---

## Rollback Plan

Delete `docs/handoffs/firebase-auth-storage/` and revert workflow state. No app code affected.

---

## Documentation Updates Required

- [x] New handoff package only (`docs/handoffs/firebase-auth-storage/*`)
- [ ] PROJECT_BRIEF.md — no
- [ ] ARCHITECTURE.md — no (handoff references existing docs)
- [ ] DECISIONS.md — no

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Documentation | Yes — new `docs/handoffs/` package |
| Starter Surface | No |
| App code | No changes |

---

## Open Questions

- [x] None — Cloud Functions are optional for minimal auth; console + Admin SDK bootstrap documented

---

## Approval

- Review doc: `docs/workflow/reviews/2026-06-26-firebase-auth-storage-handoff-review.md`
- Verdict: pending
