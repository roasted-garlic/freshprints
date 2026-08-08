# Plan: Amendment 9 P3 — Server AI taxonomy read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Agent (overnight unattended pass) |
| Status | approved_with_changes (Formal Review applied in Implement) |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Amendment | 9 P3 — server AI taxonomy read containment |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Related | Amendment 9 Plan/Review; P0 server-read attribution; P4 Signoff |
| Parent | `docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-plan.md` |

---

## Goal

On a **warm** Cloud Function instance, a sequential ~45-design AI enrichment batch should incur approximately **one** full Firestore taxonomy load (active categories + approved tags) within a bounded process-local cache window, with subsequent jobs served from memory and parallel cold misses joining a single in-flight Promise. Firestore remains the only authoritative taxonomy source. No new persistent snapshot, Storage cache, collection, API, or dependency.

---

## Background

Runtime evidence (P0 attribution, one `runtimeInstanceId`, ~45 AI jobs):

| Observation | Value |
|-------------|------:|
| Outer-cache miss cycles logged | **3** (≈60s spacing) |
| Estimated attributed taxonomy docs | **3 × ~1,140 ≈ 3,420** |
| Cache hits | 126 (42 each tags/categories/settings) |

Source reconstruction at current HEAD shows the attribution’s “3 full loads” maps to the **outer** `CACHE_TTL_MS = 60_000` miss cycle in `aiEnrichmentRuntimeCache.ts`, which may **over-count Firestore** when the **inner** `FALLBACK_TTL_MS = 5 * 60_000` in `loadAiCatalogReferenceSnapshot.ts` still holds. Regardless, the nested architecture is the proven defect: short outer TTL, dual callers each invoking the full snapshot loader, metrics that do not distinguish Firestore load vs rematerialization, and a 5-minute inner TTL that will reload on any warm batch longer than five minutes.

Owner overnight authorization allows a process-local TTL extension under documented constraints (Firestore authority, finite TTL, failure-safe, in-flight dedupe, no new infra).

---

## Investigation answers (current HEAD)

1. **What taxonomy does AI enrichment need?** Active categories (`id`, `name`, optional `description`) and approved tags (`id`, `name`, `aliases`, `preferredWhen`, status approved). Used for prompt category options, tag resolution, and rerank shortlists. Settings are separate (not taxonomy).

2. **Which Firestore queries load it?** In `loadAiCatalogReferenceSnapshot.ts` / `loadFirestoreFallback`:
   - `categories.where("isActive","==",true).get()`
   - `tags.where("status","==","approved").get()`
   Parallel via `Promise.all`.

3. **Which cache layer owns categories/tags?** **Two nested layers:**
   - Outer: `aiEnrichmentRuntimeCache.ts` — separate `categoriesCache` + `tagsCache`, `CACHE_TTL_MS = 60_000`.
   - Inner: `loadAiCatalogReferenceSnapshot.ts` — `fallbackCache`, `FALLBACK_TTL_MS = 5 * 60_000`, plus `fallbackLoad` in-flight Promise.

4. **Effective TTLs?** Outer 60s (what live miss timestamps matched). Inner 5 minutes. Settings also outer 60s (unchanged by P3 product goal; keep unless review requires otherwise).

5. **More than one nested cache?** Yes — dual layer as above.

6. **Does a cache hit at one layer still trigger Firestore at another?** Outer hit → no loader call. Outer miss → calls `loadAiCatalogReferenceSnapshot`; if inner hit → **no Firestore**. Outer miss + inner miss → full C+T queries. **Current metrics log outer miss as `reference_query.completed` with document counts even on inner hit**, which inflated the “3 × 1,140” estimate.

7. **In-flight Promise deduplication?** Present on **inner** (`fallbackLoad`). **Absent** on outer (only `activeMisses` overlap logging). Parallel outer misses still coalesce at inner.

8. **When does in-flight clear?** Inner: `finally { fallbackLoad = null }` after await. Explicit `clearAiCatalogReferenceSnapshotCache` / `clearAiEnrichmentRuntimeCache` null both. Settings update callable clears all runtime caches.

9. **Can parallel jobs on one warm instance share one cold load?** Yes via inner `fallbackLoad`. Outer does not dedupe independently.

10. **Why 3 taxonomy “loads” on one instance?** Outer 60s TTL expiry; miss times ≈16:55:15, 16:56:20, 16:57:21. One warm instance. Likely **1 real Firestore load** if inner 5min held for all three outer cycles; attributed as 3 because metrics instrument the outer layer.

11. **Batch longer than a TTL?** Window ~7.5 min > outer 60s (yes, multiple outer misses). Window also > inner 5 min in the tail — longer batches will force real multi-loads today.

