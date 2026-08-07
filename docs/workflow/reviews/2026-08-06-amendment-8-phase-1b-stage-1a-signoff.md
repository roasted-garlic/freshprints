# Signoff: Amendment 8 Phase 1B Stage 1a (final)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Signoff by | Signoff Agent |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Phase | Amendment 8 Phase 1B — Stage 1a |
| Stage 1a implement | `b397ec0` |
| Amendment 1 | `c15a7be` (inactive categories) |
| Amendment 2 | `bc893f6` (archive persist + Portal focus refresh) |
| Amendment 3 (category availability) | `e97ab3b` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — **open / unmerged** |
| Plan (revalidation Stage 1a) | `docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-8-phase-1b-revalidation-plan.md` |
| Stage 1a impl review | `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-implementation-review.md` |
| Stage 1a test report | `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-test-report.md` |
| Amendment 3 signoff | `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-3-signoff.md` (**approved**) |
| Owner QA | Stage 1a checklist + Amendment 3 checklist — **PASS** |
| Final status | **approved** |

---

## Summary

Stage 1a is **complete and approved**. Portal known-ID hydration and customer categories are Firestore-primary/Firestore-only; customer-visible categories require `isActive` plus at least one Rules-ready design; Studio staff Category Management still shows active empty categories; the dead generated Discover entry point is removed; generated search / multi-tag / facets remain temporarily pending Stage 1b owner decision D1. No design snapshot is required in the intended steady state. No deployment, merge, cleanup, Function retirement, or production action occurred in this Signoff pass.

---

## Approved outcomes (required statements)

1. **Firestore-primary known-ID hydration is approved** — `getReadyDesignsByIds` uses per-document Firestore reads (cached + in-flight dedupe); no generated-card success path.
2. **Portal categories are Firestore-only** — `listActiveCategories` does not prefer generated taxonomy / catalog-reference snapshots.
3. **Portal customer categories require active status plus at least one ready design** — Amendment 1 mapper (`isActive === true`) plus Amendment 3 `countReadyDesigns({ categoryId }) > 0`.
4. **Empty active categories remain available to staff in Studio** — Category Management unchanged for staff empty actives.
5. **Dead generated Discover entry point was removed** — `listDiscoverDesigns` retired; Discover home uses Firestore pools.
6. **Generated search, multi-tag, and facet paths remain temporarily** — intentional Stage 1a boundary.
7. **Stage 1b remains blocked** on the managed-search versus product-simplification owner decision (**D1**).
8. **No design snapshot is needed in the intended steady state** — browse / by-id / categories are Firestore; snapshot publishers are not required for Stage 1a outcomes.
9. **No deployment, merge, cleanup, Function retirement, or production action occurred** during Stage 1a Signoff.

---

## Owner QA (recorded)

### Amendment 3 / category availability (2026-08-06) — **PASS**

Owner confirmed:

1. Active categories with zero ready designs are absent from the Portal dropdown.
2. Categories with ready designs remain visible.
3. “All categories” remains visible.
4. Active empty categories remain available in Studio Category Management.
5. Adding the first ready design causes the category to appear after refocus/refresh.
6. Removing the last ready design causes the category to disappear.
7. Library category filtering works.
8. Discover category behavior works.
9. Share-page category naming works.
10. Search, multi-tag filtering, and tag facets work.
11. No duplicate or missing ordinary ready designs were observed.

### Stage 1a overall checklist

Recorded **PASS** for Stage 1a scope after Amendments 1–3 (Firestore known-ID hydration, Firestore categories with ready-count filter, Discover FS rails, generated search/facets retained intentionally). Checklist: `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-manual-qa.md`.

---

## Remaining generated Portal consumers (post–Stage 1a)

| Consumer | Path | Status |
|----------|------|--------|
| Text search | `portalCatalogAssetService.listMatchingDesigns` / search shards | **Temporary** — Stage 1b |
| Multi-tag AND | same / `catalogNeedsFullClientHydrate` | **Temporary** — Stage 1b |
| Tag facets | `listApprovedTags` / `listTagFacets` | **Temporary** — Stage 1b |
| Narrowed tag facets | `listNarrowedTagFacets` / tag modal | **Temporary** — Stage 1b |
| Asset `getDesignsByIds` | retained for search-shard card resolution | **Temporary** until search cutover |

Not remaining as Stage 1a defects: known-ID hydration, customer categories, Discover home pool.

---

## Exact next owner decision for Stage 1b (D1)

Choose **one** before Stage 1b Implement:

- **Option A — Managed search:** pick provider (**Algolia** vs **Typesense**) and proceed with hybrid Firestore browse + managed search for text search, multi-tag AND, and tag facets; **or**
- **Option B — Product simplification:** explicitly list which search / multi-tag / facet behaviors may be removed or reduced so a Firestore-only path is acceptable.

Until D1 is answered, **do not begin Stage 1b**.

---

## Deferred / out of scope

- Stage 1b Implement
- PR #40 merge
- Function / publisher retirement
- Generated Storage object cleanup
- Production deploy
- Amendment 9 P4 snapshot-publication read amplification (separate production-promotion blocker)

---

## Verdict

**approved** — Stage 1a complete. Implementation (`b397ec0` + Amendments 1–3 through `e97ab3b`), focused tests, Amendment 3 Signoff, and owner QA **PASS** close this stage.

---

## Workflow Complete

- [x] Stage 1a marked complete and approved in workflow state
- [x] `CURRENT-STATE.md` / `13-recent-completed-work.md` updated
- [x] Amendment 3 owner QA recorded as **PASS**
- [x] Stage 1b not started
- [x] PR #40 remains open/unmerged
- [x] No deploy / cleanup / Function retirement / production action

**Recommended next action:** Await owner **D1** (managed search provider vs product simplification) before any Stage 1b work.
