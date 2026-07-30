# Portal Print Request Pre-Launch Stability — Amendment 7 Function Deployment Checkpoint

- **Goal:** `portal-print-request-prelaunch-stability`
- **Environment:** `fresh-prints-dev` only
- **Status:** deployment completed by owner and verified; Rules checkpoint pending
- **Approval phrase:** `APPROVE DEV FUNCTION DEPLOY`

Implementation Review 8 approved this checkpoint. The owner subsequently reported completing the
exact narrow deployment below. This recording pass did not redeploy the Function.

## Deployment record

```text
firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev
```

- Project: `fresh-prints-dev`
- Function: `queuePortalPrintRequestToShow`
- Owner-reported result: completed
- Exact deployment exit code: `[NEEDS OWNER CONFIRMATION]`
- CLI success line: `[NEEDS OWNER CONFIRMATION]`
- Owner-reported scope: this Function only
- Production action: none
- Firestore Rules, indexes, Storage Rules, App Hosting, migrations, secrets, and unrelated
  Functions: not part of the owner-reported command or this recording pass

## Read-only verification

`firebase functions:list --project fresh-prints-dev --json` and the Firebase CLI's supported Cloud
Functions v2 metadata response confirm:

- resource:
  `projects/fresh-prints-dev/locations/us-central1/functions/queuePortalPrintRequestToShow`;
- state: `ACTIVE`;
- environment/runtime: `GEN_2` / `nodejs20`;
- entry point: `queuePortalPrintRequestToShow`;
- update time: `2026-07-28T04:36:34.802418735Z`;
- serving revision: `queueportalprintrequesttoshow-00031-wip`;
- all traffic on latest revision: `true`;
- build:
  `projects/695546728466/locations/us-central1/builds/f21fd295-03d7-4efe-9ec7-837ea096672e`;
- resolved source generation: `1785213332317639`;
- Firebase Functions metadata hash: `dc382c86844925389583c7e5e522664cca2d34c9`;
- deployment tool label: `cli-firebase`.

The Function is deployed and healthy enough to serve invocations because its state is active and
all traffic targets the latest revision. The update time is after Amendment 7 implementation and
review. The platform metadata hash is recorded only as metadata; no exact local/deployed
source-byte identity is claimed. The exact owner CLI exit code and success line remain unknown.

## Disposition

The Amendment 7 Function checkpoint is satisfied. Do not redeploy it absent new evidence of a
failed deployment. Owner QA remains paused. Advance only to the separate
`APPROVE DEV RULES DEPLOY` checkpoint.
