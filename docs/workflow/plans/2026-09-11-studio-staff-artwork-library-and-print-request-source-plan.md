# Plan: Studio Staff Artwork Library and Print Request Source

| Field | Value |
|---|---|
| Date | 2026-09-11 |
| Workflow | FreshForge managed phase |
| Goal | `studio-staff-artwork-library-and-print-request-source` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Status | `ready_for_formal_review` |
| Formal Review | `docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-review.md` |

## Gate and non-negotiable boundaries

This document is a plan only. The current phase is **Plan → Formal Review**. No implementation,
test run that mutates data, Function/Rules/Storage/index deployment, migration or backfill, Studio
publication, commit, push, candidate freeze, or production action is authorized until the owner
accepts this Plan and its Formal Review and then explicitly authorizes Implement.

The parent M0 reconciliation and candidate assembly stay paused until this child reaches
Implement → Test → Owner DEV QA → Signoff. A new parent M0 and a new immutable candidate are
required after Signoff; the current parent candidate must not be frozen or reused.

## Goal and product definition

Add a persistent, Studio-only **Staff Artwork** library for private artwork used on Customer
Requests (CRs) and Internal Requests (IRs). It is a distinct request-artwork entity, not a fourth
catalog workspace, `designs` document, `customerUploads` document, Assisted Creation request, or
Portal library. It is technically processed for print, retained indefinitely until staff archive
or safely delete it, and is never automatically sent to AI or the public catalog.

The Studio sidebar entry is directly below **Design Library**. Imports → AI Review → Design Library
remains the existing three-workspace catalog lifecycle.

## Repository evidence used

| Concern | Current source of truth / finding |
|---|---|
| Sidebar/router | `apps/studio/src/renderer/src/shared/components/Sidebar.tsx` puts Design Library at the top of the catalog group; `apps/studio/src/renderer/src/routes/AppRoutes.tsx` has no Staff Artwork route. |
| Design selection mode | `features/designs/constants/designLibraryFilters.ts`, `DesignLibraryPage.tsx`, `DesignGrid.tsx`, `usePrintRequestSelectionMode.ts`, and `planPrintRequestDesignSelectionWrites.ts` already implement request-selection navigation, multi-select, delta writes, and no default-size replay. |
| Print item source | `packages/shared/src/types/printRequest/printRequest.types.ts`, `printRequestItemSource.ts`, `printAssetResolution.ts`, and `resolveShowExportProductionAsset.ts` currently branch only between `catalog_design` and `customer_upload`. |
| Studio item service/UI | `features/print-requests/services/printRequestService.ts`, `usePrintRequestDetails.ts`, `PrintRequestItemCard.tsx`, `PrintRequestItemsPreviewLightbox.tsx`, `PrintRequestsPage.tsx`, and `buildPrintRequestExportAssets.ts` contain source-aware create/read/size/duplicate/remove/preview/export behavior. |
| Shows and gang sheets | `features/upcoming-shows/services/upcomingShowService.ts`, `buildShowExportAllocationAssets.ts`, `features/gang-sheets/services/gangSheetService.ts`, `useGangSheetBuilder.ts`, and `useGangSheetShowAssets.ts` map and resolve source identities. |
| Technical processing | `functions/src/lib/customerUploadProcessing.ts` exports `processCustomerUploadImageBytes` and `saveCustomerUploadProcessedOutputs`; `functions/src/finalizeCustomerUpload.ts` owns leases/watchdog/status/quota-specific orchestration. |
| Customer search | `features/customers/services/customerService.ts` has owner/admin `listCustomers` and staff `listCustomersForIntakeSearch`; `customerDirectoryVisibility.ts` and `resolveLogicalCustomerIds.ts` classify active/disabled/closed/merged accounts. No existing searchable combobox satisfies this feature; the current request picker is a native select. |
| Safe deletion | `functions/src/lib/customerUploadDeletionEligibility.ts` and `deleteEligibleCustomerUpload.ts` provide a fail-closed manifest/blocker pattern, but inherit customer-upload semantics and must be generalized rather than reused as a Staff Artwork entity. |
| Existing permissions | `features/permissions/types/permission.types.ts` and `permissionService.ts` use `isStaff` for request/design operations and owner/admin for destructive or administrative actions. |
| Firebase boundary | `firestore.rules` protects customer uploads and request-item source identity; `storage.rules` limits private asset reads/writes. `firestore.indexes.json` has no Staff Artwork indexes. |

