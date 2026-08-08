# Signoff: Stage 1b-C narrowed facet counts (Algolia + generated parity)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Signoff by | Signoff Agent |
| Plans | `docs/workflow/plans/2026-08-07-stage-1b-c-algolia-narrowed-facets-plan.md`, `docs/workflow/plans/2026-08-07-stage-1b-c-generated-narrowed-facet-parity-plan.md` |
| Impl Reviews | both **APPROVED** |
| Test reports | corresponding Stage 1b-C test reports |
| Final status | **approved** |

---

## Summary

Owner QA initially failed narrowed Tags-modal counts under Algolia. Fix threaded catalog `q` + tags + category into Algolia facets. Owner A/B then proved the same defect on the generated kill-switch path; parity fix made generated facets use the same constraints as `listMatchingDesigns`. Owner replied **`NARROWED FACET COUNTS: PASS`**.

---

## Changes Delivered

### Behavior

- Algolia ON: Tags modal counts reflect active search + tag AND + category
- Algolia OFF: same constraints via generated shards/lists + card co-occurrence
- Kill switch no longer restores global-only Tags counts when search is active

### Files Modified (high level)

- `portalAlgoliaCatalogSearchService.ts`, `portalCatalogAssetService.ts`, `catalogService.ts`
- `CatalogTagFilterModal.tsx`, `CatalogPageContent.tsx`
- Focused discriminating tests

### Documentation Updated

- Plans, plan reviews, impl reviews, test reports, owner QA checklist, workflow state

---

## Tests

| Check | Result |
|-------|--------|
| Automated (Algolia + generated suites) | pass (22 then 48 in follow-up session) |
| Portal tsc / eslint / diff-check | pass |
| Manual | **NARROWED FACET COUNTS: PASS** (owner) |

---

## Human approvals / manual tests

- Manual tests requested: narrowed facets A/B (ON + OFF)
- Manual tests completed: **PASS**
- No production / merge / Stage 4–6

---

## Explicit non-goals (still true)

- Publisher still alive
- Generated assets untouched (not Stage 4)
- PR #40 unmerged
- No production

---

## Follow-ups

- Complete any remaining Stage 1b-C checklist items (sync/regression) if not already covered in prior owner passes
- Stage 4 publisher retirement remains a **separate** checkpoint

---

## Final status

**approved** — Stage 1b-C narrowed-facet corrective closed.
