# DEV Deployment Record — Owner QA Correctives

**Goal:** `pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake`  
**Parent:** `coordinated-production-promotion-release-readiness`  
**Date:** 2026-09-11  
**Environment:** `fresh-prints-dev` only  
**Source under test:** branch `development`, base `HEAD` `7c775233e05a2eae65cc4b3c519d2b62a1736b16`; corrective implementation remains in the dirty, uncommitted working tree. This is not a candidate freeze or release SHA.

## Source reconciliation

The accepted corrective implementation changed Portal/Studio client source and the following
backend paths:

* `confirmCustomerUploadsAndAttachToRequest` consumes the updated shared confirmation patch for
  the Portal denial/retention path.
* `excludeCustomerUploadFromCatalog` writes the staff-Excluded retention episode timestamp.
* `restoreCustomerUploadCatalogEligibility` exits the retention episode.
* `respondToCustomerUploadCatalogPermissionFollowUp` applies Denied Ask Again/Allow/Decline
  retention transitions.
* `purgeExpiredCustomerUploadCatalogRetention` and its scheduled export implement the reviewed
  bounded Denied + staff-Excluded retention path and reuse the safe-delete blockers.

The existing follow-up request/context exports were already active in DEV and were not changed.
`deleteEligibleCustomerUpload` only exposes helpers for scheduler reuse; the manual hard-delete
exports were not deployed as part of this QA allowlist. `firestore.rules` and `storage.rules` have
no source changes and were not deployed.

## Exact DEV Functions deployment

Command used (explicit allowlist; no broad Functions deploy and no `--force`):

```text
firebase deploy --project fresh-prints-dev --only functions:confirmCustomerUploadsAndAttachToRequest,functions:excludeCustomerUploadFromCatalog,functions:restoreCustomerUploadCatalogEligibility,functions:respondToCustomerUploadCatalogPermissionFollowUp,functions:purgeExpiredCustomerUploadCatalogRetention,functions:purgeExpiredCustomerUploadCatalogRetentionScheduled
```

Deployment completed with six Functions deployed and zero errors. Post-deploy Gen 2 verification:

| Function | State | Revision |
|---|---|---|
| `confirmCustomerUploadsAndAttachToRequest` | ACTIVE | `confirmcustomeruploadsandattachtorequest-00029-vip` |
| `excludeCustomerUploadFromCatalog` | ACTIVE | `excludecustomeruploadfromcatalog-00013-xad` |
| `restoreCustomerUploadCatalogEligibility` | ACTIVE | `restorecustomeruploadcatalogeligibility-00012-qay` |
| `respondToCustomerUploadCatalogPermissionFollowUp` | ACTIVE | `respondtocustomeruploadcatalogpermissionfollowup-00002-qow` |
| `purgeExpiredCustomerUploadCatalogRetention` | ACTIVE | `purgeexpiredcustomeruploadcatalogretention-00001-coh` |
| `purgeExpiredCustomerUploadCatalogRetentionScheduled` | ACTIVE | `purgeexpiredcustomeruploadcatalogretentionscheduled-00001-tiy` |

## Firestore indexes

`firebase deploy --project fresh-prints-dev --only firestore:indexes` created exactly the two
reviewed additive `customerUploads` composites. Both reached `READY`:

1. `purpose ASCENDING`, `catalogReviewStatus ASCENDING`, `catalogExclusionReason ASCENDING`,
   `createdAt DESCENDING`, `__name__ DESCENDING` — resource
   `projects/fresh-prints-dev/databases/(default)/collectionGroups/customerUploads/indexes/CICAgNj4_4gK`.
2. `catalogReviewStatus ASCENDING`, `catalogRetentionStartedAt ASCENDING`, `__name__ ASCENDING`
   — resource
   `projects/fresh-prints-dev/databases/(default)/collectionGroups/customerUploads/indexes/CICAgLjyuogK`.

No Firestore Rules or Storage Rules deployment was performed; the index deploy only compiled the
existing Rules file as part of Firebase validation.

## Local DEV runtimes

* Portal `.env.local` resolves `NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev`. The stale local
  `next start` process that returned HTTP 500 was stopped and replaced with the repository command
  `npm run dev:portal`; the new Next dev server is listening on `localhost:3100` and returned HTTP
  `200` for `/` after compiling the current working-tree source.
* Studio `.env.local` resolves `VITE_FIREBASE_PROJECT_ID=fresh-prints-dev`. The existing Vite DEV
  server is listening on `localhost:5173` and served the current `CustomerUploadIntakeSection.tsx`
  module (including the Denied/Excluded implementation). No stable Studio publication occurred.
* No separate shared-package rebuild is required for these local Vite/Next workspace aliases; the
  accepted Test gate already passed Functions build, Portal typecheck, and Studio Vite build.

## Scheduler safety

Firebase created the DEV Cloud Scheduler job
`firebase-schedule-purgeExpiredCustomerUploadCatalogRetentionScheduled-us-central1`. Because the
scheduled handler executes non-dry-run cleanup, the job was immediately paused without invoking it.
Current state is `PAUSED`, schedule `every 24 hours`, timezone `America/Chicago`, with no recorded
attempt. The callable remains deployed for a separately authorized controlled dry-run; no cleanup,
fixture, backfill, or other data operation was run.

## Owner QA checkpoint

DEV is prepared for the owner to verify:

* empty Editing request recovery and first replacement design/artwork;
* Studio atomic add with truthful errors, no duplicate, and Portal live visibility;
* Denied list/count, Ask Again, Allow, second Decline, no third request, and Restore guard;
* Excluded list/Restore separation;
* retention timestamp semantics using existing controlled fixtures only (no cleanup execution).

This record does not constitute Owner QA, child Signoff, candidate freeze, production deployment, or
production data authorization. Production was not touched.
