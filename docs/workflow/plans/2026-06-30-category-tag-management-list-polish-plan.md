# Category And Tag Management List Polish Plan

Date: 2026-06-30

Managed phase: `category-tag-management-list-polish`

## Goal

Improve the Category Management and Tag Management modal list UI so staff can scan ordering, descriptions, preferred-use guidance, and aliases without confusing metadata fields or losing context while tags load.

## Scope

In scope:

* Make category sort order visually separate from category description in the category list.
* Show only a description snippet in category rows by default, with a control to expand/collapse the full description.
* Keep the category edit form able to show and edit the full description.
* Prevent the Tag Management modal from flashing an empty list before the initial tag load completes.
* Make tag aliases visually distinct from preferred-use guidance, likely with compact pill chips.
* Show only a preferred-use snippet in tag rows by default, with a control to expand/collapse the full preferred-use text.
* Keep the tag edit form able to show and edit the full preferred-use guidance and aliases.
* Preserve current permissions, archive behavior, bulk import behavior, search behavior, and service-layer data loading.

Out of scope:

* No data model changes.
* No Firestore rules, indexes, Functions, or deploy changes.
* No category/tag migration or backfill.
* No changes to approved tag normalization or AI processing.
* No changes to `designs.tags`.
* No unrelated Design Library filter, request, or Portal work.

## Current Repo Findings

* [CategoryManagementModal.tsx](../../../../src/renderer/src/features/designs/components/CategoryManagementModal.tsx) currently renders category row metadata as `Sort order {n} · {description}`, which visually makes sort order look like part of the description.
* Category edit uses a single-line `TextInput` for description. This can hide long descriptions horizontally in the edit modal.
* [TagManagementModal.tsx](../../../../src/renderer/src/features/designs/components/TagManagementModal.tsx) renders preferred-use guidance and aliases as plain muted paragraphs, so aliases do not stand apart from the preferred-use sentence.
* `TagManagementModal` renders an empty-state branch whenever `isLoading` is false and `visibleTags.length === 0`.
* [useCatalogTags.ts](../../../../src/renderer/src/features/designs/hooks/useCatalogTags.ts) loads tags on hook mount and the modal calls `reloadTags()` on open. If the first modal paint happens with no tags available yet, the user can see a blank/empty list before the loaded list appears.
* Shared form controls already include `AutoResizeTextarea`, which is a better fit for full category descriptions and tag preferred-use guidance.

## Architecture Impact

Renderer-only UI work in the existing Design Library feature.

Layering remains unchanged:

```txt
Component
  ↓
Existing hooks
  ↓
Existing services
  ↓
Firebase
```

No component will call Firebase directly.

## Data Model Impact

None.

Categories keep:

```ts
description?: string;
sortOrder: number;
```

Tags keep:

```ts
aliases: string[];
preferredWhen: string;
```

## Firebase Impact

None.

No Firestore rules, indexes, Cloud Functions, Storage rules, or deploy actions are required or allowed for this phase.

## Security Considerations

No permission changes.

Existing role behavior must remain:

* owner/admin can manage categories and tags
* helpers cannot manage category/tag documents
* active staff can view approved tag metadata according to existing rules
* owner-only bulk tag import remains owner-only

## UI Plan

### Category Rows

* Replace the combined `Sort order {n} · {description}` line with distinct elements:
  * a compact order badge or metadata chip such as `Order 0`
  * a separate description snippet block
* Clamp long descriptions in the row by default.
* Add an accessible expand/collapse button only when the description is long enough to need it.
* Preserve drag handle, active/archived badge, edit/archive actions, and mobile stacking behavior.

### Category Edit Form

* Use `AutoResizeTextarea` for category description so the full description is visible and editable in the modal.
* Keep sort order visible/editable only for active categories in edit mode, as it is today.

### Tag Loading

* Track whether the tag modal has completed its first load for the current open session, or derive an equivalent first-load state from hook state.
* Render a stable loading state while the initial tag load is in progress instead of briefly rendering the empty list.
* Keep existing loaded empty states for true zero-result views after loading completes.

### Tag Rows

* Label preferred-use guidance separately from aliases.
* Clamp preferred-use guidance in the row by default and add an accessible expand/collapse button when needed.
* Render aliases as compact chips/pills, without treating them as status badges.
* Preserve search, active/archived status badge, edit/archive actions, and archived view behavior.

### Styling

Use `src/renderer/src/styles/components/design-library.css` with semantic design tokens only:

* `--color-bg-*`
* `--color-border`
* `--color-text-*`
* spacing/radius/type tokens

No inline static styles and no hardcoded colors.

## Files Expected To Change

Implementation files:

* `src/renderer/src/features/designs/components/CategoryManagementModal.tsx`
* `src/renderer/src/features/designs/components/TagManagementModal.tsx`
* `src/renderer/src/styles/components/design-library.css`

Workflow artifacts:

* `.cursor/workflow/state.md`
* `docs/workflow/reviews/2026-06-30-category-tag-management-list-polish-test-report.md`
* `docs/workflow/reviews/2026-06-30-category-tag-management-list-polish-signoff.md`

## Tests

Minimum automated checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Targeted tests are not expected unless a pure utility or hook contract changes.

## Manual QA Checklist

* Open Category Management.
* Confirm sort order is visually separate from description.
* Confirm long category descriptions show as snippets and can expand/collapse.
* Open Edit Category and confirm the full description is visible/editable.
* Confirm category drag reorder, edit, archive, restore, and bulk import UI still work.
* Open Tag Management.
* Confirm the modal shows a stable loading state instead of flashing an empty list before tags appear.
* Confirm preferred-use guidance is visually separate from aliases.
* Confirm aliases render as pills/chips.
* Confirm long preferred-use guidance shows as a snippet and can expand/collapse.
* Open Edit Tag and confirm full aliases and preferred-use guidance are visible/editable.
* Confirm tag search, active/archived views, edit, archive, and bulk import UI still work.
* Check light and dark themes for readable contrast.

## Risks

| Risk | Mitigation |
| --- | --- |
| Expand/collapse state could leak between active and archived views | Key expanded state by item ID and keep it presentation-only |
| Snippet logic could hide text for keyboard or screen-reader users | Use accessible buttons and keep full text available when expanded |
| Loading-state fix could mask true empty tag lists | Only show initial loading while a load is pending; preserve empty state after load completes |
| CSS could affect both category and tag rows unexpectedly | Use shared base classes plus specific modifier classes for category/tag-only elements |

## Review Gate

Implementation must not start until this plan is approved for the managed phase.
