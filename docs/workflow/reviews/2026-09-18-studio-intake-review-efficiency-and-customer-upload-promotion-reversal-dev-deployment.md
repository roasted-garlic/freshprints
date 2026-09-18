# Studio intake review efficiency and Customer Upload promotion reversal — DEV deployment

Date: 2026-09-18  
Project: `fresh-prints-dev`  
Environment: DEV only

## Exact deployed allowlist

```text
functions:returnCustomerUploadToIntakeAndExclude
functions:enqueueAiEnrichment
functions:deleteEligibleUnapprovedDesign
```

Command:

```text
firebase deploy --only functions:returnCustomerUploadToIntakeAndExclude,functions:enqueueAiEnrichment,functions:deleteEligibleUnapprovedDesign --project fresh-prints-dev
```

Result: **PASS** — 3 Functions deployed, 0 errors, 0 aborted deployments.

No Firestore Rules, Storage Rules, indexes, Portal hosting, production Functions, migrations,
backfills, or data mutations were deployed.

## DEV runtime verification

- `firebase functions:list --project fresh-prints-dev` showed all three allowlisted Functions as
  `v2`, `callable`, `us-central1`, `nodejs20`; the new callable is `ACTIVE`.
- Non-mutating unauthenticated POST to
  `https://us-central1-fresh-prints-dev.cloudfunctions.net/returnCustomerUploadToIntakeAndExclude`
  returned HTTP `401` with callable status `UNAUTHENTICATED` and message `You must be signed in.`
- No authenticated reversal, deletion, migration, or fixture/data mutation was performed.

## Deployment warnings

Firebase reported the existing Node.js 20 deprecation window (decommission after 2026-10-30) and
an existing firebase-functions package upgrade notice. These are residual platform maintenance
items and were not expanded into this phase.

Owner DEV QA is required before workflow Signoff or any production release.

