# Portal Admin Daily Show Queue — DEV Function Deployment Checkpoint

**Date:** 2026-09-09
**Project:** `fresh-prints-dev`
**Production:** untouched
**Owner QA:** **FAIL** — corrective is local; stop before Owner DEV re-QA

## Authorization and scope

The owner explicitly authorized this DEV-only deployment:

`getPortalAdminDailyShowQueue`

Exactly one reviewed callable Function was deployed. No Portal App Hosting, Studio,
production, Rules, Storage Rules, indexes, migrations, backfills, data mutations, role
changes, commits, or pushes were authorized or performed.

## Preflight

- Checkout: `C:\coding\fresh-prints`
- Branch: `development`
- Firebase target: `fresh-prints-dev` (verified with `firebase use`)
- Production selected: NO
- Export mapping: `functions/src/index.ts` exports `getPortalAdminDailyShowQueue`
- Reviewed source: no material source expansion since Implementation Review; the changed
  source/test set matches the reviewed implementation.
- Firestore Rules: unchanged and not deployed.
- Storage Rules: unchanged and not deployed.
- Indexes: unchanged and not deployed.
- Migration/backfill: none added or run for this goal; pre-existing repository artifacts were
  not executed.
- `git status --short`, `git diff --stat`, `git diff --name-only`, and `git diff --check` were
  inspected before deployment. No unrelated source changes appeared.

## Validation before deploy

- Portal/auth/admin focused tests: **41/41 PASS**
- Functions/shared focused tests: **13/13 PASS**
- Targeted ESLint: **PASS**
- Portal typecheck: **PASS**
- Functions build immediately before deploy (`npm --prefix functions run build`): **PASS**
- `git diff --check`: **PASS**
- Portal production build: known Windows `EPERM` failure opening `apps/portal/.next/trace`,
  unchanged from the documented baseline; no deployment blocker for this Functions-only scope.

## Exact deployment

```text
firebase deploy --only functions:getPortalAdminDailyShowQueue --project fresh-prints-dev
```

Exit code: **0**. Firebase reported **1 Functions Deployed**, **0 Functions Errored**, and
**0 Function Deployments Aborted**. No additional Function was created, updated, or deleted.

## Mechanically observed deployed state

| Field | Value |
|---|---|
| Firebase project | `fresh-prints-dev` |
| Function | `getPortalAdminDailyShowQueue` |
| Environment | Gen 2 |
| Region | `us-central1` |
| Runtime | `nodejs20` |
| State | `ACTIVE` |
| Revision | `getportaladmindailyshowqueue-00001-nux` |
| Traffic | `allTrafficOnLatestRevision: true` (latest revision receives intended traffic) |
| Firebase source hash | `5e3bc0dd475716fb130e3a622d1000286a071532` |
| Source object | `getPortalAdminDailyShowQueue/function-source.zip` |
| Source generation | `1788962165055408` |
| Cloud Build | `projects/695546728466/locations/us-central1/builds/36219047-9e6c-4813-bbc7-fceda1fcdb73` |

The revision and source values were re-checked with `gcloud functions describe` after the
deploy. No credentials, tokens, emails, or secrets are recorded here.

## Authorization smoke and privacy

No safe existing authorized owner/admin identities or repository live-auth harness were
available for an authenticated callable invocation. No Firebase users or roles were fabricated
or changed. The live owner/admin/denial smoke is therefore deferred to Owner DEV QA.

The deployed source contract remains identifier-free and privacy-preserving: it returns no show,
allocation, Print Request, customer, design, upload, or lineage IDs; no email, filename, artwork,
Storage URL/path, auth metadata, or arbitrary Firestore document. Customer-upload rows remain
the generic label `Customer upload`. Source-level authorization and privacy tests remain green.

## Owner DEV QA checklist

Test locally against `fresh-prints-dev` at `http://localhost:3100/admin/show-queue` and respond
`PASS`, `FAIL`, or `PASS WITH NOTES`.

1. Owner sign-in reaches the admin Show Queue.
2. Admin sign-in reaches the admin Show Queue.
3. The `America/Chicago` operational day is correct.
4. Today's show(s) appear correctly.
5. Multiple same-day shows render separately.
6. Refresh works without overlapping repeated requests.
7. Helper cannot access the admin route/data.
8. Customer cannot access admin data and normal Portal remains usable.
9. Guest is sent through login and cannot load admin data.
10. The admin page omits Current Request, customer navigation/sidebar, Upload Artwork,
    Add to Request, Add to Show, Account Settings, and customer mutation surfaces.
11. Request names/types are correct.
12. Customer labels are appropriate.
13. Internal Requests are labeled correctly.
14. Quantities are correct.
15. Dimensions/size labels are correct.
16. Canceled history is visibly distinct.
17. Split rows remain separate.
18. Requeued/moved rows show neutral origin labels.
19. Customer-upload items display only `Customer upload`.
20. No production mutation controls appear.
21. The page is comfortable on a phone-sized viewport.

## Owner DEV QA failure and corrective disposition

Owner DEV QA result is preserved as **FAIL**. The authenticated admin shell rendered, but the queue
stayed indefinitely in `Refreshing…` / `Loading today’s queue…`. DEV logs show the deployed
callable returning HTTP 200 in approximately 0.3–1.3 seconds, so the request and server-side
queries settle successfully.

The exact root cause was the Portal hook\'s mount guard: `mountedRef` started `true`, but cleanup
set it to `false` without re-arming it during the next effect setup. A development remount left
the live instance permanently unable to apply `.then`, `.catch`, or `.finally` state updates.

The Portal-only corrective re-arms the guard and uses a small load controller with regression
coverage for success, empty response, failure, refresh success/failure, and duplicate coalescing.
Portal source changed: YES. Function source changed: NO. Shared source changed: NO. The existing
DEV Function revision remains valid; **no Function redeployment is required** and a local Portal
restart is sufficient for re-QA. No Rules, indexes, production, data, role, commit, or push action
occurred.

## Rollback and next checkpoint

This Function is read-only. If defective, do not mutate data, widen Rules, deploy unrelated
correctives, or delete the Function automatically. Record the deployed revision and use existing
Cloud Functions rollback/deployment conventions only under a separately reviewed instruction.

`[NEEDS OWNER DEV RE-QA: PORTAL ADMIN DAILY SHOW QUEUE]`

Owner DEV QA **FAIL** is recorded; managed-goal signoff has not been recorded. Re-QA must verify
the same checklist after restarting the local Portal.
