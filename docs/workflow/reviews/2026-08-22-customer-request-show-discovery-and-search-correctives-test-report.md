# Test Report: Customer Request, Show Discovery & Search Correctives

| Field | Value |
|-------|-------|
| Date | 2026-08-22 (Test continuation) |
| Goal | `customer-request-show-discovery-and-search-correctives` |
| Pre-implementation baseline | Git `HEAD` commit `4a43790` (`docs(workflow): close out Studio 1.0.8 publish records`) — all goal code is uncommitted on `development` atop this commit |
| Status | **passed_with_notes** |

---

## Dependency installation

| Step | Command | Exit | Result |
|------|---------|------|--------|
| Root install (attempt 1) | `npm ci` | 1 (EPERM) | Failed — `next-swc.win32-x64-msvc.node` locked (likely in-use process) |
| Functions install | `npm ci` (in `functions/`) | 0 | **PASS** — 272 packages |
| Root install (attempt 2) | `npm install` | 0 | **PASS** — restored monorepo `node_modules` (required for Functions `tsc` to resolve hoisted `firebase` client types) |
| Lockfile audit | `git checkout -- package-lock.json` | 0 | Restored — no tracked lockfile drift retained (only delta had been Studio lockfile version sync `1.0.5` → `1.0.8`) |

**Note:** Prefer `npm ci` at repo root after closing processes that lock Next.js SWC (Portal dev server). Monorepo root install is required for `npm --prefix functions run build` to resolve `packages/shared` imports of `firebase/firestore`.

---

## Automated verification

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Focused unit tests | `npx tsx --test packages/shared/src/utils/catalogSearchNormalization.test.ts packages/shared/src/utils/printRequestCompletionEligibility.test.ts packages/shared/src/utils/printRequestConversion.test.ts` | 0 | **PASS** — 11/11 |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | **PASS** (after import-path fix) |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | 0 | **PASS** (after PrintRequestsPage import/modal fixes) |
| Functions build | `npm --prefix functions run build` | 0 | **PASS** |
| Studio Vite build | `npx vite build` (from `apps/studio/`) | 0 | **PASS** |
| Repository lint | `npm run lint` | 0 | **PASS** |
| `git diff --check` | `git diff --check` | 0 | **PASS** |
| Portal production build | `npm run build:portal` | 1 | **FAIL** — environment: no `apps/portal/.env.local` (missing `NEXT_PUBLIC_FIREBASE_API_KEY` and related vars). Typecheck passed; compile step succeeded before static prerender failed. Per `DEPLOYMENT.md`, Portal dev QA uses `npm run dev:portal` on localhost — not App Hosting. |

### Not run (no dedicated tests in repo yet)

| Area | Reason |
|------|--------|
| Show Designs callable DTO privacy | No unit/contract tests added for `listPortalPublicShows` / `listPortalShowCatalogDesigns` — manual QA + code review of `portalShowCatalogDesigns.ts` filter |
| Username normalization | Covered indirectly via shared `customerUsername` validator (existing); no new dedicated test file in this goal |
| Internal Gang Sheet completion callable | No new contract test file; shared `printRequestCompletionEligibility` unit tests cover reconciliation eligibility |

---

## Test-phase corrective fixes (within approved scope)

| File | Fix |
|------|-----|
| `apps/portal/app/(app)/shows/[showId]/page.tsx` | Import path `../../../../features/...` (one level deeper than `/shows/page.tsx`) |
| `apps/studio/.../PrintRequestsPage.tsx` | Restored `printRequestService` / `UpdatePrintRequestItemInput` imports; convert modal matches existing overlay `Modal` pattern |
| `apps/portal/.../PrintRequestDetailView.tsx` | Removed unused `PRINT_REQUEST_CONVERTED_TO_INTERNAL_LABEL` import |

---

## Functions `Timestamp` / `firebase/firestore` investigation

### Previous report claim

Earlier session reported: `Module '"firebase/firestore"' has no exported member 'Timestamp'` across shared types when building Functions.

### Current evidence

