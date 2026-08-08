# Implementation Review: Amendment 9 P3 — Server AI taxonomy read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Independent Implementation Review (adversarial, evidence-based) |
| Plan | `docs/workflow/plans/2026-08-07-amendment-9-p3-server-ai-taxonomy-read-containment-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-07-amendment-9-p3-server-ai-taxonomy-read-containment-review.md` (`approved_with_changes`) |
| Test report | `docs/workflow/reviews/2026-08-07-amendment-9-p3-server-ai-taxonomy-read-containment-test-report.md` (`passed`) |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Inspected | Working-tree diff + source for scoped P3 files (not commit hash — changes uncommitted at review) |
| Verdict | **APPROVED** |

---

## Diff inspected

```
git diff -- functions/src/ai/loadAiCatalogReferenceSnapshot.ts \
  functions/src/ai/aiEnrichmentRuntimeCache.ts \
  functions/src/ai/aiTaxonomyCache.test.ts \
  functions/src/catalogSnapshots/waveCReadContainment.test.ts
```

| Path | Status in working tree |
|------|------------------------|
| `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` | modified |
| `functions/src/ai/aiEnrichmentRuntimeCache.ts` | modified |
| `functions/src/catalogSnapshots/waveCReadContainment.test.ts` | modified (static asserts only) |
| `functions/src/ai/aiTaxonomyCache.test.ts` | new (untracked) |

No other `functions/src/` application modules appear in the P3 source diff. P4 publishers, Portal app code, and P1 Studio paths are untouched in this change set.

---

## Verification checklist (must all pass for APPROVED)

| # | Requirement | Verdict | Evidence |
|---|-------------|---------|----------|
| 1 | TTL behavior is real (15 min), not test-only | **Pass** | `AI_TAXONOMY_CACHE_TTL_MS = 15 * 60_000` exported and used by production `createDefaultDeps().ttlMs`. Cache publish sets `expiresAtMs = deps.now() + deps.ttlMs`. Hit path requires `expiresAtMs > now`. |
| 2 | In-flight dedupe is real | **Pass** | `taxonomyInFlight` + `taxonomyInFlightGeneration === cacheGeneration` join path; miss path assigns one Promise before return. No await before `taxonomyInFlight` assignment (single-threaded safe). Parallel cold covered by unit test. |
| 3 | Failed Promises cannot permanently poison cache | **Pass** | `cacheEntry` assigned only after successful `loadFromFirestore` and only when generation matches. Failure logs `taxonomy-load-failure`, rethrows, clears matching in-flight in `finally`. Retry test proves second load can succeed and then hit. |
| 4 | Cache cannot remain forever stale (finite TTL) | **Pass** | Finite 15m TTL; expired entry nulled with `taxonomy-cache-expired` then miss/refresh. No infinite TTL / no listener-held authority. |
| 5 | Clear-during-inflight cannot republish (generation) | **Pass** | `clearAiCatalogReferenceSnapshotCache` bumps `cacheGeneration`, nulls entry + in-flight. Publish gated by `loadGeneration === cacheGeneration`. Discriminating test resolves stale after clear and asserts live hit is fresh generation. |
| 6 | Every relevant AI taxonomy caller uses intended cache | **Pass** | Production importers of `loadAiCatalogReferenceSnapshot`: only `aiEnrichmentRuntimeCache.ts`. Pipeline + playground call thin `loadCachedActiveCategories` / `loadCachedApprovedTags` adapters (no independent TTL). Settings clear goes through `clearAiEnrichmentRuntimeCache` → snapshot clear. No second loader bypass. |
| 7 | Metrics sanitized; Firestore metrics at real load boundary | **Pass** | Taxonomy events: `taxonomy-cache-hit\|miss\|join-inflight\|expired`, `taxonomy-load-success\|failure`. Payloads: counts, ages, TTL, elapsed ms, opaque ids, `publishedToCache`, error `name` — **no** category/tag names, aliases, `preferredWhen`, prompts, or design content. Outer adapters no longer emit `reference_query.completed` for categories/tags (settings-only `reference_*` retained — allowed by Formal Review). Load success/failure emitted only around `loadFromFirestore`. |
| 8 | Multiple Function instances correctly described as independent | **Pass** | Module comments on TTL constant and loader export state process-local / non-global / cold start fresh. No cross-instance coordination introduced. |
| 9 | No new persistent taxonomy architecture | **Pass** | Process-local module state only. Same Firestore queries. No Storage taxonomy cache, no new collection, no Redis/Memorystore, no `onSnapshot`/polling. Shared types import is shape-only (pre-existing pattern). |
| 10 | Existing AI behavior unchanged (queries/filters same) | **Pass** | `categories.where("isActive","==",true)` and `tags.where("status","==","approved")` unchanged; same field acceptance / lean projection; `aiSnapshotTagsToCatalogTags` remap retained. Pipeline still loads categories then tags via adapters. |
| 11 | Formal Review required changes 1–6 applied | **Pass** | See section below. |
| 12 | No P4/P1/Portal unrelated source in diff | **Pass** | Scoped diff is AI cache modules + P3 unit tests + `waveCReadContainment` static string updates for the AI taxonomy wiring test only. |
| 13 | Deploy allowlist import graph | **Pass** | See deploy allowlist section. |

