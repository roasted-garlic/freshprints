# Tag Bulk Import Duplicate Rejection Summary Plan

Date: 2026-06-30

Managed phase: `tag-bulk-import-duplicate-rejection-summary`

## Goal

Make bulk tag import reject duplicate tags and aliases with an explicit rejected count and per-entry reasons so the pasted JSON can be corrected quickly.

## Current Behavior

Current behavior is partly protective but not user-friendly enough:

* Duplicates inside the pasted JSON are detected by `parseBulkCatalogTagJson()` via payload collision checks.
* When a payload duplicate is found, parsing throws one error and the preview/import stops. No accepted/rejected count is shown.
* Duplicates against existing approved/archived tag records are detected during `catalogTagService.bulkCreateTags()`.
* Existing-record duplicates are returned as per-item failures after import, and the modal can show how many imports succeeded/failed.

## Scope

In scope:

* Reject duplicate tag names and aliases inside the pasted JSON.
* Show how many pasted entries are accepted and how many are rejected before import.
* Show per-entry rejection reasons for duplicates and malformed entries where practical.
* Keep import disabled when all pasted entries are rejected.
* Import only accepted entries when the pasted payload contains a mix of accepted and rejected entries.
* Preserve existing rejection behavior against already-existing tag records and show those failures after import.
* Add or update targeted tests for duplicate payload summaries.

Out of scope:

* No data model changes.
* No Firestore rules, indexes, Functions, or deploy changes.
* No tag seed writes outside the approved in-app flow.
* No migration/backfill.
* No changes to AI tag normalization or `designs.tags`.
* No changes to category bulk import unless separately requested.

## Architecture Impact

Renderer-only utility/component work in the existing Design Library feature.

Layering remains:

```txt
TagManagementModal
  ↓
bulk tag import utility / useCatalogTags
  ↓
catalogTagService
  ↓
Firebase
```

No component will call Firebase directly.

## Data Model Impact

None.

## Firebase Impact

None. No deploy required.

## Security Considerations

No permission changes.

Owner-only bulk tag import must remain owner-only.

## Implementation Plan

1. Add a structured bulk tag import validation helper that can return:
   * accepted normalized tag items
   * rejected entries with index/name/reason
   * fatal JSON-shape errors only for cases that cannot be inspected, such as invalid JSON or non-array root
2. Keep the strict allowed fields: `name`, `aliases`, `preferredWhen`.
3. Treat name/alias collisions inside the pasted payload as rejected entries instead of one fatal preview error.
4. Update `TagManagementModal` to:
   * show accepted count
   * show rejected count
   * list rejected entries and reasons
   * import only accepted entries
   * keep existing post-import failures for existing-library duplicates and service errors
5. Update targeted tests for the new structured duplicate rejection behavior.

## Files Expected To Change

Implementation files:

* `src/renderer/src/features/designs/utils/bulkCatalogTagImport.ts`
* `src/renderer/src/features/designs/utils/bulkCatalogTagImport.test.ts`
* `src/renderer/src/features/designs/components/TagManagementModal.tsx`
* `src/renderer/src/styles/components/design-library.css` if summary styling needs adjustment

Workflow artifacts:

* `.cursor/workflow/state.md`
* `docs/workflow/reviews/2026-06-30-tag-bulk-import-duplicate-rejection-summary-test-report.md`
* `docs/workflow/reviews/2026-06-30-tag-bulk-import-duplicate-rejection-summary-signoff.md`

## Tests

Targeted:

```bash
npx tsx --test src/renderer/src/features/designs/utils/bulkCatalogTagImport.test.ts
```

Full checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Manual QA Checklist

* Paste tag JSON with duplicate names inside the payload.
* Confirm duplicate entries are rejected with a count and reason.
* Paste tag JSON with an alias colliding with another tag name inside the payload.
* Confirm the alias collision is rejected with a count and reason.
* Paste mixed valid and duplicate entries.
* Confirm only valid entries are importable.
* Import entries where some collide with existing library tags.
* Confirm post-import failures show rejected count and reasons.

## Review Gate

Implementation must not start until this plan is approved for the managed phase.
