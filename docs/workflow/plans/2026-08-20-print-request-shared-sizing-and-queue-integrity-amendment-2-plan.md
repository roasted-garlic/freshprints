# Plan: Amendment 2 — Studio Add Designs Must Not Replay Existing Request Items

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal id | `print-request-shared-sizing-and-queue-integrity` |
| Kind | **Owner QA Amendment 2** (same managed goal; not a second workflow) |
| Parent plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` |
| Amendment 1 | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md` |
| Related | `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-review.md` |
| Checkout | `C:\coding\fresh-prints` on **`development`** |
| Branch / worktree | **Do not create.** Continue the existing checkout. |

---

## Goal

Stop Studio **Add designs** from automatically inserting extra catalog request items at default/initial size when staff return from Design Library selection after adding *other* designs.

Existing request items must remain exactly as they were unless staff explicitly add a new design, intentionally re-select that same design (current UX does **not** allow this), press **Duplicate**, resize, change quantity, or remove.

This amendment does **not** add a uniqueness constraint on `designId`. Multiple request items may reference the same catalog design at independent sizes and quantities when created intentionally.

---

## Background

Owner DEV QA of the parent sizing goal reproduced:

1. Request item Judas Priest resized to ~`14 × 21.1` (~308 DPI).
2. Request item Gentle Parenting resized to ~`16 × 17.4` (~225 DPI).
3. **Add designs** → select additional unrelated designs → return.

Result: original resized items remained, **and** extra copies of those same designs appeared at default ~10″ sizing (`~10 × 15.07` / `~10 × 10.88`).

Parent sizing + Amendment 1 remain implemented and uncommitted on `development`. This amendment must not discard that work. Final parent QA/signoff is paused until this corrective is implemented and owner re-QA passes.

---

## Required return (investigation)

Proven from current source on `C:\coding\fresh-prints` (`development`), not guessed.

### 1. Exact root cause

Studio Design Library request-selection hydrates **all** existing catalog request items as selected (`isExisting: true`), then **Save** calls `printRequestService.savePrintRequestDesignSelections()` with **every** selected `designId` (existing + newly added).

That service does **not** use request item IDs. For each selection it:

1. Loads the catalog design.
2. Computes **default** requested size via `resolveRequestedItemSize(design, {})`.
3. Looks for an existing item with `designId` **and** `requestedSizesMatch` against that **default** size.
4. If none match, it calls `addPrintRequestItem()` which creates a **new** item at default requested size.

A resized item (14×21.1) fails the default-size match (10×15.07), so Save treats it as missing and recreates it.

### 2. Did the sizing goal introduce this?

**No. The bug predates this managed goal.** Git blame:

| Code | Commit | Date |
|------|--------|------|
| Selection save loop | `09c301fc` | 2026-06-28 (Phase 6 selection UI) |
| `designId + requestedSizesMatch(default size)` identity | `22ab215c` | 2026-07-04 (oversized-selection unblock) |

Parent sizing did **not** change `savePrintRequestDesignSelections`, `requestedSizesMatch`, or `usePrintRequestSelectionMode` hydration. Uncommitted `printRequestService.ts` edits in this goal added persistence-health / `assertPersistedPrintRequestItemSize` for allocate; they did not change this matching.

The sizing goal **exposed** the defect: staff can now save 14×21.1 (~308 DPI) instead of being blocked by approved-max. That size is farther from the ~10″ default, so the mismatch is obvious. The same replay would already happen for any resize away from default (including pre-goal 8″ vs 10″).

The 2026-07-04 oversized-selection plan explicitly told `savePrintRequestDesignSelections` to match “the same initialized requested size that `addPrintRequestItem()` will use.” That upsert identity is the defect.

### 3. Exact Add Designs selection-state model

