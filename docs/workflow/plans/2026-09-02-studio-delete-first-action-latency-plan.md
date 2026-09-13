# Plan: Studio Delete / Dependency-Search First-Action Latency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (small-task) |
| Goal id | `studio-delete-first-action-latency` |
| Related | docs/workflow/reviews/2026-09-02-studio-delete-first-action-latency-review.md |
| Dev target | `fresh-prints-dev` only after Implement approval |
| Production | **NOT AUTHORIZED** |

---

## Goal

Find and materially reduce the **first** Studio delete / dependency-search latency without weakening dependency protection, confirmation, authorization, or server-authoritative deletion safety. Subsequent actions already feel fast; the owner should not pay a long one-time wait solely because a Cloud Function instance is cold.

---

## Background

Owner observation: first delete or dependency check is very slow; later ones are much faster. Prior goal `customer-upload-artwork-quality-gate` is closed; FreshForge was **IDLE**. Smart Profiling remains **PARKED**; `show-queue-batch-allocation-performance` remains **DEFERRED**.

Handoff pack paths from the prompt (`references/project-chatgpt-handoff/02-…` etc.) are **absent** in this checkout (`[NEEDS REPO CHECK]` resolved: no `references/project-chatgpt-handoff/` tree). Used repo equivalents: `docs/architecture/ARCHITECTURE.md`, `BACKEND.md`, `FIREBASE.md`, `DATA_MODEL.md`, `docs/standards/*`, `docs/project/DECISIONS.md`, and prior deletion plans (`2026-07-22-studio-contextual-safe-deletion-plan.md`).

---

## Plan answers (required checklist)

