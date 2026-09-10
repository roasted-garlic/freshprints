# Owner DEV Re-QA — Studio Editing → Re-add Show Queue Corrective

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Corrective: `studio-editing-readd-show-queue-permissions-corrective`
Deployment evidence: `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-dev-deployment.md`

## Result

Owner DEV re-QA: **PASS**.

The owner verified the deployed Studio workflow:

- Remove from show → Editing works.
- Editing → re-add to show succeeds.
- No `Missing or insufficient permissions` Firestore error occurs.
- The request does not remain `PARTIALLY QUEUED`.
- The request exits `EDITING`.
- Add to Show is no longer incorrectly available after success.
- Studio request, allocation, and queue state reconcile correctly.

Corrective behavior is accepted for DEV. This is a QA result, not parent-goal signoff.

## Scope boundary

No lifecycle backfill was executed. The indexed lifecycle reader remains disabled. No deployment,
Studio publish, Portal deploy, production action, data repair, commit, or push occurred in this QA
checkpoint.

## Next checkpoint

`[NEEDS OWNER AUTHORIZATION: DEV BACKFILL PRINT REQUEST LIFECYCLE ORDER MIRROR]`

The parent lifecycle goal remains open pending the separately reviewed, non-destructive DEV backfill
authorization and subsequent gates.
