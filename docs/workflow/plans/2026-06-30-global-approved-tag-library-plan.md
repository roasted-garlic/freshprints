# Plan: Global Approved Tag Library

| Field | Value |
|-------|-------|
| Date | 2026-06-30 |
| Command | Managed Phase |
| Roadmap phase | Phase 5 maintenance / catalog organization hardening, supporting Phase 6 catalog request workflows |
| Status | plan - awaiting review approval |

## Goal

Convert catalog tags from uncontrolled freeform strings into a global, category-independent approved tag library with Tag Management UI, owner-only bulk JSON import, alias matching, AI tag normalization, and AI Review handling for suggested new tags.

This phase hardens catalog organization. It must not nest tags under categories, add category hints, migrate existing design tags, auto-create approved tags from AI, deploy Firebase Functions, or expand into Portal, Print Runs, ecommerce, checkout, shipping, marketplace, or customer Studio access.

## Current Repo State Verified

Repo inspection confirms:

* Designs currently persist `tags: string[]`; `designService` normalizes design tags with lowercase, trim, dedupe, max 20, and max 40 characters.
* There is no global `tags` collection or tag service today.
* `CategoryManagementModal` already provides the closest UI pattern for management modals and owner-only bulk JSON import.
* `permissionService.canManageCategories()` is owner/admin; recent category bulk import additionally uses `permissionService.isOwner()`.
* `firestoreCollectionService` and `FIRESTORE_COLLECTIONS` centralize collection access and do not yet include `tags`.
* AI Processing loads categories server-side through `aiEnrichmentRuntimeCache`, parses simple AI output in `simpleCatalogEnrichmentResponse.ts`, and currently normalizes AI tags through `normalizeAiTags`.
* `DesignAiSuggestions` lives in `shared/types/ai/aiProcessing.types.ts` and currently supports `tags?: string[]` but no `suggestedNewTags`.
* AI Review seeds Final Catalog Information from persisted `aiSuggestions` through `createAiReviewDraftFromDesign`.
* AI Review approval currently updates design metadata first, then calls `catalogApprovalService.approveDesignForCatalog`.
* Firestore rules block client mutation of `aiSuggestions`, `aiAnalysis`, and `aiProcessingStage`; Cloud Functions own AI output writes.
* The request referenced `docs/project/DATA_MODEL.md`, but this repo's canonical data model is `docs/architecture/DATA_MODEL.md`.

## Product Decisions For This Phase

1. Tags are global and category-independent.
2. Tags do not live under categories and must not include `categoryHints`.
3. Design documents keep the existing shape: `tags: string[]`.
4. Existing design tags are not migrated or backfilled in this phase.
5. AI must prefer approved tag names and aliases, resolve aliases to canonical approved names, cap approved tags at 8, and place useful unmatched candidates in `aiSuggestions.suggestedNewTags`.
6. AI must never create approved tag documents automatically.
7. Owner/admin can manually create, edit, and archive approved tags.
8. Bulk tag JSON import is owner-only.
9. Suggested new tag approval in AI Review is owner/admin only, matching catalog approval and tag-management permissions. Helpers may continue to view/edit design tags where current design edit permissions allow it, but they cannot approve new global tags.
10. Archived tags remain on historical design documents and remain searchable as existing design tag strings, but archived tags are hidden from new tag pickers, AI approved-tag context, and bulk import conflict-free candidates.

## Target Data Model

Add Firestore collection:

```txt
tags
```

Document ID:

* Derived from normalized canonical tag name, using a stable slug compatible with Firestore document IDs.
* The service must reject writes if the normalized ID would be empty or invalid.

Shared type:

```ts
export type CatalogTagStatus = "approved" | "archived";

export interface CatalogTag {
  id: string;
  name: string;
  aliases: string[];
  preferredWhen: string;
  status: CatalogTagStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SuggestedNewTag {
  name: string;
  aliases: string[];
  preferredWhen: string;
  reason?: string;
  source?: "ai";
}
```

Extend `DesignAiSuggestions`:

```ts
suggestedNewTags?: SuggestedNewTag[];
```

Rules:

* `CatalogTag.name` is canonical, lowercase, trimmed, non-empty, and max 40 characters to stay compatible with design tag storage.
* `CatalogTag.aliases` are lowercase, trimmed, deduped, non-empty, and max 40 characters each.
* `CatalogTag.preferredWhen` is trimmed, required for manual create/import/approval, and should remain operational guidance rather than category placement.
* Approved and archived tags share the same uniqueness namespace so an archived tag name or alias cannot be reused silently.

## Scope

In scope:

* Add shared tag types.
* Add `tags` collection constants and collection helper access.
* Add service-owned tag CRUD, archive, bulk import validation, alias matching, and canonical resolution.
* Add Tag Management button near Category Management in Design Library.
* Add Tag Management modal similar to Category Management.
* Owner/admin manual create/edit/archive for tag name, aliases, and preferredWhen.
* Owner-only bulk JSON import for the flat seed shape:

```json
[
  {
    "name": "skeleton",
    "aliases": ["bones", "ribcage", "skeletons"],
    "preferredWhen": "Use when a skeleton, bones, ribcage, or skeletal character is a main searchable part of the design."
  }
]
```

* Strict import preview with success/error rows before write.
* AI enrichment server-side approved-tag loading and alias-to-canonical normalization.
* AI Review display and action support for suggested new tags.
* Suggested tag edit-before-approve flow.
* Optional add-to-current-design behavior after approving a suggested tag.
* Design Library tag filter behavior that prefers approved tags for picker/search display while keeping existing design tag search/filter working.
* Firestore rules, indexes if needed, and docs updates.
* Targeted tests for normalization, collision detection, import validation, AI coercion, and AI Review suggested-tag approval utilities.

Out of scope:

* Category-specific tags, category hints, or nested tag subcollections.
* Migrating or backfilling existing `designs.tags`.
* Replacing `designs.tags: string[]` with references.
* AI auto-creating approved tag documents.
* Customer Portal tag browsing.
* Print Request, Print Run, ecommerce, checkout, shipping, marketplace, or customer Studio changes.
* Production Firebase deploys without explicit human approval.
* Relaxing security rules.

## Architecture Impact

Renderer layer:

```txt
Design Library / AI Review components
  |
  v
hooks
  |
  v
catalogTagService
  |
  v
Firestore SDK
```

Functions layer:

```txt
AI pipeline
  |
  v
runtime cache loads approved tags
  |
  v
approved-tag resolver normalizes provider output
  |
  v
Cloud Function writes aiSuggestions.tags + aiSuggestions.suggestedNewTags
```

Planned files:

* `shared/types/catalogTag.types.ts`
* `src/renderer/src/features/designs/types/catalogTag.types.ts` as a renderer re-export if existing feature-local imports need it
* `src/renderer/src/features/designs/services/catalogTagService.ts`
* `src/renderer/src/features/designs/hooks/useCatalogTags.ts`
* `src/renderer/src/features/designs/components/TagManagementModal.tsx`
* `src/renderer/src/features/designs/utils/catalogTagNormalizer.ts`
* `src/renderer/src/features/designs/utils/bulkCatalogTagImport.ts`
* `functions/src/ai/catalogTagResolver.ts`
* `functions/src/ai/catalogTagResolver.test.ts`

Use existing shared UI components and modal patterns. Do not add dependencies.

## Permission Model

| Action | Owner | Admin | Helper |
|--------|-------|-------|--------|
| Read approved tags | Yes | Yes | Yes |
| Assign approved tags to designs | Yes | Yes | Yes |
| Create/edit/archive tags manually | Yes | Yes | No |
| Bulk import tags | Yes | No | No |
| Approve AI suggested new tag | Yes | Yes | No |
| Ignore/reject AI suggested new tag for current design | Yes | Yes | No |

Implementation:

* Add `permissionService.canManageTags(user)` as owner/admin.
* Add `permissionService.canBulkImportTags(user)` as owner-only.
* Reuse `canApproveDesignForCatalog` / `canManageAiReview` for AI Review suggested-tag approval unless implementation needs a clearer `canApproveSuggestedTags`.