| Test | Exit | Diagnostics |
|------|------|-------------|
| **Current implementation** — `npm --prefix functions run build` (monorepo with root `npm install` + `functions/npm ci`) | **0** | **None** |
| **Isolated HEAD archive** — `git archive HEAD functions packages/shared` → temp dir → `functions/npm ci` → `npm run build` | **2** | `TS2307: Cannot find module 'firebase/firestore'` on 9 shared type files (identical pattern at HEAD) |

### Classification: **Case A — environment/pre-existing architecture, not a managed-goal regression**

1. **Pre-implementation baseline (`4a43790`)** already imports `Timestamp` from `firebase/firestore` in `packages/shared/src/types/printRequest/printRequest.types.ts` and 8 other shared type modules — unchanged import pattern predates this goal.
2. **Previous failure** occurred with **incomplete `node_modules`** (no root install; `tsc` unavailable). That produces misleading `Timestamp` export errors or missing-module errors depending on what is installed.
3. **This goal did not add** new `firebase/firestore` imports to shared types beyond optional closure fields on the existing `PrintRequest` interface (same `Timestamp` import line).
4. **New Functions files** (`convertCustomerPrintRequestToInternal`, `listPortalPublicShows`, `listPortalShowCatalogDesigns`, `portalShowCatalogDesigns`, `staffGangSheetShowFinishReconciliation`) use `firebase-admin` and compile cleanly in the passing build.
5. **No additional Functions diagnostics** beyond the historical shared-types + monorepo-hoisting requirement.

**Conclusion:** Do not refactor shared type `Timestamp` imports in this goal. Functions build is **green** under normal monorepo install. Document monorepo install as a prerequisite for Functions `tsc`.

---

## DEV deployment requirement (prepared — **not executed**)

Portal/Studio QA: **localhost only** (`npm run dev:portal`, `npm run dev:studio`) against `fresh-prints-dev`. **No App Hosting DEV deployment** (policy).

### DEV Functions — **REQUIRED**

Deploy only these four functions (derived from `functions/src/index.ts` exports + modified implementation):

| Function | Change | Why required for QA |
|----------|--------|---------------------|
| `completeStaffGangSheetAndOpenNext` | **Modified** (WS2 reconciliation) | Internal gang sheet Mark Complete → allocations `done` + internal request Printed |
| `convertCustomerPrintRequestToInternal` | **New** (WS1) | Studio Convert to Internal Request |
| `listPortalPublicShows` | **New** (WS4) | Public `/shows` calendar |
| `listPortalShowCatalogDesigns` | **New** (WS4) | Public show gallery |

**Exact deploy command (DEV only):**

```bash
firebase deploy --only functions:completeStaffGangSheetAndOpenNext,functions:convertCustomerPrintRequestToInternal,functions:listPortalPublicShows,functions:listPortalShowCatalogDesigns --project fresh-prints-dev
```

### DEV Firestore Rules — **REQUIRED**

**Reason:** `firestore.rules` adds `closureKind`, conversion linkage fields to `printRequestRequiredFieldsValid`, and blocks client spoofing via `optionalFieldUnchanged` in `staffCanPerformGeneralPrintRequestUpdate`. Without DEV rules deploy, converted requests written by the callable may cause subsequent client rule validation mismatches on staff paths, and closure-field schema validation will not match deployed rules.

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

**Recommended combined DEV checkpoint command:**

```bash
firebase deploy --only firestore:rules,functions:completeStaffGangSheetAndOpenNext,functions:convertCustomerPrintRequestToInternal,functions:listPortalPublicShows,functions:listPortalShowCatalogDesigns --project fresh-prints-dev
```

### DEV indexes — **NOT REQUIRED**

New callables reuse existing query shapes (`upcomingShows` by `scheduledStartAt`, `showAllocations` by `upcomingShowId` / `in` chunks) already used by `listPortalAllocatableShows` and related paths. No new composite indexes added in this goal.

### DEV App Hosting — **NOT REQUIRED / PROHIBITED**

Per owner policy (`DEPLOYMENT.md`): Portal development is localhost-only; `fresh-prints-dev` has no App Hosting backend.