| # | Question | Answer |
|---|----------|--------|
| 1 | Delete flows audited | Print Requests; Upcoming Shows / Show Queue; Customer Uploads; AI Review (unapproved design hard delete); Design Library archive/purge (taxonomy category/tag guards + archived asset purge); Users (customer hard-delete / tombstone / disable — preview callables); Staff Inbox completed-alert delete; Imports |
| 2 | Shared infrastructure | Contextual safe-deletion pattern: Studio dialog → service → `callTracedFunction` → Gen2 `onCall` preview + mutate pair; shared helpers `functions/src/lib/deletionEligibility.ts`, `lib/admin.ts`, `lib/caller.ts`; types in `packages/shared/.../deletion/` |
| 3 | First-delete path (representative: Print Request) | Delete menu → `PrintRequestDeletionDialog` open → `isLoadingPreview` + “Checking dependencies…” → `printRequestDeletionService.preview` → `callTracedFunction("previewPrintRequestDeletion")` → Cloud Run service `previewprintrequestdeletion` → `loadCallerProfile` + `buildPreview` (printRequests get → showAllocations query → sequential upcomingShows gets → printRequestItems query) → dialog ready → phrase → `deleteEligible` → **separate** Cloud Run `deleteeligibleprintrequest` → recheck `buildPreview` + deletes |
| 4 | Cloud Function involved? | **Yes** — every audited dependency-search / eligible hard-delete path uses Firebase Callable Gen2 (except Staff Inbox completed alerts: local client delete; Imports: no entity dependency-delete UI) |
| 5 | Firebase/Firestore/Functions lazy init (client)? | **No for app bootstrap** — `apps/studio/.../config/firebase.ts` eagerly `initializeApp` / `getAuth` / `getFirestore` / `getFunctions` / `getStorage`. Deletion **services** may load with feature routes, but Firebase core is not created on first Delete |
| 6 | Auth / token hydration? | Callable uses existing Auth session; server `loadCallerProfile` is one `users/{uid}` get. **No App Check** in Studio firebase config. Auth is not the multi-second first-hit cause |
| 7 | What becomes warm? | **Per-callable Cloud Run instance** (separate service per export). Also: TLS/HTTP to that service, Admin SDK process already running, Firestore connection on that instance. **Not** a shared app-level dependency-result cache |
| 8 | Cold vs warm timing | See Evidence § below (Cloud Logging `fresh-prints-dev`, 90d) |
| 9 | Sequential dependency queries? | **Yes** on print-request preview (`await` allocations then items; show labels sequential). Customer upload preview already `Promise.all`. Design unapproved delete uses `Promise.all` for reference checks. Upcoming-show delete runs `buildPreview` **twice** in mutate path |
| 10 | Redundant reads? | Mutate recheck is intentional TOCTOU. Upcoming-show mutate does preview + recheck (two full builds). Print-request Wave C already dropped a third preview |
| 11 | Missing indexes? | Equality filters on single fields (`printRequestId`, `upcomingShowId`, `customerUploadId`, `designId`, `sourceCustomerUploadId`) — **no new composite indexes required** for these shapes |
| 12 | Dynamic import on first Delete? | No heavy dynamic import of AI/sharp into deletion modules. Functions Admin Storage is lazy Proxy; Firestore/Auth eager in `lib/admin.ts` |
| 13 | Root cause(s) | **Primary (verified):** Gen2 callable cold start (`minInstances` default 0) — AUTOSCALING + STARTUP probe then ~1.3–3.0s HTTP vs ~0.2–0.5s warm. **Secondary:** preview and mutate are **different** Cloud Run services → confirm can cold-start again after a warm preview. **Tertiary:** sequential independent Firestore reads add warm-path hundreds of ms, not multi-second cold gap |
| 14 | Smallest safe fix | (1) Studio post-auth idle **ping warmup** of deletion preview (+ optional mutate) callables; (2) on dialog open, **parallel ping** mutate callable while preview runs; (3) **parallelize** independent reads in print-request / show preview builders; (4) drop redundant upcoming-show double-preview where safe; (5) **Amendment 2026-09-02:** same-service warmup for `purgeArchivedDesignAssets` (Design Library permanent image purge). **Do not** enable `minInstances` / cron keep-warm without owner decision |
| 15 | Client preinitialization enough? | **Partially** — moves cold start off first click after launch / recent idle warmup. After scale-to-zero (minutes idle), first action can still cold-start unless warmup repeats or minInstances |
| 16 | Backend deploy required? | **Yes (DEV)** if adding `ping` action branches and/or query parallelization in Functions; Studio-only parallel warm of existing callables needs careful no-op/error-free ping or a tiny auth-only path |
| 17 | minInstances / keep-warm required? | **Not for v1.** If post-fix Owner QA still sees multi-second first hits after idle scale-to-zero: **`[NEEDS OWNER DECISION]`** for selective `minInstances: 1` |
| 18 | Cost implications | v1: negligible (extra short ping invocations). minInstances later: continuous Gen2 idle cost — stop for owner |
| 19 | Rules changes? | **None** |
| 20 | Indexes? | **None** |
| 21 | Migrations? | **None** |
| 22 | Files expected to change | See Affected Areas |
| 23 | Correctness tests | Contract/unit: ping does not delete; preview outcomes unchanged; parallel query results match serial; auth still enforced; blocked/allowed paths unchanged |
| 24 | Performance measure | Client `performance.now` / existing `callTracedFunction` duration + Cloud Run `httpRequest.latency`; target below |
| 25 | Owner QA | Fresh Studio launch → first dependency check + first confirm delete on Print Request + one other entity; then warm repeats; unauthorized helper remains blocked |

---

## Evidence (timing — `fresh-prints-dev` Cloud Logging)

### Cold vs warm HTTP latency (representative)

| Service | Context | HTTP latency |
|---------|---------|--------------|
| `previewprintrequestdeletion` | After `Starting new instance` AUTOSCALING (2026-08-15 18:57:04) | **~1.28 s** |
| `previewprintrequestdeletion` | Same session warm | **~0.21–0.31 s** |
| `deleteeligibleprintrequest` | First mutate after warm preview (own cold start) | **~1.64 s** |
| `deleteeligibleprintrequest` | Warm | **~0.24–0.37 s** |
| `previewprintrequestdeletion` | Cold session 2026-08-28 (STARTUP ~23:17:08→13) | **~1.36–1.40 s** |
| `deleteeligibleprintrequest` | Same session | **~1.58 s** (server `durationMs` accounting **1435**) |
| `previewupcomingshowdeletion` | Cold | **~1.0–3.05 s** |
| `previewupcomingshowdeletion` | Warm | **~0.18–0.46 s** |
| `previewcustomeruploaddeletion` | Observed | **~1.33 s** (cold-shaped) |