| Stage | File | Component / hook / service | Behavior |
|-------|------|----------------------------|----------|
| Open Add designs | `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` | `openDesignLibrarySelection` | Navigates to Design Library `mode=request-selection&requestId=` |
| Selection page | `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` | `DesignLibraryPage` | `usePrintRequestSelectionMode(selectionRequestId)` |
| Hydration | `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.ts` | `buildSelectionStateFromRequestItems` | Catalog items only; keyed by **`designId`** |
| Selected state | same hook | `SelectionState = Record<designId, { quantity, existingItemId?, isExisting }>` | Existing items marked `isExisting: true` with `existingItemId: item.id` |
| Add | same hook | `addDesign` | If `designId` already in map, **no-op** |
| Remove existing | same hook | `removeDesign` | Immediate `removePrintRequestItem(existingItemId)` then reload |
| Remove new | same hook | `clearNewSelection` | Local only |
| Save | `DesignLibraryPage.handleSaveSelectionMode` | `saveSelections()` | Sends **all** map entries as `{ designId, quantity }` — **drops `existingItemId` and `isExisting`** |
| Create | `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` | `savePrintRequestDesignSelections` | Default-size match, else `addPrintRequestItem` |
| Duplicate | `PrintRequestsPage` + `printRequestService.duplicatePrintRequestItem` | Separate path | Copies the **source item’s** inches/qty/notes; new item id |

Hydration signature (`buildSelectionSignature`) uses `item.id`, source key, and quantity — **not** width/height. Resize does **not** re-key selection. The replay happens at **save**, not hydration.

### 4. Exact stable identity for existing request items

Authoritative persisted identity is **`printRequestItems/{itemId}`** (`item.id`). The selection UI already stores this as `existingItemId`, then **discards it** before the service call.

### 5. Exact identity/comparison causing duplication

```text
existingItem = currentItems.find(
  item => item.designId === selection.designId
       && item.printWidthInches === defaultWidth
       && item.printHeightInches === defaultHeight
)
```

Comparison key: **`designId + default requested width/height`**.

Not used: request item ID, quantity, notes, source type.

### 6. Why resized items are recreated at default size

`addPrintRequestItem({ designId, quantity })` with no inches → `resolveInitialPrintRequestItemSize` / `resolveRequestedItemSize(design, {})` → catalog default (~10″). Owner’s extra copies (~10×15.07, ~10×10.88) match that path.

### 7. Are unresized existing items also vulnerable?

**Not via this Save path**, if they still sit at the same default inches the matcher uses. `requestedSizesMatch` succeeds; quantity is unchanged; `continue` without create.

They **are** vulnerable if:

- staff later resize them, then Add Designs again, or
- default initialization later differs from stored inches (rounding, policy change).

The automated tests must still cover “existing item still at default, then add B” so the fix is not size-difference-dependent.

### 8. Do repeated Add Designs visits accumulate further duplicates?

**Yes, for resized catalog items.** Each Save that includes those `designId`s fails the default-size match again and creates another default-size copy. Unresized defaults do not accumulate.

### 9. Can removed items resurrect?

**Not from this Save path if removal completed.** `removeDesign` deletes by `existingItemId` immediately and reloads; hydration rebuilds the map without that design. Save does not recreate missing `designId`s from a stale full-catalog list.

Residual risk: if Save ran with a stale map that still listed a removed `designId` as selected, the service would create a new default-size item. Current remove-then-reload makes that unlikely. Tests must still cover remove → Add Designs → add other design → removed stays gone.

Selection state does **not** survive leaving selection mode as a global store: the hook remounts with the URL `requestId` and rehydrates from current items.

### 10. Are customer uploads affected?

**Not duplicated or reconstructed by Add Designs.** `buildSelectionStateFromRequestItems` skips non-catalog items (`isCatalogDesignPrintRequestItem`). Save payload is catalog `designId`s only. The save loop never deletes items that are absent from the payload, so uploads are left untouched.

Add Designs is catalog-only. Do not expand to upload selection.

### 11. Current intentional same-design behavior

