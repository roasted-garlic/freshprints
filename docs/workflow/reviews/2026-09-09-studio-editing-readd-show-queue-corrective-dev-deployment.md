# DEV Deployment Record — Studio Editing → Re-add Show Queue Corrective

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Corrective: `studio-editing-readd-show-queue-permissions-corrective`
Environment: `fresh-prints-dev`
Owner authorization: `OWNER AUTHORIZATION: DEV DEPLOY STUDIO EDITING RE-ADD SHOW QUEUE CORRECTIVE`

## Scope and preflight

The authorized deployment inventory was exactly:

- `functions:allocateStudioPrintRequestToShow`
- `firestore:rules`

Preflight confirmed branch `development`, Firebase target `fresh-prints-dev`, the exact callable
export, no Storage Rules/index deployment requirement, and no data repair/backfill or indexed-reader
activation. `npm --prefix functions run build` passed, the full Rules suite passed **174/174**, and
`git diff --check` passed (normal CRLF warnings only). No callable or Rules source changed after
that validation.

## Function deployment

Command:

```text
firebase deploy --only functions:allocateStudioPrintRequestToShow --project fresh-prints-dev
```

Exit code: **0**. Firebase reported **1 Function Deployed**, **0 Functions Errored**, and **0
Function Deployments Aborted**; no other Function was proposed or changed.

Verified deployed state:

| Field | Value |
|---|---|
| Function | `allocateStudioPrintRequestToShow` |
| Project | `fresh-prints-dev` |
| Region | `us-central1` |
| Platform / generation | `GEN_2` |
| Runtime | `nodejs20` |
| Entry point | `allocateStudioPrintRequestToShow` |
| State | `ACTIVE` |
| Revision | `allocatestudioprintrequesttoshow-00001-lod` |
| Traffic | 100% on latest revision (`allTrafficOnLatestRevision=true`) |
| Source hash | `ef932a1c115c0867c783692dcd4cbb089ac51125` |
| Source object | `allocateStudioPrintRequestToShow/function-source.zip` (generation `1788987946722533`) |
| Build | `d8792439-788f-463b-a1ab-1d42cdf0f65d` |

## Firestore Rules deployment

Command:

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Exit code: **0**. The Rules source compiled successfully and was released to `cloud.firestore` as:

`projects/fresh-prints-dev/rulesets/bc9e3e7a-6597-4228-8aa7-e9f006388a26`

Prior DEV Firestore release:

`projects/fresh-prints-dev/rulesets/3c7788f8-c023-44cb-8b75-6e9cd9f137df`

The deployed source retains lifecycle mirror and lifecycle-event client immutability, the narrow
staff `editing → active` activation path, and existing customer/staff authority boundaries. No
Storage Rules were deployed.

## Explicit non-actions

- Additional Functions: **none**
- Function deletions: **none**
- Firestore indexes: **not deployed**
- Storage Rules: **not deployed**
- Parent lifecycle Functions: **not redeployed**
- Lifecycle backfill: **not executed**
- Indexed lifecycle reader: **unchanged/disabled**
- Manual data repair: **not executed**
- Studio publish: **not performed**
- Portal deploy: **not performed**
- Production: **untouched**
- Commit: **no**
- Push: **no**

## Owner DEV re-QA checklist

Owner should run the authorized local DEV Studio workflow: remove a multi-item request from a show
for Editing, re-add it, and confirm no permissions toast, full allocation, no `PARTIALLY QUEUED`,
active/non-Editing status, immediate Add to Show/totals/show updates, and Queue visibility. Then
spot-check Portal edit-mode exit and Portal unqueue→requeue, normal Working→Add to Show, lifecycle
history/card timestamps/current destination/previous removal, newest→oldest Details activity, and
failure reconciliation without a hard refresh. Owner response: **PASS**, **FAIL**, or **PASS WITH
NOTES**.

## Owner DEV re-QA result

Owner DEV re-QA returned **PASS** (2026-09-09) for the deployed corrective. The owner verified:

- remove from show → Editing works;
- Editing → re-add to show succeeds without a Firestore permission error;
- the request does not remain `PARTIALLY QUEUED` or `EDITING`;
- Add to Show is no longer incorrectly available; and
- Studio state reconciles correctly after the operation.

The corrective behavior is accepted. This closes the corrective’s DEV re-QA checkpoint only; it
does not sign off the parent lifecycle goal.

Next checkpoint:

`[NEEDS OWNER AUTHORIZATION: DEV BACKFILL PRINT REQUEST LIFECYCLE ORDER MIRROR]`
