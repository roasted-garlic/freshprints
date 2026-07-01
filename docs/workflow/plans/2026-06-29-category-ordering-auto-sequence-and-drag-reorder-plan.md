# Plan: Category Ordering Auto Sequence And Drag Reorder

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Command | Managed Phase |
| Roadmap phase | Phase 2 Design Library maintenance / catalog organization polish |
| Status | plan — awaiting review approval |

## Goal

Make category ordering deterministic, contiguous, and persisted so category order always starts at `0` and remains gap-free after create, manual order edits, drag reorder, archive, and restore flows.

This is a Design Library maintenance phase. It must not touch AI Processing behavior, Print Requests, Print Runs, Portal, ecommerce, shipping, payment, or other unrelated workflow areas.

## Current Repo State Verified

Repo inspection confirms:

* `Category.sortOrder` already exists in the shared renderer type at `src/renderer/src/features/designs/types/category.types.ts`.
* `docs/architecture/DATA_MODEL.md` already documents `sortOrder: number` on categories.
* Firestore rules already require `sortOrder` on category documents.
* `firestore.indexes.json` already includes `categories.isActive + sortOrder`.
* `categoryService.listCategories()` already queries and sorts by `sortOrder`.
* `CategoryManagementModal` still exposes `sortOrder` as a raw numeric form field.
* `categoryService.createCategory()` currently writes `input.sortOrder ?? 0`, so new categories do not auto-sequence.
* `categoryService.updateCategory()` currently writes `input.sortOrder` directly, so collisions are not normalized and no atomic reindex happens.
* `archiveCategory()` and `restoreCategory()` currently toggle `isActive` only and do not normalize remaining active category order.
* No drag-and-drop library is installed in `package.json`.

Therefore the persisted field should be **reused**, not added. The missing work is sequencing, normalization, atomic reordering, and UI support.

## Target Behavior

1. Active category order is always contiguous integers `0...n-1`.
2. Creating a category assigns the next available order automatically.
3. Manual order edits reindex the entire active category list atomically.
4. Dragging categories in the management list uses the same reorder logic as manual order edits.
5. Archiving or restoring a category reindexes active categories so no gaps remain.
6. Existing bad data with duplicate, missing, negative, or gapped `sortOrder` values is normalized through approved service paths.
7. Category queries and visible category lists remain ordered by `sortOrder` ascending.
8. Design category assignment, filtering, and AI category resolution keep working without rewriting design documents.

## Scope

In scope:

* Reuse `Category.sortOrder` as the persisted ordering field.
* Add pure category ordering helpers under `features/designs/utils/`.
* Refactor `categoryService` so create/update/archive/restore/reorder paths normalize and persist category order atomically.
* Add a service-level drag reorder entrypoint that the modal can call.
* Update category management UI to support drag reorder and visible immediate ordering feedback.
* Keep manual numeric order editing, but route it through the same reorder helper.
* Add tests for pure ordering helpers.
* Update docs only if behavior or workflow documentation needs clarification beyond the existing data model field.

Out of scope:

* AI prompt or AI Processing changes.
* Design status changes.
* Print Request, Print Run, customer, Portal, Whatnot, shipping, payment, or ecommerce changes.
* Firestore rules relaxation.
* New backend API surface.
* New package installation unless review explicitly approves it.

## Architecture Impact

Keep the existing layer pattern:

```txt
CategoryManagementModal
  ↓
useCreateCategory / useUpdateCategory / useArchiveCategory / useRestoreCategory
  ↓
categoryService
  ↓
Firestore SDK
```

Add one more narrow service-owned reorder path:

```txt
CategoryManagementModal drag/manual order action
  ↓
categoryService.reorderCategory(...)
  ↓
pure categoryOrder helpers
  ↓
Firestore batch or transaction
```

Business rules for normalization, collision handling, target clamping, and contiguous resequencing must stay out of the component.

## Data Model Impact

No new category field is required.

Reuse:

| Field | Type | Status |
|-------|------|--------|
| `sortOrder` | `number` | existing persisted field |

Behavioral clarification:

* `sortOrder` is the canonical active-category position.
* Active categories must be persisted contiguously from `0`.
* Archived categories may retain their historical order number in storage, but active-list normalization must always produce contiguous active ordering.

No design document schema change is planned.

## Firebase Impact

Firestore rules and indexes already support the field:

* Rules validate `sortOrder is int`.
* Composite index `categories.isActive + sortOrder` already exists.

Planned Firestore write behavior:

* Use a batch or transaction to persist all changed category `sortOrder` updates atomically for reorder flows.
* Keep `updatedAt: serverTimestamp()` and `updatedBy` on every touched document.
* Keep `createdAt` / `createdBy` immutable.

No rules or index change is expected from the repo state currently inspected.

## Security Considerations

