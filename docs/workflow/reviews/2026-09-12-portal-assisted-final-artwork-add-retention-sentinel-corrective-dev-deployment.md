# DEV Deployment: Portal Assisted Final Artwork Add Retention Sentinel Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-assisted-final-artwork-add-retention-sentinel-corrective` |
| Firebase project | `fresh-prints-dev` |
| Result | **SUCCESS** |

## Authorization and scope

The current checkpoint authorized only the minimum DEV surfaces needed for Owner DEV QA:
`customerAddAssistedApprovedProofToPrintRequest`, plus a Portal deployment only if the established
QA path required one. No Portal App Hosting deployment was authorized or performed. No Rules,
Storage Rules, indexes, unrelated Functions, Staff Artwork corrective, multi-proof work, Studio
publication, production action, staging, commit, push, freeze, or parent M0 action occurred.

## Established DEV environment

Per `docs/standards/DEPLOYMENT.md`, development Portal QA is localhost-only. The owner should run
the working-tree Portal with:

```text
npm run dev:portal
```

and use `http://localhost:3100` (connecting to the real `fresh-prints-dev` Firebase backend). The
Assisted Creation entry is `http://localhost:3100/custom-designs`; the resulting request can be
reopened at `/requests/{requestId}`.

Because this is the established local-source workflow, a Portal build/deploy was **not necessary**
and no DEV App Hosting backend was touched.

## Function deployment

Command:

```text
npx firebase deploy --only functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev
```

Result: **SUCCESS** — exactly one Function deployed, with zero errors or aborted deployments.

Read-only post-deploy verification:

```text
gcloud functions describe customerAddAssistedApprovedProofToPrintRequest --gen2 --region=us-central1 --project=fresh-prints-dev
```

Verified:

- project: `fresh-prints-dev`
- state: `ACTIVE`
- revision: `customeraddassistedapprovedprooftoprintrequest-00036-gib`
- region: `us-central1`
- entry point: `customerAddAssistedApprovedProofToPrintRequest`
- callable URI: `https://us-central1-fresh-prints-dev.cloudfunctions.net/customerAddAssistedApprovedProofToPrintRequest`

The Firebase predeploy hook rebuilt the Functions source as part of this scoped deployment. No
other Function was deployed.

## Pre-deploy verification

The reviewed corrective snapshot remained intact. The pre-deploy rerun passed:

- focused corrective contracts: **22/22**
- related lineage/eligibility contracts: **28/28**
- Functions build: **pass**
- Portal typecheck: **pass**
- targeted ESLint: **pass**
- `git diff --check`: **pass** (line-ending warnings only)

## Owner DEV QA checkpoint

Exact next checkpoint:

> **OWNER DEV QA: portal-assisted-final-artwork-add-retention-sentinel-corrective**

Do not create Signoff until the owner reports QA PASS or provides findings.

The later progress/re-add corrective redeployed this same callable as revision
`customeraddassistedapprovedprooftoprintrequest-00037-juk`. Its Owner DEV QA PASS confirms the
overlapping direct Assisted Add-to-Request behavior, but the sentinel-specific manual checks listed
in the Test Report remain incomplete; this deployment report does not constitute sentinel Signoff.
