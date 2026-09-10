# User Info Print Request Lifecycle Activity Ordering — DEV Deployment Record

**Date:** 2026-09-09
**Owner authorization:** initial `OWNER AUTHORIZATION: DEV DEPLOY PRINT REQUEST LIFECYCLE HISTORY CORRECTIVE`; follow-up `OWNER AUTHORIZATION: DEV FIRESTORE RULES DEPLOY PRINT REQUEST LIFECYCLE RE-ADD CORRECTIVE`
**Project:** `fresh-prints-dev`
**Production:** untouched
**Result:** DEV backend and Rules corrective deployment complete; stop for Owner DEV re-QA before backfill, reader activation, publish, commit, or push

## Authorized scope

The owner authorized exactly these DEV resources:

1. `functions:onPrintRequestLifecycleRequestWritten`
2. `functions:onPrintRequestLifecycleAllocationWritten`
3. `firestore:rules`
4. `firestore:indexes`

No full Functions deployment was run. No other Function was created, updated, or deleted.
Storage Rules, Portal/Studio hosting or publish, production, data mutation, migration,
backfill (including dry-run), indexed-reader activation, commit, and push were not authorized
and were not performed.

## Preflight and validation

- Checkout: `C:\coding\fresh-prints`, branch `development`.
- Firebase target: `fresh-prints-dev` (verified with `firebase use` and `.firebaserc`).
- Exact reviewed Function exports and trigger source paths were verified before deployment.
- `npm --prefix functions run build`: **PASS**.
- Focused lifecycle tests: **20/20 PASS**.
- Firestore Rules tests: **170/170 PASS** across 22 suites with shell-local Microsoft OpenJDK
  `25.0.4.1` and Firebase CLI `15.26.0`.
- The exact Editing → Active/re-add-after-editing Rules regression passed.
- Targeted lint, index JSON parsing, and `git diff --check`: **PASS**.
- Indexed reader remains disabled:
  `PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED = false`.
- Backfill runner remains source-only and was not invoked; its `APPLY=1` path was not used.
- `storage.rules` had no diff and Storage Rules were not deployed.

## Exact deployment commands and results

```text
firebase deploy --only functions:onPrintRequestLifecycleRequestWritten,functions:onPrintRequestLifecycleAllocationWritten --project fresh-prints-dev
```

Exit code: **0**. Firebase reported **2 Functions Deployed**, **0 Functions Errored**, and
**0 Function Deployments Aborted**. The predeploy Functions build passed.

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Exit code: **0**. Rules compiled and released successfully as:
`projects/fresh-prints-dev/rulesets/1cdf293c-18c7-41b9-a5d4-0595936c0150`.
The release is attached to `projects/fresh-prints-dev/releases/cloud.firestore`.
The CLI emitted existing warning diagnostics only; no lifecycle Rules error occurred.

### Rules corrective deployment — owner-authorized follow-up

The deployed lifecycle mirror exposed a compatibility gap: a staff Editing → Active re-add writes a
full `printRequests` after-image containing the server-maintained
`lastLifecycleActivityAt`, `lastLifecycleActivityEventId`, and `lastLifecycleActivityPrecedence`
fields. The corrective adds those fields to the valid Print Request shape with timestamp/string/
number validation and rejects client changes to them through one affected-keys preservation guard.

Owner authorization: `OWNER AUTHORIZATION: DEV FIRESTORE RULES DEPLOY PRINT REQUEST LIFECYCLE RE-ADD CORRECTIVE`.

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Deployment timestamp: `2026-09-09 19:56:01Z` (`14:56:01 America/Chicago`). Exit code: **0**.
Rules compiled and released successfully as:
`projects/fresh-prints-dev/rulesets/3c7788f8-c023-44cb-8b75-6e9cd9f137df`.
The release is attached to `projects/fresh-prints-dev/releases/cloud.firestore`. Verification
confirmed the target was `fresh-prints-dev`; only `cloud.firestore` was released. No Functions,
indexes, Storage Rules, Portal/Studio hosting, or production surface was included.

```text
firebase deploy --only firestore:indexes --project fresh-prints-dev
```

