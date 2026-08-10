# Test Report: Artwork Placement + post-add Matching Designs suppression

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Plan | `docs/workflow/plans/2026-08-10-artwork-placement-and-post-add-suggestion-plan.md` |
| Review | `docs/workflow/reviews/2026-08-10-artwork-placement-and-post-add-suggestion-review.md` (approved_with_changes) |
| Scope covered this pass | **Post-add Matching Designs suppression** (Section 2 of the plan) |
| Environment | fresh-prints-dev only; no prod, no Algolia touched |

---

## Summary

The Placement metadata work (Section 1 of the plan) was already implemented and covered by
tests in the working tree before this pass (constants, Studio `CompanionSetPanel` editor,
Portal `CatalogMatchingDesignsSection` badge, `firestore.rules` `isOptionalString`). This pass
implemented and tested the **post-add Matching Designs suppression fix** (Section 2): adding
companion D after A no longer re-suggests A (already in Current Request), and adding a
companion directly from the open suggestion modal no longer re-triggers
`suggestMatchingCompanions` or shows a duplicate toast.

## Files changed (this pass)

- `apps/portal/features/print-requests/utils/companionSuggestionWorkingItemsFilter.ts` (new) — pure exclude-by-working-item-design-id filter
- `apps/portal/features/print-requests/utils/companionSuggestionWorkingItemsFilter.test.ts` (new)
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` — `suggestMatchingCompanions` filters against `workingItemsSnapshotRef` before opening the modal; new `addDesignFromCompanionSuggestion` (non-announcing add via the same `adjustQuantity` path); new `refreshCompanionSuggestionAfterAdd` trims/dismisses the open suggestion after a non-announcing add instead of nesting a new one
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.postAddSuggestion.test.ts` (new) — source-assertion coverage of the wiring above (hook has no DOM-rendering test convention in this repo; see file header)
- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx` — suggestion modal `onAdd` now `addDesignFlow.addDesignFromCompanionSuggestion`
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx` — same wiring change

Design Details "Matching designs" section (`CatalogDesignDetailsModal` / `CatalogMatchingDesignsSection`) intentionally left on the normal `addDesign` (announcing) path per the plan/review — filtering already-in-request companions in that display was called out as optional/nice-to-have and was not implemented, to avoid extra prop plumbing across its five call sites for a non-blocking cosmetic case.

## Commands run and results

| Check | Command | Result |
|---|---|---|
| New unit tests | `npx tsx --test apps/portal/features/print-requests/utils/companionSuggestionWorkingItemsFilter.test.ts apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.postAddSuggestion.test.ts` | **19/19 pass** |
| Regression — existing suggestion modal test | `npx tsx --test apps/portal/features/catalog/components/CatalogCompanionSuggestionModal.test.ts` | **4/4 pass** |
| Full regression sweep | `npx tsx --test` over every `*.test.ts` under `apps/portal/features/print-requests/` and `apps/portal/features/catalog/` | **336/336 pass, 0 fail** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **pass** (`tsc --noEmit`, no output) |
| Lint | `npx eslint <changed files> --ext ts,tsx` | **pass**, no warnings/errors |
| Studio typecheck (sanity — no Studio files touched this pass) | `npx tsc --noEmit` from `apps/studio/` | **pass** |
| Functions build (sanity — no Functions files touched this pass) | `npm --prefix functions run build` | **pass** |
| Placement tests (pre-existing, re-run for regression confidence) | `npx tsx --test packages/shared/src/constants/design/artworkPlacement.constants.test.ts apps/studio/src/renderer/src/features/designs/constants/artworkPlacement.test.ts apps/studio/src/renderer/src/features/designs/components/CompanionSetPanel.artworkPlacement.test.ts` | **14/14 pass** |

## Required-changes checklist (review, Section 2 items)

- [x] Suggestion exclude uses design id from working request items regardless of quantity/size (`excludeDesignsInWorkingItems`)
- [x] Adding from the suggestion modal never calls `announceDesignAdded` (`addDesignFromCompanionSuggestion` → `adjustQuantity(design, 1, { announce: false })`)
- [x] No new Firestore reads added — filtering uses the existing in-memory `workingItemsSnapshotRef`
- [x] No Algolia, no prod touched

## Not run / not applicable this pass

- **Rules deploy** — `firestore.rules` already contains the Placement `isOptionalString` change from prior work in this branch; this pass did not modify `firestore.rules` and did not deploy. Deploy to `fresh-prints-dev` remains a decision for whoever closes out the full Placement scope, not required by the post-add fix itself.
- **`npm run test:rules`** — not run; this pass touched no Firestore rules or security-relevant collections.
- **Manual/DEV QA** — not performed (requires a human in the Portal DEV environment). See Manual Test Checkpoint below.

---

## Manual Test Checkpoint (recommended before signoff of the full goal)

**Feature / area:** Post-add "Matching designs" suggestion modal (Portal Home + Design Library)
**Why automated tests are insufficient:** Requires live Firestore data with real companion links and visual/interaction confirmation of the modal.
**Environment:** fresh-prints-dev, signed-in customer session
**Prerequisites:** At least one `ready` design (A) with a `ready` direct companion (D)

### Steps

1. Add design A to Current Request from the catalog grid → **Expected:** toast "Added A", then the Matching Designs modal opens suggesting D (and any other ready companions of A not already in the request).
2. In that open modal, click Add on D → **Expected:** D is added to Current Request; no new toast; the modal either closes (if D was the only companion) or stays open showing the remaining companions minus D; no second/nested suggestion modal appears.
3. Reopen the catalog and add A again is not applicable (A is already in the request) — instead, from the catalog grid, add another design E that also lists D as a companion → **Expected:** since D is already in the request, no Matching Designs modal opens for this add.
4. Add a design with all of its ready companions already in the Current Request → **Expected:** no Matching Designs modal opens at all.

### Pass criteria

- [ ] Adding D from the open suggestion modal never re-opens/replaces it with another suggestion
- [ ] No duplicate/second toast when adding from the suggestion modal
- [ ] A suggestion never lists a companion already in Current Request
- [ ] The modal never opens when every companion is already in Current Request

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