**Do not change.**

- Design Library: if a catalog `designId` is already selected (because a request item exists), **Add to request** is a no-op (`addDesign` returns current state). Staff cannot create a second size of Design A through selection mode.
- Second copy at another size is **Duplicate** on the request item card.

Preserve: already-present catalog designs appear selected; Duplicate remains the intentional second-item path.

`buildSelectionStateFromRequestItems` keys by `designId`, so two Duplicate copies collapse to **one** selection-map entry (last item wins). That is a pre-existing limitation. Do **not** expand this amendment to multi-item-per-designId selection UX. The save fix must still not create a *third* default-size copy when two intentional copies already exist.

### 12. How explicit Duplicate differs from Add Designs

| | Add Designs Save | Duplicate |
|--|------------------|-----------|
| Intent | Add newly selected catalog designs | Clone one existing request item |
| Identity | Currently `designId + default size` (broken) | Source `item.id` |
| Size | Default initial size for **new** items | Copies source `printWidthInches` / `printHeightInches` |
| Quantity | Selection quantity | Copies source quantity |
| Notes | Not copied (new item) | Copied |

### 13. Smallest architecture-aligned fix

The hook **already** distinguishes `isExisting` + `existingItemId` vs newly added. The service throws that distinction away.

Fix the existing mechanism; do not add a `designId` uniqueness rule.

1. Pass `existingItemId` (and treat missing id as a new create) through `PrintRequestDesignSelectionInput`.
2. Extract a pure planner `planPrintRequestDesignSelectionWrites` (new util next to Studio print-request services/utils).
3. Planner rules:
   - If `existingItemId` is present **and** that id exists on the current request → **update quantity only** if changed; **never** create; **never** rewrite size/notes/source.
   - If `existingItemId` is present but the item is gone → **skip** (do not resurrect at default size).
   - If no `existingItemId` → **create** via existing `addPrintRequestItem` default-size path.
   - **Do not** match on `designId + width + height` in this Studio save path.
4. `saveSelections` should still send existing entries so quantity edits made in the library tray continue to persist **by item id**. New creates remain default-sized.
5. Optional belt-and-suspenders: `saveSelections` may omit unchanged existing rows; planner must still be correct if they are included.

Do **not** rebuild existing items from catalog metadata.

### 14. Exact files to modify

| File | Change |
|------|--------|
| `apps/studio/src/renderer/src/features/print-requests/utils/planPrintRequestDesignSelectionWrites.ts` | **New** pure planner |
| `apps/studio/src/renderer/src/features/print-requests/utils/planPrintRequestDesignSelectionWrites.test.ts` | **New** regression tests (owner cases) |
| `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` | Use planner; extend `PrintRequestDesignSelectionInput`; stop default-size upsert in this method |
| `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.ts` | Pass `existingItemId` on save |
| `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.test.ts` | Extend hydration tests if needed (Duplicate collapse remains documented) |

Likely unchanged: `DesignLibraryPage.tsx`, `PrintRequestsPage.tsx` Duplicate handler, `duplicatePrintRequestItem`, Portal, Functions, Rules.

`requestedSizesMatch` may remain in Studio if unused after the save-path change; remove only if it becomes dead. **Do not** change Portal’s `requestedSizesMatch` in this amendment.

### 15. Exact tests to add/change

Add focused unit tests on the planner (and hook mapping if needed):

1. **Reproduction:** existing A resized away from default; add B → create B only; A not in create list; A not rewritten.
2. **Multiple resized:** A and B resized; add C and D → creates exactly C,D; A,B update-or-skip only.
3. **Existing default-size A; add B** → create B only; A not created again.
4. **No-op / empty new selections** → zero creates; zero updates if quantities unchanged.
5. **Repeated sessions** → second save with A existing (custom size) + new C → create C only (no extra A).
6. **Explicit Duplicate:** two existing item ids same `designId` at different sizes; add B → create B only; neither A id in create list.
7. **Quantity preservation:** existing A qty 3 custom size + new B qty 1 → update A qty only if payload qty differs; else skip; create B with qty 1; A size not in write plan.
8. **Remove then add:** payload without removed design + new B → no create for removed design.
9. **Stale existingItemId** (removed) → skip, do not create default copy.
10. **Customer-upload coexistence:** planner input is catalog selections only; uploads never appear in create/update plan (covered by hook test that uploads are omitted from selection map — already exists; keep it).