## Decisions proposed for owner acceptance

These are the four decisions that must be explicit in the Formal Review before implementation:

1. **Portal request truth (recommended):** the Portal may show a neutral, customer-safe row only
   when Staff Artwork is already attached to that customer's own CR. It shows quantity, requested
   size, and a neutral label such as “Staff-added artwork”; it does not show the image, Staff
   Artwork title/description, customer association, Storage path, library route, or private
   metadata. This keeps counts/totals/state truthful while honoring “not on the website” for the
   artwork pixels. If the owner instead requires the row itself to be hidden, that is a separate
   projection/aggregate decision and must be approved before implementation.
2. **Helper selection (recommended):** active helpers may select existing ready, non-archived Staff
   Artwork while editing a request, because they already have `managePrintRequestItems`; only
   owner/admin may upload, edit metadata/association, archive/restore/delete, or Send to AI Review.
   Direct “Upload Artwork” is therefore owner/admin-only in v1.
3. **Names (recommended):** Firestore collection `staffArtworks/{staffArtworkId}` and Storage root
   `/staff-artwork/{staffArtworkId}/` with `source`, `production.png`, optional
   `production.interactive.png`, `preview.webp`, and `thumbnail.webp`. These names are additive and
   independent from `customerUploads` and `designs`.
4. **Merged customers (recommended):** preserve the historical `customerId` and snapshots on
   existing Staff Artwork; include merged source IDs in lookup via `resolveLogicalCustomerIds`, show
   “Merged into …”, and block new associations to a merged source in favor of the survivor. Do not
   mass-rewrite artwork in v1. If the owner requires propagation to the survivor, it must be a
   separately reviewed, idempotent merge-worker change.

## Scope

### In scope after approval

- Studio sidebar route and a Staff Artwork browse/search/filter page with browse and request-selection
  modes.
- Owner/admin upload, metadata edit, searchable Customer association, archive/restore, fail-closed
  hard delete, and manual Send to AI Review.
- Direct Print Request upload that converges on the same Staff Artwork creation/finalization path,
  then attaches the ready asset to the originating CR/IR.
- A third request-item source, `staff_artwork`, carried through sizing, quantity, duplicate/remove,
  enhancement, previews, exports, ZIPs, all gang-sheet modes, show allocation, Internal Gang Sheet,
  completion/history, copy/convert, and staff-only operational readers.
- Reuse/generalization of the current technical customer-upload processor and watchdog/lease
  mechanics without inheriting customer consent, quota, intake, or retention behavior.
- Customer-safe Portal projection only as decided above; no Portal library, browse, search, picker,
  direct upload, or Staff Artwork metadata access.
- Focused automated tests, Rules/Storage emulator coverage, Functions/Studio/Portal verification,
  and required owner DEV QA.

### Out of scope

Automatic AI/catalog publication, customer upload into the Staff Artwork library, Portal Staff
Artwork browsing/searching, public Algolia indexing, customer notifications or permissions,
customer-upload Denied/Excluded retention changes, catalog lifecycle changes, ecommerce, automatic
cleanup, production deployment, migration/backfill, Studio stable publication, candidate freeze,
and production action.

## Data model and storage

### Strongly typed Firestore document

Add `packages/shared/src/types/staffArtwork/staffArtwork.types.ts` with a `StaffArtwork` interface,
`StaffArtworkStatus = "processing" | "ready" | "failed" | "archived"`, and a typed processing
result/error shape. The document should contain:

- `id`, `title`, optional `description`, and immutable `sourceFileName`/`contentType`;
- `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, plus `archivedAt`/`archivedBy` and
  `processingStartedAt`/`processingCompletedAt` where applicable;
- canonical `sourceStoragePath`, `productionStoragePath`, `previewStoragePath`,
  `thumbnailStoragePath`, and optional `interactiveEnhancedProductionStoragePath`;
- source/processed dimensions, `effectiveDpi`, approved max print dimensions, sizing-policy version,
  `wasTrimmed`, `wasUpscaled`, normalization/upscale metadata, and a bounded processing warning;
- optional authoritative `customerId`, `customerDisplayNameSnapshot`, and
  `customerUsernameSnapshot`. Snapshots are for display/history only and never identity authority;
- optional `promotedDesignId`, `promotionStatus`, and promotion timestamps/error (no public customer
  fields); and
- bounded `processingErrorCode`/message safe for Studio display, never arbitrary binary or `any`.

The item source identity is `sourceType: "staff_artwork"` plus `staffArtworkId`; Staff Artwork paths
never live in request items. Request item `titleSnapshot` is a staff display snapshot and must be
scrubbed to a neutral label in the Portal projection.

### Storage contract

Add `packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.ts` with canonical,
fail-closed builders and parsers for:

```text
/staff-artwork/{staffArtworkId}/source
/staff-artwork/{staffArtworkId}/production.png
/staff-artwork/{staffArtworkId}/production.interactive.png
/staff-artwork/{staffArtworkId}/preview.webp
/staff-artwork/{staffArtworkId}/thumbnail.webp
```

Only these manifest fields may be deleted. The source uses the existing customer-upload convention
of a path without an extension and an explicit content type. Storage files are never stored in
Firestore.

### Technical status and failure behavior

Creation writes `processing`; finalization writes `ready` only after all required derivatives and
metadata are present. A failure writes `failed` with a bounded error and leaves a retryable source
and record. An attach race (request locked/deleted while processing) must not delete the ready Staff
Artwork; it reports the attach failure and leaves the reusable asset available. Archive is a soft
state and does not change existing request items.

## Technical processing reuse map

The lowest safe boundary is a neutral processor extracted from
`functions/src/lib/customerUploadProcessing.ts`:

1. Extract `processCustomerUploadImageBytes` internals into a typed
   `processTechnicalArtworkImageBytes` result/options contract. It retains the current validation,
   transparency gate, Sharp conversion, transparent-edge trim, oversized-canvas normalization,
   approved upscale resolver/limits, production PNG, preview WebP, thumbnail WebP, effective-DPI,
   background detection, stage timings, and bounded warnings.
2. Extract `saveCustomerUploadProcessedOutputs` into a path-agnostic
   `saveProcessedArtworkOutputs` helper taking an explicit manifest and content types. The existing
   customer adapter continues to return the current customer-upload result shape.
3. Reuse the current finalize lease/watchdog/retry behavior (`acquireFinalizeLease`, stage watchdog,
   `releaseFinalizeLease`) through a neutral helper or a Staff Artwork adapter. Do not copy customer
   quotas, ownership acknowledgment, catalog consent, intake status, or retention clocks.
4. Staff finalization calls the neutral processor with the same technical quality policy, then writes
   the Staff Artwork manifest/metadata through Admin SDK. Interactive enhanced output is initially
   absent; the existing enhancement path is generalized to create the optional Staff Artwork
   `production.interactive.png` when explicitly requested by a Print Request.

This is a refactor with parity tests, not a second Sharp pipeline. The customer-upload adapter must
retain its current behavior and customer-specific lifecycle.

## Customer association and picker

Use `customerService.listCustomersForIntakeSearch` as the staff-readable source, with a new shared
`apps/studio/src/renderer/src/features/customers/components/SearchableCustomerPicker.tsx` only after
confirming no existing combobox meets the requirement. It searches username/display name/email,
shows enough context to distinguish duplicates, supports `Unassigned`, and returns a `customerId`.
The Staff Artwork page and direct CR upload use this picker; no freeform username is authoritative.

Default picker scope is active, non-guest customers. An explicit “Historical” scope includes
disabled/closed accounts and merged sources for retrieval. New selection of disabled/closed is owner/
admin-only and displays a warning; helpers can select an existing asset but cannot change its
association. Merged sources are lookup aliases only; new association targets the survivor.
Existing artwork retains its ID/snapshots and remains discoverable after disable/close/merge.
Association changes are silent: no customer notification, permission, Portal ownership, or Algolia
record is created.

## Studio UX and routes

### Sidebar/router

- `apps/studio/src/renderer/src/shared/components/Sidebar.tsx`: insert `Staff Artwork` immediately
  after `Design Library`, preserving icon, active state, collapse behavior, and divider conventions.
- `apps/studio/src/renderer/src/routes/AppRoutes.tsx`: add `/staff-artwork` and a protected route.
- New page: `apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx`.
- New route constants/filter parser: `features/staff-artwork/constants/staffArtworkRoutes.ts` with
  `mode=browse|request-selection`, `requestId`, `search`, `customerId`, and `archived`.

### Library

Use existing Design Library grid/card/preview/modal primitives and the request-selection tray. Browse
defaults to ready, non-archived, newest `updatedAt`; archived is an explicit filter. Search is
bounded and private (title/customer/snapshots; description optional), with load-more rather than
public Algolia. Cards show thumbnail, title, Customer/Unassigned, status, DPI/size warning, and
archive state. Owner/admin controls edit, archive/restore, delete preview/apply, and Send to AI
Review; helper controls are selection-only if decision 2 is accepted.

### Staff Artwork selection mode

`Add Staff Artwork` is a separate Print Request action next to the existing `Add designs` action.
It navigates to `/staff-artwork?mode=request-selection&requestId=...`, preserves the originating
request, and uses a Staff Artwork-specific selection hook/service. Only ready, non-archived assets
are selectable by default. Save is a delta against current `staffArtworkId` items, creates only new
items, preserves IDs/quantities/sizes/allocations, and returns/reconciles to the request. Existing
catalog selection behavior remains unchanged.

### Direct upload from a Print Request

`Upload Artwork` is available only to owner/admin. It opens the shared upload/metadata flow with:

- CR: Customer preselected from the request and editable by owner/admin;
- IR: Customer optional, including Unassigned;
- title defaulted from filename, optional description, and no notification/consent checkbox.

The flow creates a Staff Artwork `processing` record, uploads canonical `source`, finalizes through
the shared processor, and atomically attaches the ready asset as a `staff_artwork` item. The library
upload uses the same service. A failed finalization is retryable and never silently creates a broken
request item.

## Third Print Request source contract

Extend `PrintRequestItemSourceType` to `catalog_design | customer_upload | staff_artwork` and add
`staffArtworkId?: string`. Update the source resolver so exactly one source identity is present and
legacy missing `sourceType` still means catalog. Staff Artwork items use the same saved sizing
contract: effective DPI floor 200, warning at 200–299, optimal at 300+, and manual dimensions no
larger than 22 inches. No special policy or default-size replay is introduced.

Every source-aware operation must preserve source identity immutability after create, explicit
quantity/size updates, duplicate/remove semantics, title snapshots, enhancement mode and
pre-enhance dimensions, and source-aware missing-asset errors.

## Complete source-aware impact map

The implementation must inspect and update every applicable branch in this allowlist. Files are
listed explicitly so a later implementation review can prove coverage; no unrelated refactor is
approved.

### Shared types and resolvers

- `packages/shared/src/types/printRequest/printRequest.types.ts`
- `packages/shared/src/types/gangSheet/gangSheet.types.ts`
- `packages/shared/src/types/staffArtwork/staffArtwork.types.ts` (new)
- `packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.ts` (new)
- `packages/shared/src/utils/printRequestItemSource.ts`
- `packages/shared/src/utils/printAssetResolution.ts`
- `packages/shared/src/utils/resolveShowExportProductionAsset.ts`
- `packages/shared/src/utils/showAllocationSourceFields.ts`
- `packages/shared/src/utils/showAllocationAttachmentDisplay.ts`
- `packages/shared/src/utils/printRequestItemSummaries.ts`
- `packages/shared/src/utils/currentRequestAggregates.ts`
- `packages/shared/src/utils/portalShowDesignVisibility.ts` (only for the approved neutral Portal projection)

### Functions/backend

- New: `functions/src/createStaffArtworkUpload.ts`, `finalizeStaffArtwork.ts`,
  `promoteStaffArtworkToAiReview.ts`, `deleteEligibleStaffArtwork.ts`, and typed helpers under
  `functions/src/lib/staffArtwork*.ts`.
- `functions/src/lib/customerUploadProcessing.ts` and `functions/src/finalizeCustomerUpload.ts`
  (neutral extraction with customer adapter parity).
- `functions/src/lib/customerUploadDeletionEligibility.ts` (reuse patterns only; add a separate
  Staff Artwork manifest/blocker helper).
- `functions/src/addPortalCatalogDesignToPrintRequest.ts` (must reject customer-created Staff
  Artwork selection).
- `functions/src/allocateStudioPrintRequestToShow.ts`, `queuePortalPrintRequestToShow.ts`,
  `convertCustomerPrintRequestToInternal.ts`, `copyStudioPrintRequestCore.ts`,
  `duplicatePortalPrintRequestItem.ts`.
- `functions/src/lib/enhancePrintRequestArtworkCore.ts`,
  `setPrintRequestItemArtworkEnhanceModeCore.ts`, `onPrintRequestItemCreated.ts`,
  `onShowAllocationCreated.ts`, portal-admin show queue readers, and `functions/src/index.ts`.

### Studio

- `apps/studio/src/renderer/src/features/permissions/types/permission.types.ts`
- `apps/studio/src/renderer/src/features/permissions/services/permissionService.ts` and focused tests
- `apps/studio/src/renderer/src/shared/components/Sidebar.tsx`
- `apps/studio/src/renderer/src/routes/AppRoutes.tsx`
- New `apps/studio/src/renderer/src/features/staff-artwork/` page/components/hooks/services/utils
- `features/customers/services/customerService.ts` and new shared picker component
- `features/print-requests/services/printRequestService.ts`, `hooks/usePrintRequestDetails.ts`,
  `hooks/usePrintRequestSelectionMode.ts`, `pages/PrintRequestsPage.tsx`,
  `components/PrintRequestItemCard.tsx`, `components/PrintRequestItemsPreviewLightbox.tsx`,
  `utils/buildPrintRequestExportAssets.ts`, and source-aware tests
- `features/upcoming-shows/services/upcomingShowService.ts`,
  `utils/buildShowExportAllocationAssets.ts`, `utils/productionTimerDiagnostics.ts`,
  `utils/showQueueGlanceStats.ts`
- `features/gang-sheets/services/gangSheetService.ts`, `hooks/useGangSheetBuilder.ts`,
  `hooks/useGangSheetShowAssets.ts`
- `features/staff-inbox/services/staffInboxSubscriptionService.ts`

### Portal and production boundary

Only if decision 1 is accepted, update the customer-owned request projection in:

- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`,
  `useWorkingCurrentRequestItems.ts`, `components/CurrentRequestDrawer.tsx`,
  `components/PortalPrintRequestItemCard.tsx`, `app/(app)/requests/[id]/PrintRequestDetailView.tsx`,
  and their source-aware merge/aggregate tests.