Server accounting `durationMs` on warm deletes is often **~229–350 ms**; cold-inflated instance work **~1435 ms** — aligns with HTTP totals once container start (~4–5 s wall from AUTOSCALING line to first success) is included in owner-perceived wait.

### Hypotheses A–G

| ID | Hypothesis | Verdict |
|----|------------|---------|
| A | Cloud Function cold start | **Confirmed primary** |
| B | Client Firebase lazy init | **Rejected** as primary |
| C | Auth/token/App Check | **Rejected** as primary (profile get only; no App Check) |
| D | Firestore query/index path | **Not primary**; queries are bounded equality; indexes OK |
| E | Lazy module import | **Rejected** as primary for deletion bundles |
| F | Why subsequent faster | **Warm Cloud Run instance** + connection reuse |
| G | Sequential dependency search | **Confirmed secondary** (warm path) |

---

## Scope

### In Scope

- Audit-backed latency reduction for Studio flows sharing preview/delete callables
- Temporary/local timing instrumentation (dev / `FP_FIRESTORE_TRACE` / short-lived logs) during Implement/Test; strip or gate before signoff unless justified
- Functions changes limited to deletion preview/mutate modules + optional ping branch
- Studio warmup helper after auth + dialog parallel warm
- Parallelize independent Firestore reads where order is not a safety requirement
- Preserve all blockers, phrases, role checks, TOCTOU recheck on mutate
- DEV Functions deploy only after Test gate + owner authorization for deploy

### Out of Scope

- Production deploy / production minInstances / billing changes
- Scheduled cron keep-alive / paid always-on without owner decision
- Redesign of delete dialogs
- Smart Profiling; show-queue batch allocation
- Inventing delete UI for Imports (none today)
- Changing Staff Inbox local completed-alert delete (not this infrastructure)
- Weakening or skipping dependency checks

---

## Affected Areas

### Files / Modules (expected)

**Functions**

- `functions/src/deleteEligiblePrintRequest.ts`
- `functions/src/deleteEligibleUpcomingShow.ts`
- `functions/src/deleteEligibleCustomerUpload.ts`
- `functions/src/archiveTaxonomyWithGuards.ts` (if category/tag preview ping)
- `functions/src/hardDeleteCustomerAccount.ts` / tombstone preview pair if in warmup set
- `functions/src/index.ts` (only if new export; prefer ping on existing names)
- Matching contract/unit tests under `functions/src/**`

**Studio**

- `apps/studio/src/renderer/src/config/tracedCallable.ts` (optional timing metadata already present)
- New small warmup helper under `apps/studio/.../features/` or `config/`
- Deletion dialogs/services: print-request, upcoming-show, customer-upload (parallel mutate warm)
- Auth bootstrap / app shell hook for post-auth idle warmup
- Contract tests for warmup wiring

**Shared**

- Possibly tiny request type for `action: "ping"` on existing payloads — keep fail-closed validation

**Docs**

- `docs/architecture/BACKEND.md` (deletion latency / warmup note)
- Test report + Owner QA doc under `docs/workflow/reviews/`
- Optional ADR only if warmup policy is architectural

### Architecture Impact

- [x] Details: Client may invoke lightweight ping on existing callables; no layer violation if warmup lives in service layer via `callTracedFunction`. No Rules/data-model change.

### Security Impact

- [x] Details: Ping must still require Auth + same role gates as preview (or stricter no-op after auth). Must not bypass mutate phrase checks. No secrets.

### Data Model Impact

- [ ] None

### Backend Impact

- [x] Details: DEV deploy of touched Functions. No minInstances in v1.

### UI / UX Impact

- [x] Details: Dialogs already show “Checking dependencies…” immediately — keep. Ensure Delete click still opens modal without silent freeze. No dialog redesign.

### Migration Impact

