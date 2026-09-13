# DEV Deployment: Portal Assisted Final Artwork Progress and Re-add Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-assisted-final-artwork-progress-and-readd-corrective` |
| Firebase project | `fresh-prints-dev` |
| Result | **SUCCESS** |

## Scope and environment

Owner authorization permitted the minimum affected DEV Function after Implement and Test. Portal
development follows the repository's localhost-only policy and therefore does not use DEV App
Hosting. Owner QA uses the working-tree Portal at `http://localhost:3100` against the real
`fresh-prints-dev` backend.

No Rules, Storage Rules, indexes, unrelated Functions, Studio publication, Staff Artwork corrective,
multi-proof runtime, migration, backfill, production action, staging, commit, push, or freeze was
performed.

## Function deployment

Command:

```text
npx firebase deploy --only functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev
```

Result: **SUCCESS** — exactly one Function deployed; zero errors and zero aborted deployments.

Read-only verification:

```text
gcloud functions describe customerAddAssistedApprovedProofToPrintRequest --gen2 --region=us-central1 --project=fresh-prints-dev
```

Verified:

- target project: `fresh-prints-dev`
- state: `ACTIVE`
- region: `us-central1`
- entry point: `customerAddAssistedApprovedProofToPrintRequest`
- revision: `customeraddassistedapprovedprooftoprintrequest-00037-juk`
- callable URI: `https://us-central1-fresh-prints-dev.cloudfunctions.net/customerAddAssistedApprovedProofToPrintRequest`

The Firebase predeploy hook rebuilt the Functions source. No other Function deployment occurred.

The deploy output included the repository's existing non-blocking warnings that Node.js 20 reaches
deprecation/decommission milestones in 2026 and that the `firebase-functions` package is behind the
latest release. Neither warning changed this deployment result.

## Portal deployment

Portal deployment was **not necessary and was not performed**. The accepted deployment policy
requires localhost Portal development (`npm run dev:portal`) for DEV QA and prohibits creating or
using a DEV App Hosting backend.

## Owner DEV QA

Use `http://localhost:3100/custom-designs` to open an approved/final Custom Request.

### Progress

1. Click **Add to Request**.
2. Verify the modal immediately appears.
3. Verify real stage labels change while the server works (not a fabricated percentage).
4. Verify elapsed time increases and `Step N of M`/remaining steps update.
5. Verify successful completion adds the item and clears active progress.

### Re-add

1. Complete the first Add successfully.
2. Remove the item from the working Print Request.
3. Return to the Custom Request and click **Add to Request** again.
4. Verify the re-add succeeds without the Firestore empty-update error.
5. Verify one active request item, one reused upload, and a correct Assisted ingest pointer.

### Existing corrective regression

Verify no catalog-permission modal, no consent/retention fields, no automatic Design Library
publication, correct quantity/size, and unchanged ordinary customer-upload permission behavior.

Exact next checkpoint:

> **OWNER DEV QA: portal-assisted-final-artwork-progress-and-readd-corrective - PASS**

Signoff is recorded at
`docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-signoff.md`.