Service method: keep using planner so tests do not need Firestore.

Also re-run parent automated suite after implement (shared sizing, Studio sizing, Amendment 1 Finish, persistence barrier) so this file-level overlap does not regress them.

### 16. Overlap with current sizing implementation

**Same file, different functions.** Uncommitted `printRequestService.ts` contains `assertPersistedPrintRequestItemSize` and related allocate gating. Amendment 2 only changes `savePrintRequestDesignSelections` + input type + call site.

Do **not** revert 200 DPI + 22″ `assessPrintRequestItemSize`, persistence health, or queue barriers.

`resolveRequestedItemSize` remains the **create** path for genuinely new items.

### 17. Overlap with Amendment 1 Show Queue work

**None.** Amendment 1 is `upcomingShowService` / Past+Printing Finish. Add Designs does not call it.

After Amendment 2 implement, owner must still re-run Past+Printing QA to prove no accidental dirty-file collision.

### 18. Amendment 2 Plan artifact path

`docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-plan.md`

### 19. Amendment 2 Formal Review artifact path

`docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-review.md`

### 20. Formal Review verdict

**approved** — `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-review.md`

### 21. Any new human checkpoint

**Yes — STOP after Formal Review, before Amendment 2 implementation**, matching Amendment 1. Owner must send Continue Workflow / equivalent before code changes.

After implement: combined owner DEV QA (Amendment 2 + original sizing + Amendment 1). No production, no Functions deploy, no Firestore console, no new uniqueness rule.

**Portal note (out of scope):** Portal `savePrintRequestDesignSelections` still matches `designId + default size`, but `usePortalPrintRequestSelectionMode` already filters Save to **dirty** rows (new, or existing whose quantity changed). The owner Studio reproduction (add other designs only) would **not** replay unchanged resized Portal items. Do not change Portal in this amendment.

---

## Scope

### In Scope

- Studio Add Designs save/reconciliation so existing catalog request items are preserved by **item id**.
- Default sizing only for genuinely new catalog selections.
- Preserve Duplicate, independent sizes/quantities, multi-item same `designId`.
- Focused automated tests listed above.
- Narrow docs note if Studio selection-save behavior is documented (optional; `WORKFLOWS.md` only if it currently describes designId+size upsert).

### Out of Scope

- Unique constraint on `designId`.
- Changing Design Library so staff can re-add the same design from selection mode (current UX: no-op).
- Multi-entry selection map for Duplicate copies (UX expansion).
- Portal catalog save matching.
- Customer-upload Add Designs.
- Production mutation, Functions/Rules/indexes, schema, data repair.
- Reverting parent sizing or Amendment 1.
- Signoff of the parent goal before owner re-QA.

---

## Affected Areas

### Files / Modules (expected)

See §14.

### Architecture Impact

- [x] Details: Keep UI → hook → service. Move comparison into a pure planner used by the service. Stop using default requested size as identity.

### Security Impact

- [x] Details: Same `canManagePrintRequestItems`. Writes still scoped to the open request’s items. Skip stale ids rather than creating orphans. No new public API.

### Data Model Impact

- [x] None. No schema, status, or index changes. Existing item fields remain authoritative.

### Backend Impact

- [x] None expected (Studio client service only). **STOP** if Functions/Rules/indexes appear necessary.

### UI / UX Impact