Portal must never import the Staff Artwork library/service or read `staffArtworks` documents.
Customer callables (`addPortalCatalogDesignToPrintRequest`, assisted creation, attach/confirm upload)
must reject `staff_artwork` creation/selection. A staff-attached item may pass through queue/production
only after server validation and the neutral customer-safe projection decision.

### Rules and indexes

- `firestore.rules`: add a staff-only `staffArtworks` match (callable/Admin writes; no customer read),
  extend request-item source identity and `gangSheetItemRequiredFieldsValid`/allocation identity
  checks, and keep Portal access limited to the customer’s own request projection.
- `storage.rules`: staff-only read of Staff Artwork; owner/admin source create at canonical `source`
  only; derivative update/delete through Admin SDK; no customer read.
- `firestore.indexes.json`: initially no index change until query profiling. If required, add only
  `staffArtworks(status, updatedAt desc)` and/or `staffArtworks(customerId, status, updatedAt desc)`
  for concrete query shapes, then include them in the parent M0 additive union. Never add indexes
  speculatively in this child.

## Archive, restore, and safe delete

Archive is the normal reversible action. It removes the asset from ordinary browse/selection but
never breaks existing request items or production history; restore returns it to ready browse.

Hard delete is owner/admin-only and requires a fresh server-side preview plus an atomic recheck. It
fails closed when any active or historical `printRequestItems.staffArtworkId`, `showAllocations`,
`gangSheetItems`, production/history dependency, or shared promoted asset references the artwork.
Promotion will copy into catalog-owned paths, so an independently copied Design does not block
deletion; if implementation proves assets are shared, it becomes a blocker. The manifest parser
accepts only the five canonical Staff Artwork paths and deletion removes only those owned objects.
Unexpected/missing paths, partial deletion, or changed references retain the document and report a
recoverable failure; archive remains available.

