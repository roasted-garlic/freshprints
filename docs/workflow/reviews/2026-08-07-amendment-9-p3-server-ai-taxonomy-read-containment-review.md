# Review: Amendment 9 P3 — Server AI taxonomy read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Plan | `docs/workflow/plans/2026-08-07-amendment-9-p3-server-ai-taxonomy-read-containment-plan.md` |
| Reviewer posture | Independent Formal Review (adversarial, evidence-based) |
| Branch | `fix/post-launch-catalog-and-processing-stability` (`ab57dc5` at review) |
| Verdict | **approved_with_changes** |

---

## Summary

Plan diagnosis matches current HEAD: nested outer 60s + inner 5min caches, outer miss metrics that over-count Firestore, inner in-flight dedupe only, and dual category/tag outer entries that re-enter the same loader. Process-local 15-minute unified TTL is within owner pre-authorization and is acceptable for staff taxonomy staleness during AI batches. Implement may proceed only if the required changes below are applied during Implement (or the plan is patched first).

---

## Verdict

**approved_with_changes**

Implement may proceed **only if** all Required Changes are applied in the same Implement pass (or the plan is patched to encode them before code lands). Not **approved** as written because Approach §3 still permits a weaker dual-TTL alternative, and clear-during-inflight write-after-clear is acknowledged without a concrete fail-safe mechanism. Not **blocked**: no new infra, no product fork, no security rule change, no P4/P1/Stage1b creep required.

---

## Challenge checklist (plan investigation vs source)

Verified against:

- `functions/src/ai/loadAiCatalogReferenceSnapshot.ts`
- `functions/src/ai/aiEnrichmentRuntimeCache.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts` (taxonomy load call sites)
- Spot-check: `aiEnrichmentPlayground.ts`, `enqueueAiEnrichment.ts`, `updateAiEnrichmentSettings.ts`
- Repo-wide grep for `loadAiCatalogReferenceSnapshot` / runtime cache consumers

| # | Plan claim | Verdict | Evidence |
|---|------------|---------|----------|
| 1 | AI needs active categories + approved tags (lean fields); settings separate | **Confirmed** | Loader projects `id/name/description?` and `id/name/aliases/preferredWhen` + forced `status: "approved"`. Settings via separate `loadCachedAiEnrichmentSettings`. |
| 2 | Firestore queries: `categories.isActive==true`, `tags.status==approved`, `Promise.all` | **Confirmed** | `loadAiCatalogReferenceSnapshot.ts` L16–19. |
| 3 | Two nested cache layers (outer 60s categories/tags; inner 5min snapshot) | **Confirmed** | Outer `CACHE_TTL_MS = 60_000` + separate `categoriesCache`/`tagsCache`; inner `FALLBACK_TTL_MS = 5 * 60_000` + `fallbackCache`. |
| 4 | Effective TTLs: outer 60s, inner 5min; settings outer 60s | **Confirmed** | Same constants; settings uses same outer `CACHE_TTL_MS`. |
| 5 | Outer hit → no loader; outer miss + inner hit → **no Firestore**; metrics still log outer `reference_query.completed` | **Confirmed** | Outer miss path always calls `loadAiCatalogReferenceSnapshot()` inside `traceCacheMiss`, which logs `reference_query.completed` with counts even when inner returns cached value (L12–13 short-circuit before queries). |
| 6 | In-flight Promise on **inner** only; outer has `activeMisses` overlap logging only | **Confirmed** | Inner `fallbackLoad`; outer increments `activeMisses` but does not coalesce loaders. |
| 7 | Inner clears `fallbackLoad` in `finally`; clear APIs null both | **Confirmed** | Loader L63–67, L87–90; runtime clear L93–98 also clears snapshot cache. |
| 8 | Parallel warm cold-misses share one Firestore load via inner | **Confirmed** | Second caller joins `fallbackLoad`. Playground `Promise.all` categories+tags exercises this. |
| 9 | “3 loads” ≈ outer 60s expiry; may be 1 real Firestore if inner 5min held | **Plausible / accepted** | Architecture supports over-count; live timestamps not re-verified in this review. Nested defect stands regardless. |
| 10 | Batch ~≥7.5min can exceed inner 5min → real multi-loads today | **Accepted** | Follows from TTLs; motivates 15m unified window. |
| 11 | Not cleared after each AI job | **Confirmed** | Pipeline loads caches; no per-job clear. |
| 12 | Lean remap via `aiSnapshotTagsToCatalogTags` | **Confirmed** | Adds null audit placeholders / synthetic createdBy. |
| 13 | Callers: enqueue→pipeline, playground (+ tag rerank), settings clear | **Confirmed** | Pipeline L264–265; playground parallel loads; `enqueueAiEnrichment` → `runAiEnrichmentPipeline`; settings L206 `clearAiEnrichmentRuntimeCache()`. |
| 14 | No P4 catalog-snapshot Function imports this loader | **Confirmed** | Runtime import of `loadAiCatalogReferenceSnapshot` is only `aiEnrichmentRuntimeCache.ts` (+ static read in `waveCReadContainment.test.ts`). **Closes plan `[NEEDS REPO CHECK]` for current HEAD.** |
| 15 | Failed loads do not persist broken taxonomy today | **Mostly confirmed** | Cache assigned only after full snapshot build. **Gap:** `clearAiCatalogReferenceSnapshotCache` / `clearAiEnrichmentRuntimeCache` null `fallbackLoad` while an in-flight load can still complete and **write `fallbackCache` after clear** (write-after-clear). Plan Approach §5 names the hazard; does not specify the fix. |