Exit code: **0**. Firebase reported the indexes deployment complete. No unrelated index
deletion was proposed; existing definitions were skipped and the two lifecycle definitions
were accepted.

## Deployed Function metadata

Metadata was re-checked with `gcloud functions describe --gen2 --region=us-central1`.

| Function | Region/runtime | State | Revision | Traffic | Trigger | Source generation | Build | Source hash |
|---|---|---|---|---|---|---|---|---|
| `onPrintRequestLifecycleRequestWritten` | `us-central1` / `nodejs20` | `ACTIVE` | `onprintrequestlifecyclerequestwritten-00001-cid` | latest revision | Firestore written: `printRequests/{printRequestId}`; Eventarc region `nam5` | `1788981357946412` | `projects/695546728466/locations/us-central1/builds/1cb67094-ea4e-4bf4-a1ac-5dc965194b5e` | `ace50409b93ffed6bec61261c71214648b27da1f` |
| `onPrintRequestLifecycleAllocationWritten` | `us-central1` / `nodejs20` | `ACTIVE` | `onprintrequestlifecycleallocationwritten-00001-zat` | latest revision | Firestore written: `showAllocations/{allocationId}`; Eventarc region `nam5` | `1788981415991378` | `projects/695546728466/locations/us-central1/builds/1cb67094-ea4e-4bf4-a1ac-5dc965194b5e` | `ace50409b93ffed6bec61261c71214648b27da1f` |

Both functions report `allTrafficOnLatestRevision: true`, runtime `nodejs20`, and the reviewed
Firestore document-written event type with retry policy `RETRY_POLICY_DO_NOT_RETRY`.

## Deployed index metadata

Read-only Firestore composite-index verification found the exact requested definitions:

| Collection group | Index ID | Fields | State at verification |
|---|---|---|---|
| `printRequests` | `CICAgNir940K` | `customerId ASC`, `lastLifecycleActivityAt DESC`, `__name__ DESC` | `CREATING` |
| `printRequestLifecycleEvents` | `CICAgPiB5pcK` | `printRequestId ASC`, `occurredAt ASC`, `__name__ ASC` | `CREATING` |

`CREATING` is the expected asynchronous Firestore index-build state immediately after
deployment. The indexed reader remains disabled until the separately authorized mirror
backfill and readiness verification are complete.

## Non-actions and rollback boundary

- No backfill or data mutation was run, including no dry-run.
- No indexed reader flag was enabled.
- No Storage Rules, Portal/Studio hosting, production, or unrelated Function deployment occurred.
- No commit or push occurred.
- If rollback is required, use the existing reviewed Cloud Functions/Rules/index rollback
  conventions under a new owner-authorized checkpoint; no rollback was executed here.

## Owner DEV re-QA checklist

1. Remove an attached Print Request from a show for Editing and confirm the request enters Editing.
2. Make an edit if desired, then re-add the same request to a show and confirm no Firestore
   permission error occurs.
3. Confirm User Info history keeps one card for the logical Print Request.
4. Confirm the re-added PR moves to the top because re-add is its newest lifecycle activity.
5. Confirm Created shows date and time.
6. Confirm Last Updated shows date and time and reflects lifecycle activity rather than raw
   `updatedAt`.
7. Confirm current show context is the newly attached show.
8. Confirm prior show/removal context remains lifecycle history, not the current destination.
9. Confirm Details contains the full lifecycle sequence newest → oldest.
10. Spot-check normal Working → Add to Show.
11. Spot-check Editing → Add/Re-add in both Portal and Studio paths.
12. Spot-check Did Not Print requeue and normal move/requeue behavior.
13. Spot-check request completion and customer/internal distinction.
14. Confirm lifecycle mirror fields remain client-immutable while legitimate Print Request updates
    continue to work.

## Next owner checkpoint

`[NEEDS OWNER DEV RE-QA: PRINT REQUEST LIFECYCLE HISTORY CORRECTIVE]`

Owner DEV re-QA is required before the previously planned backfill checkpoint. Backfill must remain
bounded, checkpointed, non-destructive, DEV-only, and separately reviewed. Do not enable the indexed
reader, claim QA/signoff, publish, commit, or push at this checkpoint.