No scheduled purge or customer-upload 14/30-day retention code may mention `staffArtworks`.

## Manual Send to AI Review

`promoteStaffArtworkToAiReview` is owner/admin-only, explicit, and idempotent under a transaction or
deterministic linkage. It creates/links one catalog Design candidate, copies assets into catalog-owned
paths, records `promotedDesignId`/status, and invokes the existing AI enrichment enqueue. The original
Staff Artwork remains ready and reusable. Repeated clicks return the existing linkage. Customer ID,
username/display snapshots, and any private association are stripped from the Design document,
Algolia payload, and AI prompt. Catalog publication still requires normal AI Review approval.

## Permissions matrix

| Capability | Owner | Admin | Helper | Portal customer |
|---|---:|---:|---:|---:|
| View/browse Staff Artwork in Studio | yes | yes | yes (if selected) | no |
| Select existing ready Staff Artwork for CR/IR | yes | yes | yes (checkpoint) | no |
| Upload/create, including direct PR upload | yes | yes | no | no |
| Edit title/description/customer | yes | yes | no | no |
| Archive/restore | yes | yes | no | no |
| Preview/apply hard delete | yes | yes | no | no |
| Send to AI Review | yes | yes | no | no |
| See private association or library metadata | yes | yes | helper only as needed for selection; no customer association | no |

