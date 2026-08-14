# Plan: Studio development white-screen recovery

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (emergency recovery) |
| Related | docs/workflow/reviews/2026-08-14-studio-dev-recovery-white-screen-review.md |

---

## Goal

Restore the existing Fresh Prints development Studio at `C:\coding\fresh-prints` (branch `development`) to a verified working launch state using known-good release `e59205d7eccf0991e9a8a9b7be266cfeff831158` (`v1.0.4-e59205d`) as the behavioral/source baseline — without creating another checkout/worktree, without touching `production`, and without starting Design Library archive/restore work.

## Background

Owner reports: packaged/production Studio works; development Studio from this checkout shows a white screen and never loads the application UI. This blocks all further Studio feature work. Design Library checkbox/archive/restore is paused until recovery completes.

## Scope

### In Scope

- Inventory and protect the existing checkout at `C:\coding\fresh-prints`
- Reproduce the white screen with documented `npm run dev:studio`
- Compare `development` to known-good Studio source
- Determine committed vs local-environment root cause
- Smallest safe recovery in this same working directory
- Verification: actual Electron launch (not build-only) + automated checks
- Plan / Formal Review / recovery report; stop for owner visual confirmation

### Out of Scope

- Design Library unwanted checkboxes / stale archived list / Restore action
- Creating another clone, worktree, or replacement checkout
- Any mutation of `production` / force-push / `git clean -fdx` / hard reset to production
- Restoring historical draft release `369614747`
- Manufacturing application source changes for an environment-only defect
- Committing secrets or printing secret values

---

## Affected Areas

### Files / Modules (expected)

- **Local only (gitignored):** `apps/studio/.env.local` (missing — restore)
- **Optional local restore:** `apps/portal/.env.local` (also missing from main checkout; Portal copy exists in parked Phase 9 worktree — restore into main for consistency, not required for Studio white-screen fix if Studio Firebase keys alone are restored)
- **No application source changes expected** if diagnosis holds
- Preserve local uncommitted `package-lock.json` one-line version-field drift (not discarded; not the white-screen cause)

### Architecture Impact

- [x] None (environment restore only)

### Security Impact

- [x] Details: Restoring gitignored local Firebase **web client** config (`VITE_FIREBASE_*`) for `fresh-prints-dev`. Do not print values. Do not commit `.env.local`. Source of values: existing parked Phase 9 Portal `.env.local` (`NEXT_PUBLIC_FIREBASE_*` → `VITE_FIREBASE_*` mapping). Same public web-app config class already used by Portal for that project.

### Data Model Impact

- [x] None

### Backend Impact

- [x] None (no Firebase deploy, no secret rotation)

### UI / UX Impact

- [x] Details: Development Studio must render login/application shell again after env restore. Owner personal launch confirmation required before Design Library work resumes.

### Migration Impact

- [x] None

### FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | None (workflow plan/review/state only) |
| Development Tooling | None |
| Distribution/Installer | None |
| Documentation | Workflow artifacts under `docs/workflow/` |
| Development History | N/A for product; recovery recorded in workflow artifacts |

---

## Diagnosis (Steps 1–4 evidence)

### Inventory (post-fetch)

| Item | Value |
|------|-------|
| Working directory | `C:\coding\fresh-prints` only |
| Branch | `development` tracking `origin/development` |
| Local HEAD | `151be70ee943ef60af4eeb0c3e500decd1b717ca` |
| `origin/development` | `151be70ee943ef60af4eeb0c3e500decd1b717ca` |
| `origin/production` / known-good | `e59205d7eccf0991e9a8a9b7be266cfeff831158` |
| Production ancestor of development? | **Yes** |
| Uncommitted / untracked | **Only** `package-lock.json` (1 line: workspace studio lock `version` `1.0.4-deriv-locus-diag.dev` → `1.0.4`). Classified as lockfile version-field drift / npm reconcile residue — **not** product feature work. **Preserved.** |

### Known-good vs HEAD (Studio runtime)

```text
git diff --stat e59205d7..HEAD -- apps/studio packages/shared package.json package-lock.json turbo.json
→ empty for apps/studio (identical Studio source tree)
```

Post-release commits on development are overwhelmingly docs/closeout. Studio-touching commits in the log (`5e0b072`, `9414aed`) are already contained in the known-good release lineage; **no committed Studio/runtime file drift** vs `e59205d7`.

### Historical `manualChunks` / `scheduler` white-screen

Fix **still present** in `apps/studio/vite.config.ts` (package-boundary match including `scheduler/`, `CIRCULAR_CHUNK` fail-closed). That failure class is **packaged production only**; Vite dev does not apply `manualChunks`. **Not reintroduced. Not this incident.**

### Reproduced failure (exact)

Command: `npm run dev:studio` (per `docs/standards/TESTING.md`).

Observed:

1. Vite ready at `http://localhost:5173/`
2. Electron main/preload build succeeds; Electron processes start
3. Renderer connects to Vite (`[vite] connecting...` / `connected.`)
4. React loads, then **fatal renderer error**:

```text
Uncaught Error: Missing required Firebase environment variable: VITE_FIREBASE_API_KEY
source: http://localhost:5173/src/renderer/src/config/env.ts (12)
```

5. White screen = uncaught module-init throw in `validateFirebaseEnv()` before UI mounts
6. Terminal `ERROR: The process "…" not found` is `vite-plugin-electron` `taskkill` noise when Electron/Vite lifecycle ends — **not** the root cause

### Local env presence

| Path | Present? |
|------|----------|
| `apps/studio/.env.local` | **False** (main checkout) |
| `apps/portal/.env.local` | **False** (main checkout) |
| Phase 9 `apps/portal/.env.local` | **True** (`NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev`) |
| Studio `.env.local` backup anywhere under `C:\coding` | **Not found** |

### Root cause

**Local-environment only:** missing gitignored `apps/studio/.env.local` with required `VITE_FIREBASE_*` keys. Committed Studio source matches known-good. Production packaged Studio works because CI bakes Firebase config at package time.

**Defect class:** (4)/(5) dependency was previously also broken (`vite` missing before `npm install`); after install, remaining white screen is **(5) incorrect/missing dev environment files** → **(8) renderer runtime failure**.

---

## Approach

1. Formal Review of this plan (env-only repair; no application source change).
2. Restore `apps/studio/.env.local` by mapping `NEXT_PUBLIC_FIREBASE_*` → `VITE_FIREBASE_*` from parked Phase 9 Portal `.env.local` (project confirmed `fresh-prints-dev`). Do not print values. Do not commit.
3. Also restore `apps/portal/.env.local` into the main checkout from the same Phase 9 file (same loss pattern; preserves Portal local readiness; does not change Studio source).
4. Optionally map Portal Algolia `NEXT_PUBLIC_ALGOLIA_*` → Studio `VITE_ALGOLIA_*` / `VITE_USE_ALGOLIA_CATALOG_SEARCH` if present — improves Design Library search parity; **not required** to clear the white-screen throw (Firebase-only).
5. Re-run `npm run dev:studio`; confirm no `VITE_FIREBASE_*` throw; login/shell renders; navigate Design Library, AI Review, Imports, Print Requests, Show Queue.
6. Run automated verification (typecheck Studio, build Studio, lint, focused tests if applicable, `git diff --check`).
7. Stop for **owner personal launch confirmation**. Do not start Design Library fixes.

### Preservation strategy

- Keep all committed development docs/closeout history on `development`
- Keep local `package-lock.json` one-line drift as-is (documented; unrelated)
- Do not reset to production; do not revert Studio commits (none offending)

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc -p apps/studio --noEmit` (or workspace equivalent) | yes |
| Lint | `npm run lint` | yes |
| Build | `npm run build:studio` (or vite build without full electron-builder if packaging blocked) | yes — Studio build must pass |
| Unit / focused | Studio unit tests if quick subset documented; otherwise document skip | as applicable |
| `git diff --check` | `git diff --check` | yes |

### Manual (agent + owner)

- [ ] Agent: Studio launches; no white screen; no fatal renderer/main errors for missing Firebase env
- [ ] Agent: Login/application shell visible; navigate primary sidebar routes listed in recovery brief
- [ ] **Owner:** personal launch confirmation before Design Library work resumes

---

## Human Checkpoints Anticipated

- [x] Secrets / env vars — restoring local gitignored `.env.local` from owner's existing Phase 9 Portal file (no new production secrets; no console actions)
- [x] Manual UI — owner must personally confirm Studio after agent verification

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wrong Firebase project in restored env | High | Verify `PROJECT_ID=fresh-prints-dev` before writing Studio file |
| Accidental commit of `.env.local` | High | Confirm gitignored; never `git add` env files |
| Algolia missing → Design Library search degraded | Low | Optional map; white screen is Firebase-only |
| Lockfile drift confusion | Low | Document; leave uncommitted |

---

## Rollback Plan

- Delete restored `apps/studio/.env.local` (and portal copy if restored) to return to pre-recovery local state
- No git history rewrite; no production impact
- If mapping wrong: replace from Firebase Console web app config for `fresh-prints-dev` without committing

---

## Documentation Updates Required

- [ ] Other: workflow plan/review/state only; no product doc change unless owner wants setup note that Studio requires `apps/studio/.env.local` after checkout (already covered in setup guides — optional pointer in recovery signoff)

---

## Open Questions

- [x] None blocking agent recovery of Firebase env from existing Portal file
- Owner must still personally confirm UI after agent verification

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-14-studio-dev-recovery-white-screen-review.md
- Verdict: pending