- [x] Details: No intended visual change. Save still disabled until `hasNewSelections`. Duplicate unchanged. Manual owner QA required.

### Migration Impact

- [x] None. No backfill. Do not delete already-created accidental duplicates in production/DEV data from this workflow.

---

## Approach

1. Add `planPrintRequestDesignSelectionWrites` with the rules in §13.
2. Thread `existingItemId` from selection state into the service input.
3. Replace default-size `find` in `savePrintRequestDesignSelections` with the planner; create only planned creates; quantity-update only planned updates.
4. Add tests in §15.
5. Re-run parent automated checks after implement.
6. Do not commit unless owner asks.
7. STOP for combined owner QA.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Planner unit tests | `node --test` on `planPrintRequestDesignSelectionWrites.test.ts` (+ existing selection hook test) | yes |
| Typecheck | Studio `tsc --noEmit` | yes |
| Lint | eslint on changed Studio files | yes |
| Parent regression | existing shared sizing + Studio sizing + Finish + persistence tests | yes |
| Build | Studio Vite build if Implement proceeds | yes |
| Integration | no | Firestore not required |
| E2E | no | owner QA |
| Backend/rules | no | no Rules change |

### Manual

Owner DEV QA after implement (do not run as production):

#### QA 1, reproduction

1. Create/open a Studio Print Request.
2. Add Judas Priest Painkiller.
3. Set it to about `14 × 21.1`.
4. Add Gentle Parenting.
5. Set it to about `16 × 17.4`.
6. Confirm only two request items exist.
7. Click **Add designs**.
8. Add at least two different designs.
9. Return to request.
10. Confirm Judas Priest exactly once at `14 × 21.1`; Gentle Parenting exactly once at `16 × 17.4`; only newly chosen designs added; no 10″ default duplicates.

#### QA 2, no-op selection visit

Open **Add designs**, select nothing, return. Item count and every size unchanged.

#### QA 3, repeated session

Open Add Designs, add one new design, return; repeat twice. Existing items do not multiply.

#### QA 4, explicit Duplicate

Duplicate Judas Priest; resize duplicate; Add Designs; add unrelated design; return. Exactly two Judas Priest items, not three.

#### QA 5, remove

Remove one item; Add Designs; add unrelated design; return. Removed item does not resurrect.

Then re-run parent QA:

1. Original Portal 14 × 21.1 sizing reproduction
2. Original Studio 14 × 21.1 sizing reproduction
3. Portal request → Show Queue size preservation
4. Explicit Duplicate with independent sizes
5. Past + Printing automatic completion
6. Manual Mark Complete recovery

---

## Human Checkpoints Anticipated

- [x] Other: **STOP now** after Formal Review; owner must approve Amendment 2 Implement
- [x] Manual UI/UX review: combined DEV QA after Implement
- [ ] Design approval
- [ ] Business logic decision (current same-design UX is already proven; preserve it)
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Quantity edits in library for existing items stop saving | Medium | Keep sending `existingItemId` and update qty by id |
| Stale `existingItemId` resurrects a removed item | High if create-on-miss | Planner skips missing ids |
| Accidental `designId` uniqueness | High product | Tests: Duplicate two A items + add B does not collapse or forbid A |
| Touching `printRequestService.ts` regresses sizing assert | Medium | Do not edit allocate/assert functions; re-run parent tests |
| Portal same matcher | Low for this repro | Document; leave Portal out of scope |
| Deleting accidental duplicates in live data | Out of scope | No production repair |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the Amendment 2 Studio files only. Parent sizing + Amendment 1 stay. No production deploy in this step, so no production rollback.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: optional one-line WORKFLOWS note only if current docs claim Add Designs upserts by design+size. Do not rewrite history. No new ADR unless Review requires it (behavior fix, not a new product rule).

---

## Open Questions

- [x] None blocking. Current same-design UX is: selected/no-op in library; Duplicate for a second size.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-review.md`
- Verdict: **approved**
