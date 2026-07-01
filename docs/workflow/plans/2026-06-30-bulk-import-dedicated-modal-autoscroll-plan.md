# Bulk Import Dedicated Modal And Autoscroll Plan

Date: 2026-06-30

Managed phase: `bulk-import-dedicated-modal-autoscroll`

## Goal

Move category and tag bulk import out of the inline management list panels into dedicated modal views, and make large pasted JSON imports automatically scroll to the parsed count and import action.

## Scope

In scope:

* Bulk category import opens as its own modal view from the Category Management modal.
* Bulk tag import opens as its own modal view from the Tag Management modal.
* Dedicated bulk import views include their own header, scrollable body, and footer/back controls.
* Pasting JSON into the bulk import textarea scrolls the textarea to the end of the pasted text.
* After valid JSON is parsed, the modal body scrolls to the parsed item count and import button.
* Preserve existing JSON validation behavior:
  * categories: strict `{ name, description }`
  * tags: strict `{ name, aliases, preferredWhen }`
* Preserve existing owner-only category bulk import and owner-only tag bulk import behavior.
* Preserve final success/error summaries.

Out of scope:

* No data model changes.
* No Firestore rules, indexes, Functions, or deploy changes.
* No category/tag seed writes outside the approved in-app flow.
* No migration/backfill.
* No changes to approved tag normalization, AI processing, or `designs.tags`.
* No unrelated management-list, filter, Portal, or Phase 7 work.

## Current Repo Findings

* [CategoryManagementModal.tsx](../../../../src/renderer/src/features/designs/components/CategoryManagementModal.tsx) currently renders category bulk import inline through `showBulkImport`.
* [TagManagementModal.tsx](../../../../src/renderer/src/features/designs/components/TagManagementModal.tsx) currently renders tag bulk import inline through `showBulkImport`.
* Both components already keep bulk import state local to the management modal and parse JSON with pure utilities.
* `AutoResizeTextarea` supports forwarded refs, so the bulk import views can imperatively scroll the textarea after paste/change without replacing the shared control.
* `DesignLibraryModal` provides the existing modal shell. To avoid unnecessary nested modal overlays, the bulk import view should be a separate modal mode rendered in the same modal shell, similar to create/edit modes.

## Architecture Impact

Renderer-only UI work in existing Design Library components.

Layering remains:

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

## Firebase Impact

None.

No deploy actions are required or allowed.

## Security Considerations

No permission changes.

Existing gates must remain:

* category bulk import: owner-only UI path
* tag bulk import: owner-only UI/service path
* owner/admin normal category/tag management unchanged
* helpers cannot manage category/tag documents

## UI Plan

### Modal Mode

Extend the management modal editor modes:

* Category: add `bulk-import` mode.
* Tag: add `bulk-import` mode.

When the Bulk import button is clicked:

* clear stale bulk import errors/results
* open the dedicated bulk import modal view
* keep the parent management modal shell open

The dedicated view should include:

* Header: `Bulk import categories` / `Bulk import tags`
* Body: JSON textarea, validation error, parsed count/preview summary, result summary
* Footer: `Back` and `Import categories` / `Import tags`

### Autoscroll

Add refs for:

* bulk import textarea
* modal body
* parsed count/action area

On paste/change:

* update bulk JSON state
* clear stale errors/results
* request an animation frame
* set `textarea.scrollTop = textarea.scrollHeight`

When parsed preview becomes valid:

* request an animation frame
* scroll the parsed count/action area into view within the modal body

This keeps large JSON paste workflows focused on the import count and button.

### Styling

Reuse existing modal and bulk import classes where possible.

Add or adjust CSS only for:

* dedicated bulk import view layout
* count/action anchor alignment if needed

Use semantic tokens only.

## Files Expected To Change

Implementation files:

* `src/renderer/src/features/designs/components/CategoryManagementModal.tsx`
* `src/renderer/src/features/designs/components/TagManagementModal.tsx`
* `src/renderer/src/styles/components/design-library.css` if spacing requires it

Workflow artifacts:

* `.cursor/workflow/state.md`
* `docs/workflow/reviews/2026-06-30-bulk-import-dedicated-modal-autoscroll-test-report.md`
* `docs/workflow/reviews/2026-06-30-bulk-import-dedicated-modal-autoscroll-signoff.md`

## Tests

Minimum automated checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Targeted tests are not expected unless pure utility behavior changes.

## Manual QA Checklist

* Open Category Management as owner.
* Click Bulk import and confirm a dedicated bulk import modal view opens.
* Paste a long valid category JSON array.
* Confirm the textarea scrolls to the end and the parsed count/import button come into view.
* Confirm import still works and final summary appears.
* Confirm Back returns to the category list without losing normal list behavior.
* Open Tag Management as owner.
* Click Bulk import and confirm a dedicated bulk import modal view opens.
* Paste a long valid tag JSON array.
* Confirm the textarea scrolls to the end and the parsed count/import button come into view.
* Confirm import still works and final summary appears.
* Confirm Back returns to the tag list without losing normal list behavior.
* Confirm non-owner users do not gain bulk import access.

## Risks

| Risk | Mitigation |
| --- | --- |
| Nested modal behavior could create focus/overlay issues | Use a modal mode inside the existing management modal shell instead of stacking a second overlay |
| Autoscroll could be jarring on short input | Only scroll after paste/change with non-empty input and when a valid preview/count exists |
| Bulk import state could leak back to list mode | Reset/clear stale bulk result state on modal open and when returning to list as appropriate |
| Import button could move into a footer and lose context | Keep parsed count/result in body and import action in footer or a visible action area, with scroll target near the count/action region |

## Review Gate

Implementation must not start until this plan is approved for the managed phase.
