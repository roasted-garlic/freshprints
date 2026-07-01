# Category And Tag Modal Counts Plan

Date: 2026-06-30

Managed phase: `category-tag-modal-counts`

## Goal

Add clear total counts to Category Management and Tag Management modals so staff can quickly see how many category/tag records are in the current modal view.

## Scope

In scope:

* Show count context in Category Management:
  * active category count in the active view
  * archived category count in the archived view
* Show count context in Tag Management:
  * approved tag count in the active view
  * archived tag count in the archived view
  * when tag search filters the list, show filtered count against the current view total
* Use existing modal/list styling and semantic tokens.
* Preserve category/tag permissions, bulk import, edit, archive, restore, search, and loading behavior.

Out of scope:

* No data model changes.
* No Firestore rules, indexes, Functions, or deploy changes.
* No category/tag seed writes.
* No migration/backfill.
* No changes to approved tag normalization or `designs.tags`.

## Current Repo Findings

* [CategoryManagementModal.tsx](../../../../src/renderer/src/features/designs/components/CategoryManagementModal.tsx) already derives `activeCategories`, `archivedCategories`, and `visibleCategories`.
* [TagManagementModal.tsx](../../../../src/renderer/src/features/designs/components/TagManagementModal.tsx) already derives `activeTags`, `archivedTags`, and `visibleTags`.
* [design-library.css](../../../../src/renderer/src/styles/components/design-library.css) already has compact chip/list styling that can support a small count row without a new component.

## Architecture Impact

Renderer-only UI work in existing Design Library components.

No component will call Firebase directly.

## Data Model Impact

None.

## Firebase Impact

None. No deploy required.

## Security Considerations

No permission changes.

## UI Plan

* Add a compact count row below the modal toolbar or header copy:
  * Categories active view: `12 active categories`
  * Categories archived view: `3 archived categories`
  * Tags active view: `245 approved tags`
  * Tags archived view: `8 archived tags`
  * Tags with search: `17 of 245 approved tags`
* Use a neutral chip/metadata style, not a status badge.
* Keep empty states unchanged.

## Files Expected To Change

Implementation files:

* `src/renderer/src/features/designs/components/CategoryManagementModal.tsx`
* `src/renderer/src/features/designs/components/TagManagementModal.tsx`
* `src/renderer/src/styles/components/design-library.css` if spacing/styling requires it

Workflow artifacts:

* `.cursor/workflow/state.md`
* `docs/workflow/reviews/2026-06-30-category-tag-modal-counts-test-report.md`
* `docs/workflow/reviews/2026-06-30-category-tag-modal-counts-signoff.md`

## Tests

Minimum:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Manual QA Checklist

* Open Category Management and confirm active count displays.
* Switch to archived categories and confirm archived count displays.
* Open Tag Management and confirm approved count displays.
* Search tags and confirm filtered count displays as `shown of total`.
* Switch to archived tags and confirm archived count displays.

## Review Gate

Implementation must not start until this plan is approved for the managed phase.
