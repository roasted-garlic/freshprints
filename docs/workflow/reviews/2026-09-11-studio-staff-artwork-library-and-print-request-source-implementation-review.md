# Implementation Review: Studio Staff Artwork Library and Print Request Source

| Field | Value |
|---|---|
| Date | 2026-09-11 |
| Goal | `studio-staff-artwork-library-and-print-request-source` |
| Phase | Implement → Test complete locally; DEV deployment/Owner QA pending |
| Plan | `docs/workflow/plans/2026-09-11-studio-staff-artwork-library-and-print-request-source-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-review.md` |
| Authorization | Owner accepted the Plan + Formal Review and authorized Implement → Test on 2026-09-11 |
| Production | Untouched; no deploy, migration, commit, push, freeze, or publication |

## Outcome

The accepted Staff Artwork scope is implemented locally. Studio now has a private, staff-only
library backed by `staffArtworks/{staffArtworkId}` and `/staff-artwork/{staffArtworkId}/`. Owners and
admins can upload, process, edit, archive/restore, safely delete, and manually promote artwork to
AI Review. Active staff can browse; helpers can select existing ready, non-archived artwork for a
Print Request but cannot manage the library. Direct request upload is owner/admin-only.

Staff Artwork is a third `staff_artwork` Print Request source with immutable source identity,
persisted print sizing, baseline/enhanced production selection, duplicate/remove behavior, Show
Queue and Internal Gang Sheet propagation, export resolution, and safe historical copying. The
existing customer-upload technical processor and derivative writer are reused with customer quota,
consent, catalog, and retention behavior excluded. Promotion creates an independent catalog-owned
Design without the private customer association or Staff Artwork ID on the Design document; the
Staff Artwork record retains the promotion linkage.

Portal request projections retain quantity, requested size, and request truth but render a neutral
no-image `Staff-added artwork` row. Portal code does not load Staff Artwork documents or Storage
URLs, does not expose title/description/ID/path/customer metadata, and customer duplicate/create
paths reject Staff Artwork. Portal-admin Show Queue readers also return a generic source label and
never resolve Staff Artwork previews.

## Source-branch inventory

This inventory covers the Plan’s explicit source-aware allowlist. “Audited — unchanged” means the
existing branch already gates the source correctly or is intentionally catalog/upload-only; it was
reviewed so the third source cannot enter through a fallback.

### Shared types, identity, sizing, and resolution

- `packages/shared/src/types/printRequest/printRequest.types.ts` — adds `staff_artwork` and
  `staffArtworkId`.
- `packages/shared/src/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types.ts` — adds
  Staff Artwork identity to enhancement responses.
- `packages/shared/src/types/gangSheet/gangSheet.types.ts` and
  `packages/shared/src/types/showAllocation/showAllocation.types.ts` — carry the third source.
- `packages/shared/src/types/staffArtwork/staffArtwork.types.ts` (new) — status, processing,
  association snapshots, derivatives, archive, and promotion metadata.
- `packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.ts` (new) — canonical
  namespace builders/parser/allowlist for source, production, interactive, preview, and thumbnail.
- `packages/shared/src/utils/printRequestItemSource.ts` — source resolver, identity guard, source
  pill, and popularity exclusion.
- `packages/shared/src/utils/printAssetResolution.ts` — Staff Artwork production/interactive paths,
  dimensions, title fallback, and gang-sheet path validation.
- `packages/shared/src/utils/resolveShowExportProductionAsset.ts` — baseline/enhanced Staff Artwork
  export resolution and source-field mapping.
- `packages/shared/src/utils/showAllocationSourceFields.ts`,
  `showAllocationAttachmentDisplay.ts`, `printRequestItemSummaries.ts`, and
  `currentRequestAggregates.ts` — source-aware labels, identity keys, and aggregates.
- `packages/shared/src/utils/portalAdminShowQueueMetrics.ts` — private source identity is counted
  without returning the ID.
- `packages/shared/src/utils/portalShowDesignVisibility.ts` — audited; catalog visibility remains
  catalog-only and no Staff Artwork is added to public visibility.

### Functions and trusted backend paths

- `functions/src/staffArtwork.ts` (new) — owner/admin create + canonical source upload contract,
  finalization, edit/association, archive/restore, fail-closed delete preview/confirm, and manual
  promotion/copy to an independent catalog Design.
- `functions/src/lib/setPrintRequestItemArtworkEnhanceModeCore.ts` — Studio-only Staff Artwork
  baseline/enhanced toggle and optional interactive derivative generation; Portal is denied for this
  private source.
- `functions/src/allocateStudioPrintRequestToShow.ts` and
  `functions/src/queuePortalPrintRequestToShow.ts` — parse and revalidate ready/archived source,
  dimensions, and allocation identity.