## Firebase Impact

Firestore rules:

* Add `match /tags/{tagId}`.
* Read: active staff.
* Create/update: owner/admin.
* Delete: false.
* Validate required fields, audit fields, `status in ["approved", "archived"]`, string arrays for aliases, and immutable `id`, `createdBy`, `createdAt`.
* Rules cannot fully prove cross-document alias uniqueness; service-level validation must own collision checks.

Indexes:

* No composite index is expected for the first implementation if the service reads the tag library with a bounded collection query and sorts client-side.
* Add indexes only if implementation introduces server-side filtered/ordered tag queries that require them.

Deploy:

* Firestore rules deploy is required before production use, but must stop for human approval.
* Functions deploy is required for production AI tag normalization changes, but must stop for human approval.

## Tag Normalization And Collision Rules

Add pure utilities that:

* Normalize names and aliases by trimming, lowercasing, collapsing repeated whitespace, and rejecting empty values.
* Enforce max 40 characters for names and aliases.
* Dedupe aliases.
* Remove aliases equal to the canonical tag name.
* Reject duplicate canonical names.
* Reject aliases that collide with any existing canonical tag name.
* Reject aliases that collide with aliases on another tag.
* Reject duplicate names or alias collisions inside a single bulk import payload before any write.
* Map any candidate string to a canonical tag name when it matches either an approved tag name or alias.

Collision checks should include archived tags so archived library history is not accidentally forked.

## Tag Management UI

Add a `Tags` or `Tag Management` button near the existing `Categories` control in Design Library.

The modal should support:

* Search by tag name, alias, and preferredWhen.
* Active and archived views.
* Create tag.
* Edit tag fields.
* Archive tag.
* Owner-only bulk import panel.
* JSON textarea with strict shape validation.
* Preview of valid rows and row-level errors.
* Clear partial-failure summary after import.

UI should follow the existing Category Management style: dense, bordered, token-based, keyboard-accessible, no direct Firebase calls from components.

## AI Pipeline Integration

Add server-side approved tag loading with runtime cache similar to categories:

```txt
loadCachedApprovedTags()
```

The cache should load `tags` where `status == "approved"` and expose:

* canonical names
* aliases
* preferredWhen
* lookup by normalized name/alias

AI prompt and resolver behavior:

* Pass the approved tag library into the prompt in a compact format. If the library is too large, prefer post-processing as the authority and keep prompt context bounded.
* Keep the AI prompt focused on approved tags first.
* Parse provider `tags` as candidate strings.
* Resolve approved candidates through name/alias lookup.
* Cap approved `aiSuggestions.tags` at 8.
* Put unmatched useful candidates into `aiSuggestions.suggestedNewTags`, normalized to the `SuggestedNewTag` shape.
* Deduplicate suggested new tags against approved names and aliases.
* Never write `tags/{tagId}` from the AI pipeline.

Development provider should emit deterministic data that exercises both approved tags and suggested new tags in tests without fabricating production behavior.

## AI Review Suggested New Tags

Update AI Review so suggested new tags appear separately from approved AI tags.

Planned behavior:

1. AI Suggestions panel shows approved tags from `aiSuggestions.tags`.
2. Suggested New Tags panel shows `aiSuggestions.suggestedNewTags`.
3. Owner/admin can ignore a suggested tag for the current design.
4. Owner/admin can edit name, aliases, and preferredWhen before approval.
5. Approval creates a `tags/{tagId}` document through `catalogTagService`.
6. After approval, owner/admin can add the canonical tag name to the current draft's tag list.
7. Ignored/rejected suggested tags are removed from current local review state; persisted ignore state may be avoided unless the implementation needs it before approval.

If a suggested tag approval collides with a tag created by another staff member, the UI should show the service error and allow the reviewer to re-edit or use the existing approved tag.

## Design Library Tag Filter Behavior

Do not break existing search/filter:

* Existing design cards and details continue to render `design.tags`.
* Existing design tag filtering continues to match design document strings, including legacy/freeform tags.
* The tag filter modal should prefer approved tags for label/search metadata when possible, but still include legacy tags found on matching designs so existing catalog discovery does not disappear.
* Archived approved tags should not be suggested for new selection, but designs already containing those strings remain searchable/filterable.