### Hard constraints (owner)

| Constraint | Plan compliance |
|------------|-----------------|
| Firestore remains authoritative | Pass — process-local only; expiry re-reads Firestore |
| No Storage/Firestore taxonomy snapshot doc; no new collection; no Redis; no new batch API; no new dependency | Pass — explicitly out of scope |
| Cache failure fails safe (re-read), no poison | Pass as intent; **Required Change** for clear-during-inflight |
| In-flight Promise dedupe required | Pass — retain/strengthen at unified boundary |
| Finite max TTL; cold instance fresh | Pass — 15m finite; cold start uncached |
| No P4/P1/Stage1b scope | Pass — out of scope; deploy allowlist excludes P4 pubs |
| No Firebase deploy this phase | Pass — morning checkpoint only |
| Metrics sanitized (no taxonomy names/content) | Pass as requirement; must enforce in Implement |
| Do not weaken AI processing correctness | Pass if queries/filters unchanged (required) |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | P3-only; out-of-scope list complete |
| Architecture alignment | pass | Process-local optimization; Firestore canonical |
| Security impact addressed | pass | No auth/rules; sanitize metrics (enforce in impl) |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Same callables; TTL/cache behavior only |
| Test strategy adequate | pass with changes | Add clear-during-inflight / write-after-clear case |
| Human checkpoints identified | pass | Dev deploy morning-only; no prod |
| Roadmap alignment | pass | Amendment 9 P3; secondary to completed P4 |
| Documentation plan | pass | Plan/review/test/impl-review/checkpoint |
| No silent scope expansion | pass | Explicit forbids |

---

## Required changes

Implement (or plan patch) **must** satisfy all of the following:

1. **Sole taxonomy TTL authority (no dual shorter outer TTL)**  
   Approach §3’s “or derive both from one shared outer entry…” alternative is **rejected**. Implement the **preferred** path only: remove independent `categoriesCache` / `tagsCache` TTLs for taxonomy; `loadAiCatalogReferenceSnapshot` (or one thin helper used only by AI enrichment) is the **only** taxonomy TTL + in-flight boundary. Outer `loadCachedActiveCategories` / `loadCachedApprovedTags` become thin adapters over that snapshot. Settings cache may remain separate at existing TTL.

2. **Clear-during-inflight must not repopulate cache**  
   `clearAiCatalogReferenceSnapshotCache` / `clearAiEnrichmentRuntimeCache` must invalidate such that an in-flight load that started before clear **cannot** publish its result into the live cache after clear (generation/epoch token, or equivalent). Do not leave “dangling resolved poison.” Add a discriminating unit test for this race.

3. **Firestore load metrics only at the real load boundary**  
   New `taxonomy-cache-*` / `taxonomy-load-*` events must be emitted where Firestore is actually queried (or definitively not queried). Do **not** continue to treat outer adapter rematerialization as `reference_query.completed` Firestore evidence for categories/tags. Sanitized payloads only: counts, ages, TTL, elapsed ms, opaque `runtimeInstanceId` / invocation ids — **never** category/tag names, aliases, `preferredWhen`, design content, or prompts. `designId` as opaque id remains acceptable if already used by existing diagnostics.