- `functions/src/convertCustomerPrintRequestToInternal.ts`,
  `functions/src/lib/copyStudioPrintRequestCore.ts`, `lib/showQueueMove.ts`, and
  `lib/showProductionRecoveryRequeue.ts` — preserve Staff Artwork identity through CR/IR copies,
  moves, requeues, and history.
- `functions/src/duplicatePortalPrintRequestItem.ts` — explicitly rejects Portal duplication of
  Staff Artwork.
- `functions/src/getPortalAdminShowQueueRequestDesigns.ts`,
  `lib/portalAdminDailyShowQueue.ts`, and `lib/portalAdminUpcomingShowQueueDashboard.ts` — generic
  Staff-added source label; no Staff Artwork document or preview lookup.
- `functions/src/index.ts` — exports the six Staff Artwork callables.
- `functions/src/onPrintRequestItemCreated.ts` and `onShowAllocationCreated.ts` — audited; shared
  popularity gate excludes Staff Artwork, so no catalog counts are incremented.
- `functions/src/addPortalCatalogDesignToPrintRequest.ts`, customer-upload attach/confirm paths,
  `customerUploadProcessing.ts`, `finalizeCustomerUpload.ts`, and
  `customerUploadDeletionEligibility.ts` — audited; customer-specific flows do not accept or
  delete Staff Artwork, while the existing neutral processor/writer is reused.

### Studio

- `apps/studio/src/renderer/src/features/permissions/types/permission.types.ts` and
  `services/permissionService.ts` — view/select/manage matrix: active staff view, active staff
  selection, owner/admin management.
- `apps/studio/src/renderer/src/shared/components/Sidebar.tsx` and
  `routes/AppRoutes.tsx` — Staff Artwork navigation and protected route.
- `apps/studio/src/renderer/src/features/staff-artwork/` (new) — browse/search/archive filter,
  owner/admin upload and customer picker, selection mode, preview, edit, archive/restore, delete
  preview/confirm, and manual AI Review promotion.
- `apps/studio/src/renderer/src/features/customers/components/SearchableCustomerPicker.tsx` (new) —
  active/historical customer search, merged display/disable behavior, and Unassigned option.
- Print Request service/page/details hook — Staff Artwork create/read, sizing, source identity,
  direct upload, selection delta, preview, duplicate/remove, and local summary reconciliation.
- Print Request export/lightbox/card paths — Staff Artwork title/preview/dimensions and enhanced
  derivative resolution.
- Upcoming Show and Gang Sheet services/hooks/builders — Staff Artwork allocation hydration,
  production resolution, thumbnails, and source-preserving writes for every sheet mode.
- `features/staff-inbox/services/staffInboxSubscriptionService.ts` — audited; inbox payloads remain
  catalog/upload-only and do not expose Staff Artwork metadata.

### Portal and production boundary

- `apps/portal/features/print-requests/services/portalPrintRequestService.ts` and request detail,
  drawer, card, queue modal, and detail-view components — retain a neutral Staff Artwork row and
  never pass a Staff Artwork ID, title, path, customer association, or image URL to UI.
- Portal detail/current-request hooks — audited; Staff Artwork is not hydrated into a library or
  customer gallery and customer add/duplicate callables remain catalog/upload-only.
- Portal-admin source types and modal — generic `staff_artwork` source label with no preview lookup;
  no private identity is returned.

### Rules and indexes

- `firestore.rules` — staff-only Staff Artwork reads, denied direct collection writes, selectable
  ready-only request creation, ready/archived historical allocation/update validation, immutable
  source identity, and gang-sheet source checks.
- `storage.rules` — staff-only reads; owner/admin canonical `source` upload only; derivatives and
  deletion remain Admin-SDK paths.
- `firestore.indexes.json` — additive Staff Artwork status/updatedAt and customer/status/updatedAt
  query indexes.
- `tests/firebase/staffArtwork.rules.contract.test.ts` — static privacy and namespace contract.

## Review findings

- Source propagation is present across request, allocation, production/export, gang-sheet, copy,
  requeue, enhancement, Portal projection, and Portal-admin reader branches.
- The private association is retained as `customerId` plus display/username snapshots. New
  associations reject merged source customers; disabled/closed historical records remain discoverable;
  no mass rewrite is performed.
- Delete is fail-closed on request/allocation/gang-sheet references and unexpected non-canonical
  paths. Archive/restore is the reversible fallback.
- No Functions, Firestore Rules, Storage Rules, index, Portal hosting, Studio publication, or other
  DEV infrastructure deployment was performed.

## Gate disposition

Implementation and automated Test are complete locally. This review does **not** sign off the child
or authorize deployment. The next required checkpoint is an explicit owner-approved DEV deployment
allowlist followed by Owner DEV QA. Parent M0, candidate freeze, production promotion, migration,
commit, and push remain paused and separately gated.