---

## Formal Review required changes (1–6)

| # | Required change | Applied? | Evidence |
|---|-----------------|----------|----------|
| 1 | Sole taxonomy TTL authority; remove dual shorter outer category/tag TTLs; adapters thin | **Yes** | `categoriesCache` / `tagsCache` / outer taxonomy `traceCacheMiss` removed. Settings keep `SETTINGS_CACHE_TTL_MS = 60_000` only. Adapters call `loadAiCatalogReferenceSnapshot(context)` and map fields. |
| 2 | Clear-during-inflight must not repopulate; generation/epoch + test | **Yes** | `cacheGeneration` + publish gate; clear bumps generation; unit test `clear during in-flight load does not republish into the live cache`. |
| 3 | Firestore load metrics only at real load boundary; sanitize | **Yes** | Taxonomy `taxonomy-load-*` at loader; adapters do not log taxonomy as `reference_query.completed`. Sanitized payloads verified in source. |
| 4 | Queries/filter semantics unchanged | **Yes** | Identical where clauses and acceptance rules in `defaultLoadFromFirestore`. |
| 5 | `AI_TAXONOMY_CACHE_TTL_MS = 15 * 60_000` named + commented | **Yes** | Named export with process-local / non-authoritative / finite commentary. |
| 6 | Deploy allowlist re-verified; do not deploy | **Yes** | Graph below matches expected four callables; no P4 publishers. This review does not authorize deploy. |

---

## Deploy allowlist (import graph)

| Export | Import path to taxonomy cache | Include? |
|--------|-------------------------------|----------|
| `enqueueAiEnrichment` | → `runAiEnrichmentPipeline` → `loadCachedActiveCategories` / `loadCachedApprovedTags` → `loadAiCatalogReferenceSnapshot` | **Yes** |
| `testAiEnrichmentPlayground` | → `runAiEnrichmentPlayground` → same adapters | **Yes** |
| `testAiEnrichmentTagRerank` | → `runAiEnrichmentTagRerankPlayground` → same adapters | **Yes** |
| `updateAiEnrichmentSettings` | → `clearAiEnrichmentRuntimeCache` → `clearAiCatalogReferenceSnapshotCache` | **Yes** (coherence) |
| P4 `catalogSnapshots/*` publishers | No runtime import of loader/runtime cache (only `waveCReadContainment.test.ts` static file read) | **No** |

Morning owner checkpoint may deploy **only** the four Yes rows after human `APPROVE`. **No Firebase deploy in this review.**

---

## Adversarial notes (non-blocking)

1. **Stale in-flight callers still receive loaded data** after clear (returned from the Promise) but do **not** publish into the live cache. Matches Formal Review wording (“cannot republish into the live cache”); does not abort an already-started enrichment job mid-flight.
2. **`__setAiTaxonomyCacheTestDeps` / `__resetAiTaxonomyCacheForTests`** are exported `@internal` hooks. Acceptable for discriminating tests; not production call paths.
3. **Settings** retain independent 60s cache + `reference_*` metrics (explicitly allowed). Do not treat settings `reference_query.completed` as taxonomy Firestore evidence.
4. **Test report** records focused tests + functions build exit 0; lint/whitespace rows are marked recorded but not pasted in the report body. That is a report completeness nit, not an implementation defect — does not change this verdict.

---

## Required changes

None.

---

## Blockers

None.

---

## Verdict rationale

Source implements the Formal Review’s preferred architecture: one process-local taxonomy TTL/in-flight boundary at `loadAiCatalogReferenceSnapshot`, thin outer adapters, real 15-minute TTL, failure-safe non-poison, generation-guarded clear, sanitized taxonomy-* metrics at the Firestore load boundary, unchanged queries, and a clean four-callable deploy allowlist with no P4/P1/Portal product creep. Discriminating unit tests cover hit/miss/join/expiry/failure/clear-during-inflight/adapter sharing. **APPROVED** for commit and subsequent Signoff gating; live warm-batch proof remains the owner morning deploy checkpoint (out of this review’s authority).
