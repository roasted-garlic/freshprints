# Design Library Management Filter Polish Plan

Date: 2026-06-30

Managed phase: `design-library-management-filter-polish`

## Goal

Polish the Design Library controls so category/tag management actions sit together with clear icons, and category/tag filter options only show values assigned to currently matching approved catalog designs.

This is a narrow follow-up to `global-approved-tag-library`, and includes a Tag Management modal state-loop bug fix discovered immediately after signoff.

## Approved Scope To Preserve

In scope:

* Move Tag Management next to Category Management.
* Add management-style icons to Category Management and Tag Management buttons.
* Add a filter-style icon to the tag filter button.
* Hide zero-assignment categories from the category filter dropdown.
* Hide zero-assignment tags from the tag filter modal.
* Preserve legacy/freeform design tags assigned to designs.
* Preserve approved tag metadata for tag search/sort where useful.
* Add/update targeted tests for category and tag option derivation.
* Fix the Tag Management modal render loop so create, archived, edit, and bulk import mode switching works reliably.

Out of scope:

* No data migration or backfill.
* No Firestore rules changes.
* No Cloud Functions changes.
* No AI Review behavior changes.
* No tag/category data model changes.
* No `designs.tags` shape change.
* No category-owned tags or `categoryHints`.
* No production deploy.
* No Portal, Print Runs, ecommerce, checkout, shipping, marketplace, or customer Studio expansion.

## Current Repo Findings

* [src/renderer/src/features/designs/pages/DesignLibraryPage.tsx](../../../../src/renderer/src/features/designs/pages/DesignLibraryPage.tsx) currently exposes Category Management as the App Header primary action and Tag Management inside the filter dock summary row.
* [src/renderer/src/features/designs/components/DesignLibraryFilterControls.tsx](../../../../src/renderer/src/features/designs/components/DesignLibraryFilterControls.tsx) renders the tag filter button without an icon.
* [src/renderer/src/features/designs/utils/designLibrarySearch.ts](../../../../src/renderer/src/features/designs/utils/designLibrarySearch.ts) already owns search, tag filtering, unique tag collection, and faceted tag computation.
* The Design Library uses `useDesigns(listQuery, { loadAll: true })`, so deriving filter options from loaded designs avoids adding broad Firebase queries.
* Tag filter options are already derived from `baseDesigns`; approved library tags with zero assigned designs do not appear unless selected. This behavior should be covered explicitly with tests.
* Category options currently include all active categories, regardless of assignment.
* [src/renderer/src/features/designs/components/TagManagementModal.tsx](../../../../src/renderer/src/features/designs/components/TagManagementModal.tsx) resets local state in an open-modal effect.
* [src/renderer/src/features/designs/hooks/useCatalogTags.ts](../../../../src/renderer/src/features/designs/hooks/useCatalogTags.ts) currently returns `clearActionError` as a new inline function each render, which makes the modal reset effect unstable and can produce the reported `Maximum update depth exceeded` loop.

## Architecture Impact

Renderer-only UI/filter behavior.

Layering remains:

```txt
Page/component
  ↓
Pure utilities
  ↓
Existing hooks/services
  ↓
Firebase SDK
```

No component will call Firebase directly.

No service changes are expected.

One small hook stability fix is expected so the modal reset effect can depend on a stable callback.

## Data Model Impact

No data model changes.

`designs.tags` remains `string[]`.

Categories remain global category documents. Tags remain global approved tag documents. Tags are not nested under categories.

## Firebase Impact

No Firestore rules, indexes, or Functions changes are planned.

No deploy is required or allowed in this phase.

One query behavior adjustment is planned in the renderer:

* Stop sending `categoryId` in the Design Library Firestore list query.
* Load the full ready/archived catalog scope already needed for client-side tag faceting.
* Apply category filtering client-side with a new pure `filterDesignsByCategory` utility.

Reason: category options need to be derived from the currently loaded approved/archived catalog scope without a second broad query and without hiding every other category after one category is selected.

## Security Considerations

No permission rules change.

Use existing `permissionService` behavior:

* Category Management visibility remains owner/admin via the current category management path.
* Tag Management visibility remains owner/admin via tag management controls and tag service permissions.
* Helpers can view filters and assigned category/tag options but cannot manage category/tag documents.

The Tag Management bug fix must not change owner/admin/helper permission behavior.

## UI Plan

### Management Buttons

In `DesignLibraryPage`:

* Remove the separated App Header `primaryAction` for Categories.
* Add Category Management and Tag Management buttons side by side in the existing filter dock summary action group when not in request-selection mode.
* Use `button-leading-icon` for both.
* Use lucide icons already available through `lucide-react`:
  * Category Management: `FolderCog` or `Settings`
  * Tag Management: `Tags` or `Settings`
* Add clear labels and `title` attributes:
  * `Manage categories`
  * `Manage tags`

### Tag Filter Button

In `DesignLibraryFilterControls`:

* Add a filter-style lucide icon such as `ListFilter` or `Filter` to the tag filter button.
* Keep current label/count behavior: `Tags` or `Tags (n)`.
* Preserve button size and variant.

### Responsive Styling

Use existing `.button-leading-icon` and `.design-library-summary-actions`.

