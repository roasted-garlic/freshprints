# Checkpoint: Portal Design Issue Reporting — production backend deployment (Phase D)

Date: 2026-08-03
Approved production merge SHA: `ab2d4675f0915a7658bb112d29b7985c3dcb42fb` (verified: `origin/production` matched exactly before any deploy command ran)
Project: `fresh-prints-prod`

## Verdict: PASS

## Scope verification (Phase D1)

Confirmed exact reporting diff against the last-known-deployed production state (`fe8c4f0`, the
commit `docs/standards/DEPLOYMENT.md` records as the last documented production deployment
baseline):

- **Firestore Rules** (`firestore.rules`): exactly one added block —
  `match /designIssueReports/{reportId} { allow read: if isStaff(); allow create, update, delete:
  if false; }` plus three fully-denied support-collection matches
  (`designIssueReportIntents`, `designIssueReportOpenGuards`, `designIssueReportDailyQuotas`). No
  other line changed.
- **Firestore indexes** (`firestore.indexes.json`): exactly two new composite index definitions
  added for `designIssueReports` (`status ASC + createdAt DESC`; `status ASC + resolvedAt DESC`).
  No existing index definition altered or removed.
- **Functions** (`functions/src/index.ts`): exactly two new exports —
  `submitPortalDesignIssueReport`, `resolveDesignIssueReport`. No other export line changed.

## Predeployment verification (Phase D2) — all run against exact commit `ab2d467`

| Check | Result |
|---|---|
| Root dependency install (`npm ci`) | exit 0 |
| Functions dependency install (`npm ci --prefix functions`) | exit 0 |
| Functions build | exit 0 |
| Reporting shared/validation/containment tests | **18/18 pass** (`designIssueReportContract.test.ts`, `formatDesignIssueReportSubmitter.test.ts`, `designIssueReportValidation.test.ts`, `firestoreRouteContainment.test.ts`) |
| Firestore/Storage Rules emulator suite | **60/60 pass** |
| Portal typecheck | exit 0 |
| Portal production build | exit 0 |
| Repo lint | exit 0, 0 warnings |
| `git diff --check` | exit 0 |

## Index deployment (Phase D3)

Pre-deploy check confirmed `fresh-prints-prod` had exactly 65 indexes and zero `designIssueReports`
indexes.

Command:
```
firebase deploy --only firestore:indexes --project fresh-prints-prod
```
Result: exit 0, "Deploy complete!"

Post-deploy verification: `firebase firestore:indexes --project fresh-prints-prod` now shows **67**
total indexes (+2, exactly the two reporting indexes) with field definitions matching
`firestore.indexes.json` exactly. No other index definition changed.

## Rules deployment (Phase D4)

Command:
```
firebase deploy --only firestore:rules --project fresh-prints-prod
```
Result: exit 0, "released rules firestore.rules to cloud.firestore", "Deploy complete!" — confirms
an actual Rules release occurred (not merely a compilation check). 11 pre-existing cosmetic lint
warnings appeared (unused helper functions, invalid-identifier warnings in unrelated older Rules
sections) — these predate this change and are unrelated to reporting; confirmed unchanged from the
dry-run compile step. Storage Rules were not part of this command and were not deployed.

## Function deployment (Phase D5)

Pre-deploy check confirmed neither `submitPortalDesignIssueReport` nor `resolveDesignIssueReport`
existed in `fresh-prints-prod`.

Command:
```
firebase deploy --only functions:submitPortalDesignIssueReport,functions:resolveDesignIssueReport --project fresh-prints-prod
```
Result: exit 0. CLI output: `functions[resolveDesignIssueReport(us-central1)] Successful create
operation.` and `functions[submitPortalDesignIssueReport(us-central1)] Successful create
operation.` — only these two functions were created; no other function was mentioned, modified, or
deleted by this command.

### Final function status

| Function | State | Region | Runtime | Type | Memory |
|---|---|---|---|---|---|
| `submitPortalDesignIssueReport` | ACTIVE | us-central1 | nodejs20 | v2 callable | 256MB |
| `resolveDesignIssueReport` | ACTIVE | us-central1 | nodejs20 | v2 callable | 256MB |

Total production function count after deployment: **103**, all `ACTIVE`, 0 non-active. Confirmed
the three previously-deployed customer-upload exclusion/deletion functions
(`previewCustomerUploadDeletion`, `deleteEligibleCustomerUpload`, `excludeCustomerUploadFromCatalog`)
remain present and unaffected — this deployment did not touch them.

## Phase D6 — final verification

1. Both reporting indexes enabled — confirmed (67 total, +2, field definitions match source).
2. Firestore Rules deployment completed successfully — confirmed ("released rules" message).
3. `submitPortalDesignIssueReport` ACTIVE — confirmed.
4. `resolveDesignIssueReport` ACTIVE — confirmed.
5. No unrelated Function changed — confirmed (deploy command output named only the two targets;
   total function count and all pre-existing function IDs consistent with prior state plus exactly
   these two additions).
6. No unrelated index changed — confirmed (65→67, exactly +2, all pre-existing definitions
   byte-identical in the diff against `firestore.indexes.json`).
7. No Storage Rules deployment occurred — confirmed (only `firestore:rules` and
   `firestore:indexes` scopes were ever invoked).
8. No production data was manually modified — confirmed; no document read, write, or console
   action was performed against any Firestore collection.
9. No App Hosting rollout occurred — confirmed via read-only
   `firebase apphosting:backends:list --project fresh-prints-prod`: backend "Updated Date" remains
   `2026-08-01 10:00:47`, predating this deployment pass.
10. The live production Portal remains on its existing (pre-reporting) revision — confirmed, no
    App Hosting or Portal deploy command was ever invoked.

## Confirmation

No production data was manually modified. No Storage Rules deployment occurred. No App Hosting
rollout occurred. No Studio release, GitHub stable release, DNS, or domain action occurred. This
pass touched only: two Firestore composite indexes, the Firestore Rules document, and two Cloud
Functions — all in `fresh-prints-prod`, all exactly as approved.

## Deferred

Full end-to-end Portal reporting UI smoke is deferred to after the Phase E App Hosting rollout,
since the currently live Portal revision predates the reporting feature and cannot exercise it yet.

## Next checkpoint

Phase E — production Portal App Hosting rollout. Requires a new, separate, explicit owner
approval before any App Hosting deploy command is run.
