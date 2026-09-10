# DEV Deployment Record — Request Lifecycle Trigger Mirror-Only Write Corrective

Date: 2026-09-09 (deployment completed 2026-09-10T04:03:27Z)
Goal: `user-info-print-request-lifecycle-activity-ordering`
Owner authorization: `OWNER AUTHORIZATION: DEV DEPLOY LIFECYCLE REQUEST TRIGGER MIRROR-ONLY WRITE CORRECTIVE`
Project: `fresh-prints-dev`

## Exact deployment

Only the reviewed request lifecycle trigger was deployed:

```text
firebase deploy --only functions:onPrintRequestLifecycleRequestWritten --project fresh-prints-dev
```

Exit code: **0**. Firebase reported **1 Function Deployed**, **0 Functions Errored**, and
**0 Function Deployments Aborted**. The predeploy Functions build passed.

## Post-deploy verification

Read-only `gcloud functions describe --gen2 --region=us-central1 --project=fresh-prints-dev`
verification returned:

| Field | Result |
|---|---|
| Project | `fresh-prints-dev` |
| Function | `onPrintRequestLifecycleRequestWritten` |
| Region | `us-central1` |
| Generation/platform | `GEN_2` |
| Runtime | `nodejs20` |
| State | `ACTIVE` |
| Revision | `onprintrequestlifecyclerequestwritten-00002-fuy` |
| Traffic | 100% on latest revision (`allTrafficOnLatestRevision: true`) |
| Source hash | `819989795f36c99f3cb5552cbbc9183b205ab1a9` |
| Source generation | `1789012937701318` |
| Cloud Build ID | `99d7d386-b9a1-4999-8f04-0f5d0abc8adb` |

The deployed event trigger remains Firestore `printRequests/{printRequestId}` written, with
Eventarc trigger region `nam5` and retry policy `RETRY_POLICY_DO_NOT_RETRY`.

## Validation baseline

- Focused lifecycle/allocation/backfill tests: **14/14 PASS**.
- `npm --prefix functions run build`: **PASS**.
- Targeted ESLint: **PASS**.
- `git diff --check`: **PASS**.
- Indexed reader remains disabled (`PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED = false`).
- Backfill remains complete: 8 mirrored requests, 8/8 coverage, 0 post-apply proposed writes,
  monotonicity PASS, idempotency PASS.
- The two historical duplicate events remain untouched and classified
  `SAFE_TO_LEAVE_AS_HISTORICAL_DUPLICATE`.

## Explicit non-actions

- Additional Functions changed: **NONE**.
- Function deletions: **NONE**.
- Rules deployed: **NO**.
- Indexes deployed: **NO**.
- Storage Rules deployed: **NO**.
- Backfill APPLY rerun: **NO**.
- Data repair or historical-event modification: **NO**.
- Indexed reader enabled: **NO**.
- Studio published: **NO**.
- Portal deployed: **NO**.
- Production touched: **NO**.
- Commit/push: **NO**.

The parent lifecycle goal remains **OPEN** and is not signed off. The next separately authorized
checkpoint is:

`[NEEDS OWNER AUTHORIZATION: ENABLE DEV PRINT REQUEST LIFECYCLE INDEXED READER]`