---

## DEV deployment executed (2026-08-22)

| Field | Value |
|-------|-------|
| Authorization | Owner: `APPROVE DEV DEPLOY: customer-request-show-discovery-and-search-correctives` |
| Project | `fresh-prints-dev` only |
| Branch / checkout | `development` @ `C:\coding\fresh-prints` |
| Pre-deploy | `npm --prefix functions run build` — exit **0** |

**Command executed:**

```bash
firebase deploy --only firestore:rules,functions:completeStaffGangSheetAndOpenNext,functions:convertCustomerPrintRequestToInternal,functions:listPortalPublicShows,functions:listPortalShowCatalogDesigns --project fresh-prints-dev
```

| Result | Value |
|--------|-------|
| Exit code | **0** |
| Firestore Rules | `+ firestore: released rules firestore.rules to cloud.firestore` |
| `completeStaffGangSheetAndOpenNext` | **update** — Successful update operation |
| `convertCustomerPrintRequestToInternal` | **create** — Successful create operation |
| `listPortalPublicShows` | **create** — Successful create operation |
| `listPortalShowCatalogDesigns` | **create** — Successful create operation |

**Post-deploy verification (`firebase functions:list --project fresh-prints-dev`):**

| Function | Gen | Type | Region | Runtime |
|----------|-----|------|--------|---------|
| `completeStaffGangSheetAndOpenNext` | v2 | callable | us-central1 | nodejs20 |
| `convertCustomerPrintRequestToInternal` | v2 | callable | us-central1 | nodejs20 |
| `listPortalPublicShows` | v2 | callable | us-central1 | nodejs20 |
| `listPortalShowCatalogDesigns` | v2 | callable | us-central1 | nodejs20 |

**Warnings (non-blocking):**

- Firestore rules compiler warnings (unused helpers, `get`/`exists` naming) — pre-existing pattern; rules compiled and released successfully
- Node.js 20 runtime deprecation notice (2026-10-30)
- `firebase-functions` package version advisory

**Not deployed:** indexes, Storage Rules, App Hosting, production, unrelated Functions, secrets, Studio release.

---

## DEV QA environment recovery (2026-08-22)

| Issue | Detail |
|-------|--------|
| Blocker | Manual QA blocked — missing gitignored `apps/portal/.env.local` and `apps/studio/.env.local` |
| Portal symptom | `Missing required Firebase environment variable: NEXT_PUBLIC_FIREBASE_API_KEY` |
| Studio symptom | White screen — fatal `VITE_FIREBASE_API_KEY` throw in `config/env.ts` (same class as 2026-08-14 recovery) |
| Recovery source | Firebase CLI `apps:sdkconfig WEB` for registered web app **Fresh Prints Desktop Renderer** on project **`fresh-prints-dev`** (App ID `1:695546728466:web:98691887dfc8ab4a5d08cb`). Prior worktree `.env.local` backups were not present on disk. |
| Application source changes | **None** — local gitignored env files only |
| Both configs target | **`fresh-prints-dev`** (verified via `PROJECT_ID` before write) |

| Verification | Result |
|--------------|--------|
| Portal dev (`npm run dev:portal`) | **PASS** — `http://localhost:3100` HTTP 200; `.env.local` loaded; no Firebase env error in HTML |
| Studio dev (`npm run dev:studio`) | **PASS** — Vite ready; Electron processes running; no `VITE_FIREBASE_*` fatal in dev output |
| Portal build (`npm run build:portal`) | **PASS** — exit **0** after env restore (first attempt failed EPERM while dev server held `.next`; succeeded after stopping conflicting Next process) |
| Git tracking | `apps/portal/.env.local` and `apps/studio/.env.local` **gitignored**, not tracked |

**Optional vars not restored:** Algolia (`NEXT_PUBLIC_ALGOLIA_*` / `VITE_ALGOLIA_*`), `NEXT_PUBLIC_FIREBASE_VAPID_KEY` — not required for app boot; WS5 Algolia path may need separate owner env if Firestore fallback is insufficient.

