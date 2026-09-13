# Implementation Review — Staff Artwork image/title/DPI projection amendment

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-review.md` (`approved_with_changes`) |
| Authorization | `OWNER ACCEPT STAFF ARTWORK IMAGE/TITLE/DPI PROJECTION AMENDMENT + AUTHORIZE IMPLEMENT` |
| Status | **implemented locally; DEV Functions + Storage deployed; population DRY RUN complete; APPLY not run** |

## Implemented

### Shared projection allowlist

- Expanded `PortalPrintRequestItem` for Staff Artwork with:
  - `sourceLabel: "Staff-added"`
  - `titleSnapshot`
  - `staffArtworkId`
  - `previewStoragePath` / `thumbnailStoragePath`
  - `widthPx` / `heightPx`
  - optional `artworkBackgroundHex`
- Added `buildStaffArtworkProjectionEnrichment` (explicit allowlist; no broad spread from `staffArtworks`).
- Enrichment prefers live Staff Artwork title/paths/pixels/background; falls back to request `titleSnapshot` when enrichment is missing; **does not drop** the row.

### Synchronizer + refresh

- `functions/src/lib/portalPrintRequestItemProjectionSync.ts` Admin-reads `staffArtworks/{id}` and writes only allowlisted projection fields.
- `onPrintRequestItemPortalProjectionWritten` uses the enriched shared mapper.
- New `onStaffArtworkPortalProjectionRefreshWritten` refreshes attached `printRequestItems` when library docs change (idempotent reproject).

### Portal

- Mapper retains Staff Artwork without requiring `designId`; maps projected title/preview/pixels/background/`staffArtworkId`.
- No Portal `getDoc(staffArtworks/...)`.
- Card restores preview, real title, DPI via `assessPrintRequestItemSize`, size/quantity controls; `Staff-added` is badge only.
- Drawer / Queue-to-Show / detail preview use projected title/preview where appropriate.
- Upscale/enhancement Portal controls **not** restored.

### Storage / Firestore

- Storage: authenticated customers may read only `preview.webp` / `thumbnail.webp` under `/staff-artwork/{id}/`.
- Production/source remain denied to customers.
- Firestore `staffArtworks` remains customer-denied (`get`/`list` staff-only; client writes false).
- Residual risk recorded: signed-in customer who learns another Staff Artwork ID could fetch that preview/thumb (owner-accepted).

### Population script

- DEV-only backfill Admin-reads `staffArtworks` solely to construct enrichment; still dry-run by default; `APPLY=1` required for writes; writes only `portalPrintRequestItems`.

### Index

- **No new composite index required.** Existing `printRequestItems.staffArtworkId` COLLECTION ASCENDING fieldOverride covers the refresh query.

## Exact files (amendment scope)

- `packages/shared/src/types/portal/portalPrintRequestItem.types.ts`
- `packages/shared/src/utils/portalPrintRequestItemProjection.ts`
- `packages/shared/src/utils/portalPrintRequestItemProjection.test.ts`
- `functions/src/lib/portalPrintRequestItemProjectionSync.ts`
- `functions/src/onPrintRequestItemPortalProjectionWritten.ts`
- `functions/src/onStaffArtworkPortalProjectionRefreshWritten.ts` (+ contract test)
- `functions/src/index.ts`
- `functions/scripts/backfill-portal-print-request-items-dev.ts` (+ tests)
- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/portal/features/print-requests/services/portalPrintRequestService.staffArtworkProjection.test.ts`
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` (preview resolver path)
- `storage.rules`
- `docs/architecture/DATA_MODEL.md`
- FreshForge review/test/deploy/dry-run/QA checklist artifacts under `docs/workflow/reviews/`
- `.cursor/workflow/state.md` / `references/project-chatgpt-handoff/CURRENT-STATE.md`

## Explicitly not done this turn

- Population **APPLY**
- Owner DEV QA
- Signoff
- Staging / commit / push / freeze / production
- Parent M0 resume
- Upscale/enhancement Portal controls

## Next checkpoint

`OWNER AUTHORIZATION: DEV REPOPULATE PORTAL PRINT REQUEST PROJECTIONS FOR STAFF ARTWORK FIELDS - APPLY`
