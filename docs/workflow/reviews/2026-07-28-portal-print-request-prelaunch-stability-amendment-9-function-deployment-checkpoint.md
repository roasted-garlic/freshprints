# Portal Print Request Pre-Launch Stability — Amendment 9 Function Deployment Checkpoint

- **Goal:** `portal-print-request-prelaunch-stability`
- **Environment:** `fresh-prints-dev` only
- **Status:** deployment completed by owner; verified; owner QA reopened
- **Approval phrase:** `APPROVE DEV FUNCTION DEPLOY`

Implementation Review 10 is `APPROVED`. The owner reported completing the exact deployment below.
This verification pass did not redeploy the Function.

## Exact authorized command after approval

```text
firebase deploy --only functions:listPortalAllocatableShows --project fresh-prints-dev
```

This deploys only `listPortalAllocatableShows`, whose Amendment 9 change retains the existing
lower-bounded query and restores just-finished terminal shows as calendar inspection data.

## Deployment record

- Command:
  `firebase deploy --only functions:listPortalAllocatableShows --project fresh-prints-dev`
- Project: `fresh-prints-dev`
- Function: `listPortalAllocatableShows`
- Owner-reported result: completed
- Exact deployment exit code: `[NEEDS OWNER CONFIRMATION]`
- Exact Firebase CLI success message: `[NEEDS OWNER CONFIRMATION]`
- Owner-reported scope: this Function only
- Production action: none

## Read-only verification

Firebase Functions and Cloud Run v2 metadata confirm:

- state: `ACTIVE`;
- runtime: `nodejs20` / Gen 2;
- update time: `2026-07-28T16:32:40.92569Z`;
- active/latest ready revision: `listportalallocatableshows-00018-fuj`;
- latest created revision: `listportalallocatableshows-00018-fuj`;
- traffic: `100%` to `TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST`;
- routes/configuration conditions: succeeded;
- source generation: `1785256306430892`;
- Firebase metadata hash: `17c9e08742f374372cfc656b0947077a1676d123`;
- deployment-tool label: `cli-firebase`.

The update time is after Amendment 9 implementation and review. The platform metadata verifies an
active latest revision, but does not prove byte identity with the local source. No broad Functions
deployment is inferred from this single-resource metadata; the narrow scope is owner-reported.

## Excluded

- all other Functions;
- Firestore Rules and indexes;
- Storage Rules and CORS;
- App Hosting;
- migrations, backfills, secrets, and environment changes;
- production.

Amendment 9 contains no new Rules change and requires no Rules deployment. The Function checkpoint
is satisfied. Resume only the reduced owner QA in Plan Section 27.5.
