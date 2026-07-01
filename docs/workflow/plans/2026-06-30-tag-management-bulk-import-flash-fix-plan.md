# Tag Management Bulk Import Flash Fix Plan

Date: 2026-06-30

Managed phase: `tag-management-bulk-import-flash-fix`

## Goal

Stop the Tag Management modal from flashing once per imported tag during bulk import, while preserving the existing owner-only import behavior and final success/error summary.

## Approved Scope To Preserve

In scope:

* fix the bulk import execution path so the modal does not visibly re-render/reset per imported tag
* keep sequential tag creation semantics unless a safe local batching helper is already available
* keep the final bulk import summary behavior and permission gates
* add/update narrow tests if needed around the touched import/service path

Out of scope:

* no data model changes
* no Firestore rules changes
* no Functions changes
* no deploy
* no changes away from owner-only bulk import
* no unrelated Tag Management refactor

## Current Repo Findings

* [TagManagementModal.tsx](../../../../src/renderer/src/features/designs/components/TagManagementModal.tsx) loops over parsed tags and calls `createTag()` for each item.
* [useCatalogTags.ts](../../../../src/renderer/src/features/designs/hooks/useCatalogTags.ts) implements `createTag()` via `runAction()`, and `runAction()` currently:
  * sets submitting state
  * clears action error
  * performs the mutation
  * calls `loadTags()` immediately after every mutation
  * clears submitting state
* That means a 20-tag import triggers 20 state flips and 20 list reloads inside one modal session, which explains the repeated flashing.

## Architecture Impact

Renderer hook/component only.

No component should call Firebase directly.

Preferred fix direction:

* keep `catalogTagService` usage inside `useCatalogTags`
* add a narrowly scoped hook path for bulk import that can create multiple tags with a single outer submitting cycle and a single final reload
* keep UI updates explicit at the end of the import, not after every created tag

## Data Model Impact

None.

## Firebase Impact

No rules, schema, or deploy changes.

## Security Considerations

* owner-only bulk import must stay owner-only
* owner/admin/helper permissions for non-import actions must not change

## Implementation Plan

1. Add a narrow bulk-create helper in `useCatalogTags` that:
   * validates auth once
   * sets submitting/error state once
   * executes each create through `catalogTagService.createTag`
   * returns per-item success/failure results
   * reloads tags once after the loop
2. Update `TagManagementModal` bulk import to use that bulk helper instead of calling `createTag()` inside the loop.
3. Keep the final success/failure messaging in the modal unchanged except for eliminating the repeated flashing.

## Files Expected To Change

* `src/renderer/src/features/designs/hooks/useCatalogTags.ts`
* `src/renderer/src/features/designs/components/TagManagementModal.tsx`
* tests only if a narrow existing test surface is affected

## Tests

Minimum:

```bash
npx tsc --noEmit
npm run lint
```

If touched code affects existing build output:

```bash
npm run build
```

## Manual QA Checklist

* Open Tag Management as owner.
* Open bulk import.
* Import multiple tags at once.
* Confirm the modal does not flash once per imported tag.
* Confirm the import still produces the final success/failure summary.
* Confirm the list refreshes once at the end and the newly imported tags appear.
* Confirm non-import create/edit/archive flows still behave normally.

## Risks

| Risk | Mitigation |
| --- | --- |
| Refactoring hook mutation flow could change non-import tag actions | Keep the new path bulk-import-specific and leave existing single-action paths intact |
| Bulk import could stop surfacing partial failures | Preserve per-item try/catch result collection and final summary output |

## Review Gate

Implementation must not start until this plan is approved for the managed phase.
