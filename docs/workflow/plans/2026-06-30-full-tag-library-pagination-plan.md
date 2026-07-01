# Full Tag Library Pagination Plan

Date: 2026-06-30

Managed phase: `full-tag-library-pagination`

## Goal

Fix missing approved tags in Tag Management by loading the full tag library instead of only the first 1000 Firestore documents.

## Root Cause Found

`catalogTagService.ts` caps tag reads with:

```ts
const DEFAULT_TAG_LIST_LIMIT = 1000;
```

That limit is applied to:

* `listTags()` - used by Tag Management and tag metadata consumers
* `getAllTags()` - used by create/edit/bulk import duplicate checks

If the imported tag library has more than 1000 tag documents, tags beyond that first limited query can exist in Firestore but not appear in the Tag Management modal. This also means duplicate checks may miss existing tags beyond the first 1000.

This explains why a known uploaded tag like `wednesday` / `wednesday addams` may not show in the modal.

## Scope

In scope:

* Replace capped tag reads with paginated reads that retrieve all matching tag documents.
* Ensure Tag Management can show every approved/archived tag available to the current user.
* Ensure duplicate checks compare against the full tag library.
* Preserve owner/admin/helper permissions.
* Preserve existing tag sorting, archive filtering, search, edit, archive, and bulk import behavior.

Out of scope:

* No Firestore writes, migrations, or backfills.
* No seed/import action from external JSON.
* No Firestore rules, indexes, Functions, or deploy changes.
* No changes to `designs.tags`.
* No AI tag normalization changes.

## Architecture Impact

Renderer service-layer fix only.

Layering remains:

```txt
Component/hook
  ↓
catalogTagService
  ↓
Firestore
```

No component will call Firebase directly.

## Data Model Impact

None.

## Firebase Impact

No schema/rules/index changes.

Runtime read behavior changes from one capped query to one or more paginated queries. This is appropriate for the owner/admin tag management library and duplicate validation path, but it increases reads when the approved tag library is large.

## Security Considerations

No permission changes.

Existing active-staff read and owner/admin write rules remain unchanged.

## Implementation Plan

1. Update `catalogTagService.ts` to remove the hard 1000-result cap for full-library operations.
2. Add a paginated tag query helper that:
   * fetches tags in deterministic pages
   * supports `includeArchived` filtering
   * returns all matching tag documents
3. Use that helper for:
   * `listTags()`
   * `getAllTags()`
4. Preserve existing `sortCatalogTags()` output so UI ordering remains predictable.
5. Run TypeScript, lint, and build checks.

## Files Expected To Change

Implementation files:

* `src/renderer/src/features/designs/services/catalogTagService.ts`

Workflow artifacts:

* `.cursor/workflow/state.md`
* `docs/workflow/reviews/2026-06-30-full-tag-library-pagination-test-report.md`
* `docs/workflow/reviews/2026-06-30-full-tag-library-pagination-signoff.md`

## Tests

Minimum:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Manual QA:

* Open Tag Management after a large tag import.
* Confirm total count exceeds 1000 when applicable.
* Search for `wednesday`.
* Confirm `wednesday` / `wednesday addams` appears if it exists in Firestore and is not archived outside the current view.
* Try bulk importing a duplicate tag known to exist beyond the first 1000 and confirm duplicate rejection is reported.

## Review Gate

Implementation must not start until this plan is approved for the managed phase.