Implement `viewStaffArtwork`, `selectStaffArtwork`, and `manageStaffArtwork` keys (or the reviewed
equivalent) in `PermissionKey`, `permissionService`, RoleGate, and tests. Server callables and Rules
remain authoritative; UI gates are convenience only.

## Query/index and privacy contract

The first browse query is status + updatedAt with cursor/load-more. Customer filtering is an exact
`customerId` query; text search is bounded client-side over loaded private pages (or a later reviewed
prefix-token query). No Algolia index, public DTO, Portal collection read, or customer notification is
introduced. Existing merged-source lookup is performed through logical-ID expansion, not a public
customer search endpoint.

## Implementation sequence after owner authorization

1. Add shared Staff Artwork types/path manifest and neutral processing/storage helpers with customer
   adapter parity tests.
2. Add callable create/finalize/read/update/archive/restore/delete/promotion contracts, Rules and
   Storage guards, and focused emulator tests.
3. Add Studio permission keys, picker, page, route/sidebar, library CRUD and selection mode.
4. Add third source to request item service/hooks/cards/lightbox/duplicate/remove/enhance and direct
   upload attach transaction.
5. Thread source through show allocation, all export/gang-sheet modes, Internal Gang Sheet, history,
   copy/convert, inbox, and production readers; keep Portal customer creation blocked.
6. Implement only the owner-approved neutral Portal projection, if selected.
7. Add indexes only for proven query shapes; run focused tests, builds, lint, Rules/Storage tests,
   DEV deployment review, and Owner DEV QA. Then Signoff and parent M0 rerun.

## Acceptance criteria for the implementation gate

