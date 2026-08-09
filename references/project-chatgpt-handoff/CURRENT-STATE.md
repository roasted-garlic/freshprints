# Fresh Prints - Current State Snapshot

## 2026-08-09 - FINAL RELEASE ARTIFACT RECOVERY — COMMIT AUTHORIZED

Owner: **`APPROVE RECOVERY COMMIT: FINAL RELEASE ARTIFACTS`**
Managed goal: `final-release-artifact-recovery-and-repository-closeout`
Branch: `chore/recover-final-release-artifacts` → PR/merge `development`
Formal Review: **approved_with_changes**
Do not regress: tip `f5c0bdb`; Algolia LIVE; Gates 1–7 + A/B/C COMPLETE
Stash clear only after merge verify

## 2026-08-09 - ALGOLIA GATE C-ENABLE COMPLETE — MANAGED SEARCH LIVE

Owner: **`PROD ALGOLIA ENABLE QA: PASS`**
Signoff **approved_with_notes**: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-signoff.md`
Live: **100%** `build-2026-08-09-001` @ `f5c0bdb` — App `Z1FVCM5QUX` / index `portal_catalog_ready_prod`
Deferred: **TD-032** filtered catalog briefly shows “Loading your account...”
Algolia production lane (A→B→C-reconcile→C-enable): **COMPLETE**
Next: idle (or new managed goal)
Confirmations: NO further Algolia enable work this pass

## 2026-08-09 - ALGOLIA ENABLE ROLLOUT LIVE — AWAIT OWNER QA

Owner: **`PROD ALGOLIA ENABLE ROLLOUT: COMPLETE`**
Live: **100%** `build-2026-08-09-001` @ `f5c0bdb` (PR #49)
Traffic verify PASS; managed-search behavior → owner QA
Record: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-rollout-record.md`
QA: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-owner-qa-checklist.md`
Next: **`PROD ALGOLIA ENABLE QA: PASS`**
Confirmations: NO key values in chat

## 2026-08-09 - ALGOLIA ENABLE SOURCE ON TIP — AWAIT APP HOSTING ROLLOUT

Owner: **`ALGOLIA ENABLE SOURCE PROMOTED: PASS`**
Tip: **`f5c0bdb`** (PR #49; contains `42cf4ad` Algolia secret refs) — agent verify PASS
Exact rollout:
```
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit f5c0bdb7f37d0d7fab589fbe31a6a76963e456a0 --force
```
Reply: **`PROD ALGOLIA ENABLE ROLLOUT: COMPLETE`** then **`PROD ALGOLIA ENABLE QA: PASS`**
Confirmations: NO agent rollout / NO key values in chat

## 2026-08-09 - ALGOLIA ENABLE SECRETS READY — PROMOTE + ROLLOUT

Owner: **`ALGOLIA PORTAL SECRETS: READY`**
Four SM secrets present (names only verified)
Branch: `feat/portal-algolia-enable-apphosting` @ **`42cf4ad`** (pushed)
Gate: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-promote-rollout-gate.md`
Owner next: PR→`production` → **`ALGOLIA ENABLE SOURCE PROMOTED: PASS`** → App Hosting rollout → **`PROD ALGOLIA ENABLE ROLLOUT: COMPLETE`** → **`PROD ALGOLIA ENABLE QA: PASS`**
Confirmations: NO key values in chat / NO agent rollout

## 2026-08-09 - ALGOLIA GATE C-ENABLE AUTHORIZED — AWAIT PORTAL SECRETS

Owner: **`APPROVE PROD ALGOLIA ENABLE`**
Plan+Review **approved**: `docs/workflow/plans/2026-08-09-prod-algolia-gate-c-enable-plan.md`
Checkpoint: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-checkpoint.md`
Target: App `Z1FVCM5QUX` / index `portal_catalog_ready_prod` / search-only key (not admin)
Owner next: create Search-Only key → set+grant four App Hosting secrets → **`ALGOLIA PORTAL SECRETS: READY`**
Then: yaml secret refs → promote → App Hosting rollout → QA
Confirmations: NO key values in chat / NO rollout before secrets / NO `_dev` index

## 2026-08-09 - ALGOLIA GATE C RECONCILE COMPLETE — ENABLE STILL OFF

Owner: **`PROD ALGOLIA RECONCILE: COMPLETE`**
Apply: scanned **46** / upserted **46** / cleared **true** (`2026-08-09T15:39:32Z`–`15:39:34Z`)
Index: `portal_catalog_ready_prod` (app `Z1FVCM5QUX`)
Record: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-reconcile-apply-record.md`
Portal Algolia product flag: **OFF**
Next optional: **`APPROVE PROD ALGOLIA ENABLE`** (search-only Portal env + App Hosting)
Confirmations: NO enable this pass

## 2026-08-09 - ALGOLIA RECONCILE APPLY AUTHORIZED — OWNER CLI

Owner: **`APPROVE PROD ALGOLIA RECONCILE APPLY`**
Dry-run PASS 46/46; apply clears+upserts `portal_catalog_ready_prod`
Gate: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-reconcile-apply-gate.md`
Owner:
```
$env:ALLOW_PROD_ALGOLIA_RECONCILE_APPLY='1'
node tmp-prod-algolia-reconcile.mjs --apply
```
Reply: **`PROD ALGOLIA RECONCILE: COMPLETE`** (+ scanned/upserted/cleared)
Confirmations: NO Portal enable / NO secrets in chat

## 2026-08-09 - ALGOLIA RECONCILE DRY-RUN PASS (46/46) — AWAIT APPLY

Owner: **`PROD ALGOLIA RECONCILE DRY-RUN: PASS`** — scanned **46** / upserted **46**
Record: `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-dry-run-record.md`
Portal enable: **OFF**; no index clear/write on dry-run
Next owner phrase (ONE): **`APPROVE PROD ALGOLIA RECONCILE APPLY`**
Then: `$env:ALLOW_PROD_ALGOLIA_RECONCILE_APPLY='1'; node tmp-prod-algolia-reconcile.mjs --apply` → `PROD ALGOLIA RECONCILE: COMPLETE`
Confirmations: NO apply yet / NO Portal enable / NO secrets in chat

## 2026-08-08 - ALGOLIA RECONCILE DRY-RUN INVOKE PATH CORRECTED — RERUN

Owner: `PROD ALGOLIA RECONCILE DRY-RUN: BLOCKED` (pre-callable; no mutation)
Cause: missing/unusable user ADC → metadata; `createCustomToken` needs `serviceAccountId` with user ADC
Fix: `tmp-prod-algolia-reconcile.mjs` + corrective doc (ADC OAuth + firebase-adminsdk signBlob; **no SA key download**)
Existing authorize phrase still valid: `APPROVE PROD ALGOLIA RECONCILE DRY-RUN`
Rerun: `gcloud auth application-default login` (if needed) then `node tmp-prod-algolia-reconcile.mjs`
Reply: **`PROD ALGOLIA RECONCILE DRY-RUN: PASS`** (+ scanned/upserted)
Confirmations: NO apply / NO Portal enable / NO SA keys in chat

## 2026-08-08 - ALGOLIA RECONCILE DRY-RUN AUTHORIZED — OWNER CLI

Owner: **`APPROVE PROD ALGOLIA RECONCILE DRY-RUN`**
Agent invoke: **HOOK-BLOCKED** (no mutation)
Gate: `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-dry-run-gate.md`
Owner: `node tmp-prod-algolia-reconcile.mjs` → `{ dryRun: true }` only
Reply: **`PROD ALGOLIA RECONCILE DRY-RUN: PASS`** (+ scanned/upserted)
Then: `APPROVE PROD ALGOLIA RECONCILE APPLY`
Confirmations: NO apply / NO Portal enable / NO secrets in chat

## 2026-08-08 - ALGOLIA GATE C RECONCILE PLAN APPROVED — AWAIT DRY-RUN PHRASE

Owner: `CONTINUE WORKFLOW: PROD ALGOLIA GATE C RECONCILE`
Managed goal: `pr-40-prod-algolia-gate-c-reconcile`
Plan+Review **approved** (enable deferred): `docs/workflow/plans/2026-08-08-prod-algolia-gate-c-reconcile-plan.md`
Checkpoint: `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-checkpoint.md`
Preflight: trio ACTIVE; params `Z1FVCM5QUX` / `portal_catalog_ready_prod`; Portal enable OFF
Next owner phrase (ONE): **`APPROVE PROD ALGOLIA RECONCILE DRY-RUN`**
Then: `PROD ALGOLIA RECONCILE DRY-RUN: PASS` → `APPROVE PROD ALGOLIA RECONCILE APPLY` → `PROD ALGOLIA RECONCILE: COMPLETE`
Confirmations: NO invoke yet / NO Portal enable / NO secrets in chat

## 2026-08-08 - ALGOLIA GATE B COMPLETE — TRIO ACTIVE — ENABLE STILL OFF

Owner: **`PROD FUNCTIONS WAVE A ALGOLIA: COMPLETE`**
Tip: **`92d176c`** (PR #48 restore exports)
Functions ACTIVE: `syncPortalCatalogDesignToAlgolia`, `reconcilePortalCatalogAlgoliaIndex`, `reconcilePortalCatalogAlgoliaIndexScheduled`
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-deploy-record.md`
Portal Algolia product flag: **OFF** (no App Hosting Algolia env); reconcile **not** invoked
Next optional: Gate C — reconcile + **`APPROVE PROD ALGOLIA ENABLE`** (search-only Portal env)
Confirmations: NO enable this pass

## 2026-08-08 - ALGOLIA GATE B IN PROGRESS — OWNER PR/MERGE + PARAMS + CREATE

Owner: **`APPROVE PROD FUNCTIONS WAVE A ALGOLIA`**
Export restore: commit **`c813452`** on `feat/restore-algolia-function-exports` (pushed)
Agent blocked on: PR→`production`, write `functions/.env.fresh-prints-prod`, Functions deploy
Deploy gate: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-deploy-gate.md`
Owner next (in order): merge branch → set `ALGOLIA_APP_ID=Z1FVCM5QUX` + `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod` → scoped CREATE trio → reply **`PROD FUNCTIONS WAVE A ALGOLIA: COMPLETE`**
Confirmations: NO Portal enable / NO reconcile / NO secrets in chat

## 2026-08-08 - ALGOLIA ADMIN SECRET ROTATED — GATE B AWAIT WAVE A PHRASE

Owner: **`ALGOLIA ADMIN SECRET: ROTATED`**
SM `ALGOLIA_ADMIN_API_KEY` on `fresh-prints-prod`: version **v2** enabled (`2026-08-09T01:33:05`); no value printed after rotate
Optional hygiene (owner CLI): disable SM version **v1** (agent hook-blocked)
Gate A still COMPLETE (`Z1FVCM5QUX` / `portal_catalog_ready_prod` / enable OFF)
Gate B Formal Review **approved_with_changes** — restore exports before CREATE
Next owner phrase (ONE): **`APPROVE PROD FUNCTIONS WAVE A ALGOLIA`**
Confirmations: NO deploy / NO enable / NO secrets in chat

## 2026-08-08 - ALGOLIA GATE A COMPLETE — WAVE A ALGOLIA CHECKPOINT READY — STOP

Owner: App ID `Z1FVCM5QUX` · index `portal_catalog_ready_prod` · `ALGOLIA ADMIN SECRET: READY`
Gate A **COMPLETE** — record `docs/workflow/reviews/2026-08-08-pr-40-prod-algolia-config-record.md`
SM secret **present**; Portal enable **OFF**; Algolia trio still **absent** from default `index.ts` (Option E).
**Security:** agent verify accessed admin secret into tool output — **rotate** before deploy recommended → `ALGOLIA ADMIN SECRET: ROTATED`
Gate B Formal Review **approved_with_changes**: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-checkpoint.md`
Next owner phrase (ONE): **`APPROVE PROD FUNCTIONS WAVE A ALGOLIA`**
(Restore exports → params → CREATE trio; no Portal enable)
Confirmations: NO deploy / NO enable / NO secrets written to docs

## 2026-08-08 - ALGOLIA PROD APP SEPARATE DECIDED — AWAIT APP ID + ADMIN SECRET — ENABLE OFF

Owner: `ALGOLIA PROD APP: SEPARATE` (do **not** reuse `WQ6OPP2E6Z`)
Index target: `portal_catalog_ready_prod`
Checkpoint: `docs/workflow/reviews/2026-08-08-pr-40-prod-algolia-config-separate-checkpoint.md`
Parity Gates 1–7 COMPLETE; Studio 1.0.1 published; Algolia product still **OFF**
**Owner next:** create SEPARATE Algolia Application + index; `firebase functions:secrets:set ALGOLIA_ADMIN_API_KEY --project fresh-prints-prod`
Then reply:
```text
ALGOLIA PROD APP ID: <ApplicationId>
ALGOLIA PROD INDEX: portal_catalog_ready_prod
ALGOLIA ADMIN SECRET: READY
```
Confirmations: NO Functions deploy / NO Portal enable / NO secrets in chat

## 2026-08-08 - PR #40 PARITY GATES 1–7 COMPLETE — STUDIO 1.0.1 PUBLISHED — ALGOLIA OPTIONAL/OFF

Owner: `STUDIO 1.0.1 RELEASE PUBLISHED: PASS`
Release: https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.1 (`draft=false`, `prerelease=false`)
Tag `v1.0.1` @ `ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0`; assets: Setup.exe + blockmap + `latest.yml`
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-record.md`
**Parity lane COMPLETE.** Algolia A–C remain **optional/OFF**.
Next: idle, or `ALGOLIA PROD APP: SEPARATE|REUSE WQ6OPP2E6Z` if pursuing managed search.
Confirmations: NO Algolia enable this pass

## 2026-08-08 - PR #40 GATES 1–7 COMPLETE WITH NOTES — STUDIO 1.0.1 WORKFLOW SUCCESS — OPTIONAL PUBLISH/ALGOLIA

Owner: `PROD STUDIO PACKAGE: PASS` + https://github.com/roasted-garlic/freshprints/actions/runs/31287781630
Run **success** @ tip `ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0` (Studio **1.0.1**).
Public `v1.0.1` Release/tag **not** visible to agent (electron-builder draft — publish in GitHub UI when ready).
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-record.md`
Parity Gates **1–7 done**; Algolia A–C still **optional/OFF**.
Optional next: `STUDIO 1.0.1 RELEASE PUBLISHED: PASS` · or Algolia phrases · or idle
Confirmations: NO Algolia enable / NO App Hosting / NO Firebase this pass

## 2026-08-08 - PR #40 GATE 7 STUDIO 1.0.1 PROMOTED — AWAIT RELEASE DISPATCH — STOP

Owner: `STUDIO 1.0.1 PROMOTED: PASS`
Tip: **`ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0`** (PR #47); `apps/studio/package.json` = **`1.0.1`**
Record: `docs/workflow/reviews/2026-08-08-studio-version-1.0.1-source-promotion-record.md`
**Owner next:** Run `studio-release.yml` — ref `production` or `ebcfaf29…` — `release_type=stable` — then `PROD STUDIO PACKAGE: PASS`
Confirmations: NO agent dispatch / NO 1.0.0 rebuild / NO Algolia / NO App Hosting

## 2026-08-08 - PR #40 GATE 7 STUDIO 1.0.1 COMMITTED — PUSH/PR HOOK-BLOCKED — OWNER PROMOTE REQUIRED — STOP

Owner: `COMMIT AND PROMOTE STUDIO 1.0.1`
Local commit **`d271b22`** on `chore/studio-version-1.0.1` (package.json → 1.0.1 + plan/review/implement only).
Agent `git push` **hook-blocked**.
**Owner:**
```powershell
git push -u origin chore/studio-version-1.0.1
# PR → production → merge
```
Then reply `STUDIO 1.0.1 PROMOTED: PASS` (+ tip SHA). Then dispatch `studio-release.yml` stable for **1.0.1**.
Confirmations: NO release dispatch / NO v1.0.0 mutation / NO Algolia / NO App Hosting

## 2026-08-08 - PR #40 GATE 7 STUDIO VERSION 1.0.1 APPLIED LOCALLY — AWAIT PROMOTE + RELEASE — STOP

Owner: `APPROVE STUDIO VERSION BUMP: 1.0.1 FOR PR40 TIP`
`apps/studio/package.json` → **`1.0.1`** (local Implement).
Plan/Review **approved**; record: `docs/workflow/reviews/2026-08-08-studio-version-bump-1.0.1-implement-record.md`
`origin/production` still `51db805` with Studio **1.0.0** until commit/merge.
Next: promote `1.0.1` to `production`, then dispatch `studio-release.yml` **stable** for **1.0.1** (not 1.0.0).
Optional: `COMMIT AND PROMOTE STUDIO 1.0.1` · After assets: `PROD STUDIO PACKAGE: PASS`
Confirmations: NO release dispatch / NO v1.0.0 mutation / NO Algolia / NO App Hosting

## 2026-08-08 - PR #40 GATE 7 STUDIO PACKAGE AUTHORIZED / BLOCKED — PUBLISHED v1.0.0 COLLISION — STOP

Owner: `APPROVE PROD STUDIO PACKAGE: PR40 TIP`
Tip `51db805`; Studio version still `1.0.0`.
**Blocker:** GitHub Release `v1.0.0` is **published** (tag @ `70c083a`) with Setup.exe + `latest.yml` — cannot safely re-cut `1.0.0` from tip.
Preflight: channel `stable`; Studio tsc OK; updater **23/23**; taxonomy disk-cache on tip; no `gh` dispatch.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-authorization-record.md`
Next owner phrase (ONE): **`APPROVE STUDIO VERSION BUMP: 1.0.1 FOR PR40 TIP`**
Confirmations: NO workflow dispatch / NO tag move / NO Algolia / NO App Hosting / NO Firebase

## 2026-08-08 - PR #40 GATE 6 STORAGE CLEANUP COMPLETE + GATE 7 STUDIO PACKAGE READY — STOP

Owner: `PROD STORAGE CLEANUP DELETED: PASS` → agent verify **PASS** (`fullyClean` 0/0/0; Portal 200) → Gate 6 **COMPLETE**.
Record: `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-apply-record.md`
Tip: `51db805`; App Hosting **100%** `build-2026-08-08-004`; Algolia **OFF**; Gates **1–6 COMPLETE**.
Gate 7 checkpoint **approved**: `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-checkpoint.md`
Next owner phrase (ONE): **`APPROVE PROD STUDIO PACKAGE: PR40 TIP`**
Confirmations: NO Studio package yet / NO Algolia enable / NO App Hosting / NO Rules

## 2026-08-08 - PR #40 GATE 6 STORAGE CLEANUP DELETE — AUTHORIZED / HOOK-BLOCKED — OWNER CLI REQUIRED — STOP

Owner: `APPROVE PROD STORAGE CLEANUP DELETE`
Agent APPLY **hook-blocked** — production unchanged.
Record: `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-apply-record.md`
**Owner run:**
```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
$env:CONFIRM_PROD_STORAGE_CLEANUP = "1"
$env:APPLY = "1"
node functions/scripts/prod-generated-asset-cleanup.mjs
```
Re-run until `APPLY complete` / `fullyClean`. Then reply `PROD STORAGE CLEANUP DELETED: PASS`.
Confirmations: NO agent mutation / Algolia / Rules / App Hosting / Studio

## 2026-08-08 - PR #40 GATE 6 STORAGE CLEANUP DRY-RUN PASS — DELETE CHECKPOINT READY — STOP BEFORE APPLY

Owner: `PROD STORAGE CLEANUP DRY-RUN: PASS`
Inventory confirmed: portal-catalog **31557** / catalog-reference **229** / `snapshotPublicationState` **2**.
DELETE checkpoint **approved**: `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-delete-checkpoint.md`
Formal Review: **approved** — `…-prod-storage-cleanup-delete-checkpoint-review.md`
Next owner phrase (ONE): **`APPROVE PROD STORAGE CLEANUP DELETE`**
Confirmations: NO APPLY yet / NO Algolia / NO Rules / NO App Hosting / NO Studio

## 2026-08-08 - PR #40 GATE 6 STORAGE CLEANUP DRY-RUN COMPLETE — AWAIT OWNER PASS — STOP BEFORE DELETE

Owner: `APPROVE PROD STORAGE CLEANUP DRY-RUN`
Dry-run **executed** (list-only): portal-catalog **31557** / catalog-reference **229** / `snapshotPublicationState` **2**; ~71.9 MiB allowlisted.
`destructiveActionsPerformed: false`
Record: `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-dry-run-record.md`
JSON: `docs/workflow/reviews/2026-08-08-prod-generated-asset-cleanup-dry-run.json`
Next: reply **`PROD STORAGE CLEANUP DRY-RUN: PASS`**, then separate phrase **`APPROVE PROD STORAGE CLEANUP DELETE`**
Confirmations: NO APPLY / NO Algolia / NO Rules / NO App Hosting / NO Studio

## 2026-08-08 - PR #40 GATE 6 STORAGE CLEANUP IMPLEMENT COMPLETE — STOP BEFORE DRY-RUN

Owner: `APPROVE IMPLEMENT: PROD STORAGE CLEANUP`
Source: `functions/scripts/prod-generated-asset-cleanup.mjs` + `prodGeneratedAssetCleanupGuard.mjs`
Implementation Review: **APPROVED** — `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-implementation-review.md`
ADR-FP-130; Stage 5 script **unchanged** (still refuses prod).
Tests: prod guard **10/10**; Stage 5 regression **26/26**; eslint **0**.
Next owner phrase (ONE): **`APPROVE PROD STORAGE CLEANUP DRY-RUN`**
Later: `APPROVE PROD STORAGE CLEANUP DELETE` (do not combine).
Confirmations: NO live dry-run/delete / Algolia / Rules / App Hosting / Studio this pass

## 2026-08-08 - PR #40 GATE 6 STORAGE CLEANUP PLAN APPROVED — STOP BEFORE IMPLEMENT

Owner: `APPROVE PROD STORAGE CLEANUP PLAN`
Plan: `docs/workflow/plans/2026-08-08-prod-storage-cleanup-plan.md`
Formal Review: **approved_with_changes** — `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-plan-review.md`
Approach: prod-dedicated ops script/guard hard-pinned to `fresh-prints-prod`; reuse Stage 5 APPLY resilience; Stage 5 script **unchanged** (no prod escape).
Next owner phrase (ONE): **`APPROVE IMPLEMENT: PROD STORAGE CLEANUP`**
Later (do not combine): `APPROVE PROD STORAGE CLEANUP DRY-RUN` → `APPROVE PROD STORAGE CLEANUP DELETE`
Confirmations: NO Implement / dry-run / delete / Algolia / Rules / App Hosting / Studio this pass

## 2026-08-08 - PR #40 GATE 5 PUBLISHER DELETE COMPLETE + GATE 6 CLEANUP PLAN READY — STOP

Owner: `STAGE 4 PUBLISHERS DELETED: PASS` → agent verify **PASS** → Gate 5 **COMPLETE**.
Five publishers **ABSENT**; taxonomy Functions **ACTIVE**; Algolia **ABSENT**; Portal `/`+`/catalog` **200**.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-record.md`
Tip: `51db805`; App Hosting **100%** `build-2026-08-08-004`; Algolia **OFF**.
Gate 6 checkpoint **approved**: `docs/workflow/reviews/2026-08-08-pr-40-prod-storage-cleanup-checkpoint.md`
Note: Stage 5 script hard-pinned to `fresh-prints-dev` — **no** prod dry-run/delete with that script.
Residuals: `snapshotPublicationState` **2**; generated Storage prefixes still present.
Next owner phrase (ONE): **`APPROVE PROD STORAGE CLEANUP PLAN`**
Confirmations: NO cleanup mutation / NO Algolia / NO Rules / NO App Hosting / NO Studio

## 2026-08-08 - PR #40 GATE 5 PUBLISHER DELETE — AUTHORIZED / HOOK-BLOCKED — OWNER CLI REQUIRED — STOP

Owner: `APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS`
Preflight **PASS**: five publishers PRESENT; taxonomy ACTIVE; Algolia ABSENT; tip `51db805`.
Agent `functions:delete` **hook-blocked** — production unchanged.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-record.md`
**Owner run (exact five only):**
```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase functions:delete `
  onCategorySnapshotSourceWritten `
  onTagSnapshotSourceWritten `
  onPortalCatalogSnapshotSourceWritten `
  rebuildCatalogSnapshots `
  retryPortalCatalogPublication `
  --region us-central1 `
  --project fresh-prints-prod `
  --force
```
Then reply `STAGE 4 PUBLISHERS DELETED: PASS` for post-delete verify.
Confirmations: NO Algolia / Storage cleanup / Rules / App Hosting / Studio / taxonomy delete

## 2026-08-08 - PROD TAXONOMY BOOTSTRAP COMPLETE + GATE 5 PUBLISHER DELETE CHECKPOINT READY — STOP BEFORE DELETE

Owner: `TAXONOMY BOOTSTRAP INVOKE: OK` → agent verify **PASS** → Gate 4 **COMPLETE**.
Materialization: `ready:true` rev **1**; tags **1130** / cats **19**; hash `88b122bc27247ff5d4f15aa755aa8bb623c4cbc114f3c99c6cca124d267feff7`; docs `meta`+`chunk-0` only.
Record: `docs/workflow/reviews/2026-08-08-prod-taxonomy-materialization-bootstrap-record.md`
Tip: `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f`; App Hosting **100%** `build-2026-08-08-004`; Algolia **OFF**.
Gate 5 checkpoint **approved**: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-checkpoint.md`
Formal Review: **approved** — `…-checkpoint-review.md`
Delete allowlist (5): `onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`, `onPortalCatalogSnapshotSourceWritten`, `rebuildCatalogSnapshots`, `retryPortalCatalogPublication`
Next owner phrase (ONE): **`APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS`**
Confirmations: NO delete yet / NO Algolia / NO Storage cleanup / NO Rules / NO App Hosting / NO Studio / NO second bootstrap

## 2026-08-08 - PROD TAXONOMY MATERIALIZATION BOOTSTRAP — AUTHORIZED / HOOK-BLOCKED — OWNER INVOKE REQUIRED — STOP

Owner: `APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP`
Preflight **PASS**: callable + taxonomy triggers ACTIVE; materialization **ABSENT**; corpus tags **1130** / cats **19**.
Studio Dev Console bridge **not** available on prod (dev-only gate).
Agent callable invoke **hook-blocked** (no Admin SDK bypass).
Checkpoint: `docs/workflow/reviews/2026-08-08-prod-taxonomy-materialization-bootstrap-owner-invoke-checkpoint.md`
**Owner:** run one-shot Node callable invoke against `fresh-prints-prod`, then reply `TAXONOMY BOOTSTRAP INVOKE: OK` + payload.
After OK: agent read-only verify + bootstrap record.
Confirmations: NO agent mutation / Algolia / publisher delete / Rules / cleanup / Studio
## 2026-08-08 - PR #40 FUNCTIONS WAVE A TAXONOMY — COMPLETE / VERIFIED — STOP BEFORE BOOTSTRAP

Owner: `PROD FUNCTIONS WAVE A TAXONOMY: COMPLETE`
Tip: `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f`. All five Wave A Functions **ACTIVE**.
CREATE: onTag/onCategoryTaxonomySourceWritten + rebuildTaxonomyMaterializationCallable.
UPDATE: enqueueAiEnrichment + getPortalGlobalOpenGraph (OG GET **200**).
Algolia trio **ABSENT**; publishers **5** untouched; `taxonomyMaterialization` **ABSENT**; bootstrap **NOT** invoked.
App Hosting **100%** `build-2026-08-08-004`; Algolia **OFF**.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-deploy-record.md`
Next owner phrase (ONE): **`APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP`**
Confirmations: NO bootstrap / Algolia / publisher delete / Rules / cleanup / Studio this verify
## 2026-08-08 - PR #40 FUNCTIONS WAVE A TAXONOMY RETRY — AUTHORIZED / HOOK-BLOCKED — OWNER CLI REQUIRED — STOP

Owner: `APPROVE PROD FUNCTIONS WAVE A TAXONOMY RETRY`
Preflight **PASS** on `production` @ `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` (Option E on tip).
Discovery proof: no `ALGOLIA_ADMIN_API_KEY` on default index / enqueue. CREATE still **ABSENT**.
Agent deploy **hook-blocked**; production Functions **unchanged**.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-deploy-record.md`
**Owner run:**
```bash
firebase deploy --only functions:onTagTaxonomySourceWritten,functions:onCategoryTaxonomySourceWritten,functions:rebuildTaxonomyMaterializationCallable,functions:enqueueAiEnrichment,functions:getPortalGlobalOpenGraph --project fresh-prints-prod --non-interactive
```
Then reply `PROD FUNCTIONS WAVE A TAXONOMY: COMPLETE` for post-deploy verify.
After verify PASS: `APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP` (do not auto-run).
## 2026-08-08 - OPTIONAL ALGOLIA SECRET DISCOVERY CORRECTIVE — SOURCE PROMOTED (PR #46 / `51db805`) — STOP BEFORE WAVE A RETRY

Owner: `OPTIONAL ALGOLIA SECRET CORRECTIVE SOURCE PROMOTION: COMPLETE`
`origin/production` = **`51db805d2fce6fcb6edee71b1a7f1a9b531fb50f`** (was `7e13968`)
Contains Option E (`bc0c341`) + promotion docs (`4a31277`). Tip: `algoliaSecrets.ts` present; Algolia trio **not** on default `index`; shared `lib/secrets` has no ALGOLIA.
Live Functions unchanged (taxonomy CREATE **ABSENT**; no Firebase deploy this promotion).
Record: `docs/workflow/reviews/2026-08-08-functions-optional-algolia-secret-discovery-corrective-source-promotion-record.md`
Next owner phrase (ONE): **`APPROVE PROD FUNCTIONS WAVE A TAXONOMY RETRY`**
## 2026-08-08 - OPTIONAL ALGOLIA SECRET DISCOVERY CORRECTIVE — SOURCE COMMITTED; PUSH/PR HOOK-BLOCKED — OWNER CLI REQUIRED — STOP

Branch: `fix/optional-algolia-secret-discovery-corrective` @ `bc0c34152a53f835dd58343035d7b3b11c773887`
Base `origin/production` still `7e139685099f90eb1532771e927384316a432e87` (not advanced).
Containment PASS; tests green; agent push blocked by Cursor hook.
Record: `docs/workflow/reviews/2026-08-08-functions-optional-algolia-secret-discovery-corrective-source-promotion-record.md`
**Owner:** push branch → PR to `production` → merge → reply `OPTIONAL ALGOLIA SECRET CORRECTIVE SOURCE PROMOTION: COMPLETE`
After verified merge, next phrase: `APPROVE PROD FUNCTIONS WAVE A TAXONOMY RETRY`
NO Firebase deploy / Algolia secret / bootstrap this pass.
## 2026-08-08 - OPTIONAL ALGOLIA SECRET DISCOVERY CORRECTIVE — IMPLEMENT+TEST+REVIEW APPROVED — STOP BEFORE WAVE A RETRY

Managed goal: `functions-optional-algolia-secret-deployment-discovery-corrective` — **PASS** (source only).
Option E: Algolia `defineSecret` moved to `functions/src/algolia/algoliaSecrets.ts`; trio removed from default `index.ts` (restore via `algoliaFunctionExports.ts`); ADR-FP-129.
Discovery proof: default/enqueue **no** `ALGOLIA_ADMIN_API_KEY`; Algolia module still registers it. Tests: discovery 4/4; Algolia 12/12; taxonomy/AI 30/30; OG 6/6; build/lint 0.
NO prod Functions deploy; NO Algolia secret created; Algolia still OFF.
Artifacts: Plan / Formal Review / Test report / Implementation Review under `docs/workflow/…-optional-algolia-secret-deployment-discovery-corrective-*`.
Next owner phrase (ONE): **`APPROVE PROD FUNCTIONS WAVE A TAXONOMY RETRY`**
(Prerequisite: corrective present on the production tip used for deploy.)
## 2026-08-08 - OPTIONAL ALGOLIA SECRET DISCOVERY CORRECTIVE — Plan+Review approved_with_changes — STOP BEFORE IMPLEMENT

Managed goal: `functions-optional-algolia-secret-deployment-discovery-corrective`
Wave A owner CLI failed (zero mutation) because Firebase discovers all `defineSecret` params from the default codebase; shared `lib/secrets.ts` registers `ALGOLIA_ADMIN_API_KEY` when `enqueueAiEnrichment` loads, and `index.ts` exports Algolia trio. Prod secret **NOT FOUND** (Algolia OFF by design). Option A (create secret to unblock) **REJECTED**.
Selected Option E: move Algolia `defineSecret` out of shared secrets + remove Algolia exports from default `index` while OFF.
Plan: `docs/workflow/plans/2026-08-08-functions-optional-algolia-secret-deployment-discovery-corrective-plan.md`
Formal Review: **approved_with_changes** — `docs/workflow/reviews/2026-08-08-functions-optional-algolia-secret-deployment-discovery-corrective-review.md`
Next owner phrase (ONE): **`APPROVE IMPLEMENT: OPTIONAL ALGOLIA SECRET DISCOVERY CORRECTIVE`**
Confirmations: NO secret create / Functions deploy / bootstrap / Algolia enable / publisher delete / Rules / cleanup / Studio / Implement yet
## 2026-08-08 - PR #40 FUNCTIONS WAVE A TAXONOMY — OWNER CLI FAIL (ALGOLIA SECRET MISSING) — ZERO MUTATION — STOP

Owner ran exact five-function deploy; predeploy build OK; **failed** at analyze:
`In non-interactive mode but have no value for the secret ALGOLIA_ADMIN_API_KEY`
`ALGOLIA_ADMIN_API_KEY` Secret Manager **NOT FOUND** on `fresh-prints-prod`.
Cause: codebase exports Algolia trio with `defineSecret`; `--only` does not skip that check.
CREATE still **ABSENT**; UPDATE unchanged; Algolia Functions still **ABSENT**; Algolia **OFF**.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-deploy-record.md`
Next owner phrase (ONE): **`APPROVE PROD ALGOLIA_ADMIN_API_KEY SECRET SET: WAVE A UNBLOCK ONLY`**
Then retry same Wave A five-function deploy (no Algolia Functions / enable / bootstrap).
## 2026-08-08 - PR #40 FUNCTIONS WAVE A TAXONOMY — AUTHORIZED / HOOK-BLOCKED — OWNER CLI REQUIRED — STOP

Owner: `APPROVE PROD FUNCTIONS WAVE A TAXONOMY`
Preflight **PASS** on clean `production` @ `7e139685099f90eb1532771e927384316a432e87`
App Hosting **100%** `build-2026-08-08-004`; Firestore/Storage Rules **COMPLETE**; Algolia **OFF**
CREATE: onTag/onCategoryTaxonomySourceWritten + rebuildTaxonomyMaterializationCallable — still **ABSENT**
UPDATE: enqueueAiEnrichment + getPortalGlobalOpenGraph — still **PRESENT** (not updated)
Agent deploy **hook-blocked**; production Functions **unchanged**.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-deploy-record.md`
**Owner run:**
```bash
firebase deploy --only functions:onTagTaxonomySourceWritten,functions:onCategoryTaxonomySourceWritten,functions:rebuildTaxonomyMaterializationCallable,functions:enqueueAiEnrichment,functions:getPortalGlobalOpenGraph --project fresh-prints-prod --non-interactive
```
Then reply `PROD FUNCTIONS WAVE A TAXONOMY: COMPLETE` for post-deploy verify.
After verify PASS, next phrase: `APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP` (do not auto-run).
Confirmations: NO bootstrap / Algolia / publisher delete / Rules / cleanup / Studio this pass

## 2026-08-08 - PR #40 STORAGE RULES VERIFY PASS + FUNCTIONS WAVE A TAXONOMY CHECKPOINT READY — STOP

Owner: `PROD STORAGE RULES DEPLOY: COMPLETE`
Live Storage ruleset: **`ccb8e2ea-74e6-4ed6-b1f8-e3cb3e386cd6`** (was `fbcb0ee4-…`); SHA256 = tip `ac3a6830…`
Markers PASS; Portal `/` `/catalog` **200**; Algolia **OFF**; Firestore **untouched** (`2c0578a0-…`)
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-storage-rules-deploy-record.md`
Wave A Taxonomy checkpoint + Formal Review **approved** (NO deploy):
`docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-checkpoint.md`
`docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-checkpoint-review.md`
CREATE: onTag/onCategoryTaxonomySourceWritten + rebuildTaxonomyMaterializationCallable
UPDATE: enqueueAiEnrichment + getPortalGlobalOpenGraph
Next owner phrase (ONE): **`APPROVE PROD FUNCTIONS WAVE A TAXONOMY`**
Confirmations: NO Functions/bootstrap/Algolia/cleanup this pass

## 2026-08-08 - PR #40 STORAGE RULES DEPLOY — AUTHORIZED / HOOK-BLOCKED — OWNER CLI REQUIRED — STOP

Owner: `APPROVE PROD STORAGE RULES DEPLOY: PR40 REMAINING`
Preflight **PASS** on clean `production` @ `7e139685099f90eb1532771e927384316a432e87`
(`storage.rules` blob `162f5167…`; Stage 4 generated refs NONE; proof 80 MB OK; tests 59/59 + 16/16 align).
Agent `firebase deploy --only storage --project fresh-prints-prod` **hook-blocked**.
Live Storage ruleset **unchanged**: `fbcb0ee4-732e-420f-afff-01041d2eee1b`.
Firestore Rules untouched: `2c0578a0-9764-4081-a5b3-6a5f23795e7d`.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-storage-rules-deploy-record.md`
**Owner run:**
`firebase deploy --only storage --project fresh-prints-prod --non-interactive`
Then reply `PROD STORAGE RULES DEPLOY: COMPLETE` for post-deploy verify.
Next after verify: `APPROVE PROD FUNCTIONS WAVE A TAXONOMY` (prepare only; do not auto-run).
Confirmations: NO Firestore redeploy / Functions / Algolia / bootstrap / object cleanup / Studio

## 2026-08-08 - PR #40 FIRESTORE RULES DEPLOY VERIFY PASS — COMPLETE — STOP

Owner: `PROD FIRESTORE RULES DEPLOY: COMPLETE`
Live Firestore ruleset: **`2c0578a0-9764-4081-a5b3-6a5f23795e7d`** (was `198d35a7-…`)
Content SHA256 **exact match** tip `48c21310…` @ `7e13968`
Markers PASS: taxonomyMaterialization staff-read/write-deny; readyAt optional; snapshotPublicationState match absent
Portal `/` `/catalog` **200**; Algolia **OFF**; Storage Rules **unchanged** (`fbcb0ee4-…`)
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-firestore-rules-deploy-record.md`
Next owner phrase (ONE): **`APPROVE PROD STORAGE RULES DEPLOY: PR40 REMAINING`**
Confirmations: NO Storage/Functions/Algolia/bootstrap/indexes/cleanup this verify

## 2026-08-08 - PR #40 FIRESTORE RULES DEPLOY — AUTHORIZED / HOOK-BLOCKED — OWNER CLI REQUIRED — STOP

Owner: `APPROVE PROD FIRESTORE RULES DEPLOY: PR40 REMAINING`
Preflight **PASS** on clean `production` @ `7e139685099f90eb1532771e927384316a432e87`
(`firestore.rules` blob `dc8d7906…`; tests 59/59 + taxonomy align 2/2).
Agent `firebase deploy --only firestore:rules --project fresh-prints-prod` **hook-blocked**.
Live ruleset **unchanged**: `198d35a7-c309-4c0b-97e0-80e0458c0c01`.
Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-firestore-rules-deploy-record.md`
**Owner run:**
`firebase deploy --only firestore:rules --project fresh-prints-prod --non-interactive`
Then reply `PROD FIRESTORE RULES DEPLOY: COMPLETE` for post-deploy verify.
Next after verify: `APPROVE PROD STORAGE RULES DEPLOY: PR40 REMAINING`
Confirmations: NO Storage/Functions/Algolia/bootstrap/indexes/cleanup/Studio

## 2026-08-08 - PR #40 PROD RULES PREFLIGHT READY — Formal Review approved_with_changes — STOP

Managed goal: `pr-40-prod-rules-deploy-preflight` — **checkpoint READY; NO deploy**.
Live: `7e13968` / **100%** `build-2026-08-08-004`; Algolia **OFF**; Stage 4 live.
Tests: `npm run test:rules` **59/59** exit 0; storage+taxonomy alignment **8/8**; `git diff --check` exit 0.
Granularity: **Option B** — Firestore Rules first, Storage Rules separate later.
Artifacts:
- Checkpoint: `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint.md`
- Formal Review: **approved_with_changes** — `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint-review.md`
- Plan sequencing amended (Algolia optional parallel): `docs/workflow/plans/2026-08-08-pr-40-remaining-production-gates-plan.md`
Next owner phrase (ONE): **`APPROVE PROD FIRESTORE RULES DEPLOY: PR40 REMAINING`**
Confirmations: NO Rules/Functions/Algolia/bootstrap/index/backfill/cleanup/Studio

## 2026-08-08 - PR #40 REMAINING GATES RECONCILIATION — Plan+Review approved_with_changes — STOP

Managed goal: `pr-40-remaining-production-gates-reconciliation` — **Plan + Formal Review DONE; NO mutation**.
Live: `origin/production` = **`7e139685099f90eb1532771e927384316a432e87`**; App Hosting **100%** **`build-2026-08-08-004`** @ same SHA; Algolia **OFF**; auto-rollout **disabled**.
RC: R1/R2/R4(prereq)/R5/R7/R8 **SATISFIED**; R3 Algolia **OPEN**; R6 Storage cleanup **OPEN**.
Indexes: **NO redeploy** (71/71; readyAt 4/4 READY). Taxonomy materialization **absent**. Publishers **5/6** still live.
Artifacts:
- Reconciliation: `docs/workflow/reviews/2026-08-08-pr-40-remaining-production-gates-reconciliation.md`
- Plan: `docs/workflow/plans/2026-08-08-pr-40-remaining-production-gates-plan.md`
- Formal Review: **approved_with_changes** — `docs/workflow/reviews/2026-08-08-pr-40-remaining-production-gates-plan-review.md`
Next owner phrase (ONE): `ALGOLIA PROD APP: SEPARATE|REUSE WQ6OPP2E6Z` (then App ID + `ALGOLIA ADMIN SECRET: READY`).
Confirmations: NO deploy / Algolia enable / secrets value / bootstrap / cleanup / Studio release

## 2026-08-08 - TD-031 SIGNOFF APPROVED — GOAL CLOSED

Managed goal: `portal-discover-view-all-complete-pagination` — **DONE / CLOSED**.
Owner: `DISCOVER VIEW ALL PAGINATION QA: PASS`.
Live: **100%** `build-2026-08-08-004` @ `7e139685099f90eb1532771e927384316a432e87`.
TD-031 **resolved**. Signoff: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-signoff.md`
Confirmations: NO Functions/Rules/indexes/Algolia/data this closeout

## 2026-08-08 - TD-031 BUILD LIVE build-2026-08-08-004 / OWNER QA PENDING — STOP BEFORE SIGNOFF

Managed goal: `portal-discover-view-all-complete-pagination`.
Live App Hosting: **100%** **`build-2026-08-08-004`** @ **`7e139685099f90eb1532771e927384316a432e87`** (NTW `82ea610` + schedule PR #45).
Rollout: **SUCCEEDED** / build **READY**. Smoke PASS (/, /catalog, /catalog?discover=new; Algolia OFF; no fresh-prints-dev).
Record: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-app-hosting-rollout-record.md`
Owner QA: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-owner-qa-checklist.md`
Next reply: `DISCOVER VIEW ALL PAGINATION QA: PASS` (or FAIL / PASS WITH NOTES).
Confirmations: NO Signoff yet; NO Functions/Rules/indexes/Algolia/data

## 2026-08-08 - TD-031 APP HOSTING AUTHORIZED — OWNER CLI REQUIRED (HOOK-BLOCKED) — STOP

Managed goal: `portal-discover-view-all-complete-pagination`.
Phrase: `APPROVE PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT`
`origin/production` = **`7e139685099f90eb1532771e927384316a432e87`** (PR #45 MERGED; contains `82ea610` + `ce80dac`).
Live still **100%** `build-2026-08-08-003` until owner rolls.
Agent `firebase apphosting:rollouts:create … --force` **hook-blocked**.
Gate: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-app-hosting-gate.md`
Record: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-app-hosting-rollout-record.md`
**Owner run:**
`firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 7e139685099f90eb1532771e927384316a432e87 --force`
Then reply with new build id for verify + owner QA.

## 2026-08-08 - TD-031 NTW SOURCE PROMOTED + SCHEDULE COMPANION READY — STOP BEFORE APP HOSTING

Managed goal: `portal-discover-view-all-complete-pagination`.
PR **#44 MERGED** — production **`c181f5694bde83ddee26863a0a6a8d546c39619e`** (contains `82ea610`).
Live App Hosting: **100%** `build-2026-08-08-003` — NTW count corrective **NOT LIVE**.
Record: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-source-promotion-record.md`
**Companion (same goal):** PR **#45** `fix/portal-schedule-prop-wiring` @ **`3fb2a8d`** — merge to `production` before App Hosting (do not leave as stray local diff).
Gate: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-app-hosting-gate.md`
Next: merge PR #45 → then `APPROVE PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT` using production tip SHA.
Confirmations: NO App Hosting / Rules / Functions / indexes / Algolia / data this pass

## 2026-08-08 - TD-031 NTW COUNT SOURCE PROMOTED — LIVE STILL build-2026-08-08-003 — STOP

Managed goal: `portal-discover-view-all-complete-pagination` (NTW count corrective).
PR **#44 MERGED** — merge SHA **`c181f5694bde83ddee26863a0a6a8d546c39619e`** (parents `9f3a01a` + `82ea610`).
`origin/production` = `c181f56`; contains approved corrective `82ea610`.
Live App Hosting: **100%** `build-2026-08-08-003` — corrective **NOT LIVE** (NTW Counting defect still present).
Record: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-source-promotion-record.md`
Gate: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-app-hosting-gate.md`
Next: `APPROVE PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT`
Confirmations: NO App Hosting / Rules / Functions / indexes / Algolia / data mutation this pass

## 2026-08-08 - TD-031 NTW COUNT SOURCE PROMOTION — LOCAL COMMIT READY; PUSH/PR HOOK-BLOCKED — STOP

Managed goal: `portal-discover-view-all-complete-pagination` (NTW count corrective).
Owner: `APPROVE PROD DISCOVER NTW COUNT BADGE SOURCE PROMOTION`
Local branch `fix/portal-discover-ntw-count-badge-corrective` @ **`82ea610`** (base `9f3a01a`).
Diff containment **PASS**. Live still **`build-2026-08-08-003`** — corrective **NOT LIVE**.
`git push` + `gh pr create --base production` **blocked by Cursor hook**.
Record: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-source-promotion-record.md`
Gate: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-app-hosting-gate.md`
**Owner:** push + create/merge PR to `production`, then continue post-merge verify.
Next after merge: `APPROVE PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT`
Confirmations: NO App Hosting / Rules / Functions / indexes / Algolia / data mutation

## 2026-08-08 - TD-031 NTW COUNT CORRECTIVE IMPLEMENT+TEST+IMPL-REVIEW — approved — STOP BEFORE PROD DEPLOY

Managed goal: `portal-discover-view-all-complete-pagination` — **NOT signed off**.
Corrective implement **complete**: NTW `countReadyDesigns` uses readyAt/__name__ DESC orderBy; failed UI → **Count unavailable**.
Tests: **42/42**; Portal typecheck/lint/build/diff-check **PASS**.
Implementation Review: **approved** —
`docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-implementation-review.md`
Owner QA checklist: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-owner-qa-checklist.md`
**STOP BEFORE PRODUCTION DEPLOYMENT.**
Next: separate source promotion phrase (then App Hosting + `DISCOVER VIEW ALL PAGINATION QA: PASS`).
Live still `build-2026-08-08-003` (NTW Counting defect until corrective rolls).
Confirmations: NO App Hosting / Rules / Functions / indexes / Algolia / data mutation

## 2026-08-08 - TD-031 QA FAIL — NTW COUNT BADGE CORRECTIVE PLAN+REVIEW — STOP BEFORE IMPLEMENT

Managed goal: `portal-discover-view-all-complete-pagination` — **NOT signed off**.
Owner: `DISCOVER VIEW ALL PAGINATION QA: FAIL` — NTW badge stuck on **“Counting designs…”**; other View All totals OK.
Root cause (plan): (1) NTW `countReadyDesigns` lacks list-aligned readyAt DESC orderBy vs DESC-only indexes → aggregate fails; (2) failed+incomplete mapped to same Counting UI as pending.
Corrective Plan: `docs/workflow/plans/2026-08-08-portal-discover-ntw-count-badge-corrective-plan.md`
Formal Review: **approved_with_changes** —
`docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-plan-review.md`
**STOP BEFORE IMPLEMENTATION.**
Next: `IMPLEMENT PORTAL DISCOVER NTW COUNT BADGE CORRECTIVE`
Live still `build-2026-08-08-003` (pagination Load more live; NTW count badge defective).
Confirmations: NO implement / App Hosting / Rules / Functions / indexes / Algolia this pass

## 2026-08-08 - TD-031 APP HOSTING LIVE build-2026-08-08-003 / OWNER QA PENDING — STOP

Managed goal: `portal-discover-view-all-complete-pagination` (TD-031).
Owner CLI rollout **SUCCEEDED**: **`build-2026-08-08-003`** @ commit `9f3a01a` (contains `a01a9dc`); traffic **100%**.
Technical smoke **PASS** (`/` `/catalog` `/catalog?discover=new` 200; no `fresh-prints-dev`; Algolia OFF).
Record: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-app-hosting-rollout-record.md`
**OWNER QA REQUIRED** — checklist:
`docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-owner-qa-checklist.md`
Reply: `DISCOVER VIEW ALL PAGINATION QA: PASS` (or FAIL / PASS WITH NOTES)
Confirmations: NO Rules/Functions/indexes/Algolia/data mutation this pass

## 2026-08-08 - TD-031 APP HOSTING ROLLOUT — PREFLIGHT PASS; HOOK-BLOCKED — STOP

Managed goal: `portal-discover-view-all-complete-pagination` (TD-031).
Owner: `APPROVE PROD DISCOVER VIEW ALL PAGINATION APP HOSTING ROLLOUT`
Preflight **PASS**: `origin/production`=`9f3a01a` contains `a01a9dc`; live still `build-2026-08-08-002` @100%; Algolia OFF.
Rollout **not executed** — Cursor hook blocked `firebase apphosting:rollouts:create`.
Owner command:
`firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 9f3a01ae0585d607f9a332dad2c86ad2a541548b --force`
Record: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-app-hosting-rollout-record.md`
After SUCCEEDED: agent smoke + owner QA (`DISCOVER VIEW ALL PAGINATION QA: PASS`).
Confirmations: NO Rules/Functions/indexes/Algolia/data mutation this pass

## 2026-08-08 - TD-031 SOURCE PROMOTED — LIVE STILL build-2026-08-08-002 — STOP

Managed goal: `portal-discover-view-all-complete-pagination` (TD-031).
PR **#43 MERGED** — merge SHA **`9f3a01ae0585d607f9a332dad2c86ad2a541548b`** (parents `ccfc974` + `a01a9dc`).
`origin/production` = `9f3a01a`; contains approved fix `a01a9dc`.
Live App Hosting: **100%** `build-2026-08-08-002` — pagination/count fix **NOT LIVE**.
Record: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-source-promotion-record.md`
Gate: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-app-hosting-gate.md`
Next: `APPROVE PROD DISCOVER VIEW ALL PAGINATION APP HOSTING ROLLOUT`
Confirmations: NO App Hosting / Rules / Functions / indexes / Algolia / data mutation this pass

## 2026-08-08 - TD-031 SOURCE PROMOTION — PREFLIGHT PASS; PR HOOK-BLOCKED — STOP

Managed goal: `portal-discover-view-all-complete-pagination` (TD-031).
Owner: `APPROVE PROD DISCOVER VIEW ALL PAGINATION SOURCE PROMOTION`
Branch pushed: `fix/portal-discover-view-all-complete-pagination` @ **`a01a9dc`**
`origin/production` still **`ccfc974`** (unchanged). Diff containment **PASS** (hook files only + docs).
PR create **blocked** by Cursor hook (`gh pr create --base production`).
Live App Hosting: **100%** `build-2026-08-08-002` — pagination fix **NOT LIVE**.
Record: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-source-promotion-record.md`
Gate: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-app-hosting-gate.md`
**Owner:** create+merge PR to `production` (or approve hook card), then continue post-merge verify.
Next after merge: `APPROVE PROD DISCOVER VIEW ALL PAGINATION APP HOSTING ROLLOUT`
Confirmations: NO App Hosting / Rules / Functions / indexes / Algolia / data mutation

## 2026-08-08 - TD-031 IMPLEMENT+TEST+IMPL-REVIEW — approved — STOP BEFORE PROD DEPLOY

Managed goal: `portal-discover-view-all-complete-pagination` (TD-031).
Source implement **complete** in `useCatalogDesigns` (aggregate count authority + Load more reconcile).
Tests: **37/37** focused + Stage 1b-C; Portal typecheck/lint/build/diff-check **PASS**.
Implementation Review: **approved** —
`docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-implementation-review.md`
Test report: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-test-report.md`
Owner QA checklist: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-owner-qa-checklist.md`
**STOP BEFORE PRODUCTION DEPLOYMENT.**
Next: separate source promotion / App Hosting rollout phrase, then owner QA.
Confirmations: NO App Hosting / Rules / Functions / indexes / Algolia / readyAt / Storage / taxonomy

## 2026-08-08 - TD-031 PLAN+REVIEW — approved_with_changes — STOP BEFORE IMPLEMENT

Managed goal: `portal-discover-view-all-complete-pagination` (TD-031).
Plan: `docs/workflow/plans/2026-08-08-portal-discover-view-all-complete-pagination-plan.md`
Formal Review: **approved_with_changes** —
`docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-plan-review.md`
Root cause: `/catalog` View All uses `useCatalogDesigns`; first page size 40; badge seeded from loaded length; Load more already exists — fix count authority + paging completeness; do **not** raise page size / enable Algolia / touch Home/readyAt/PR#40.
**STOP BEFORE IMPLEMENTATION.**
Next owner phrase: `IMPLEMENT PORTAL DISCOVER VIEW ALL COMPLETE PAGINATION`
Confirmations: NO implement / App Hosting / Rules / Functions / Algolia this pass

## 2026-08-08 - PROD READYAT BACKFILL SIGNOFF — approved_with_notes — R-018 RESOLVED — STOP

Managed goal: `prod-readyat-backfill` — **CLOSED**.
Signoff: **approved_with_notes** —
`docs/workflow/reviews/2026-08-08-prod-readyat-backfill-signoff.md`
APPLY 46/46; NTW populated; post-write verify PASS; owner QA **PASS WITH NOTES**.
**R-018 resolved.** Separate follow-up **TD-031**: Discover View All badge/list shows 40 vs membership 45 — now in Plan+Review (see above).
Confirmations: NO pagination fix / App Hosting / Rules / Functions / Algolia this pass

## 2026-08-08 - PROD READYAT BACKFILL APPLIED — OWNER NTW QA PENDING — STOP

Owner: `APPROVE PROD READYAT BACKFILL APPLY` — owner CLI complete (46 updated).
Post-write verify **PASS**: ready **46** · readyAt **46/46** · missing **0** · all seeds match `aiReviewedAt` · NTW membership **45**.
Record: `docs/workflow/reviews/2026-08-08-prod-readyat-backfill-apply-record.md`
**R-018 still OPEN** until owner NTW visual QA.
Reply: `READYAT BACKFILL NTW QA: PASS` (or FAIL / PASS WITH NOTES)
Confirmations: NO App Hosting/Rules/Functions/indexes/Algolia/further mutation

## 2026-08-08 - PROD READYAT BACKFILL APPLY — PREFLIGHT PASS; HOOK-BLOCKED — STOP

Owner: `APPROVE PROD READYAT BACKFILL APPLY`
Preflight **PASS**: script unchanged; indexes 4/4 READY; candidates still 46/0/46 all `aiReviewedAt`.
APPLY **not executed** — Cursor hook blocked production mutation.
Owner PowerShell:
`$env:FIREBASE_PROJECT_ID='fresh-prints-prod'; $env:ALLOW_NON_DEV='1'; $env:APPLY='1'; node functions/scripts/backfill-design-ready-at.mjs`
Record: `docs/workflow/reviews/2026-08-08-prod-readyat-backfill-apply-record.md`
After owner APPLY success: continue post-write verify → NTW QA → Signoff / R-018.
Confirmations: NO agent writes / NO App Hosting / Rules / Functions / Algolia

## 2026-08-08 - PROD READYAT BACKFILL DRY-RUN — GO (A) — STOP BEFORE WRITES

Owner: `APPROVE PROD READYAT BACKFILL DRY-RUN`
Project: `fresh-prints-prod` · source `ccfc974` · script `functions/scripts/backfill-design-ready-at.mjs`
Read-only: ready **46** / alreadySet **0** / needsBackfill **46** / no-seed **0**
Seeds: **aiReviewedAt 46** · updatedAt **0** · createdAt **0**
Proposed age: **45** within 7d · **1** in 8–30d
Predicted New This Week View All after APPLY: **45** (all from aiReviewedAt); before View All: **0** (missing field)
updatedAt risk: **none** · Classification **A SAFE TO APPLY AS-IS**
Record: `docs/workflow/reviews/2026-08-08-prod-readyat-backfill-dry-run-record.md`
R-018 still OPEN. Next: `APPROVE PROD READYAT BACKFILL APPLY` (do not run yet)
Confirmations: NO APPLY / NO writes / NO Rules/Functions/indexes/App Hosting/Algolia

## 2026-08-08 - HOME/DISCOVER REGRESSION SIGNOFF — approved_with_notes — STOP

Managed goal: `prod-portal-home-discover-population-regression` — **CLOSED**.
Signoff: **approved_with_notes** —
`docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-signoff.md`
Live: `build-2026-08-08-002` @ `ccfc974` (100%); readyAt indexes **4/4 READY**; Algolia **OFF**.
Owner QA: **PASS WITH NOTES** — Home multi-design fixed; New This Week empty = legacy readyAt coverage (R-018), not a Home-pool failure.
No backfill this pass. Recommended separate follow-up: `APPROVE PROD READYAT BACKFILL`
Parent PR #40 remaining (Algolia RC-R3, Rules, cleanup) still separately gated — do not auto-start.
Confirmations: NO Algolia/Functions/Rules/backfill/cleanup

## 2026-08-08 - CORRECTIVE BUILD LIVE / OWNER CONTENT QA PENDING — STOP

Managed goal: `prod-portal-home-discover-population-regression`
Owner: `APPROVE PROD HOME DISCOVER APP HOSTING ROLLOUT` — **SUCCEEDED**.
Build/rollout **`build-2026-08-08-002`** READY/SUCCEEDED; traffic **100%** @ `ccfc974` (contains `f5e9cf6`).
Smoke: `/` + `/catalog` **200**; no `fresh-prints-dev`; Algolia OFF; readyAt **4/4 READY**.
**AUTOMATED RUNTIME VERIFY: PASS** · **OWNER CONTENT QA: REQUIRED** (defect not closed).
Record: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-app-hosting-rollout-record.md`
QA checklist: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-owner-qa-checklist.md`
Reply: `HOME DISCOVER CONTENT QA: PASS` (or FAIL / PASS WITH NOTES)
Confirmations: NO Algolia/Functions/Rules/backfill/cleanup this pass

## 2026-08-08 - HOME/DISCOVER APP HOSTING ROLLOUT — PREFLIGHT PASS; CLI HOOK-BLOCKED — STOP

Managed goal: `prod-portal-home-discover-population-regression`
Owner: `APPROVE PROD HOME DISCOVER APP HOSTING ROLLOUT`
Preflight **PASS**: `production`=`ccfc974` contains `f5e9cf6`; traffic still `build-2026-08-08-001`@`1e65a43`; auto-rollout disabled; readyAt **4/4 READY**; Algolia OFF.
Rollout **not executed** — Cursor hook blocked `firebase apphosting:rollouts:create`.
Owner command:
`firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit ccfc97487a42553146ea3186bde8f710a54b86ca --force`
Record: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-app-hosting-rollout-record.md`
After SUCCEEDED: agent smoke + owner content QA (`HOME DISCOVER CONTENT QA: PASS`).
Confirmations: NO Rules/Functions/indexes/Algolia/backfill this pass

## 2026-08-08 - READYAT INDEXES LIVE 4/4 — LIVE PORTAL STILL AFFECTED — STOP

Managed goal: `prod-portal-home-discover-population-regression`
Owner: `APPROVE PROD READYAT INDEX DEPLOY` — **COMPLETE**.
Indexes: **4/4 READY** on `fresh-prints-prod` (canonical compare PASS: 71/71, missing 0, unexpected 0).
Source: `ccfc974` promoted; indexes deployed (owner CLI).
Live App Hosting traffic **100%** on **`build-2026-08-08-001`** @ `1e65a43` — Home defect **STILL PRESENT**.
Record: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-index-deploy-record.md`
Next: `APPROVE PROD HOME DISCOVER APP HOSTING ROLLOUT`
Confirmations: NO App Hosting/Algolia/Rules/Functions/backfill this pass

## 2026-08-08 - PROD READYAT INDEX DEPLOY — DELTA PASS; CLI HOOK-BLOCKED — STOP

Managed goal: `prod-portal-home-discover-population-regression`
Owner: `APPROVE PROD READYAT INDEX DEPLOY`
Production source: `ccfc974` (verified).
Pre-deploy live indexes: **67**; local: **71**; readyAt live: **0/4**.
Canonical delta (**PASS**): CREATE exactly four readyAt composites; DELETE **NONE**; UNEXPECTED **NONE**.
Deploy command **not executed** — Cursor hook blocked `firebase deploy --only firestore:indexes --project fresh-prints-prod`.
Owner: approve Cursor card **or** run that command with `--non-interactive` (abort if delete prompted), then continue wait/verify.
Record: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-index-deploy-record.md`
Live App Hosting still `build-2026-08-08-001` — Home defect **STILL PRESENT**.
Next after 4/4 ENABLED: `APPROVE PROD HOME DISCOVER APP HOSTING ROLLOUT`

## 2026-08-08 - HOME/DISCOVER SOURCE PROMOTED — LIVE PORTAL STILL AFFECTED — STOP

Managed goal: `prod-portal-home-discover-population-regression`
Owner: `APPROVE PROD HOME DISCOVER FIX PROMOTION` — **complete (Git only)**.
PR **#42 MERGED** — merge SHA `ccfc97487a42553146ea3186bde8f710a54b86ca` (parents `1e65a43` + `f5e9cf6`).
`origin/production` = `ccfc974`; contains approved fix `f5e9cf6`.
Live App Hosting traffic **100%** on **`build-2026-08-08-001`** @ `1e65a43` — Home defect **STILL PRESENT**.
Record: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-source-promotion-record.md`
Index gate (NOT executed): `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-index-deploy-gate.md`
Next: `APPROVE PROD READYAT INDEX DEPLOY`
Confirmations: NO index/App Hosting/Algolia/Rules/Functions/backfill this pass

## 2026-08-08 - HOME/DISCOVER SOURCE PROMOTION — PR #42 OPEN; MERGE HOOK-BLOCKED — STOP

Managed goal: `prod-portal-home-discover-population-regression`
Owner: `APPROVE PROD HOME DISCOVER FIX PROMOTION`
Feature: `fix/prod-home-discover-population` @ `f5e9cf62524e223aef7f2e289bad51e9b35b18d6`
PR: **#42** https://github.com/roasted-garlic/freshprints/pull/42 — **MERGEABLE/CLEAN** vs `production` @ `1e65a43`
**Agent could not complete `gh pr merge`** — Cursor hook blocked merge (source promotion only; not a runtime deploy).
Live App Hosting still **`build-2026-08-08-001`** — Home defect **STILL PRESENT**.
Record: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-source-promotion-record.md`
Index gate prep: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-index-deploy-gate.md`
Owner: run `gh pr merge 42 --merge --subject "Merge PR #42: restore Home discovery pool fallback"` (or approve Cursor merge card), then continue post-merge verify.
Next after merge: `APPROVE PROD READYAT INDEX DEPLOY` (do not run yet)

## 2026-08-08 - HOME/DISCOVER SOURCE FIX APPROVED — PRODUCTION STILL AFFECTED — STOP

Managed goal: `prod-portal-home-discover-population-regression`
Branch: `fix/prod-home-discover-population` (from `1e65a43`)
**SOURCE FIX APPROVED** — Implementation Review **APPROVED**; tests **54/54**; Portal typecheck/build/lint/diff-check **pass**.
Fallback: membership-incomplete / readyAt-index-unavailable → `WithSortFallback` + bounded `createdAt` fill (no magic 8/12/20).
**Production still affected** (`build-2026-08-08-001`). Algolia OFF unrelated. Indexes 0/4 live (defs verified; not deployed).
Test: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-test-report.md`
Impl Review: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-implementation-review.md`
Deploy prep: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-deployment-checkpoint.md`
Owner QA prep: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-owner-qa-checklist.md`
Next: `APPROVE PROD HOME DISCOVER FIX PROMOTION`
Confirmations: NO prod index/App Hosting/Algolia/Rules/Functions/backfill/mutation this pass

## 2026-08-08 - HOME/DISCOVER POPULATION REGRESSION — PLAN+REVIEW — STOP

Managed goal: `prod-portal-home-discover-population-regression`
**Root cause PROVEN:** Home `listHomeDiscoveryPool` — missing `readyAt` index + metric queries return 1 design + early return (no createdAt fallback). `/catalog` uses `WithSortFallback` → createdAt → 46 designs. **0/46** ready docs have `readyAt`. Algolia unrelated.
Plan: `docs/workflow/plans/2026-08-08-prod-portal-home-discover-population-regression-plan.md`
Formal Review: **approved_with_changes** —
`docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-plan-review.md`
Next: `APPROVE PROD HOME DISCOVER FIX IMPLEMENT`
Confirmations: NO implement / index deploy / Algolia / Rules / Functions

## 2026-08-08 - PROD ALGOLIA CONFIG — PARTIAL / OWNER ACTIONS REQUIRED — STOP

Owner: `APPROVE PROD ALGOLIA CONFIG`.
Contract verified; live Portal Algolia **OFF**; prod admin secret **NOT FOUND**.
Proposed index: **`portal_catalog_ready_prod`** (≠ `_dev`).
Prod Algolia Application / keys / Secret Manager **pending owner dashboard**.
Record: `docs/workflow/reviews/2026-08-08-pr-40-production-algolia-config-record.md`
RC-R3: **OPEN** (not CONFIG READY).
Next owner replies: `ALGOLIA PROD APP: SEPARATE|REUSE WQ6OPP2E6Z` then App ID + `ALGOLIA ADMIN SECRET: READY`.
Do **not** start Functions Wave A yet.

## 2026-08-08 - APP HOSTING ROLLOUT SUCCEEDED — STOP

Backend `fresh-prints-portal` / `fresh-prints-prod`.
Build/rollout **`build-2026-08-08-001`** — **SUCCEEDED**; traffic 100%.
Source: `1e65a43e131b3b5709a8870b1a24a40f8a004978` (owner CLI after Cursor hook block).
Smoke: homepage **200**; **0** `fresh-prints-dev`; `/catalog` + category browse **200**; Algolia **OFF**.
Stage 4 Portal runtime **LIVE**. RC-R4 prerequisite satisfied; Storage Rules **not** deployed.
Record: `docs/workflow/reviews/2026-08-08-pr-40-app-hosting-production-rollout-record.md`
Next: `APPROVE PROD ALGOLIA CONFIG`

| Confirmations | NO Functions/Rules/indexes/Algolia/Storage/taxonomy/secrets action beyond App Hosting |

## 2026-08-08 - PR #40 MERGED TO production — SOURCE ONLY — STOP

PR #40 **merged** via merge commit.
Merge SHA: `1e65a43e131b3b5709a8870b1a24a40f8a004978`
Head merged: `66d906c39f0fd07bc8b4a39dcdc889e8b0d11506`
Production before: `70c083af6ec0165e95f439fe6111e7e0a62c8ecd`

| Item | Status |
|------|--------|
| Git source | **MERGED TO production — SOURCE ONLY** |
| App Hosting | **SUCCEEDED** — see rollout record above |
| Runtime promotion | **PARTIAL** — Portal live; Functions/Rules/Algolia/Storage still gated |
| RC-R3 / R6 | **OPEN** |
| RC-R4 | prerequisite **SATISFIED**; Rules deploy still **OPEN** |

## 2026-08-08 - PR #40 PRE-MERGE VERIFICATION + PROD INVENTORY — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (was open; now merged).
Source verification SHA: `1d13edf2eb3d685773157c469b1b2e154fe0fd93`

| Item | Status |
|------|--------|
| Pre-merge verdict | **PASS WITH NOTES** |
| RC-R7 | **SATISFIED** |
| RC-R2 / RC-R5 | **SATISFIED** |
| RC-R3 | **OPEN** |
| RC-R4 / RC-R6 | **OPEN** |
| Verification | `docs/workflow/reviews/2026-08-08-pr-40-pre-merge-verification-result.md` |
| Inventory | `docs/workflow/reviews/2026-08-08-pr-40-production-inventory-result.md` |


## 2026-08-08 - OVERNIGHT CLOSEOUT — Stage 5 Signoff + PR #40 promotion Plan — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).
HEAD: `54b9fef8a0ccfa29c8b0dbcd238f8379a74e5608`

| Item | Status |
|------|--------|
| Stage 5 Signoff | **approved_with_notes** |
| Stage 5 path | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-signoff.md` |
| PR #40 promotion Plan | `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md` |
| Formal Review | **approved_with_changes** (RC-R1 SATISFIED; RC-R2–R8 open) |
| Review path | `docs/workflow/reviews/2026-08-08-pr-40-production-promotion-plan-review.md` |
| PR | mergeable clean; 54 commits / 415 files / +42399 −6907; 0 checks |
| App Hosting secrets | **CLOSED** (`APP HOSTING SECRETS READY`) |
| App Hosting rollout | **NOT RUN** |
| Next phrase | `APPROVE PR 40 PRE-MERGE VERIFICATION` |
| Confirmations | NO merge / deploy / Firebase / Algolia / secrets / Storage / App Hosting |

## 2026-08-08 - apphosting-env-secrets integrated into PR #40 promotion — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| `apphosting-env-secrets` | **SIGNOFF approved_with_notes** (CLOSED) |
| Secrets create/grant | **PASS** — `APP HOSTING SECRETS READY` |
| `apphosting.yaml` | `secret:` refs only (no plaintext Firebase web config) |
| App Hosting rollout | **Not done** — needs `APPROVE APP HOSTING ROLLOUT` after YAML on `production` |
| PR #40 promotion plan | Amended with Checkpoint 2b + rollout smoke |
| Next | `APPROVE STAGE 5 SIGNOFF` → `APPROVE PR 40 PRODUCTION PROMOTION PLAN` |
| Confirmations | NO App Hosting deploy / merge / secret values in chat |

## 2026-08-08 - PR #40 PRODUCTION PROMOTION PLAN + REVIEW — approved_with_changes — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Plan | `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md` |
| Formal Review | **approved_with_changes** (RC-R1–RC-R7) |
| Review path | `docs/workflow/reviews/2026-08-08-pr-40-production-promotion-plan-review.md` |
| Stage 5 Signoff | **MISSING** |
| Source merge-ready as-is? | **No** |
| Merge timing | After Stage 5 Signoff + prod inventory + pre-merge suite; before destructive deletes |
| Algolia | Prod prerequisites **NEEDS PROD CHECK**; FS browse safe if Algolia OFF |
| Next phrase | `APPROVE STAGE 5 SIGNOFF` then `APPROVE PR 40 PRODUCTION PROMOTION PLAN` |
| Confirmations | NO implement / deploy / Algolia mutation / Storage cleanup / merge |

## 2026-08-08 - COMMIT/PUSH + PR #40 AUDIT — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Main commit | `cb804ba` — `fix: harden post-launch catalog and processing stability` (161 files) |
| Follow-up | `e562411` — workflow state after PR audit |
| Push | **PASS** (no force) |
| PR title | `fix: harden post-launch catalog and processing stability` |
| PR body | **refreshed** to current cumulative scope |
| PR head | `e562411` |
| Diff vs production | 52 commits / 406 files / +41055 / -6886 |
| Mergeable | **True / clean** |
| Recommendation | **KEEP PR #40** |
| Confirmations | NO force push / implement / deploy / production / merge / close / replacement PR |

## 2026-08-07 - taxonomy-read-spike-elimination SIGNOFF — approved_with_notes — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `45-DESIGN PERFORMANCE VALIDATION: AI SPOT CHECK PASS` |
| Follow-up | **`taxonomy-read-spike-elimination` CLOSED** |
| Signoff | **approved_with_notes** |
| Signoff path | `docs/workflow/reviews/2026-08-07-taxonomy-read-spike-elimination-signoff.md` |
| 45-design final | **PASS WITH NOTES** |
| Final result | `docs/workflow/reviews/2026-08-07-taxonomy-45-design-performance-validation-result.md` |
| Studio | ~139 billable; **0** `/tags`; **0** `/categories`; import **2.00**/design |
| Server cold | materialization rev **2**, chunkCount **1**, ~207ms |
| Server warm | **89** process-cache hits; **0** fallback |
| Console peak | **222** reads/min (vs historical ~1.3K/1.4K towers) |
| AI quality | **PASS — 8/8 reasonable** |
| Next | **STOP** — no Stage 6 / prod / PR merge / deploy / implement |
| Confirmations | NO implementation / taxonomy mutation / deploy / production / PR merge / Stage 6 |

## 2026-08-07 - 45-design SERVER TAXONOMY VALIDATION PASS WITH NOTES

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `45-DESIGN PERFORMANCE VALIDATION: INSPECT SERVER TAXONOMY LOGS` |
| Verdict | **PASS WITH NOTES** |
| Window | `2026-08-08T03:58Z`–`04:12Z` |
| Instances | **1** |
| Cold load | materialization rev **2**, chunkCount **1**, 207ms |
| Cache hits | **89** |
| Fallback / publishers | **0** / **0** |
| Note | `documentCount:1139` = corpus size when `source:materialization` |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-45-design-server-taxonomy-validation-result.md` |
| Confirmations | NO mutation / deploy / prod / merge |

## 2026-08-07 - taxonomy corrective SIGNOFF + 45-design checkpoint PREP — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Corrective | `taxonomy-trigger-rebuild-corrective` |
| Signoff | **approved_with_notes** |
| Signoff path | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-signoff.md` |
| Parent follow-up | `taxonomy-read-spike-elimination` **closed** (see parent Signoff above) |
| 45-design checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-45-design-performance-validation-checkpoint.md` |
| Batch executed | **Yes** (later; final PASS WITH NOTES) |
| Confirmations | NO batch / mutation / implement / deploy / prod / merge (at prep time) |

## 2026-08-07 - STUDIO STALE-REVISION DISK CACHE PASS

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | Full Studio restart + Design Library |
| Path | `%APPDATA%\@fresh-prints\studio\taxonomy-cache\v1.json` |
| revision | **2** |
| contentHash | matches live `38e69b…bdd33e59` |
| Structure | 1121 tags / 18 cats; healthy |
| Verdict | **PASS** |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-studio-stale-revision-disk-cache-verify-result.md` |
| Confirmations | NO file modify / mutation / deploy / prod / merge |

## 2026-08-07 - Studio stale-refresh Debug INCONCLUSIVE — investigate DONE

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | Studio stale-revision Debug inconclusive |
| Classification | Expected remount + **tracer blind spot** |
| Cause | `taxonomyMaterializationService` `getDoc`s uninstrumented |
| Next QA | Hard-reload → Design Library → `userData/taxonomy-cache/v1.json` revision **2** |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-studio-stale-revision-refresh-inconclusive-investigation.md` |
| Implement | **No** |
| Confirmations | NO mutation / deploy / prod / merge |

## 2026-08-07 - taxonomy MUTATION SERVER RE-QA PASS (rev 2) — STOP before Studio refresh

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `TAXONOMY MUTATION RE-QA: ALIAS REMOVED SUCCESSFULLY` |
| Verdict | **PASS** |
| Revision | **1 → 2** |
| Alias | absent canonical + materialization |
| Trigger | `onTagTaxonomySourceWritten` ~**5.91s**; 1 start / 1 success |
| Hash | unchanged vs rev1 (**expected** — rev1 never had smoke alias) |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-mutation-server-re-qa-result.md` |
| Next | Studio stale-cache refresh (separate) |
| Confirmations | NO agent mutation / deploy / prod / merge |

## 2026-08-07 - taxonomy TRIGGER REBUILD CORRECTIVE DEPLOY PASS — STOP before mutation re-QA

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV TAXONOMY TRIGGER REBUILD CORRECTIVE DEPLOY` |
| Verdict | **PASS** |
| Updated | `onTagTaxonomySourceWritten`, `onCategoryTaxonomySourceWritten` (ACTIVE) |
| Materialization | still revision **1** (no unexpected rebuild) |
| Alias | `taxonomy-smoke-20260807` still on `tags/acdc` only |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-dev-deploy-record.md` |
| Next | Owner remove alias once → prove rev **1→2** |
| Confirmations | NO mutation / callable / Rules / Storage / Algolia / prod / merge |

## 2026-08-07 - taxonomy TRIGGER REBUILD CORRECTIVE — Implement APPROVED, STOP before deploy

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE TAXONOMY TRIGGER REBUILD CORRECTIVE IMPLEMENTATION` |
| Selected | **Option A** awaited per-instance coalesce |
| Impl Review | **APPROVED** |
| Review path | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-implementation-review.md` |
| Tests | 18/18; functions tsc + eslint PASS |
| Live defect | still present until deploy (rev 1; alias on `acdc`) |
| Next | `APPROVE DEV TAXONOMY TRIGGER REBUILD CORRECTIVE DEPLOY` |
| Deploy allowlist | `onTagTaxonomySourceWritten`, `onCategoryTaxonomySourceWritten` |
| Confirmations | NO deploy / mutation / Studio / Rules / Algolia / prod / merge |

## 2026-08-07 - taxonomy TRIGGER REBUILD CORRECTIVE — Plan+Review STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `PLAN TAXONOMY TRIGGER REBUILD CORRECTIVE` |
| Plan | `docs/workflow/plans/2026-08-07-taxonomy-trigger-rebuild-corrective-plan.md` |
| Review | **approved_with_changes** RC-R1–RC-R8 |
| Review path | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-plan-review.md` |
| Recommend | Option A awaited coalesce (B fallback); reject C |
| Live defect | still present (rev 1 stale; alias on `acdc`) |
| Next | `APPROVE TAXONOMY TRIGGER REBUILD CORRECTIVE IMPLEMENTATION` |
| Confirmations | NO implement / deploy / mutation / prod / merge |

## 2026-08-07 - taxonomy MUTATION SERVER REBUILD FAIL — STOP before Studio refresh

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `TAXONOMY MUTATION SMOKE: OWNER MUTATION COMPLETE` |
| Alias | `taxonomy-smoke-20260807` on `tags/acdc` (**canonical PASS**) |
| Materialization | still revision **1** / hash unchanged (**FAIL**) |
| Tag trigger | fired; HTTP 200 ~176ms; **0** rebuild-success |
| Category trigger | **0** runs |
| Suspected cause | coalesce `setTimeout(750)` after Gen2 handler return |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-mutation-server-rebuild-verify-result.md` |
| Studio stale refresh | **STOPPED** |
| Confirmations | NO deploy / prod / merge / alias removal |

## 2026-08-07 - taxonomy STUDIO READ SMOKE PASS WITH NOTES — mutation checkpoint ready

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `STUDIO TAXONOMY MATERIALIZATION READ: PASS WITH NOTES` |
| Proof | Design Library warm-cache: **0** tags / **0** categories reads |
| Result | `docs/workflow/reviews/2026-08-07-taxonomy-studio-materialization-read-smoke-result.md` |
| Cold retest | Waived |
| Next checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-mutation-revision-smoke-checkpoint.md` (1→2) |
| Mutation executed | **No** |
| Confirmations | NO deploy / prod / merge |

## 2026-08-07 - taxonomy STUDIO READ SMOKE — awaiting owner QA

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `CONTINUE WORKFLOW: TAXONOMY STUDIO MATERIALIZATION READ SMOKE` |
| Checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-studio-materialization-read-smoke-checkpoint.md` |
| Goal | Prove AI Review uses materialization (not listTags 1121 / listCategories 18) |
| Mutation | **Forbidden** |
| Next | Owner reply PASS / FAIL / PASS WITH NOTES + debug counts |
| Confirmations | NO mutation / deploy / prod / merge this pass |

## 2026-08-07 - taxonomy STEADY-STATE RULES DEPLOYED on fresh-prints-dev — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV TAXONOMY STEADY-STATE RULES DEPLOY` |
| Command | `firebase deploy --only firestore:rules --project fresh-prints-dev` |
| Result | **PASS** — rules released to cloud.firestore |
| Materialization | revision still **1** (no unexpected rebuild) |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-steady-state-rules-dev-deploy-record.md` |
| Next | Studio reload → staff meta/chunk read → controlled mutation 1→2 |
| Confirmations | NO Functions/Storage/prod/merge this pass |

## 2026-08-07 - taxonomy STEADY-STATE FUNCTIONS DEPLOYED on fresh-prints-dev — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV TAXONOMY STEADY-STATE FUNCTIONS DEPLOY` |
| Result | **PASS** — Deploy complete |
| Created | `onTagTaxonomySourceWritten`, `onCategoryTaxonomySourceWritten` |
| Updated | `enqueueAiEnrichment`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank` |
| Materialization | revision still **1** (no unexpected rebuild) |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-steady-state-functions-dev-deploy-record.md` |
| Next | `APPROVE DEV TAXONOMY STEADY-STATE RULES DEPLOY` |
| Confirmations | NO Rules/Storage/prod/merge this pass |

## 2026-08-07 - taxonomy STEADY-STATE DEPLOY CHECKPOINT READY — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `PREPARE DEV TAXONOMY STEADY-STATE DEPLOYMENT CHECKPOINT` |
| Bootstrap | still healthy revision 1 / 1121 / 18 / hash unchanged |
| Rules tests | **59/59 PASS** (portable Temurin 21.0.11) |
| Functions allowlist | triggers + `enqueueAiEnrichment` + playground + tagRerank |
| Callable redeploy | **No** |
| Checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-steady-state-deployment-checkpoint.md` |
| Next | `APPROVE DEV TAXONOMY STEADY-STATE FUNCTIONS DEPLOY` |
| Confirmations | NO deploy / mutation / prod / merge this pass |

## 2026-08-07 - taxonomy MATERIALIZATION BOOTSTRAP PASS on fresh-prints-dev — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Invoke | Studio `window.freshPrintsDev.rebuildTaxonomyMaterialization()` |
| Verdict | **TAXONOMY MATERIALIZATION BOOTSTRAP: PASS** |
| revision / chunks | **1** / **1** |
| tags / categories | **1121** / **18** |
| contentHash | `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` |
| chunk-0 size | 298,509 bytes |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-materialization-bootstrap-dev-record.md` |
| Next | Separate phrase for triggers / AI loader / Rules deploy |
| Confirmations | NO triggers/loader/Rules/Storage/Algolia/prod/merge this pass |

## 2026-08-07 - taxonomy BOOTSTRAP authorized — awaiting owner Studio invoke

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| meta | **still absent** (read-only pre-check) |
| Agent | Cannot invoke (shell hook); no Admin bypass |
| Owner command | `await window.freshPrintsDev.rebuildTaxonomyMaterialization()` |
| Checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-materialization-bootstrap-owner-invoke-checkpoint.md` |
| Next | Owner paste invoke JSON → agent verify + record |
| Confirmations | NO agent mutation / deploy / prod / merge this pass |

## 2026-08-07 - taxonomy bootstrap DEV CONSOLE BRIDGE APPROVED — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE TAXONOMY BOOTSTRAP DEV CONSOLE BRIDGE IMPLEMENT` |
| Impl Review | **APPROVED** |
| Bridge | `window.freshPrintsDev.rebuildTaxonomyMaterialization` |
| Gate | DEV + `fresh-prints-dev` via `isFirebaseDebugPanelEnabled` |
| Callable invoked | **No** |
| Records | impl-review + test-report under `docs/workflow/reviews/2026-08-07-taxonomy-bootstrap-dev-console-bridge-*` |
| Next | Reload Studio → `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Confirmations | NO invoke / mutation / deploy / prod / merge |

## 2026-08-07 - taxonomy bootstrap DevTools invoke INVALID — no existing owner path

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | DevTools import failed; investigation authorized |
| Cause | Electron DevTools cannot resolve bare `firebase/functions` |
| Existing wrapper / `freshPrintsDev` / UI | **None** for `rebuildTaxonomyMaterializationCallable` |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-bootstrap-devtools-invoke-corrective-investigation.md` |
| Proposed | Minimal DEV-only `window.freshPrintsDev` bridge (not implemented) |
| Confirmations | NO invoke / mutation / deploy / prod / merge |

## 2026-08-07 - taxonomy BOOTSTRAP INVOKE STOPPED — shell hook / owner Studio run needed

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Pre-checks | **PASS** (project, callable present, triggers absent, meta absent) |
| Agent invoke | **Blocked** by Cursor shell hook |
| Checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-materialization-bootstrap-invoke-checkpoint.md` |
| Next | Owner Studio console `httpsCallable("rebuildTaxonomyMaterializationCallable")` once → paste JSON → agent verify |
| Confirmations | NO mutation this pass; NO triggers/Rules/loader/Studio/prod/merge |

## 2026-08-07 - taxonomy bootstrap CALLABLE DEPLOYED on fresh-prints-dev — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV TAXONOMY BOOTSTRAP CALLABLE DEPLOY` |
| Command | `firebase deploy --only functions:rebuildTaxonomyMaterializationCallable --project fresh-prints-dev` |
| Result | **Deploy complete** — Successful create (`us-central1`) |
| List | `rebuildTaxonomyMaterializationCallable` present; taxonomy triggers **absent** |
| Record | `docs/workflow/reviews/2026-08-07-taxonomy-bootstrap-callable-dev-deploy-record.md` |
| Callable invoked | **No** |
| Next | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Triggers / Rules / loader / Studio / prod / merge | **Forbidden** this gate |

## 2026-08-07 - taxonomy materialization BOOTSTRAP STOPPED — needs Functions deploy

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Result | **STOPPED — no mutation** |
| Reason | Only approved path is undeployed `rebuildTaxonomyMaterializationCallable`; no ops script in Implement |
| Checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-materialization-bootstrap-dev-checkpoint.md` |
| Minimal next | `firebase deploy --only functions:rebuildTaxonomyMaterializationCallable --project fresh-prints-dev` then re-authorize bootstrap |
| Confirmations | NO bootstrap write / Functions deploy / Rules deploy / Storage / prod / PR merge |

## 2026-08-07 - taxonomy-read-spike-elimination SOURCE IMPLEMENT APPROVED — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).
HEAD: `eaa461e` (working tree dirty — taxonomy source uncommitted).

| Item | Status |
|------|--------|
| Follow-up | `taxonomy-read-spike-elimination` |
| Owner | `APPROVE TAXONOMY SPIKE ELIMINATION IMPLEMENT` |
| Implement + Test + Impl Review | **APPROVED** (source only) |
| Impl Review | `docs/workflow/reviews/2026-08-07-taxonomy-read-spike-elimination-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-07-taxonomy-read-spike-elimination-test-report.md` (37/37 targeted) |
| Live bootstrap | **NOT done** |
| Functions / Rules deploy | **NOT done** |
| Confirmations | NO bootstrap / Rules deploy / Functions deploy / Storage / Algolia taxonomy / prod / PR merge |
| Next | Separate owner phrases for bootstrap → deploy → validation |

## 2026-08-07 - taxonomy-read-spike-elimination PLAN + Formal Review — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Follow-up | `taxonomy-read-spike-elimination` |
| Plan | `docs/workflow/plans/2026-08-07-taxonomy-read-spike-elimination-plan.md` |
| Formal Review | **approved_with_changes** |
| 00:20Z spike | **1** AI `taxonomy-load-success` = **1139** docs (instance `0278ec32…`) |
| 00:22Z spike | Studio AI Review hydrate **1139** (proven) |
| Recommend | Hybrid B+D compact Firestore materialization + Studio disk cache |
| Implement | **Authorized and completed (source)** — see section above |
| Confirmations | NO implement / deploy / Firebase mutation / Storage / Rules / Algolia / prod / PR merge |

## 2026-08-07 - Stage 5 Rules DEPLOYED on fresh-prints-dev

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE DEV RULES DEPLOY: STAGE 5` |
| Command | `firebase deploy --only firestore:rules,storage --project fresh-prints-dev` |
| Result | **exit 0** — Storage + Firestore Rules released |
| Record | `docs/workflow/reviews/2026-08-07-stage-5-rules-deploy-dev-record.md` |
| Storage delete | Already empty / PASS |
| Next | Stage 5 Signoff (optional owner smoke) |
| Stage 6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 5 STORAGE DELETED PASS — STOP before Rules deploy

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `STAGE 5 STORAGE DELETED: PASS` |
| Agent verify (list-only) | portal-catalog **0**; catalog-reference **0**; snapshotPublicationState **0** |
| Record | `docs/workflow/reviews/2026-08-07-stage-5-storage-delete-dev-record.md` |
| Verify JSON | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-post-delete-verify-fresh-prints-dev.json` |
| Next | `APPROVE DEV RULES DEPLOY: STAGE 5` |
| Stage 6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 5 APPLY resilience corrective APPROVED — resume pending

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Partial APPLY | Run1 ≥11k/57377; Run2 ≥10k/46298; GCS internal error |
| Corrective | concurrency 8 + retry/backoff + re-list verify |
| Impl Review | **APPROVED** — `docs/workflow/reviews/2026-08-07-stage-5-apply-resilience-corrective-implementation-review.md` |
| Live delete this pass | **None** |
| Next | Owner resume APPLY (checkpoint); reply `STAGE 5 STORAGE DELETED: PASS` |
| Rules / Stage 6 / prod / merge | **Forbidden** until separate phrases |

## 2026-08-07 - Stage 5 DELETE authorized — owner must run APPLY locally

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `STAGE 5 DRY-RUN: PASS` + `APPROVE DEV STORAGE DELETE: STAGE 5` |
| Agent APPLY | **Blocked** by shell delete hook |
| Checkpoint | `docs/workflow/reviews/2026-08-07-stage-5-storage-delete-dev-checkpoint.md` |
| Next | Owner runs APPLY=1 command; reply `STAGE 5 STORAGE DELETED: PASS` |
| Rules deploy | **Not authorized** yet |
| Stage 6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 5 DRY-RUN complete — STOP before delete

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner phrase | `APPROVE DEV STORAGE DRY-RUN: STAGE 5` |
| Mode | **DRY RUN** only |
| portal-catalog | **57,354** objects / **146,829,893** bytes |
| catalog-reference | **23** objects / **4,478,422** bytes |
| snapshotPublicationState | **2** docs (`catalog-reference`, `portal-catalog`) |
| Record | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-dry-run-record.md` |
| JSON | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-dry-run-fresh-prints-dev.json` |
| Deletes / Rules deploy | **None** |
| Next | Owner `STAGE 5 DRY-RUN: PASS` → then `APPROVE DEV STORAGE DELETE: STAGE 5` |
| Stage 6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 5 source Implement APPROVED — STOP before live dry-run

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).
HEAD: `eaa461e` (Stage 5 source changes **uncommitted**).

| Item | Status |
|------|--------|
| Owner phrase | `APPROVE STAGE 5 IMPLEMENT` |
| Implementation Review | **APPROVED** |
| Ops script | `functions/scripts/stage5-generated-asset-cleanup.mjs` (not run live) |
| Rules source | Narrowed in repo; **not deployed** |
| Tests | Guard 15/15; containment 10/10; Functions tsc ok; Rules suite blocked (no Java) |
| Next | `APPROVE DEV STORAGE DRY-RUN: STAGE 5` |
| Stage 6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 5 PLANNING complete — STOP before Implement

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner phrase | `APPROVE STAGE 5 PLANNING` |
| Plan | `docs/workflow/plans/2026-08-07-stage-5-generated-asset-cleanup-plan.md` |
| Formal Review | **approved_with_changes** — `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-plan-review.md` |
| Scope | Dry-run → delete `generated/portal-catalog/**` + `generated/catalog-reference/**`; orphan `snapshotPublicationState`; narrow Rules on **dev** |
| Next | `APPROVE STAGE 5 IMPLEMENT` (then dry-run / delete / Rules deploy phrases) |
| Stage 6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 4 Signoff COMPLETE (dev) — STOP before Stage 5

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Stage 4 | **approved_with_notes** |
| Owner QA | `STAGE 4 POST-DELETE QA: PASS` + `ALGOLIA OFF: PASS` |
| Publishers on `fresh-prints-dev` | **Deleted** |
| Algolia | Sync/reconcile live |
| Signoff | `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-signoff.md` |
| Next | Owner may authorize **Stage 5 PLANNING** (Storage cleanup) — not started |
| Stage 6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 4 publishers deleted on fresh-prints-dev — post-delete QA next

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `STAGE 4 PUBLISHERS DELETED: PASS` |
| Six publishers | **Absent** (verified) |
| Algolia sync/reconcile | **Present** |
| Record | `docs/workflow/reviews/2026-08-07-stage-4-publisher-delete-dev-record.md` |
| Next | Stage 4 post-delete QA |
| Stage 5/6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 4 publisher DELETE — owner must run functions:delete

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Phrase | `APPROVE DEV FUNCTIONS DELETE: STAGE 4 PUBLISHERS` |
| Algolia redeploy | **Done** (sync + reconcile + scheduled) |
| Six publisher delete | **Blocked in agent** — owner runs CLI locally |
| Checkpoint | `docs/workflow/reviews/2026-08-07-stage-4-publisher-delete-dev-checkpoint.md` |
| Reply after delete | `STAGE 4 PUBLISHERS DELETED: PASS` |

## 2026-08-07 - Stage 4 source Implement APPROVED — STOP before live Function delete

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).
HEAD (last commit): `eaa461e` — Stage 4 source changes **uncommitted**.

| Item | Status |
|------|--------|
| Owner | `APPROVE STAGE 4 IMPLEMENT` |
| Impl Review | **APPROVED** |
| Portal generated fallback | **Removed** |
| Classifier | `functions/src/algolia/portalCatalogChangeClassifier.ts` |
| Six publishers in source | **Removed** (live still deployed until delete phrase) |
| Next | `APPROVE DEV FUNCTIONS DELETE: STAGE 4 PUBLISHERS` |
| Stage 5/6 / prod / merge | **Forbidden** |

## 2026-08-07 - Stage 4 PLANNING approved (code Implement gated; no live delete yet)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner | `APPROVE STAGE 4 PLANNING` |
| Plan | `docs/workflow/plans/2026-08-07-stage-4-publisher-retirement-plan.md` |
| Formal Review | **approved_with_changes** |
| Next | Owner may authorize Stage 4 **code** Implement |
| Live Function delete | **Not authorized** until deploy phrase after Impl Review |
| Stage 5/6 / prod / merge | **Forbidden** |
| Publisher | **Still alive** |

## 2026-08-07 - Stage 1b-C Algolia owner QA complete (STOP before Stage 4)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Stage 1b-C | **approved_with_notes** — `ALGOLIA OUTAGE: PASS` closes checklist |
| Signoff | `docs/workflow/reviews/2026-08-07-stage-1b-c-algolia-owner-qa-signoff.md` |
| Deferred | TD-030; Discover rail≠View All note |
| Stage 4 / prod / merge | **Not started / none / unmerged** — owner-gated |
| Publisher | **Still alive** |

## 2026-08-07 - Stage 1b-C Favorites/details/share/request PASS WITH NOTES

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner QA | `FAVORITES DETAILS SHARE REQUEST: PASS WITH NOTES` |
| Deferred | TD-030 — details/share Add-to-Request → quantity control parity with catalog cards |
| Next | **Algolia outage / kill-switch** |
| Publisher / prod / merge / Stage 4+ | Alive / none / unmerged / not started |

## 2026-08-07 - Stage 1b-C Discover View All corrective signed off (PASS WITH NOTES)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Owner QA | `DISCOVER VIEW ALL: PASS WITH NOTES` |
| Signoff | **approved_with_notes** |
| Note | Popular/category View All order ≠ Discover rails (accepted; home pool vs View All contracts). New This Week matches exactly. |
| Next | Stage 1b-C **Favorites / details / share / Add to Request** |
| Publisher / prod / merge / Stage 4+ | Alive / none / unmerged / not started |

Signoff: `docs/workflow/reviews/2026-08-07-stage-1b-c-discover-view-all-regressions-signoff.md`

## 2026-08-07 - Stage 1b-C Discover View All corrective — STOP for owner re-QA

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Defects | Popular View All blank; category View All wrong order |
| Root causes | `orderBy(requestCount)` omits missing field; readyAt completeness demoted to createdAt order |
| Fix | Membership + client-sort repair in `catalogService` (metric / ready-order keys) |
| Automated | **68/68** + Portal tsc + eslint + diff-check |
| Impl Review | **APPROVED** — `docs/workflow/reviews/2026-08-07-stage-1b-c-discover-view-all-regressions-implementation-review.md` |
| Publisher / prod / merge / Stage 4+ | **Unchanged** (alive / none / unmerged / not started) |

Owner re-QA: Popular → View All; Funny & Sarcastic → View All; one other category; New This Week → View All.

## 2026-08-07 - Stage 1b-A Algolia implement complete; STOP at secrets checkpoint

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| D1 | **Algolia** (owner selected) |
| Stage 1b-A code | Adapter + sync + reconcile + debounce; Impl Review **APPROVED_WITH_CHANGES** |
| Live Algolia | **Not enabled** — awaiting account/secrets/deploy |
| Publisher | **Still alive** (Stage 4 not started) |
| Production / merge | **None** |

Checkpoint: `docs/workflow/reviews/2026-08-07-stage-1b-algolia-dev-secrets-checkpoint.md`
Impl Review: `docs/workflow/reviews/2026-08-07-stage-1b-algolia-implementation-review.md`

## 2026-08-07 - Stage 1b D1 decision package ready (Implement BLOCKED)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Amendment 9 | **Closed** (P0/P1/P3/P4); P2 no-implement |
| Stage 1b D1 package | Decision analysis + Plan + Formal Review **APPROVED_WITH_CHANGES** |
| Stage 1b Implement | **BLOCKED on owner D1** |
| Options | A Algolia · B Typesense Cloud · C Product Simplification B1 |
| Production / merge / providers | **None** |

Docs:
- `docs/workflow/reviews/2026-08-07-stage-1b-d1-search-architecture-decision-analysis.md`
- `docs/workflow/plans/2026-08-07-stage-1b-search-replacement-plan.md`
- `docs/workflow/reviews/2026-08-07-stage-1b-search-replacement-plan-review.md`

## 2026-08-07 - Amendment 9 live QA PASS WITH NOTES; P1/P3 signed off; P2 no-implement

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Overall Amendment 9 live QA | **PASS WITH NOTES** |
| P0 | **PASS** |
| P1 | **PASS WITH NOTES** → Signoff **approved_with_notes** (import 2.00/design) |
| P3 | **PASS** → Signoff **approved** (1 cold load / 89 hits / 1 instance) |
| P4 | **PASS** this run (3 pubs / 3,462 C+T+R; min interval OK) |
| P2 | Formal Review **approved — recommend NO IMPLEMENTATION** |
| Amendment 9 optimization set | **Closed** (P0/P1/P3/P4 live-validated; P2 accept fixed cost) |
| Stage 1b | **Not started** |
| Production / PR merge | **None** |

Attribution: `docs/workflow/reviews/2026-08-07-amendment-9-combined-live-qa-attribution.md`
P1 Signoff: `docs/workflow/reviews/2026-08-07-amendment-9-p1-signoff.md`
P3 Signoff: `docs/workflow/reviews/2026-08-07-amendment-9-p3-signoff.md`
P2 Plan: `docs/workflow/plans/2026-08-07-amendment-9-p2-studio-tag-library-read-containment-plan.md`
P2 Review: `docs/workflow/reviews/2026-08-07-amendment-9-p2-studio-tag-library-read-containment-review.md`

Console ~2K/~1.7K = stacked fixed costs (P3 cold + P4 pubs ± Studio tags), not O(n²).

## 2026-08-07 - Amendment 9 P3 deployed to fresh-prints-dev (await combined QA)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| P3 taxonomy cache | Impl **APPROVED** (`c3d3c45`); **deployed** to `fresh-prints-dev` |
| P1 import/approval reads | Impl **APPROVED** (`dab3c44`); Studio-only (no deploy) |
| Case D / P4 | Signoffs complete |
| Stage 1b | **Not started** |
| Production | **None** |

Deploy record: `docs/workflow/reviews/2026-08-07-amendment-9-p3-dev-deploy-record.md`
Combined QA: `docs/workflow/reviews/2026-08-07-amendment-9-p3-p1-combined-manual-qa.md`

Functions updated: `enqueueAiEnrichment`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`, `updateAiEnrichmentSettings`.

## 2026-08-07 - Amendment 9 P3 implemented (awaiting Functions deploy)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Amendment 9 P3 taxonomy cache | Impl Review **APPROVED**; 15m process-local TTL + in-flight dedupe |
| P3 live deploy | **Not deployed** — checkpoint ready for owner |
| Case D / P4 | Signoffs complete (unchanged) |
| Stage 1b / P1 | Stage 1b not started; P1 next |
| Production | **None** |

Deploy checkpoint:
`docs/workflow/reviews/2026-08-07-amendment-9-p3-dev-deployment-checkpoint.md`

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentTagRerank,functions:updateAiEnrichmentSettings --project fresh-prints-dev
```

## 2026-08-06 - Case D + Amendment 9 P4 Signoff complete

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).

| Item | Status |
|------|--------|
| Case D New This Week → `readyAt` | Signoff **approved** (`f9bc19c`) |
| Amendment 9 P4 rate guard | Signoff **approved_with_notes** (`9fe6430` + `fresh-prints-dev` deploy) |
| P4 live rate-guard | **PASSING** — 3 pubs; 3,436 C+T+R vs ~28,710 (~88%↓) |
| P4 production-promotion blocker | **Cleared** |
| Stage 1b | **Not started** |
| Production deploy | **None** |

Note: each remaining full generated catalog publication still costs ~1.1K C+T+R; permanent
removal depends on later generated search/facet retirement/replacement.

Signoffs:
- `docs/workflow/reviews/2026-08-06-portal-new-this-week-readyat-signoff.md`
- `docs/workflow/reviews/2026-08-06-amendment-9-p4-signoff.md`

## 2026-08-06 - Case D New This Week → readyAt implemented (awaiting owner QA)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).

Implemented: Discover New This Week membership + order = `readyAt`; Home rail via
`rankNewThisWeek` on `readyAtMs` (legacy key fallback `readyAtMs ?? createdAtMs`).
Impl Review **APPROVED**. **Superseded:** owner PASS + Signoff approved (see entry above).

## 2026-08-06 - Discover New This Week → readyAt Plan approved (STOP — no Implement)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).

Owner surface: **Portal → Discover → New This Week** (Case D). Ordinary Library not assumed broken.
Product: “new” = newly ready (`readyAt`) for membership **and** order; Home New This Week rail in scope.
Amended corrective Plan Formal Review **approved**.
**Superseded by Implement entry above.**

## 2026-08-06 - Amendment 9 P4 owner QA FAIL (rate-guard PASS; ordering FAIL) — STOP

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
Deploy SHA: `9fe6430`.

Owner QA **FAIL** — Portal catalog ordering ≠ Studio (newest approved first).
**Do not Signoff P4.** No implement / deploy / merge / production / Stage 1b / P3 this pass.
*(Classification updated: surface = Discover New This Week; see entry above.)*

### A. Rate-guard attribution (Cloud Logging `fresh-prints-dev`)

Window: `2026-08-07T02:27:31Z`–`02:36:30Z` (~45 AI enqueues).

| Metric | Value |
|--------|------:|
| Successful full portal pubs | **3** |
| Timestamps | 02:29:48Z; 02:31:49Z; 02:34:35Z |
| Spacing | ~120.8s; ~166.6s |
| claimed-debounce-waiter | 2 |
| joined-existing-debounce-window | 88 |
| deferred-wake-requested / claimed | 2 / 2 |
| W2 publications | 1 |
| not-yet-eligible | 0 |
| lease-busy / failed | 0 / 0 |
| C+T+R total | **3,436** (vs prior ~28,710) |

Rate-guard live target: **PASSING** (≤6 pubs; reads ≪ 28.7K). ~1.5K Console spikes align with ~1.1K C+T+R per pub.

### B. Ordering

Investigation: Case **D** confirmed (Discover New This Week). See newer snapshot entry.

Docs:
- `docs/workflow/reviews/2026-08-06-amendment-9-p4-owner-qa-fail-attribution.md`
- `docs/workflow/reviews/2026-08-06-amendment-9-p4-portal-ordering-investigation.md`
- `docs/workflow/plans/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-plan.md`
- `docs/workflow/reviews/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-review.md`


## 2026-08-06 - Amendment 9 P4 deployed to fresh-prints-dev (awaiting owner QA)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
HEAD: `9fe6430`.

Owner phrase obtained. Deployed to **`fresh-prints-dev` only**:
- created `onPortalCatalogPublicationStateWritten` (W2)
- updated design/category/tag snapshot triggers + rebuild/retry callables

Record: `docs/workflow/reviews/2026-08-06-amendment-9-p4-dev-deploy-record.md`
Manual QA: `docs/workflow/reviews/2026-08-06-amendment-9-p4-manual-qa.md`
No Signoff / merge / production. Stage 1b / P3 not started.
**Superseded:** owner QA FAIL recorded above.

## 2026-08-06 - Amendment 9 P4 implemented (awaiting Functions deploy approval)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).

Implemented: portal quiet 30s + min interval 120s + passLimit=1 + `nextEligiblePublishAt` +
W2 `onPortalCatalogPublicationStateWritten` + P4-a non-ready INDEX_FILTER skip.
Tests: catalogSnapshots **138/138**; Functions build exit 0.
Impl Review **APPROVED**. Stop for:
`APPROVE DEV FUNCTIONS DEPLOY: AMENDMENT 9 P4`
Deploy checkpoint:
`docs/workflow/reviews/2026-08-06-amendment-9-p4-dev-deployment-checkpoint.md`
Manual QA: `docs/workflow/reviews/2026-08-06-amendment-9-p4-manual-qa.md`
No Signoff / merge / production. Stage 1b / P3 not started.

## 2026-08-06 - Amendment 9 P4 Plan + Formal Review approved (Investigate/Plan/Review only)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
HEAD: `862f7d1`.

**Pass:** Refresh source → Investigate post–Stage 1a publication → Plan → Independent Formal
Review → **Stop**. No Implement, deploy, merge, cleanup, Stage 1b, or production action.

Plan:
`docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-p4-plan.md`
Review (**approved**; R1–R5 applied):
`docs/workflow/reviews/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-p4-review.md`

**Root cause of 25 pubs:** claim windows reopen across paced approvals + immediate catch-up
serial full scans (≤3) + non-ready INDEX_FILTER full schedules (R=0 waste).

**Recommended guard:** quiet 30s + min interval 120s + portal `passLimit=1` + W2
coordination-doc auto-wake + classifier skip when neither side is `ready`. Bounds: ≤5 pubs
for 45 approvals (≤10 min wall); ≤8 for 100 (≤14 min). Worst-case search freshness ≤ ~6 min.
Estimated ~80% fewer publication reads vs observed 28.7K. Stage 1b / D1 not started. P3
separate. Generated search/multi-tag/facets preserved.

**Next:** Owner authorizes Implement Amendment 9 P4 (separate). No Firebase until after
Implement + Test + owner deploy phrase.

## 2026-08-06 - Amendment 8 Phase 1B Stage 1a Signoff approved (final)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
Implementation commit: `e97ab3b` (Amendments 1–3 on top of Stage 1a `b397ec0`).

Stage 1a **complete and approved**. Firestore-primary known-ID hydration; Firestore-only
categories (active ∧ ready count &gt; 0); Studio empty actives retained; dead Discover
generated entry removed; search/multi-tag/facets still generated temporarily.
Owner QA **PASS**. Signoff **approved**:
`docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-signoff.md`.
**Stage 1b blocked on owner D1** (Algolia vs Typesense managed search, or Option B product
simplification). No deploy / merge / cleanup / Function retirement / production.

## 2026-08-06 - Stage 1a Amendment 2 (Case A archive persist) awaiting owner re-QA

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).

Amendment 1 mapper FAIL on live QA → Amendment 2 **Case A**: Firestore never went
`isActive: false` (0/18 inactive; 0 category-archive Function POSTs). Studio
`persistCategoryArchive` + client fallback; Portal focus/visibility reload. Impl
review **APPROVED**. No Signoff. No Function deploy. Reduced re-QA:
`docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-2-manual-qa.md`.
Note: item 7 Portal empty-visible wording **superseded** by Amendment 3 product rule.

## 2026-08-06 - Stage 1a Amendment 1 (inactive categories) awaiting owner re-QA

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).

Owner QA #7 FAIL → Amendment 1: restore `mapPortalActiveCategory` requiring `isActive === true`.
Record / review / re-QA under `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-1-*`.
Superseded by Amendment 2 (Case A). No Signoff. No deploy. Stage 1b not started.

## 2026-08-06 - Amendment 8 Phase 1B Stage 1a awaiting owner QA

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).

Implemented: Firestore-primary known-ID hydration; Firestore-only active categories; removed
dead `listDiscoverDesigns`. Search/multi-tag/facets still generated (Stage 1b blocked on D1).

Test report: `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-test-report.md`
Impl review **APPROVED**:
`docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-implementation-review.md`
Owner QA: `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-manual-qa.md`

No deploy / merge / Function retirement / cleanup / production.

## 2026-08-06 - Amendment 8 Phase 1B revalidation Plan APPROVED (Investigate/Plan/Review only)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
HEAD: `71a4cec`.

**Pass:** Investigate → Revised Phase 1B Plan → Independent Formal Review → **Stop**.
No Implement, deploy, merge, cleanup, Function retirement, or production action.

Plan:
`docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-8-phase-1b-revalidation-plan.md`
Review (APPROVED):
`docs/workflow/reviews/2026-08-06-post-launch-catalog-and-processing-stability-amendment-8-phase-1b-revalidation-plan-review.md`

Headline: Studio + Portal ordinary browse already Firestore; 5 Portal generated-read entry
points remain (search/multi-tag/facets/by-id/categories-prefer); AI taxonomy already FS
Strategy 2; recommend Option A managed search (D1); no design snapshot in steady state; P4
→ short transition only. Owner D1 required before Stage 1b Implement.

## 2026-08-06 - Catalog mats / ready order / Assisted proof 80 MB Signoff approved

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
Commits: `42f7b20`, `982855c`, deploy record `59b52a0`.

Owner QA **PASS**. Signoff **approved**:
`docs/workflow/reviews/2026-08-06-catalog-display-ready-ordering-and-assisted-proof-limit-signoff.md`.

`fresh-prints-dev` has Storage Rules + three Assisted proof Functions at 80 MB. No production.
Amendment 9 P4 / PR merge still deferred.

## 2026-08-06 - Assisted proof 80 MB deployed to fresh-prints-dev (awaiting owner QA)

Owner approved: `APPROVE DEV DEPLOYMENT: ASSISTED CREATION PROOF 80 MB LIMIT`.

Deployed from `982855c` to **`fresh-prints-dev` only**:
- `firebase deploy --only storage`
- `functions:staffAddAssistedCreationProof`
- `functions:staffAddAssistedCreationFinalSource`
- `functions:customerAddAssistedApprovedProofToPrintRequest`

Record: `docs/workflow/reviews/2026-08-06-assisted-creation-proof-80mb-dev-deploy.md`.
Continue owner QA checklist. No production. PR #40 open/unmerged.

## 2026-08-06 - Assisted proof 80 MB (+ mats/ordering already signed) awaiting owner QA

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
Baseline: `2d2ecbb`. Mats/ordering: `42f7b20` (signed off).

**This pass:** `ASSISTED_CREATION_MAX_PROOF_BYTES` → 80 MB; Storage Rules
`isValidAssistedCreationProof` → `<= 80 * 1024 * 1024` (inclusive). Reference limits unchanged.
Owner QA:
`docs/workflow/reviews/2026-08-06-catalog-display-ready-ordering-and-assisted-proof-limit-manual-qa.md`.
**Later deploy:** `storage.rules` (+ Functions/Studio as needed) before 80 MB uploads succeed
against Storage. No Signoff. No Firebase action this pass.

## 2026-08-06 - Catalog display mats + ready-approval ordering Signoff approved_with_notes

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
Commit: `42f7b20` (already pushed).

Owner QA **PASS WITH NOTES**. Signoff **approved_with_notes**:
`docs/workflow/reviews/2026-08-06-catalog-display-background-and-ready-ordering-signoff.md`.

Studio Details mats + Portal `readyAt` browse complete. Notes: generated search publisher order
deferred; Portal local `next build` robots/`.next` failure documented (tsc green); Amendment 9
P4 snapshot reads remain production-promotion blocker. No merge/deploy.

## 2026-08-06 - Catalog display mats + ready-approval ordering (awaiting owner QA)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
Baseline: Amendment 9 P0 Signoff `120337a`.

Studio Design Details thumbnail + lightbox now use `artworkBackgroundHex` (same as card).
Portal ordinary browse/category/single-tag use server `orderBy(readyAt desc)` with completeness
+ index fallback. Studio ready ordering already correct (unchanged). Generated search publisher
order deferred. Owner QA:
`docs/workflow/reviews/2026-08-06-catalog-display-background-and-ready-ordering-manual-qa.md`.
No Signoff. No snapshot/P4/Phase 1B/deploy.

## 2026-08-06 - Amendment 9 P0 Signoff approved_with_notes

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**).
Commits: P0 `0a948e0`; scroll `21f95d7`.

Owner re-QA **PASS WITH NOTES**: post-action scroll-to-top works; client list/count budgets zero
on success; Processing intact. Signoff:
`docs/workflow/reviews/2026-08-06-amendment-9-p0-signoff.md`.

**Notes / blockers outside P0:** Design Library Details modal thumbnail + lightbox missing
`artworkBackgroundHex` mat (card OK); snapshot-publication read amplification remains
**production-promotion blocker** (P4 later). P1/P3/P4/Phase 1B not started. No merge/deploy.

## 2026-08-06 - Amendment 9 P0 owner-QA scroll correction + server attribution (awaiting re-QA; no Signoff)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
P0 baseline: `0a948e0`. Scroll correction + docs commit follows.

**Owner QA FAIL:** (1) post-action scroll stayed at bottom; (2) Console ~7.7K reads while client
Debug met P0 (~1,375 approx reads; designs 236; tags 1,121; listeners 0; no triangular reload).

**Scroll fix:** After successful approve/reject/archive, bump `reviewScrollNonce` and
`useLayoutEffect` scrolls `.page-content-area--ai-review` to top (not `window`). P0 budgets kept.

**Server attribution (read-only):** UTC `16:54:30Z`–`17:02:00Z` → **snapshot publication
dominated** (25 successful full portal publications; C+T+R sum **28,710**). AI taxonomy: **3**
full loads on **1** Function instance (~3,420 docs). P4 warranted for later planning; P3
secondary. **Do not implement P3/P4 this pass.**

Re-QA: `docs/workflow/reviews/2026-08-06-amendment-9-p0-manual-qa.md`. Signoff blocked.

P1/P3/P4/Phase 1B not started. No Firebase/production action.

## 2026-08-06 - Amendment 9 P0 implemented (awaiting owner QA; no Signoff)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).

**P0:** AI Review successful approve/reject/archive reconcile list, selection, and tab counts
locally — no full remaining-page reload and no three-tab count refresh on the happy path.
Failure: one bounded `reloadDesigns` + `onQueueChanged`. Processing paths keep authoritative
count refresh. K=∞ (no timers/polling).

Manual QA: `docs/workflow/reviews/2026-08-06-amendment-9-p0-manual-qa.md` — reply `PASS` /
`FAIL: …` / `PASS WITH NOTES: …`. Signoff blocked until owner QA.

P1/P3/P4/Phase 1B not started. No Firebase/production action.

## 2026-08-06 - Amendment 9 Plan + Formal Review complete (Investigate → Plan → Review ONLY)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
Baseline HEAD for this docs pass: `4a0c039e63778d82a40efba678fdfa3c311cead3`.

**Amendment 9:** Large-batch Firestore read amplification. Planning artifacts only — **no
implementation**, no Phase 1B, no Firebase/production action, no PR merge.

- Incident: `docs/workflow/reviews/2026-08-06-large-batch-firestore-read-amplification-incident.md`
- Plan: `docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-plan.md`
- Formal Review: `docs/workflow/reviews/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-review.md`
  — **APPROVED WITH REQUIRED CHANGES** (R1–R6 applied to Plan)

**Proven (Test Run B Debug):** AI Review reloads remaining Needs Review page after every
approval (triangular / O(n²) for N≤100) and refreshes all three tab counts; tags loaded once
(~1,121); imports 2× traced `getDesignById`/design; 0 listeners. Test Run A (~7.1K Console)
kept **separate** — owner log checklist outstanding. Phase 1B does **not** fix client AI Review
cost. Next: owner log retrieval + explicit **Implement Amendment 9 P0** approval.

## 2026-08-06 - Amendment 8 Phase 1A Signoff approved (owner PASS; Function deployed)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged).
Commits: Phase 1A `4ed41bc`; Assisted artwork-background correction `bc9e7e7`.

Owner executed
`firebase deploy --only functions:staffSuggestAssistedCreationCatalogDesign --project fresh-prints-dev`
before final re-QA. Owner re-QA: **PASS** — covered the updated Function runtime and Studio/Portal
display correction. Signoff:
`docs/workflow/reviews/2026-08-05-amendment-8-phase-1a-signoff.md` — **approved**.

Phase 1A fully signed off. No Phase 1A deployment residual or blocker. Phase 1B not started. No
production Firebase deploy. No PR merge.

## 2026-08-05 - Amendment 8 Phase 1A Assisted artwork-background correction ready for owner re-QA

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open). Phase 1A base
`4ed41bc`. Owner Phase 1A QA: **PASS WITH NOTES** (Assisted catalog-share lost configured mat).

Correction implemented + Independent Implementation Review **APPROVED**: authoritative hex
snapshot on suggest; Studio/Portal CSS mats; legacy one-shot live-resolve (including Portal proofs
list panel-scoped). Automated suites green (focused 66/66; AI regression 60/60). Signoff **not**
approved. Owner re-QA:
`docs/workflow/reviews/2026-08-05-amendment-8-phase-1a-assisted-catalog-artwork-background-manual-qa.md`.

No Phase 1B, Firebase deploy, production, or PR merge.

## 2026-08-05 - Amendment 8 Phase 1A owner QA PASS WITH NOTES; Assisted catalog-share artwork background fix (awaiting re-QA)

Branch: `fix/post-launch-catalog-and-processing-stability` / PR #40 (open). Phase 1A commit
`4ed41bc` remains. Owner Phase 1A QA: **PASS WITH NOTES** — library designs shared via Assisted
Creation lost configured artwork background (raw transparent PNG).

**Fix (working tree, not committed yet):** suggest callable snapshots `artworkBackgroundHex` /
`catalogArtworkBackgroundHex`; Studio + Portal Assisted catalog-share UI apply mat color; legacy
shares live-resolve ready design hex when snapshot missing. Plumbing test 4/4; Studio/Portal
typecheck + Functions build exit 0.

**Owner next:** re-QA per
`docs/workflow/reviews/2026-08-05-amendment-8-phase-1a-assisted-catalog-artwork-background-manual-qa.md`
→ `PASS` / `FAIL: …` / `PASS WITH NOTES: …`. Signoff blocked until note cleared. No Firebase
deploy/merge. Phase 1B still blocked on managed-search provider choice.

## 2026-08-05 - Post-launch catalog and processing stability: Owner QA Amendment 7 follow-up — the actual root cause, a second infinite reload loop, found and fixed

Same branch throughout (`fix/post-launch-catalog-and-processing-stability`, still no new branch or
PR, still no merge). This entry is a correction to the entry immediately below (the first
Amendment 7 fix) — the owner reproduced the identical symptom after that fix shipped, and a fresh
trace revealed the real, tighter loop.

**The problem, more precisely this time:** the owner's fresh trace showed a request ID climbing by
exactly 1 every ~20-24ms, hundreds of times in a row, always for the same single design, always
reporting `processingCount: 1`. This is a true infinite loop, not just excess effect churn — the
hook never reached a settled render for that one completed design until the whole batch finished.

**Root cause:** a second effect in the same hook (unrelated to the one fixed in the entry below)
had the same category of bug: its dependency array included a value that changes identity on every
render, and — critically — its own body directly triggers a reload whenever the currently-selected
design's live status shows it just completed. Since nothing else in that path moves the selection
away from a just-completed design, the effect's own reload kept re-triggering itself indefinitely.

**Fix:** removed the unstable dependency (reading a stable ref instead, matching the pattern from
the entry below) and added a guard so the reload fires at most once per completion — while still
correctly resetting for a genuinely later completion of the same design (e.g. if it's sent back to
processing and redone). An independent review caught that an early draft of this guard never reset,
which would have silently broken re-processing for any design touched twice; that was corrected
before shipping, and a second independent review confirmed the corrected version has no cross-design
side effects and, combined with the earlier fix, resolves both loop shapes the owner reported.

**Verification:** new regression test (6/6), all prior AI-queue-related tests unmodified and still
passing, Studio typecheck/build/lint/`git diff --check` all exit 0. Full detail in
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-test-report.md` §24.

No Firebase project action, Function/Rules/index/IAM/migration/secret change, production action, or
merge occurred. Large-PNG normalization, `readyAt` ordering, and the callable-timeout fix remain
unchanged.

## 2026-08-05 - Post-launch catalog and processing stability: Owner QA Amendment 7 — AI queue observer resubscription loop fixed

Same branch throughout (`fix/post-launch-catalog-and-processing-stability`, still no new branch or
PR, still no merge). This entry covers Amendment 7, which used the now-working Amendment 6
follow-up trace transport to capture a real runaway loop and fix it.

**The problem:** the owner's runtime trace showed `useDesigns` request IDs climbing from ~344 to
~584 in about 5.5 seconds, with the AI Processing observer's `observer.subscribed` event re-firing
after nearly every state replacement — an unacceptable Firestore read/effect-churn storm, visible
to the user as Processing staying stuck at its initial count until the whole batch finished, then
clearing all at once instead of the expected `3 → 2 → 1 → 0`.

**Root cause (confirmed via direct source inspection, no broad re-investigation):** the AI
Processing tab's background-queue observer subscription effect
(`useAiReviewInbox.ts`) depended on `designs` and `options`, both of which get a new object/array
identity on every render — `options` is a fresh object/callback literal the parent page passes on
every one of its own renders; `designs` gets a new array reference every time the observer's own
successful reconciliation (`applyDesignPatch`) resolves. That created a self-feeding loop: the
observer handles a completed design → patches state → the list reference changes → the parent
re-renders → the effect's dependencies changed → it unsubscribes and resubscribes → the next
completion repeats the cycle.

**Fix:** introduced three refs (`optionsRef`, `designsRef`, `selectedDesignIdRef`) assigned
directly during render — the same pattern this codebase already uses elsewhere for exactly this
purpose — so the observer's long-lived callback always reads the current values without forcing a
resubscription. The effect now subscribes exactly once per Processing-tab activation. The actual
`3 → 2 → 1 → 0` / selection-advance reconciliation logic (fixed in an earlier amendment) was not
touched — this fix is entirely about *how often* the effect resubscribes, not the reconciliation
decision itself.

**Verification:** a new source-grep regression test (7/7 pass) proves the fix; the existing
17-test reconciliation suite and 19-test trace suite both pass unmodified (zero regression). Studio
typecheck, 3-target build, lint, and `git diff --check` all exit 0. Two independent reviews ran —
one on the Plan (required two corrections, both applied), one on the finished implementation
(approved with no required changes, including empirically confirming the new tests actually fail
against the pre-fix code). Full detail in
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-test-report.md` §23
and the accompanying Amendment 7 review document.

No Firebase project action, Function/Rules/index/IAM/migration/secret change, production action, or
merge occurred. Large-PNG normalization, `readyAt` ordering, and the Amendment 5 callable-timeout
fix are all confirmed unchanged.

## 2026-08-05 - Post-launch catalog and processing stability: Owner QA Amendment 6 follow-up — AI queue trace cross-window transport fixed

Same branch throughout (`fix/post-launch-catalog-and-processing-stability`, still no new branch or
PR, still no merge). Amendments 4 and 5 (races/timeout fixes) and Amendment 6's first pass (a
dev-only AI Processing queue runtime trace, commit `8e2f6a2`) are covered by the state.md Decision
Log and Test Report §20–21; this entry covers the follow-up correction to Amendment 6's
instrumentation itself.

**The problem:** the owner's reproduction of the Amendment 6 trace returned
`{"enabled": false, "eventCount": 0, "events": []}` from the Firebase Debug panel's "Copy AI Queue
Trace" action, every time — the diagnostic itself was broken, separate from whatever the real AI
Processing defect turns out to be. Per instruction, AI queue behavior was **not** touched in this
pass — only the trace's transport.

**Root cause (confirmed via source tracing, no live Electron process available in this
environment):** the Firebase Debug panel opens as a genuinely separate Electron `BrowserWindow`
with its own independent renderer process. The original trace collector
(`packages/shared/src/utils/aiQueueTrace.ts`) stored its state as plain module-level variables, so
each renderer process (the main Studio window vs. the Debug window) got its **own disconnected
copy** — events written from the Studio window's renderer (where AI Processing actually happens)
never reached the Debug window's renderer (where Copy/Reset were being called), and the Debug
window's own renderer-side enable call only ever turned on its own copy.

**Fix:** refactored the collector into a pure `AiQueueTraceStore` class; exactly one instance now
lives in the Electron **main** process
(`apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcHandlers.ts`), registered once from
`main.ts`, gated `!app.isPackaged` exactly once at registration time (never per-renderer, never in
a packaged build). Both renderer windows reach the one store through the same preload-exposed
`window.freshPrints.aiQueueTrace` IPC bridge — the same pattern this codebase already uses for the
sibling `firebaseDebug` cross-window feature. Same 1,000-event bound, same strict field allowlist,
still no Firestore/Storage/localStorage/disk file/new backend service. Added 7 new cross-window/IPC
regression tests proving the writer (Studio window) and reader (Debug window) observe the same
store instance, including that a reset from one side is visible from the other and that a later
write after reset remains visible (proving closing/reopening the Debug window cannot lose events
from an active Studio session).

**Verification:** focused trace tests 19/19 pass, Studio typecheck exit 0, Studio 3-target Vite
build (renderer/main/preload) exit 0, repo lint exit 0, `git diff --check` exit 0 (CRLF-on-checkout
warnings only). Full detail in
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-test-report.md` §22.

No Firebase project action, AI queue behavior change, or production action was taken in this pass.
The real AI Processing defect this trace exists to diagnose is still open — the owner needs to
reproduce again with the now-working trace and copy the result before root cause can be identified.

## 2026-08-04 - Post-launch catalog and processing stability: Amendments 2 and 3 plus a readyAt global-ordering correction complete; this pass re-verified everything live and closed two documentation gaps

Continuation of the Amendment 1 entry immediately below, same branch (`fix/post-launch-catalog-
and-processing-stability`, still no new branch or PR). This pass's own work was almost entirely
independent re-verification of already-completed, already-pushed work (commits `7e5d4f4`, `13a1099`,
`c031c01`) plus closing two gaps neither `state.md` nor this file had previously recorded.

**Amendment 2** (owner QA on Amendment 1) fixed: a further AI-reconciliation gap in
`useAiReviewInbox.ts`, and a missing pre-upload byte-size re-check in `importUploadService.ts`
(`MAX_SINGLE_PNG_SIZE_BYTES`, reusing the existing constant and message formatter). Both minimal,
no Rules/listener/read-cost change.

**Amendment 3** (owner QA on Amendment 2) added: a strictly-sequential AI background processing
queue (`importAiBackgroundQueue.ts`, one awaited `enqueueForProcessing` call per iteration, no
`Promise.all`), server-side pixel normalization of oversized normalized import output
(`normalizeImportOutputBytes.ts`, fits output to the existing Storage ceiling rather than raising
it), and an initial `readyAt`-based Studio ordering (a design's most recent ready-transition time,
distinct from `createdAt`).

**Global-ordering follow-up (commit `c031c01`)** — a genuine defect Amendment 3 itself introduced,
caught and fixed in the same overall pass: `readyAt` ordering had been implemented as a **page-local
sort over a `createdAt`-ordered bounded page**, which cannot surface an old design re-approved
today (it can fall entirely outside the fetched page). Corrected to a real server-side
`where(status=="ready") orderBy(readyAt desc) orderBy(__name__ desc)` Firestore cursor query.
Because `orderBy("readyAt")` silently omits any document missing that field, added a
**completeness guard**: `listDesignsPage` compares the `readyAt`-ordered result's count against
`countDesigns` and falls back to `createdAt` ordering (also on a missing-index error) whenever they
disagree — Studio cannot silently hide legacy ready designs before a backfill runs. Archived browse
deliberately stays on `createdAt` (`readyAt` is only ever written on the ready transition, so
archived designs may lack it).

**Two items independently, freshly verified in this pass against live `fresh-prints-dev` state —
not merely restated from commit messages:**
1. **The `firestore.rules` `readyAt` type-guard addition (`isOptionalTimestamp(data, "readyAt")`)
   is committed to source but has NOT been deployed.** Confirmed via
   `node functions/scripts/compare-deployed-firestore-rules.mjs`: the live ruleset
   (`c3b89a7a-ae2a-4e0d-978e-c98c3e10991e`, created 2026-08-02) predates and does not contain this
   line. Not a security gate either way — the design-document validator has no `hasOnly`
   restriction, so `readyAt` writes already succeed today (merely unvalidated, not rejected).
   Deploying this Rules change is a separate future checkpoint needing its own owner approval.
2. **The 4 new `readyAt` composite indexes (added to `firestore.indexes.json` in the same
   follow-up commit) ARE confirmed live** on `fresh-prints-dev`, verified directly via
   `firebase firestore:indexes --project fresh-prints-dev`.
3. **The `readyAt` backfill script (`functions/scripts/backfill-design-ready-at.mjs`) has not been
   run anywhere.** Idempotent, dry-run-by-default, refuses non-dev projects without an explicit
   override — but requires Application Default Credentials or an interactive terminal this
   environment does not have. The completeness guard above keeps Studio correct in the meantime.

**Full verification suite re-run fresh on current HEAD (`c031c01`) in this pass, not assumed from
prior claims:** Functions build, Studio/Portal typecheck, Studio 3-target Vite build, repo lint,
`git diff --check` — all exit 0. Full test sweep: Functions 522/524 pass, shared 857/858 pass,
Studio 732/740 pass — the same 2 / 1 / 8 pre-existing, unrelated failures (respectively) that have
been documented and unchanged across every pass of this entire managed goal; zero new failures.
All 6 Functions from the original A–D deploy plus the 3 Amendment 1 trigger-timeout functions
remain `ACTIVE` on `fresh-prints-dev` (function count unchanged at 109, directly re-confirmed).

**No source or test change was made in this pass** — the prior Amendment 1–3 and follow-up work was
already correct, complete, committed, and pushed. This pass's only durable output is the live-state
verification above and closing the `state.md`/`CURRENT-STATE.md` documentation gap (neither
previously mentioned Amendments 2, 3, or the follow-up correction).

Reference docs (in addition to the Amendment 1 docs listed below):
`docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-2.md`,
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-2-review.md`,
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-implementation-review.md`
(now includes Amendment 1, Amendment 2, and Amendment 3 sections plus the global-ordering
follow-up correction, all appended to the same file).

## 2026-08-04 - Post-launch catalog and processing stability: Owner QA Amendment 1 complete (urgent ready-design-visibility fix)

Continuation of the A–D pass immediately below, on the same branch/PR
(`fix/post-launch-catalog-and-processing-stability`, no new branch or PR). Fixes a confirmed,
urgent, owner-repeated production defect discovered during real QA of the A–D pass.

**Confirmed defect:** designs imported, AI-processed, manually approved to `ready` in Needs Review
never appeared in Studio Design Library — not after waiting, refreshing, navigating away and back,
or restarting Studio. Treated as confirmed fact per explicit instruction, not re-litigated.

**Root cause (Studio side):** Studio's normal (non-archived) Design Library browse depended
entirely on a generated Storage snapshot (`useGeneratedReadyDesigns`) as its design-list source.
Firestore fallback only ever activated when that snapshot's *fetch itself failed* — a
successfully-fetched but merely stale snapshot (missing a newly-approved design) left the design
permanently invisible, since nothing else in the page ever consulted Firestore for the list.

**Root cause (Portal-facing, ready-boundary publisher):** independently traced via live
`fresh-prints-dev` Function log inspection — the persistent debounce-coalescing claim shipped in
the original A–D pass (and further extended by that pass's own Implementation Review to
`DEBOUNCE_MS + LEASE_MS` ≈ 10m15s) could easily outlive the three trigger functions' default
60-second Cloud Functions timeout. A genuinely slow full-catalog publish reliably risked exceeding
that timeout; a hard kill skips the claim's release entirely, stranding it for up to ~10 minutes.
Direct log evidence: 18 consecutive `"joined-existing-debounce-window"` scheduling events with
zero `"claimed-debounce-waiter"` and zero actual publish attempts in the same window — every
design write, including every real owner approval, was silently absorbed by a claim that was never
going to publish.

**Fixes:**
- Studio Design Library's design list is now unconditionally sourced from bounded Firestore
  (`useDesigns`/`designService.listDesignsPage` — already cursor-paginated, `createdAt desc`,
  15-second-TTL cached, and already correctly invalidated on approval via the pre-existing
  `invalidateDesignReadCaches` call). Generated taxonomy (categories/tags) is completely
  unaffected and remains the source for normal-browse filtering. `useGeneratedReadyDesigns` itself
  is unchanged and retained for its one other real consumer (the Assisted Creation catalog-share
  picker).
- The ready-boundary publisher's debounce claim now uses a small, dedicated 90-second
  publish-attempt margin (`DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS`) instead of the full 10-minute
  lease duration, so a killed waiter self-heals in roughly two minutes instead of ten. All three
  trigger functions now explicitly set `timeoutSeconds: 300` (previously the 60-second platform
  default), making a hard-timeout kill rare in the first place.

**Also fixed in this Amendment (owner-confirmed, related QA findings):**
- **AI Processing:** the manual "Process image with AI" and auto-advance-queue paths never
  reconciled Processing/Needs Review counts at all (only the previously-fixed rerun-from-inbox
  path did), and left `selectedDesignId` dangling on a filtered-out design when the completed
  design was the last one awaiting AI start — permanently disabling "Start AI" until an unrelated
  route remount. Both gaps fixed: `onQueueChanged` now wired through the manual/auto-queue paths;
  explicit `requestSelectDesign(null)` at every point selection would otherwise dangle.
- **Large Studio import:** a 159.24 MB PNG failed at upload time with "Use a PNG file only after
  selecting it with the file picker." despite having already passed picker selection, validation,
  trim, and normalization successfully. Root cause: a single, process-global, non-session-scoped
  `Set<string>` tracked picker-approved paths, unconditionally wiped on any re-registration — a
  redundant second full-file validation pass at upload time (now removed) roughly doubled the
  large-file exposure window for this fragility. Fixed: re-registering the identical
  already-active path is now a no-op; a genuinely different path still correctly invalidates the
  prior session (unchanged "one file at a time" model preserved). Arbitrary-filesystem-path
  security validation is completely unaffected.

**Verification:** full test suite green — zero new failures beyond one intentionally-updated
pre-existing assertion (`firestoreRouteContainment.test.ts`, which had encoded the now-superseded
generated-catalog-first architecture). Every new discriminating test independently confirmed to
fail against the corresponding pre-fix source. Functions build, Studio/Portal typecheck, Studio
3-target Vite build, lint, `git diff --check` all exit 0. Independent Implementation Review
re-derived every workstream's correctness from the actual diff and found no further defect (one
already-applied test-suite correction was independently re-confirmed as genuine, not superficial).

**Deployed to `fresh-prints-dev` only:** `onCategorySnapshotSourceWritten`,
`onTagSnapshotSourceWritten`, `onPortalCatalogSnapshotSourceWritten` — confirmed `ACTIVE`, function
count unchanged (109), `timeoutSeconds:300` confirmed genuinely live via post-deploy logs (not
just present in source). No Rules, Storage Rules, index, secret, Hosting, or unrelated Function
touched. **No production action of any kind occurred.**

**Owner follow-up required:** a compact 3-approval Studio-visibility + Portal-publication QA
checklist (Test Report §15.3) could not be run live in this environment (no interactive Studio
session, no Application Default Credentials for scripted Admin SDK access) — same constraint
documented throughout this goal. Also outstanding from the original A–D pass: Workstream E
(Studio upload authorization) reproduction, and one live Firestore-document check for Workstream
A's archive write.

Reference docs: `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-1.md`,
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-1-review.md`,
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-test-report.md`
(§15 addendum), `docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-implementation-review.md`
(Amendment 1 section appended).

## 2026-08-04 - Post-launch catalog and processing stability: Implement + Test + Implementation Review complete; A–D shipped to fresh-prints-dev, E stopped

Continuation of the Plan/Review entry immediately below, following owner approval
(`APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY IMPLEMENTATION`). Separate, concurrent
managed goal — does not affect or reopen the Studio automatic-updates / production-PR gate.

**Branch:** `fix/post-launch-catalog-and-processing-stability` (renamed from the Plan/Review-phase
branch, which was exactly 1 commit ahead of `origin/production` and 0 behind). Committed and pushed;
no PR opened, no merge, no production deploy.

**Workstreams A–D implemented, tested, and (where applicable) deployed to `fresh-prints-dev`:**
- **A (tag/category archive):** wired the existing `clearStudioTaxonomyCaches()` helper into both
  guarded-archive success paths (tags and categories — categories had the identical bug, confirmed
  and fixed in the same pass, not just flagged); added a new tag Restore action/button (previously
  missing entirely from the tag UI).
- **B (Design Library ordering):** `DESIGN_LIBRARY_DEFAULT_SORT_FIELD` corrected to `createdAt`; the
  Firestore-fallback path in `useGeneratedReadyDesigns.ts` corrected to match. Portal re-confirmed
  not reproduced in current source during implementation — no Portal file changed.
- **C (snapshot scheduling cost):** narrowed the `portal-catalog` change classifier so only a
  transition into/out of `ready` schedules a full rebuild (ordinary import/processing status churn no
  longer does); replaced the per-invocation in-memory debounce with a persisted, Firestore-
  transactional "debounce waiter" claim so concurrent trigger invocations coalesce into one sleep-
  and-publish attempt instead of each racing independently; added scheduling/publication attribution
  logs (counts and reasons only, no document contents). The existing transactional publish lease and
  last-valid-snapshot-serves-during-publish behavior were both explicitly preserved, not touched.
- **D (AI Processing reconciliation):** `enqueueAiEnrichment` now returns a structured
  `{queued:false, reason:"already_terminal"}` response instead of throwing when a stale/duplicate
  plain enqueue call finds a design already at `needs_review`/`approved` (genuine failures — including
  staff-rejected designs — still throw); the Studio client no longer treats that response as an
  error and applies the design's real terminal state to local state; `executeRerunToProcessing` now
  calls `reloadDesigns()` deterministically before tab navigation instead of relying on navigation's
  own side-effect refetch.
- **E (Studio upload authorization):** **stopped, not implemented.** Reproduction requires an
  authenticated Studio session (no interactive Electron/Chromium GUI available in this environment)
  and/or Application Default Credentials for a scripted Admin SDK check (not configured here,
  confirmed by a failed direct Firestore read attempt). Exact remaining evidence needed is recorded
  in the Test Report. Per instruction, this stop did not block A–D.

**Independent Implementation Review found and fixed one real gap** (not merely re-confirmed the
Plan): the new debounce claim's expiry only covered the 15-second sleep, not the ensuing publish
attempt, which could let a second invocation become a second waiter while the first was still
mid-publish (still safe — the existing lease prevented a concurrent scan — but it defeated the
coalescing goal under sustained bursts). Fixed by extending the claim to `DEBOUNCE_MS + LEASE_MS`;
added a regression test; corrected one stale test assertion; rebuilt/retested/relinted; redeployed
the 5 affected functions to `fresh-prints-dev`.

**Deployed to `fresh-prints-dev` only** (explicitly switched off the ambient `fresh-prints-prod`
active CLI alias first — confirmed via `firebase use` before switching): `rebuildCatalogSnapshots`,
`retryPortalCatalogPublication`, `onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`,
`onPortalCatalogSnapshotSourceWritten`, `enqueueAiEnrichment` — all confirmed `ACTIVE`, function
count unchanged (109) before and after both the initial deploy and the post-review redeploy. No
Rules, Storage Rules, index, secret, Hosting, or unrelated Function was touched. **No production
action of any kind occurred.**

**Full verification suite green:** Functions build, Studio/Portal typecheck, Studio 3-target Vite
build, repo lint, `git diff --check` — all exit 0. Full test sweep confirmed zero new failures versus
a fully clean `origin/production` tree (verified via `git stash -u`, not assumed) — the same 2
Functions-side and 8 Studio-side pre-existing, unrelated failures remain on both trees, all
previously documented elsewhere (e.g. the 2026-07-27 Firestore Usage Efficiency Wave C signoff's
5 pre-existing print-request DPI/print-size failures).

**Owner follow-up required** (recorded in the Test Report, not silently dropped): Workstream E
reproduction; a live controlled-batch Firestore cost measurement using the new
`catalog-snapshot-scheduling`/`catalog-snapshot-publication` log events; a live AI Processing
reconciliation UI check; one live Firestore-document check confirming Workstream A's archive write
in `fresh-prints-dev`.

Reference docs: `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-plan.md`,
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-review.md`,
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-test-report.md`,
`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-implementation-review.md`.

## 2026-08-04 - Post-launch catalog and processing stability: Plan + independent Formal Review complete

Separate, concurrent managed goal — does not affect or reopen the Studio automatic-updates /
production-PR gate described below.

- Diagnosed five post-launch defects discovered during real production use, via five parallel
  read-only source-tracing investigations, one per workstream:
  1. **Tag archive silently fails to update the UI** — the `archiveTagWithGuards` callable writes
     correctly server-side, but the client's tag-list cache is never invalidated afterward (a
     ready-made `clearStudioTaxonomyCaches()` helper exists for this and is wired to auth
     transitions only, not to the archive path).
  2. **Catalog ordering** — Studio Design Library's default sort constant is wrong
     (`updatedAt` instead of `createdAt`); Portal (Library, Discover, filtered results) was traced
     and found to already sort correctly in current source — no Portal defect found, pending owner
     re-confirmation of the reported symptom.
  3. **Firestore read spikes during import** — a single imported design can schedule up to 4
     independent full-catalog-snapshot rebuilds across its status lifecycle, each an unbounded full
     scan of designs+categories+tags; debounce is per-invocation in-memory, not coalesced across
     concurrent Cloud Functions instances (a persisted lease does correctly prevent concurrent
     *scans*, but not the wasted *scheduling*).
  4. **AI Processing stays stale after completing** — a benign, correctly-rejected duplicate/stale
     enqueue call is surfaced to the user as a hard error instead of a no-op; the Processing list and
     its count are two independently-refreshed one-shot reads with no shared reconciliation trigger.
  5. **First Studio upload after launch gets a Storage permission error** — not a size-limit issue
     (confirmed the 150 MiB pre-decode gate would have blocked decode/trim entirely); best-evidence
     hypothesis is a timing gap between the client's one-time bootstrap Firestore read and Storage
     Rules' own live `firestore.get()` re-check at upload time — not a Rules misconfiguration.
- **No two defects share one root cause.**
- Plan: `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-plan.md`.
  Independent Formal Review: `docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-review.md`
  — verdict **approved_with_notes** (four minor refinements, no blockers; all Plan citations
  independently spot-checked against live source during Review).
- **No application source, Firebase, Rules, index, Function, or production change was made.**
  Stopped after Plan + Formal Review per explicit task scope. Implement has not started.
- Approval phrase for the eventual batched Implement pass:
  `APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY IMPLEMENTATION`.

## 2026-08-02 - Studio automatic updates: final Signoff PASS; production convergence audit complete

- **Live-proven end to end across 4 consecutive real update cycles** (beta.2→beta.3→beta.4→beta.5)
  on a real installed application, not just static bundle inspection. Two real defects were found
  and fixed during the live proof chain: (1) the NSIS installer wizard appeared during automatic
  updates because `quitAndInstall(false, true)` ran the installer non-silently — fixed to
  `quitAndInstall(true, true)`, live-confirmed silent on the next two cycles; (2) GitHub's raw
  release-note HTML rendered unsanitized in an unbounded `<pre>` — fixed with a new dependency-free
  `normalizeStudioReleaseNotes()` converter (strips script/style, converts structure to plain-text
  line breaks, extracts anchor text, decodes entities, caps at 2000 chars) rendered in a bounded
  scrollable container, live-confirmed on the beta.4→beta.5 cycle with a release body containing
  headings, bold text, lists, a link, and a long unbroken string.
- Final Signoff: `docs/workflow/reviews/2026-08-02-studio-automatic-updates-final-signoff.md` —
  **PASS, ready for production promotion subject to production release gates.** Does not claim
  stable `1.0.0` is built, signed, or published.
- **Production convergence audit:** `docs/workflow/reviews/2026-08-02-production-convergence-audit.md`.
  Confirmed `origin/production` (`9726edb`) is a strict ancestor of `origin/development` (`0c8498c`)
  — 44 commits/63 files ahead, 0 behind, clean history, direct PR appropriate. Categorized the full
  diff: Studio automatic-updates implementation + CI release workflow + Settings single-row-tabs
  fix + associated docs only — **zero** Firestore Rules/indexes/Functions/Portal code in this
  specific diff (reporting was already promoted to `production` source in an earlier phase of this
  session, `9726edb`, but confirmed **not yet deployed** to `fresh-prints-prod` — flagged as an
  outstanding Phase D item). No unexpected or unrelated files found.
- **Windows signing:** the CI workflow fails closed for `release_type: stable` without both
  `WINDOWS_CSC_LINK`/`WINDOWS_CSC_KEY_PASSWORD` secrets — confirmed at the source level, not
  weakened. Whether these secrets (or `PROD_FIREBASE_*`, 6 secrets) are actually populated in
  GitHub is owner-only information this environment cannot check.
- **Prepared a 10-phase (A–J) human-gated production sequence** (Signoff/audit → PR → merge →
  scoped Rules/indexes/Functions deploy → Portal rollout → signed stable build → publish → owner
  QA → Stage 2 smoke → domain cutover), each stopping at its own checkpoint. Phase A (this pass) is
  complete. **Stopped before opening the production PR — pending explicit owner approval.**
- No production action of any kind occurred in this pass.

## 2026-08-02 - development branch merged forward to match production (`9726edb`)

Resolved a real divergence discovered while preparing to land the Studio automatic-updates
workflow file on the default branch: `origin/development` was 5 commits behind `origin/production`
(missing the entire Portal Design Issue Reporting merge) while also containing 5 commits of its
own real work never merged into `production` (customer-upload restore parity, safe donation-delete
dialogs, donated-menu positioning fixes, Whatnot matched-show-update preservation, and a QA-signoff
formatting commit). Merged `origin/production` into `development` via a real merge commit
(non-fast-forward); resolved 3 genuine content conflicts (`.cursor/workflow/state.md`,
`references/project-chatgpt-handoff/13-recent-completed-work.md`, this file) by combining both
sides' distinct history chronologically rather than discarding either, and 5 add/add conflicts on
identical "Donated Designs overflow menu no-op" docs that existed on both branches (only trailing
markdown hard-break whitespace differed) by keeping one copy. No source code conflicts. Entries
below marked "[from development, superseded]" reflect `development`'s own narrative of events that
`production`'s subsequent history (PR #17/#18/#19 merges) later resolved differently — preserved
for historical accuracy, not because they reflect current state.

## 2026-08-02 - Portal design issue reporting SIGNED OFF; promoting to production; updater implementation starting

- Owner-confirmed PASS for Whatnot existing-show update and all six Customer Upload intake QA groups; no visible errors.
- Customer Upload restore failure classified as outdated development Function only, not a remaining source defect.
- `origin/production...origin/development` also contains eight earlier Portal/dual-limit documentation commits (`f566bf1` through `fef69f8`) outside the narrow two-group Studio PR authorization.
- Per explicit stop rule, no PR, merge, installer, or production deployment was performed. Owner direction is required on promotion branch/scope.

## 2026-08-01 - Customer upload exclusion/deletion Functions deployed to development

- From development commit `1873b10d7874b36ba4cf95d2d0421e9c1f11bdd0`, deployed exactly `previewCustomerUploadDeletion`, `deleteEligibleCustomerUpload`, and `excludeCustomerUploadFromCatalog` to `fresh-prints-dev`.
- Deployment exit 0: 3 deployed, 0 errors; all three ACTIVE in `us-central1` on source hash `039c420950489a41150ee4fbee0e2ded2790c3ca`.
- Focused 28/28, Functions build, lint, and diff validation passed before deployment.
- Authenticated fresh-fixture owner QA remains pending because Windows application control was unavailable. No production action occurred; Stage 2 remains paused.

## 2026-08-01 - Customer Upload intake parity Amendment 4 implemented

- Both Studio routes use the shared intake: Donated Designs = `catalog_donation`; Customer Uploads = resolved non-donation/`print_request` records.
- Excluded records now visibly show `Restore to Pending` and use an accessible in-app confirmation before the existing callable-backed same-document restore.
- Historically purged rows show a disabled restore action with explanation; `not_eligible` uploads remain outside the Pending/Excluded status queries.
- Focused 63/63, Studio typecheck/build, lint, and diff validation passed. Functions and Rules did not change. Development QA remains pending; Stage 2 remains paused and production blocked.

## 2026-08-01 - Donation exclusion/Delete Upload Amendment 3 implemented

- Exclusion/restoration remain actor-independent metadata transitions for active helpers/admins/owners; permanent deletion remains owner/admin-only.
- Deletion now uses an authoritative manifest aligned to every current `CustomerUpload` Storage-path field, validates exact ownership, fails closed on unknown/noncanonical paths, and retains the upload document after partial cleanup failure.
- Complete cleanup removes the document plus only upload-specific batch manifest/counter metadata; shared batch archives and unrelated assets remain untouched.
- Focused tests passed 34/34; Functions build, Studio typecheck/build, lint, and diff validation passed. No deployment or production action occurred; development QA remains required.

## 2026-08-01 - Donation exclusion/Delete Upload Amendment 2 implemented

- `window.prompt` caused Electron's unsupported warning; exclusion also used native `window.confirm`. Both are replaced with Fresh Prints in-app modals.
- Overflow label is exactly **Delete Upload**. Trusted preview/delete eligibility remains request-item reference + promoted-design linkage; execution rechecks, then deletes only four upload asset paths and the upload document.
- Active owner/admin may preview/delete at UI and callable boundaries. Helpers may exclude but cannot see or invoke delete; nonstaff/inactive callers are denied.
- Exclusion now updates catalog-review status only and preserves metadata, source/production/preview/thumbnail assets, request relationships, and technical state. No migration of historically purged donations.
- Focused 43/43, Studio TypeScript/build/package, Functions build, lint, whitespace PASS. Manual development role QA pending; Functions not deployed. Production PR/installer, Stage 2, and domain remain blocked.

## 2026-08-01 - Donated Designs overflow-menu Amendment 1 implemented

- Owner confirmed the menu opened but requested normal placement below the trigger; prior owner QA remains unsigned.
- No shared Studio portal primitive existed. The shared destructive menu now uses React `createPortal` to `document.body`, fixed trigger-relative geometry, below-first placement, viewport clamping, and upward fallback only when measured below-space is insufficient.
- Intake clipping, z-index convention, exact owner-gated delete action, focus/accessibility/outside click, selected-design context, tab cleanup, and zero-write opening remain intact.
- Focused tests 19/19, Studio typecheck/build/package, lint, and whitespace PASS. Revised development owner QA pending. Whatnot remediation unchanged; no production action.

## 2026-08-01 - Donated Designs overflow-menu remediation implemented on development

- Separate Goal #13 slice from the Whatnot remediation. Starting commit `ca315f2391b4961dc97ddbe87bf351c335405c6a` remains intact.
- Root cause: the existing **Delete unused upload…** menu mounted below the final action row but was clipped by the intake panel's `overflow: hidden` boundary.
- Fix uses explicit upward placement, first-item/Escape focus behavior, a design-specific accessible label, and filter/selected-row reset. Existing owner permission, preview/confirmation/callable, primary actions, halftone, and Customer Uploads reuse are unchanged.
- Focused tests 15/15, Studio typecheck/build/package, lint, and whitespace checks PASS. Implementation Review `approved_with_note`; authenticated development owner QA pending.
- Whatnot show-update owner QA remains separately pending. Stage 2 and domain cutover remain paused; no production action occurred.

## 2026-08-01 - Whatnot existing-show update remediation implemented on development

- Root cause: scanner retained `existingShowId`, but executor discarded it and reused strict rematching/upsert; ten mapper failures collapsed to `An upcoming show record is incomplete.`
- Dedicated direct-ID update now verifies Whatnot identity and writes only upstream-owned fields plus audit/import timestamps. Internal capacity, allocations, lifecycle/production state, notes, and metadata are preserved.
- Focused tests 59/59, Studio typecheck/build/package, lint, and whitespace checks PASS. Implementation Review `approved_with_note`.
- Manual development Studio QA pending because no authenticated UI-control session was available. Stage 2 and domain cutover remain paused; no production action occurred.

## 2026-08-01 - Stage 2 hosted Portal smoke RESUMED; interactive tests pending

- Read-only infrastructure PASS: hosted Portal HTTP 200; Coming Soon remains on `myprintrequest.com`; App Hosting manual-policy backend unchanged; 101/101 Functions ACTIVE; nine release Functions on approved hash; 65 indexes/0 overrides.
- No authenticated browser or Windows app-control backend was available, so lifecycle, intake, sizing/DPI, upload validation, full publication, guest-browser visuals, Studio workspace sanity, and Etsy action remain owner-run and unclaimed.
- No deployment, data/settings/capacity, DNS/domain, analytics, tag, or secret action occurred. Stage 2 is active but not signed off.

## 2026-08-01 - Production linked limits 30/30 VERIFIED — PASS

- Owner intentionally changed linked values from 25/25 to 30/30 and received `Print request limits saved.`
- Reopen and full Studio restart both reloaded 30/30 with linkage checked; no errors. Studio persistence PASS.
- Owner confirmed hosted Portal checks 1–12 PASS: request max/copy/validation, customer-show allowance and usage, independent overall capacity, limiting-warning attribution, retired daily-limit absence, and stale-session refresh all use current 30/30 behavior.
- Checkpoint PASS. No capacity/deployment/domain action occurred. Stage 2 remains paused pending explicit resume phrase.

## 2026-08-01 - Production Studio dual-limit Settings UI SIGNED OFF

- Owner QA Tests 1–7 PASS using `Fresh Prints-Windows-0.0.0-Setup-dual-limit-settings.exe` from production commit `11960852f45f948e37a1a5aeb3b09699882cd1fd`.
- Both fields, linked editing, independent editing, relinking, persistence-safe exit, and retired-control absence passed.
- No production setting was saved during UI QA. Separate linked 25/25 save is now explicitly authorized but not yet confirmed performed.

## 2026-08-01 - Production Studio dual-limit Settings installer READY

- Built from exact production commit `11960852f45f948e37a1a5aeb3b09699882cd1fd`.
- Installer: `apps/studio/release/0.0.0/Fresh Prints-Windows-0.0.0-Setup-dual-limit-settings.exe`; 106,249,514 bytes; SHA-256 `294EC213F811010D61EA4028ACF9185BC8DDEA3426530F242346ED9FC3AB0BE9`.
- Focused tests 38/38, Studio TypeScript, lint, production build/packaging, branding/icon/config/dev-only gates, and whitespace checks passed.
- Not installed; production settings and all deployment surfaces unchanged. Next: `CONTINUE WORKFLOW: PRODUCTION OWNER QA DUAL LIMIT SETTINGS`.

## 2026-08-01 - Customer show-schedule visibility SIGNED OFF (owner QA PASS)

- Production build `build-2026-08-01-001`, revision `fresh-prints-portal-build-2026-08-01-001`, commit `11960852f45f948e37a1a5aeb3b09699882cd1fd`.
- Owner reported tests 1–9 PASS across cards/tabs/statuses/details, navigation persistence, queue lifecycle, multi-show behavior, privacy, and limit-callout sanity.
- Signoff: `docs/workflow/reviews/2026-08-01-production-customer-show-schedule-visibility-signoff.md` (**approved**, schedule slice only).
- Automatic rollouts disabled; domain deferred. Dual-limit Studio Settings installer/QA and production settings save remain pending.

## 2026-08-01 - Goal #13 customer schedule + dual-limit Portal LIVE; owner QA pending

- Manual App Hosting rollout pinned to production merge `11960852f45f948e37a1a5aeb3b09699882cd1fd`.
- Build/rollout `build-2026-08-01-001`; revision `fresh-prints-portal-build-2026-08-01-001`; READY/backend update `2026-08-01T15:00:47Z`.
- Hosted URL returns HTTP 200; schedule client chunk and static brand assets verified; unauthenticated callable probe returns expected 401.
- Automatic rollouts remain disabled. Owner/customer authenticated QA is pending.
- No Functions, Rules/indexes, Studio, settings/data, Auth/secrets, Stage 2, DNS/domain, analytics, snapshots, or tag action occurred.
- Next: `CONTINUE WORKFLOW: PRODUCTION OWNER QA CUSTOMER SHOW SCHEDULE VISIBILITY`.

## 2026-08-01 - Goal #13 customer schedule + dual-limit Functions DEPLOYED to production

- Production source: PR #17 merge `11960852f45f948e37a1a5aeb3b09699882cd1fd`.
- Exact reviewed nine-Function allowlist deployed to `fresh-prints-prod`: exit 0, 9 deployed, 0 errors/aborts.
- All nine ACTIVE in `us-central1`, shared source hash `7eedfc2475a356e21eb4aeac8e9cd45ea232fbed`; no unrelated Function updated.
- Initial attempt stopped before mutation on the default 10-second local discovery timeout; same command succeeded with a local 30-second discovery timeout.
- Focused tests 50/50, Functions build, applicable lint, and whitespace checks passed.
- No Portal/Rules/index/Auth/secret/settings/data/Studio/domain/analytics/Stage 2/catalog-snapshot action occurred.
- Next gated phrase: `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: CUSTOMER SHOW SCHEDULE AND DUAL LIMITS`.

## 2026-08-02 - Portal design issue reporting SIGNED OFF; promoting to production; updater implementation starting

- Owner confirmed Portal + Studio reporting owner QA PASS (all 24 items in
  `docs/workflow/reviews/2026-08-01-portal-design-issue-reporting-owner-qa-checklist.md`), tested
  locally against `fresh-prints-dev`. Recorded in
  `docs/workflow/reviews/2026-08-02-portal-design-issue-reporting-signoff.md`.
- Final automated release gate re-run and green on `feature/portal-design-issue-reporting`
  (`c370ced7ad8a3247701d7e06f534155412017664`): Rules emulator 60/60; shared contract + submitter
  tests 6/6; Studio containment + Functions validation tests 12/12; Functions build exit 0; Portal
  typecheck + production build exit 0; Studio `tsc` exit 0; repo lint exit 0; `git diff --check`
  exit 0.
- Next: promote to `origin/production` via protected merge-commit PR, then implement Studio
  automatic updates per the already-approved Plan/Review, prove an A→B prerelease update, promote
  the updater to production, then a coordinated production Firestore/Functions deploy and final
  production Portal rollout — stopping only at the signing-certificate/stable-publish-approval and
  domain-cutover checkpoints, per explicit owner authorization for this scope.
- Executed directly in-session rather than via an unsupervised background agent, given the
  production-merge and real-release-publishing blast radius of this pass.

## 2026-08-02 - Portal design issue reporting: development environment complete, awaiting owner QA

- **Superseding the two blockers recorded in the 2026-08-01 entry below.**
- **Firestore Rules deployed.** Audited `git diff origin/production -- firestore.rules`: scoped only to the new `designIssueReports` match block (staff read, all client writes denied) plus `designIssueReportIntents`/`designIssueReportOpenGuards`/`designIssueReportDailyQuotas` support collections (fully denied to clients) — no unrelated collections touched. Re-ran `npm run test:rules` (Firestore/Storage Rules emulator, portable JDK 21 at `.local-jdk`): 60/60 pass, exit 0. Deployed: `firebase deploy --only firestore:rules --project fresh-prints-dev` — exit 0, "Deploy complete!" (CLI reported rules content already matched what was live, compiled successfully, released). No Storage Rules, no indexes, no production project touched by this command.
- **Portal production build now passes definitively.** No process was actually holding `.next` at the time of this pass (checked via `Get-CimInstance Win32_Process` for `node.exe` — none referenced the Portal dev server or `.next`). Removed the stale `.next` directory and re-ran `npm run build:portal`: clean compile, all 19 routes generated, exit 0. Also re-ran Portal `tsc --noEmit` (exit 0), repo-wide `npm run lint` (exit 0), and `git diff --check` (exit 0, only pre-existing LF/CRLF notices, no conflict markers).
- **Portal App Hosting rollout is no longer a blocker — it is owner-confirmed permanent policy that `fresh-prints-dev` will never have an App Hosting backend.** Documented as binding policy in a new "Development and Production Portal Hosting Policy" section in `docs/standards/DEPLOYMENT.md`, including an environment matrix and a checklist for future agents proposing hosting/rollout work. Corrected stale language in `docs/workflow/reviews/2026-08-01-portal-design-issue-reporting-development-deployment-checkpoint.md` (previously required an App Hosting rollout step) and `docs/workflow/reviews/2026-08-01-portal-design-issue-reporting-development-owner-qa-checklist.md` (previously said to use dev "after... development Portal rollout") — both now point at localhost-only dev QA (`npm run dev:portal`, `npm run dev:studio`) against `fresh-prints-dev`. Historical conclusions were marked superseded, not deleted.
- Functions and indexes re-verified, unchanged, no redeploy: `submitPortalDesignIssueReport` / `resolveDesignIssueReport` both ACTIVE (v2, callable, `us-central1`); both `designIssueReports` composite indexes present in `firebase firestore:indexes --project fresh-prints-dev` output.
- No `fresh-prints-prod` action of any kind. Owner QA checklist (`docs/workflow/reviews/2026-08-01-portal-design-issue-reporting-owner-qa-checklist.md`) remains unfilled — 24 blank items, not completed by this pass.
- Next: `CONTINUE WORKFLOW: DEVELOPMENT OWNER QA PORTAL DESIGN ISSUE REPORTING` — owner runs QA locally against `fresh-prints-dev` per the checklist. No further environment blockers remain for reporting development readiness.

## 2026-08-01 - Portal design issue reporting: convergence committed, dev deployment reconciled, awaiting owner QA

- Committed and pushed the post-candidate reporting UX that was previously uncommitted: `3beacbe` (app code — report success animation, Studio Inbox submitter display, in-place View Design/Edit/Archive host, optimistic Mark Resolved) and `52f4de7` (docs — plans/reviews/test-reports, including the Studio automatic-updates Plan+Review, docs only, no updater source). `origin/feature/portal-design-issue-reporting` now at these commits on top of `5f6f383`; `origin/production` unchanged at `fe8c4f0`.
- Full test gate re-run: shared contract + submitter tests 6/6 pass; Studio Firestore route containment 10/10 pass; Functions `designIssueReportValidation` 2/2 pass; Firestore/Storage Rules emulator suite 60/60 pass (includes `designIssueReport.rules.test.ts`); Portal `tsc --noEmit` exit 0; Studio `tsc --noEmit` exit 0; Functions `npm run build` exit 0; repo-wide `npm run lint` exit 0 (0 warnings); `git diff --check` exit 0. Portal production build (`next build`) could not be confirmed clean in this environment — it hit a Windows file-lock (`EPERM` on `.next/trace`, later `rm -rf .next` itself failed with "Directory not empty") from another long-running local process; this is an environment/session artifact, not a code defect (typecheck is clean and the only changed Portal files are the modal/CSS already covered by the contract test).
- **Development deployment reconciliation (`fresh-prints-dev`, read-only inspection + no unauthorized writes):** both reporting Functions (`submitPortalDesignIssueReport`, `resolveDesignIssueReport`) and both `designIssueReports` composite indexes (`status ASC, createdAt DESC` and `status ASC, resolvedAt DESC`) were **already live** on `fresh-prints-dev`, confirmed via `firebase functions:list --project fresh-prints-dev` and `firebase firestore:indexes --project fresh-prints-dev` — this contradicts the repo's own checkpoint doc ("AWAITING EXPLICIT APPROVAL — nothing deployed"), which was stale relative to actual project state. Did **not** deploy Firestore Rules: there is no Firebase CLI command to read back live deployed Rules content for a safe diff against `firestore.rules`, so per the hard "stop and report rather than guess" instruction, Rules deployment was skipped and flagged for an explicit owner decision instead of assumed safe. Portal App Hosting rollout is **blocked**, not merely undone: `firebase apphosting:backends:get fresh-prints-portal --project fresh-prints-dev` returns "Backend ... not found" — no App Hosting backend exists on the dev project at all, so there is no target for `firebase deploy --only apphosting`; provisioning a new backend is infrastructure/console setup outside this pass's authorization.
- **No `fresh-prints-prod` action of any kind** — one incidental attempt to read prod App Hosting state for context was self-blocked by the session's own safety classifier and not retried; only `fresh-prints-dev` was inspected or touched.
- Owner QA checklist (24 items, all blank): `docs/workflow/reviews/2026-08-01-portal-design-issue-reporting-owner-qa-checklist.md`.
- Firestore listener containment re-confirmed by reading the committed code: single bounded open-report listener in `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSubscriptionService.ts` line 354 (`where("status","==","open"), orderBy("createdAt","desc"), limit(DESIGN_ISSUE_REPORT_OPEN_LIMIT)`, limit constant = 100); resolved history is a bounded on-demand `getDocs` (not a listener) in `apps/studio/src/renderer/src/features/staff-inbox/services/designIssueReportService.ts` (`listResolved()`, `limit(DESIGN_ISSUE_REPORT_HISTORY_PAGE_SIZE)`, constant = 50), only triggered when the Inbox "Done" tab is opened.
- Next: owner runs QA against `fresh-prints-dev` per the checklist, and separately decides (a) whether to approve a Firestore Rules deploy to dev given the unverifiable live-diff situation, and (b) whether to approve provisioning the `fresh-prints-portal` App Hosting backend on dev so a Portal rollout becomes possible.

## 2026-08-01 - Release orchestration Phase A STOP (reporting QA / deploy evidence)

- Verified remotes: `origin/production` = `fe8c4f05675d1f47e532982089dc744b75b44786`; `origin/feature/portal-design-issue-reporting` = `5f6f3839398c0f545b76994105bf4909cd3e2235` (7 commits ahead of production).
- Repo deploy checkpoint still **AWAITING — nothing deployed**; no recorded Function revisions / Portal revision / formal smoke. Owner QA checklist has **no PASS**.
- Local branch tip matches remote SHA but **working tree dirty** with uncommitted reporting UX (success animation, submitter line, in-place View Design + archive).
- Studio automatic-updates Plan + Formal Review (**approved_with_changes**, owner decisions required): `docs/workflow/plans/2026-08-01-studio-automatic-updates-plan.md` / `docs/workflow/reviews/2026-08-01-studio-automatic-updates-review.md`.
- Phase A checkpoint: `docs/workflow/reviews/2026-08-01-portal-design-issue-reporting-orchestration-phase-a-checkpoint.md`.
- **No production merge, deploy, updater implement, Stage 2, or domain action.**
- Next: `CONTINUE WORKFLOW: DEVELOPMENT OWNER QA PORTAL DESIGN ISSUE REPORTING`

## 2026-08-01 - Portal design issue reporting ready for development deployment

- Feature branch is based on production `fe8c4f05`; all 15 owner decisions are implemented.
- Portal modal, trusted submission/resolution callables, Studio Inbox integration, bounded reads/history, exact design deep link, centralized permissions, Rules, and indexes are complete.
- Owner UX amendment 1 is complete: Report is isolated at the toolbar's left, Favorite/Share/Background remain grouped at right, the request action is full width below, and the report modal has Cancel left, Submit right, plus a top-right accessible close control.
- Studio's current `Missing or insufficient permissions` Inbox message is caused by the still-undeployed development Firestore Rules for `designIssueReports`; no authorization bypass was introduced.
- Focused tests 6/6 and Rules emulator 60/60 pass; typechecks/builds, lint, packaging, and diff checks pass. Implementation Review is approved_with_notes.
- No deployment or production action occurred. Stage 2 and domain remain blocked; prior installer is intermediate; automatic updates remain a separate phase.

## 2026-08-01 - Clean final Studio remediation promotion in progress

- Clean branch `release/final-studio-remediations` was created directly from production `11960852`; `development` remains unchanged.
- Includes only the approved Whatnot existing-show update and Customer Upload overflow/exclusion/restore/delete remediations, focused tests, and narrow workflow artifacts.
- Development owner QA for both remediation groups is PASS.
- Production Functions deployment and combined Studio installer/owner QA remain pending. Stage 2 remains paused and domain cutover blocked.

## 2026-07-31 - Goal #13 Amendment 1 promoted as draft PR #17; awaiting owner merge

- Draft PR #17: `development` → `production`, title “Fix customer show schedules across all request states”.
- Exact reviewed implementation commits: `c4c8b38` and `c96755c`; PR head verified against `origin/development` before the promotion-state update.
- Validation remains: focused tests 22/22, Portal typecheck/build, repository lint, and `git diff --check` pass.
- No merge, Functions/App Hosting rollout, Rules/index/data/settings change, Studio rebuild, Stage 2, or domain action occurred.
- Next: owner reviews and merges PR #17 using Create a merge commit; production verification and any rollout require later separate checkpoints.

## 2026-07-31 - Goal #13 schedule Functions deployed to dev; all-status Amendment 1 approved

- PR #16 merge verified at `215ded9`; development remains clean at `9be408e` before workflow artifacts.
- Exact nine-Function allowlist deployed to `fresh-prints-dev`: exit 0, 9 deployed, all ACTIVE on hash `fa4555f063eb5668c5dea4a8950739ddc24bdeb5`; no unrelated Function updated.
- Authenticated browser session was unavailable, so owner-request UI/callable E2E is not claimed.
- Postdeploy source audit found a real details-path defect: schedule loading is disabled with print-progress polling for terminal/null stages. List card source uses one shared branch, but list schedule loading also needs client batching above the callable's 50-request cap.
- Amendment 1 Plan + Formal Review (`approved_with_changes`) created; implementation is next. No production action, Rules/index/data/settings change, Studio rebuild, Stage 2, or domain work occurred.

### Amendment 1 implementation completion

- Details schedules now load independently of timer polling and render in both progress and no-progress layouts.
- Full request histories are chunked at the callable's 50-request cap with deterministic partial-success merging.
- Queue success refreshes the detail schedule without enabling terminal polling.
- Focused tests 22/22, Portal typecheck, production build, repository lint, and `git diff --check` all pass.
- Implementation Review: **approved**. Authenticated development owner-request E2E remains pending because no browser session was available.

## 2026-07-31 - Goal #13 show-schedule visibility + dual limit settings — source complete; PR #16 merged

- Slices: `portal-customer-queued-show-schedule-visibility` +
  `portal-print-request-and-customer-show-limit-settings`
- Plan + Formal Review (`approved_with_changes`) + Implementation Review (**approved**)
- Source: customer schedule via ownership-bounded callables; dual settings with link checkbox
- **No deploys this pass** (Functions / Portal App Hosting / Studio installer / Rules / settings save gated)
- Next after production branch merge:
  `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: CUSTOMER SHOW SCHEDULE VISIBILITY`
  (plus separate Functions / Studio / settings phrases)
- Prior PASSes unchanged; Stage 2 / domain still deferred

## 2026-07-31 - Goal #13 Assisted library design search slice **SIGNED OFF** (owner QA PASS)

- Owner QA: **PASS** (Share a library design empty search on production Studio)
- Signoff: `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-signoff.md` (**approved**)
- Installer: `Fresh Prints-Windows-0.0.0-Setup-assisted-library-search.exe` (SHA-256 `998E875E…C0B7`)
- Goal #13 continues — **do not** start Stage 2 or custom-domain cutover until owner authorizes
- Next: owner authorizes Stage 2 hosted.app smoke (checklist prepared) or states next priority
- Tag-removal + resize + branding + registration PASSes unchanged; Stage 1 + Class D unchanged

## 2026-07-31 - Goal #13 Assisted library design search — installer **BUILT**; await owner QA

- Phrase: `APPROVE PRODUCTION STUDIO INSTALLER: ASSISTED LIBRARY DESIGN SEARCH FIX`
- Installer: `apps/studio/release/0.0.0/Fresh Prints-Windows-0.0.0-Setup-assisted-library-search.exe`
- Size 106,242,754 bytes; SHA-256 `998E875E885D2BCE7D96A0C16FE69092960DE6520D13B4E55EBC791651FDC0B7`
- Embeds `fresh-prints-prod` (verified in asar); `.env.local` remains `fresh-prints-dev`
- Checkpoint: `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-installer-checkpoint.md`
- **Owner next:** install + QA Share-a-library-design → `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
- Stage 2 still separately gated

## 2026-07-31 - Goal #13 Assisted library design search — **IMPLEMENTED** (repo); await Studio ship

- Slice: `production-studio-assisted-library-design-search-empty`
- Owner phrase: `APPROVE STUDIO ASSISTED LIBRARY DESIGN SEARCH FIX IMPLEMENTATION`
- Fix: picker uses `useReadyDesignsForAssistedCatalogPicker` (generated ready-index + fallback);
  no longer calls ID-less `useReadyDesignsForSelection`
- Tests: 20/20; eslint clean on touched files; Studio build exit 0 (local only)
- Checkpoint: `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-implement-checkpoint.md`
- **Owner next:** `APPROVE PRODUCTION STUDIO INSTALLER: ASSISTED LIBRARY DESIGN SEARCH FIX`
- Then owner Studio QA; Stage 2 still separately gated
- Tag-removal / resize / branding / registration PASSes unchanged

## 2026-07-31 - Goal #13 Assisted library design search empty — Plan + Formal Review **approved**

- Slice: `production-studio-assisted-library-design-search-empty`
- Root cause: Wave C narrowed `useReadyDesignsForSelection` to selected IDs only;
  `AssistedCatalogDesignPickerModal` still calls it with **no IDs** → always empty list
  (including empty search → “No ready designs match that search.”)
- Not: missing ready designs, suggest callable, indexes, or catalog rebuild
- Prod ready design exists (prefix `s9Yi7i8u…`); `staffSuggestAssistedCreationCatalogDesign` is live but is **send-only**
- Incident: `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-incident.md`
- Plan: `docs/workflow/plans/2026-07-31-production-studio-assisted-library-design-search-empty-plan.md`
- Formal Review: **approved** —
  `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-review.md`
- **Owner next:** `APPROVE STUDIO ASSISTED LIBRARY DESIGN SEARCH FIX IMPLEMENTATION`
- Do **not** implement/deploy/modify production data/resume Stage 2 until that phrase
- Tag-removal / resize / branding / registration PASSes unchanged

## 2026-07-31 - Goal #13 catalog tag-removal publication slice **SIGNED OFF** (owner QA PASS)

- Owner QA: **PASS** (Portal tag-removal surfaces after generation-9 catch-up)
- Signoff: `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-signoff.md` (**approved**)
- Production: Functions live; catch-up published portal-catalog gen **9**; R-017 closed
- Goal #13 continues — **do not** start Stage 2 or custom-domain cutover until owner authorizes
- Next: owner authorizes Stage 2 hosted.app smoke (checklist prepared) or states next priority
- Resize + branding + registration PASSes unchanged; Stage 1 + Class D unchanged

## 2026-07-31 - Goal #13 catalog tag-removal publication — catch-up **COMPLETE**; await Portal QA

- Slice: `production-portal-catalog-tag-removal-publication`
- Phrase: `APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: RETRY` — executed
- Callable `retryPortalCatalogPublication` on `fresh-prints-prod` →
  `publishedGeneration=9`, `requestedGeneration=9`, `status=idle` (~5.8s)
- Live assets: manifest gen **9** (`9-ebbc2bff6074f3c5`); discover tags **`funny` only**;
  sarcastic filter 404 / facet funny-only
- Checkpoint: `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-catchup-checkpoint.md`
- **Owner next:** Portal QA → `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
- Stage 2 still separately gated

## 2026-07-31 - Goal #13 catalog tag-removal publication — Functions **LIVE** (dev + prod); await catch-up

- Slice: `production-portal-catalog-tag-removal-publication`
- Phrases: both Functions deploy approvals received and executed
- Deployed (scoped): `onCategorySnapshotSourceWritten`, `onPortalCatalogSnapshotSourceWritten`,
  `onTagSnapshotSourceWritten`, `rebuildCatalogSnapshots`, **`retryPortalCatalogPublication` (created)**
- Projects: `fresh-prints-dev` + `fresh-prints-prod` — both exit 0
- Checkpoint: `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-functions-deploy-checkpoint.md`
- **Owner next:** `APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: RETRY`
  (fallback: `APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: REBUILD`)
- Then owner Portal QA; Stage 2 still separately gated
- Prod coordination still expected stuck until catch-up succeeds

## 2026-07-31 - Goal #13 catalog tag-removal publication — **IMPLEMENTED** (repo); await Functions deploy

- Slice: `production-portal-catalog-tag-removal-publication`
- Owner phrase received: `APPROVE PORTAL CATALOG TAG REMOVAL PUBLICATION FIX IMPLEMENTATION`
- Code: Storage I/O retries; catch-up loop continues on lease-busy/transient `FetchError`;
  callable `retryPortalCatalogPublication` (no dirty bump); ADR-FP-120 amendment; R-017
- Tests: `publicationRecovery.test.ts` + classifier suite — 19/19; `functions` build exit 0
- Checkpoint: `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-implement-checkpoint.md`
- Test report: `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-test-report.md`
- **Owner next:** `APPROVE PRODUCTION FUNCTIONS DEPLOY: PORTAL CATALOG TAG REMOVAL PUBLICATION FIX`
  (optional: `APPROVE DEV FUNCTIONS DEPLOY: PORTAL CATALOG TAG REMOVAL PUBLICATION FIX` first)
- Then catch-up: prefer `APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: RETRY`
  (fallback rebuild phrase in checkpoint — not silent)
- Then owner Portal QA; Stage 2 still separately gated
- Prod coordination remains stuck until deploy + catch-up

## 2026-07-31 - Goal #13 catalog tag-removal publication — Plan + Formal Review **approved**

- Slice: `production-portal-catalog-tag-removal-publication`
- Root cause: Studio/Firestore tag removal succeeded; portal-catalog **generation 9 republish failed**
  (`FetchError`, `status=failed`, `requestedGeneration=9` / `publishedGeneration=8`) so Portal still
  serves generation 8 cards/filters/facets/search containing the removed tag. Category looked correct
  because gen 8 already had the new category.
- Incident: `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-incident.md`
- Plan: `docs/workflow/plans/2026-07-31-production-portal-catalog-tag-removal-publication-plan.md`
- Formal Review: **approved** —
  `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-review.md`
- **Owner next:** `APPROVE PORTAL CATALOG TAG REMOVAL PUBLICATION FIX IMPLEMENTATION`
- Do **not** implement/deploy/`rebuildCatalogSnapshots`/resume Stage 2 until that phrase
- Note: prod portal-catalog coordination remains **failed/stuck** until post-implement catch-up republish

## 2026-07-31 - Goal #13 resize permission slice **SIGNED OFF** (owner QA PASS)

- Owner QA: **PASS** (Studio + Portal catalog item resize after Rules deploy)
- Signoff: `docs/workflow/reviews/2026-07-31-production-portal-request-item-resize-permission-signoff.md` (**approved**)
- Production Rules live on `fresh-prints-prod` (`requestCountApplied` allowlisted + immutable)
- Goal #13 continues — **do not** start Stage 2 or custom-domain cutover until owner authorizes
- Next: owner authorizes Stage 2 hosted.app smoke (checklist prepared) or states next priority
- Branding + registration PASSes unchanged; Stage 1 + Class D unchanged

## 2026-07-31 - Goal #13 resize permission Rules **LIVE on production** — owner QA pending

- Deploy: `firebase deploy --only firestore:rules --project fresh-prints-prod` → **released**
- Approval: `APPROVE PRODUCTION FIRESTORE RULES DEPLOY: REQUEST ITEM RESIZE PERMISSION`
- Checkpoint: `docs/workflow/reviews/2026-07-31-production-portal-request-item-resize-permission-rules-deploy-checkpoint.md`
- **Owner next:** QA catalog item width/height autosave on **Studio and Portal** → `PASS` / `FAIL` / `PASS WITH NOTES`
- Stage 2 still paused; domain deferred; branding + registration PASSes unchanged

## 2026-07-31 - Goal #13 resize permission **IMPLEMENTED** (repo) — await Rules deploy

- `requestCountApplied` added to `printRequestItemRequiredFieldsValid` + client-immutable on staff/customer updates
- Automated: alignment 4/4; `npm run test:rules` 56/56
- Checkpoint: `docs/workflow/reviews/2026-07-31-production-portal-request-item-resize-permission-implement-checkpoint.md`
- **Owner next:** `APPROVE PRODUCTION FIRESTORE RULES DEPLOY: REQUEST ITEM RESIZE PERMISSION`
  (optional: `APPROVE DEV FIRESTORE RULES DEPLOY: REQUEST ITEM RESIZE PERMISSION` first)
- Then owner QA Studio + Portal catalog item resize; Stage 2 still paused until separately authorized
- No Portal/Studio runtime change; no Functions change; no data migration

## 2026-07-31 - Goal #13 resize permission slice — Plan + Formal Review **approved** (Studio + Portal)

- Slice: `production-portal-request-item-resize-permission`
- Root cause: catalog `printRequestItems` stamped with `requestCountApplied: true` by
  `onPrintRequestItemCreated`, but `firestore.rules` `printRequestItemRequiredFieldsValid`
  `keys().hasOnly` omits that field → staff (Studio) and customer (Portal) size `updateDoc` deny
- Plan: `docs/workflow/plans/2026-07-31-production-portal-request-item-resize-permission-plan.md`
- Formal Review: **approved** —
  `docs/workflow/reviews/2026-07-31-production-portal-request-item-resize-permission-review.md`
- **Owner next:** `APPROVE PORTAL REQUEST ITEM RESIZE PERMISSION FIX IMPLEMENTATION`
- Do **not** implement/deploy/resume Stage 2 until that phrase
- Branding + registration PASSes unchanged; Stage 1 + Class D unchanged; domain deferred

## 2026-07-31 - Goal #13 bundled brand production slice **SIGNED OFF** (owner QA PASS)

- Owner QA: **PASS** (Studio installer + hosted Portal branding)
- Signoff: docs/workflow/reviews/2026-07-31-production-bundled-brand-studio-and-portal-release-signoff.md (**approved**)
- Production: PR #14 / c837b5; Portal rollout uild-2026-07-31-005; revision resh-prints-portal-build-2026-07-31-005
- Installer: Fresh Prints-Windows-0.0.0-Setup-bundled-brand.exe (SHA-256 E47B1776…8D65)
- Automatic App Hosting rollouts remain **disabled**
- Goal #13 continues — **do not** start Stage 2 or custom-domain cutover until owner authorizes
- Next: owner authorizes Stage 2 hosted.app smoke (checklist prepared) or states next priority

## 2026-07-31 - Goal #13 bundled brand **LIVE** (Studio installer + Portal) — owner QA pending

Dual production release executed after both owner phrases:

- `APPROVE PRODUCTION STUDIO INSTALLER: BUNDLED BRAND ASSETS`
- `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: BUNDLED BRAND ASSETS`

| Item | Value |
|------|-------|
| Implement | `f0f555a` |
| Production merge | PR #14 → `ac837b5d6a69237b68b91d8ed837d465fc94d2af` |
| Studio installer | `Fresh Prints-Windows-0.0.0-Setup-bundled-brand.exe` in `apps/studio/release/0.0.0/`; 106,245,714 bytes; SHA-256 `E47B1776C6FA2FBA489094DB11EDA93BAD86C15AC9D8432F264291A6B3898D65`; embeds `fresh-prints-prod` |
| Portal rollout | `build-2026-07-31-005` **SUCCEEDED**; revision `fresh-prints-portal-build-2026-07-31-005` |
| Hosted URL | https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app |
| Automatic rollouts | remain **disabled** |
| Checkpoint | `docs/workflow/reviews/2026-07-31-production-bundled-brand-studio-and-portal-release-checkpoint.md` |

Confirmed unchanged this pass: Functions, Rules, indexes, Auth, Storage, production data, DNS, custom domain.

**Owner next:** QA both products → `PASS` / `FAIL` / `PASS WITH NOTES`. Do **not** start Stage 2 or custom-domain cutover until branding QA clears (or owner resequences).

## 2026-07-31 — Goal #13 Portal registration owner QA **FAIL** after App Hosting rollout

Exact FAIL:

> FAIL: Google Auth succeeds, but complete-profile remains permanently stuck after the production rollout. No Firestore user/customer/username records are created, and the expected 45-second timeout/error/retry state never appears.

- Build still live: PR #12 / `8943d17` (includes `b882e5c`); automatic rollouts disabled; **no new deploy** this pass
- Root cause: sticky `isAuthActionLoading` on `missing-profile` mounts fixed provision overlay without entering `completeCustomerProfile` (45s timeout never starts); `registerCustomer` not invoked
- Amendment: `docs/workflow/plans/2026-07-31-production-portal-registration-post-rollout-amendment.md`
- Formal Review: **approved** —
  `docs/workflow/reviews/2026-07-31-production-portal-registration-post-rollout-amendment-review.md`
- **Owner next:** `APPROVE PORTAL REGISTRATION LOADING-OWNERSHIP FIX IMPLEMENTATION`
- Do **not** reuse `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` until new implement review
- Branding + Stage 2 still paused; Stage 1 + Class D untouched; no Auth deletes
- Auth inventory at diagnosis: only owner password `7v3SLjRN…` (no Google Auth-only present)

## 2026-07-31 — Goal #13 Portal registration fix **LIVE on App Hosting** — owner QA pending

- **Superseded** — owner QA FAIL (see section above)

## 2026-07-31 — Goal #13 Portal registration loading-state fix implemented (not deployed)

- **Superseded** — deployed then FAIL

## 2026-07-31 — Goal #13 Stage 1 fixtures **COMPLETE** (1B + 1C)

- Remains PASS WITH NOTES

## 2026-07-31 — Goal #13 Class D **CLOSED**

- Remains closed

## 2026-07-31 — Goal #13 Class D: Storage cross-service permission **IAM applied** (superseded)

- Granted `roles/firebaserules.firestoreServiceAgent` to
  `service-473623863375@gcp-sa-firebasestorage.iam.gserviceaccount.com`
- No Storage Rules deploy / Studio rebuild — **closed by PASS WITH NOTES above**

## 2026-07-31 — Goal #13 Class D: Storage cross-service permission (awaiting Fix issue)

- **Superseded** — IAM + owner QA closed the incident

## 2026-07-31 — Goal #13 BLOCKED: Studio Storage `storage/unauthorized`

- **Superseded / closed** — Class D IAM + PASS WITH NOTES

## 2026-07-31 — Goal #13: Stage 1 partial — infra/DNS recorded; fixtures pending owner

- Read-only: owner profile OK; 18 categories / 1,122 tags; 99 Functions; 65 indexes; CORS OK;
  hosted.app 200; Coming Soon still on apex (Cloudflare)
- Portal-invite test customer **deferred** (continue URL → `myprintrequest.com/login`)
- Stage 2 hosted.app smoke checklist prepared, **not executed**
- Owner next: create upcoming show + one ready catalog design in production Studio
  (**Storage unblocked** — proceed with fixtures)

## 2026-07-31 — Goal #13: production `settings/emailProviders` PASS

Owner set production Studio email providers:

- `inviteProvider: "resend"`
- `proofNoticeProvider: "brevo"`

Stage 1 email-provider item closed. Next: remaining Stage 1 fixtures (upcoming show, minimum
approved test data as needed, Coming Soon DNS/rollback recorded without changing DNS), then
Stage 2 hosted.app smoke. Custom domain still deferred until `APPROVE MYPRINTREQUEST.COM CUTOVER`.

## 2026-07-31 — Goal #13 production-release: domain-last sequencing amendment approved

**Owner decision:** do **not** point `myprintrequest.com` at App Hosting yet. Coming Soon remains
live until all domain-independent production setup and hosted.app smoke testing are complete.
Custom domain is the final launch switch after readiness gate
`APPROVE MYPRINTREQUEST.COM CUTOVER`.

**Revised remaining stages:** (1) domain-independent setup → (2) smoke on
`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` → (3) readiness gate →
(4) domain cutover + domain-dependent smoke. GA4 / Search Console stay later.

**Immediate next task:** Stage 1 — Studio `settings/emailProviders` (Resend invite / Brevo proof)
if unset, then remaining domain-independent fixtures. **Do not connect the custom domain.**

Artifacts: Plan §7 in `docs/workflow/plans/2026-07-30-production-release-plan.md`; Formal Review
`docs/workflow/reviews/2026-07-31-production-release-domain-last-sequencing-review.md`
(**approved**). Git: `development`/`production` at `bfa42ef` (PR #11 CORS recording merged) before
this docs amendment.

## 2026-07-30 — Goal #13 "production-release" — v1.0.0-rc5 owner retest PASS WITH NOTES; production Studio (step 8 of 12) fully closed; proceeding into Phase G smoke testing

**Owner retest result: `PASS WITH NOTES`.** `v1.0.0-rc5` (the installer including both the
white-screen fix and the desktop icon alignment) launches without a white screen, the correct
"FP Request" icon is confirmed in place, and the production owner account signs in successfully.

**The note:** sign-in initially failed until the owner added `createdAt` and `updatedAt` timestamp
fields to the manually bootstrapped `users/{uid}` Firestore document. Traced to
`apps/studio/src/renderer/src/features/users/services/userService.ts`'s `mapUserDocument()`,
which throws `"A user profile is incomplete."` if either field is falsy. **This was a gap in the
manual first-owner-bootstrap instructions given earlier this goal (Phase D) — the given field list
omitted these two fields — not a code defect.** Corrected field list for any future manual
first-owner bootstrap: `id` (string), `email` (string), `displayName` (string), `role` (string,
`"owner"` for the first account), `isActive` (boolean, `true`), `createdAt` (timestamp),
`updatedAt` (timestamp); `createdBy`/`updatedBy` are optional.

**Deployment-order step 8 of 12 (production Studio) is now fully closed** — both installer defects
found during this goal (the white screen and the missing/wrong desktop icon) are owner-confirmed
fixed via a real retest, not merely built and assumed correct.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-8 of 12 all
complete and owner-confirmed. Proceeding into Phase G (Portal + installed Studio + backend smoke
testing, step 11 of 12) under the same multi-phase authorization already granted. Phase D's
remaining owner-driven Studio setup (categories, `settings/emailProviders`) is unblocked now that
the owner has working Studio access.

## 2026-07-30 — Goal #13 "production-release" — Studio desktop icon aligned with collapsed-sidebar mark; second replacement installer (v1.0.0-rc5) built, awaiting owner retest

**Owner request:** use the exact icon shown at the top of the collapsed Studio sidebar as the
official packaged Windows application icon.

**Source of truth**, traced through the actual render path: `Sidebar.tsx` renders `<AppLogo
variant="collapsed">` when the sidebar is collapsed; `AppLogo.tsx` resolves that variant's fallback
to `src/assets/brand/fresh-prints-studio-logo-collapsed.png`. Confirmed via this session's earlier
Phase D bootstrap-inventory research that `settings/brandLogos` is unset on the cold-start
`fresh-prints-prod` project, so this bundled asset is genuinely what renders, not a hypothetical
fallback. Visually confirmed as the circular "FP Request" mark; `sharp` metadata confirmed
6387×6405px RGBA with alpha. Correctly excluded every item on the owner's exclusion list (full
wordmark, the never-existed `fresh-prints-logo.svg`, any redesigned/generic icon).

**Existing gap found:** `electron-builder.json5` already referenced `win.icon: "icon.ico"` /
`linux.icon: "icon.png"`, but neither file existed anywhere in the repo — matching the "default
Electron icon is used" line seen in every prior Studio build log this session.

**Fix** (second narrow Plan + independent Formal Review, both `approved`): measured the source
asset's opaque-pixel bounds via `sharp .trim()` and found they already extend to the canvas edges
(no built-in margin), so wrote a one-time asset-generation script
(`apps/studio/scripts/generate-app-icon.mjs`) using `sharp` plus a newly-added `png-to-ico`
devDependency (researched and selected: pure JS, no native binaries, actively maintained, MIT) to
pad and resize the source into a 7-resolution `.ico` (16/24/32/48/64/128/256px) and a 512px PNG,
written to the exact paths the existing config already expected. Also corrected `main.ts`'s
`BrowserWindow.icon`, previously pointing at the same nonexistent `fresh-prints-logo.svg` found
during the white-screen investigation — researched via Electron's own docs and confirmed this
option is redundant for the packaged Windows taskbar (Windows reads the icon embedded in the exe's
resources via electron-builder's `rcedit` step) but genuinely affects the dev-mode window icon.

**Verified directly in this environment, not deferred to the owner:** the generated `.ico` parsed
to confirm exactly the 7 requested resolutions; visual inspection at 16×16/32×32/256×256 confirmed
no clipping and a legible mark at small sizes; Studio typecheck, `vite build` (confirmed the
white-screen fix's circular-chunk protection remained intact), full `electron-builder` packaging,
repo lint, `git diff --check` all exit 0; the "default Electron icon is used" build-log line no
longer appears. **Extracted the actual embedded icon from both the packaged `.exe` and the
installer `.exe` via Windows' own `System.Drawing.Icon.ExtractAssociatedIcon` API and visually
confirmed both show the correct Fresh Prints mark** — direct proof, not inference. Re-confirmed via
`asar` extraction that `scheduler` remains correctly chunked with `react-vendor`.

Promoted via GitHub PR #10 (merge `c644935`), tagged `v1.0.0-rc5`. Re-ran lint/typecheck on the
tagged commit (both exit 0), built the second replacement installer using the same safest
env-file-swap procedure. **Directly re-confirmed on this exact production-configured build:**
correct embedded icon (same extraction method), `firebaseConfig.projectId` resolves to
`fresh-prints-prod` (via `asar` extraction), `scheduler` still correctly chunked.

**Second replacement installer:** `Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc5.exe` (also present
as `Fresh Prints-Windows-0.0.0-Setup.exe`, byte-identical), `apps/studio/release/0.0.0/`, ~102.7
MB, SHA-256 `e07914692ad2ff507bce279522852acf4bd9e89eb75d04da2221e3f05c17d011` — different from
both the original failed installer's checksum and `v1.0.0-rc4`'s checksum, confirming genuinely
new packaged content. `v1.0.0-rc4` (the white-screen-only fix) remains preserved on disk,
untouched, for the incident record. Unsigned. Not uploaded or distributed publicly.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-7 of 12 remain
complete; step 8 (Studio) blocked on the owner's install/launch/login/icon retest of
`v1.0.0-rc5` — which supersedes `rc4` for retest purposes since it includes both the white-screen
fix and the icon fix. Phase G smoke testing does not resume until that retest reports `PASS` or
`PASS WITH NOTES: ...`.

## 2026-07-30 — Goal #13 "production-release" — Production Studio white-screen incident diagnosed and fixed; replacement installer built, awaiting owner retest

**Incident:** the owner installed the first production Studio installer
(`Fresh Prints-Windows-0.0.0-Setup.exe`) and reported a permanent white screen — window opens,
sign-in UI never appears, no recovery. This sandboxed environment could not reproduce the failure
directly: the packaged `.exe` exits silently within seconds across multiple launch methods (a
genuine environment limitation — no Windows Event Viewer crash entry either, confirmed via several
attempts), separate from the actual bug. Asked the owner to launch the installed executable with
`--enable-logging` on their own machine; they captured the real error:
`Uncaught TypeError: Cannot read properties of undefined (reading 'createContext')` in the packaged
vendor chunk, plus a secondary warning about a missing image asset.

**Ruled out with direct evidence:** Firebase environment injection — extracted the actual packaged
`app.asar` via `npx asar extract` and confirmed the embedded config correctly resolved to
`fresh-prints-prod` with a valid, non-empty API key (the `fresh-prints-dev` string also found in
the same bundle was an unrelated allowlist constant and debug label, not the active config).
Packaged asset paths — the packaged `index.html` used correct relative script/link references.

**Confirmed root cause:** `apps/studio/vite.config.ts`'s Rollup `manualChunks` function used a bare
substring match (`id.includes('node_modules/react')`) instead of a package-boundary match. This
correctly caught `react`/`react-dom` but not `scheduler` (react-dom's own runtime dependency, whose
path contains no "react" substring), which fell into the generic `vendor` chunk instead of
`react-vendor`. The original build had already logged a warning — `Circular chunk: vendor ->
react-vendor -> vendor` — but Rollup treats this as a warning, not a build failure, so the broken
build shipped with an exit-0 status. This class of bug only reproduces in packaged production
builds, since Vite's dev server never applies `manualChunks` splitting — `npm run dev:studio` was
structurally incapable of catching it.

**Fix** (narrow Plan + independent Formal Review, both `approved`): corrected the chunk-matching
condition to exact package-boundary paths and explicitly included `scheduler` alongside
`react`/`react-dom`. Added a `rollupOptions.onwarn` hook that fails the build on any future
`CIRCULAR_CHUNK` warning — the real process gap this incident exposed was that nothing in the
existing verification suite inspected build warnings or launched the packaged output; this closes
that gap for this specific, now-understood failure class. Also removed a dead favicon `<link>`
reference to an asset that never existed anywhere in this repo's Git history (unrelated to the
crash, found during the same evidence-gathering pass, fixed as a zero-risk one-line correction).

**Verification:** direct `asar` extraction of the rebuilt bundle confirmed `scheduler` now lives in
`react-vendor`, not `vendor`; the circular-chunk warning no longer appears; Studio typecheck,
`vite build`, full `electron-builder` packaging, repo lint, and `git diff --check` all exit 0.
Promoted via GitHub PR #9 (merge `daaafc1`), tagged `v1.0.0-rc4`. Built the replacement installer
from that exact verified commit using the same safest env-file-swap procedure (backup dev env →
temporary production values → build → restore).

**Replacement installer:** `Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc4.exe`,
`apps/studio/release/0.0.0/`, ~102.3 MB, SHA-256
`a0be8e956108bc786fe3ea629f7dc356bb0e28ed09b60d740c31a64c1bf177ed` — **deliberately different**
from the original failed installer's checksum
(`c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`), confirming genuinely new
packaged content, not a no-op rebuild. Unsigned, same as the original. Not uploaded or distributed
publicly.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-7 of 12 remain
complete; step 8 (Studio) blocked on the owner's install/launch/login retest of the replacement
installer. Phase G smoke testing does not resume until that retest reports `PASS` or
`PASS WITH NOTES: ...`.

## 2026-07-30 — Goal #13 "production-release" — Production Studio installer built, first owner account bootstrapped (deployment-order steps 1-8 of 12 done); awaiting owner installation and smoke testing

**First production owner account bootstrapped.** Presented a consolidated Phase D bootstrap list
for owner approval before any Firestore write: `settings/emailProviders` (approved — owner will
set `inviteProvider: "resend"`, `proofNoticeProvider: "brevo"` via Studio UI once logged in,
matching their decision, since the code default is Resend for both), at least one category
(approved — owner will create via Studio UI). The most significant finding: **no automated way
exists anywhere in this codebase to create the first owner account** — the normal user-creation
callable requires an existing owner caller, and Firestore Rules block all client writes to
`users/*`, a genuine chicken-and-egg gap for a cold-start project. Walked the owner through the
exact manual two-part Console procedure (Firebase Auth → Add user → copy UID; Firestore Console →
`users/{uid}` document with `role: "owner"`, `isActive: true`). **Owner confirmed both parts
complete.** `rebuildCatalogSnapshots` confirmed source-safe on a fully empty catalog but
deliberately held until real catalog data exists — invocation remains its own separate step.

**Production Studio Windows installer built.** Owner chose to prioritize Studio access before
finishing Phase D's remaining Studio-dependent setup. Source audit confirmed Studio's Firebase
config is entirely build-time/Vite-env-file-based with no hardcoded Portal URL, and the Test Data
Reset UI is excluded from production builds by three independent layers (a build-time
`import.meta.env.DEV` gate, a `fresh-prints-dev`-only project allowlist, and the underlying
callable not being deployed to production at all). Backed up the dev env file, temporarily wrote
production Firebase Web config values, ran the full build/package on the verified `production`
commit, immediately restored the dev file. Build + packaging: exit 0.

**Installer:** `Fresh Prints-Windows-0.0.0-Setup.exe`, `apps/studio/release/0.0.0/`, ~102.3 MB,
SHA-256 `c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`, **unsigned** (Windows
will show the expected unrecognized-publisher SmartScreen warning on first run). Not uploaded or
distributed publicly — awaiting owner installation and Phase G smoke testing.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-8 of 12 all
complete. Next: owner installs the Studio `.exe` and begins the consolidated Portal + installed
Studio + backend smoke-test checklist, reporting `PASS` / `PASS WITH NOTES: ...` / `FAIL: ...`.
Once Studio is installed and the owner is signed in, Phase D's remaining items (categories,
`settings/emailProviders`) resume as the owner's own Studio-UI action.

## 2026-07-30 — Goal #13 "production-release" — First App Hosting Portal release COMPLETE (deployment-order steps 1-7 of 12 done); proceeding into settings/bootstrap inventory

**The first-ever Fresh Prints production Portal deployment succeeded.** App Hosting
environment-variable configuration (step 6) added an `env:` block to
`apps/portal/apphosting.yaml` with the 7 required `NEXT_PUBLIC_FIREBASE_*` values plus
`NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com`, sourced from the owner's gitignored
`.env.production.local`. `NEXT_PUBLIC_GA_MEASUREMENT_ID` was deliberately omitted even though a
real value already exists in that local file — GA4 go-live remains a separate, later checkpoint.
Promoted to `production` via GitHub PR #6.

**First rollout attempt failed:** Cloud Build error `Missing dependency lock file at path
'/workspace/apps/portal'`. Root cause: Fresh Prints is an npm-workspaces monorepo (single root
`package-lock.json`; `apps/portal` correctly has none of its own), but Firebase App Hosting's
buildpack has official first-class monorepo support only for Nx/Turborepo.

**Second attempt (first fix hypothesis):** added `buildCommand`/`runCommand` overrides to
`apphosting.yaml`. **This was accidentally committed directly to `production`** during
implementation — caught immediately before pushing (the stray commit never reached GitHub, zero
remote impact), corrected by resetting the local `production` branch pointer and reapplying the
identical change properly via `development` → PR #7. The retry still failed with the byte-identical
error. The owner opened the real Cloud Build Console log and confirmed App Hosting's
monorepo-detection step runs *before* `buildCommand` executes — disproving the first hypothesis
with direct evidence, not assumption.

**Third attempt (root-cause fix):** the owner directed a narrow Plan + independent Formal Review
(both `approved`) to add the minimum officially-documented Turborepo support instead: `turbo` as a
root devDependency, a root `turbo.json` with a single `build` task (no `dependsOn` — the shared
workspace packages have no `build` script; Next.js `transpilePackages` handles them directly), a
`packageManager: "npm@10.8.2"` field (required for turbo's own workspace resolution, discovered
during implementation, within approved scope), removed the now-confirmed-ineffective build-command
override, kept the single root `package-lock.json` and `rootDir: ./apps/portal` unchanged per
explicit owner instruction. Verified locally: `npm ci`, `npx turbo run build
--filter=@fresh-prints/portal` (1/1 tasks successful), Portal typecheck, `npm run build:portal`,
repo lint, YAML validation, `git diff --check` — all exit 0. Promoted via PR #8.

**Retried the rollout: "✔ Successfully created a new rollout!"** Verified the backend live at
`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` (Enabled, `nodejs24`,
`us-central1`). Homepage returns HTTP 200 with the correct `<title>Fresh Prints Request
Portal</title>`; `robots.txt` returns the **allow** variant (not the fail-closed default),
confirming `NEXT_PUBLIC_PORTAL_ORIGIN`/host resolution is correctly live in production; no
`fresh-prints-dev` string found anywhere in the served HTML. Automatic rollouts remain **disabled**
for this backend — each future release requires its own explicit trigger.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-7 of 12 all
complete. Proceeding into Phase D (production settings and bootstrap inventory, step 9 of 12) under
the same multi-phase authorization already granted by the owner. No production Firestore data has
been written; a consolidated bootstrap list requires its own separate owner approval before any
write occurs.

## 2026-07-30 — Goal #13 "production-release" — Cloud Functions deployment COMPLETE (deployment-order steps 1-5 of 12 done); proceeding into App Hosting/Portal release

**Cloud Functions (step 5) confirmed complete.** Owner issued a multi-phase `Continue Workflow`
instruction authorizing Phase A through Phase H in sequence, pausing only at named checkpoints.
Phase A (non-secret Functions configuration audit) found no source change required —
`portalUrlResolver.ts`, `.firebaserc`, and the `INVITATION_FROM_EMAIL`/`PROOF_NOTICE_FROM_EMAIL`
code defaults already matched owner intent exactly. Reverification on the fast-forward-verified
`production` commit passed cleanly (build/lint/diff-check all exit 0); fresh programmatic
re-enumeration reconfirmed 105 total exports / 99 include / 6 exclude, byte-identical to the
previously approved allowlist, zero drift.

Deployed the exact reviewed 99-function allowlist to `fresh-prints-prod`. First attempt failed
before creating anything (CLI non-interactive mode needed explicit values for two non-secret
`defineString` params) — fixed by creating `functions/.env.fresh-prints-prod` (gitignored,
following the exact existing repo convention, containing only the two non-secret sender-address
defaults already present as code defaults). Second attempt required `--force` because
`onEmailDeliveryJobCreated` has a pre-existing, intentional `retry: true` trigger option (not a new
or accidental change) — surfaced to the owner via a structured question rather than applied
unilaterally; **owner approved `--force` for this specific, reviewed reason.**

Third attempt deployed 84 of 99 functions; 15 failed with transient `429 Quota exceeded` (expected
on a brand-new project's first bulk 2nd-gen Functions deploy) plus Eventarc service-agent
permission-propagation delay for newly-enabled trigger infrastructure. Verified via authoritative
`firebase functions:list --project fresh-prints-prod --json` (not log-parsing) that all 84 deployed
functions were correctly on the approved allowlist — zero excluded and zero unexpected functions —
confirming the partial failure was purely quota/propagation-related, not a configuration defect.
Waited for the per-minute quota window to reset, then retried with an explicit allowlist scoped to
exactly the 15 missing function names (same owner-approved `--force`); all 15 succeeded, log ended
with an explicit "Deploy complete!".

**Final authoritative verification:** exactly 99 functions deployed, byte-identical diff against
the approved 99-name allowlist (zero drift), 0 of the 6 excluded functions present
(`inventoryCatalogImageStorage`, `wipeOperationalTestData`, `testAiEnrichmentPlayground`,
`testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`), all functions in
`us-central1`, no function in a non-`ACTIVE` state, `rebuildCatalogSnapshots` confirmed present
(deployed but not yet invoked — invocation remains its own separate Phase D checkpoint). Deploy log
directly confirmed the `GEMINI_API_KEY` secret-accessor role was granted to the Functions service
account during this deploy — direct evidence secret bindings are live, not merely configured.

**No secret value was ever accessed, printed, or logged at any point in this pass.** No excluded
Function was deployed. No App Hosting, Portal, DNS, Auth, or production-data action occurred.
`production` received no Git commit (Functions deploy is a Firebase action, not a repository
change).

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-5 of 12 all
complete. Proceeding into Phase C (App Hosting environment configuration and first Portal release,
step 6 of 12) under the same multi-phase authorization already granted by the owner.

## 2026-07-30 — Goal #13 "production-release" — Firestore indexes CLOSED (owner confirmed all 65 Enabled); Secret Manager population COMPLETE (deployment-order steps 1-4 of 12 done)

**Firestore indexes checkpoint closed:** owner confirmed via Firebase Console that all 65 of 65
composite indexes on `fresh-prints-prod` show `Enabled` — 0 `Building`, 0 `Error`, 0 field
overrides.

**Secret Manager (step 4) confirmed complete.** Source-level audit of
`functions/src/lib/secrets.ts` on the verified `production` commit found exactly 4 required
secrets: `GEMINI_API_KEY` (bound by `enqueueAiEnrichment`, included in the approved allowlist —
also referenced by `testAiEnrichmentPlayground`/`testAiEnrichmentTagRerank`, both correctly
excluded), `RESEND_API_KEY` and `BREVO_API_KEY` (both bound by `createCustomerWithPortalInvite`/
`createTeamUser`/`onEmailDeliveryJobCreated` per Firebase Functions v2's deploy-time
secret-declaration requirement — `resolveEmailApiKey()` only reads the value for the actually
selected provider at runtime), `ETSY_X_API_KEY` (bound by `searchEtsyRecommendations`/
`staffSearchEtsyRecommendationApiResults`). **Confirmed zero `OPENAI_API_KEY` references anywhere
in source** — Gemini-only architecture confirmed current.

**Email-provider default confirmed from source, not guessed:**
`DEFAULT_EMAIL_PROVIDER_SETTINGS` (both `inviteProvider` and `proofNoticeProvider`) defaults to
`"resend"`; the system does not fail closed when `settings/emailProviders` doesn't exist —
cold-start-safe. **Owner selected both Resend and Brevo** for launch flexibility.

**External-provider readiness, owner-confirmed (status-only, no credential values shared):**
Gemini AVAILABLE; Resend AVAILABLE, sender domain VERIFIED; Brevo AVAILABLE, sender domain
VERIFIED; Etsy credential AVAILABLE, application access AVAILABLE. **No blocker identified.**

**Pre-population metadata check** (read-only, no values accessed) confirmed all four secrets
absent from `fresh-prints-prod` before population — no existing-secret overwrite risk.

**Secret population method:** this coding agent's tool environment cannot host a genuinely
interactive terminal session that a human can type a value into mid-command. Per the hard
security rules (never pass a value as a command argument, never use a plaintext file, never
fabricate an interactive session), population was correctly handed to the owner: **the owner ran
`firebase functions:secrets:set <NAME> --project fresh-prints-prod` directly in their own
terminal for all four secret names**, using that command's genuine interactive hidden-value
prompt.

**Post-population metadata verification** (read-only, no values accessed) confirmed all four
secrets: version 1, state ENABLED. Confirmed no `OPENAI_API_KEY` was created. Confirmed no secret
was created in `fresh-prints-dev` (a single read-only informational check of that project's own
pre-existing, unrelated `GEMINI_API_KEY` was performed for context, not a modification).

**No secret value was ever printed, echoed, logged, displayed, copied to a file, or included in
any command argument, output, or workflow record throughout this entire pass.**

**No Cloud Functions, App Hosting, Portal, or any other Firebase component was deployed. No
production data was created. `rebuildCatalogSnapshots` was not invoked. DNS was not touched.
`master` was not deleted. `production` received no Git commit** — this pass performed only
Secret Manager configuration on `fresh-prints-prod`, not a repository change.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-4 of 12 all
complete. STOPPED at the Functions deployment approval checkpoint (step 5 of 12 — approved
99-function allowlist).

## 2026-07-30 — Goal #13 "production-release" — Firestore indexes DEPLOYED to fresh-prints-prod (step 3 of 12 succeeded); awaiting owner Console readiness confirmation

Owner approved via `APPROVE FIRESTORE INDEXES REDEPLOYMENT`. Pre-deploy verification re-confirmed
exact matches on `production` (`HEAD`/`origin/production` = `21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`,
`firestore.indexes.json` hash `e3c15380f538c3e1e6ccf5197c82f1b2ad63b5e5`, clean tree). Re-ran full
validation — all exit 0: duplicate validator (4/4), canonical audit (65 total/65 unique/0
duplicates/0 field overrides), `npm run test:rules` (48/48), lint, `git diff --check`. Captured
remote baseline read-only: 50 indexes, 0 field overrides, matched expected.

**Deployed:** `firebase deploy --only firestore:indexes --project fresh-prints-prod` — **exit 0.**
"Deploy complete!" / "firestore: deployed indexes in firestore.indexes.json successfully for
(default) database." **No deletion prompt occurred.** No `--force` used.

**Post-deployment remote state:** 65 indexes, 0 field overrides — all 16 collection groups
represented, including the 7 that previously had zero. Precise canonical-identity comparison
(correctly excluding Firestore's server-auto-appended `__name__` tiebreaker field, which an
initial pass had mistakenly flagged as 37 false-positive mismatches before being corrected)
confirmed **0 missing, 0 unexpected** — every one of the 65 local index definitions is present
remotely with matching content.

**Remaining verification not obtainable from the CLI:** `firestore:indexes` reports only
definitions, not per-index build status. **This checkpoint is not fully closed until the owner
confirms via Firebase Console** (`fresh-prints-prod` → Firestore Database → Indexes) that every
index shows `Enabled`, not `Building` or `Error`.

Returned to `development` (already in sync, no back-merge needed). `origin/production` confirmed
unchanged — this deployment added no Git commit, only the Firebase indexes release.

**No other Firebase component was deployed.** Firestore Rules and Storage Rules remain correctly
deployed, unaffected. No Secret Manager, Functions, App Hosting, DNS, production data,
`rebuildCatalogSnapshots`, Studio distribution, or GA4/Search Console action occurred. `master`
was not deleted.

**Active managed goal:** `production-release` (Goal #13) — awaiting owner Console confirmation
that all 65 indexes show `Enabled`. Once confirmed, the next checkpoint is Secret Manager
inventory, value collection, and production secret population approval.

## 2026-07-30 — Goal #13 "production-release" — Firestore index remediation MERGED to production via PR #5; v1.0.0-rc3 tagged; stopped at indexes-redeployment approval checkpoint

**PR #5 merge verified via GitHub API:** `merged: true`, merge commit
`21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`, base `production` (was `a8b02c9`) ← head
`development` (`03d16b0`), 9 files, +1129/-43 — exactly matching this goal's own pre-merge
verification. `origin/production` advanced accordingly; `master` unchanged.

Switched to `production`, fast-forward pulled, confirmed branch/HEAD/clean tree. **Verified the
corrected index configuration on the exact merged commit:** `firestore.indexes.json` new hash
`e3c15380f538c3e1e6ccf5197c82f1b2ad63b5e5`; canonical duplicate audit — **65 total, 65 unique, 0
duplicate groups, 0 field overrides**; both the two-field and three-field `customerUploads`
indexes confirmed present and distinct. `firestore.rules` and `storage.rules` confirmed
**unchanged** from already-deployed versions. Fresh Functions export enumeration: **105
total, 99 include, 6 exclude** — allowlist unchanged.

**Full verification suite, all exit 0:** duplicate validator (4/4), JSON validity, `npm run
test:rules` (48/48), `npm run lint`, `git diff --check`.

**Remote state captured read-only:** `firebase firestore:indexes --project fresh-prints-prod` —
50 indexes, 0 field overrides — **unchanged, untouched.**

Confirmed `v1.0.0-rc1` and `v1.0.0-rc2` unchanged; created and pushed annotated tag **`v1.0.0-rc3`**
on the verified merge commit. Returned to `development` (already in sync — no back-merge needed).

**No Firebase deployment, secret configuration, DNS configuration, or production data creation
occurred in this pass.** The 50 already-created remote indexes were not touched, edited, or
deleted. `master` was not deleted.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firestore indexes
**redeployment** approval checkpoint; awaiting explicit owner approval to retry
`firebase deploy --only firestore:indexes --project fresh-prints-prod`.

## 2026-07-30 — Goal #13 "production-release" — Firestore index duplicate REMEDIATED on development (Plan + Formal Review approved); stopped at production PR checkpoint

Performed a canonical duplicate audit of `firestore.indexes.json` (deterministic structural
identity by collectionGroup+queryScope+ordered fields, not raw JSON formatting). Confirmed exactly
one duplicate group: `customerUploads` `purpose ASC + catalogReviewStatus ASC` at array positions
44 and 50, byte-identical. Confirmed the legitimate `customerUploads` two-field/three-field pair
(positions 44/43) are structurally distinct — the three-field prefix-extension index was correctly
protected, not conflated with the duplicate.

**Provenance traced via `git blame`:** position 44 (kept) originates from commit
`043f38a1adc4a62a727e5a4a1ee30fd4d1900c81` (2026-07-13, "Add Portal donate-designs uploads and
Studio donated designs intake") — the original, deliberate pair with the three-field index.
Position 50 (removed) originates from commit `cbba4ca858d76da5514389a67e187612761240fd`
(2026-07-14, "Add design asset purge, helper permission gates, and Portal account artwork
upgrades") — an unrelated feature commit, one day later, that accidentally re-added an identical
index.

**Confirmed remote state unchanged:** `firebase firestore:indexes --project fresh-prints-prod` —
50 indexes, 0 field overrides, same 7 collection groups with zero indexes as before. Nothing was
touched remotely at any point.

**Wrote and independently reviewed a narrow remediation Plan**
(`docs/workflow/plans/2026-07-30-firestore-index-duplicate-remediation-plan.md`) — the Formal
Review (`docs/workflow/reviews/2026-07-30-firestore-index-duplicate-remediation-review.md`)
independently re-ran the audit and provenance trace from scratch and confirmed both matched.
**Verdict: approved**, no unresolved blocker.

**Implemented the exact, narrow correction:** removed only the 14-line duplicate block (array
position 50); zero other changes (`git diff --stat`: 1 file, 14 deletions only). Corrected file:
65 unique definitions, 0 duplicates, 0 field overrides.

**Added deterministic duplicate-validation test coverage:**
`packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts`, following the
existing `storageRulesAlignment.test.ts` convention (no new dependency) — proves the real file has
zero duplicates, a fixture with an exact duplicate is detected, and a two-field/three-field prefix
pair is correctly not flagged. 4/4 tests pass.

**Full verification, all exit 0:** JSON validity, the new validator test, `npm run test:rules`
(48/48), `npm run lint`, `git diff --check`.

Committed narrowly (only the 4 intended files: the index fix, the new test, the Plan, and the
Formal Review) and pushed to `origin/development`. Prepared the `development → production` pull
request — did not merge (no `gh` CLI available in this environment) — exact pre-filled compare URL
provided to the owner.

**The 50 indexes already created on `fresh-prints-prod` were not touched, edited, or deleted at
any point.** No `firebase deploy` command of any kind was run. Firestore Rules and Storage Rules
remain correctly deployed, unaffected. No Secret Manager, Functions, App Hosting, DNS, production
data, `rebuildCatalogSnapshots`, Studio distribution, or GA4/Search Console action occurred.
`production` received no Git commit — only `development` advanced. `master` was not touched.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the production PR merge
checkpoint; awaiting the owner to review and merge the remediation pull request. After merge:
production verification, `v1.0.0-rc3` tag, then a **separate** owner approval before retrying the
Firestore indexes deployment.

## 2026-07-30 — Goal #13 "production-release" — Firestore indexes deployment BLOCKED (duplicate index caused partial failure); human checkpoint required

Owner approved via the Firestore-indexes deployment instruction, authorizing exactly
`firebase deploy --only firestore:indexes --project fresh-prints-prod`.

**Pre-deploy verification passed in full:** `origin/master`/`origin/production` confirmed
unchanged (`aa570aa`/`a8b02c9`); switched to `production`, fast-forward pulled, confirmed `HEAD` =
`origin/production` = `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`, clean tree;
`firestore.indexes.json` committed hash, working-tree hash, and production-vs-development
comparison all matched exactly (`b67e711bed1a2881767b94ac369fed59346301be`, identical between
branches); JSON validated (66 composite indexes, 0 field overrides, exit 0); remote
pre-deployment state confirmed empty (`{"indexes": [], "fieldOverrides": []}`).

**Full-file inspection (as explicitly required) found one real issue:** a byte-for-byte duplicate
index definition on `customerUploads` (`purpose` ASC + `catalogReviewStatus` ASC), present twice
at two separate array positions. No hardcoded project IDs, no malformed fields, no dev-only
collection names, no destructive field overrides found otherwise.

**Deployment attempted:** `firebase deploy --only firestore:indexes --project fresh-prints-prod`
— **exit 1.** Firebase CLI reported `HTTP Error: 409, index already exists` on the
`customerUploads` collection group — the CLI submitted the duplicate entry twice within the same
batch, and the second submission's own duplicate triggered the failure, aborting the remaining
batch.

**Post-failure remote state:** 50 of 66 indexes now exist on `fresh-prints-prod`
(`categories`, `customers`, `customerUploads`, `designs`, `gangSheetItems`, `gangSheets`,
`printRequestItems`, `printRequests`, `showAllocations`). **7 collection groups have zero
indexes**: `assistedCreationRequests`, `customerNotifications`, `customerUploadBatches`,
`customerUploadFinalizeLeases`, `etsyRecommendationRequests`, `etsyRecommendationSuggestions`,
`etsySuggestionRequests`. No data was corrupted, nothing was deleted, and no unexpected index was
created — the 50 present indexes exactly match their corresponding entries in the reviewed
`firestore.indexes.json`.

**Per explicit instruction: did not retry blindly, did not use `--force`, did not manually
edit/delete anything in Console.** Firestore Rules (step 1) and Storage Rules (step 2) remain
correctly deployed and are completely unaffected by this failure.

**Required remediation (owner decision needed, not performed this pass):** remove the exact
duplicate index entry from `firestore.indexes.json` on `development`, commit, promote via a new
GitHub pull request to `production`, then obtain separate explicit owner approval before
reattempting the Firestore indexes deployment. After a successful redeploy, every unique index
definition must be verified `Enabled`/ready in Firebase Console before this checkpoint can close.

**No production data was touched. No secret was configured. No Functions, App Hosting, DNS, or
Studio action occurred. `master` was not deleted.**

**Active managed goal:** `production-release` (Goal #13) — **BLOCKED** at the Firestore indexes
deployment checkpoint (deployment-order step 3); awaiting owner decision on the
`firestore.indexes.json` duplicate-entry correction.

## 2026-07-30 — Goal #13 "production-release" — Storage Rules DEPLOYED to fresh-prints-prod (deployment-order step 2 of 12 complete)

Owner approved via `APPROVE STORAGE RULES DEPLOYMENT`, authorizing exactly
`firebase deploy --only storage --project fresh-prints-prod` and nothing else.

Ran the full pre-deploy safety sequence: confirmed clean tree on `development`; `git fetch
origin`; `git switch production`; `git pull --ff-only origin production` (already up to date, no
divergence); verified local `HEAD` = `origin/production` =
`a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56` and `storage.rules` blob hash =
`3f1dd48e9f37afacb972ade3dc21c2818038a6fe` — both exact matches to the required values. Ran
`npm run test:rules` (48/48 pass, exit 0) and `git diff --check` (exit 0, clean).

**Deployed:** `firebase deploy --only storage --project fresh-prints-prod` — **exit 0, "Deploy
complete!"** Rules compiled successfully with no errors or warnings and were released to
`firebase.storage`. Console URL confirmed `fresh-prints-prod` as the deployed project. **This is
the first-ever Fresh Prints production Storage Rules deployment** — no prior Storage Rules
history existed on this project.

Provided owner Console verification instructions: `fresh-prints-prod` → Build → Storage → Rules
tab → confirm "Last published" timestamp and compare displayed content against local
`storage.rules`.

Returned to `development` (`git switch development`, `git pull --ff-only`, clean tree confirmed).
**`origin/production` confirmed unchanged** at `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56` — this
deployment added no Git commit to `production`, only a Firebase Storage Rules release.

**No other Firebase component was deployed.** No Firestore Rules redeployment (unnecessary,
already correctly deployed), no Firestore indexes, no Functions, no App Hosting release, no
secrets, no DNS, no production data, no `rebuildCatalogSnapshots`, no Studio distribution, no
GA4/Search Console configuration. `master` was not deleted.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firestore indexes
deployment approval checkpoint (deployment-order step 3); awaiting explicit owner approval.

## 2026-07-30 — Goal #13 "production-release" — development promoted to production via GitHub PR #3; v1.0.0-rc2 tagged; stopped at Storage Rules checkpoint

Owner confirmed a local `apps/studio/tsconfig.json` change (removed `ignoreDeprecations: "5.0"`
and `baseUrl: "."`) was an intentional TypeScript 5.9.3 compatibility fix — no runtime behavior
change. Verified (typecheck, build incl. electron-builder, lint, diff-check all exit 0) and
committed to `development` as `dd05ef25ebeb2512ee1a56da031b6118acb01498a`, pushed.

Verified the full promotion diff before the PR: 8 commits, 9 files, +1535/-53 between
`origin/production` and `origin/development` — the tsconfig fix, the pre-push hook, and 7
documentation/redaction files. `firestore.rules`, `storage.rules`, `firestore.indexes.json`, and
`functions/src/index.ts` all confirmed byte-identical between branches — no behavioral change, no
secret, no local env file.

**Owner created and merged GitHub PR #3** ("Release: promote verified development state to
production") — confirmed via GitHub API: `merged: true`, merge commit
`a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`, base `production` (`aa570aa`) ← head `development`
(`dd05ef2`), 8 commits, 9 files, +1535/-53 — exactly matching this session's own pre-merge
verification.

Switched to `production`, fast-forward pulled (`aa570aa..a8b02c9`, no conflicts), confirmed
branch/HEAD/clean tree. **Ran the complete release verification suite on the exact merged
commit** — Functions build, Portal typecheck, Studio typecheck, Portal build, Studio build
(incl. electron-builder), repo lint, Firebase Rules emulator tests (48/48), `git diff --check`:
**all exit 0.** Fresh Cloud Functions export enumeration re-confirmed 105 total exports, 99
included, 6 excluded, `rebuildCatalogSnapshots` included — the approved allowlist unchanged by
the merge.

Confirmed `firestore.rules` (`d4d754e2...`), `storage.rules` (`3f1dd48e...`), and
`firestore.indexes.json` (`b67e711b...`) hashes all unchanged from the already-verified/deployed
versions — Firestore Rules remain correctly deployed, **no redeployment required**.

Confirmed `v1.0.0-rc1` unchanged at `aa570aa875d20ba85fd405480a47e6eda59f85b0`. Created and pushed
annotated tag **`v1.0.0-rc2`** on the verified merge commit `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`.

Returned to `development` (fast-forward pull, which also picked up a benign GitHub-suggested
production→development sync-back merge, PR #4 — content-identical, introduces nothing new).
Confirmed final branch `development`, clean tree, `origin/production` still exactly at the
verified merge commit.

**The entire promotion went through the protected GitHub PR workflow** — no branch protection was
bypassed, no emergency override used, no force-push anywhere. **No Firebase deployment of any
kind occurred in this pass.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Storage Rules
deployment approval checkpoint (deployment-order step 2); awaiting explicit owner approval.

## 2026-07-30 — Goal #13 "production-release" — Firestore Rules DEPLOYED to fresh-prints-prod (deployment-order step 1 of 12 complete)

**First production Firebase deployment of this goal.** Owner approved via
`APPROVE FIRESTORE RULES DEPLOY`, authorizing exactly `firebase deploy --only firestore:rules
--project fresh-prints-prod` and nothing else.

Ran the full pre-deploy safety sequence: confirmed clean tree on `development`; `git fetch
origin`; `git switch production`; `git pull --ff-only origin production` (already up to date, no
divergence); verified local `HEAD` = `origin/production` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0` and `firestore.rules` blob hash =
`d4d754e22090a75ec9fa1c7fc38bbf2101822131` — both exact matches to the required values. Confirmed
target project `fresh-prints-prod` in the command.

**Deployed:** `firebase deploy --only firestore:rules --project fresh-prints-prod` — **exit 0,
"Deploy complete!"** Rules compiled successfully (pre-existing non-blocking lint warnings about
unused/shadowed function names, not errors) and were released to `cloud.firestore`. Console URL
confirmed `fresh-prints-prod` as the deployed project. **This is the first-ever Fresh Prints
production Firestore Rules deployment** — no prior Rules history existed on this project.

Provided owner Console verification instructions: `fresh-prints-prod` → Firestore Database → Rules
tab → confirm "Last published" timestamp and compare displayed content against local
`firestore.rules`.

Returned to `development` (`git switch development`, `git pull --ff-only`, clean tree confirmed).
**`origin/production` confirmed unchanged** at `aa570aa875d20ba85fd405480a47e6eda59f85b0` — this
deployment added no Git commit to `production`, only a Firebase Rules release.

**No other Firebase component was deployed.** No Storage Rules, indexes, Functions, App Hosting
release, secrets, DNS, production data, Studio build, or GA4/Search Console configuration
occurred. `master` was not deleted.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Storage Rules deployment
approval checkpoint (deployment-order step 2); awaiting explicit owner approval.

## 2026-07-30 — Goal #13 "production-release" — CORRECTED: App Hosting first release is NOT next; approved deployment order restored; stopped at Firestore Rules deployment checkpoint

**Correction:** a prior pass's log entry title ("stopped at App Hosting first-release checkpoint")
incorrectly implied the Portal release was the immediate next action. The owner clarified the
approved order places 6 steps before it. Restated accurately: `fresh-prints-prod`'s Firebase
products (Firestore Native/`nam5`, Storage `us-central1`, Authentication, Web App, VAPID key) and
its App Hosting backend (`fresh-prints-portal`, connected, branch `production`, root
`apps/portal`, `us-central1`, "Waiting for your first release") are all **configured** —
production is not empty. But **no Firestore Rules, Storage Rules, indexes, or Functions have been
deployed; no secrets set; no production data seeded; no domain configured; no production traffic
exists.**

**Approved deployment order (do not skip):** (1) Firestore Rules, (2) Storage Rules, (3) Firestore
indexes, (4) Secret Manager, (5) Cloud Functions (approved 99-function allowlist), (6) App Hosting
env vars, (7) first Portal release, (8) Studio build, (9) settings/reference data, (10) domain/
Authorized Domains, (11) smoke tests, (12) GA4/Search Console.

Re-verified branch/tag state directly from Git: current branch `development`, clean tree;
`origin/production` = `aa570aa875d20ba85fd405480a47e6eda59f85b0` (unchanged). **`production` was
not modified this pass.**

Compared `firestore.rules` between `development` and `production`: identical Git blob hash
(`d4d754e22090a75ec9fa1c7fc38bbf2101822131`) on both branches, confirmed via
`git rev-parse <ref>:firestore.rules` and cross-checked with an empty `git diff --stat` between
the two refs on that path. Local working-tree copy also matches (`git hash-object`). **No
`development → production` merge is required before deploying Rules.**

Ran the real Firestore/Storage Rules emulator test suite (`npm run test:rules`, using
`@firebase/rules-unit-testing`, requiring the documented portable JDK 21 workaround since no
system Java is present — set `JAVA_HOME`/`PATH` for this command only): **48/48 tests pass, exit
0.**

Rollback preparation: this is the first Rules deployment ever made to `fresh-prints-prod` (no
prior deployed version exists on this project to roll back to). For any future Rules change,
rollback is redeploying the prior commit's `firestore.rules` via the same deploy command, or
restoring from Firebase Console's own Rules version history (independent of git).

**Exact prepared command (NOT executed):**
```
firebase deploy --only firestore:rules --project fresh-prints-prod
```

Updated `docs/standards/DEPLOYMENT.md` with an explicit ordered deployment-sequence list marking
the current position (step 1, Firestore Rules) and clarifying the App Hosting backend's existing
"Waiting for your first release" status does not change that order.

**No `firebase deploy` command of any kind was run. No Rules, indexes, or Functions were deployed.
No secret was set. No production data was touched. `production` was not modified. `master` was
not deleted.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firestore Rules
deployment approval checkpoint; awaiting explicit owner approval to run the exact prepared
command.

## 2026-07-30 — Goal #13 "production-release" — Firebase product enablement CONFIRMED COMPLETE; App Hosting backend created with no rollout; stopped at App Hosting first-release checkpoint

Re-verified branch/tag state directly from Git (unchanged): `master`/`production` both at
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `v1.0.0-rc1` unchanged. **`master` and `production`
were not touched this pass.**

Verified (read-only) the owner's reported Firebase product-enablement completion for
`fresh-prints-prod`: Firestore created in Native mode, location `nam5` (matches this session's own
evidence-based recommendation exactly); Cloud Storage default bucket in `us-central1` (matches
exactly); Authentication enabled with Email/Password + Google providers; production Web App
registered as `Fresh Prints Portal Production` with classic Firebase Hosting correctly not
enabled; production web configuration recorded locally in `apps/portal/.env.production.local` —
confirmed gitignored (`git check-ignore -v` matches the `.env.*.local` rule), confirmed untracked
(`git ls-files` empty), confirmed absent from default `git status` output; **no file content was
read or printed at any point**; Web Push VAPID key generated and recorded in the same local file;
GA4 confirmed still disabled; zero production data created.

Confirmed the App Hosting configuration values against current repository source
(`firebase.json`'s `apphosting[0]`: `backendId: "fresh-prints-portal"`,
`rootDir: "./apps/portal"`) — matched the owner's reported values exactly.

**Owner clarification received:** the App Hosting backend `fresh-prints-portal` was created via
the Console's **Finish** action only, is in `us-central1`, and shows **"Waiting for your first
release."** No deployment or rollout occurred. **This empirically resolves the prior pass's open
question** of whether backend creation triggers an automatic rollout — confirmed **no**: backend
configuration and the first release/deploy are genuinely separate steps in this Firebase
Console/CLI version. Backend configuration is complete; nothing has been built, deployed, or
served; Portal production traffic remains at zero.

Updated `docs/standards/DEPLOYMENT.md` with a clear status table distinguishing backend
configuration (complete) from an actual release/deployment (not performed).

**No Firebase deployment, secret configuration, DNS configuration, or production data creation
occurred in this pass. `rebuildCatalogSnapshots` was not invoked. `master` and `production` remain
untouched.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the App Hosting
first-release checkpoint per explicit instruction; awaiting explicit, separate owner approval
before triggering any release/rollout.

## 2026-07-30 — Goal #13 "production-release" — Both email findings REDACTED from current tree; owner declined Git-history rewrite; stopped at Firebase product-enablement checkpoint

Re-verified branch/tag state directly from Git (unchanged): `master`/`production` both at
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `v1.0.0-rc1` unchanged. **`master` and `production`
were not touched this pass.**

Owner approved redacting the two email findings from the prior audit from the current repository
state. Replaced both with non-real placeholders across every current-tree occurrence (3 files,
including this coding agent's own prior audit-log text in `.cursor/workflow/state.md`, which had
quoted both addresses verbatim while documenting the finding). Confirmed via `git grep` that zero
occurrences of either original address remain anywhere in the current tracked tree.

**Owner explicitly declined a Git-history rewrite** — neither finding was a credential, no
third-party customer data was found, and rewriting would change the established
`master`/`production`/`v1.0.0-rc1` hashes and require force-pushing public branches, a
disproportionate remediation for the finding. **Historical commits touching either affected file
still contain the original addresses** — a complete historical purge remains available only
through a separately approved history-rewrite Plan if the owner later decides it is necessary.
Security audit verdict remains **PASS**.

Ran the focused unit test for the modified test file (3/3 pass), repo lint (clean), and
`git diff --check` (clean) before committing.

Substantially expanded `docs/standards/DEPLOYMENT.md`'s Firebase product-enablement instructions
with evidence-based location recommendations: Firestore `nam5` and Storage `us-central1`, both
sourced directly from this repository's own `docs/workflow/setup/firestore-setup.md` and
`firebase-storage-setup.md` (the same recommendations already used for `fresh-prints-dev`), cross-
checked against the confirmed `us-central1` Functions region
(`functions/src/lib/portalOgUrls.ts:39`). Confirmed the App Hosting backend ID
(`fresh-prints-portal`) and root directory (`./apps/portal`) directly from `firebase.json`.
Flagged `[NEEDS REPO CHECK]` on two points that could not be proven from repository source: whether
creating an App Hosting backend triggers an automatic first rollout (external product behavior,
must be confirmed against actual Console behavior before that step), and the exact production env
file naming convention (no `.env.production.local` file exists yet — a proposed, not established,
convention; both proposed names are confirmed covered by the root `.gitignore`'s `.env.*.local`
pattern regardless).

**No repository visibility change was made. No Git history was rewritten. No force-push occurred.
No Firebase product was enabled, no secret was set, no production configuration of any kind
occurred, no `rebuildCatalogSnapshots` invocation occurred. `master` and `production` remain
untouched.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firebase
product-enablement checkpoint per explicit instruction; awaiting the owner to complete the
documented Firebase Console steps and report back.

## 2026-07-30 — Goal #13 "production-release" — Repository made PUBLIC; production ruleset CONFIRMED ACTIVE; full security audit PASS; stopped at production-security checkpoint

Re-verified branch/tag state directly from Git (unchanged): current branch `development`, clean
tree, `origin/master`/`origin/production` both at `aa570aa875d20ba85fd405480a47e6eda59f85b0`,
`origin/development` at `07d134a9124733e1698f31a5aec92fe51770dd54`, `v1.0.0-rc1` unchanged.
**`master` and `production` were not touched.**

The repository was changed from private to public by the owner. Independently confirmed via the
live, unauthenticated GitHub API (not just the owner's report) that visibility is genuinely
`"public"`, and that the `production` ruleset is genuinely `"enforcement": "active"` with
restrict-deletions, block-force-pushes, and require-PR-before-merge (0 required approvals) rules
all present. **The prior "not enforced — private repo plan limitation" report is now superseded
and resolved.**

Performed the full public-repository security audit (previously missing): scanned the current
working tree and all 131 commits reachable across all 17 refs (branches, tags, remotes) for
credentials, private keys, service-account files, PEM keys, common API-token prefixes, and personal/
customer data. **Result: PASS.** No probable real credential, private key, service-account file, or
third-party customer/financial/legal/personnel data was found anywhere. One non-blocking finding: a
real personal email address (the repository owner's own, from an internal dev-debugging note) in
`docs/workflow/reviews/2026-07-17-portal-notifications-alert-missing-investigation.md`, present
across every historical commit touching that file — `[NEEDS OWNER DECISION]` on redaction, not a
release blocker.

Reviewed public non-secret content (architecture docs, workflow artifacts, deployment instructions,
project IDs, the Functions allowlist) — all classified acceptable for a public repository; no
private business/customer/financial/legal/personnel data found in this category either.

Re-documented the local pre-push hook (`.githooks/pre-push`) as optional defense-in-depth now that
the GitHub ruleset provides confirmed server-side protection — left inert, unaltered.

**No repository visibility change was made this pass** (already public, per owner action). No Git
history was rewritten. No force-push occurred. No Firebase product was enabled, no secret was set,
no production configuration of any kind occurred. `master` and `production` remain untouched.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the production-security
checkpoint per explicit instruction; awaiting the owner's decision on the personal-email finding,
then completion of the documented Firebase product-enablement steps.

## 2026-07-30 — Goal #13 "production-release" — GitHub ruleset limitation recorded; local pre-push safeguard added; stopped at Firebase product-enablement checkpoint

Re-verified all branch/tag facts directly from Git before relying on them (not assumed from a
prior turn): current branch `development`, working tree clean, `origin/master` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `origin/production` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `origin/development` =
`e2d6cde99c72a8d0c3966861b1e1460d520bc9cb` (the prior documentation commit), `v1.0.0-rc1` still
points to `aa570aa875d20ba85fd405480a47e6eda59f85b0`. **`master` and `production` were not touched
this pass.**

**GitHub `production` ruleset:** created by the owner, targets `production`, but GitHub's own
message confirms it is **not enforced** on this private repository until the organization upgrades
to a GitHub Team (or equivalent) plan — the owner is not upgrading this pass. `production` is
therefore **not currently protected at the GitHub server level.** Documented the intended ruleset
configuration (Active enforcement, restrict deletions, block force pushes, require PR before
merge, 0 required approvals, status checks/signed commits/linear history disabled, empty bypass
list) as future-ready documentation only.

Checked for existing Git-hook conventions first — none found (no `.githooks/`, no
`core.hooksPath`, no `pre-push` hook, no husky-style package). Added `.githooks/pre-push`, a
tested, executable POSIX shell script that blocks a direct local push to `refs/heads/production`
with a clear message pointing to the PR-based promotion workflow, permits an explicit
`ALLOW_DIRECT_PRODUCTION_PUSH=1` emergency override, and leaves `development` and every other
branch untouched — verified all four behaviors directly. **The hook is present but inert**;
activating it requires running `git config core.hooksPath .githooks`, which is its own separate
owner-approval step, deliberately not performed this pass.

Substantially expanded `docs/standards/DEPLOYMENT.md`'s Branch Model section: ruleset
status/intended-settings table, safeguard documentation, refined
development/production-release/hotfix workflows (PR-based promotion only, fast-forward-only pull
on `production`, explicit `--project` flags on every Firebase command), a new "Firebase branch and
project separation" table, the restated Functions allowlist/exclusion list, the restated 8-condition
`master` deletion policy, and a new beginner-friendly "Next checkpoint — Firebase product
enablement" subsection covering Firestore (Native mode + location choices flagged **permanent**),
Storage, Authentication, Email/Password + Google sign-in, Web App registration (config recorded to
a local gitignored file, never committed), the Web Push certificate, and preparing — not
completing — the App Hosting backend.

**No Firebase Console action was performed on the owner's behalf.** No Rules, Storage Rules,
indexes, Functions, App Hosting rollout, or Portal deploy occurred. No secret, DNS, production
user, or production data was configured/created/seeded. No production Studio installer was built.
No GA4 or Search Console configuration occurred. `production` was not modified. `master` was not
deleted. **No force-push occurred.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firebase
product-enablement checkpoint per explicit instruction; awaiting the owner to complete the
documented Firebase Console steps and report back.

## 2026-07-30 — Goal #13 "production-release" — Permanent `production`/`development` branches created and pushed; v1.0.0-rc1 tagged; stopped at GitHub-settings checkpoint

Owner committed and pushed the full consolidated, approved release candidate directly to
`master`/`origin/master`: commit `b45542ab66a9f6fafb1142201b29fc6d7a969376`. Verified before any
action: `git rev-parse HEAD` matched `git rev-parse origin/master` exactly, working tree clean,
commit message matched verbatim, remote confirmed `origin`.

Checked `.firebaserc` as actually committed in `b45542ab` (`git show b45542ab:.firebaserc`) —
confirmed the `production` alias was missing. Added exactly `"production": "fresh-prints-prod"`
(preserving `"default": "fresh-prints-dev"` unchanged), validated as JSON, committed narrowly as
`aa570aa` ("chore: add production Firebase project alias"), pushed to `origin/master` (clean
fast-forward, no force).

**Branch-point commit: `aa570aa875d20ba85fd405480a47e6eda59f85b0`.** Created and pushed
`production` from that exact commit (`git switch -c production` + `git push -u origin production`).
Created and pushed `development` from the identical commit
(`git switch -c development` + `git push -u origin development`); left the repository checked out
on `development`. Verified via `git fetch origin` that `origin/master`, `origin/production`, and
`origin/development` all resolve to the same hash; confirmed tracking and a clean working tree.

Confirmed `v1.0.0-rc1` did not already exist locally or remotely, then created an annotated tag on
the exact branch-point commit and pushed it to `origin`. **This is the release-candidate tag only —
the final `v1.0.0` tag is deferred until after production deployment and smoke testing pass.**

Updated `docs/standards/DEPLOYMENT.md` with a new permanent Branch Model section (development
workflow, production-release workflow, hotfix workflow), explicitly marking the previous
direct-to-`master` policy as superseded. This entry, `.cursor/workflow/state.md`,
`docs/project/ROADMAP.md`, and the recent-completed-work handoff were all updated to record this
transition — committed to **`development` only**, not merged into `production` this pass.

**`master` was NOT deleted** — retained as the required temporary transition fallback; its deletion
remains a separate, later, explicitly-approved checkpoint. No Firebase product was enabled, no
secret was set, no Rules/indexes/Functions/App-Hosting/DNS/Auth/GA4/Search-Console configuration
occurred, the active Firebase CLI project was never switched, and no production Studio installer
was built. **No force-push occurred at any point.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the GitHub default-branch +
`production` branch-protection checkpoint per explicit instruction; awaiting the owner to perform
those GitHub UI steps and confirm back.

## 2026-07-30 — Goal #13 "production-release" — Production project CONFIRMED; Functions allowlist FINALIZED; working tree RECONCILED; stopped at release-source checkpoint

Owner confirmed the production Firebase project: **`fresh-prints-prod`**, created, Blaze billing
active, zero configuration performed. Verified `functions/src/lib/email/portalUrlResolver.ts`
already maps that exact project id to `https://myprintrequest.com` — no code change needed.

Owner finalized the 5 previously-flagged Functions: excluded `testAiEnrichmentPlayground`,
`testAiEnrichmentTagRerank`, `ownerDeleteUser` (quarantined/destructive, product path is
`tombstoneCustomerAccount`), `backfillPrintRequestQueueTab` (cold-start project, nothing to
backfill); included `rebuildCatalogSnapshots` after verifying from source it is owner/admin-gated,
non-destructive, project-agnostic, and the documented catalog-snapshot publication mechanism
(ADR-FP-120). **Final allowlist: 105 total exports, 99 include, 6 exclude** — exact future deploy
command prepared, not executed.

Reconciled the working tree: classified all 541 remaining changed entries. The large majority trace
cleanly to specific, already-signed-off or owner-approved goals (Wave C generated catalog read
models, Portal print-request prelaunch stability, GA4 analytics, the Firebase Debug window feature,
several customer-upload/Assisted-Creation goals, Goal #14, the `test:rules` harness). Removed
exactly one proven-debris scratch script (`functions/test-admin-auth.mjs` — unreferenced, hardcoded
to `fresh-prints-dev`, a leftover from this goal's own earlier troubleshooting). Found one unrelated,
uncertain-provenance deletion (`apps/studio/.../print-requests/hooks/useCustomers.ts`) and
deliberately left it untouched, flagged for a separate owner decision. Confirmed zero secret-bearing
or build-output files appear anywhere in the changed set.

Proposed release-source strategy: reconcile directly on `master`, committed in ~11 goal-sized commit
boundaries — no new branch, since this repo has no release-branch precedent and the owner already
decided against introducing a new branch policy for this goal. Prepared (not applied) an additive
`.firebaserc` alias (`"production": "fresh-prints-prod"`, alongside the untouched dev default).

Verification (read-only/local only, after the one file removal): Functions build, Portal/Studio
typecheck, Portal build, Studio build, repo lint, `git diff --check` — all exit 0. No `firebase
deploy` command of any kind was run.

Artifacts:
`docs/workflow/reviews/2026-07-30-production-release-working-tree-reconciliation-report.md`,
`docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`,
`docs/workflow/reviews/2026-07-30-production-release-source-and-allowlist-checkpoint.md`, and an
updated `docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md`.

**No production resource was created, configured, modified, or deployed. No secret set. No branch
created. No commit made.** Production remains the empty, Blaze-billed, unconfigured
`fresh-prints-prod` project the owner reported.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the release-source
commit-boundary + `.firebaserc` alias checkpoint per explicit instruction; awaiting owner decisions.

## 2026-07-30 — Goal #14 "customer-upload-early-transparency-format-validation" — Done (approved)

Narrow, separately-scoped follow-up (owner explicitly confirmed it should proceed alongside the
paused Goal #13, without touching #13's state). Fixed the exact mechanism behind an owner-observed
symptom: invalid customer artwork (corrupt, unsupported format, or not meaningfully transparent) could
briefly show the Portal's "Trimming transparent edges…" label before being rejected. Root cause: in
`processCustomerUploadImageBytes` (`functions/src/lib/customerUploadProcessing.ts`), the
validation-time transparency trim *probe* entered the `trimming` progress stage before its pass/fail
verdict was known. Fix: removed that premature stage transition — the probe now stays attributed to
the existing `checking_transparency` stage, since it is validation work, not production trimming.
Production trimming (for images that pass validation) is unchanged and still shows the `trimming`
stage as before.

Applies uniformly to Customer Upload, Donate Design, retry, and ZIP-contained images — all four
callers share this one function; confirmed via source inspection that none have caller-specific
branching, so no caller-side code changes were needed. Accepted-format policy (PNG + static WebP) and
transparency thresholds were confirmed unchanged and out of scope; format/decode detection was already
decode-driven (not filename/MIME-driven) and is unchanged.

23/23 automated tests pass (4 new regression tests + 2 extended existing tests, all asserting via an
`onStage` spy that the `trimming` stage is never observed for a rejected upload), Functions build
clean, repo lint clean, `git diff --check` clean. Portal typecheck/build omitted — no Portal or shared
UI files were touched.

Owner deployed this change to `fresh-prints-dev` and ran manual QA directly, confirming **PASS**
across all 5 goal-brief scenarios (opaque image, unsupported format, falsely renamed file, transparent
PNG, transparent WebP).

Artifacts: `docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md`,
sibling `-review.md` (`approved_with_changes`), `-test-report.md`, and `-signoff.md` (`approved`) of
the same date/slug.

This goal did not modify, advance, or otherwise touch Goal #13 (`production-release`), which remains
the **active managed goal**, still stopped at its own production Firebase project creation checkpoint
— see the entry immediately below.

## 2026-07-30 — Goal #13 "production-release" — Implementation-readiness checkpoint complete; STOPPED at production Firebase project creation

Owner recorded 18 production decisions (separate prod project; exclude `wipeOperationalTestData` +
`inventoryCatalogImageStorage`; canonical URL `https://myprintrequest.com`; continue direct-to-
master manual deploys, no CI/CD; soft launch; GA4 stays off until property+Enhanced-Measurement-
disabled+privacy-policy+separate checkpoint; Firebase Console/Functions-logs/Resend-Brevo for
initial monitoring; Sentry-class tooling post-launch; explicit Functions allowlists only, never
bare `--only functions`). Every repo-check from the approved Plan was resolved this pass:
re-enumerated the full current `functions/src/index.ts` export list (89 recommended for inclusion,
2 explicitly excluded, 5 flagged for owner classification — `testAiEnrichmentPlayground`,
`testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`,
`rebuildCatalogSnapshots`); read the complete 61-index `firestore.indexes.json` (no duplicates, no
dev-only indexes, all trace to real product code — deploy unmodified); found the exact production-
URL-resolver file (`functions/src/lib/email/portalUrlResolver.ts`) and flagged that it **already
hardcodes a `"fresh-prints-prod"` project-id assumption** that must be corrected if the owner
chooses a different id; traced Studio's Firebase config as build-time-only via Vite env files
(requires a separate build invocation with swapped `.env` values for a production installer); found
zero monitoring/error-tracking dependencies anywhere in the repo; audited the live working tree
(542 changed entries, not committed — flagged as needing a reconciliation pass before use as a
production build source, unrelated to this goal); classified cold-start Firestore settings
requirements; prepared the secrets/external-provider checklist without exposing any value.

Wrote beginner-friendly Firebase Console instructions for creating the production project and the
exact 4-item information the owner must return (project ID, creation confirmation, billing/Blaze
status, confirmation no deployment has occurred).

Artifact: `docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md`.

**No production resource was created, configured, modified, or deployed.** Verification (read-only/
local only) — Functions build, Portal typecheck, Portal build, Studio build, repo lint, and
`git diff --check` all run; no `firebase deploy` command of any kind was executed.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the production Firebase
project creation checkpoint per explicit instruction; awaiting the owner's project ID and
confirmations.

## 2026-07-30 — Goal #13 "production-release" — Plan + independent Formal Review complete (approved_with_notes)

`docs/workflow/plans/2026-07-30-production-release-plan.md` (19 sections covering launch-readiness
inventory, exact ship/exclude scope, Functions/Rules/Indexes/App-Hosting deployment scopes,
env-var/Secret Manager inventory, domains, GA4 go-live sequencing, SEO readiness, branch strategy,
migration determination — **cold start, no production Firebase project exists yet** — build/lint
gate, 10-item smoke-test checklist, rollback strategy, 10-checkpoint human-approval sequence, and
post-launch monitoring) and `docs/workflow/reviews/2026-07-30-production-release-review.md`
(independent verification pass, verdict **approved_with_notes**, no fabricated paths/APIs/mechanisms
found) are both complete. 12 `[NEEDS OWNER INPUT]` items remain for the owner to decide before
Implementation may begin — most notably whether `wipeOperationalTestData` ships to production
(Plan recommends: no), branch/release strategy (Plan recommends: continue current direct-to-master
manual-deploy pattern), and the still-outstanding GA4 Privacy Policy determination.
**No implementation, deployment, migration, secret, or production action occurred.** Production
Firebase project does not exist yet.

**Active managed goal:** `production-release` (Goal #13) — STOPPED after Plan + Formal Review per
explicit instruction; awaiting owner review.

## 2026-07-30 — Goal #13 "production-release" — Plan phase started; Goal #12 CLOSED by owner after real inventory

Goal #12 (`catalog-image-derivative-storage-consolidation`) is **closed —
closed_by_owner_after_inventory**. The owner ran the deployed, dry-run-only
`inventoryCatalogImageStorage` callable against real `fresh-prints-dev` data: 87 designs scanned;
originals **980,807,863 bytes (~97.66% of catalog Storage)**; thumbnails 2,820,654 bytes; previews
20,676,202 bytes; display derivatives 0; zero orphans, zero missing objects, zero promotion-cool-
off duplicates, zero purge-policy violations. Given originals dominate catalog Storage and must
remain unchanged for print quality, the owner decided the migration's small addressable Storage
win (existing thumbnails+previews combined use only ~22.4 MB, ~2.3% of total) did not justify the
required backfill, Portal/Studio consumer cutover, and accepted grid-bandwidth increase
(~86 KB vs ~23 KB per typical 8-card grid). **The migration was never implemented** — no
`displayPath` was ever populated, no consumer was migrated, no backfill ran, no thumbnail/preview
was deleted, no production original was modified. This is a successful evidence-based decision,
not a failed implementation. Interrupted mid-Implement scaffolding was inspected file-by-file and
removed narrowly; the read-only inventory tool (callable + classification logic + dev-only Studio
panel) is retained as diagnostic tooling only, deployed to `fresh-prints-dev`, explicitly excluded
from any production scope unless separately reviewed.

Signoff: `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-signoff.md`.

**Goal #12 no longer blocks `production-release`.** Goals #9–#12 are now all signed off/closed.
Started the `production-release` (Goal #13) Plan + Formal Review phase immediately after — see
`docs/workflow/plans/2026-07-30-production-release-plan.md` and
`docs/workflow/reviews/2026-07-30-production-release-review.md`. No production implementation or
deployment has started; multiple decisions remain flagged for explicit owner input.

**Active managed goal:** `production-release` (Goal #13) — Plan + Formal Review phase; awaiting
owner review of flagged decisions before any implementation.

## 2026-07-30 — Goal #12 "catalog-image-derivative-storage-consolidation" — owner approved round-2 decisions; inventory callable deployed, execution pending

Owner approved: 1024×1024 max bounding box, transparent WebP, Q82, downscale-only shared display
derivative; no separate tiny thumbnail (existing thumbnail/preview retained temporarily for
migration fallback/rollback only); `inventoryCatalogImageStorage` dev deployment. Owner explicitly
accepted the ~86 KB vs ~23 KB grid-bandwidth trade-off.

Deployed exactly `inventoryCatalogImageStorage` to `fresh-prints-dev` (Node.js 20 2nd Gen,
us-central1), "Successful create operation," exit 0, 2026-07-30T04:13:23Z UTC. No other resource
deployed; production untouched.

**Real inventory execution requires owner/admin Firebase Auth** (an `onCall` function gated by a
Firestore role check) — this environment has no staff credentials to invoke it directly. Provided
the owner an exact DevTools-console snippet to run it from a signed-in Studio session.

Nothing migrated, backfilled, or written to any design record; no display derivative generated
anywhere; no preview/thumbnail/original touched.

**Active managed goal:** Goal #12 — paused pending the owner running the deployed inventory
callable and sharing results.

## 2026-07-30 — Goal #12 "catalog-image-derivative-storage-consolidation" — Human Checkpoint 1, round 2, awaiting owner approval

Owner rejected round 1's 640×640 @ Q82 recommendation, correctly identifying it would be
**upscaled by the browser** at the confirmed ~1152×896 shared lightbox (no DPR handling exists
anywhere in either app). Round 2: expanded to 640/800/1024/1280 px @ Q82 + 1024 @ Q88, computed the
exact browser upscale factor per candidate from the app's real CSS
(640→1.40×, 800→1.12×, 1024/1280→no upscale), built a self-contained local HTML contact sheet, and
revised the recommendation to **1024×1024 @ Q82** — the smallest candidate avoiding lightbox
upscale, while 1280 was found to save almost nothing (−6.8%) over today's live preview.

Independent security review of the `inventoryCatalogImageStorage` callable found and fixed a real
defect (an unprecedented `!=` Firestore query with a known silent-exclusion gotcha, corrected to
match `purgePromotedDonationFullSize.ts`'s established pattern) and added missing generated-JSON-
asset totals to its report shape. Confirmed owner/admin-restricted, read-only, no delete/update/
migration capability, no PII/URL/artwork exposure. A dev-only deployment checkpoint for that one
callable is prepared but not deployed.

82 tests passing, all builds/lint exit 0. Nothing migrated, backfilled, deployed, or deleted;
production untouched.

Artifacts:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-owner-sample-checkpoint-round-2.md`,
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-inventory-functions-deployment-checkpoint.md`.

**Active managed goal:** Goal #12 — paused at Human Checkpoint 1 (round 2), awaiting owner
approval of final dimensions/quality and the inventory-callable deployment.

## 2026-07-30 — Goal #12 "catalog-image-derivative-storage-consolidation" — Implement Human Checkpoint 1 complete, awaiting owner sample review

Built (no migration/backfill/deployment): a dry-run-only `inventoryCatalogImageStorage` callable
with a pure, 14-test classification function; 7 synthetic sample designs run through the real
production WebP-encode pipeline at 3 candidate sizes (512/640/800px @ Q82); additive `displayPath`
type preparation across Studio/Portal/generated-manifest (no design record populated). Real
Portal/Studio rendering-size measurement confirms no surface needs more than ~1152×896 px and no
DPR/retina handling exists anywhere. Recommendation: 640×640 @ Q82, no separate tiny thumbnail —
pending owner visual sample review. **This environment has no Google Application Default
Credentials**, so real `fresh-prints-dev` Storage/Firestore inventory totals could not be pulled;
disclosed explicitly, not worked around. 80 new + 32 regression tests passing; all builds/lint
exit 0. Nothing migrated, backfilled, deployed, or deleted; production untouched.

Checkpoint artifact:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-owner-sample-checkpoint.md`.

**Active managed goal:** Goal #12 — paused at Human Checkpoint 1, awaiting owner sample-review
approval before consumer migration, backfill, or deployment.

## 2026-07-30 — Goal #12 "catalog-image-derivative-storage-consolidation" — Plan + Formal Review complete

Started per owner instruction (Plan and Formal Review only; no implementation). Investigation
(direct source reading + a background research-agent audit) confirmed exact Storage architecture:
every catalog design normally has three permanent objects — `/originals/{id}.png` (staff-only,
production, never touched by any derivative work), `/thumbnails/{id}.webp` (320×320 @ Q80),
`/previews/{id}.webp` (1280×1280 @ Q85). Both derivatives are generated by the **identical**
shared-constants-driven sharp pipeline whether produced by Studio Electron import or by Cloud
Functions donation-promotion processing — no divergence to reconcile. Confirmed with exact
file/line citations that **every consumer without exception** already follows a
`thumbnailPath`-for-grids / `previewPath ?? thumbnailPath`-for-detail fallback pattern — the key
fact making an additive, fallback-safe migration low-risk, since a missing new field degrades
exactly like a missing `previewPath` already does today. Confirmed Show Queue export and gang-sheet
generation use `design.originalPath` exclusively (`useExportShowZip.ts:160`,
`useExportGangSheetPng.ts:139`), never a derivative. Confirmed customer-upload promotion **copies**
bytes into new catalog-canonical paths (not a live link), creating an already-policy-sanctioned
temporary duplication window during the existing 14-day cool-off purge (ADR-FP-086 §4). Confirmed
`purgeArchivedDesignAssets` deletes `originals`+`previews`, keeps `thumbnails` only (ADR-FP-084) —
a retention policy this Plan does not modify, with its future interaction with a new derivative
field explicitly flagged rather than silently assumed. Correctly distinguished ADR-FP-120 (the
generated catalog/Portal-catalog snapshot architecture — preserved, unaffected) from ADR-FP-121
(the abandoned print-request read-model — unrelated, not reintroduced).

Recommended architecture: one new, additive `/display/{designId}.webp` derivative (starting
dimension/quality hypothesis 640×640 @ Q82, explicitly flagged as a Human Checkpoint pending real
UI-measurement and visual sample review — not a final decision) to potentially replace both
`thumbnails` and `previews`. No separate tiny thumbnail by default, per the owner's own
instruction not to preserve one merely because it exists — pending Implement's own measured
evidence otherwise. A dry-run-only Storage inventory callable is designed (classifies every object
as referenced / orphaned candidate / purged-per-policy / promotion-cool-off duplicate); no deletion
capability is proposed at all in this phase. Staged, non-destructive migration: additive Firestore
field, dual-read fallback chains extended one level, bounded-concurrency backfill (reusing Goal
#9's `boundedConcurrencyQueue.ts` precedent), old objects never touched, deletion deferred to a
separate future goal requiring its own owner checkpoint.

Formal Review returned **approved_with_changes** — four binding required changes, all
incorporated directly into the Plan: (1) explicit "Interaction with Archive-Purge" section naming
that `displayPath` will be silently orphaned by `purgeArchivedDesignAssets` until a future goal
reconciles the two; (2) explicit commitment to extract the Storage inventory classification logic
as a pure, directly-testable function (mirroring this codebase's own repeatedly-proven extraction
pattern) rather than requiring a live emulator; (3) explicit statement that the Cache-Control gap
between new and not-yet-migrated derivative objects is an accepted transitional inconsistency, not
an oversight; (4) explicit per-question sequencing classification for all three Open Questions,
mirroring Goal #11's own binding-condition precedent. Review's independent re-verification found
every spot-checked citation accurate.

No implementation, migration, backfill, deletion, or deployment occurred.

Plan: `docs/workflow/plans/2026-07-30-catalog-image-derivative-storage-consolidation-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-review.md`
— **approved_with_changes**.

**Active managed goal:** Goal #12 — Plan + Formal Review complete; Implement next (awaiting owner
instruction to begin).
**Last closed:** `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup`
(Goal #11) — approved_with_notes, 2026-07-30.
**Not started:** Goal #13 (`production-release`, blocked until #9–#12 all sign off — #9, #10, #11
now closed; #12 active).

## 2026-07-30 — Goal #11 "customer-upload-oversized-pixel-normalization-and-processing-timeout-followup" — SIGNED OFF (approved_with_notes)

Owner QA returned **PASS WITH NOTES**: all functional behavior correct (oversized-canvas uploads
that previously failed with "Image dimensions exceed the allowed limits." now process
successfully; transparency/aspect ratio preserved; no crop/stretch/distort; DPI and print
dimensions truthful; Donate Design parity confirmed; normal uploads unaffected; 80 MB copy
displayed correctly); oversized-canvas uploads take proportionally longer at the trim stage than
smaller files (expected, given their much larger pixel counts and transparency workload) but
always complete — no stuck/timeout case was observed, confirming the watchdog fix's actual purpose
(bounded, always-completing processing) is working.

Deployed to `fresh-prints-dev`: `finalizeCustomerUpload`, `retryCustomerUploadProcessing` only
(Node.js 20 2nd Gen, us-central1), both "Successful update operation," exit 0,
2026-07-30T02:31:47Z UTC. No Storage/Firestore Rules, indexes, App Hosting, other Functions,
migration, or Storage object changes occurred at any point. Production untouched throughout.

Signoff: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-signoff.md`
— **approved_with_notes**.

**Active managed goal:** none (idle). **Last closed:**
`customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (Goal #11) —
approved_with_notes, 2026-07-30.
**Not started:** Goal #12 (`catalog-image-derivative-storage-consolidation`), Goal #13
(`production-release`, blocked until #9–#12 all sign off — #9, #10, #11 now closed).

## 2026-07-30 — Goal #11 "customer-upload-oversized-pixel-normalization-and-processing-timeout-followup" — Implement + Test + Implementation Review complete

All three binding Formal Review conditions satisfied: (1) stage watchdog extracted as a pure,
directly-testable helper (`packages/shared/src/utils/customerUploadFinalizeWatchdog.ts`, mirroring
`withTimeout.ts`'s precedent, 5 tests); (2) `wasNormalizedForDimensions`/`wasUpscaled` documented
and tested as independent, non-mutually-exclusive booleans; (3) `06-data-model-essentials.md`
resolved (one concern-level row added, matching that doc's existing high-level convention).

Processing order changed: bounded decode → trim → normalize-if-still-oversized
(`functions/src/lib/customerUploadProcessing.ts`). **Implement caught and fixed its own design
flaw**: an initial `limitInputPixels` bound set to the app-level 100M-pixel ceiling was empirically
proven (via a failing test on a 104M-px fixture) to reject the decode itself for any
oversized-but-trimmable canvas — defeating the fix. Corrected to sharp's own decoder default
(`0x3FFF * 0x3FFF` ≈ 268.4M px). `trimTransparentEdges` reduced from three full-resolution decodes
to one. New downscale-only `normalizeForDimensionCeiling` (strictest-of-three-ceilings-wins),
structurally separate from the existing upscale pass. New additive fields
(`wasNormalizedForDimensions`, `preNormalizationWidthPx`, `preNormalizationHeightPx`). Watchdog
wired into `finalizeCustomerUpload.ts`/`retryCustomerUploadProcessing.ts` at 480s (60s headroom
under the 540s `onCall` ceiling), writing `technicalFailureCode: "processing_timed_out"` (new,
retryable) before the platform can silently terminate the invocation. Sanitized per-stage timing
instrumentation added. 80 MB vs 100 MB: no enforced value changed; four stale handoff docs
corrected. ADR-FP-125 recorded (`docs/project/DECISIONS.md`, narrow ADR-FP-080 amendment).

**Tests:** 28 new/updated tests, all passing (`customerUploadProcessing.test.ts` 20,
`customerUploadFinalizeWatchdog.test.ts` 5 new, `retryCustomerUploadProcessing.test.ts` 3 new).
Goal #9 ZIP regression + byte-limit-alignment tests re-run unmodified, 12/12 pass. Functions build,
Portal typecheck/build, repo-wide lint all exit 0.

Independent Implementation Review: **approved_with_changes** — one required documentation-precision
change (name a deliberate `previousFailureCode`-vs-`retryAttempt`-counter substitution explicitly),
applied immediately, no code/test change required.

`finalizeCustomerUploadZip.ts`, `boundedConcurrencyQueue.ts`,
`finalizeCustomerUploadZipAggregation.ts` (Goal #9) and all Assisted Creation files (Goal #10)
confirmed untouched. `storage.rules` not modified. **Nothing deployed. Nothing migrated. No
Storage objects touched. Production untouched.** Functions requiring a future dev deployment:
`finalizeCustomerUpload`, `retryCustomerUploadProcessing` — separate owner checkpoint, not
performed in this pass.

Test Report: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-test-report.md`.
Implementation Review: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-implementation-review.md`
— **approved_with_changes** (required change applied).

**Active managed goal:** Goal #11 — Implement + Test + Implementation Review complete; Signoff
next. Deployment requires a separate owner checkpoint, not authorized by this pass.
**Last closed:** `assisted-creation-reference-image-mb-limit-increase` (Goal #10) — approved,
2026-07-29.
**Not started:** Goal #12 (`catalog-image-derivative-storage-consolidation`), Goal #13
(`production-release`, blocked until #9–#12 all sign off).

## 2026-07-30 — Goal #11 "customer-upload-oversized-pixel-normalization-and-processing-timeout-followup" — Plan + Formal Review complete

Started per owner instruction (Plan and Formal Review only; no implementation). A research pass
traced the full customer-upload/Donate Design trusted-server pipeline
(`functions/src/lib/customerUploadProcessing.ts`) and confirmed every reported symptom's exact root
cause from current source:

1. **Pixel-dimension rejection** — the check at `customerUploadProcessing.ts:404-410` evaluates raw
   source metadata (`sourceWidthPx * sourceHeightPx > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS =
   100,000,000`) **before** any trim attempt, so a large-canvas PNG with large transparent margins
   is rejected outright instead of being trimmed under the ceiling. Math confirms a 7–14 MB PNG can
   easily carry 100M+ pixels, fully explaining the owner's exact symptom.
2. **`"Trimming transparent edges…"` delay** — `trimTransparentEdges` performs two provably
   redundant full-resolution sharp decodes on top of the one genuinely necessary decode.
3. **Donate Design and Customer Uploads confirmed to share the exact same pipeline** — same
   callable, same processing function, same limits.
4. **80 MB vs. 100 MB** — confirmed pure documentation drift. The enforced byte limit (80 MB)
   already matches exactly across the shared constant, `storage.rules`, and Portal UI copy. "100 MB"
   appears only in four stale handoff files — likely a conflation with the 100,000,000-pixel total
   ceiling. No enforced value changes; only the docs need correction.

Recommended fix: bounded decode (`limitInputPixels`, confirmed already a working precedent in this
codebase) → trim → normalize only if still over the ceiling after trim. Original source always
preserved; normalized production derivative created only when technically required, reusing the
existing production Storage path. Recommended a narrow ADR-FP-080 amendment (drafted for Implement,
not recorded now). Goal #9's bounded-ZIP-concurrency work is confirmed untouched — inherits the fix
automatically since it calls the same shared processing function as an opaque per-image unit.

Formal Review returned **approved_with_changes** — three binding required changes for Implement: (1)
extract the stage watchdog as a pure, directly-testable function (this repository has no
live-callable integration-test harness); (2) treat `wasNormalizedForDimensions`/`wasUpscaled` as
independent, non-mutually-exclusive booleans; (3) resolve the data-model-doc update question
definitively during Implement's first step. Review independently confirmed `limitInputPixels` has a
real working precedent in this codebase and resolved all of the Plan's own open filename questions.

No implementation, deployment, or production action occurred.

Plan: `docs/workflow/plans/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-review.md`
— **approved_with_changes**.

**Active managed goal:** Goal #11 — Plan + Formal Review complete; Implement next.
**Last closed:** `assisted-creation-reference-image-mb-limit-increase` (Goal #10) — approved,
2026-07-29.
**Not started:** Goal #12 (`catalog-image-derivative-storage-consolidation`), Goal #13
(`production-release`, blocked until #9–#12 all sign off).

## 2026-07-29 — Goal #10 "Increase the MB limit for custom-request reference images" signed off approved

The 40 MB per-file limit (owner-selected), 8-file maximum (unchanged), and 320 MB combined
pre-upload ceiling are all live in `fresh-prints-dev`. The first owner QA pass returned **FAIL**: a
reference image between 15 MB and 40 MB was accepted by the Portal picker but rejected at Submit
with the stale message "Each reference image must be 15 MB or smaller." Root-cause investigation
confirmed this was a **Cloud Functions deployment gap, not a source-code defect** —
`submitAssistedCreationRequest`/`customerUpdateAssistedCreationRequest` had never been redeployed
after the source change (only Storage Rules had been deployed for this goal), so the live callables
were still running pre-Goal-#10 compiled code.

**Amendment 1** added targeted regression tests (9 new cases proving the exact 15–40 MB boundary and
that error messages never mention "15 MB") and confirmed, via a Formal Review binding condition, that
a scoped Functions redeploy would carry only this goal's change — no unrelated in-flight Functions
work. Owner approved; deployed exactly:
```
firebase use fresh-prints-dev
firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest
```
Both functions reported "Successful update operation," exit 0, 2026-07-30T00:23:55Z. No Storage
Rules, other Functions, Firestore Rules, indexes, or App Hosting were touched; no other project was
referenced.

The reduced 5-step owner re-QA (attach a 15–40 MB file, Submit/Save, confirm success, confirm the
reference appears, confirm an over-40 MB file is still rejected with 40 MB copy) returned **PASS**.

**Goal #10 signed off: approved.** Signoff:
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-signoff.md`.
Full history preserved — original Plan (amended in place), Formal Review, Test Report,
Implementation Review, ADR-FP-124, Storage Rules deployment checkpoint, Amendment 1, Amendment 1
Formal Review, Amendment 1 Implementation Review, scoped Functions deployment checkpoint, owner QA
checkpoint (FAIL then PASS), final Signoff.

No migration, Storage cleanup, or production action occurred at any point in this goal. Production
untouched throughout.

**Queue reconciliation (documentation-only, no implementation started):** per explicit owner
instruction, a new goal —
`customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` — was added to the
pre-production queue as **Goal #11** (next queued, not started, no Plan yet). This pushes
`catalog-image-derivative-storage-consolidation` to **Goal #12** and `production-release` to **Goal
#13** (blocked until #9–#12 all sign off). Scope summary for the future Plan: pixel-dimension
rejection investigation in Customer Uploads/Donate Design, proportional normalized production
derivatives preserving transparency/aspect ratio (no crop/stretch/distort), the 200-effective-DPI
save floor (ADR-FP-075) preserved, `Trimming transparent edges...` timeout investigation with
bounded timeout/idempotent retry, the 80 MB vs. 100 MB limit discrepancy, and the narrow ADR-FP-080
technical-safety downscaling exception (investigate, do not change the ADR in this documentation
pass).

**Active managed goal:** none (idle).
**Last closed:** `assisted-creation-reference-image-mb-limit-increase` (Goal #10) — approved,
2026-07-29.
**Next queued:** Goal #11,
`customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (not started).
**Not started:** Goal #12 (`catalog-image-derivative-storage-consolidation`), Goal #13
(`production-release`, blocked until #9–#12 all sign off).

## 2026-07-29 — Goal #10 "Increase the MB limit for custom-request reference images" — dev Storage Rules deployed; awaiting owner QA before Signoff

A read-only deployment-scope audit investigated the ~22 unrelated lines present in the current
`storage.rules` diff (`generated/catalog-reference/ai|manifest.json|client`,
`generated/portal-catalog/{allPaths=**}`). Confirmed via repository evidence — the 2026-07-27 Wave C
Storage Rules deploy log (`.cursor/workflow/state.md`), the signed-off Wave C record, and the Wave C
dev-deployment checkpoint's live publication verification — that this content is already-deployed,
already-live `fresh-prints-dev` Storage Rules belonging to the completed and signed-off
`firestore-usage-efficiency-wave-c` generated-catalog architecture (ADR-FP-120), explicitly distinct
from the abandoned private print-request read-model paths (`generated/studio-print-requests`,
`generated/portal-print-requests`, confirmed absent from the current file). **Verdict A**: safe to
deploy the current file as-is.

Owner approved. Pre-deployment re-verification confirmed the file was unchanged since the audit,
active project was `fresh-prints-dev`, the Rules-to-constant alignment test passed 5/5, and all
Assisted Creation ownership/path rules plus the unrelated 25 MB proof rule were unchanged. Deployed:

```
firebase use fresh-prints-dev   -> exit 0
firebase deploy --only storage  -> exit 0, "released rules storage.rules to firebase.storage"
```

Timestamp: 2026-07-29T22:22:31Z. Local `storage.rules` SHA-256 identical before and after deployment
(`e11cb3bf1cf316bd9ba77765f8a112b355ced2d7aef4e5a4b9ae4fb400c3c730`), confirming the deployed content
exactly matches what was reviewed. Only Storage Rules were deployed — no Functions, Firestore Rules,
indexes, App Hosting, CORS, or production resource; no project other than `fresh-prints-dev` was
referenced.

**Effective state in `fresh-prints-dev`:** Assisted Creation reference-image per-file limit is now
live at 40 MB (inclusive `<=`, matching the TS validators exactly), 8-file maximum unchanged,
generated-catalog rules unchanged (harmlessly republished), abandoned print-request rules remain
absent. The 320 MB combined ceiling remains application-layer-only (Portal client + trusted-server
parsers) — Storage Rules cannot enforce a cross-object sum.

No migration, Storage cleanup, Function deploy, Firestore Rules/indexes deploy, App Hosting deploy,
or production action occurred. Goal #11 and Goal #12 remain unstarted. Signoff has **not** occurred —
a focused owner QA checkpoint covering the deployed environment is required first.

Deployment checkpoint (full evidence):
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md`.

**Active managed goal:** Goal #10 — dev Storage Rules deployed; **stopped for owner QA of the
deployed environment**, then Signoff.
**Last closed:** `customer-upload-oversized-image-normalization-and-processing-performance`
(Workstream A / Goal #9) — approved, 2026-07-29.
**Not started:** Goal #11 (`catalog-image-derivative-storage-consolidation`), Goal #12
(`production-release`, blocked until #9–#11 all sign off).

## 2026-07-29 — Goal #10 "Increase the MB limit for custom-request reference images" — Implement + Test complete, awaiting dev deployment approval

Owner selected **40 MB per file** (Option 3), left the **8-file count unchanged**, and specified a
**320 MB combined pre-upload ceiling** (= 8 × 40 MB exactly). Implemented per the approved
Plan/Review.

All four per-file enforcement layers updated to 40 MB: Portal client validation (new pure
`assistedCreationReferenceFilesValidation.ts`), submit-path and update-path trusted-server parsers
(shared `assertReferenceImageTotalWithinCeiling` helper), and `storage.rules`. While implementing,
found and fixed a genuine pre-existing boundary bug: `storage.rules` used exclusive `<` (rejecting a
file exactly at the old limit) while the TS validators used inclusive semantics — corrected to `<=`
so "exactly at the limit is accepted" holds at every layer, as required.

New 320 MB combined ceiling enforced client-side, before any upload begins, in both the submit and
update paths — verified by tracing the actual code path (not just a passing test) that zero uploads
occur on an over-ceiling selection, and that removed/replaced kept-reference bytes are correctly
excluded, never double-counted.

Both Formal Review binding requirements closed: (1) new `storageRulesAlignment.test.ts` test parses
the real `storage.rules` arithmetic and asserts numeric equality against the live constant — fails if
either drifts independently; (2) total-ceiling check is client-side-first, server-side as
defense-in-depth only.

Also consolidated a duplicated `withTimeout` helper (Portal + Studio) into a new shared
`packages/shared/src/utils/withTimeout.ts` — pure no-op refactor, done to make "preview fallback
remains timeout-bounded regardless of payload size" directly testable. 12-second bound unchanged.

No customer-upload, Goal #9, or catalog-derivative code touched. No new dependency. New ADR-FP-124
records the full decision.

Verification: repository lint, Functions build, Portal typecheck/build, Studio build, changed-file
lint, `git diff --check` all exit `0`; 44/44 focused tests pass. Independent Implementation Review:
**APPROVED**, no residual defects.

**Deployment checkpoint prepared, not executed** — `storage.rules` changed (one function, one line),
requires owner approval before deploying to `fresh-prints-dev`. The checkpoint also flags that the
current uncommitted `storage.rules` file carries ~22 unrelated lines from other in-flight goals
(`generated/catalog-reference`/`generated/portal-catalog` blocks) that would deploy alongside this
change since `firebase deploy --only storage` publishes the whole file — recommend the owner confirm
those are also intended for `fresh-prints-dev` before approving this deploy.

No deployment, migration, Storage cleanup, or production action occurred. Goals #11 and #12 remain
unstarted. Post-deployment owner QA is still required before Signoff.

Plan: `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md`.
Test report: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-test-report.md`.
Implementation Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-implementation-review.md`
— **APPROVED**.
Deployment checkpoint: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md`
— awaiting owner approval.

**Active managed goal:** Goal #10 — Implement + Test complete; **stopped for owner approval of a
dev-only Storage Rules deployment**, then post-deployment QA, then Signoff.
**Last closed:** `customer-upload-oversized-image-normalization-and-processing-performance`
(Workstream A / Goal #9) — approved, 2026-07-29.
**Not started:** Goal #11 (`catalog-image-derivative-storage-consolidation`), Goal #12
(`production-release`, blocked until #9–#11 all sign off).

## 2026-07-29 — Goal #10 "Increase the MB limit for custom-request reference images" — Plan + Formal Review complete, awaiting owner decision

Started per owner instruction (Plan + Formal Review only; no implementation, no limit change, no
deployment). Re-verified every fact carried over from Goal #9's Workstream B section — all matched
current source exactly. Investigation went deeper than Goal #9's outline: found a fourth manual-sync
enforcement location for the 15 MB constant (client, submit-path parser, update-path parser, Storage
Rules), confirmed reference images have **no thumbnail/preview derivative** (every preview fetches
the full original), and located the exact prior "Studio ref-thumb hang hotfix" decision record
(`docs/project/DECISIONS.md:525-550`, 2026-07-21) proving the historical preview-hang bug was a
network/CORS timing issue independent of file size — with a **live 25 MB precedent**
(`ASSISTED_CREATION_MAX_PROOF_BYTES`, staff proof uploads) already running successfully through the
identical download architecture today.

No total-request byte ceiling exists at any layer currently (only an implicit 8×15MB=120MB worst
case). Cloud Function memory/timeout is confirmed irrelevant — reference-image bytes never transit a
callable body.

Presented three evidence-graded options, no value selected: **Option 1 (20 MB, conservative)**,
**Option 2 (25 MB, recommended — reuses the already-live proof-upload ceiling through the identical
architecture)**, **Option 3 (40 MB, highest reasonably safe — explicitly flagged as projected, not
observed)**. Each paired with a recommended total-request ceiling.

Formal Review: **approved_with_changes** — two binding required changes for a future Implement phase:
(1) the Storage-Rules-literal-matches-shared-constant check must be a mandatory automated test, since
this manual-sync risk has now surfaced unresolved across two consecutive goals; (2) any total-request
ceiling must be a client-side pre-upload check, not server-only (to avoid worsening the existing
"no cleanup for orphaned pending uploads" gap).

No implementation, deployment, limit change, or production action occurred.

Plan: `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md`
— **approved_with_changes**.

**Active managed goal:** Goal #10 — **stopped for an explicit owner MB-limit decision** (Option 1 =
20 MB, Option 2 = 25 MB recommended, Option 3 = 40 MB, or an alternative value with rationale) before
Implement can begin.
**Last closed:** `customer-upload-oversized-image-normalization-and-processing-performance`
(Workstream A / Goal #9) — approved, 2026-07-29.
**Not started:** Goal #11 (`catalog-image-derivative-storage-consolidation`), Goal #12
(`production-release`, blocked until #9–#11 all sign off).

## 2026-07-29 — `customer-upload-oversized-image-normalization-and-processing-performance` signed off approved (Workstream A)

Owner started goal #9 with an explicit queue update: two previously-unscoped items (a custom-request
reference-image MB-limit increase; `catalog-image-derivative-storage-consolidation`) are now Goal
Order #10 and #11, sequenced before `production-release` (#12, blocked until all three image-related
goals sign off). Plan + Formal Review (`approved_with_changes`) completed a research pass tracing all
three workstreams; this session implemented **Workstream A only**.

Root cause: `functions/src/finalizeCustomerUploadZip.ts` processed every image in a ZIP
**sequentially** (up to 100 images, each up to 100 megapixels, inside one 540s/2GiB `onCall`).
Replaced with bounded concurrency of 3 (`CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY`),
aggregating batch counters deterministically after every task settles rather than mutating shared
state from concurrent callbacks.

All three Formal Review binding requirements satisfied: (1) new pure
`aggregateZipProcessingResults` function computes `readyCount`/`failedCount`/`fileResults` only after
settlement; (2) evaluated the existing Studio `DerivativeConcurrencyQueue` pattern first — confirmed
it cannot be imported directly into Functions (`functions/tsconfig.json` excludes
`apps/studio/electron`), so its semaphore mechanism was relocated (not forked) to a new
`packages/shared/src/utils/boundedConcurrencyQueue.ts`, shared by both apps; (3) new ADR-FP-123 shows
full worst-case memory arithmetic (100M-pixel decode ≈381.5 MiB, 2GiB function memory, 461.5 MiB
per-image peak, concurrency-3 budget with a documented 25.1% safety margin, concurrency-4 correctly
rejected at ~0.1% margin), with proven constants, derived arithmetic, and runtime-validation-required
assumptions explicitly separated.

`processCustomerUploadImageBytes` (the actual image-processing logic) was not modified; its existing
8-test suite passes unmodified, proving no processing-logic drift. No accepted format, limit,
transparency rule, upscale policy, or the 200-DPI save floor changed. No Storage Rules, dependency,
schema, or Function memory/timeout configuration changed — no Human Checkpoint was triggered.

Functions build, repository lint, changed-file lint, and `git diff --check` all exit `0`; 31/31
focused tests pass. Independent Implementation Review against the real final diff: **APPROVED**, no
residual defects.

Test report:
`docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-test-report.md`.
Implementation Review:
`docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-implementation-review.md`
— **APPROVED**.
Signoff:
`docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-signoff.md`
— **approved**. `docs/project/ROADMAP.md` goal #9 marked Done (Workstream A).

**Active managed goal:** none (idle).
**Last closed:** `customer-upload-oversized-image-normalization-and-processing-performance`
(Workstream A) — approved, owner QA not required, 2026-07-29.
**Next queued:** Goal #10, "Increase the MB limit for custom-request reference images" (not started;
requires an owner MB-limit decision — no target value recorded anywhere in the repository yet).
Goal #11 (`catalog-image-derivative-storage-consolidation`) and Goal #12 (`production-release`,
blocked until #9–#11 all sign off) remain queued after that.
**Explicitly confirmed:** no deployment, migration, or Storage cleanup occurred; production was
untouched.

## 2026-07-29 — `preproduction-static-analysis-cleanup` signed off approved

Resumed after the prior Codex session's credits expired mid-Implement. Re-verified everything from
the actual source rather than trusting prior claims: `npm run build:studio` and `npm run lint` both
already reproduced clean (exit `0`/`0`) before any new edit, confirming Codex had already resolved
all 29 Studio/shared TypeScript diagnostics and all 41 lint findings (31 errors, 10 warnings) —
including the Formal Review's three binding conditions: a bounded Show Queue read spanning
Working/Queued/Printing tabs (`useShowQueuePrintRequests`), a shared lazy `sharp` loader
(`createRequire`-based, not a static import), and stable-ref/destructure fixes for all 10 React hook
dependency warnings.

This session found and closed two verification gaps: (1) added
`functions/src/lib/lazySharpDeployDiscovery.test.ts` to prove — against the **compiled** Functions
output, matching real deploy discovery — that `sharp` stays unloaded until `getSharp()` is first
called, with instance-reuse on subsequent calls; (2) corrected two stale assertion regexes in
`assistedCreationAnswerDisplay.test.ts` that still targeted a *removed* enum literal's semantics
after the fixture itself had already been updated to a current valid value.

Full verification matrix — Portal typecheck/build, Functions build, `git diff --check`,
changed-file lint, and 101/101 focused behavior tests — all exit `0`. An independent Implementation
Review against the real final diff returned **APPROVED**, confirming no blanket suppression, unsafe
cast, or scope drift; the only two `eslint-disable` additions found in the full diff belong to
unrelated in-flight goals and were correctly left untouched. No manual owner QA checkpoint is
required — every behavior-sensitive hook warning had deterministic automated coverage. No
deployment, Rules, schema, dependency, or production action occurred.

Signoff created 2026-07-29:
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-signoff.md` — **approved**.
Test report:
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-test-report.md`.
Implementation Review:
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-implementation-review.md`.
`docs/project/ROADMAP.md` goal #8 marked Done.

**Active managed goal:** none (idle).
**Last closed:** `preproduction-static-analysis-cleanup` — approved, owner QA not required,
2026-07-29.
**Next queued:** `customer-upload-oversized-image-normalization-and-processing-performance` (not
started). Wave C (`firestore-usage-efficiency-wave-c`) remains independently **Done**
(2026-07-27, PASS WITH NOTES, owner PASS) per `ROADMAP.md` — unaffected by this goal.
**Not yet in any queue record — needs explicit scoping before scheduling:** a custom-request
reference-image MB-limit increase, and `catalog-image-derivative-storage-consolidation`. Neither
appears in `ROADMAP.md`, `.cursor/workflow/state.md`'s Goal Order, or any Plan/Review as of this
date.

## 2026-07-29 — `studio-test-data-print-limit-wipe-audit` signed off approved

Owner QA returned **PASS**. Studio Test Data Reset now calls the retired Cap A collection
**Legacy print-limit counters** and states that it is no longer written or enforced. The stable
`printRequestDesignDailyLimits` target, exact standalone delete scope, Print Requests/Select
all/All (-) Designs inclusion, and owner/dev-only safety gates are unchanged. No wipe was submitted,
no deployment was required, and production was untouched.

Final signoff:
`docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-signoff.md`.

**Active managed goal:** none (idle).
**Last closed:** `studio-test-data-print-limit-wipe-audit` — approved, owner PASS 2026-07-29.
**Next queued:** `preproduction-static-analysis-cleanup` — confirmed, not started.

## 2026-07-29 — `portal-print-request-prelaunch-stability` signed off approved

Owner QA v18 returned **PASS**. Start, Pause, Resume, and Finish work; no
`request_write (permission-denied)` error or Retry warning/button appears; Portal remains Printed;
navigation preserves the completed state; and Studio locks and places the request as completed.

Final signoff:
`docs/workflow/reviews/2026-07-29-portal-print-request-prelaunch-stability-signoff.md`.
The Amendment 16 dev Rules deployment record is preserved with unavailable command/output/ruleset
metadata marked `[NEEDS OWNER CONFIRMATION]`; Codex did not redeploy. Production was untouched.

**Active managed goal:** none (idle).
**Last closed:** `portal-print-request-prelaunch-stability` — approved, owner PASS 2026-07-29.
**Next queued:** `studio-test-data-print-limit-wipe-audit` — confirmed, not started.

## 2026-07-29 — Owner completed Amendment 16 dev Rules deployment; QA v18 reopened

Owner reports the Firestore Rules deployment to `fresh-prints-dev` is already complete and directed
Codex not to deploy again. No deploy command was run by Codex. The read-only deployed/local Rules
comparison exited `2` because local Application Default Credentials are unavailable, so the active
ruleset ID and hash match remain `[NEEDS OWNER CONFIRMATION]`. Local Rules verification remains
48/48 passing. QA checkpoint v18 is now open.

Next: reduced owner QA v18 only. Do not redeploy, sign off, start queued goals, or touch production.

## 2026-07-29 — Amendment 16 Review 18 approved; dev Rules deployment approval required

Implementation Review 18 final verdict is `APPROVED_WITH_CHANGES`, with all requested test coverage
resolved and no blocking findings remaining. Rules pass 48/48; focused tests pass 61/61; affected
regression passes 143/143. Because the correction changes `firestore.rules`, owner QA v18 is blocked
until the owner replies `APPROVE DEV RULES DEPLOY`, authorizing only:

`firebase deploy --only firestore:rules --project fresh-prints-dev`

No deployment or production action has occurred. After the approved release is verified, fully
restart Studio and run QA checkpoint v18.

## 2026-07-29 — Amendment 16 implemented; Implementation Review 18 next

The emulator mechanically proved `queueTab` and `showQueueBiddingAcknowledgment` independently
caused the exact request-completion patch to fail the whole-document Rules allowlist. The narrow
correction validates both current optional fields, keeps them client-immutable, and routes only
`active|editing -> completed` through an exact completion predicate. A production-used builder
proves the client patch stays `status|updatedBy|updatedAt`; diagnostics now classify the current
fields without values. Rules pass 48/48, focused tests 61/61, and the full affected suite 143/143.
No deployment or production action occurred.

Next: independent Implementation Review 18. If approved, request only
`APPROVE DEV RULES DEPLOY`.

## 2026-07-29 — Amendment 16 Formal Review approved; emulator blocked on missing Java

Formal Review verdict is `APPROVED_WITH_CHANGES`. It identified two current persisted fields omitted
from the full-document Rules schema and diagnostics: `queueTab` and
`showQueueBiddingAcknowledgment`. The required four-way failing-before emulator fixture is written.
Execution stopped before Firestore started because no Java executable exists on PATH or in common
installed/bundled locations (`spawn java ENOENT`). Rules must not be edited until that fixture
mechanically proves the omission.

Next: install/provide a compatible JDK, rerun the failing-before matrix, then continue Amendment 16.
No Rules, deployment, production, migration, or queued-goal action occurred.

## 2026-07-29 — Owner QA v17 FAIL: confirmed request-write permission denial; Amendment 16 in Formal Review

Amendment 15 worked: Retry acquires, visibly runs, and reaches the exact reconciliation write.
Owner QA v17 now proves the remaining failure is `request_write (permission-denied)`. Plan Section
34 / Amendment 16 is limited to that three-field completion update and its Firestore Rules
contract. Current source shows the whole post-merge request is validated by an exact field
allowlist that omits current persisted `queueTab`, despite active queueTab backfill/maintenance
Functions and Studio query architecture. This remains a hypothesis until the approved
failing-before A/B emulator fixture mechanically reproduces it.

Next: independent Amendment 16 Formal Review. No Rules/application implementation or deployment
before approval; queued goals and production remain untouched.

## 2026-07-29 — Amendment 15 APPROVED; owner QA v17 required

The final owner-authorized retry-session correction is implemented and Implementation Review 17's
final verdict is `APPROVED`. React Strict Mode's development effect probe had permanently disposed
the ref-backed retry session, causing the exact live `sessionAcquired=false` result. The session is
now Strict-safe, uses explicit/token-authoritative phases, and exposes one shared Retry capability.
The hook delegates explicit Retry to a production-used controller that acquires synchronously,
invokes the exact-ID service once, rejects duplicates, discards stale settlements, and releases in
`finally`; active Retry remains visible as disabled `Retrying…`. Sanitized release transitions are
retained. Focused tests pass 36/36 and the full affected suite passes 140/140. No Function, Rules,
deployment, migration, or production action occurred.

Next: fully restart Studio and run
`docs/workflow/reviews/2026-07-29-portal-print-request-prelaunch-stability-qa-checkpoint-v17.md`.
Do not sign off or begin queued goals until the owner returns `PASS`, `PASS WITH NOTES`, or `FAIL`.

## 2026-07-29 — Amendment 15 Strict Mode Retry-session correction; review 17 next

Owner reopened one final narrow correction after QA v16 proved the Retry click reached the handler
but session acquisition failed. Root cause is React Strict Mode permanently disposing the ref-backed
session during its development effect probe. Amendment 15 adds Strict-safe activation, explicit
phases, atomic verified Retry availability, shared render/acquisition authority, finalizing UI, and
exact sanitized rejection reasons. 101/101 regressions pass; Portal passes; Studio/lint baselines
unchanged. No deployment or production action.

Next: independent Implementation Review 17, then minimal owner QA only if approved.

## 2026-07-29 — Amendment 14 final attempt APPROVED; owner QA v16 required

Owner QA v15 failed only the immediate false post-Finish Retry warning. Amendment 14 is the owner's
final authorized engineering attempt. It replaces Amendment 13's repeated default-source recheck
with one exact-candidate server-only request/item/allocation verification. Candidate scope is
retryable failures plus the exact production pending-timestamp mapper shape (`allocation_read`, only
`updatedAt` missing); committed genuine remediation remains non-retryable. Implementation Review 16
final verdict: `APPROVED`. 100/100 regression tests pass; changed-file lint is clean; known baselines
remain. No Function, Rules, deployment, or production action.

Next: fully restart Studio and run owner QA v16. Never create another amendment unless explicitly
requested; do not sign off or start queued goals before final `PASS`/`PASS WITH NOTES`/`FAIL`.

## 2026-07-29 — Amendment 13: false-positive post-Finish Retry warning fixed (serverTimestamp() read-your-own-write race); Implementation Review 15 APPROVED

Owner QA v14 (post-Amendment 12) returned `FAIL` on Test 1 only; Test 2 (historical capacity
messaging) and Test 3 (regression smoke) both `PASS`. Amendment 13 (Plan Section 31) resolves the
remaining item:

- **The immediate post-Finish "N request update(s) need retry" warning could be a false positive** —
  traced to a `serverTimestamp()` read-your-own-write race: `markShowPrintingFinished` commits a batch
  setting `updatedAt: serverTimestamp()` on finished allocations, then immediately re-reads those same
  allocations to decide whether affected print requests are now fully printed. A `serverTimestamp()`
  sentinel is not guaranteed resolved in the very next standalone read from the same client, so the
  read could transiently fail on a just-written allocation and exclude it from the printed-quantity
  sum for that one read - producing a false "needs retry" warning with no genuine Firebase error, for
  a request that was already fully printed. This is exactly why the warning correctly disappeared on
  navigation once enough time had passed (Amendment 12's reconstruction effect performs the same
  bounded check again, later, after the sentinel has settled). The separate "excluded invalid
  production record" console warning was confirmed to be the same race manifesting through the live
  allocations subscription's own read path, not an unrelated defect - it self-heals automatically and
  needed no separate fix.
- Fixed with a single bounded re-check limited to exactly the first pass's failed IDs (never
  remediation IDs, never an unbounded rescan), reusing the existing, already-proven
  `markPrintRequestCompletedIfFullyPrinted` function. A genuinely still-unresolved request fails the
  re-check identically and is reported exactly as before, with a working Retry button.

Independent Formal Review approved the fix's logic and safety and required its tests to be added
before signoff. Independent **Implementation Review 15** (did not defer to the Formal Review or the
implementer's narrative; independently re-verified the fix and new tests against current source and
executed the full verification matrix directly): **`APPROVED`, no notes**. 87/87 directly-relevant
tests pass; Portal typecheck/build exit 0; Studio build and repository lint match their unchanged
pre-existing baselines exactly; nothing from Amendment 12 regressed. The implementation remains
client-only. No Function/Rules change or deployment occurred.

## 2026-07-28 — Amendment 12: reconciliation Retry persistence fix, historical capacity-banner suppression; Implementation Review 14 APPROVED

Owner QA v13 (post-Amendment 11) returned `FAIL` on two items — one blocking, one display-only per
the owner's own annotation. Amendment 12 (Plan Section 30) resolves both:

1. **The Retry control still appeared inert, and its warning disappeared on navigation** — traced to
   two compounding root causes in `useShowProductionTimer.ts`: (a) a silent early-return producing
   zero observable effect when there was nothing retryable at click time, and (b) all retry/warning
   state being pure ephemeral React state, unconditionally blanked on every show-id change (including
   navigation away and back) with no reconstruction from Firestore. Fixed with a bounded, show-scoped
   reconstruction effect (this show's own allocations only, never an unbounded scan) routed through the
   existing retry-session authority for mutual exclusion with a live retry click, a new dev-only
   click-trace log firing on every activation attempt (including the no-op path), and a three-state
   Retry UI contract (retryable / remediation-only / none) wired directly into the rendered page.
2. **Historical/completed shows could still show the capacity-exhausted banner** — traced to Portal's
   allocatable-shows list being served from a 60-second session cache that could report a show as
   still allocatable for a window after it had genuinely become historical server-side. Fixed with a
   freshness gate that defers any capacity decision (the banner, the ability to submit) until the
   current modal-open's own reload has confirmed the cache at least once — a genuinely open,
   capacity-exhausted show is unaffected; its banner still renders, only slightly deferred.

Independent Formal Review found the first-draft historical-banner fix was a no-op against its own
identified root cause (it triggered on the wrong branch) and required a corrected design before
implementation, which was then approved. Independent **Implementation Review 14** (did not defer to
the Formal Review or the implementer's narrative; independently re-verified both workstreams against
current source and executed the full verification matrix directly): found the new three-state Retry
UI value was computed but not actually wired into the page's render (corrected before sign-off), then
**`APPROVED`**. 77/77 directly-relevant tests pass; Portal typecheck/build exit 0; Studio build and
repository lint match their unchanged pre-existing baselines exactly; nothing from Amendment 11
regressed. The implementation remains client-only. No Function/Rules change or deployment occurred.

## 2026-07-28 — Amendment 11: write-requirement audit, show-selection-loss fix, historical inspection/copy corrections; Implementation Review 13 APPROVED

Owner QA v12 (post-Amendment 10) returned `FAIL` on three items. Amendment 11 (Plan Section 29)
resolves all three:

1. **"Why is this write needed?"** — answered from an exhaustive repository-wide audit: the
   `printRequests.status = "completed"` write is genuinely load-bearing (Studio's add-to-show picker
   exclusion, the print-request detail edit-lock, the persisted `queueTab` field Studio's list
   actually queries by, and Function-level delete/archive/upload-purge eligibility). It is retained,
   not removed. The diagnostic run before this write now additionally checks the exact cross-field
   customer/guest-assignment invariant Firestore Rules enforce (read-only; no Rules or behavior
   change), so the next live retry attempt can prove or rule out that specific cause instead of
   requiring another diagnostic round.
2. **The Retry button appeared inert** — root cause found: not a click-handler defect. After Finish,
   if the just-finished show's scheduled time passed "now" during the post-Finish refresh, the page
   would silently reclassify it out of the active schedule tab and swap the owner's selection to a
   different show, wiping the just-set retry warning/button in the same instant, with no click
   involved. Fixed: the page now follows the just-acted-upon show to wherever it now belongs instead
   of abandoning the selection.
3. **Historical show inspection** — a date with exactly one already-finished show now shows its
   details immediately (no second click; multiple shows on one date are never guessed among). The
   customer-facing copy no longer says "read-only" anywhere and instead reads "This show has already
   been printed, so no new print requests can be added." with a supporting sentence. The misleading
   "N spots remaining" line is now suppressed for shows that can no longer accept requests, while the
   used-count line remains for reference; open shows are unaffected.

Independent Formal Review of the amendment (`approved_with_changes`, one clarification resolved
directly in the Plan) preceded implementation. Independent **Implementation Review 13** (did not
defer to the Formal Review's approval, independently re-verified all three workstreams against
current source and executed the full verification matrix directly): **`APPROVED`**. 218/218 tests
pass (80 new/changed + 138 full-goal regression); Portal typecheck/build exit 0; Studio build and
repository lint match their unchanged pre-existing baselines exactly; nothing from Amendment 10
regressed. The implementation remains client-only. No Function/Rules change or deployment occurred.

## 2026-07-28 — Amendment 10 corrected after Implementation Review 11 REJECTED; Implementation Review 12 APPROVED

Independent Implementation Review 11 rejected Amendment 10's implementation with four blocking
findings: (1) the retry lifecycle had no synchronous session/generation authority, so a pending retry
could settle after the show changed or a new timer action started and write its stale result into the
wrong context, and rapid duplicate activation could reach the service twice; (2) a remediation-only
result was unconditionally reported as retry `succeeded`, contradicting the approved structured-outcome
contract (success requires zero failed **and** zero remediation); (3) the required composed behavior
tests (driving the actual production hook/controller/component, not just isolated pure helpers) were
absent for both the retry lifecycle and historical-show inspection; (4) the legacy `isSelectable`
capability was found still referenced (a stale test file; production code was already clean).

**All four findings are now corrected.** A new synchronous, ref-backed retry-session controller
(`ShowProductionRetrySession`) is the sole authority deciding whether a retry can start and whether
its settlement is still valid — a stale retry can no longer write into the wrong show or duplicate its
service call. The structured retry-outcome resolver now atomically determines status, exact
unresolved/remediation IDs, message, and retry eligibility, and the hook derives all retry UI state
from it exclusively — a remediation-only result can never report success. New composed tests drive
the real production controllers/functions through the full required behavior matrix (pending state,
duplicate-activation exclusion, stale-settlement discarding after show-switch/new-action/unmount,
complete success, partial failure, remediation-only, rejected calls, and historical-show pointer/
keyboard inspection with both submit-path defenses). The last `isSelectable` reference was corrected.

Independent **Implementation Review 12** (did not defer to Review 11's prescriptions, independently
re-verified all four findings against current source and by executing every test/build/lint command
directly): **`APPROVED`**. 44/44 focused tests and 103/103 full-regression tests pass; Portal
typecheck/build exit 0; Studio build and repository lint match their unchanged pre-existing baselines
exactly, with zero new findings in any touched file.

The real live request-completion write denial cause is still not claimed — that still requires one
live owner retry reproduction with the sanitized diagnostic manifest. Reduced owner QA checkpoint (v12)
prepared. The implementation remains client-only; no Function or Rules deployment occurred. Neither
queued goal (`studio-test-data-print-limit-wipe-audit`, `preproduction-static-analysis-cleanup`) was
started.

## 2026-07-28 — Amendment 9 QA failed; Amendment 10 awaiting Formal Review

Plan Section 27 / Amendment 9 is implemented. Finish reconciliation now reports exact
request/item/allocation/write phases, treats malformed allocations as remediation rather than
silently omitting them, avoids a post-write read, and retains only exact failed request IDs for
idempotent retry. The mounted Portal rail shares a monotonic request-scoped authority with the live
show state. The existing lower-bounded historical query now retains just-finished terminal shows;
Show Picker renders them as disabled inspection rows and clears allocation destination state.

Initial Implementation Review 10 returned `BLOCKED`. All findings are remediated: remediation IDs
are non-retryable and separately surfaced; the manifest now includes parser/field/status/write/code/
commitment/retry facts; the unproven Rules branch is reverted; the mounted terminal watermark owns
poll enablement; and composed progress, stale-result, cleanup, historical clearing/default, and
activation boundaries are included in the focused suite. A first re-review isolated mapper-
diagnostic loss; request and allocation failures now preserve exact missing/wrong-typed and
legacy-extra field names without values. The complete suite passes 55/55 (1,437 ms measured).

Implementation Review 10's authoritative final verdict is `APPROVED`. Portal typecheck, Functions
build, scoped lint, and diff check pass. Studio typecheck retains only unrelated baseline failures.
No new Rules change and no deployment occurred.

The owner reported completing:
`firebase deploy --only functions:listPortalAllocatableShows --project fresh-prints-dev`.
Read-only metadata verifies the Gen 2 Function is `ACTIVE`, updated
`2026-07-28T16:32:40.92569Z`, serving latest revision
`listportalallocatableshows-00018-fuj`, with 100% traffic assigned to latest. Exact CLI exit code and
success message remain `[NEEDS OWNER CONFIRMATION]`. This recording pass did not redeploy anything.
No Amendment 9 Rules deployment is required.

Owner QA passes mounted progress, Start/Pause/Resume/visible Finish, personal usage, exact-25,
historical visibility, and smoke. It fails because one request completion update remains unresolved
and the Retry control exposes no understandable pending/result lifecycle. Malformed/incomplete
warnings persist. Owner superseded fully disabled historical slots: they must be inspectable through
pointer/keyboard while never becoming allocation destinations.

Plan Section 28 / Amendment 10 is implemented and tested. Retry now has visible pending/result
states and a sanitized structured live manifest; selected invalid allocations block before Finish;
listener diagnostics are field-only and deduplicated; and historical shows are focusable/clickable
for inspection while allocation destination/submission remain independently guarded. Focused tests
pass 60/60; Portal typecheck, scoped lint, and diff check pass. Known Studio/lint baselines remain.

The precise live three-field request-write denial cause is not claimed without the new runtime
manifest. No Function/Rules change, deployment, migration, production action, or queued-goal work
occurred. Next phase: independent Implementation Review 11.

## 2026-07-28 — Amendment 8 dev Rules deployed; owner QA required

After exact owner approval, Codex ran only
`firebase deploy --only firestore:rules --project fresh-prints-dev`. Exit code was 0. Firebase
reported successful compilation, upload, release to `cloud.firestore`, and `Deploy complete!`.
Local Rules SHA-256:
`bbf3da6f5a5159f486b2fce0a6f0459c20ac586f0395c0e7941ab934fb50c978`.

The read-only post-deploy comparison script could not obtain Application Default Credentials
(`metadata.google.internal` lookup failure), so no independent ruleset ID/content fetch is claimed.
The signed-in Firebase CLI's successful release response remains direct deployment evidence. No
Functions, indexes, Storage Rules, App Hosting, production, migration, or secret change occurred.

Current action: owner Amendment 8 live QA. Await `PASS`, `PASS WITH NOTES: ...`, or `FAIL: ...`.
Do not sign off or begin queued goals before the owner result.

## 2026-07-28 — Amendment 8 approved; awaiting dev Rules approval

Plan Section 26 / Amendment 8 is implemented and independently approved. Implementation Review 9's
authoritative final verdict is `APPROVED` after remediation re-review. Accepted scope includes the
full timer mutation/post-commit phase boundary, retry restricted to exact failed request IDs,
composed Portal polling lifecycle coverage, selected-show personal usage, complete sanitized
Start/Pause/Resume/Finish manifests, and the narrow legacy-compatible Finish Rules branch.

Verification: exact failing-before Finish fixture 16/17; passing-after full Rules 34/34 under
Temurin Java 21.0.11; targeted Amendment 8 behavior suite 21/21; Portal production build exit 0;
changed-file lint has no errors; Studio compiler reports no Amendment 8-scoped errors. No deployment
occurred.

Current and only action: request exact `APPROVE DEV RULES DEPLOY`, authorizing only:
`firebase deploy --only firestore:rules --project fresh-prints-dev`. Checkpoint:
`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-amendment-8-rules-deployment-checkpoint.md`.
Do not deploy Functions, indexes, Storage Rules, App Hosting, or production. After verified dev Rules
deployment, resume owner QA; do not sign off before the live result.

## 2026-07-28 — Post-deployment QA failed; Amendment 8 awaiting Formal Review

Owner QA after both Amendment 7 deployments is `FAIL`. Exact-25 multi-request behavior and regression
smoke pass. Show-switch was reported `SHOWN` and remains unconfirmed. Timer Start appeared to
persist and Pause/Resume worked, but Studio reported one incomplete show, four incomplete allocation
warnings, Finish permission denial, and Portal progress requiring manual refresh. The owner approved
a separate personal-use display (`Your print spots: used of limit used`; remaining line).

Plan Section 26 / Amendment 8 covers the full timer lifecycle, separation of committed mutation from
refresh failures, malformed-record handling, least-privilege Finish Rules if proven, bounded Portal
progress polling, and personal show usage using the value already returned by
`listPortalAllocatableShows`. Independent Formal Review is `approved_with_changes`; all constraints
are applied. It corrected one hypothesis: `listUpcomingShows` is already per-document resilient, so
implementation must prove the actual action failure phase. No implementation or deployment has
occurred. Next phase: Implement.

## 2026-07-27 — Both Amendment 7 deployments complete; owner QA required

After the already-verified Function deployment, the owner explicitly approved the separate Rules
checkpoint. Codex executed only
`firebase deploy --only firestore:rules --project fresh-prints-dev`: exit 0, compilation succeeded,
ruleset `projects/fresh-prints-dev/rulesets/23a9056c-bc09-4be5-9db1-ec6af78f225e` was created at
`2026-07-28T04:41:57.650831Z`, and the `cloud.firestore` release was updated to it at
`2026-07-28T04:41:58.859402Z`. The Firebase CLI reported both the Rules release and deployment
complete. Local Rules SHA-256:
`91e565ed0df55b7e1c5f060c9ecaa836cd6c1715f0f13e843e44ae9e101568ef`.

The standalone Admin SDK comparison script could not obtain ADC (exit 2), but the signed-in
Firebase CLI's create response returned the uploaded local Rules content and its release response
activated that exact new ruleset. No Functions, indexes, Storage Rules, App Hosting, production,
migration, or secret change occurred in the Rules deployment.

Both Amendment 7 deployment checkpoints are satisfied. Current action: owner live QA only. Await
`PASS`, `PASS WITH NOTES: ...`, or `FAIL: ...`; do not sign off or start queued goals beforehand.

## 2026-07-27 — Amendment 7 Function deployed and verified; Rules approval required

The owner reported completing:
`firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev`.
No Function redeployment occurred during the documentation/verification pass. Read-only Firebase
metadata confirms `queuePortalPrintRequestToShow` is `ACTIVE` in `fresh-prints-dev`, all traffic is
on revision `queueportalprintrequesttoshow-00031-wip`, and the update time is
`2026-07-28T04:36:34.802418735Z`. Runtime is Gen 2 Node.js 20; build ID is
`f21fd295-03d7-4efe-9ec7-837ea096672e`; resolved source generation is `1785213332317639`; Firebase
Functions metadata hash is `dc382c86844925389583c7e5e522664cca2d34c9`. The hash is not claimed
as a local source-byte comparison. Exact deployment exit code and CLI success line remain
`[NEEDS OWNER CONFIRMATION]`.

The Function checkpoint is satisfied. Owner QA remains paused. The next and only current owner
action is `APPROVE DEV RULES DEPLOY`, authorizing exactly
`firebase deploy --only firestore:rules --project fresh-prints-dev`. Do not redeploy the Function,
combine deployment records, or start queued goals.

## 2026-07-27 — Owner QA v7 failed; Amendment 7 approved; awaiting Function deploy approval

Owner QA found the Studio timer still denied on a one-show/two-allocation batch and the Portal's
ADR-FP-122 multiple-request behavior absent at runtime. Investigation established two separate
deployment needs: the callable has not been deployed since ADR-FP-122, and Amendment 6's deployed
Rules corrected legacy show documents but not mapper-compatible legacy allocation documents.

Amendment 7 adds a least-privilege legacy-allocation timer transition and field-name-only dev
diagnostics without additional reads/listeners. It also extracts and behavior-tests the callable's
authoritative transaction eligibility using fresh transaction values. Failing-before Rules:
12 tests, 11 pass, 1 fail, exit 1. Passing-after: Rules 28/28; focused root tests 33/33; independent
reviewer tests 37/37; Functions build and diff check pass. Formal Review is
`approved_with_changes` with all conditions applied; superseding Implementation Review 8 is
`APPROVED`. No Amendment 7 deployment occurred.

Current checkpoint: request `APPROVE DEV FUNCTION DEPLOY` for only
`firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev`.
After it is deployed and verified, stop for the separate `APPROVE DEV RULES DEPLOY` checkpoint.
Do not resume owner QA until both deploys are complete and verified.

## 2026-07-27 — Dev Rules deployment verified; owner live QA required

The owner completed `firebase deploy --only firestore:rules --project fresh-prints-dev`. Read-only
post-deploy verification found active ruleset
`projects/fresh-prints-dev/rulesets/c05daa58-cf8f-40c3-a67a-ac17ed052479`, created
`2026-07-28T03:45:17.826815Z`, identical to local SHA-256
`fc27e9bf0537c6bbdc303abc8d730c262cb59b997fd9d39a7b76a630c460d310`.
The supplied record did not include the deployment process's exact exit code or literal CLI success
line; both remain `[NEEDS OWNER CONFIRMATION]`, while the active identical release independently
proves the intended Rules are serving. No other deployment occurred.

Implementation Review 7 is now `APPROVED_AWAITING_OWNER_QA`. The timer must not be marked passed
until the owner completes the live Test checkpoint. Queued goals remain untouched.

## Superseded — 2026-07-27 — Timer root cause reproduced; narrow Rules correction ready

The prior timer test never ran under `npm run test:rules` and used invalid fixtures. Corrected
current-schema timer writes pass. Deployed Rules were fetched read-only and matched the prior local
Rules. A preserved legacy show field reproduces the atomic `permission-denied`; the new timer-only
compatibility branch permits only the exact timer diff while preserving all authorization,
validation, transition, and unrelated-field denials. Failing-before: 9/10 pass, exit 1.
Passing-after complete Rules suite: 23/23, exit 0. No deployment occurred.

Plan Section 24; Formal Review:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-6-review.md`;
Implementation Review 7:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-7.md`;
deployment checkpoint:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-dev-rules-deployment-checkpoint.md`.

This checkpoint was satisfied by the deployment recorded above; do not request deployment approval
again.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner FOURTH runtime FAIL; ADR-FP-122 reverses one-request-per-show uniqueness by explicit owner decision; show-switch error fixed; **Studio timer remains unfixed**; sixth Implementation Review session APPROVED — awaiting owner re-QA (v6)

Owner's fourth manual QA pass confirmed the typed over-cap and Show Queue live-update fixes hold.
Three new items surfaced: a `23 + 2 = 25` capacity rejection, a show-switch stale-error defect, and
the still-unresolved Studio timer.

**The `23+2` rejection was not a math bug.** The capacity-cap functions were already correct at this
boundary. The real cause was a separate, existing product rule — "one Portal print request per
customer per show" — which the owner had explicitly confirmed as a decision to keep on 2026-07-20.
Rather than silently override an accepted decision, this was raised directly with the owner, who
explicitly decided to reverse it. Recorded as **ADR-FP-122**: a customer may now submit multiple
separate requests to the same show, accumulating toward the same 25-print limit; exactly 25 is
allowed, more than 25 is blocked. Everything else about the 25-print limit, one-working-request
policy, and same-request-one-show invariant is unchanged.

**Show-switch stale error, confirmed and fixed:** a capacity error from one show no longer stays
visible after selecting a different show; a late-arriving response for a show no longer selected can
no longer resurrect its error.

**The Studio production timer is still NOT fixed.** No Rules, authentication, service, or payload
change was made. A programmatic, read-only Rules-comparison script
(`functions/scripts/compare-deployed-firestore-rules.mjs`) and a Rules-emulator reproduction test
(`tests/firebase/studioProductionTimer.rules.test.ts`) were both built, but neither could be executed
in this development session (no live Firebase credentials, no Java runtime available here) — both
require the owner (or CI) to run them for an actual result.

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 23. Because the change was fully specified by the owner's own explicit decision, this
amendment proceeded to a Formal Review of the completed work. Amendment 5 Formal Review:
`approved_with_changes`, two minor doc/test-exactness corrections applied. Sixth Implementation
Review session
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-6.md`,
deliberately scoped to full-goal-history regression safety rather than re-tracing the same diff):
**`APPROVED`** — 101/101 tests pass across this goal's entire history; confirmed no implicit
one-request-per-show assumption existed anywhere else in the codebase, and no second instance of the
show-switch stale-value defect class existed in the modal's other state.

Owner QA checkpoint rewritten (v6), with the exact command for the owner to run the new Rules-
comparison script themselves:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response, including the
Rules-comparison result, before this goal is signed off.** No Functions, Rules, indexes, migration,
deployment, App Hosting, or production action occurred.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner THIRD runtime FAIL (count corrected — not a fourth); deeper root causes traced for two of three defects; **Studio timer remains unfixed**; fifth Implementation Review session APPROVED for those two — awaiting owner re-QA (v5, superseded by the fourth-FAIL entry above)

**Correction:** this and the workflow-state entry previously mislabeled this as a fourth owner FAIL.
The recorded history shows only three owner FAIL checkpoints on this goal; this is the third.

**The Studio production timer is NOT fixed.** Another static Rules re-comparison found no
discrepancy, but no Rules, authentication, service, or payload change was made this pass. This goal
cannot be signed off while the timer still returns `permission-denied`, regardless of the other two
checks' results.

Owner's third manual QA pass found all three defects the prior ("APPROVED") remediation had targeted
still failing at runtime. Root-cause investigation went one level deeper on the two Portal/Studio
defects that could be addressed from source: the item-card typed-quantity bug turned out to be a
re-entrancy race (a completing save could overwrite a newer, still-in-progress edit made while it was
in flight) plus a contributing clamp-bypass defect (an unknown print limit could briefly let an
uncapped value through); the Show Queue bug turned out to have a second, separate cause beyond the
already-fixed allocation list — the show's own capacity/summary numbers were still only loaded once
per page visit.

**Fixed (Portal typed-quantity and Show Queue live-update only):** the item card now tracks whether
the field still reflects what a given save actually submitted before applying that save's result, so
an overlapping edit can never be silently discarded; an unknown print limit no longer lets an uncapped
value through; the Show Queue's selected-show summary data now updates live, the same way its
allocation list already did, bounded to just that one show. **Not fixed: the Studio timer** — still
requires the owner's own live Rules diagnosis via the Firebase Console (the Firebase CLI has no command
to fetch/diff currently-deployed Firestore Rules content; a `--dry-run` deploy only validates the local
file's syntax, it does not compare against what's live).

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 22. Amendment 4 Formal Review: `approved_with_changes`, one correction resolved in-Plan. Fifth
Implementation Review session
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-5.md`,
explicitly did not defer to any of the four prior "APPROVED" verdicts on this goal): **`APPROVED`** for
the two Portal/Studio fixes only — honest note that this pass is better-founded than earlier ones
(targets an overlap/re-entrancy defect class rather than a single-path staleness bug) but source review
still cannot certify real browser timing or real cross-client Firestore listener latency, and does not
and cannot speak to the Studio timer at all since no code changed there.

Owner QA checkpoint corrected (v5): the live-Rules-comparison step now points to the Firebase Console
(the only actually-supported method) rather than an unverified CLI dry-run, plus a new explicit
overlapping-edit test step:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response, including the
Studio timer diagnostic input, before this goal is signed off.** No Functions, Rules, indexes,
migration, deployment, App Hosting, or production action occurred.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner THIRD runtime FAIL; two of three remaining defects fixed; FOURTH Implementation Review APPROVED — awaiting owner re-QA (v4, superseded by the fourth-FAIL entry above)

Owner's third manual QA pass confirmed real progress: removed-item route reconciliation and valid
typed reduction to `1`/`1`/`1` are now field-confirmed passing. Three defects remained: the Print
Request detail item card's own typed input stayed stuck on a rejected over-cap value even though
shared/cart state was already correct; a Studio production-timer `permission-denied` error, now
confirmed with a real Firebase error code; and a newly-discovered defect — Studio Show Queue not
reflecting a cross-client Portal-submitted allocation while already open.

**Root cause 1 (item-card display):** the card's own local input state never learned the server's
corrected quantity after a rejected save — a timestamp-comparison bug in its own stale-prop guard
rejected the correction. **Fixed:** the accepted quantity now threads through all three code layers
end-to-end and is applied directly to the card's input the moment a save completes.

**Root cause 2 (Studio timer):** confirmed genuinely real, but unresolvable after a fourth independent
check of the security rules against the exact write — remaining explanations require live access
(deployed rules differing from checked-in rules, or a legacy field on a specific document). A precise
diagnostic request was prepared and handed to the owner rather than guessing a fifth fix.

**Root cause 3 (Show Queue live updates):** confirmed as a genuinely new gap — no live-update
mechanism existed at all for this view, only a one-time load on open. **Fixed:** a bounded, ref-counted,
per-show real-time subscription (reusing an existing proven pattern from elsewhere in this codebase)
replaces the one-time fetch.

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 21. Amendment 3 Formal Review: `approved_with_changes`, two corrections resolved in-Plan.
Fourth Implementation Review
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-4.md`,
explicitly did not defer to any of the three prior "APPROVED" verdicts on this goal): **`APPROVED`** —
stated confidence high for both fixes at the mechanism level, with an honest note that only live
testing can confirm real network-timing races and actual cross-client Firestore listener behavior.

Owner QA checkpoint restructured per the owner's exact Check 1-4 format, including a precise
diagnostic request for the Studio timer:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response, including the
Studio timer diagnostic input, before this goal is signed off.** No Functions, Rules, indexes,
migration, deployment, App Hosting, or production action occurred.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner SECOND runtime FAIL; three deeper root causes fixed; THIRD Implementation Review APPROVED — awaiting owner re-QA (v3, superseded by the third-FAIL entry above)

A second manual QA pass found the first remediation's fix (Implementation Review 2, APPROVED) was real
but incomplete: cart/context/Discover/Design Library/Add to Show cancellation were confirmed correct,
but the Print Request detail route itself still showed stale data after navigate-away-and-back; typed
quantity entry was badly inconsistent, including values silently collapsing to `1`; and a
previously-hidden Studio production-timer permission failure blocked a required regression criterion.

**Three root causes, source-traced and independently confirmed twice:**
1. A second, un-invalidated 30-second read cache the detail route's own fetch used — the two
   mutations that matter (`removePrintRequestItem`, `updatePrintRequestItemQuantity`) never
   invalidated it, so a navigate-away-and-back within that window re-served stale pre-mutation data.
2. The server's authoritative clamped quantity was discarded at three separate code layers on its way
   to the UI; a lookup-miss fallback silently defaulted to the literal `1` instead of surfacing an
   explicit failure.
3. A Studio production-timer permission failure that could not be diagnosed from source alone —
   diagnostic logging was added; live reproduction against `fresh-prints-dev` is needed from the owner.

**Fixed:** cache invalidation added to both mutations; the detail route now treats shared
Current-Request state as authoritative while viewing the working request; the server's actual accepted
quantity is now read and committed everywhere instead of discarded; a second, unused duplicate of the
buggy quantity code was found and removed; Studio timer failures now log full diagnostic detail.

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 20. Amendment 2 Formal Review: `approved_with_changes`, one blocking finding (an undocumented
second buggy duplicate function) resolved in-Plan. Third Implementation Review
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-3.md`,
explicitly did not defer to either prior "APPROVED" verdict on this goal): **`APPROVED`** — stated
confidence "high but not absolute," since source review cannot fully verify live React timing, real
Firestore consistency behavior, or the still-open Studio timer question; a fourth owner QA pass, not a
fourth source review, is what closes the remaining gap.

Owner QA checkpoint restructured per explicit instruction — split into a "developer already verified
automatically" section (all automatable checks with exit codes) and a "minimal remaining owner checks"
section (5 items requiring a live session): `docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

`preproduction-static-analysis-cleanup` is now also queued (owner-directed) after
`studio-test-data-print-limit-wipe-audit`, both ahead of `production-release`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response before this goal is
signed off.** No Functions, Rules, indexes, migration, deployment, App Hosting, or production action
occurred.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner runtime FAIL; real root cause fixed; new Implementation Review APPROVED — awaiting owner re-QA (superseded by the second-FAIL entry above)

Owner ran manual QA against a previously "Implementation Review APPROVED" fix and found removal and
quantity persistence still broken at runtime. The real root cause (traced directly from the live
component→hook→context call graph, independently confirmed twice): `PrintRequestDetailView.tsx`'s
remove/update/duplicate handlers each awaited the properly-reconciled hook method and then
unconditionally fired a second, unguarded server reload — racing the reconciliation that hook already
performed and resurrecting stale data via ordinary Firestore eventual-consistency lag. This explains
why the defect was consistent, not occasional.

**Fixed:** removed the three redundant reload calls; added a monotonic-timestamp prop-sync guard so a
stale reload from an unrelated, still-legitimate source (e.g. the Current Request drawer) cannot
silently revert an already-saved quantity; changed the historical-request reuse button to exactly
"Request Again" (owner-requested); fixed a separate, pre-existing Studio `tsconfig.json` build blocker
(one-line correction, no TypeScript upgrade) — this exposed 29 separate pre-existing type errors,
unrelated to print requests, previously masked by the earlier build failure; not fixed in this pass,
flagged for a future cleanup.

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 19. Amendment Formal Review (`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-review.md`):
`approved_with_changes`, two non-blocking notes resolved in-Plan. New independent Implementation
Review (`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-2.md`,
explicitly did not defer to the prior disproven verdict): **`APPROVED`** — independently re-traced the
actual current source end-to-end and confirmed, with concrete evidence, that both root causes are
removed at their exact call sites.

Owner QA checkpoint rewritten with all 16 owner-specified scenarios (A-P):
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response before this goal is
signed off.** No Functions, Rules, indexes, migration, deployment, App Hosting, or production action
occurred. `studio-test-data-print-limit-wipe-audit` remains queued but not started;
`production-release` remains not started.

## 2026-07-27 — `portal-print-request-prelaunch-stability` Implement complete, Implementation Review APPROVED — awaiting owner manual QA response (superseded by the runtime FAIL entry above)

Required pre-production stabilization goal, immediately before the still-queued
`production-release` roadmap goal. Owner approved the Plan for implementation; all 8
Portal print-request defects plus the Firebase Debug availability-toast removal are now
implemented and independently reviewed.

**Fixed:** stale/reappearing removed request items; stale/reverting quantities across
Discover, Design Library, cart, and detail; cold-start blank design-card images; a
missing post-queue-to-show progress tracker; wrong show-capacity copy; an ambiguous
"Add to request" action on historical requests (now "Print again" with a repeat icon);
the elapsed timer removed from the show-linked progress panel (underlying production
timer untouched); and the "Firebase Debug panel available (Ctrl+Shift+F)" toast removed
from both Portal and Studio (the actual dev-only tool and its gates/shortcut untouched).

**Shared root cause (items 2/5/7), now fixed:** `usePrintRequestDetail.ts` now calls the
context's existing `beginPendingItemRemovals`/`endPendingItemRemovals`/`patchWorkingItems`
reconciliation mechanisms, plus a new per-item generation tracker
(`itemMutationGeneration.ts`) that discards stale completions for a superseded mutation.
`reconcileQueuedRequest` now patches `allocationTotalsByRequestId` from the queue-to-show
callable's authoritative result. **Item 1, now fixed:** `catalogService.ts`'s
`getReadyDesignsByIds` detects exactly which requested IDs are missing from a successful
generated-manifest response and fetches only that missing subset via the existing
per-doc fallback — zero extra reads when the response is already complete.

**Verification (exact exit codes):** new/updated tests 45/45 pass (exit 0); Portal
typecheck exit 0; Portal build exit 0 (19/19 pages); Studio build exit 2, traced to a
genuinely pre-existing, unrelated `apps/studio/tsconfig.json` defect committed
2026-07-13 (`ignoreDeprecations: "6.0"` invalid for installed TypeScript 5.9.3) — not
caused by this goal, flagged separately for a future decision; lint exit 1, all 41
findings independently confirmed pre-existing; `git diff --check` exit 0.

**Independent Implementation Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review.md`):
**APPROVED, no blocking findings** — traced the actual reconciliation logic directly,
independently re-ran 57 tests (all pass), and independently re-derived both
pre-existing-defect diagnoses from `git log`/`git diff` rather than trusting the claim.

**Owner manual QA checkpoint prepared:**
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Next queued goal after this one closes:** `studio-test-data-print-limit-wipe-audit`
(owner-directed) — audit and redefine the Studio Test Data action currently labeled like
a Print Request daily-limit wipe, since the product no longer has a standalone customer
daily print allowance. Not started, no Plan authored. **`production-release` begins only
after both this goal and `studio-test-data-print-limit-wipe-audit` are signed off.**

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response to
manual QA before this goal is signed off.** No Functions, Rules, indexes, migration,
deployment, App Hosting, or production action has occurred.

## 2026-07-27 — `portal-google-analytics` SIGNED OFF: PASS — managed goal CLOSED

Owner responded **`PASS`** to the Signoff checkpoint with no notes. The goal is now
closed.

**Final state**: an inert Google Analytics 4 architecture is merged into Fresh Prints
Portal (`apps/portal/features/analytics/`: host gate, config resolver, a sanitizer that
templates dynamic routes and drops all customer PII/search text/request IDs, a narrow
`gtag` service wrapper with explicit success/failure returns, a single-controller hook
gated on both config and script-readiness, a thin script-loader component, and a
Suspense-wrapping boundary component owning the readiness handshake), wired into
`apps/portal/app/layout.tsx`/`providers.tsx`. It is fully dormant in every deployed
environment today — no `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured anywhere, and the
architecture stays inert by design even if one were accidentally set outside the
production hostname.

**Workflow history**: five Formal Review passes and two Implementation Review passes
resolved, in order: an initial PII-leak risk (raw request/design IDs, search text,
`returnTo`, dynamic titles reaching Google); a GA4 Enhanced Measurement duplication
gap; a de-duplication under/over-counting defect; an internally contradictory
Enhanced-Measurement/ad-signal scope; a Server-Component/Client-Component architecture
conflict plus a dual-ownership conflict for the initial page view (consolidated into a
single controller); a rejected "accept a narrower privacy gap" production fallback
(replaced by a hard PASS/BLOCKED gate); and a genuine runtime initialization race found
only after the first Implementation Review had already approved an earlier version —
closed by an explicit `next/script` `onReady`-based readiness handshake and a
success-gated state-commit rule.

**Test phase**: automated suite 81/81 pass (exit 0), Portal typecheck exit 0, Portal
build exit 0 (19/19 pages, no Suspense error), lint exit 1 correctly characterized (10
pre-existing warnings tripping the repo's `--max-warnings 0` policy; zero new findings
in this goal's files). Inert local runtime smoke test passed: Portal starts normally,
zero Google-domain script/network activity, all routes HTTP 200, zero console/server
errors.

Full artifact trail: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`,
`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`,
`docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`,
`docs/workflow/reviews/2026-07-27-portal-google-analytics-test-report.md`,
`docs/workflow/reviews/2026-07-27-portal-google-analytics-signoff-checkpoint.md`.

**Production was untouched throughout the entire goal.** No real Measurement ID was
ever used. No GA4 property was created. No Firebase, App Hosting, or production action
occurred at any point.

**Next queued goal: `production-release`** (per the roadmap's pre-production
sequence) — not started, requires its own new Plan and explicit owner approval before
implementation or deployment. Per this goal's Plan (Owner Decision 6), that goal is
where the owner creates the real GA4 property, disables Enhanced Measurement
completely, verifies advertising settings are disabled, runs the hard PASS/BLOCKED
DebugView privacy gate, resolves privacy disclosure/consent, and only then supplies the
real Measurement ID and deploys.

## 2026-07-27 — `portal-google-analytics` script-readiness race fixed and re-reviewed (APPROVED); Test phase complete; awaiting owner Signoff

The owner found a real runtime race in the previously-approved implementation: the
analytics controller could permanently lose its initial GA configuration and page view
if its React effect ran before the `next/script strategy="afterInteractive"` script had
executed — the prior code committed "initialized" state unconditionally after merely
calling the service functions (which correctly no-op if `gtag` doesn't exist yet), not
after confirming they succeeded, and nothing would ever trigger a retry once that
false state was committed.

**Fixed with an explicit script-readiness handshake**: the three `gtag`-wrapper
functions now return an explicit `boolean` (true only on real success);
`PortalAnalyticsScript` reports readiness via `next/script`'s own documented `onReady`
callback; `PortalAnalyticsBoundary` owns that boolean and passes it into the single
controller hook; the controller never attempts initialization until the script is
ready, and commits state only on confirmed success — making the later `update:true`
navigation call structurally unreachable before a real initial configuration. No new
lifecycle owner was introduced; the components only report the fact that the script
executed, all decisions remain in the one controller/service layer.

Ten required regression tests were added covering every required scenario (delayed
readiness, permanently blocked script, failed initialization with a working retry,
Strict-Mode-style replay, repeated readiness signals, navigation before readiness using
the current route rather than a stale one, and a thin-component regression proving no
sequencing logic leaked back into the script-loader component).

A second independent Implementation Review
(`docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`)
independently re-verified all ten required checklist items against the actual shipped
code: **APPROVED**. All verification commands re-run and passing: 81/81 unit tests
(exit 0), Portal typecheck (exit 0), Portal build (exit 0, no Suspense error). Lint
exit code corrected to its precise value (**1**, due to the repo's `--max-warnings 0`
policy tripping on 10 pre-existing, unrelated warnings) — the first Implementation
Review's "exit 0" claim for this command was itself an error, now corrected; the
problem count and file list are identical and unrelated to this goal in both runs.

**Test phase complete**: automated results recorded, plus an inert local runtime smoke
test (Portal started with no Measurement ID configured; confirmed zero Google-domain
script tags or network activity across `/`, `/catalog`, `/login`, `/help`,
`/firebase-debug`; all routes HTTP 200; zero console/server errors). Test Report:
`docs/workflow/reviews/2026-07-27-portal-google-analytics-test-report.md`.

**Awaiting the owner's Signoff response** (`PASS` / `PASS WITH NOTES` / `FAIL`) at
`docs/workflow/reviews/2026-07-27-portal-google-analytics-signoff-checkpoint.md`.

No real Measurement ID was used at any point. No GA4 property was created or changed.
No Firebase, deployment, App Hosting, or production action occurred throughout this
entire goal.

## 2026-07-26 — `portal-google-analytics` Implement complete: inert GA4 code built and independently reviewed (APPROVED); production analytics remains separately blocked

Owner approved Owner Decisions 1–7 for the Portal Google Analytics goal, subject to a
whole-Plan consistency correction that resolved three implementation blockers: (1) the
Server Component root layout could not read the current URL, so a new Client
Component/Suspense boundary (`PortalAnalyticsBoundary`) now owns all URL-aware logic;
(2) two layers previously contended for ownership of the initial GA4 page view,
resolved by consolidating into one authoritative hook,
`usePortalAnalyticsController`; (3) a prior revision allowed production GA4 enablement
to proceed even with an unresolved automatic-event privacy leak "if accepted" — the
owner rejected this, and a hard PASS/BLOCKED production gate (no accept-and-proceed
path) now governs it instead.

A fifth Formal Review pass — the first scoped to the *entire* Plan document rather
than one amendment — verified all three corrections against source and current
documentation, found one cross-section drift (an older section still narrated the
rejected fallback as current), and confirmed it resolved. Verdict:
`approved_with_changes`, fully resolved.

**Implement then proceeded**, building exactly the inert code specified: a new
`apps/portal/features/analytics/` feature folder (host gate, config resolver,
sanitizer + navigation-identity logic, a narrow `gtag` service wrapper, the single
controller hook, a thin script-loader component, a Suspense-wrapping boundary
component, strict types) plus wiring into `apps/portal/app/layout.tsx`/`providers.tsx`
and one new documented `.env.example` line. No real Measurement ID was used anywhere;
the architecture is fully inert until a real ID is configured on the production
hostname.

**All verification independently re-run and passing**: 73/73 unit tests (exit 0),
Portal typecheck (exit 0), Portal production build (exit 0 — 19/19 pages, no Suspense
build error), repo-wide lint (exit 0, zero new findings — 41 pre-existing unrelated
issues only). An independent implementation review (separate context, re-ran every
command itself rather than trusting the claim) returned **APPROVED**, with one
non-blocking note about Strict Mode test coverage being proven at the pure-function
level, consistent with this repo's established no-DOM-renderer testing convention.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Reviews: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md` (Formal
Review), `docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`
(implementation review).

**Stopped before deployment and before any real Measurement ID**, per explicit scope.
No GA4 property was created. No Firebase, App Hosting, or production action occurred.
Remaining for this goal: Test (formal QA sign-off) and Signoff phases. Production GA4
enablement itself — including the hard PASS/BLOCKED gate verification and property
creation — remains a fully separate checkpoint under the later `production-release`
roadmap goal.

## 2026-07-26 — `portal-google-analytics` Plan corrected a third time (final navigation de-dup design, full Enhanced Measurement disablement, global page-context sanitization); Implement still blocked only on Owner Decisions 1–7

The owner reviewed the twice-amended Plan and found three remaining material
conflicts, all resolved this session. No implementation, configuration, dependency,
environment, Firebase, or GA property change occurred — confirmed via `git status`:
only the Plan/Review docs and this state-file pair changed.

**Correction 1 — navigation de-duplication:** the prior design de-duplicated on raw
navigation state and reframed dropped-parameter-only repeated page views (e.g.
search-box typing) as "acceptable GA4 behavior." **The owner rejected this** — the
original requirement was never actually met. Replaced with a three-part design: a
local, never-transmitted **navigation identity** (raw pathname + normalized
allowlisted query only) decides whether to fire; the **sanitized descriptor**
(unchanged) decides what is reported; a **previous sanitized descriptor** supplies the
safe referrer. This makes dropped-parameter changes (e.g. catalog search text) produce
zero additional page views, while different dynamic-segment resources
(`/requests/[id]`, `/share/design/[id]`) still correctly produce distinct page views.

**Correction 2 — full Enhanced Measurement disablement:** the prior version disabled
only the browser-history-tracking sub-option while claiming "page views only" — an
internal contradiction, since GA4's Site search sub-feature auto-detects Portal's own
`q` search parameter independent of anything this Plan's own code can intercept. Now
requires the **entire** Enhanced Measurement switch off, with an explicit DebugView
checklist (no `view_search_results`, no scroll/click/video/file-download/form events).

**Correction 3 — global GA4 page-context sanitization (new):** automatically-collected
lifecycle events (`first_visit`, `session_start`, `user_engagement`) would inherit raw
`document.location`/`document.title`/`document.referrer` unless the tag's global page
context is explicitly overridden first. Added the required `gtag('set', ...)`-before-
`gtag('config', ...)` sequence, plus explicit `allow_google_signals: false` /
`allow_ad_personalization_signals: false` (corrected from an earlier, inaccurate claim
that leaving these unset was sufficient — both actually default to `true`/enabled).

**Third independent Formal Review** verified the correction against source and current
Google Analytics documentation (not memory) and found two blocking wording/certainty
issues, no architecture changes needed: a self-contradictory paragraph about
`category`-ID handling in the navigation-identity design, and an overstated claim that
the `gtag('set',...)`-before-`config` mechanism was "verified" to reach automatic
lifecycle events (official docs are silent on this specific point). **Both resolved
directly in the Plan**: the contradictory paragraph was rewritten to state only the
correct behavior; the overstated claim was softened into an explicit go/no-go manual-QA
test with a documented, non-blocking fallback.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Implement remains blocked on the same seven Owner Decisions as before** — items 3, 5,
and 6 now carry the owner's exact required wording (no consent banner this goal; full
Enhanced Measurement disablement; ordered GA4-property-setup sub-steps). Production
remains completely untouched.

## 2026-07-26 — `portal-google-analytics` Plan amended (analytics URL/title/referrer sanitization + GA4 Enhanced Measurement checkpoint); Implement still blocked only on Owner Decisions 1–7

An external owner review of the already-`approved_with_changes` Plan/Review found two
material omissions, both now resolved directly in the Plan. No implementation,
configuration, dependency, environment, Firebase, or GA property change occurred —
confirmed via `git status`: only the Plan/Review docs and this state-file pair changed.

**Omission 1 — data leakage risk:** the original design would have sent raw
`pathname+searchParams` toward `gtag`. Verified by direct repository inspection (not
invented): `/requests/[id]`'s dynamic segment is a Firestore `printRequest` document ID
(not public); the `q` catalog-search parameter is free customer-entered text; `returnTo`
(used across `/login`, `/register`, `/login-required`, `/complete-profile`, `/donate`,
`/requests/artwork`) can transitively embed a `/requests/:id`-shaped nested path and
query string (confirmed via real call sites in `PrintRequestDetailView.tsx`); and
`/share/design/[id]`'s real, dynamic `<title>` contains the actual design name (via
`portalDesignShareMetaService.ts`). **Resolved** with a new sanitization architecture
(Plan Section 6a): a single pure function, `buildSanitizedAnalyticsPageDescriptor`, is
now the sole choke point between raw navigation state and any value reaching `gtag` —
route templating (`/requests/:id`, `/share/design/:id`), query-parameter allowlisting
(fixed enums/flags only; `q`/`returnTo`/`requestId`/`designId`/etc. always dropped),
fixed non-dynamic page titles (never `document.title`), sanitized referrer (never
`document.referrer`), and fail-closed handling of unknown routes/parameters.

**Omission 2 — Enhanced Measurement duplication:** the Plan's `send_page_view: false`
mitigation only suppresses GA4's one-time auto-page-view on script load, not the
separate, on-by-default Enhanced Measurement "Page changes based on browser history
events" setting, which would double-count every client-side App Router navigation.
**Resolved** with a new, explicit GA4 property-setup checkpoint (Plan Section 6b,
verified against official Google Analytics documentation, not memory): exact console
path, who performs it, when, and how it's verified in DebugView — folded into a revised
Owner Decision 6.

**Second independent Formal Review** verified the amendment against source and found
one new blocking defect introduced by the amendment's own original de-duplication
design: comparing only the sanitized route would have silently suppressed a real page
view when navigating between two different dynamic-segment resources that template
identically (e.g. two different `/requests/[id]` values, both `/requests/:id`) — a
real under-counting bug. **Resolved directly in the Plan**: the de-duplication guard
now uses a two-tier comparison — raw navigation state decides *whether* a page view
fires (fixing the under-counting), the sanitized descriptor decides *what* is reported
(preserving the privacy fix).

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Implement remains blocked on the same seven Owner Decisions as before** (Plan Section
18) — nothing new blocks Implement beyond what already blocked it; Decision 6 now
explicitly includes the GA4 Enhanced Measurement property-setting step. Production
remains completely untouched.

## 2026-07-26 — `portal-google-analytics` Plan + Formal Review complete (`approved_with_changes`); Implement blocked on owner decisions

Started the next queued managed goal (roadmap item #5, after Wave C signoff). This
session was **Plan + Formal Review only** — no implementation, dependency, environment,
Firebase, or CSP change occurred.

**Confirmed by direct repository inspection:** zero existing GA4/analytics
implementation anywhere in the repo; no analytics dependency in
`apps/portal/package.json`; no CSP anywhere in Portal (no `next.config.ts` headers, no
`middleware.ts`, no CSP in `firebase.json`/`apphosting.yaml`); no Privacy Policy/Terms/
consent page anywhere in Portal. Reused two exact existing precedents: the
`getPortalSiteOrigin`/`isPortalSearchIndexingEnabled` fail-closed hostname gate
(`apps/portal/features/brand/`) and `Providers.tsx`'s existing
`usePathname()`-keyed `useEffect` pattern.

**Proposed architecture:** a new `apps/portal/features/analytics/` folder
(Component → Hook → Service layering). Root layout renders a client
`PortalAnalyticsScript` (`next/script`, `strategy="afterInteractive"`,
`send_page_view: false`) only when a Measurement ID is configured AND a dedicated
`isPortalAnalyticsHostAllowed` gate resolves true (production hostname only — kept
independent of the SEO-named `isPortalSearchIndexingEnabled` per a Formal Review
correction). `Providers.tsx` mounts a `usePortalPageViewTracking` hook
(`usePathname`+`useSearchParams`, `useRef` de-dupe, excludes `/firebase-debug`) firing
exactly one page view per route change through a thin `gtag` wrapper service; every
failure path is a silent no-op, never blocking Portal rendering. No new npm dependency.
No Firestore/Storage/Functions/Rules change anywhere in this design.

**Formal Review (`approved_with_changes`, independent context):** verified every
repository claim directly, confirmed zero scope violations and zero code/config changes
by this session. Three findings resolved directly in the Plan: a `PortalScrollReset.tsx`
citation was corrected to not overstate root-level proof; the SEO-named hostname gate
was replaced with a dedicated analytics-specific wrapper to avoid concern-coupling; an
unverified Suspense-boundary assumption was downgraded to an explicit Implement-time
verification step. Two non-blocking housekeeping notes logged, not acted on.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Implement is blocked** on seven numbered owner decisions (Plan Section 18): dev
analytics strategy, hostname gating, **consent strategy (no Privacy Policy exists
anywhere in Portal today — Plan recommends legal review before any consent-dependent
path, though the inert-by-default skeleton can be built regardless)**, test/staff
traffic exclusion, event scope, Measurement ID provisioning (owner creates the GA4
property out-of-repo; supplied only at a later production checkpoint, never during
Implement/Test against `fresh-prints-dev`), and privacy disclosure.

**Production remains completely separate and untouched.** `production-release`
(roadmap item #6) was not started and is not conflated with this goal.

## 2026-07-27 — `firestore-usage-efficiency-wave-c` SIGNED OFF: PASS WITH NOTES — managed goal CLOSED

Both final owner smoke tests passed (Studio: bounded reads only, 0 listeners/callables/Storage
requests/writes/fallbacks/errors across a full tab traversal; Portal: 0 fallbacks/errors/client
writes, 7 callables all succeeded, 112 Storage requests all from active generated catalog families,
no abandoned resource used). Full signoff:
`docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md`.

**Final state**: bounded Firestore is the sole, permanent Print Requests path for both Studio and
Portal (queueTab-maintained, server-paginated, exact `getCountFromServer` counts, direct
selected-request lookup, local mutation reconciliation). The generated catalog/Design Library
architecture remains fully active and was unaffected by this goal. The private print-request JSON
read-model architecture explored during this goal was abandoned by explicit owner decision (ADR-FP-121)
after a controlled real-publication test proved it didn't eliminate the cost it was built to remove
— every artifact (source, 3 Functions, Storage objects, Storage Rules, 2 Firestore indexes) has been
fully removed from both source and `fresh-prints-dev`.

Production was untouched throughout the entire goal. Managed goal `firestore-usage-efficiency-wave-c`
is now CLOSED. **Next queued goal: `portal-google-analytics`** (per the roadmap's own pre-production
sequence) — not started, requires a new Plan and explicit owner approval before implementation.

## 2026-07-27 — Pass 6: Abandoned private print-request read-model cleanup FULLY COMPLETE (source + Firebase) — awaiting owner's final Wave C smoke test

Every artifact of the abandoned private print-request JSON read-model architecture (see the entry
below for the abandonment decision and rationale) has now been removed from both source and the
live `fresh-prints-dev` Firebase project, across four sequential owner-approved checkpoints:

1. Application source removed (Studio/Portal consumers, shared types, publisher/callable Functions).
2. The three abandoned Functions deleted from `fresh-prints-dev`
   (`publishPrintRequestReadModels`, `readStudioPrintRequestReadModelAsset`,
   `onPrintRequestReadModelInputWritten`) — confirmed via `firebase functions:list`.
3. The abandoned private Storage objects (`generated/studio-print-requests/`,
   `generated/portal-print-requests/`) manually deleted by the owner via the Firebase Console; the
   now-unnecessary explicit private Storage Rules and helper (`customerBelongsToCaller`) removed
   from `storage.rules` and deployed — confirmed by 12/12 passing rules-emulator tests both before
   and after deployment, proving the paths correctly fall through to default-deny.
4. The two Firestore composite indexes that existed only for the deleted publisher
   (`printRequests`: `queueTab+createdAt` ascending and descending) deleted from live
   `fresh-prints-dev` via `firebase deploy --only firestore:indexes --force` — confirmed via
   `firebase firestore:indexes` showing exactly 6 `printRequests` indexes remaining (down from 8),
   with the bounded `queueTab+updatedAt+__name__` index intact and every other pre-existing index
   untouched.

Bounded Firestore (pass 5's `listPrintRequestsPage`/`countPrintRequests`, exact
`getCountFromServer` tab counts, cursor pagination, direct selected-request lookup, local mutation
reconciliation) is now the sole, permanent Print Requests read path in both apps, with zero
remaining trace of the abandoned architecture anywhere in code or Firebase. The generated
catalog/Design Library system remains completely unaffected throughout every step of this cleanup.

**Awaiting the owner's final Wave C smoke test** (Studio cold-open, Portal Discover/Design
Library/working-request check) before Wave C is ready for signoff.

## 2026-07-26 — Pass 6: Private print-request JSON read model ABANDONED and REMOVED — bounded Firestore is the permanent Print Requests path

The private Studio/Portal print-request read-model architecture documented in the entries below was
built, corrected twice for real defects (a manifest/page path-orphaning bug, then an immutability
violation the owner caught in the first fix), deployed to `fresh-prints-dev`, and set up for a
controlled real-publication test. **The owner then decided to abandon it entirely** — not disable,
remove — after the final runtime evidence showed the architecture never actually eliminated what it
was built to eliminate: ~10s before Print Requests became visible, a ~5.29s manifest callable, a
~333ms page callable, and 4 Firestore count queries + 1 item query + 4 catalog design reads (~12
client-side billable reads) still occurring despite the read model being live and correct.

**Bounded Firestore (pass 5's `listPrintRequestsPage`/`countPrintRequests`, cursor pagination, exact
`getCountFromServer` tab counts, direct selected-request lookup, local mutation reconciliation) is
now the sole, permanent Print Requests read path for both Studio and Portal** — this was already the
proven, working architecture the read model was layered on top of; removing the read model restores
it as the only path, with zero conditional branching or fallback-decision latency.

`printRequests.queueTab` and its two maintenance triggers
(`onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten`) are fully
preserved — only their private-read-model publish side effects and the read-model-only
`onPrintRequestReadModelInputWritten` trigger were removed.

The completely separate, successful generated catalog/Design Library system
(`generated/catalog-reference/**`, `generated/portal-catalog/**`, `rebuildCatalogSnapshots`, catalog
snapshot triggers, Studio/Portal catalog consumers) is untouched and remains active.

Full removal: all private read-model shared types, publisher/callable/read-callable Functions,
Studio/Portal consumer services and mapping utilities, the Studio dev-console publish bridge, and
the two now-orphaned Firestore composite indexes (`printRequests`: `queueTab+createdAt` ascending
and descending) were deleted from source. `storage.rules`' explicit private-prefix rules for both
abandoned Storage prefixes were deliberately LEFT IN PLACE (not yet removed) per a safe-removal
sequence — they stay private until the old dev Storage objects under both prefixes are confirmed
deleted in a separate, later owner-approved checkpoint, so no private object can ever become
publicly readable mid-cleanup. The rules-emulator test for those prefixes was re-verified against
the current, unmodified rules: 17/17 pass.

**Nothing was deployed or deleted from Firebase in this removal pass** — this was a local source
cleanup only. The abandoned Functions (`publishPrintRequestReadModels`,
`readStudioPrintRequestReadModelAsset`, `onPrintRequestReadModelInputWritten`) remain live in
`fresh-prints-dev` until a separate, explicit deployment/deletion checkpoint. Historical plans,
reviews, and this snapshot's own earlier entries documenting the read-model work are preserved
below as-is — the work was real and technically successful; it was abandoned for cost/complexity
reasons, not because it was broken.

## 2026-07-25 — Pass 6 update: Rules emulator security gate executed and passing (22/22)

Per owner instruction, ran the previously-written `printRequestReadModel.rules.test.ts` for real
against the Firestore + Storage Rules emulators (had only been logically reviewed before, not
executed — no Java in the environment). Used the documented Wave C portable JDK
(`%USERPROFILE%\.local-jdk\jdk-21.0.11+10`, Temurin 21.0.11, shell-scoped `JAVA_HOME`/`PATH`, no
admin install). `npm run test:rules`.

First run: 3 of 19 tests failed — all "allow" cases (staff reading the Studio manifest, a customer
reading their own manifest, staff reading a customer manifest). Root cause confirmed via a minimal
isolated repro and cross-check against the repo's own pre-existing, unmodified
`isReadyDesignDerivative` rule (also failed identically): a **test-harness bug, not a rules
defect** — the new test file used an arbitrary demo `projectId`, but this Firebase CLI version's
Storage Rules only resolve cross-service `firestore.get()` against the emulator's actual configured
project (`fresh-prints-dev`). Fixed by changing the test's `projectId` to `'fresh-prints-dev'` —
`storage.rules` itself was not touched. Added two previously-missing required assertions (inactive
staff denied; a `customers` doc missing `userId` denied for the customer branch while staff can
still read it).

Final run: **22/22 pass, exit code 0**. Java: Temurin 21.0.11+10. Confirms: signed-out/customer
denied Studio reads; staff allowed; customer A reads only their own manifest/pages; customer A
denied customer B's assets; staff allowed any customer's assets; all client writes denied on both
new prefixes for every role; the `customers.userId`-to-Auth-UID resolver correct including its
failure modes (missing doc, malformed doc, inactive staff); unrelated existing Storage Rules
unaffected. No rule or code change was made merely to pass a test — only the test's project-ID
configuration was corrected and missing coverage was added. **Nothing was deployed.**

## 2026-07-25 — Pass 6: Private generated print-request read models (Studio + Portal), implemented and reviewed, ready for owner dev deployment approval

Added two PRIVATE generated Cloud Storage read-model caches on top of pass 5's already-approved,
unmodified `queueTab`/bounded-Firestore architecture (which remains the permanent secure fallback,
not reverted): one staff-only for Studio, one customer-scoped for Portal. Mirrors the existing
catalog-snapshot architecture's mechanics (manifest-last publish, content-addressed assets,
generation-precondition manifest swaps) but as two genuinely separate security contracts — neither
new asset is public-read, unlike every prior `generated/**` prefix.

Key architecture facts confirmed by direct code inspection before implementation: `customers/{id}`
Firestore doc ID is **not** the Auth UID (mapping is `customers.where("userId","==",authUid)`); no
existing Electron-main-to-renderer-auth bridge exists, so Studio's private asset is fetched via the
renderer's already-authenticated Storage SDK (`getBytes`), not the public-asset Electron IPC
transport — mirroring an existing repo precedent (`assistedCreationRequestsService.downloadBytes`
against per-uid/staff-gated paths).

Implemented: shared read-model types/pure builders (11 tests); Functions publisher module with a
shared bounded generation-precondition retry helper (9 tests including a same-manifest concurrent-
burst test); a new `printRequests`-direct trigger with a recursion guard preventing it from re-firing
on the existing `queueTab` triggers' own write (8 tests); the read-model publish call is wrapped in
its own try/catch, called strictly after the `queueTab` write succeeds, and never affects that
write's outcome; a new owner-only/dev-only backfill/initial-publish callable that skips (never
publishes) any request missing `queueTab`, reported as `skippedNoQueueTab` (5 tests); new Storage
Rules (`generated/studio-print-requests/**` staff-only; `generated/portal-print-requests/customers/
{customerId}/**` gated by a new `customerBelongsToCaller` helper resolving the doc-ID-vs-uid mapping
server-side) plus a new rules-emulator test file (not executable in this environment — no Java —
written and logically reviewed, not live-verified); Studio and Portal consumer services/hooks that
prefer the generated asset and fall back transparently to each app's existing bounded Firestore path
on any failure, with defense-in-depth cross-customer card/item filtering on the Portal side (11
tests) even though Storage Rules already enforce this server-side.

Independent review of the Plan (before implementation): approved_with_changes, 6 findings addressed
in the Plan (novel-rules-helper test requirement, per-manifest retry-budget verification, publish/
queueTab error isolation, backfill sequencing enforcement, exact Portal fallback citation, capacity-
authority guard). Independent review of the implementation (after coding): approved_with_changes, 1
confirmed bug — Studio's "Load more" silently no-op'd for any tab exceeding one page after a
read-model-sourced first load (the Firestore cursor the button depended on was never populated on
that path) — fixed with page-index-based read-model pagination, rebuilt and relinted clean.

Verification: 57/57 focused tests, Functions build, Portal typecheck + production build, Studio
3-target build, changed-file lint (2 findings fixed), no whitespace issues. No deploy, republish,
rules deploy, or production action occurred. Owner approval required before deploying: the new
Storage Rules, the new/modified Functions (`onPrintRequestReadModelInputWritten`, the modified
`onPrintRequestItemQueueTabInputWritten`/`onShowAllocationQueueTabInputWritten`,
`publishPrintRequestReadModels`), and before running the new backfill/initial-publish callable
(dry-run first recommended, sequenced after the existing `queueTab` backfill).

## 2026-07-25 — Pass 5: Print Requests page bounded hydration, approved, deployed, backfill pending human checkpoint

The Print Requests page's previously-flagged unbounded hydration (full request/customer/allocation/
show scans on every mount) is now bounded end-to-end per explicit owner direction: strict bounds
everywhere, exact tab counts never approximated, a maintained field only where exact bounded
counting is genuinely impossible, server pagination, and a gated backfill. Added a maintained
`printRequests.queueTab` field (Working/Queued/Printing/Printed have no raw filterable equivalent
and Firestore can't compound two inequality filters) kept in sync by two new narrowly-scoped
triggers, each O(1) per event (recomputes from only the one affected request's own items/
allocations, never a corpus scan). Rebuilt the service layer with paginated/exact-count/chunked/
direct-ID methods, rewrote the list hook and page to use them, converted every mutation handler to
local reconciliation, and scoped show/customer lookups to only what's actually visible or selected.
Built (but did not run) a resumable, dry-run-capable, idempotent backfill callable for pre-existing
requests. Independent review: approved_with_changes, all 4 findings resolved (a tab-count
decrement bug on delete/archive, a missing internal guard, two dead-code removals). 46/46 focused
tests, all builds/lint/diff-check clean. Deployed the two new triggers plus the backfill callable
(as inert code) to fresh-prints-dev. Studio needs a full restart.

**Pending human checkpoint**: the backfill must be manually invoked by the owner (confirmation
phrase `BACKFILL QUEUE TAB`, dry-run first recommended) before pre-existing requests get a correct
`queueTab` — new/mutated requests already get one automatically via the two deployed triggers.

## 2026-07-25 — Pass 4: 249-read Studio spike attributed and fixed, approved, no Functions change

Deployed Function logs for the exact owner window prove the server side already met its budget: 4
`onPrintRequestItemCreated` executions at 1 read/2 writes/1 transaction each, 4
`onPortalCatalogSnapshotSourceWritten` executions all operational-skip at 0 reads, nothing else running in
or near the window — 8 of 249 reads server-attributed. The remaining ~241 were untraced Studio client
reads: hidden per-add reads in `addPrintRequestItem` (parent read + growing item-list read + read-after-
write) and the Print Requests page's own untraced mount/remount hydration. Fixed the add-path (parent
`increment(1)`, item-list read now skipped via explicit `sortOrder` or a preloaded-items hint that the
actual multi-select add caller now uses — closing a gap the independent reviewer caught in the first
attempt) and added read tracing to the six previously-invisible hot reads so future debug reports attribute
correctly. Independent review: approved_with_changes, both findings resolved. Studio 3-target
build/lint/12 tests/diff-check all clean. No Functions changed or deployed — the trigger/classifier already
met budget. Studio needs a full restart. Known flagged gap (not silently accepted): the Print Requests
page's own hydration is still unbounded and above the ~20-read hard target for a cold/remount visit —
carried from pass 2, requires explicit owner approval before Wave C signoff.

## 2026-07-25 — Pass 3: live cost-test failures remediated, approved, dev-deployed

All seven owner runtime-test evidence items resolved with source/log proof: AI Review's 1,122-tag mount
read fixed (generated taxonomy for display; lazy service call for tag approval — server-side validation
independently rechecks the full corpus); quota double-call proven working-as-designed (per-purpose server
counters, two different purposes); per-path in-flight sharing added to both apps' generated-asset services
(12-misses-for-4-items eliminated); queue fail-then-succeed proven a legitimate rejection of a
different-show retry via deployed logs, with the two real accounting defects fixed (distinct validation
stages + client-visible failureStage, was null); Clear Request stale UI root-caused to missing read-cache
invalidation and fixed with zero-read local reconciliation; startup ~99 reads attributed (4 server via
push no-op, remainder bounded one-time client hydration); deletion accounting added server-side so the
next controlled test verifies `4 + 2I`/`I + 1` live. Independent review: approved, no required changes.
All builds/53 tests/lint/diff green. Deployed: `queuePortalPrintRequestToShow`,
`deleteEligiblePrintRequest`. Full Portal + Studio local restarts required. Next: narrow owner retest.

## 2026-07-25 — Comprehensive eradication pass 2: independently reviewed, dev-deployed, ready for owner cost test

Full one-pass completion per owner directive. Three parallel source audits resolved all four owner evidence
items: catalog-add/creation/metadata/push proven already fixed in current source (owner traces predate the
unrestarted build); the queue-success 1+4+4 reread was still live and is now fixed (two effect-driven
reloads suppressed via synchronous local-transition refs and a one-shot allocation-load guard); deletion has
an exact formula (`4 + 2I` reads, `I + 1` writes, zero post-delete reads/triggers) with the historical
~1,663-read spike reconstructed to the removed unbounded list reload + full allocation scan. New fixes: wipe
reset no-op skips (repeat wipe = reads only, no per-design trigger invocations), Studio item-summary N+1 →
chunked `in` queries, AI Review failed-taxonomy notice. An independent reviewer audited both passes:
`approved_with_changes`, both findings resolved (one fix, one attributed to pre-existing dirty-worktree
work). All builds/tests/lint/diff-check green (49/49 regression + focused suites). The four changed
Functions (`onPrintRequestItemCreated`, `onShowAllocationCreated`, `deleteEligiblePrintRequest`,
`wipeOperationalTestData`) deployed to fresh-prints-dev under the pass-2 authorization. No rules/index/App
Hosting/CORS/republish/production action. Full report + budget table:
`docs/workflow/reviews/2026-07-25-comprehensive-firestore-eradication-pass-2-report.md`. Next: owner
consolidated cost test after full Studio restart + local Portal restart (`npm run dev:portal` +
`npm run tunnel:portal`; no App Hosting).

## 2026-07-25 — Comprehensive Firestore spike eradication (narrowed 5-item scope) ready for approval

An owner-issued comprehensive 12-task/40-test Firestore audit prompt was narrowed to five evidence-backed
fixes after full required reading and a parallelized four-pass operation inventory across Portal, Studio, and
Functions found most of the requested scope re-audits already-correct, owner-approved architecture with no
new regression evidence. Implemented under a self-reviewed Plan/Review amendment: (1) Studio AI Review's
category filter now reads the existing generated client-safe taxonomy snapshot instead of unconditionally
querying Firestore on every mount; (2) Studio's per-request delete/archive reconciles the affected row locally
instead of a full unbounded list reload plus N+1 item-summary reload; (3) Portal's `createPrintRequest` no
longer unconditionally rereads the customer profile after every working-request creation, verified safe since
the one UI reader of the touched field is a loading-state fallback already superseded by the existing list
reload; (4) `onPrintRequestItemCreated`/`onShowAllocationCreated` gained a transactional idempotency guard
against Cloud Functions CloudEvent redelivery double-counting popularity fields — a correctness gap not
previously identified; (5) `deleteEligiblePrintRequest`'s single-request hard-delete flow no longer runs a
redundant third preview computation, dropping reads from 3x to 2x base preview cost for one delete. This last
finding corrects the original task prompt's own assumption: the owner's reported 1,663-read single-request
deletion spike almost certainly came from this triple-preview pattern in the real per-request delete dialog,
not from the separate `wipeOperationalTestData` bulk-wipe tool the prompt's Task 8 had assumed — that tool's
own real, separate full-collection-scan defect is documented but explicitly deferred as dev-only,
owner-triggered, and outside normal-operation budgets.

4 new focused tests pass; existing regression suites for adjacent areas all pass; Functions build, Portal
typecheck/build, full Studio build, changed-file lint (10 files, zero warnings), and diff check all exit 0. 5
pre-existing unrelated DPI/print-sizing test failures confirmed via `git stash` to predate this pass. No
deploy, republish, rules, or production action occurred.

Owner approval required: redeploy `onPrintRequestItemCreated`, `onShowAllocationCreated`, and
`deleteEligiblePrintRequest` to `fresh-prints-dev` (items 4-5 only); full Studio restart and local Portal
rebuild/restart (`npm run dev:portal`, no App Hosting) for items 1-3. Full report and consolidated owner
retest checklist:
`docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-test-report.md`.

## 2026-07-24 — Portal show-queue submission remediation ready for approval

The three queue calls were separate sequential entries through the sole acknowledgment handler, not
automatic/server retries. The first included a cold Function start. Revision `00028-ruk` omitted
failure-stage logging, so the two historical precondition reasons remain unknowable without
guessing.

One auth/request/show-scoped Promise now owns submissions; the hook locks synchronously and safely
permits retry after rejection. Cheap request/show validation precedes corpus reads, and exact
sanitized accounting was added. Catalog-add no longer rereads each returned item. Quota startup
calls share the existing 45-second window. Queue success removes all six observed immediate reload
families through local reconciliation while preserving authoritative later refreshes.

Focused tests 20/20, Portal typecheck/build, Functions build, lint, and diff check pass. No
deployment occurred. Pending owner approval: the queue and catalog-add dev Functions plus Portal
App Hosting, then the documented double-click/failure/idle retest.

## 2026-07-24 — Residual Portal server Firestore remediation ready for owner approval

The exact 02:34–02:43 UTC invocation graph is now known. Ten catalog adds arrived as two concurrent
five-call groups against one parent request, causing the deployed transaction to reread its parent
and growing item query on retries. Ten item-created analytics triggers, three clear calls, and one
explicit show-picker call were the only other unaccounted Firestore-capable requests. Push and
metadata account for 13 exact server reads. All nine deletes belong to the three clear calls; the
old uninstrumented revision cannot prove their per-call split. All catalog snapshot triggers were
operational zero-read/zero-write skips, and no legacy ready-design metadata query ran.

Portal now serializes same-request catalog mutations. Scoped development accounting measures
transaction attempts and returned documents. The analytics trigger removes its redundant existence
read; an empty clear is a zero-write/delete no-op; clear and show-picker paths report exact aggregate
counts. Focused tests 6/6, Functions build, Portal build/typecheck, and changed-file lint pass.

No deployment or production action occurred. Pending approval: rebuild/restart the Portal dev
revision and deploy only `addPortalCatalogDesignToPrintRequest`,
`clearPortalWorkingPrintRequest`, `onPrintRequestItemCreated`, and
`listPortalAllocatableShows`, then perform the documented isolated five-minute retest.

## 2026-07-24 — Portal print-request remediation ready for owner retest

The four-item request spike was caused by overlapping shell, Current Request, route-detail,
allocation, and duplicate design-summary loaders. Portal request reads now share an auth-scoped,
bounded 30-second service cache with in-flight dedupe, shell priming, rejection eviction, mutation
invalidation, and stale-completion protection. Route allocation math reuses loaded items. Request
cards resolve generated public card buckets first with an explicit trace before bounded Firestore
fallback; the route's second resolver is removed and late item IDs rerun generated resolution, fixing
first-navigation generic cards.

The Firebase Debug popup keeps its sanitized pre-refresh segment, reconnects to a refreshed owner,
and copies a versioned multi-segment report with an owner-refresh boundary. The exact 14 writes are:
2 working-request creation writes + four item/parent pairs + four design-analytics trigger writes.
Dev accounting now records the sanitized write classes. Portal typecheck/build, Functions build,
focused tests, lint, and diff check pass. No deployment or production action occurred; owner Portal
print-request retest is next.

## 2026-07-24 — Portal metadata read reduction ready for deployment approval

Portal R-015 remains passed. Global social metadata now follows the existing one-hour freshness
rule with bounded/in-flight shared caching. Library mode uses the already-published generated
newest-card page rather than reading 40 designs from Firestore: expected cache-hit/library-miss/
logo-miss Firestore reads are 0/1/2 respectively. Function accounting is aggregate and sanitized.

Push session sync reuses the current FCM token; unchanged subscriptions skip the current write;
older-sibling reconciliation stays bounded at 25 with aggregate accounting. The remaining audited
Portal Firebase SDK calls now have service-level tracer lifecycle coverage, with a static coverage
test confirming the surface and the continued absence of `addDoc`/`runTransaction`.

No deploy, republish, rebuild, rules, or production action occurred. Pending owner approval:
`getPortalGlobalOpenGraph`, `registerWebPushSubscription`, and Portal App Hosting in dev.

## 2026-07-24 — Portal R-015 passed; residual reads attributed to server metadata

The live generated-catalog retest passed with an active report showing zero client Firestore reads,
writes, listeners, callables, fallbacks, and errors. Generated success and Storage activity were
present. R-015 stays closed.

The dominant residual Console reads are repeated `getPortalGlobalOpenGraph` executions from Next
metadata loading. Each library-mode execution reads one settings document plus up to 40 ready
designs; seven retained executions in the requested UTC interval account for up to 287 server reads
that the browser tracer cannot see. A push-subscription execution immediately before the interval
can explain one two-write bucket, but the remaining two writes are not attributable from logs.

The Portal SDK audit found coverage gaps. Brand-logo listener tracing and notification
acknowledgement-write tracing were added. Remaining feature/action-only gaps and exact isolated
retest steps are documented in
`docs/workflow/reviews/2026-07-24-portal-residual-firestore-attribution-report.md`. No deploy,
republish, rules, generated-asset, or production action occurred.

## 2026-07-24 — Portal R-015 generated-first correction ready for owner retest

The attributable Portal report showed legacy catalog pages/counts running concurrently with healthy
generated assets (166 returned documents; 171 approximate billable reads) and false debug popup
disconnects caused by a three-second background-timer heartbeat.

Every normal Portal catalog mode now starts generated-first with no speculative Firestore query or
count. Filtered/discovery failures fail closed; only plain browse may use the approved bounded page
after terminal generated failure and a fallback trace. The independent Discover count and redundant
print-limit focus/visibility reads are removed. Popup connection survives focus/visibility/long-idle
changes and becomes unavailable only on explicit owner close/refresh (or initial handshake failure).

Portal typecheck/build, focused tests 40/40, changed-file lint, and diff check pass. No deployment,
republish, rules, Functions, generated-asset, or production action occurred. Next checkpoint: owner
Portal R-015 retest with a newly built/restarted Portal renderer.

## 2026-07-24 — Portal Firebase Debug moved to a separate browser window

The owner’s Portal R-015/idle report was inactive (`startedAtIso: null`) because the shortcut opened
the in-page UI without starting the tracer. The normal eligible Portal tab now starts and owns the
trace independently and publishes sanitized snapshots to one named 485 px `/firebase-debug` popup
over `BroadcastChannel`. Reset/enable/disable return to the main tab; popup closure preserves the
session; owner refresh replaces its identity; direct/stale access fails closed; inactive reports are
explicitly labeled.

Portal typecheck/build, focused tests 21/21, changed-file lint, and diff check pass. No browser was
available for live automation, so owner two-window testing is next. The earlier 223-read and idle
spikes remain unattributed and must not be diagnosed from the invalid empty report.

## 2026-07-24 — Studio background-edit remediation signed off

**Owner verdict: PASS WITH NOTES.** The isolated test passed immediate card refresh, route-remount
persistence, immutable created-date ordering, generated healthy-path loading, zero broad taxonomy/
ready-design client reads, and targeted card-only publication without the prior approximately
1,221-read full pass. Firebase Console measured 3 reads/1 write; Studio traced the one approved
authoritative editor-opening read and one successful write; the targeted Function measured zero
Firestore reads. Two additional aggregate Console reads remain unattributed and non-blocking.

The separate restart-inclusive 69-read/0-write Console minute included Studio startup and Inbox
loading and does not replace the isolated measurement. This closes only the Studio generated-catalog
background-edit and targeted-publication remediation. Wave C remains open; next is the owner’s live
Portal dynamic AND-tag narrowing retest (R-015), followed by the remaining consolidated Wave C QA.

## 2026-07-24 — Targeted publication live attribution and bounded accounting

The 19:01 UTC owner edit produced exactly one `onPortalCatalogSnapshotSourceWritten` execution:
`card-only`, targeted, pass 1, HTTP 200, 1,416 ms. Its deployed accounting reported zero
ready-design, category, tag, and coordination Firestore reads. No full publisher, Firestore
transaction, retry, duplicate trigger, concurrent publication, or other Function execution appeared
in the inspected minute. The targeted Function therefore accounts for zero of the Console's
approximate 110 reads; Studio accounts for its one authoritative editor-opening read. The remaining
rounded reads cannot be attributed to a caller from the available aggregate graph/logs without
guessing.

Dev accounting separates manifest reads/writes, override reads, transaction attempts,
precondition retries, and Storage download/write/metadata operations. Identical duplicate delivery
is an idempotent no-op and CloudEvent time makes publication metadata deterministic. Concurrency
safety, immutable assets, and the three-attempt retry bound remain. Functions build, 55 focused
tests, changed-file lint, and diff check passed; the subsequent isolated owner retest is signed off
above.

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-25** (`firestore-usage-efficiency-wave-c` — comprehensive Firestore
> eradication narrowed-scope pass ready for owner Functions redeploy + restart + retest; Portal
> separate debug window and Studio background-edit remediation remain signed off/pending as before)

---

## At a Glance

| Field | Value |
|-------|-------|
| **Active managed goal** | `firestore-usage-efficiency-wave-c` |
| **Phase** | Owner QA — Studio remediation signed off; comprehensive eradication pass (5-item scope) implemented, pending Functions redeploy + restart + retest; Wave C remains open |
| **Human checkpoint** | **yes — redeploy 3 Functions + restart Studio/Portal + retest 5-item scope, then Portal separate debug-window retest, then R-015** |
| **Prior goals** | `firestore-usage-efficiency`, `portal-seo-foundations`, and `portal-how-to-faq` DONE |
| **DONE** | **no** |

> Latest implementation: Studio's authoritative saved-card override now lives in a service-scoped
> authenticated session rather than route component state, survives `/designs` unmount/remount,
> preserves `createdAtMs`, overlays stale generated assets, and clears only when generated public
> fields match, status leaves ready, or auth scope ends. The design trigger classifies card-only,
> index/filter, and operational changes. Card-only writes publish an immutable content-addressed
> override asset from the event payload with generation-preconditioned manifest merge/retry and
> zero corpus queries; operational-only writes skip publication; index/filter changes retain the
> full publisher. The isolated owner retest passed with one traced client read/write and zero
> targeted-Function Firestore reads. Focused tests 91/91 and builds/typecheck/lint/diff pass.

> Small debug-window usability update: its default width is now 485 px, it opens directly beside
> Studio on the same monitor when screen space permits (right first, then left), and wide report
> tables scroll inside the fixed-width panel. Placement/lifecycle tests 9/9 and Studio build pass.

> Latest correction: the edit modal discarded the persisted `Design` returned by `updateDesign`,
> then the page performed a second read, patched only generated index fields, and deleted the
> visible card. Since visible IDs did not change, resolution did not rerun; the card disappeared and
> the service cache still held its stale background. The returned save object now passes through
> explicit generated entry/card mappers, preserving `createdAtMs` while updating all card-visible
> metadata immediately. Only the affected bucket is invalidated. Bucket parsing/materialization is
> memoized with duplicate and concurrent in-flight reuse. Sanitized reconciliation traces contain
> an opaque design hash and booleans only.
>
> Read-only dev logs show one snapshot-trigger execution at 18:22:17 UTC, HTTP 200 after 33.8 s,
> with retry disabled and no other Function in that minute. Logs lack query counts, so exact
> attribution of the Console's approximate 669 reads remains `[NEEDS SERVER TRACE CHECK]`. Current
> code reads ready designs plus active categories and approved tags once per publication pass, with
> coordination reads; background color is an intentional public card field. No Functions or
> publication architecture changed.

> Latest owner retest reached the healthy generated asset path but exposed a renderer crash:
> generated ready-index filter records were passed to the Firestore comparator, which called
> `createdAt.toMillis()` even though generated records carry numeric `createdAtMs`. The page now
> sorts healthy generated results through an explicit numeric boundary (`createdAtMs DESC`, design
> ID DESC tiebreaker) and reserves Timestamp sorting for archived/bounded-fallback Firestore
> records. Missing sort data is placed last and cannot crash. The focused generated-sort/load/
> fallback suite is 30/30; changed-file lint and Studio renderer/main/preload build pass. No error
> boundary was added because the architecture has no matching route-level pattern and the root bug
> is fixed directly. No deploy, republish, snapshot rebuild, or production action occurred.

> Post-publication owner Portal QA found two regressions (tag modal, "BEST" search pagination) plus a
> Firestore read spike. A review pass found the first fix's Firestore fallback was still unbounded and
> its search fix used the wrong order (alphabetical instead of the established "newest first"). Both
> corrected: the Firestore tag fallback was removed entirely (owner decision — no correct bounded
> alternative exists) for a graceful "unavailable" state; a new pure `portalCatalogBrowseOrder`
> preserves the correct order through search pagination. An inconclusive Portal build report was
> corrected (tool-timeout artifact, not a real failure — confirmed exit 0).
>
> Owner then republished generation 9 and re-ran local QA: **still FAIL**, same two symptoms plus the
> read spike. Diagnosed via a live outside-browser Node script (using the real shared parsers) that
> generation 9's manifest/tag-facet/search-shard assets are all correct; the owner then supplied the
> exact browser console error, confirming the real blocker is **Storage bucket CORS**
> (`https://myprintrequest.dev` blocked reading `firebasestorage.googleapis.com` responses). Confirmed
> the exact live bucket (`gs://fresh-prints-dev.firebasestorage.app`; the legacy `.appspot.com` alias
> 404s) and found the repo's pre-existing, unrelated CORS file/doc (from an unused Assisted Creation
> proof-download effort) targeted the wrong bucket name entirely — corrected both to the right bucket
> and a narrower GET/HEAD-only config. Independently found and fixed a second real defect: Portal's
> search/multi-tag code silently fell through to an unrelated, unfiltered Firestore page on any
> generated-asset failure (CORS included) — removed that fallback entirely for a graceful
> "unavailable" state; normal unfiltered browse keeps its separate, already-approved bounded fallback.
> Reviewed Studio's actual search/tag-filter code for parity and found Portal's existing ordering,
> substring-search, and tag-count conventions already correctly match it — no parity defects found.
> `gcloud` isn't installed in this environment, so the live CORS-inspection command is provided for the
> owner/CI rather than run here. Awaiting owner approval to apply the corrected
> bucket CORS configuration (`gcloud storage buckets update
> gs://fresh-prints-dev.firebasestorage.app --cors-file=storage.cors.json`), then a real browser
> retest. No Functions/Rules/republish action is required for this pass's fixes. The Portal
> dev-consumer deployment from an earlier checkpoint remains separately pending.
>
> **Update:** owner applied the CORS fix — generated Portal assets now load in the browser, and
> searching "best" correctly returns both matches immediately. New refinement requested: after
> selecting a tag in the tag modal, unrelated tags stayed visible with stale global counts instead of
> narrowing to the AND-filtered result (a feature gap, not a regression from the earlier fixes).
> Investigated whether existing generated assets are sufficient (per the task's Option A/B decision
> framework) and concluded yes: the existing per-tag design-ID list asset (already fetched for
> search/filtering) plus existing card-bucket assets (already fetched to render results) give exact
> AND-narrowed co-occurrence counts with zero new generated assets, zero fetch per candidate tag, and
> zero Firestore reads. Implemented `portalCatalogAssetService.listNarrowedTagFacets` with pure,
> unit-tested helpers (`intersectDesignIdLists`/`computeNarrowedTagFacets`), verified against live
> generation-9 data via a standalone diagnostic before writing tests, and wired it into
> `CatalogTagFilterModal`. 7 new tests (99 total). Portal-only fix — no Functions/manifest change, no
> redeploy/republish required. `npm run build:portal` could not be confirmed clean this pass (the
> owner's `dev:portal` was running again, holding `apps/portal/.next` locked — the same file-lock
> contention as the prior pass, not a code defect); typecheck already confirms compile-correctness.
> R-015 remains open pending owner review and retest of this refinement.
>
> **Update (2026-07-24):** owner decided to extend the same low-read generated-catalog architecture
> to Fresh Prints Studio's Design Library, keeping Studio's existing UX (search, category/tag/
> halftone filters, dynamic narrowing, `updatedAt DESC` ordering, 100-page size, request-selection
> mode) completely unchanged — only the data-delivery layer moves off Firestore. Full Plan/Review
> amendment completed and approved: reuse existing public Portal card buckets + client taxonomy; add
> one new compact asset `generated/portal-catalog/v{contentVersion}/studio/ready-index.json`
> (`id/title/description/categoryId/tags/updatedAtMs` per ready design, Studio's own order); Electron
> **main-process IPC transport** (not browser CORS) to avoid packaged Electron's `file://` origin
> risk; archived designs stay entirely Firestore-only (never enter the public asset, matching the
> staff-only security boundary); owner approved making dynamic tag narrowing catalog-wide accurate
> (fixing an existing loaded-pages-only limitation) as an intentional improvement.
>
> Implementation is now complete: new shared types/parser, publisher asset write, a new Electron
> `catalogAsset` IPC bridge (channel registry, main-process handler, preload bridge), a Studio
> consumer service mirroring Portal's cache pattern, a `useGeneratedReadyDesigns` hook, and
> `DesignLibraryPage.tsx` wiring — normal ready browse now sources its design list from the
> generated catalog while reusing Studio's exact existing filter/search/narrowing functions
> unchanged; archived mode, detail/edit (always re-fetches authoritative Firestore data first), and
> request-selection mode are preserved. 19 new tests this pass (138 total in the relevant suite, all
> pass), rules 8/8 (proved the new Storage path needs no rules change), functions/Portal/full-Studio
> builds all exit 0, lint clean (one confirmed pre-existing unrelated lint finding disclosed, not
> introduced by this pass). Developer runtime read-trace verification could not be performed in this
> environment (no Electron/browser automation tooling, no active Studio session) — disclosed
> honestly rather than fabricated; a manual test script is provided. No Functions/Rules/CORS change
> applied. Redeploy of `rebuildCatalogSnapshots`/`onPortalCatalogSnapshotSourceWritten` (same two
> already pending) plus one republish are required before an owner Studio retest.
>
> **Update (2026-07-24):** owner republished generation 38 and independently validated the live
> manifest/ready-index (correct at the time, against the then-current ordering rule). Owner then ran
> Studio QA and found two problems: (1) the Design Library visibly reshuffled when a design was
> added to a print request, allocated to a show, or edited; (2) ~1,300 Firestore reads during the
> session. Root cause of (1): the generated ordering field (`updatedAtMs`) is bumped by exactly those
> writes. **Owner decided ordering must use the immutable `createdAt` field instead.** Investigated
> every `designs` document-creation path in the repo — both write `createdAt` unconditionally via
> `serverTimestamp()`; Firestore rules forbid changing it on update; no evidence any legacy design is
> missing it — so no backfill was needed. Changed the generated ready-index's ordering field from
> `updatedAtMs` to `createdAtMs` (field rename, same schema version, zero Portal impact) and added 10
> regression tests proving request/show/edit activity never moves a design and a newly created
> design always appears first. Attributed the ~1,300 reads via direct code inspection (no live
> session/automation tooling available): reconciles almost exactly to `useCatalogTags`'s full
> tag-collection pagination (~1,122 reads at the real dev corpus) plus `useCategories()`'s bounded
> load (≤200 reads) — both pre-existing, unconditional on every Design Library mount, and unchanged
> since before the Studio generated-catalog work began; not a new regression. Surfaced (did not
> unilaterally fix) that `useCategories()` should already have been converted to the generated
> client-safe taxonomy per the original Plan text — a real gap worth up to 200 fewer reads, but
> outside this specific task's scope. 148/148 tests pass, rules 8/8 unaffected, functions/Studio
> builds exit 0. No Functions/Rules/CORS applied. The same two Functions need a further redeploy
> (live generation 38 still has the old ordering) plus one more republish before an owner retest.
>
> **Update (2026-07-24):** owner directed closing the surfaced taxonomy read gap. Converted
> `DesignLibraryPage.tsx`'s normal-mode categories/tags to the existing, already-published
> `generated/catalog-reference/**` client-safe taxonomy snapshot — the same one Portal already
> publishes/consumes. No new asset, no manifest/publisher change, **no Functions redeploy or
> republish required for this fix**. Confirmed by direct inspection that only `id/name/sortOrder/
> isActive`/`id/name/aliases/status` are ever read by the Design Library's own filter/dropdown/
> tag-picker logic — `CategoryManagementModal`/`TagManagementModal` (real management flows) stay on
> full Firestore-backed data unchanged. One owner-approved narrow behavior change (via
> `AskUserQuestion`): tag-modal search no longer matches each tag's `preferredWhen` guidance text
> (server-only, correctly excluded from the public snapshot) — name/alias matching is unaffected. 7
> new tests (155 total), rules 8/8 unaffected, all builds exit 0. The `createdAt`-ordering fix still
> needs its own Functions redeploy + republish; both fixes ship together in the same Studio build.
>
> **Update (2026-07-24):** owner directed building a separate, development-only Firebase Debug panel
> (Ctrl+Shift+F in both Studio and Portal, restricted to `fresh-prints-dev` + development builds only)
> to capture and attribute real Firebase activity — reads by collection/query/route/returned-doc-count,
> listener attach/emit, writes, callables, Storage JSON requests, cache hits/misses/fallbacks, route
> changes, session totals, Copy Debug Report JSON — **before** guessing at the Design Library
> card-refresh bug, the ordering-reshuffle-on-save bug, or the ~1,300-read spike. Explicit instruction:
> implement the tracker and run the workflow, don't assert root cause from code alone. Extended the
> existing shared tracer (not a new framework) with write/callable/Storage-asset/route/action
> instrumentation; added a `fresh-prints-dev`-only + dev-build-only gate; built the Ctrl+Shift+F
> shortcut, a pure report formatter, and a live-polling panel UI for both apps; wired real
> instrumentation into both apps' generated Storage catalog-asset services plus Studio's design-save
> write path and Design Library save action (callable-site wrapping deliberately deferred as
> out-of-scope this pass). Found and fixed one render-purity defect during review (a trace-context call
> in Studio's `AppShell` render body, corrected to `useLayoutEffect`). 17/17 focused tests pass (9 new).
> Did **not** fix either suspected bug or attribute the read spike — this environment has no
> Electron/browser automation tooling to run the required 10-step diagnostic workflow, so that step
> needs the owner: launch Studio, open the panel, run the workflow, and share the Copy Debug Report
> JSON so the four required findings can come from real captured data. No deploy, redeploy, republish,
> or `rebuildCatalogSnapshots` run this pass. The `createdAt`-ordering fix's own pending redeploy +
> republish (above) is unaffected and still separately required.
>
> **Update (2026-07-24):** owner correctly rejected the panel as not ready for testing — callable
> tracing wasn't wired to real call sites, and write tracing covered only one file. Required before any
> owner checkpoint: centralized callable/write tracing across Studio and Portal, kept in
> services/hooks (never components) per the coding standards' layer rules, each event recording
> route/action/service/operation/success-failure/duration/sanitized counts, no document contents or
> payloads ever recorded, and tests proving callables/writes appear in the report. Added `durationMs`/
> `success` to the tracer schema; new shared `runTracedCallable`/`runTracedWrite` wrapper primitives
> and per-app `callTracedFunction` factories; converted **every** real callable call site across both
> apps (32 files — confirmed via grep that zero raw `httpsCallable(` usage remains outside the two
> wrapper files) and wired `runTracedWrite` into every remaining Firestore write in Design Library,
> design editing, print requests, show allocations, and staff inbox (8 Studio service files, multi-doc
> batch/transaction write counts verified against actual code, not guessed). Enriched the report/panel
> with success/failure/average-duration on callables and a new by-write-kind breakdown. 21/21 focused
> tracer tests pass (4 new). Reviewed every converted file directly rather than trusting the
> implementing pass's self-report: confirmed zero tracing calls in any component file, zero
> payload/document leakage into trace metadata. Ran the full project-wide focused suite: Studio
> 358/363 (5 pre-existing unrelated DPI-sizing failures, confirmed via `git stash` to predate this
> pass), Portal 160/160, shared 809/810 (1 pre-existing unrelated `firestore.rules` alignment
> failure) — no new failures introduced. Still did not fix either suspected bug, attribute the read
> spike, deploy, redeploy, republish, or run `rebuildCatalogSnapshots`. Awaiting the owner's live
> 10-step diagnostic workflow + Copy Debug Report.

---

> **Update (2026-07-24 — separate Studio debug window):** the in-renderer overlay was not usable for
> the owner workflow because it covered Studio navigation. A narrow Plan/Formal Review amendment was
> added and approved for the required IPC boundary. Ctrl+Shift+F now requests a singleton Electron
> debug window; repeat presses restore/focus it. The main renderer remains authoritative for the
> trace session and publishes sanitized snapshots through preload → Electron main → debug renderer.
> Reset and enable/disable commands return to the main renderer; closing/reopening the debug window
> does not clear the session. The debug renderer mounts no Studio routes. Electron main independently
> enforces unpackaged development runtime, exact `fresh-prints-dev`, and retained-main-window sender.
> Focused debug/tracer suite 34/34, Studio Vite renderer/main/preload build, Portal override
> typecheck, changed-file ESLint, and diff check pass. Full standard typecheck remains blocked by the
> known TS5103 setting; Studio's approved override reports only pre-existing unrelated errors. Portal
> build timed out after 124 seconds without output and is recorded as inconclusive. No deployment,
> republish, snapshot rebuild, production action, or bug/read-spike diagnosis occurred.

> **Update (2026-07-24 — live-report corrections):** owner evidence showed the panel's old `Reads`
> total was SDK operation count (5 operations versus 1,221 returned documents) and that normal
> Design Library startup launched Firestore categories, all 1,122 tags, and an 81-design page in
> parallel with generated assets. Code inspection verified unconditional legacy hooks—not merely a
> stale-build theory or premature fallback. Report schema v2 now separates read operations,
> documents returned, approximate billable document reads, listener initial documents, and listener
> update documents; minimum one-document query charges are applied where observable and limitations
> are explicit. Design Library now disables legacy category/tag/ready-design hooks on healthy
> generated browse; fallbacks begin only after corresponding generated failures; archived mode is
> unchanged. Focused 30/30, Studio build, Portal override typecheck, lint, and diff check pass. No
> deploy, republish, rebuild, production action, or unrelated bug fix.

> **Update (2026-07-24 — generated-first-v3 runtime audit):** failed owner retest still showed the
> exact pre-gate 1,221-document pattern and no fallback event. Repo-wide caller inspection found only
> one routed DesignLibraryPage and no selection-mode duplicate. Its current initial/loading policy is
> generated-only. Process inspection found no Studio Vite/Electron process, while the freshly built
> bundle contains the gate markers; local builds cannot update a packaged or already-running Studio.
> Hardened the runtime path with explicit taxonomy `loading/ready/failed/inactive` state, terminal
> failure-only fallback, stale Strict Mode mount cancellation before ready-design fallback, and
> generated success/failure/fallback events carrying `generated-first-v3`. Focused 36/36 and Studio
> build pass; Portal override typecheck, lint, and diff check pass. Owner must fully close Studio,
> stop any old Studio Vite process, run `npm run dev:studio` from this checkout, and verify the report
> contains `generated-first-v3`; its absence proves the wrong renderer is running.

> **Update (2026-07-24 — actual generated failure):** exact-path live verification through
> Electron main's real fetch function and shared parsers passed all four objects (HTTP 200): taxonomy
> manifest/client v8 and Portal manifest/Studio ready-index v40. Both failures shared one renderer
> cause: Node-only `Buffer.byteLength` ran after successful IPC JSON parsing in a context-isolated,
> Node-disabled renderer, before shared schema parsing. Replaced with `TextEncoder`. Added sanitized
> stage/code/status/duration storage completion tracing across URL, IPC, allowlist, HTTP, JSON,
> schema, manifest-path, and ready-index-path stages. Removed normal taxonomy Firestore fallback;
> failure now shows unavailable, while management modals retain deliberate Firestore access. Bounded
> ready-design fallback remains. Focused 39/39, live main-fetch 4/4, Studio build, Portal override
> typecheck, lint, and diff check pass. No deployment or publication action.

> **Update (2026-07-24 — monitor placement):** newly created Firebase Debug windows center on the
> monitor containing the main Studio window. Existing debug windows retain owner placement when
> refocused. Placement/lifecycle tests 7/7 and Studio build pass.

## Workflow Snapshot

```txt
Mode:           managed-phase
Active:         firestore-usage-efficiency-wave-c
Phase:          owner QA; comprehensive Firestore eradication (5-item scope) implemented, pending
                redeploy/restart/retest; Studio background-edit remediation signed off
Prior closed:   firestore-usage-efficiency; portal-seo-foundations; portal-how-to-faq
Human:          yes — redeploy onPrintRequestItemCreated/onShowAllocationCreated/
                deleteEligiblePrintRequest, restart Studio + Portal, retest 5-item scope; then
                Portal dynamic AND-tag narrowing retest (R-015)
Next:           Owner Functions redeploy + restart + comprehensive-eradication retest, then Portal
                R-015 retest, then remaining consolidated Wave C QA
Queued later:   portal-google-analytics; production-release
```

## Active: firestore-usage-efficiency-wave-c

- Plan: `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md`
- Highest-priority gate: prove and contain reads that continue while idle before snapshot/catalog work.
- Static findings: Studio/Portal/tunnel processes were running; AI reference cache is 60s without
  in-flight dedupe; Studio Design Library uses `loadAll`; Portal search/multi-tag full-hydrates;
  Discover uses 4x80; global Staff Inbox listeners are unbounded.
- Review: `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md`
  (`approved_with_changes`).
- Plan amended with private/public Storage boundaries, exact publication coordinator, generated
  search now, Studio `updatedAt DESC` pagination, numeric budgets, and deployment checkpoints.
- Phase 0 default-off client and AI Functions diagnostics are implemented and locally validated.
  The static operation inventory and owner shutdown instructions are in
  `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-phase-0-operation-inventory.md`
  and `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-phase-0-isolation-checkpoint.md`.
- Changed-file lint, Portal typecheck/build, Functions build, and focused tracer tests pass.
  Studio build remains blocked by known TS5103; repository-wide lint retains pre-existing debt.
- Evidence-backed Internal Gate 1 containment is implemented: bounded Design Library, shared
  long-lived user/project-scoped taxonomy/design dedupe, AI active-page/count containment, Print
  Requests design-ID loading, Staff Inbox bounds, and corrected trace route/pagination correlation.
- The first owner smoke **failed**: rounded Firebase moved `34K` / `67.9%` to `36K` / `71.7%`
  across the entire run, and Print Requests emitted Chromium navigation throttling then froze.
  Its trace also proved Inbox idle quiet and listeners stable with no duplicates.
- Print Requests primary status routing has one URL authority. An authenticated controlled run
  completed 20 transitions, populated/empty tabs, and back/forward with no warning, freeze, reload,
  loop, or error. A 60-second Inbox idle produced zero events and listeners stayed 7 -> 7.
- The owner then clarified the primary tabs pass but Working's secondary Active/Stale controls
  reverted after selecting a request in Empty/All. Source proved a deep-link reveal effect forced
  the local filter back to All to preserve the old request.
- Working filters are now canonical URL state. A click preserves a compatible request, otherwise
  selects the first destination request or clears selection, and creates exactly one history entry.
  Passive normalization preserves filter intent.
- Authenticated Electron passed Empty/All → Active/Stale, Back/Forward, and route exit with one
  commit per click, zero reversion, warnings, errors, freezes, or catalog/taxonomy starts.
- 46/46 focused tests, changed-file lint, and Studio renderer/main/preload Vite build pass.
- Owner passed all six corrected Working-filter checks. Phase 0 verdict is `passed_with_notes`; the
  note is limited to Firebase dashboard rounding/reporting delay during the earlier broad smoke.
- Remaining reviewed Wave C local implementation is complete. The versioned AI/client taxonomy
  snapshots, Portal Discover/search/tag/card assets, 40-card paging, design-ID cache, progress-poll
  containment, security rules, rollback flags, and deployment records are implemented.
- Local results: 69/69+ combined tests pass; Functions, Portal, Studio, lint, and diff checks pass.
  The official rules harness was executed on a Java 21-equipped environment (user-scoped portable
  JDK, no admin rights) after two missing narrow assertions were added; 6/6 rules tests pass. All 24
  npm audit findings were reviewed; none were introduced by Wave C. A pre-existing `sharp` EXIF DoS
  finding (reachable via customer uploads) is tracked as `docs/project/RISK_REGISTER.md` R-012 and is
  not treated as a deployment blocker (bounded impact, requires its own major-version upgrade).
- Owner approved and ran the first dev deployment. First `rebuildCatalogSnapshots` initialization
  attempt failed twice with HTTP 500. Root cause proven via `firebase functions:log`:
  `snapshot-asset-budget-exceeded` on the AI catalog reference snapshot — the real dev tag corpus
  (~1,122 approved tags) serializes to exactly 295,152 bytes (~288.2 KB), over the original 256 KiB
  budget; the client-safe snapshot (~161 KB) stays under budget. This was R-013, a measured
  architecture conflict requiring an explicit owner decision.
- Owner decision: raise only the AI-private snapshot budget to 512 KiB (524,288 bytes) — no
  sharding, no other budget/field change. Implemented in `publishCatalogSnapshots.ts` alongside a
  non-blocking 80%-of-512-KiB (409,600-byte) diagnostic warning for future growth. The real dev-scale
  payload (295,152 bytes, 56.3% of the new ceiling) now fits with headroom and does not trigger the
  warning. The existing safe error-mapping fix (specific `failed-precondition` instead of opaque
  `INTERNAL`) is preserved. Wave C Plan and Formal Review amended in place with the owner decision
  and rationale; ADR-FP-120 amended (not a new ADR). 9 new regression tests added (15 total across
  the two affected files) proving: the dev-scale fixture now publishes; the 80% warning boundary
  behaves correctly; an intentionally oversized fixture still fails safely with the stable code; and
  Portal/public budgets remain untouched. All verification re-run clean (rules 6/6, functions build,
  Portal/Studio builds, 25/25 focused tests, lint, diff check).
- Redeployment scope determined precisely: `rebuildCatalogSnapshots`, `onCategorySnapshotSourceWritten`,
  and `onTagSnapshotSourceWritten` share the changed `publishReference()` logic and need redeploying;
  `onPortalCatalogSnapshotSourceWritten` does not (its `publishPortal()` path is untouched).
  `portal-catalog` publication likely succeeded in the prior failed attempts (no error logged for
  it), still unconfirmed against live state (direct Admin SDK inspection remains blocked by this
  environment's credential-access classifier). No redeploy, retry, initialization, or import
  occurred. R-013 stays open until a live retry succeeds and the resulting AI asset size is recorded.
- Owner redeployed the R-013 fix and retried. The callable returned a second, distinct confirmed
  failure: `{ code: "snapshot/payload-budget-exceeded", kind: "portal-catalog", path:
  "generated/portal-catalog/manifest.json" }`. Measured root cause: the Portal catalog root manifest
  enumerated a full Storage path per tag/category/search-shard/card-bucket/browse-page — at Fresh
  Prints Dev's real scale (~1,122 tags, 18 categories, 202 shards, 128 buckets) this measured
  134,069 bytes (130.9 KB), 4.09x over the 32 KiB budget; `tagPaths` alone was 106,591 bytes (79.5%
  of the total). Opened R-014. Fixed by replacing the enumeration with deterministic path templates
  and bounded count/version metadata (`PortalCatalogManifest` schema bumped 1→2 — manifest shape
  only, every individual generated asset keeps schema version 1); a compact ~1 KB
  `existingShardKeys` list is kept so search-miss behavior (skip a network request for a
  zero-match shard) is unchanged. Corrected manifest measures 2,179 bytes (2.13 KB, 6.6% of budget,
  ~61x smaller). This is recorded as an implementation correction under the already-approved Wave C
  architecture (deterministic addressing for oversized generated assets was already the plan's
  stated principle) — no Plan/Review amendment was required. `publishPortal()` (shared by
  `rebuildCatalogSnapshots` and `onPortalCatalogSnapshotSourceWritten`) changed;
  `onCategorySnapshotSourceWritten`/`onTagSnapshotSourceWritten` did not.
- Owner redeployed both fixes and ran `rebuildCatalogSnapshots` exactly once. Both families
  published successfully at generation 4 (`catalog-reference`: `4-1a810751ceb2b381`;
  `portal-catalog`: `4-e0e5b3ae9fb69797`). Confirmed live via unauthenticated public HTTPS reads
  against the real Storage/Firestore REST endpoints (no credentials needed for public paths): both
  manifests fetched and match the callable result exactly; the AI asset confirmed private (403 on
  read and metadata); client/Portal assets confirmed public; unauthenticated write and
  coordination-doc read confirmed denied; representative Portal assets (Discover, a recent page, a
  real 45-design category filter, a category page, a card bucket at 2,238 bytes, a search shard) all
  confirmed live and correctly addressed via the new templates. Orphaned v1–v3 catalog-reference
  client assets from the earlier failed attempts remain present, harmless, and retained. R-013 and
  R-014 closed in `docs/project/RISK_REGISTER.md`. The Portal catalog manifest is schema version 2;
  the Portal consumer code was updated to match but has not been deployed. Confirmed the exact Portal
  dev deployment command (`firebase deploy --only apphosting --project fresh-prints-dev`) against
  `firebase.json` and `docs/standards/DEPLOYMENT.md`; the generated-snapshot flag
  (`NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS`) defaults to enabled, and the documented rollback
  flag is unchanged. Re-ran Portal typecheck/build, 35/35 focused tests, lint, and diff check — all
  exit 0. Did not deploy Portal, retry snapshot publication, or run the controlled import.
- Owner ran local Portal QA against the live generation-4 snapshots; recorded **FAIL**. Found: tag
  modal showed the complete ~1,122-tag approved taxonomy with no design counts and no zero-result
  exclusion; searching "BEST" showed only 1 of 2 matching designs until Load more; Firestore Product
  Usage rose ~3,600 reads. Root causes diagnosed precisely: `listApprovedTags()`'s generated path had
  no bounded facet/count data source (Wave C removed the pre-Wave-C client-hydration mechanism
  without a generated replacement); its Firestore fallback queried the full `tags` collection
  unbounded; `listMatchingDesigns()` combined candidate ID sets with no deterministic sort before
  slicing into a page, relying on non-guaranteed Set/Firestore iteration order. Fixed: new compact
  `generated/portal-catalog/v{version}/filters/tags-facet.json` asset (tags with ≥1 ready design +
  count, 256 KiB budget) plus an additive `filters.tagFacetPath` manifest field (schema version
  unchanged at 2); rebounded the Firestore fallback to a ready-design scan; new pure
  `planPortalCatalogSearchPage` assembles the complete deterministically-ordered matching ID set
  before pagination (reproduces and fixes the exact "BEST" scenario in a dedicated test). Amended the
  Wave C Plan and Formal Review (new asset + additive field). No rules change needed — existing
  `generated/portal-catalog/{allPaths=**}` already covers the new path, proved by a new test (rules
  suite 7/7, was 6/6). 26 new/updated tests across 5 files; 77/77 focused tests pass. Functions
  build, Portal typecheck, rules, lint, diff check all exit 0; `npm run build:portal` did not
  complete (hung with no error — suspected local dev-server file-lock contention, possibly the
  owner's own active Portal session; left undisturbed rather than guessed at). R-015 opened, not
  closed. Redeployment scope: `rebuildCatalogSnapshots`, `onPortalCatalogSnapshotSourceWritten`
  (unchanged from the prior pass), plus a required fresh republish since the live generation-4
  manifest lacks the new field. Did not redeploy, republish, or run the controlled import; did not
  request further owner QA before the required developer-controlled local retest.
- Owner clarified the Functions were already deployed (do not redeploy again) and asked for remaining
  blockers cleared. Review of the first-pass R-015 fix found two real defects, not just
  under-description: (1) the reported "bounded" Firestore fallback still scanned the entire `tags`
  and `designs` collections unbounded, with no cache/limit; (2) search pagination sorted candidate
  IDs alphabetically by design ID instead of the established "Studio-newest-first" customer-facing
  order (proven from the explicit code comment/convention already in `catalogService.ts`/
  `useCatalogDesigns.ts`). Investigated whether any correct, complete, bounded Firestore mechanism
  exists for tag counts — none does (full scan vs. ~1,122 separate count queries) — asked the owner a
  narrow question rather than inventing an incomplete source; owner chose to remove the Firestore
  fallback entirely for a graceful "Tag filters are unavailable" UI state (implemented via a new
  `error` prop on `CatalogTagFilterModal`). Fixed the ordering defect with a new pure
  `portalCatalogBrowseOrder` (newest-first, design-ID-descending tiebreaker) that every generated
  tag/category/search-term ID list is now built from at publish time, and reworked
  `planPortalCatalogSearchPage` to preserve that order under intersection instead of re-sorting
  alphabetically — verified with a dedicated order-preservation test plus the exact "BEST" regression
  test. Also corrected the prior pass's inconclusive `npm run build:portal` report: re-ran without an
  artificial timeout wrapper and confirmed exit 0 (the build had already succeeded through
  static-page generation before the tool's own cap killed it previously — not a real failure).
  Confirmed via direct grep that `portalCatalogAssetService.ts` has zero Firestore imports at all
  (structural proof of zero Firestore reads on the generated tag/search path). Added 11 new tests (37
  total for R-015; 88 project-wide focused tests pass). Disclosed honestly that this environment has
  no browser-automation tooling to perform the required interactive developer-controlled retest, and
  provided a manual test script for the owner/a human tester instead. All verification re-run clean
  (functions build, Portal typecheck/build, rules 7/7, 88/88 focused tests, lint, diff check, Studio
  build). Determined `rebuildCatalogSnapshots`/`onPortalCatalogSnapshotSourceWritten` need a follow-up
  redeployment since the owner's already-deployed version predates this pass's ordering fix and
  fallback removal. Did not redeploy, republish, or run the controlled import.
- Exact checkpoint:
  `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md`.
  Functions/rules deployment, coordination initialization, initial publication, migration/backfill,
  controlled import, Portal dev deployment, and production remain gated.
- Test A: all known Fresh Prints clients/runtimes closed, no other sessions found, and Firebase
  stayed visibly unchanged at `17K` / `34.7%` from 1:54 PM to 2:30 PM CT. This is strong evidence
  against a large repeating closed-state source, but not absolute zero due display rounding and
  Usage reporting delay.
- Cold route trace after remediation: Design Library categories `18`, tags one logical corpus
  (`500 + 500 + 122 = 1,122`), designs `80`; AI Review one active processing page plus three
  aggregate counts; no inactive-page preload and no catalog starts under Inbox/Imports/Show Queue.
- The controlled import remains gated until the dev snapshot deployment/initialization checkpoint,
  initial publication, and post-publication verification are explicitly approved.
- Any OS process shutdown, dev Firebase deploy, rules/index deploy, or snapshot initialization requires
  owner approval/checkpoint.

---

## Just closed: portal-how-to-faq

- Public `/help`: H1 / SEO **FAQ and How To**; nav **Help**; guest browse; Coming soon videos when empty
- Studio Settings CMS → Firestore `settings/portalHelp`; `updatePortalHelpSettings`; seed on **fresh-prints-dev** (8 FAQs)
- Buy-yourself FAQ + Whatnot limits copy; no em dashes; theme picker hidden on `/help`
- Owner manual **PASS** 2026-07-23; signoff `docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md`
- ADRs: FP-117 / FP-118

### Parked / follow-ups

- Add real How To video URLs in Studio when ready
- Production seed of `settings/portalHelp` at `production-release`
- Optional soft-deploy SEO Functions leftovers (prior goal)
- Brand-logo **production** Functions + rules (separate APPROVE)
- B4 / Wave C Firestore efficiency
- Production Portal / Google / email gates unchanged