* Keep owner/admin-only category management writes.
* Do not move Firebase access into components.
* Validate and clamp incoming target order values in the service layer.
* Normalize only category documents; do not rewrite design records.
* Preserve current Firestore rule contract for category create/update.

## UI Considerations

Category management modal should remain consistent with the current Design Library styling:

* Reuse the existing list view in `CategoryManagementModal`.
* Add a drag handle or clearly draggable row affordance without making the row visually noisy.
* Keep keyboard-safe manual order editing available through the edit form.
* Reorder feedback should be immediate in the visible list after a successful drag drop.
* Prefer native HTML drag-and-drop on the existing list instead of adding a dependency, because the repo currently has no drag library and the interaction is narrow.

## Suggested Service And Utility Design

Add pure helpers, for example:

* `normalizeCategoryOrder(categories: Category[]): Category[]`
* `moveCategoryToOrder(categories: Category[], categoryId: string, targetOrder: number): Category[]`
* `buildCategoryOrderWriteSet(previous: Category[], next: Category[]): Array<{ id: string; sortOrder: number }>`

Expected helper behavior:

* Sort with stable fallback for malformed data.
* Treat missing/invalid/negative `sortOrder` as requiring normalization.
* Clamp requested order to `0...n-1`.
* Remove the moved category, insert at target index, then reassign `sortOrder = index` for all active categories.
* Return deterministic output for unit tests.

Suggested service changes:

* `createCategory()`:
  * Load active categories.
  * Normalize active order if needed.
  * Assign the new category `sortOrder = activeCategories.length`.
  * Persist any normalization plus the new category atomically if normalization was needed first.
* `updateCategory()`:
  * If `sortOrder` is unchanged or omitted, keep the existing targeted update path.
  * If `sortOrder` changes, load active categories, move the category to the requested index, normalize, and batch all changed writes atomically.
* `archiveCategory()`:
  * Set `isActive: false`.
  * Reindex remaining active categories atomically in the same write flow.
* `restoreCategory()`:
  * Restore `isActive: true`.
  * Place the restored category at the end of the active list by default, then normalize.
* `reorderCategory()`:
  * Shared entrypoint for drag reorder and manual order changes.

## Implementation Steps

1. Add pure category order utilities.
   * Create a focused utility file under `src/renderer/src/features/designs/utils/`.
   * Cover normalization, move-to-order, and changed-write calculation.

2. Refactor `categoryService`.
   * Centralize active-category load + normalize behavior.
   * Add atomic reorder persistence with batch or transaction writes.
   * Reuse the same path for manual order edits and drag reorder.
   * Normalize active order on create/archive/restore as needed.

3. Update category hooks only as needed.
   * Keep the current hook pattern.
   * Add a narrow reorder hook only if it improves modal wiring without duplicating service logic.

4. Update `CategoryManagementModal`.
   * Keep the existing create/edit/archive/restore behavior.
   * Add drag reorder to the list.
   * Keep manual sort order editing in the form, but route it through the shared service logic.
   * Do not import Firebase directly into the component.

5. Add tests.
   * Add utility tests adjacent to the new helper file.
   * Cover normalization, collision handling, target clamping, drag/manual shared move behavior, and no-gap/no-duplicate guarantees.

6. Update docs if needed.
   * `docs/WORKFLOWS.md` if category management workflow needs sequencing clarification.
   * `project-chatgpt-handoff/04-features-inventory.md` if drag reorder becomes a live documented capability.
   * No `DATA_MODEL.md` schema addition is expected because `sortOrder` already exists there.

## Risks

* Existing category data may already contain duplicates or gaps.
  Mitigation: normalize through the service before applying reorder writes.

* Reordering many categories can touch several documents at once.
  Mitigation: keep writes atomic with batch/transaction and update only changed records.

* Drag-and-drop can add UI complexity or accessibility regression.
  Mitigation: keep manual order editing, use a simple draggable row pattern, and avoid dependency sprawl.

* Archive/restore semantics for inactive category order could be ambiguous.
  Mitigation: define active list as the only contiguous contract; restored categories append to the end by default unless manually moved later.

## Verification

Required commands after implementation:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Targeted tests to add and run:

```bash
npx tsx src/renderer/src/features/designs/utils/categoryOrder.test.ts
```

Manual verification after implementation:

1. Open Category Management in Design Library.
2. Create categories A, B, C, D, E.
3. Confirm new categories auto-assign `0, 1, 2, 3, 4`.
4. Edit E to order `0`.
5. Confirm active order becomes `E, A, B, C, D` with persisted `0...4`.
6. Drag C above E.
7. Confirm visible order becomes `C, E, A, B, D`.
8. Refresh and confirm order persists.
9. Archive one active category and confirm active order reindexes contiguously.
10. Restore an archived category and confirm it returns at the end of the active list unless manually moved later.
11. Confirm Design Library category filtering still works.

## Review Gate

This phase is plan-only. Do not implement until FreshForge review approves this plan.