4. **Queries and filter semantics unchanged**  
   Keep `categories.where("isActive","==",true)` and `tags.where("status","==","approved")` with the same field acceptance rules. No archive/filter weakening.

5. **TTL constant**  
   `AI_TAXONOMY_CACHE_TTL_MS = 15 * 60_000` (or identical literal), named and commented as process-local, non-authoritative, finite.

6. **Deploy allowlist verification at Implement**  
   Re-confirm import graph before writing the morning deploy checkpoint command. Expected (current HEAD): `enqueueAiEnrichment`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`, `updateAiEnrichmentSettings`. Do not include P4 snapshot publishers. **Do not deploy in this phase.**

---

## Risks accepted

| Risk | Acceptance |
|------|------------|
| Warm-instance taxonomy up to **15 minutes** stale after staff add/archive/rename | **Accepted** — see explicit TTL statement below |
| No cross-instance cache; N instances ⇒ up to N cold loads | Accepted — documented target behavior |
| Settings clear is the only proactive invalidation; taxonomy doc writes do not clear cache | Accepted — finite TTL + cold start |
| Live “3 miss cycles = 1 Firestore load” is reconstructed, not re-measured here | Accepted — plan still fixes the proven nested defect |
| Temporary dual metrics during transition if old `reference_*` events remain for settings | Accepted if taxonomy Firestore counting is unambiguous |

---

## Deploy allowlist sanity check

| Export | Imports taxonomy path? | Include in P3 allowlist? |
|--------|------------------------|--------------------------|
| `enqueueAiEnrichment` | Yes → `runAiEnrichmentPipeline` → runtime cache → loader | **Yes** |
| `testAiEnrichmentPlayground` | Yes → playground → runtime cache | **Yes** |
| `testAiEnrichmentTagRerank` | Yes → playground rerank → runtime cache | **Yes** |
| `updateAiEnrichmentSettings` | Yes → `clearAiEnrichmentRuntimeCache` | **Yes** (coherence) |
| P4 catalog snapshot Functions | No import of this loader (grep) | **No** |

Allowlist in plan is sane for current HEAD. Re-verify at Implement before checkpoint text is finalized. **No Firebase deploy in P3 Implement/Test.**

---

## Explicit statement: 15-minute TTL staleness

**Formal Review finds 15-minute process-local TTL staleness acceptable** for staff taxonomy edits during AI enrichment batches on a warm Cloud Functions instance, under these conditions:

- Firestore remains the only authoritative source; expiry and cold start always re-read Firestore.
- Staleness is bounded and finite (15 minutes max on a warm instance).
- Failed loads do not poison the cache; clear-during-inflight cannot republish (Required Change #2).
- Staff can force reload via settings-update clear, instance recycle, or waiting for TTL.
- AI prompt/provider/archive filter behavior is otherwise unchanged.

This matches owner overnight pre-authorization for process-local TTL extension. It does **not** authorize persistent snapshots, cross-instance caches, or longer TTLs (30–60m) without a new review.

---

## Architecture / Security / Testing notes

**Architecture:** Unifying to one process-local snapshot cache is the correct fix for nested rematerialization. Do not introduce a second authoritative store.

**Security:** No permission or Rules changes. Metric sanitization is mandatory (Required Change #3). Existing `logPipelineEvent` spreads arbitrary context — Implement must not pass taxonomy content fields into new events.

**Testing:** Plan’s discriminating tests 1–15 are adequate baseline. **Add:** clear-during-inflight / write-after-clear; assert failure leaves no served cache entry; assert loader called once across sequential jobs within TTL. Preserve existing AI enrichment regression coverage. Keep `waveCReadContainment.test.ts` static expectations coherent if strings/imports move.

**Documentation:** Optional `DECISIONS.md` note on intentional 15m process-local AI taxonomy TTL is recommended but not required for Implement start.

---

## Blockers

None.

---

## Verdict rationale

The plan correctly identifies a real nested-cache defect against current source, stays inside owner hard constraints, proposes a finite process-local TTL with in-flight dedupe and fail-safe intent, and keeps deploy/P4/P1/Stage1b out of scope. Conditional approval exists because (a) the dual-TTL “or” path must be forbidden, (b) clear-during-inflight needs a concrete non-poison mechanism + test, and (c) metrics must count real Firestore loads only. With those applied, Implement may proceed.

---

## Next step

Implement approved scope **with Required Changes 1–6 applied in the same pass**. Then Test → Implementation Review → prepare (do not run) morning dev Functions deploy checkpoint.
