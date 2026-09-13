# Portal Staff Artwork neutral projection visibility corrective plan

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase — corrective Plan |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Trigger | Owner DEV QA **FAIL**: Staff Artwork row absent from Portal after safe-projection cutover |
| Status | **investigation complete; Plan/Formal Review only; owner acceptance required before implementation** |
| Environment | `fresh-prints-dev` read-only evidence; production untouched |

## 1. Gate and boundary

This plan addresses the Owner DEV QA failure in the already populated and rules-cutover DEV
environment. It is limited to investigation, a narrow Portal mapper corrective design, and Formal
Review. It does not implement code, deploy Portal or Functions, rerun population APPLY, mutate DEV
or production data, change Rules/indexes/Storage, stage, commit, push, freeze, or sign off the goal.

The approved privacy contract remains unchanged: remove Staff Artwork source identity and metadata
from the customer boundary, but retain the customer-safe request item identity and request truth.

## 2. Read-only end-to-end evidence

The following exemplar was inspected in `fresh-prints-dev` using Admin SDK reads only. The identifiers
shown are request/request-item identities permitted by the approved Portal contract; no private Staff
Artwork source identifier, title, path, customer association, or pixel metadata is recorded.

| Stage | Result for `printRequestItems/e2zYqAJHGCEua1CjtJrL` in request `TQS4twylUafCbpz5Z2rL` |
|---|---|
| Canonical item | Exists; `sourceType` is `staff_artwork`; safe request values include quantity `1`, requested size `10.50 × 9.03 in`, `sortOrder` `7`, and status `pending` |
| Matching projection | Exists at the same item ID |
| Projection shape | Exact safe keys: `id`, `printRequestId`, `sourceType`, `sourceLabel`, `quantity`, `printWidthInches`, `printHeightInches`, `sizeLabel`, `sortOrder`, `status`, `addedBy`, `createdAt`, `updatedAt` |
| Shared projection mapper | `projectPortalPrintRequestItem()` returns non-null and produces the same safe key set, including `id` and `printRequestId` |
| Portal query | `portalPrintRequestItems` filtered by `printRequestId` and ordered by `updatedAt desc` returned the exemplar (six rows for the inspected request) |
| Trigger/backfill | The five current DEV canonical Staff Artwork items each had a matching safe projection; the live trigger and completed bounded population are not the disappearance point |

The Portal source tree contains no `staffArtworks`, `/staff-artwork/`, `staffArtworkId`, or Staff
Artwork preview resolver/read path. The projection index contains the required
`printRequestId ASC, updatedAt DESC` fields, and the deployed customer read boundary is not the
cause of this failure.

The current DEV copy is the neutral label `Staff-added`, following the earlier owner-directed copy
change from `Staff-added artwork`. That wording difference is independent of the disappearance: the
approved privacy contract permits a neutral label, and this corrective does not rewrite the already
populated projection label. If the latest QA expectation requires the literal wording
`Staff-added artwork`, owner acceptance must explicitly add that separate copy/projection decision;
it is not silently folded into this mapper-only visibility fix.

## 3. Exact root cause and disappearance stage

The item disappears in `apps/portal/features/print-requests/services/portalPrintRequestService.ts`,
inside `mapPrintRequestItem()`:

```ts
if (isUploadItem) {
  if (!customerUploadId) throw new Error('Print request item data is incomplete.');
} else if (!designId) {
  throw new Error('Print request item data is incomplete.');
}
```

The safe Staff Artwork projection deliberately has no `designId` and no `staffArtworkId`. Its
`sourceType` is correctly `staff_artwork`, but the unconditional non-upload `designId` requirement
still treats it as a catalog item and throws. The list, subscription, and multi-request readers
catch mapper errors and `flatMap` the item out of the returned array. Therefore:

1. Firestore query/subscription receives the projection.
2. Portal mapper throws on the missing catalog-only `designId`.
3. The reader silently drops that one item.
4. Detail, working Current Request, and Queue-to-Show receive no Staff Artwork row.

`PortalPrintRequestItemCard`, `CurrentRequestDrawer`, and `PortalQueueToShowModal` already contain
neutral Staff Artwork branches, but they cannot render a row that the service discarded. No UI
component returns `null` for this item; the loss is upstream in the service mapper.

## 4. Smallest corrective change

After owner acceptance, change only the catalog identity guard in
`apps/portal/features/print-requests/services/portalPrintRequestService.ts` so the `designId`
requirement applies to catalog items, not Staff Artwork:

```ts
} else if (!isStaffArtworkItem && !designId) {
```

The existing Staff Artwork return branch then emits the stable customer-safe `id`,
`printRequestId`, `sourceType: "staff_artwork"`, optional neutral label, quantity, requested size,
order/status fields, and timestamps. No `staffArtworkId` is reintroduced. Unknown/legacy non-Staff
Artwork non-upload items still require `designId`, and customer-upload validation is unchanged.

