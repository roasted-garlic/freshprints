# Checkpoint: Production rollout blocked on shell approvals — catalog search UX

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Goal | `prelaunch-catalog-search-count-and-first-visit-ux` |
| Production source SHA | `f5584451e8cff197e0dd1acc8ea747bc992a88a9` |
| Status | **STOPPED** — release gates PASS; Portal App Hosting + Studio secret/env write blocked by Cursor `beforeShellExecution` hooks pending owner allow |

## Owner authorizations already received

- `APPROVE PORTAL APP HOSTING ROLLOUT: PRELAUNCH CATALOG SEARCH UX`
- `APPROVE STUDIO PRODUCTION BUILD/PUBLISH: PRELAUNCH CATALOG SEARCH UX`

## Phase 1 — Production source preflight

| Check | Result |
|-------|--------|
| `origin/production` tip | `f5584451e8cff197e0dd1acc8ea747bc992a88a9` (PR #55 merge; TIP_MATCH) |
| Local `production` FF to origin | PASS |
| HEAD == `origin/production` | PASS |
| Hotfix present (Portal About modal + shared exact-search params) | PASS |
| Chris Corner parked artifacts not on production tip | PASS (not promoted) |

## Phase 2 — Final release gates on production tip

| Gate | Command | Result |
|------|---------|--------|
| `git diff --check` | `git diff --check` | **PASS** (exit 0) |
| Lint | `npm run lint` | **PASS** (exit 0) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **PASS** (exit 0) |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio/` | **PASS** (exit 0) |
| Studio Vite build | `npx vite build` in `apps/studio/` | **PASS** (exit 0) |
| Portal build | `npm run build:portal` | **PASS** (exit 0) |

## Phase 3 — Studio Algolia production configuration (no key values)

| Check | Result |
|-------|--------|
| Variable names (source) | `VITE_ALGOLIA_APP_ID`, `VITE_ALGOLIA_SEARCH_API_KEY`, `VITE_ALGOLIA_INDEX_NAME` (+ optional `VITE_USE_ALGOLIA_CATALOG_SEARCH`) |
| Prod SM secrets present | `NEXT_PUBLIC_ALGOLIA_APP_ID`, `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY`, `NEXT_PUBLIC_ALGOLIA_INDEX_NAME` |
| Index name vs expected | **MATCH** `portal_catalog_ready_prod` |
| Admin key | Exists in SM as `ALGOLIA_ADMIN_API_KEY` — **must never** be used for Studio client |
| Local `apps/studio/.env.local` | Firebase only; **all `VITE_ALGOLIA_*` missing**; project currently **dev** |
| `.github/workflows/studio-release.yml` | **No Algolia env wiring** (Firebase only) |
| Published Studio version | `v1.0.2` stable **published**; package.json still **`1.0.2`** → next release must be **`1.0.3`** per DEPLOYMENT.md versioning |

### Studio publish blockers (exact owner actions)

1. **Allow Cursor shell** (or run yourself) to write production Studio env from Secret Manager mapping:
   - `NEXT_PUBLIC_FIREBASE_*` → `VITE_FIREBASE_*` (project must be `fresh-prints-prod`)
   - `NEXT_PUBLIC_ALGOLIA_*` (search-only trio) → `VITE_ALGOLIA_*`
   - Index must remain `portal_catalog_ready_prod`
   - Never map `ALGOLIA_ADMIN_API_KEY`
2. **Version bump** `apps/studio/package.json` `1.0.2` → `1.0.3` via production PR (tag `v1.0.2` already published).
3. **Preferred lasting fix:** add GitHub Actions secrets for prod search-only Algolia + wire `studio-release.yml` Configure Studio env step (separate small PR), then `workflow_dispatch` stable / `internal-unsigned` from production SHA / `production`.
4. Until CI is wired, a local `apps/studio` production package with SM-backed `.env.local` is the only way to bake search-only Algolia into the installer without inventing a new distribution channel — still requires shell approval to read SM values.

## Phase 4 — Portal App Hosting (NOT RUN)

Cursor hook denied production Firebase commands. Exact command to allow/run:

```bash
firebase apphosting:rollouts:create fresh-prints-portal --git-commit f5584451e8cff197e0dd1acc8ea747bc992a88a9 --project fresh-prints-prod --force --non-interactive
```

Equivalent documented path:

```bash
firebase deploy --only apphosting --project fresh-prints-prod --non-interactive
```

**Must not** include Functions, Rules, indexes, Storage, or Algolia mutation.

Backend: `fresh-prints-portal` on `fresh-prints-prod`  
URL: `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`

## Untouched (this pass)

- Functions deploy
- Firestore / Storage Rules
- Firestore indexes
- Algolia setSettings / reconcile / data mutation
- DNS / myprintrequest.com cutover
- `development` sync

## Next workflow checkpoint

1. Owner **allows** the Portal App Hosting shell command (or runs it) and returns rollout/build/revision IDs.
2. Owner **allows** Studio prod env write from SM (or supplies search-only `VITE_ALGOLIA_*` for prod) + approves **1.0.3** version bump PR path.
3. Complete Studio build/publish via `studio-release.yml` (after CI Algolia wiring) or approved local package + draft release publish.
4. Technical smoke, then owner QA with phrase below.
5. **Do not** sync `development` or Signoff until QA PASS.

## Owner PASS phrase (after both Portal + Studio are live and QA done)

`PROD CATALOG SEARCH + FIRST VISIT QA: PASS`
