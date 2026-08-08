# Implementation Review: Stage 1b-C initial Algolia facet count mismatch

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Implementation Review Agent (independent) |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-initial-facet-count-mismatch-plan.md` |
| Verdict | **APPROVED** |

---

## Summary

Live Algolia probe showed `cartoon::cartoon=4` and filter `nbHits=4` (index size 46). Owner’s unselected `(3)` came from mount-cached `useCatalogTags` / `approvedTags`, while selecting a tag triggered a fresh facet fetch `(4)`. Modal now always refreshes facets on open. Defensive name-merge for split facet keys added. No reconcile required for this defect. Portal-only.

---

## Root cause

| Letter | Result |
|--------|--------|
| A stale index | **Ruled out** for current live data (cartoon=4) |
| B global facet semantics | OK (returns 4) |
| C different filters | Not the primary bug |
| D duplicate facet keys | Not present for cartoon; merge added defensively |
| **E stale client state** | **Confirmed** — unselected path used page-mount `approvedTags` |
| F sync timing | **Contributing** — index grew 45→46 after reconcile; mount cache lag |
| G other | N/A |

**Code was wrong (stale UI source); index was correct.**

---

## Why 3 then 4

1. Page load cached global facets (cartoon still 3, or older snapshot).
2. Sync added/updated a 4th cartoon design in Algolia.
3. Opening Tags without selection still showed mount cache → **3**.
4. Selecting cartoon called fresh `listNarrowedApprovedTags` → **4** + 4 designs.

---

## Checklist

| Criterion | Status |
|-----------|--------|
| Fresh global count on modal open | pass |
| Selected count / result set unchanged | pass |
| Prior narrowed q/tags/category kept | pass |
| No generated fallback forced | pass |
| No full-catalog hydrate | pass |
| No Stage 4/5/6 | pass |
| Reconcile required? | **No** (index already correct) |

---

## Test evidence

**21 pass / 0 fail** (freshness + narrowed + containment). tsc / eslint / diff-check **exit 0**.

---

## Deploy

**Not required.**

---

## Verdict

**APPROVED** — STOP for owner re-QA.