1. Sidebar places Staff Artwork immediately below Design Library and route is protected.
2. Staff Artwork is absent from Imports/AI Review/Design Library by default and never public-search indexed.
3. Owner/admin can upload from the library and directly from CR/IR with the stated customer defaults.
4. Both upload paths converge on one technical processor with trim/upscale/normalization, DPI,
   production/preview/thumbnail, retry/watchdog, and optional interactive derivative parity.
5. No automatic AI, catalog publication, customer permission, notification, or customer-upload retention clock.
6. Persistent typed record supports title/description/customer assignment/change/clear, browse/search,
   archive/restore, and historical customer retrieval.
7. `staff_artwork` is a third source with exactly-one identity and works in sizing (>=200 DPI, <=22 in),
   quantity, duplicate/remove, enhancement, CR and IR paths, export/ZIP, all gang-sheet modes, show
   allocation, Internal Gang Sheet, completion/history, copy/convert, and staff readers.
8. Selection mode adds only newly selected items, preserves existing intent, and returns correctly.
9. Portal cannot browse/read the library; if the approved projection is used, only the customer’s own
   attached row is shown with neutral metadata and no artwork/private association.
10. Archive never breaks production; delete succeeds only for unreferenced assets and fails closed for
    request/allocation/history/shared-path blockers or unexpected paths.
11. Manual promotion is idempotent, strips private customer data, copies independent catalog assets,
    and leaves Staff Artwork reusable.
12. Existing catalog and customer-upload behavior, retention, sizing, export, Rules, and parent release
    exclusions regress green.

## Test and DEV QA plan

The implementation phase must add/run focused tests for processing parity/failure/retry/watchdog,
manifest/path safety, metadata CRUD, picker and historical/merged identities, permissions, selection
delta writes, direct upload/attach races, source resolution/sizing/duplicate/remove/enhance, CR + IR,
all export and gang-sheet modes, archive/restore/delete blockers, promotion idempotency/privacy,
Firestore/Storage Rules, Portal projection/privacy, and no-retention behavior. Run the repository
Functions build, Studio Vite/typecheck/build, Portal typecheck/build, changed-source lint, targeted
shared/Functions/Studio tests, emulator Rules suite, and `git diff --check`; document any known
baseline failures honestly.

Owner DEV QA is mandatory: upload from library; direct CR and IR upload; picker active/historical/
merged behavior; helper selection versus management denial; archive/restore/delete blocker; request
detail and Portal neutral projection; show allocation/export/Standard + grouped + per-customer
gang sheets; manual AI Review promotion; and no customer notification or public browse.

## Readiness, risk, and rollback

This child changes Functions closure, shared types/resolvers, Studio, possibly Portal, Firestore/
Storage Rules, and possibly indexes. After Signoff the parent must regenerate Function closure,
Rules/Storage hashes, index union, Portal/Studio build-input manifests, config/data disposition, and
the immutable candidate SHA. Any runtime change after a parent freeze invalidates that candidate.

Primary risks are source-branch omissions, accidental Portal path reads, customer identity leakage,
Sharp memory/timeout regressions, deletion of shared assets, and a helper permission expansion.
Mitigations are the explicit allowlist, neutral processor adapter, server-side source validation,
fail-closed manifests, emulator tests, and separate owner checkpoints. Rollback is by reverting the
reviewed runtime candidate; no destructive migration is needed for a new empty collection. Existing
Staff Artwork assets are not created or mutated in this plan phase.

## Exact owner decision requested

Please accept or amend this Plan and Formal Review, and explicitly decide:

- **Portal:** approve the neutral row/no-image projection for Staff Artwork already attached to the
  customer’s own request, or require the separate hidden-row/aggregate design;
- **Helpers:** allow selection of existing ready Staff Artwork while keeping all management/direct
  upload actions owner/admin-only, or keep selection owner/admin-only;
- **Names:** approve `staffArtworks` and `/staff-artwork/{id}/...`, or provide alternatives; and
- **Merged customers:** approve alias-based historical retention/no mass rewrite, or require a
  reviewed survivor-propagation worker.

Then, only if satisfied with the reviewed scope, authorize the next gate with the exact instruction:
**“Accept Plan + Formal Review; authorize Implement.”**
