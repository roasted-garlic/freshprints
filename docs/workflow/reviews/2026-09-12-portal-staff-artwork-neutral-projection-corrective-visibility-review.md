# Formal Review: Portal Staff Artwork neutral projection visibility corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Review type | Corrective Plan/Formal Review only after Owner DEV QA FAIL |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-plan.md` |
| Verdict | **`approved_with_changes` — implementation-ready after explicit owner acceptance; no implementation authorized by this review** |
| Environment | `fresh-prints-dev` read-only evidence; production untouched |

## Review boundary

The owner reported **`OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - FAIL`**:
an item visible in Studio was absent from the same Portal Print Request after the safe-projection
cutover. The approved contract is still a visible neutral `Staff-added artwork` row with request
item identity, quantity, requested size, and minimum state; private Staff Artwork identity and
metadata remain forbidden.

This review covers the investigation and a narrow corrective plan only. No runtime code was changed,
no population APPLY was rerun, no DEV/production data was mutated, no deployment or Signoff was
performed, and no staging, commit, push, freeze, or production action occurred.

## 1. Investigation verdict

A read-only Admin SDK probe of `fresh-prints-dev` traced exemplar request item
`printRequestItems/e2zYqAJHGCEua1CjtJrL` in request `TQS4twylUafCbpz5Z2rL`:

- the canonical item exists and is `sourceType: "staff_artwork"`;
- the matching `portalPrintRequestItems` document exists at the same customer-safe item ID;
- its exact safe shape includes `id`, `printRequestId`, `sourceType`, `sourceLabel`, quantity,
  requested width/height, `sizeLabel`, `sortOrder`, status, and timestamps;
- `projectPortalPrintRequestItem()` returns non-null with that same safe shape; and
- the Portal projection query (`where printRequestId`, `orderBy updatedAt desc`) returns the item.

The current five DEV Staff Artwork canonical items all had matching projections. The projection
index and customer Rules boundary are therefore not the disappearance point. The Portal source tree
contains no direct Staff Artwork Firestore or Storage read path.

The current DEV neutral label is `Staff-added`, reflecting the earlier owner-directed copy change
from `Staff-added artwork`. This does not affect row visibility or privacy. The latest QA wording
`Staff-added artwork` is therefore recorded as a separate copy/projection decision: if that literal
string is required, owner acceptance must explicitly include it rather than changing the populated
projection implicitly during this mapper-only corrective.

## 2. Exact root cause

`apps/portal/features/print-requests/services/portalPrintRequestService.ts` correctly recognizes
`sourceType === "staff_artwork"`, but then applies this catalog-only requirement:

```ts
} else if (!designId) {
  throw new Error('Print request item data is incomplete.');
}
```

A safe Staff Artwork projection has no `designId` by design. The mapper throws, and the readers in
`subscribePrintRequestItems`, `listPrintRequestItems`, and `listPrintRequestItemsForRequests` catch
the error and omit the item from their `flatMap` result. `useWorkingCurrentRequestItems` and
`usePrintRequestDetail` consequently receive no row; Detail, Current Request, and Queue-to-Show
never reach their already-correct neutral render branches. This is a runtime mapper defect, not a
projection-shape defect.

## 3. Corrective decision

The reviewed smallest change is:

```ts
} else if (!isStaffArtworkItem && !designId) {
```

This exempts only valid Staff Artwork projections from the catalog `designId` check. Catalog
documents without a design ID remain invalid; customer-upload validation is unchanged. The returned
Staff Artwork item continues to use only the customer-safe item ID and request fields. No
`staffArtworkId`, title, image, Storage path, DPI, source dimensions, enhancement metadata, or
customer association is restored.

The existing shared projection mapper, trigger, population script, Rules, Storage, index, hooks,
Detail, card, drawer, and Queue-to-Show branches require no behavioral change for this defect.

## 4. Population and infrastructure disposition

This is **Outcome A — runtime rendering/query mapper defect only**:

- existing DEV projection documents already contain the required fields;
- no projection shape or mapper output changed;
- the trigger has the correct mapper-driven write path for post-population items;
- population must **not** be rerun and no new APPLY checkpoint is needed for this corrective;
- Firestore Rules, Storage Rules, and indexes require no changes; and
- no Portal App Hosting or production deployment is authorized.

## 5. Test and QA review

The plan’s focused tests are sufficient when implemented:

1. pure Portal mapper test proves a safe Staff Artwork projection maps without `designId`, retains
   request item ID/`printRequestId`/quantity/requested size/order/status/timestamps, and excludes
   every private Staff Artwork field;
2. catalog and customer-upload fixtures preserve their existing validation and identity/title
   behavior;
3. query/source contracts prove projection reads remain keyed by `printRequestId` and ordered by
   `updatedAt`, with no design-ID filter;
4. neutral Detail, Current Request, and Queue-to-Show source contracts remain wired;
5. quantity, trusted size, remove, realtime, and truthful total/queue paths continue using the
   customer-safe item ID; and
6. existing no-private-read and Rules/Storage contracts remain green.

The complete Owner DEV QA checklist must be repeated after implementation and local validation,
including the original failed scenario first. Automated tests cannot create Signoff without Owner
DEV QA.

## Verdict and exact next owner decision

**Verdict: `approved_with_changes` — the corrective plan is implementation-ready after explicit owner
acceptance.** The failure is precisely localized to one catalog identity guard in the Portal service.
No population, Rules, index, Storage, or privacy-boundary change is warranted.

The exact next owner decision is:

> **OWNER ACCEPT PORTAL STAFF ARTWORK PROJECTION MAPPER VISIBILITY CORRECTIVE + AUTHORIZE IMPLEMENT**

After implementation and automated Test, stop for:

> **OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective**

No Signoff, deployment, population APPLY, staging, commit, push, freeze, or production action is
authorized by this review.
