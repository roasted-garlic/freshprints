# Implementation Review: Portal Staff Artwork neutral projection visibility corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-review.md` |
| Status | **Implemented locally; automated Test complete; DEV QA prepared; Owner DEV QA required** |
| Authorization | Owner accepted the reviewed visibility corrective and authorized Implement → Test → DEV preparation |

## Scope implemented

The Portal request-item mapper now exempts only `staff_artwork` items from the catalog-only
`designId` requirement:

```ts
} else if (!isStaffArtworkItem && !designId) {
```

This preserves the existing customer-upload identity requirement and the existing catalog-design
identity requirement while allowing the approved safe Staff Artwork projection to reach Portal state.
The mapper remains customer-safe: it returns the stable request-item ID, request ID, neutral source,
quantity, requested size, order/status, and timestamps, without Staff Artwork source identity,
title, image/path, DPI, source dimensions, enhancement, or customer metadata.

The mapper was made a named export solely to support a direct pure-mapping regression test; no route,
callable, or other public API was added. The existing Staff Artwork security contract was extended
to assert the guard remains source-specific.

## Corrective files

- `apps/portal/features/print-requests/services/portalPrintRequestService.ts` — source-specific
  mapper guard and test-only named export.
- `apps/portal/features/print-requests/services/portalPrintRequestService.staffArtworkProjection.test.ts`
  — direct Staff Artwork/catalog/upload mapper coverage.
- `tests/firebase/staffArtwork.rules.contract.test.ts` — source guard/privacy contract assertion.

No changes were made as part of this corrective delta to the projection shape, population script/data,
trigger, Rules, Storage Rules, index, Hooks, Detail, card, Current Request drawer, Queue-to-Show,
Staff Artwork library, Assisted Creation, donation/retention behavior, production, staging, commit,
push, freeze, or Signoff.

## DEV preparation boundary

This is a Portal-only source correction. No Functions, Rules, Storage, index, or population deployment
is required. The existing localhost Portal DEV server is listening on `http://localhost:3100` and
returned HTTP 200 after the change; Next development reload will serve the corrected mapper. Owner QA
must use the authenticated localhost Portal against `fresh-prints-dev`.

No Portal App Hosting or production deployment was performed.

## Owner QA gate

Automated Test is complete, but this implementation review does not create Signoff. The owner must
run the failed scenario first and then the full checklist, including neutral Detail/Current Request/
Queue-to-Show visibility, quantity/size/remove/realtime behavior, private-field absence, no direct
Staff Artwork reads, and catalog/upload regressions.

Exact next checkpoint:

> **OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective**