Only add CSS if needed for spacing/wrapping consistency.

### Tag Management modal stability fix

In `TagManagementModal` and `useCatalogTags`:

* Stabilize the reset effect dependency chain so opening the modal does not trigger repeated state resets.
* Keep mode transitions in explicit click handlers (`openCreateForm`, archived toggle, edit, bulk import toggle) instead of effect-driven mode changes.
* Guard any remaining effect-driven resets so they run on modal open transitions only, not every render while `isOpen` stays true.
* Preserve existing owner/admin/helper modal behavior and existing create/edit/archive/import flows.

## Filter Option Plan

### New/Updated Pure Utilities

In `designLibrarySearch.ts`, add or extend:

* `filterDesignsByCategory(designs, categoryId)`
* `collectUsedCategoryIds(designs)`
* `buildCategoryFilterOptions({ categories, designs, selectedCategoryId, allOptionValue })`

Rules:

* Include only active categories with at least one matching design.
* Preserve the selected category option while it is selected, even if current search/tag state produces zero matching designs for it, so the select does not display an invalid value.
* Always include `All categories`.
* Sort/order options using the existing category order from `useCategories()`; do not introduce new sort rules.

### Page Derivation

In `DesignLibraryPage`:

* Build the Firestore list query from archived/request-selection scope only, with `categoryId` omitted.
* Derive:
  * `searchMatchedDesigns = filterDesignsBySearch(designs, searchQuery)`
  * `categoryFilterOptionDesigns = filterDesignsByTags(searchMatchedDesigns, selectedTags)`
  * `baseDesignsForFaceting = filterDesignsByCategory(searchMatchedDesigns, categoryFilter)`
  * `filteredDesigns = filterDesignsByTags(baseDesignsForFaceting, selectedTags)`
* Use `buildCategoryFilterOptions` with `categoryFilterOptionDesigns`.

This keeps category and tag options based on the loaded approved/archived catalog scope and current search/tag/category context without extra Firebase queries.

### Tag Filter Behavior

Keep `computeFacetedTagsForDraftSelection` as the tag option source.

Add tests proving:

* Approved library tags with zero assigned designs do not appear.
* Legacy/freeform tags assigned to designs do appear.
* Duplicate tag strings dedupe.
* Archived catalog tag metadata does not remove an assigned tag string from filter options.

## Files Expected To Change

Implementation files:

* `src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`
* `src/renderer/src/features/designs/components/DesignLibraryFilterControls.tsx`
* `src/renderer/src/features/designs/components/TagManagementModal.tsx`
* `src/renderer/src/features/designs/hooks/useCatalogTags.ts`
* `src/renderer/src/features/designs/utils/designLibrarySearch.ts`
* `src/renderer/src/features/designs/utils/designLibrarySearch.test.ts`
* `src/renderer/src/styles/components/design-library.css` only if spacing needs adjustment

Workflow artifacts:

* `.cursor/workflow/state.md`
* `docs/workflow/reviews/2026-06-30-design-library-management-filter-polish-test-report.md`
* `docs/workflow/reviews/2026-06-30-design-library-management-filter-polish-signoff.md`

## Tests

Targeted:

```bash
npx tsx --test src/renderer/src/features/designs/utils/designLibrarySearch.test.ts
npx tsx --test src/renderer/src/features/designs/utils/catalogTagNormalizer.test.ts
```

Full local checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Manual QA Checklist

* Open Design Library.
* Confirm Category Management and Tag Management buttons are next to each other.
* Confirm both management buttons have clear management/settings-style icons.
* Confirm tag filter button has a filter-style icon.
* Confirm category filter hides active categories with zero currently matching assigned approved designs.
* Confirm tag filter hides approved library tags with zero assigned designs.
* Open Tag Management as owner and confirm the modal stays open.
* Confirm Create Tag opens the create form every time.
* Confirm Archived opens the archived tag view every time.
* Switch between active list, archived list, create, edit, and bulk import without render loops or modal flashing.
* Confirm no `Maximum update depth exceeded` warning appears from `TagManagementModal.tsx`.
* Confirm assigned legacy/freeform design tags still appear in tag filtering.
* Confirm category filter still filters designs.
* Confirm tag filter still filters designs with AND semantics.
* Confirm search still filters title, description, and tags.
* Confirm Category Management modal still shows all manageable categories.
* Confirm Tag Management modal still shows all manageable tags.
* Confirm owner/admin/helper visibility did not regress.

## Risks

| Risk | Mitigation |
| --- | --- |
| Moving category filtering client-side may change timing/count behavior | Use existing `loadAll: true` catalog scope and add tests around pure utility behavior |
| Selected category could disappear when zero-result filters are applied | Preserve selected category option until cleared |
| Approved tag metadata could hide legacy assigned tags | Keep candidates derived from design tag strings, not from approved tag docs |
| UI buttons could wrap poorly on small widths | Use existing flex-wrap summary action group and adjust CSS only if needed |
| Modal reset effect could still retrigger if callback dependencies remain unstable | Stabilize hook callbacks and keep modal reset logic keyed to open transitions only |

## Review Gate

Implementation must not start until this plan is approved for the managed phase.
