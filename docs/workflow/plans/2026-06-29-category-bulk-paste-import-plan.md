# Plan: Category Bulk Paste Import

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Command | Managed Phase |
| Roadmap phase | Phase 2 Design Library maintenance / category-management productivity |
| Status | plan — awaiting review approval |

## Goal

Allow owner/admin staff to paste structured JSON for category names and descriptions into Category Management and create multiple categories in one flow, without typing each category manually.

This is a narrow Design Library productivity phase. It must not touch AI Processing, Print Requests, Print Runs, Portal, ecommerce, shipping, payment, Whatnot, or design lifecycle behavior.

## Current Repo State Verified

Repo inspection confirms:

* `categoryService.createCategory()` already owns category creation, validation, uniqueness checks, audit fields, and active-order sequencing.
* `CategoryManagementModal` already owns owner/admin category creation UI.
* No category bulk import flow exists today.
* A one-off external seed script would require separate auth/config handling and would bypass the current in-app category-management workflow.
* The requested import contract can be JSON instead of freeform text, which is easier to validate and safer to import.

Therefore the lowest-friction path is an in-app JSON bulk importer that reuses the existing authenticated service path.

## Target Behavior

1. Owner/admin can open a bulk import panel from Category Management.
2. Staff can paste category JSON in this shape:

```json
[
  {
    "name": "Occasions",
    "description": "Use for designs made for life events, parties, milestones, celebrations, and special moments that are not tied to a specific holiday."
  },
  {
    "name": "Holiday & Seasonal",
    "description": "Use for designs tied to a holiday, season, or seasonal event."
  }
]
```

3. The UI parses and validates the pasted JSON into category name + description pairs before create.
4. The UI shows a preview list and import count before commit.
5. Import creates categories through `categoryService.createCategory()` so existing validation, uniqueness rules, audit fields, and active sequencing remain authoritative.
6. Existing active-name conflicts are surfaced clearly and do not silently overwrite categories.
7. The existing single-category create/edit/archive/restore flows remain available.

## Scope

In scope:

* Add a bulk JSON import entrypoint inside `CategoryManagementModal`.
* Add a pure parser utility under `features/designs/utils/`.
* Preview parsed results before commit.
* Create categories through the existing service path.
* Handle duplicate names in the pasted payload and existing-category conflicts clearly.
* Add targeted parser tests.

Out of scope:

* Firestore scripts or console tooling.
* New backend APIs or Cloud Functions.
* CSV/XLSX upload support.
* Editing or deleting categories in bulk.
* AI/category auto-generation from the pasted JSON.

## Architecture Impact

Keep the existing layer pattern:

```txt
CategoryManagementModal
  ↓
bulk import UI state + JSON parser utility
  ↓
useCreateCategory / categoryService.createCategory
  ↓
Firestore SDK
```

The parsing logic should stay pure and tested. Firestore writes remain service-owned.

## Data Model Impact

No schema change is required.

Reuse the existing category fields:

* `name`
* `description`
* `sortOrder`
* `isActive`
* audit timestamps / user fields

## Firebase Impact

No rules or indexes change is expected.

Write behavior:

* Bulk import should call the existing category create path for each parsed category.
* Category ordering should remain service-owned and contiguous because `createCategory()` already appends active categories correctly.

## Security Considerations

* Bulk import remains owner/admin only.
* Do not put Firestore calls directly in parsing utilities.
* Keep all persistence through `categoryService`.
* Do not add secret handling, service accounts, or external scripts in the renderer.

## UI Considerations

The UI should be clearly secondary to the normal category list:

* Add a compact `Bulk import` action in Category Management for owner/admin only.
* Keep the bulk textarea collapsed/hidden until explicitly opened.
* Show JSON validation and parse preview before commit.
* Show import progress and final success/error summary.
* Keep the modal readable; this should not overwhelm the default category-management workflow.

## Suggested Utility Design

Add a pure parser, for example:

* `parseBulkCategoryJson(input: string): ParsedCategoryInput[]`

Expected behavior:

* Parse only valid JSON.
* Accept a top-level array of objects.
* Require each object to have a non-empty string `name`.
* Require each object to have a non-empty string `description`.
* Reject unknown or unsupported fields so the contract stays strict and predictable.
* Detect duplicate pasted names case-insensitively.
* Return deterministic preview output for tests.
* Produce clear validation errors for malformed JSON or invalid item shapes.

## Suggested Implementation Steps

1. Add pure bulk category JSON parser utility and tests.
2. Add a bulk import section to `CategoryManagementModal`.
3. Parse and preview pasted categories locally before commit.
4. Import sequentially through `createCategory()` and report partial failures honestly.
5. Refresh categories after import and reset the bulk-import form on success.
6. Update docs only if the category workflow needs a bulk-import note.

## Risks

* Pasted JSON may be malformed or the wrong shape.
  Mitigation: validate before import and surface precise JSON/item errors.

* Some pasted categories may already exist.
  Mitigation: surface create failures clearly by category name; do not overwrite.

* Large imports could create noisy modal UX.
  Mitigation: keep the interaction compact and targeted to paste-preview-import only.

## Verification

Required commands after implementation:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Targeted tests to add and run:

```bash
npx tsx src/renderer/src/features/designs/utils/bulkCategoryImport.test.ts
```

Manual verification after implementation:

1. Open Category Management as owner/admin.
2. Open the bulk import panel.
3. Paste valid category JSON.
4. Confirm preview shows the expected category count and name/description pairs.
5. Run import and confirm categories are created without manual typing.
6. Confirm active categories append in contiguous order.
7. Re-run the same import and confirm duplicate/existing-name errors are surfaced clearly without overwriting.
8. Confirm single-category create/edit/archive/restore still work.

## Review Gate

This phase is plan-only. Do not implement until FreshForge review approves this plan.