- [ ] None

---

## Approach

1. **Confirm client RTT** with temporary instrumentation around dialog open → `callableComplete` (should track Cloud Run latency ± network).
2. **Add auth-gated `ping` (or equivalent)** on preview (and mutate) callables: `loadCallerProfile` + role assert + `{ ok: true }` — zero entity reads preferred.
3. **Studio post-auth idle warmup** (requestIdleCallback / short delay after shell ready): fire pings for the shared deletion callable set used by owner workflows.
4. **On dialog open**: start preview + mutate-ping in parallel so confirm does not pay a second cold start.
5. **Parallelize** independent reads in `buildPreview` for print requests (allocations ∥ items) and show-label fetches via `Promise.all` where safe; keep mutate TOCTOU recheck.
6. **Upcoming show**: remove redundant full double-`buildPreview` if recheck-only is sufficient (preserve fail-closed).
7. **Measure** cold (fresh launch / after documented idle) vs warm; document in test report.
8. **If still unacceptable after scale-to-zero**: stop with **`[NEEDS OWNER DECISION]`** for selective `minInstances: 1` — do not implement keep-warm automatically.

### Acceptance targets (performance)

| Metric | Target |
|--------|--------|
| First dependency search after Studio launch **with warmup completed** | ≤ **~500 ms** client RTT typical on DEV (warm instance); never skip check |
| Warm dependency search | Remain ≤ **~500 ms** typical (today ~200–400 ms server HTTP) |
| First confirm delete after dialog preview (with parallel mutate warm) | No second multi-second cold start in same dialog session |
| Without warmup / after long idle scale-to-zero | May still cold-start — document honestly; minInstances deferred |

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Functions unit/contract (deletion + ping) | `npm test` / targeted node tests in `functions` | yes |
| Studio contract tests (dialog/services/warmup wiring) | existing studio test scripts for touched files | yes |
| Typecheck (touched packages) | project scripts | yes |
| Lint | if configured for touched paths | yes |
| E2E cold-start | **not** CI-gated on internet latency | no |

### Manual / Owner QA

- Fresh Studio → wait for idle warmup (or note if disabled) → Print Request Delete → dependency check timing
- Immediately second Print Request dependency check
- Confirm delete (allowed) and blocked case
- Repeat for Customer Upload and Upcoming Show
- Helper/unauthorized: still blocked
- No double-submit while submitting
- AI Review permanent delete still dependency-safe
- Production **not** exercised

---

## Human Checkpoints Anticipated

- [x] Manual UI / Owner QA after DEV deploy
- [ ] Production deploy — **forbidden this goal**
- [ ] minInstances / billing — only if v1 insufficient → owner decision
- [x] DEV Functions deploy — require explicit owner OK before deploy step

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Warmup increases callable invocations | Low | Ping is tiny; rate once per session + dialog |
| Ping weakens auth | High if mis-coded | Same role asserts as preview; tests |
| Parallel queries change blocker labels order | Low | Assert same codes/counts; stabilize label ordering if needed |
| Owner expects zero cold start forever | Med | Document scale-to-zero; escalate minInstances |
| Merging callables (alt) breaks clients | Med | **Not** default v1; prefer ping/warmup |

---

## Rollback Plan

- Revert Studio warmup + dialog parallel ping
- Redeploy previous Functions revisions on DEV
- No data migration to undo

---

## Documentation Updates Required

- [x] BACKEND.md (brief deletion latency / warmup note)
- [ ] DECISIONS.md — only if owner later approves minInstances
- [x] Test report + Owner QA + signoff artifacts

---

## Open Questions

- [x] None blocking Implement of v1 (warmup + parallelize + dialog mutate warm)
- [ ] **`[NEEDS OWNER DECISION]`** only if v1 insufficient: selective `minInstances: 1` on deletion callables (cost/benefit)

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-02-studio-delete-first-action-latency-review.md
- Verdict: approved
- Amendment: docs/workflow/plans/2026-09-02-studio-delete-first-action-latency-plan-amendment-purge-warmup.md (owner APPROVE PURGE WARMUP AMENDMENT)
