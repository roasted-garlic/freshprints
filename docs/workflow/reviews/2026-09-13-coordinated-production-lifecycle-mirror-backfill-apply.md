# Production Print Request Lifecycle Mirror Backfill — APPLY and Verification

**Date:** 2026-09-13
**Parent goal:** `coordinated-production-promotion-release-readiness`
**Frozen candidate:** `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
**Project:** `fresh-prints-prod`

## Pre-APPLY gate

- Project verified exactly as `fresh-prints-prod`.
- Runner `functions/scripts/backfill-print-request-lifecycle-ordering-dev.ts` is unchanged from
  the reviewed candidate (object hash `297f5d1eec72f165c38a997f3c6bed45a33c04b5`).
- Both lifecycle Functions are production `ACTIVE`.
- Source inspection confirms the only batch update keys are
  `lastLifecycleActivityAt`, `lastLifecycleActivityEventId`, and
  `lastLifecycleActivityPrecedence`.
- Fresh pre-APPLY dry run reconciled with accepted evidence: 219 scanned, 206 eligible, 203
  proposals, 0 skipped, 0 missing evidence, 0 anomalies, 0 actual writes.

## APPLY result

The existing bounded runner was executed with `FIREBASE_PROJECT_ID=fresh-prints-prod`,
`ALLOW_NON_DEV=1`, and `APPLY=1`. It exited 0 with `dryRun: false` and performed exactly **203**
mirror updates. No customer-sensitive identifiers were captured in evidence.

| Measure | Result |
|---|---:|
| Requests inspected | 219 |
| Reader-eligible | 206 |
| Proposed writes | 203 |
| Actual mirror writes | 203 |
| Eligible requests updated | 190 |
| Skipped | 0 |
| Missing evidence | 0 |
| Malformed/unsafe/anomalous | 0 |
| Errors | 0 |

Only the three approved mirror fields were written. No lifecycle events were created or replayed;
the `printRequestLifecycleEvents` collection remained at 150 documents. No request status, items,
allocations, show state/assignment, queue state, customer identity, artwork, Portal projection,
Auth, settings, secrets, or maintenance state was mutated.

## Mandatory post-APPLY verification

The same runner was immediately rerun in dry-run mode. It exited 0 and reported:

| Measure | Result |
|---|---:|
| Requests inspected | 219 |
| Reader-eligible | 206 |
| Existing mirrors | 219 total |
| Missing mirrors | 0 |
| Proposed writes | 0 |
| Unchanged | 219 |
| Missing evidence | 0 |
| Malformed/unsafe/anomalous | 0 |
| Actual writes | 0 |

Independent verification confirms **206/206 (100%) reader-eligible requests mirrored**. The
indexed User Info query shape (`customerId` equality, `lastLifecycleActivityAt` DESC,
`__name__` DESC) successfully retrieved historical records; no customer identifier is recorded
here. Compatibility fallback is no longer required for missing-mirror coverage, though it remains
available as the documented rollback path.

## Boundary and next gate

Studio remains unpublished; Portal rollout, projection population, final Rules, maintenance
activation, Smart Profile backfill, Algolia reconciliation, and legacy-tag deletion remain
unauthorized.

**Exact next owner checkpoint:** `OWNER QA: PROD STUDIO HISTORICAL PRINT REQUEST HISTORY — PASS`