## Documentation Impact

Update after implementation:

* `docs/architecture/DATA_MODEL.md` - add `tags` collection and `DesignAiSuggestions.suggestedNewTags`.
* `docs/architecture/FIREBASE.md` - add collection/service/rules notes and deploy checkpoint.
* `docs/standards/SECURITY.md` - document tag management permissions and AI non-auto-create rule.
* `docs/WORKFLOWS.md` - document Tag Management and AI Review suggested-tag approval.
* `docs/project/DECISIONS.md` - add ADR for global approved tag library, global/category-independent tags, design tags staying string arrays, and AI suggested-new-tag approval requirement.

## Implementation Steps

1. Add shared types and collection constants/helpers.
2. Add tag normalization, alias matching, collision detection, and bulk import parser utilities with tests.
3. Add `catalogTagService` CRUD/archive/bulk helper methods.
4. Add hooks and Tag Management modal/button in Design Library.
5. Add Firestore rules validation for `tags`.
6. Extend AI shared suggestions type with `suggestedNewTags`.
7. Add functions-side tag resolver and runtime cache loading.
8. Integrate resolver into the AI enrichment pipeline and development provider.
9. Update AI Review suggestions UI and approval flow for suggested new tags.
10. Update Design Library tag filter to merge approved-library metadata with existing design tag strings.
11. Update docs and ADR.
12. Run targeted tests and full local checks.

## Risks

* Alias collision bugs could create ambiguous search behavior.
  Mitigation: centralize collision checks in pure utilities and service validation; test names, aliases, archived tags, and import payload collisions.

* AI prompt context may become too large as the library grows.
  Mitigation: post-processing resolver remains authoritative; prompt context can be compacted or bounded without changing persisted data.

* Existing freeform tags may not exist in the approved library.
  Mitigation: no migration in this phase; Design Library still shows and filters legacy design tag strings.

* Firestore rules cannot enforce alias uniqueness across documents.
  Mitigation: service checks and deterministic document IDs; production access remains staff-only.

* Suggested tag approval can race with another staff member approving the same tag.
  Mitigation: deterministic IDs and service collision errors; UI reports conflict and allows using existing tag.

## Verification

Targeted tests to add/run:

```bash
npx tsx src/renderer/src/features/designs/utils/catalogTagNormalizer.test.ts
npx tsx src/renderer/src/features/designs/utils/bulkCatalogTagImport.test.ts
npx tsx functions/src/ai/catalogTagResolver.test.ts
npx tsx src/renderer/src/features/ai-review/utils/suggestedNewTags.test.ts
```

Existing relevant tests to run if touched:

```bash
npx tsx src/renderer/src/features/designs/utils/designTagNormalizer.test.ts
npx tsx src/renderer/src/features/ai-review/utils/aiReviewFormState.test.ts
npx tsx functions/src/ai/simpleCatalogEnrichmentResponse.test.ts
```

Required full checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Manual QA:

1. Owner can open Tag Management, create/edit/archive tags, and bulk import valid JSON.
2. Admin can create/edit/archive tags but cannot see/use bulk import.
3. Helper can view/assign tags according to existing design edit permissions but cannot manage the tag library.
4. Duplicate tag names and alias collisions are blocked with clear errors.
5. AI enrichment resolves aliases to canonical approved tags and caps approved tags at 8.
6. AI suggested new tags appear separately in Needs Review.
7. Owner/admin can edit and approve a suggested new tag, then add it to the current design draft.
8. Owner/admin can ignore/reject a suggested new tag for the current design.
9. Existing Design Library tag search/filter still works for legacy design tag strings.
10. Light and dark theme checks cover Tag Management and AI Review suggested-tag UI.

Production checkpoints not run automatically:

* `firebase deploy --only firestore:rules`
* `firebase deploy --only functions`
* Authenticated production smoke of AI tag normalization

## Review Gate

This phase is plan-only. Do not implement until FreshForge review approves this plan.