**Update (2026-08-22 QA):** Algolia vars restored to `apps/portal/.env.local` and `apps/studio/.env.local` from `functions/.env.fresh-prints-dev` (`ALGOLIA_APP_ID`, `ALGOLIA_PORTAL_CATALOG_INDEX_NAME`) plus dev search key recovered via GCP Secret Manager (`firestore-algolia-search-ALGOLIA_API_KEY`, verified against `portal_catalog_ready_dev`). Restart Portal/Studio dev after env changes.

---

## Manual DEV QA readiness

| Prerequisite | Status |
|--------------|--------|
| Automated checks (except Portal build w/o env) | Ready |
| `apps/portal/.env.local` for local Portal | Owner must have dev Firebase env (repo convention) |
| DEV Functions + Rules deploy | **Complete** (2026-08-22) |
| Local Studio dev build | Ready (`npx vite build` passed) |

**Start local QA:**

```bash
# Terminal 1 — Portal (http://localhost:3100)
npm run dev:portal

# Terminal 2 — Studio (Electron dev against fresh-prints-dev)
npm run dev:studio
```

Both apps use `fresh-prints-dev` per existing `.env.local` / Studio env convention. No App Hosting DEV rollout.

---

## Manual DEV QA checklist (owner)

### WS1 — Customer → Internal conversion

- [ ] Studio: open eligible **Customer Request** → **Convert to Internal Request**
- [ ] Confirm modal lists pending/queued allocations to cancel (when present)
- [ ] Confirm conversion succeeds; pending/queued allocations canceled
- [ ] Attempt conversion with `in_progress` (or later) allocation → **blocked** with clear error
- [ ] Portal: original request appears in **Printed** tab with **Converted to Internal Request · Closed**
- [ ] New **IR###** internal request created with copied items (original CR not flipped to internal)
- [ ] Customer can start a new **CR###**
- [ ] E2E: Convert → add to Internal Gang Sheet → Mark Complete → Internal **Printed**

### WS2 — Internal Gang Sheet completion

- [ ] Create/use Internal Gang Sheet with internal request allocated
- [ ] **Mark Complete** → internal request moves to **Printed** when fully done
- [ ] Refresh Studio — state persists
- [ ] Repeat Mark Complete — idempotent (no duplicate side effects)
- [ ] Split request across two sheets — completing one sheet does **not** print entire request
- [ ] Whatnot Finish path unchanged

### WS3 — Username registration UX

- [ ] Register with mixed case (e.g. `SarahSmith`) → stored as `sarahsmith`
- [ ] Whatnot username recommendation visible
- [ ] Requirements section expandable/compact
- [ ] Invalid username shows specific reason (too short, invalid char, etc.)
- [ ] Duplicate username shows taken error

### WS4 — Public Show Designs

- [ ] Guest opens `/shows` without login
- [ ] Calendar lists expected shows with unique public catalog design counts
- [ ] Select show → gallery lists **ready catalog designs only**
- [ ] Private customer uploads **not** visible
- [ ] Logged-out **Add to Request** prompts login
- [ ] Logged-in: quantity controls / add flow work
- [ ] Duplicate allocations for same design do not duplicate gallery cards
- [ ] Other customers' quantities not exposed

### WS5 — Search normalization (Portal + Studio)

- [ ] `mindful` finds `Mindful`
- [ ] `MINDFUL` finds `Mindful`
- [ ] `butt hole` finds `butthole`
- [ ] `butthole` finds `butt hole`
- [ ] Separator variants (`butt_hole`, `butt-hole`) match as approved
- [ ] `kill` does **not** spuriously match `will`
- [ ] Studio full design ID search still works

---

## Verdict

**passed_with_notes** — automated checks pass; DEV deploy complete; **owner manual QA in progress**.

- Portal production build requires local `.env.local` (expected; use `npm run dev:portal` for QA).
- Functions `Timestamp` issue was environment/monorepo-hoisting artifact; build passes with standard install.
- DEV Functions + Rules deployed 2026-08-22; awaiting manual QA before signoff.
