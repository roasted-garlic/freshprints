# Review: Phase 9 results/routing remediation + Portal Discover catalog correctness

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-12-phase-9-custom-request-results-and-routing-remediation-plan.md` |
| Predecessor FAIL | `docs/workflow/reviews/2026-07-14-phase-9-custom-request-results-ux-qa-fail-checkpoint.md` |
| Starting branch / SHA | `production` / `76205da8eeab43c545112f7399522e6b4106a03e` |
| Verdict | **approved_with_changes** |

---

## Summary

Combined plan correctly retains Phase 9 product direction and Jul 14 binding review constraints, and adds a bounded Discover workstream with **source-proven** root causes for category-rail underfill and Recently Requested count/`hasMore` inflation. Implementation may proceed only after owner approval **and** the Phase 9 source-recovery/remount gate for Workstream A. Workstream B is implementable on the starting SHA once required changes below are followed.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Two workstreams; hard out-of-scope list |
| Architecture alignment | pass | Reuse category list + cache; no new upload pipeline; no Algolia-for-Home |
| Security impact addressed | pass | No rule broaden planned; ready-only preserved |
| Data model impact addressed | pass | A: optional closure fields; B: indexes possible, no schema rewrite |
| Backend impact addressed | pass | A: callables; B: client queries/indexes |
| Test strategy adequate | pass | Focused catalog tests + Phase 9 when source restored |
| Human checkpoints identified | pass | Source gate, DEV deploy, indexes, manual QA, no prod |
| Roadmap alignment | pass | Portal remediation cycle; Studio release parked |
| Documentation plan | pass | ADR/DATA_MODEL/ROADMAP for A; cost matrix for B |
| No silent scope expansion | pass | Explicit Discover add; pool-size-only fix forbidden |

---

## Strengths

- Discovers Goal A/B diagnoses proven against current `catalogService` / ranking / reconcile code — not assumed.
- Firestore add-cost bound documented (≤3 queries / ≤78 docs).
- Correct rejection of presentation-only Load more hacks and pool-size-only rail fixes.
- Mode audit table preserves New This Week / Popular; flags Most Liked + Recently Requested.
- Phase 9 out-of-scope (Gemini/credits/payments/proofs) preserved.
- Studio 1.0.4 release work explicitly parked — no silent goal collision.

---

## Required changes (binding for implement)

### From Jul 14 Formal Review (still binding for Workstream A)

1. Etsy `not_found` recompute with distinct transition reason; preserve `transitionHistory`.
2. Satisfied allow-list = OPEN (including `reviewing`) + `etsy_referred` only.
3. History = drawer/sheet first.
4. `etsy_referred` still shows purchase/upload/satisfied CTAs.
5. Do not break reference uploads.
6. Pricing copy = shared constant, not Firestore.

### New for this combined revision

7. **Phase 9 source gate** — Before any Workstream A application code: recover `custom-requests` + callables/shared utils from the originating checkout/branch, **or** obtain owner remount decision onto `etsy-recommendations` + `assisted-creation`. Do not invent a parallel stack on this SHA.
8. **Discover Goal A** — Hydrate selected category rails via existing bounded category list (`listReadyDesignsPageWithSortFallback` / page cache). Do **not** “fix” by only increasing `HOME_DISCOVERY_POOL_PAGE_SIZE`. Preserve max rails / min designs / popularity selection.
9. **Discover Goal B** — Align list + `countReadyDesigns` + badge + `reconcilePagingWithAggregateCount` membership for Recently Requested and Most Liked with shared eligibility (`lastAddedToShowAt` present; `favoriteCount > 0`). Do not use presentation-only hasMore.
10. **Indexes** — Before claiming Goal B fixed in DEV, verify/add composites in `firestore.indexes.json` as needed; deploy indexes only after human OK; never during Plan/Review.
11. **Algolia** — No Discover Home Algolia dependency for this fix.
12. **Parked Studio 1.0.4** — Do not mutate release drafts, publish, or Mac smoke workflow under this goal.

---

## Proven findings (Formal Review record)

### Category-rail root cause

`selectTopPopularCategoryRails` builds rails exclusively from Home pool designs (`listHomeDiscoveryPool`, page size 80). Selected categories can show fewer cards than true ready membership / View All.

### Proposed hydration

Select categories with existing pool popularity semantics → for each selected id (≤3) fetch bounded category page (limit 25) → replace rail designs → reuse `catalogPageCache` in-flight dedupe.

### Max added Firestore reads (cold Discover)

| Metric | Bound |
|--------|-------|
| Additional queries | 3 |
| Additional design docs | 78 (3 × 26) |
| Rail aggregates | 0 required |

### Recently Requested count/hasMore root cause

List excludes missing `lastAddedToShowAt`; count does not; reconcile forces `hasMore` when aggregate ≫ loaded eligible set.

### Mode audits

| Mode | Result |
|------|--------|
| New This Week | Aligned (`readyAfterMs`) |
| Popular | Aligned (all ready / `requestCount`) |
| Most Liked | Count overstates; list may include `favoriteCount == 0` — correct to shared `> 0` |
| Recently Requested | Proven mismatch — correct to shared `lastAddedToShowAt` eligibility |

---

## Architecture Review

**Findings:** Hydration reuses catalog list/cache layers; recommendation/lifecycle stay shared/Functions for A. No circular deps introduced by plan.

**Required changes:** See #7–#9 above.

---

## Security Review

**Findings:** No public rule relaxation planned. Ready-only customer visibility preserved. Uploads for Etsy purchase remain existing ownership path.

**Required changes:** None beyond existing ownership on close/cancel.

**Human approval needed before production:** Yes — any Functions/index/App Hosting production deploy (later checkpoint).

---

## Data Model / Backend Review

**Findings:** A adds optional closure metadata; B likely needs index entries for metric eligibility. No migrations expected.

**Required changes:** Index matrix verification during implement (#10).

---

## Test Review

**Findings:** Existing portal catalog tests are the right base; new focused cases for rail hydration and metric count↔list agreement are required. Phase 9 tests restore with source.

**Required changes:** Do not claim pass without running commands.

---

## Blockers

- Owner approval of this Formal Review.
- Workstream A source-recovery/remount decision (blocks A coding only; B may start after owner APPROVE).

---

## Owner decision needed

Reply with one of:

- `APPROVE` — proceed to Implement under binding required changes
- `APPROVE WITH NOTES: …`
- `REVISE PLAN: …`

Also decide Workstream A gate:

- `RECOVER PHASE9 SOURCE: [branch/checkout]` **or**
- `REMOUNT PHASE9 ONTO ETSY+ASSISTED`

**Do not implement until owner approval.**