12. **Different cache keys / explicit invalidation?** Single process caches; no key variants. `clearAiEnrichmentRuntimeCache` on settings write can force reload (rare mid-batch).

13. **Cleared after each AI job?** No.

14. **Full objects or necessary fields?** Lean fields only (see Q1). Tags remapped through `aiSnapshotTagsToCatalogTags` (adds null audit placeholders).

15. **Other Functions using the same loader?** Via runtime cache / playground:
    - `enqueueAiEnrichment` → pipeline
    - `testAiEnrichmentPlayground` / `testAiEnrichmentTagRerank` → playground
    - `updateAiEnrichmentSettings` → clears cache (must stay coherent)
    No P4 catalog-snapshot Functions import this loader.

16. **Correctness impact of longer TTL?** Warm instance may use taxonomy that is up to TTL old after staff add/archive/rename. Cold instance always loads fresh. Acceptable for AI enrichment during a batch; staff can wait for instance recycle / TTL / settings-clear. Document explicitly.

---

## Scope

### In Scope

- Unify process-local AI taxonomy caching so categories + tags share **one** bounded cache entry and **one** Firestore load path.
- Retain/strengthen Promise in-flight deduplication at the unified taxonomy load boundary.
- Set a **finite, documented** process-local TTL covering a warm ~45-design batch with margin (**proposed: 15 minutes / `900_000` ms**).
- Sanitized metrics distinguishing: `taxonomy-cache-hit`, `taxonomy-cache-miss`, `taxonomy-cache-join-inflight`, `taxonomy-cache-expired`, `taxonomy-load-success`, `taxonomy-load-failure` (plus existing opaque `runtimeInstanceId` / counts / age / TTL / elapsed ms as available).
- Failure-safe behavior: failed loads do not persist broken taxonomy; retry can reload; partial builds never published to callers.
- Discriminating unit tests (see Test Strategy).
- Docs: plan/review/test/impl-review; P3 **dev deploy checkpoint** (allowlist from import tracing — **do not deploy overnight**).
- Update workflow state + ChatGPT handoff current-state notes after Implement/Test.

### Out of Scope

