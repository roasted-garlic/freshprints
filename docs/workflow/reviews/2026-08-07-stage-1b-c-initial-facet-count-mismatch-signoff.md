# Signoff: Stage 1b-C initial Algolia facet count freshness

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-initial-facet-count-mismatch-plan.md` |
| Impl Review | **APPROVED** |
| Test report | `docs/workflow/reviews/2026-08-07-stage-1b-c-initial-facet-count-mismatch-test-report.md` |
| Final status | **approved** |

---

## Summary

Unselected Tags-modal counts could lag Algolia after sync because `useCatalogTags` loaded once on mount. Tags modal now refreshes facets on every open. Owner replied **`INITIAL FACET COUNT: PASS`**.

---

## Changes Delivered

- `CatalogTagFilterModal` always fetches facets when opened (global or constrained)
- Defensive merge of Algolia facet keys by display name
- Live probe confirmed index already correct (`cartoon=4`); no reconcile required

---

## Tests

| Check | Result |
|-------|--------|
| Automated | 21 pass |
| Manual | **INITIAL FACET COUNT: PASS** |

---

## Explicit non-goals (still true)

- Publisher alive; generated assets retained
- PR #40 unmerged; no production; no Stage 4/5/6

---

## Final status

**approved**
