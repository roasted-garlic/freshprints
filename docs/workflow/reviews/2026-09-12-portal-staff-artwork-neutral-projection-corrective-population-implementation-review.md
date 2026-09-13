# Population Amendment — Implementation Review

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Amendment Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-plan.md` |
| Amendment Review | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-review.md` |
| Authorization | `OWNER ACCEPT BOUNDED DEV PORTAL PROJECTION POPULATION AMENDMENT + AUTHORIZE SCRIPT IMPLEMENTATION` |
| Status | **script implemented; one DEV dry-run complete; APPLY not run** |

## Implemented

- Added `functions/scripts/backfill-portal-print-request-items-dev.ts`
- Added `functions/scripts/backfill-portal-print-request-items-dev.test.ts`

## Contract fidelity

| Requirement | Implementation |
|---|---|
| DEV-only project guard | Resolves `FIREBASE_PROJECT_ID` then `GCLOUD_PROJECT`; accepts only exact `fresh-prints-dev`; fails closed before Admin init |
| No non-dev escape | No `process.env` / `env` non-dev override flag; no production fallback |
| Dry-run default | `APPLY` must be exact `1` to mutate; otherwise `actualWrites = 0` |
| VERIFY | `VERIFY=1` is read-only and rejects combination with `APPLY=1` |
| Shared mapper | Imports and calls `projectPortalPrintRequestItem` only |
| Scope A | Every canonical `printRequestItems` row in the bounded page; no parent/customer/status filters |
| Query | `orderBy("__name__")`, `PAGE_LIMIT` default/max 200, `START_AFTER_ITEM_ID` via snapshot `startAfter`, one page per invocation |
| Classification | `CREATE` / `UPDATE` / `ALREADY_CORRECT` with strict sorted-key equality and Timestamp `toMillis()` |
| Malformed | Dry-run continues with skipped+errors and ID-only reporting; APPLY aborts before any transaction commit |
| Privacy | Staff Artwork forbidden-field assertions; no `staffArtworks` or Storage reads/writes |
| Canonical safety | Writes only `portalPrintRequestItems` for IDs in the current page |

## DEV infrastructure prepared (this turn)

| Asset | Action |
|---|---|
| Additive `portalPrintRequestItems` index (`printRequestId` ASC, `updatedAt` DESC) | Deployed to `fresh-prints-dev` via `firestore:indexes` (no `--force`); present after deploy |
| `onPrintRequestItemPortalProjectionWritten` | Created ACTIVE on `fresh-prints-dev` |
| `updatePortalStaffArtworkPrintRequestItemSize` | Created ACTIVE on `fresh-prints-dev` |
| Firestore Rules | **Not deployed** |
| Storage Rules | **Not deployed** |
| Production | **Untouched** |

## Explicitly not done

- No `APPLY=1`
- No Rules/Storage customer-boundary cutover
- No Owner DEV QA
- No corrective Signoff
- No staging / commit / push / freeze / production action

## Next checkpoint

`OWNER AUTHORIZATION: DEV POPULATE PORTAL PRINT REQUEST PROJECTIONS - APPLY`