- Storage taxonomy cache; Firestore “taxonomy snapshot” document; new collection/denormalized taxonomy read model
- Cross-instance coordination / Redis / Memorystore
- New batch-enqueue API
- Provider / prompt / model behavior changes
- P4 rate-guard / catalog publication code
- P1 Studio import/approval read containment (separate workstream)
- Stage 1b / Algolia / Typesense
- Firebase deploy, Rules, indexes, migrations, production, PR merge
- New npm dependencies
- Changing settings-cache product behavior beyond keeping clear/settings paths coherent

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` — primary TTL / in-flight / metrics / single snapshot cache
- `functions/src/ai/aiEnrichmentRuntimeCache.ts` — stop dual 60s category/tag rematerialization that re-enters loader independently; share one taxonomy fetch; keep settings cache separate
- New focused tests: e.g. `functions/src/ai/aiTaxonomyCache.test.ts` (and/or extend existing AI cache tests)
- Existing AI enrichment tests (regression; behavior unchanged)
- Workflow docs under `docs/workflow/plans|reviews/`
- `[NEEDS REPO CHECK]` during implement: any other direct `loadAiCatalogReferenceSnapshot` callers

### Architecture Impact

- [x] Details: Process-local optimization only. Firestore remains canonical. No new persistent read model. Instances remain independent (document in code comments + deploy checkpoint).

### Security Impact

- [x] Details: No permission changes. Metrics must not log category/tag names, aliases, preferredWhen, design content, or prompts.

### Data Model Impact

- [x] None (no schema/collection changes)

### Backend Impact

- [x] Details: Same callables; runtime cache TTL/behavior change inside Functions AI modules. Deploy required later for live proof (owner morning checkpoint only).

### UI / UX Impact

- [x] None (server-only)

### Migration Impact

- [x] None

---

## Approach

1. **Keep Firestore queries** exactly as today (active categories + approved tags filters; same field projection semantics).
2. **Single taxonomy cache** in `loadAiCatalogReferenceSnapshot` (or a thin shared helper used only by AI enrichment):
   - One `cachedSnapshot + expiresAtMs`
   - One `inFlight: Promise | null`
   - TTL = **`AI_TAXONOMY_CACHE_TTL_MS = 15 * 60_000`** (finite; documented)
   - On access: hit → metric hit; expired → metric expired then miss path; miss with in-flight → join + metric join; miss cold → load Firestore once
   - Success → store complete snapshot only; failure → do not write cache; clear in-flight in `finally`
3. **Outer runtime cache** (`loadCachedActiveCategories` / `loadCachedApprovedTags`):
   - Both call the **same** `loadAiCatalogReferenceSnapshot()` (already true) but **must not** maintain a shorter independent TTL that forces misleading rematerialization every 60s **or** must derive both from one shared outer entry with TTL ≥ taxonomy TTL / aligned to taxonomy layer
   - Preferred: **remove separate category/tag TTLs**; treat snapshot loader as the sole taxonomy TTL authority; outer functions become thin adapters + settings-only cache remains at existing settings TTL
4. **Metrics**: emit the required taxonomy-* events via existing `logPipelineEvent` / pipeline log patterns; sanitize payloads (counts, ages, TTL, instance id — never names/content).
5. **Clear APIs**: `clearAiCatalogReferenceSnapshotCache` / `clearAiEnrichmentRuntimeCache` remain for tests + settings update; clearing must drop in-flight safely (do not leave dangling resolved poison).
6. **Do not** change enrichment prompts, providers, archive filters, or P4 modules.
7. **Deploy allowlist** (verify by import graph at implement time; expected):
   - `enqueueAiEnrichment`
   - `testAiEnrichmentPlayground`
   - `testAiEnrichmentTagRerank`
   - `updateAiEnrichmentSettings` (clears cache; ships with cache module)
   - Confirm no P4 snapshot Function imports these modules before writing the checkpoint command.

### TTL selection rationale

| Option | Pros | Cons |
|--------|------|------|
| Keep 60s outer | Matches today | Causes repeated outer misses; poor batch coverage |
| Keep 5min inner only | Already present | Still reloads on >5min warm batches; dual-layer confusion |
| **15 min unified** | Covers measured ~7.5min 45-job window with margin; finite; owner-preauthorized class | Staff taxonomy edits stale up to 15m on warm instance |
| 30–60 min | Fewer reloads | Larger staleness; unnecessary for stated target |

**Chosen: 15 minutes.** Cold starts still fresh. Expiry always re-reads Firestore. Not globally authoritative.

---

## Target behavior

| Scenario | Expected |
|----------|----------|
| 45 sequential AI jobs, one warm instance, batch &lt; 15m | ≈ **1** Firestore taxonomy load; rest hits |
| Parallel cold misses | **1** loader call; others `join-inflight` |
| TTL expiry | Exactly one refresh; parallel joiners share it |
| Loader failure | No cached partial; retry can succeed |
| Multiple CF instances | Each may cold-load once (no cross-instance guarantee) |

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| New taxonomy cache unit tests | `npm test` (functions focused file) | yes |
| Existing AI enrichment tests | functions AI test suite / focused | yes |
| Functions build | `npm run build` (functions) | yes |
| Repo lint | root lint script | yes |
| Whitespace | `git diff --check` | yes |

### Discriminating tests (minimum)

1. First request = miss → loader once  
2. Second within TTL = hit → loader not called  
3. Many sequential within TTL = loader once  
4. Parallel cold = one loader + joins  
5. TTL expiry = one fresh loader  
6. Parallel immediately after expiry = one refresh + joins  
7. Loader failure does not persist broken data  
8. Retry after failure can reload  
9. Never returns partially-built taxonomy  
10. Metrics distinguish hit / miss / join  
11. AI enrichment output behavior unchanged (existing tests)  
12. Archive/filter semantics unchanged (approved tags / active categories queries unchanged)  
13–15. Source/static asserts: no new listener, no polling, no per-design taxonomy query  

### Manual

- [ ] Deferred to morning owner checkpoint after scoped Functions deploy (not overnight)

---

## Human Checkpoints Anticipated

- [x] Other: **Dev Functions deploy** after Implement+Test — owner morning only (`APPROVE` phrase); prepare command, do not run
- [ ] Production deploy — forbidden
- [ ] Manual UI — N/A overnight

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale taxonomy up to 15m on warm instance | Medium | Documented; cold start fresh; clear on settings update; finite TTL |
| Metrics still over-count if wired to wrong layer | Medium | Instrument the Firestore load boundary explicitly |
| Accidental second loader bypass | High | Grep callers; tests; impl review checklist |
| Poison cache on failure | High | Only cache complete success; clear in-flight on failure |
| Scope creep into P1/P4 | High | Separate commits; forbid touching those paths |

---

## Rollback Plan

Revert the P3 commit. Redeploy previous Function allowlist if already deployed (owner). No data migration.

---

## Documentation Updates Required

- [ ] Other: P3 plan/review/test/impl-review/deploy-checkpoint; handoff CURRENT-STATE + recent-completed-work after push
- [ ] DECISIONS.md — optional brief note that process-local 15m AI taxonomy TTL is intentional (if review requests)

---

## Open Questions

- [x] None blocking — owner overnight prompt pre-authorizes process-local TTL extension under listed constraints; Formal Review must confirm 15m staleness acceptable (expected approve).

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-07-amendment-9-p3-server-ai-taxonomy-read-containment-review.md`
- Verdict: pending