No change is proposed to `usePrintRequestDetail.ts`, `useWorkingCurrentRequestItems.ts`,
`PrintRequestDetailView.tsx`, `PortalPrintRequestItemCard.tsx`, `CurrentRequestDrawer.tsx`, or
`PortalQueueToShowModal.tsx`; their existing paths preserve and render the item once the mapper
keeps it. No change is proposed to the shared projection mapper, trigger, callable, Rules, Storage,
index, or population script.

## 5. Focused implementation/test scope

Expected files after a later owner-authorized Implement gate:

- `apps/portal/features/print-requests/services/portalPrintRequestService.ts` — one guard change;
  make `mapPrintRequestItem` a named pure export only if required for direct unit coverage (no
  public route/API is added).
- `apps/portal/features/print-requests/services/portalPrintRequestService.staffArtworkProjection.test.ts`
  — direct mapper contract for Staff Artwork, catalog, and customer-upload fixtures.
- `tests/firebase/staffArtwork.rules.contract.test.ts` — extend the existing static Portal boundary
  contract to assert the Staff Artwork mapper bypasses catalog `designId` validation while neutral
  card/detail/drawer/queue branches remain present.

The direct mapper test must prove a safe Staff Artwork projection maps without throwing and keeps:
`id`, `printRequestId`, `sourceType`, neutral label, quantity, requested width/height, size label,
sort order, status, and timestamps. It must prove the result has no Staff Artwork ID/title/path,
image/DPI/source dimensions, enhancement, customer association, or private metadata. Catalog and
customer-upload fixtures must retain their existing identity/title behavior and validation.

The focused Portal source contracts must also prove:

1. `listPrintRequestItems`, `subscribePrintRequestItems`, and `listPrintRequestItemsForRequests`
   query the projection by `printRequestId` and do not apply a `designId` filter;
2. mapper errors are no longer raised for valid Staff Artwork projections, so the item remains in
   the returned list;
3. detail renders the card with the neutral branch;
4. Current Request uses the same item ID for quantity/remove and neutral drawer presentation;
5. Queue-to-Show derives remaining quantity from the retained item and neutral label; and
6. quantity, trusted size, remove, realtime refresh, catalog, and upload behavior remain wired to
   existing paths.

Because this repository uses no-DOM-rendering contracts for these Portal surfaces, source contracts
plus pure mapper tests are the local automated proof; the same complete manual DEV checklist must be
repeated after the later deploy/localhost step.

## 6. Acceptance coverage and Owner DEV QA

After implementation and local tests, the owner must re-run the existing DEV QA checklist with the
failed scenario first, then the complete regression set:

- canonical item and projection remain present with the safe identity/`printRequestId`/quantity/
  size/order/status fields;
- detail, Current Request drawer, and Queue-to-Show all show `Staff-added artwork`;
- quantity edit, valid size edit, trusted invalid-size rejection, remove, realtime refresh, and
  truthful totals/queue behavior work;
- no `staffArtworks` Firestore read and no `/staff-artwork/...` Storage read occurs;
- no image, title, source ID, Storage path/URL, DPI, source dimensions, enhancement, customer
  association, or private Staff Artwork metadata appears; and
- Catalog Design and Customer Upload rows retain existing behavior.

No Signoff may be created from automated tests alone. The exact Owner QA response remains
`OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - PASS`, `FAIL`, or
`PASS WITH NOTES`.

## 7. Population, Rules, index, and deployment impact

This is **Outcome A: runtime rendering/query mapper defect only**. Existing DEV projections already
have the correct shape and the query/index prerequisites are satisfied. Do not rerun the bounded
population script or APPLY; no projection fields changed. The live projection trigger remains
correct for items created or changed after the original population.

No Firestore Rules, Storage Rules, or index change is required. The customer-safe item ID remains the
only item identity used by Portal mutations. The corrective is a Portal source change only; after
owner-authorized implementation and local tests, use the existing localhost DEV QA checkpoint. No
Portal App Hosting or production deployment is part of this plan.

## 8. Rollback and security boundary

The change is a one-condition mapper correction. If local tests or Owner DEV QA fail, revert that
condition in the uncommitted development worktree; do not broaden the fix by restoring
`staffArtworkId`, source reads, image resolution, or private metadata. No data rollback is needed
because no projection shape or data operation changes.

## 9. Exact next owner decision

This plan is ready for Formal Review but does not authorize implementation. The exact checkpoint is:

> **OWNER ACCEPT PORTAL STAFF ARTWORK PROJECTION MAPPER VISIBILITY CORRECTIVE + AUTHORIZE IMPLEMENT**

After implementation and automated Test, stop for the existing Owner DEV QA checkpoint. Do not
rerun population APPLY, deploy Rules/Storage/indexes, sign off, stage, commit, push, freeze, or touch
production under this plan.
