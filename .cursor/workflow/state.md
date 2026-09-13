## FreshForge State

| Field | Value |
|---|---|
| Status | **OPEN — FINAL PARENT M0 COMPLETE (A); replacement candidate commit/push authorization pending** |
| DONE | **no — parent remains active; Studio corrective and Rules evidence child are terminal** |
| Signoff Status | cutover child **approved_with_notes / CLOSED**; Studio typecheck corrective **approved_with_notes / CLOSED**; Rules snapshot **CLOSED** |
| Current Mode | managed-phase |
| Parent program | Coordinated production promotion and release readiness |
| Current Goal | `coordinated-production-promotion-release-readiness` |
| Current Phase | Final parent M0 read-only reconciliation complete; replacement candidate authorization pending |
| Plan Status | **complete** — `docs/workflow/plans/2026-09-12-studio-release-pipeline-typecheck-stabilization-plan.md` |
| Review Status | **approved_with_changes** — `docs/workflow/reviews/2026-09-12-studio-release-pipeline-typecheck-stabilization-review.md`; owner accepted |
| Implementation Status | **complete** for typecheck corrective; no new production-configured RC mode created after canonical-path finding |
| Test Status | Studio TypeScript **0 diagnostics**; corrective suites **49/49 PASS**; targeted validation **198/198 PASS**; targeted lint and diff check PASS; RC workflow PASS |
| Human Checkpoint Required | **yes** |
| Human Checkpoint Reason | M0 is Classification A and requires explicit owner authorization before replacement candidate commit/push. Production Studio QA remains deferred to canonical stable release. |
| Blocked | **yes — awaiting `OWNER AUTHORIZE REPLACEMENT CANDIDATE COMMIT/PUSH`** |
| Allowed Actions | Documentation and owner authorization only |
| Forbidden Actions | Production reads/writes, runner DRY RUN/VERIFY/APPLY/backfill, Rules/Functions deployment, Portal/Studio publication, maintenance, stable release/tag, development merge/candidate freeze, staging, commit, or push |
| Last Completed Step | Rules rollback evidence captured; FINAL PARENT M0 classification **A** |
| Next Required Step | **OWNER AUTHORIZE REPLACEMENT CANDIDATE COMMIT/PUSH** |

## Authoritative FINAL PARENT M0 — 2026-09-13

Read-only reconciliation against corrected source SHA
`5bf477fcf676f37265018262268ee5e8734e8eff` is complete. The current 24 dirty paths are all
known documentation/evidence paths; unexplained-path count is **0**. Functions closure, additive
indexes, Portal evidence, hard-delete exclusions, Studio `1.0.10`, selected overnight Smart Profile
operation, and deferred legacy tag deletion reconcile with prior evidence. Rules rollback evidence
is captured and closed. Classification is **A — READY FOR REPLACEMENT CANDIDATE COMMIT/PUSH
AUTHORIZATION**. No commit/push, freeze, merge, deployment, publication, runner, maintenance, or
production mutation occurred.

## Authoritative Studio corrective Signoff — 2026-09-13

The consolidated `studio-release-pipeline-typecheck-stabilization` child is **CLOSED** with
disposition **approved_with_notes**. Evidence includes zero Studio TypeScript diagnostics,
49/49 corrective tests, 198/198 targeted tests, baseline-aware lint PASS, Windows/macOS packaging
and artifact verification PASS, and owner-confirmed Windows install, launch, and version `1.0.10`.
The prior RC's DEV title/Firestore are expected under the prerelease contract; production identity
validation is deferred by design to the canonical stable production release gate. No alternate RC
mode was created.

Rules retrieval is **CLOSED**. Owner-authorized read-only gcloud/Firebase auth, ADC quota context,
project, CLI, and direct Rules API GET methods captured both deployed releases/rulesets and source
hashes for `fresh-prints-prod`. No IAM, API enablement, quota, credential, or production configuration
was changed.

## Authoritative production-configured RC finding — 2026-09-13

Owner QA is **BLOCKED**, not a product-behavior failure: the prior prerelease/internal-unsigned
installer baked `fresh-prints-dev` because the existing environment writer selects DEV secrets for
every non-`stable` release. Electron derives the DEV title and Firestore identity from that baked
project ID. The canonical production Studio path is the existing `release_type=stable` workflow;
both platform jobs require `production` or an exact SHA reachable from `origin/production`, and
stable finalization independently enforces that ancestry before any release mutation. Per owner
direction, no new production-configured RC mode was created to avoid that merge requirement.

Shortest safe path is: complete the sole remaining Rules rollback-snapshot blocker; assemble and
freeze the replacement candidate; approve GO; merge the reviewed candidate to `production`; then
build Studio `1.0.10` through the existing production release path. Stable publication and all
production actions remain separately owner-gated. No production read/write or deployment occurred
in this inspection turn.

## Historical Studio 1.0.10 DEV RC validation — superseded for production QA — 2026-09-13

Consolidated typecheck stabilization implementation is complete: all 29 reviewed diagnostics across
16 files were resolved without a TypeScript baseline bypass or tsconfig weakening. The exact
Studio gate reports zero diagnostics. Corrective suites are 49/49 PASS; targeted validation is
198/198 PASS; targeted lint and `git diff --check` pass (line-ending warnings only). Baseline-aware
lint reports `current=19 baseline=25 new=0 removed=6`; the checked-in 25-finding baseline is
unchanged (20 errors / 5 warnings).

Temporary RC branch `rc/studio-release-lint-gate-validation` is pushed at exact SHA
`5bf477fcf676f37265018262268ee5e8734e8eff`. Workflow run `34739620667` succeeded for prerelease
version `1.0.10`, distribution `internal-unsigned`, on both Windows and macOS, including package
creation, updater metadata checks, artifact verification, and combined evidence upload. Package
hashes and artifact digests are recorded in
`docs/workflow/reviews/2026-09-13-studio-release-pipeline-typecheck-stabilization-test-report.md`.

The package is not valid for production-environment QA; its DEV title/Firestore are expected under
the prerelease contract. Production-environment validation is deferred by design to the canonical
stable release gate. No stable release/tag/publication occurred. Production was untouched: no production reads, runner
invocation, DRY RUN, VERIFY, APPLY/backfill, Rules/Functions deployment, Portal/Studio publication,
maintenance, settings/data mutation, staging, development merge, candidate freeze, or parent M0
rerun. Existing baseline limitations remain honestly documented (Portal `.next/trace` EPERM,
Firestore Rules emulator expression-budget baseline, unrelated Studio typecheck/whole-repo lint
baselines, and intentionally skipped installer-producing Studio packaging build).

The prior Owner QA checkpoint is superseded by the canonical stable production QA gate.

## Authoritative consolidated typecheck stabilization Plan/Formal Review — 2026-09-12

The owner directed one bounded corrective, `studio-release-pipeline-typecheck-stabilization`,
instead of one-error-at-a-time iteration. The complete Studio check
`npx tsc -p apps/studio/tsconfig.json --noEmit --pretty false` reports 29 diagnostics across 16
files: runtime/shared contract boundaries, four unused runtime declarations/imports, and
test-only fixture/import typing (including nine timestamp-double diagnostics). The inventory,
classifications, expected files, and test strategy are recorded in the Plan and Formal Review.

Formal Review is **approved_with_changes**, pending owner acceptance and implementation
authorization. No source, workflow, production, candidate, or release mutation occurred in this
turn. The accepted lint corrective remains valid evidence (49/49, baseline-aware lint PASS on both
platforms) and will be included in the consolidated Signoff after packaging succeeds. Rules access
remains a separate read-only 403 blocker.

Exact next checkpoint: **`OWNER ACCEPT CONSOLIDATED STUDIO RELEASE PIPELINE CORRECTIVE + AUTHORIZE IMPLEMENT`**.

## Authoritative frozen-candidate RC outcome — 2026-09-12

The owner-authorized RC ran against the immutable candidate
`ff533c835508e65bb3cfd9d2739f72bafe1fc895`. Freeze integrity passed: `HEAD = origin/development`,
ahead/behind `0/0`, staged paths `0`, and documentation-only post-freeze paths with zero
runtime/config deltas. Read-only baseline capture found 113/113 ACTIVE production Functions,
77/77 READY indexes, Portal build-003 at 100% with HTTP 200, stable Studio v1.0.9, and an absent
`settings/portalMaintenance` document (404/NOT_FOUND, therefore OFF). The remote Rules release
export could not be read with the available credential (403), so that immutable snapshot remains
open.

Focused validation is **87/87 PASS**; Functions build, Portal typecheck, targeted lint, and diff
check pass. A clean detached checkout of the frozen SHA completed `npm ci --ignore-scripts` and
`npm run build:portal` with synthetic non-production public placeholders; the prior `.next/trace`
EPERM did not reproduce (build ID `ieL4DZ0JURjcMgcb-S0q4`, trace 818,950 bytes). The Portal build
blocker is therefore closed for this RC. The real Studio release workflow run
`34735296362` failed its existing whole-repository lint gate on both Windows and macOS before
packaging, so no installer, hashes, install, update, or prerelease artifact was produced. The
remote Firestore/Storage Rules snapshot retry returned 403 because the Rules API is service-disabled
for the available credential; no IAM or quota change was attempted. Full Rules emulator, Studio
typecheck, and whole-repository lint retain their documented baseline failures. These are recorded
as existing/environment limitations or evidence gaps, not newly introduced candidate regressions.

Readiness is **C — NO-GO for production mutation**. Production state/data was not changed; only the
authorized read-only baseline queries ran. No runner, DRY RUN, VERIFY, APPLY/backfill, deployment,
publication, maintenance activation, staging, commit, push, merge, or parent M0 rerun occurred.
The detailed packet is `docs/workflow/reviews/2026-09-12-coordinated-production-go-no-go-packet.md`.
The owner-directed Studio-first sequencing amendment is documented in
`docs/workflow/plans/2026-09-12-coordinated-production-studio-first-portal-sequencing-amendment-plan.md`
and its accepted review. Smart Profile/backfill is selected for a separately owner-gated overnight
post-rollout operation; legacy physical tag deletion remains deferred.

### Authoritative remediation revalidation — 2026-09-12

- Portal blocker **CLOSED**: clean detached frozen-SHA checkout passed production-equivalent
  `npm run build:portal` after `npm ci --ignore-scripts`; synthetic public placeholders were used
  only for the local build and no source/config bytes changed.
- Studio blocker **OPEN**: real `.github/workflows/studio-release.yml` prerelease validation run
  `34735296362` failed the existing whole-repository lint gate on Windows and macOS before package
  creation. No 1.0.10 installer, hash, install, or update evidence exists. Closing this by changing
  source/workflow bytes requires invalidating M1 and returning to M0/M1.
- Rules snapshot blocker **OPEN**: read-only Firestore Rules and Storage Rules API retries returned
  403 service-disabled/no-quota-project for the available credential. No IAM, quota, production
  Rules, or data action was taken; source rollback hashes remain the available baseline.
- Owner-directed **Studio first, then Portal** sequencing is accepted as a docs-only amendment;
  no runtime/config bytes changed. Maintenance remains absent/OFF until Portal live/smoke. Smart
  Profile/backfill is selected for separately owner-gated overnight post-rollout operation; legacy
  physical tag deletion is deferred.
- Production state/data/configuration remains untouched. No production read beyond authorized
  read-only baseline queries, runner, DRY RUN, VERIFY, APPLY/backfill, deployment, publication,
  maintenance activation, staging, commit, push, or parent M0 rerun occurred.

### Authoritative corrective child Plan/Formal Review — 2026-09-12

Owner decision invalidated frozen candidate `ff533c835508e65bb3cfd9d2739f72bafe1fc895` for
production release purposes while preserving its historical freeze/RC evidence. The bounded child
`studio-release-workflow-baseline-aware-lint-gate` now has a completed Plan and Formal Review only.

Root cause: both Studio platform jobs run the whole-repository `npm run lint`, expanding to
`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`. The exact frozen-SHA
output is 20 errors and 5 warnings. Every diagnostic file is unchanged between the former
candidate and its parent, so no finding is a Studio 1.0.10 candidate regression.

The reviewed solution is Approach B: a deterministic checked-in diagnostic baseline and comparator
that invokes the same whole-repository ESLint surface, permits only listed pre-existing findings,
fails on new findings, accepts removals without auto-writing, and fails closed on execution/parse
errors. Approach A does not exist in the repository; changed-files-only Approach C is rejected as
insufficient release coverage. Expected implementation is workflow/helper/manifest/tests only; no
Studio runtime behavior change is authorized.

Formal Review disposition is **approved_with_changes**, pending owner acceptance and implementation
authorization. The remote Rules snapshot remains a separate read-only 403 blocker; no IAM/quota
change is proposed. No implementation, staging, commit, push, deploy, publish, runner, DRY RUN,
VERIFY, APPLY/backfill, maintenance activation, settings/Auth/secrets/data mutation, or production
merge occurred.

### Authoritative corrective implementation/Test — 2026-09-12

Owner accepted the corrective and authorized implementation within the reviewed workflow/tooling
scope. The helper, exact 25-finding baseline, workflow integration, and policy/comparator tests are
implemented. Automated validation is **49/49 PASS**; the real helper reports
`current=25 baseline=25 new=0 removed=0`; targeted lint, helper syntax, and `git diff --check` pass.
No Studio application/runtime source changed.

The required GitHub prerelease package run is not yet validly executable: these workflow changes are
local and uncommitted, while the owner explicitly prohibits candidate commit/push before corrective
Signoff and parent M0 reconciliation. No Windows/macOS package, artifact hash, install, launch, or
update evidence exists. Corrective Signoff is therefore pending that RC evidence. The exact next
checkpoint is **`OWNER DECIDE CORRECTIVE RC VALIDATION SOURCE / AUTHORIZE NEXT GATE`**.

### Authoritative temporary RC validation — 2026-09-12

Owner authorized temporary branch `rc/studio-release-lint-gate-validation` and one validation commit
`b8d8d80cc1cab5bdb2aed1889730205e0a8046f3`, containing only the five approved corrective paths.
The branch was pushed without merge, tag, or development/production update. The exact prerelease
workflow run `34738737103` checked out that SHA; both Windows and macOS baseline-aware lint steps
passed. Both packaging jobs then failed at the existing Studio TypeScript baseline during `npx tsc`
before artifact creation. No corrective/runtime regression was identified and no automatic patch was
attempted. No artifact names, hashes, install, launch, or update evidence exists.

Corrective Signoff is blocked pending owner direction on the existing Studio typecheck baseline. The
remote Rules snapshot remains a separate read-only 403 blocker. No stable release/tag/publication,
production action, maintenance activation, runner, DRY RUN, VERIFY, APPLY/backfill, or development
candidate commit occurred.

Exact next checkpoint: **`OWNER DECIDE EXISTING STUDIO TYPECHECK BASELINE / CORRECTIVE SIGNOFF PATH`**.

**Decision Log:**

- 2026-09-12 — Owner authorized **`FREEZE MAIN CANDIDATE SHA ff533c835508e65bb3cfd9d2739f72bafe1fc895`**;
  this M1 is now superseded for production release purposes by the corrective-child invalidation.
  The historical freeze applies exactly to that `development` commit, with `HEAD = origin/development`, ahead/behind
  `0/0`, production baseline `36165096f09bef6817adb5b11d496dbb1502b34b`, Portal rollback build-003,
  and Studio `1.0.10` (rollback `v1.0.9`). The verified Functions, Rules, Storage, indexes, Portal,
  Studio, and config/data evidence is immutable. No runtime/config bytes changed and no production
  read, runner, DRY RUN, VERIFY, APPLY/backfill, deployment, publication, maintenance, settings,
  Auth/secrets, data, tag, release, merge, or GO/NO-GO action occurred. Exact next checkpoint:
  **FROZEN-CANDIDATE RC VALIDATION / PRODUCTION GO-NO-GO PREPARATION**.

- 2026-09-12 — Owner explicitly authorized **`OWNER AUTHORIZE FINAL REVIEWED CANDIDATE COMMIT/PUSH`**.
  Exactly 256 reviewed Classification-A paths were staged, cached hygiene passed, and one clean
  `development` commit was created with message `chore(release): assemble coordinated production
  candidate`. Only `origin/development` was pushed. The full SHA is
  `ff533c835508e65bb3cfd9d2739f72bafe1fc895`; `HEAD = origin/development`, ahead/behind `0 / 0`,
  and `origin/production` remains `36165096f09bef6817adb5b11d496dbb1502b34b`.

- 2026-09-12 — Commit-byte manifests were regenerated from Git object bytes at the candidate SHA:
  core 10/10 audit with zero mismatches; Portal 747 inputs (digest
  `69f3814242727afa4330cadb11937ad334f64251bf4fc87d3fc57858d0c17b5b`); Studio 1,145 inputs
  (digest `d565d27c2d4857ae2267c45b52004382a0bd37f7321026992dd37e366d5f0718`); Function closure
  186/120 exports, 530 closure paths, digest `22e56a4810c0714999f6793a350bb67c22215b0ec556179524948552812f9fbc`;
  Rules/index/config hashes and counts reconcile. No production read, runner invocation, DRY RUN,
  VERIFY, APPLY/backfill, deployment, publication, maintenance, settings/data mutation, freeze,
  tag, or release action occurred. Stop for the separate M1 freeze authorization.

- 2026-09-12 — Formal Review of `coordinated-production-cutover-prerequisites` returned
  **approved_with_changes**. Required Change 1 distinguishes pre-APPLY population-delta VERIFY from
  post-APPLY exact-equality VERIFY plus repeat zero-diff DRY RUN. No production, data, Git promotion,
  freeze, deploy, publish, runner, or release action occurred or is authorized.

- 2026-09-12 — Owner authorized implementation of the reviewed cutover-prerequisites Plan plus
  Required Change 1. Authorization remains repository-only: no production reads/writes, runner
  invocation, deployment, publication, Git promotion, staging, commit, push, freeze, or release
  action. Owner DEV QA remains required before Signoff.

- 2026-09-12 — Implementation and automated Test phase completed within the approved scope. Focused
  suites passed 87/87, Functions build, Portal typecheck, targeted lint, and diff checks passed.
  Portal production build, Firestore Rules emulator suite, Studio typecheck, and whole-repository
  lint retain documented baseline/environment failures. No production read/write, runner invocation,
  deployment, publication, staging, commit, push, freeze, or release action occurred.

- 2026-09-12 — Owner explicitly reported **`OWNER DEV QA: coordinated-production-cutover-prerequisites - PASS`**.
  The child Signoff was created with disposition **`approved_with_notes`**. The child is CLOSED and
  active control returns to `coordinated-production-promotion-release-readiness`. No production
  reads or writes, runner invocation, DRY RUN/VERIFY/APPLY, Rules/Functions deployment, Portal/Studio
  publication, maintenance activation, settings/data mutation, staging, commit, push, candidate
  freeze, or parent M0 rerun occurred. Exact next checkpoint: **RERUN FINAL PARENT M0 / COMMIT-BYTE
  CANDIDATE RECONCILIATION**.

- 2026-09-12 — Owner authorized and the parent final M0 was rerun read-only. The current
  `development` tree is 256 status paths (134 tracked, 122 untracked), with no unexplained paths;
  Function closure is 186/120 exports and the additive index union is 95/77 with zero removals or
  replacements. Rules, Portal, Studio, config/data, and commit-byte tooling evidence reconcile with
  the completed child scope; Studio is `1.0.10` and accepted preview/thumbnail risk documentation
  is synchronized. Classification: **A — READY FOR REVIEWED CANDIDATE COMMIT/PUSH**. No staging,
  commit, push, freeze, deploy, publish, maintenance, runner, production read/write, or data/settings
  mutation occurred. Exact next checkpoint: **OWNER AUTHORIZE FINAL REVIEWED CANDIDATE COMMIT/PUSH**.

- 2026-09-11 — Owner: “commit and push.” Committed and pushed to `origin/development`
  (`35d80ec7` feat(portal,studio): defer upload intake, personal library, and gallery re-add).

- 2026-09-11 — Owner: “Redeploy please.” DEV redeployed
  `previewPortalCustomerUploadDeletion` + `deletePortalCustomerUpload` for Personal-only
  customer delete (Uploaded/Donated staff-managed).

- 2026-09-11 — Owner: “I would call this a PASS.” Recorded Owner DEV QA **PASS** for gallery
  Add-to-Request / Your designs (tabs, hints, 6-up preview, Add to request, delete copy,
  Personal-only Delete UI). Notes:
  `docs/workflow/reviews/2026-09-11-gallery-add-to-request-owner-qa.md`.

- 2026-09-11 — Owner: “Please redeploy.” DEV redeployed
  `previewPortalCustomerUploadDeletion` + `deletePortalCustomerUpload` for delete copy
  ending “…cannot be deleted right now.”

- 2026-09-11 — Owner: “Please dev deploy.” Deployed to `fresh-prints-dev`:
  `attachExistingCustomerUploadsToPrintRequest` (create), `confirmCustomerUploadsForDonation`,
  `promoteCustomerUploadToAiReview`, `purgeExpiredCustomerUploadCatalogRetention`,
  `purgeExpiredCustomerUploadCatalogRetentionScheduled`, `firestore:indexes`. Record:
  `docs/workflow/reviews/2026-09-11-gallery-add-to-request-donated-retention-dev-deployment.md`.

- 2026-09-11 — Owner: wire Add to Request for Personal/Uploaded/Donated; donated non-promoted
  gets same **30-day** shelf life as personal; Uploaded Allow-waiting keeps no new 30d clock.
  Implemented `attachExistingCustomerUploadsToPrintRequest`, donate `unpromoted_donation` clock,
  promote clears clock, purge scans donations. DEV redeploy:
  `functions:attachExistingCustomerUploadsToPrintRequest,functions:confirmCustomerUploadsForDonation,functions:promoteCustomerUploadToAiReview,functions:purgeExpiredCustomerUploadCatalogRetention,functions:purgeExpiredCustomerUploadCatalogRetentionScheduled`
  plus Firestore index for `catalogExclusionReason` + `catalogRetentionStartedAt`.

- 2026-09-11 — Owner replied `DEV DEPLOY DON` (accepted as `DEV DEPLOY DONE`). Implemented C1
  (personal Don’t-allow retention **30 days**, staff Excluded **14 days**, B1 unchanged) and C2
  (Your designs modal tabs **Personal** / **Design Library**; Allow ≠ instant library listing).
  Redeploy `purgeExpiredCustomerUploadCatalogRetention` (+ scheduled export if used on DEV) for C1.

- 2026-09-11 — Owner replied `DEV DEPLOY DON` (accepted as `DEV DEPLOY DONE`). Unblocked C1 → C2 Implement.


- 2026-09-11 — Second Ask Again failed with `internal`: Firestore rejects
  `FieldValue.serverTimestamp()` inside `catalogPermissionActivity` arrays. Fixed to
  `Timestamp.now()`. Redeploy `requestCustomerUploadCatalogPermissionFollowUp`,
  `respondToCustomerUploadCatalogPermissionFollowUp`, and confirm attach if needed.

- 2026-09-11 — Owner lock: up to **two** Ask Again permission sends; Activity modal for
  initial + responses; second decline parks on **Excluded**; remove Imports help blurb;
  overflow menu beside permission pill. Redeploy include
  `requestCustomerUploadCatalogPermissionFollowUp` (+ confirm/respond already on allowlist).

- 2026-09-11 — Notification history Clear history (callable soft-clear; keeps unanswered
  permission requests); Alerts dropdown drops descriptive blurb; Enable alerts is a compact
  collapsible callout. Redeploy include `clearCustomerNotificationHistory`.

- 2026-09-11 — Permission Alerts stay in the dropdown until Allow/Decline (not cleared by
  click / Mark all read); always appear in Notification history while open; server marks
  read on respond. History modal rows get a subtle resting border with stronger hover/focus.
  Redeploy `respondToCustomerUploadCatalogPermissionFollowUp` for the sticky clear.

- 2026-09-11 — Studio intake Halftone click left `pendingByUploadId` set forever (early
  return before finally), disabling all row buttons until restart. Fixed: always clear
  pending in finally. Local Studio refresh only — no Functions deploy.

- 2026-09-11 — Permission modal preview mat now uses upload detector / Studio staff
  `artworkBackgroundHex` (dark for this white art) via `previewBackgroundHex` on
  `getCustomerUploadCatalogPermissionFollowUp`. Redeploy that Function for DEV.

- 2026-09-11 — Portal upload-list preview: tall/portrait art looked half-cropped in the tiny
  square thumb. Switched to a 3:4 frame, light mat, and max-width/height contain so the full
  design is visible (same asset already looked fine on request/Studio). No Functions change.

- 2026-09-11 — Owner QA pack: (1) permission modal load — drop Admin signed URL, client
  Storage resolve + progressive preview; (2) Saving latency — cold callable (redeploy get+respond);
  (3) Pending sort — also use `catalogPermissionFollowUpRespondedAt` so Allow jumps to top without
  waiting on new field alone; (4) Show Queue detail scroll restored like Print Requests;
  (5) Add-to-Show scrolls capacity slot + personal callout into view. Redeploy include
  `getCustomerUploadCatalogPermissionFollowUp`. C1/C2 still wait on `DEV DEPLOY DONE`.

- 2026-09-11 — Owner mid-DEV-deploy tweak: Ask Again → Allow (and staff Restore) must
  re-enter Studio Pending at the **top**, not original `createdAt` batch position. Added
  `catalogPendingQueuedAt` on Allow/Restore + Studio intake sort fallback. Include
  `respondToCustomerUploadCatalogPermissionFollowUp` + `restoreCustomerUploadCatalogEligibility`
  in DEV deploy (or follow-up). C1/C2 still wait on `DEV DEPLOY DONE`.

- 2026-09-11 — Owner: Confirm remove working; **pause for DEV Functions redeploy**, then continue
  C1/C2. C2 locked: reuse dashboard **Your designs** for personal Don’t-allow uploads vs Design
  Library / promoted tab — no new section. Checkpoint:
  `docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-dev-deployment.md`.
  Production forbidden.

- 2026-09-11 — Portal Confirm remove: fixed card resurrection (~1s bounce-back) by keeping
  pending-remove marks until live/list snapshot confirms absence (detail + drawer). Added
  Confirm “Removing…” + card pixie-poof / button pulse feedback. Focused contracts pass.
  No commit/push/production. C1/C2 still open.

- 2026-09-11 — Implement progress: D uses `studioIntakeHoldUntilShow` on Don’t-allow until
  Add to Show; A defers Staff Inbox queue sound ~2.6s and holds Studio Add-to-Show until
  celebration; R replaces Portal Remove modal with inline Cancel/Confirm. C1/C2 still open.
  No commit/push/production.

- 2026-09-11 — Owner **accepted** Formal Review and added Workstream A: Studio audible
  queue alert must wait until Add-to-Show fully completes and success UI is shown (Portal or
  Studio). Plan/Review amended; Implement authorized (D → A → R → C1 → C2). Production forbidden.

- 2026-09-11 — Owner product choices: **A1**, **B1**, **C** 30-day personal bucket + dual-tab
  Portal (soon, sequenced in this child), **D** no Studio Pending/Denied until Add to Show.

- 2026-09-11 — Hard-delete blocked while attached to a print request item is correct under B1;
  staff should Reject/Exclude instead. Export/gangsheet must keep working for shows >14 days out.

- 2026-09-11 — Owner **PASS** for Portal/Studio request-item newest-first sort; parallel polish
  committed on `development`.

- 2026-09-11 — Owner screenshot showed Portal request/cart still oldest→newest (upload
  without `sortOrder` was clustering wrong; Studio was still ascending). Fixed shared compare so
  missing `sortOrder` stays chronological, kept Portal newest-first, and aligned Studio request
  grids + duplicate insert to the same newest-first order. Hard refresh Portal/Studio to verify
  Ghost → Explorer → Kiss my grits. No commit/push/production.

- 2026-09-11 — Owner reported Portal print-request images sorted incorrectly (expected
  newest→oldest left-to-right). Parallel polish: sort list/live item loads newest-first at the
  Portal service boundary, make the detail cart signature order-aware, assign `sortOrder` on
  optimistic catalog adds and customer-upload/assisted attach paths. No commit, push, freeze, or
  production action. Functions attach change needs a DEV Functions redeploy before new uploads
  get durable `sortOrder` in the cloud environment.

- 2026-09-11 — Owner accepted the amended corrective child Plan/Formal Review and authorized
  Implement → Test. Scope includes the terminal Portal limit state, atomic Studio item/parent write,
  bounded Portal request/item listeners, classification-A Denied tab/count, and unified Denied +
  staff-Excluded `catalogRetentionStartedAt` retention design. Candidate
  `7c775233e05a2eae65cc4b3c519d2b62a1736b16` remains unfrozen. No production action, scheduler
  activation, commit, push, or candidate freeze is authorized by this checkpoint.

- 2026-09-11 — Corrective child implementation and Test completed within the accepted scope. The
  Portal now has bounded request/item listeners and a terminal quota error/retry state; Studio
  customer-upload item/parent writes are atomic; Denied intake has classification-A list/count
  coverage; and one shared `catalogRetentionStartedAt` scheduler path covers Denied + staff
  Excluded with existing safe-delete blockers. Focused contracts passed 41/41, Functions build,
  Portal typecheck, Studio Vite build, targeted lint, and diff check passed. Broad suite failures
  are documented as unrelated source/emulator baselines in
  `docs/workflow/reviews/2026-09-11-pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake-test-report.md`.
  No DEV/production deploy, Rules/Storage release, scheduler activation, data operation, commit,
  push, freeze, or Owner DEV QA occurred. Owner DEV QA and child Signoff are now required before
  parent M0 rerun.

- 2026-09-11 — DEV deployment checkpoint completed for Owner QA. In `fresh-prints-dev` only,
  explicitly deployed `confirmCustomerUploadsAndAttachToRequest`,
  `excludeCustomerUploadFromCatalog`, `restoreCustomerUploadCatalogEligibility`,
  `respondToCustomerUploadCatalogPermissionFollowUp`,
  `purgeExpiredCustomerUploadCatalogRetention`, and
  `purgeExpiredCustomerUploadCatalogRetentionScheduled`; all six are ACTIVE at the revisions in
  `docs/workflow/reviews/2026-09-11-pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake-dev-deployment.md`.
  The two reviewed `customerUploads` composite indexes reached READY. The scheduled job was
  immediately PAUSED without invocation because its handler is non-dry-run. Portal was restarted
  with the repository `npm run dev:portal` workflow and returns HTTP 200 on localhost:3100;
  Studio Vite serves the current source on localhost:5173. Rules/Storage were not deployed.
  Production remains untouched. Owner DEV QA and child Signoff are still pending; no candidate
  freeze, commit, push, or production action is authorized.

- 2026-09-11 — Owner product decision amended this child: automatic 14-day safe retention applies
  to both customer-permission Denied and staff-intentionally Excluded uploads. The Plan and Formal
  Review were amended to use one shared `catalogRetentionStartedAt` episode timestamp, reason-specific
  transitions, one bounded daily cleanup path, and the existing safe-delete blockers/helpers. Staff
  Excluded retention now has explicit creation, Restore, and meaningful re-exclusion rules; Denied
  Ask Again/Allow/second-Decline semantics are preserved. Excluded tab count remains a follow-up
  recommendation unless the shared aggregate count is genuinely zero-cost. Verdict remains
  `approved_with_changes`; owner acceptance is required before Implement → Test. No scheduler,
  code, index, deployment, data operation, commit, push, freeze, or production action occurred.

- 2026-09-11 — Owner asked for a Portal Alerts bell count that updates without a page
  reload. Parallel polish (does not implement the locked request-editing live-sync child):
  keep the live `customerNotifications` listener, refetch from the server on foreground FCM,
  tab focus/visibility, and browser `online`, and prepend newly arrived unread rows while the
  dropdown is open. No commit, push, freeze, or production action.

- 2026-09-11 — New managed corrective child opened from Owner DEV QA. Customer-upload follow-up
  core remains PASS, but overall Owner DEV QA is **CORRECTIVE REQUIRED / NOT PASS FOR FREEZE**.
  Read-only source reconciliation confirmed the Portal limit-state liveness hole (failed item
  hydration leaves `hydratedWorkingRequestId` undefined and the upload panel spins forever), the
  Studio split item/parent write partial-success hazard, one-shot Portal request/item reads, the
  existing typed customer-permission denial fields, and the absence of an automatic 14-day
  Excluded cleanup. Plan and Formal Review are recorded at the dated 2026-09-11 artifacts with
  verdict `approved_with_changes`; owner acceptance is required before Implement → Test. Candidate
  `7c775233e05a2eae65cc4b3c519d2b62a1736b16` must not be frozen. No app code, Rules/indexes,
  deployment, data operation, commit, push, or production action occurred.

- 2026-09-10 — Parent M0 rerun completed after the signed-off customer-upload follow-up child.
  The current worktree is 59 status entries (43 tracked, 16 untracked); the child runtime and
  documentation are classified in the rerun packet, while the request-design parity Plan remains
  separately reviewable and excluded. The deterministic Function audit reports 173 current exports,
  120 production exports, 513 closure paths, digest
  `32cce483f02b8d69d2fcb1e7b98daf544f33095a977cb0d80cfa161c5e7dfb1e`, and both hard-delete exports
  EXCLUDE. Guard inventory, whole-file Rules/Storage hashes, 87-index union, Portal/Studio inputs,
  and config/data dispositions reconcile with no child index or Rules change. M0 is complete only at
  the dirty preparation boundary; a new candidate commit/push is not authorized. No freeze,
  deployment, publication, maintenance activation, backfill, data mutation, or production action
  occurred. Next checkpoint is owner authorization for the exact reviewed post-child candidate
  commit/push.

- 2026-09-10 — Customer-upload follow-up implementation and focused Test gate completed within the
  accepted Plan/Formal Review. Original denial, one opaque-token customer follow-up, maintenance-
  guarded response, Studio state/action gate, and Portal modal are implemented. Functions build,
  Portal typecheck, targeted lint, and focused contracts passed; unrelated Studio/full-lint and local
  Portal `.next/trace` build baselines are documented. Child Signoff is `approved_with_notes`.
  Parent M0 must reassemble and reconcile a new reviewed candidate SHA. No commit, push, freeze,
  deployment, publication, maintenance activation, migration, backfill, or production action occurred.

- 2026-09-10 — Owner accepted the reviewed Plan/Formal Review for
  `customer-upload-follow-up-catalog-permission` (`approved_with_changes`) and authorized
  Implement → Test. Scope is limited to the typed denial/follow-up state, existing Portal Alerts,
  trusted request/context/response callables, Studio Excluded UX, restore/promotion enforcement,
  ADR/data-model/workflow documentation, and focused validation. The previous candidate
  `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` is stale and must not be frozen/reused; no freeze, deployment, migration,
  backfill, production action, or unrelated change is authorized.

- 2026-09-10 — Owner hosted DEV guest homepage **PASS** after `getPortalMaintenanceState`
  public-invoker redeploy. Maintenance public-read fail-open signoff **approved**.
  Catalog-permission Formal Review remains waiting on owner acceptance.

- 2026-09-10 — Maintenance public-read corrective complete: `invoker: "public"` on
  `getPortalMaintenanceState`; Portal wall only when status is ready + ON + non-tester. Contracts
  7/7. DEV Function update succeeded. Catalog-permission Formal Review unpaused (still needs
  owner acceptance). Production untouched.

- 2026-09-10 — Owner paused `customer-upload-follow-up-catalog-permission` to fix hosted DEV
  guests seeing the maintenance wall while OFF. Cause: fail-closed UI on callable error plus
  missing Gen2 `invoker: "public"` on `getPortalMaintenanceState`. Catalog-permission Plan/Review
  stay accepted-pending and resume after this corrective.

- 2026-09-10 — New managed child goal `customer-upload-follow-up-catalog-permission` opened under
  `coordinated-production-promotion-release-readiness`. Read-only source reconciliation found that
  explicit customer catalog denial currently remains `not_eligible` and the generic staff restore
  callable does not check exclusion reason. Plan and Formal Review propose an additive typed
  follow-up state, one opaque-token Portal Alert, trusted Allow/Decline callables, server-enforced
  restore/promotion gates, and donation exclusion in v1. Verdict is `approved_with_changes`; owner
  acceptance is required before implementation. Current candidate `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`
  is provisional and must not be frozen. No app code, deploy, data operation, commit, push, or
  production action occurred.

- 2026-09-10 — Owner DEV QA: maintenance tester logout still showed full-screen maintenance.
  Fix: `AuthProvider.logout` always `router.replace('/login')`; confirm copy updated; login
  “Browse designs” hidden while maintenance ON/unknown; maintenance state refreshes on auth
  identity change. Awaiting re-check.

- 2026-09-10 — Owner DEV-QA corrective feedback and clarification received: Studio/Portal customer
  copy must share one source of truth; Studio maintenance controls must use native Settings
  primitives; merged and disabled accounts must not appear as maintenance testers. Read-only source
  and DEV data tracing proved the copy divergence and identified the selected Chris hawkins merged
  source with an inactive linked user. Corrective Plan Amendment and Formal Review are complete with
  verdict `approved_with_changes`; no implementation, deployment, setting mutation, Owner QA,
  Signoff, commit, push, or production action occurred. Owner acceptance is required.

- 2026-09-10 — Owner explicitly accepted the corrective amendment and authorized `Continue
  FreshForge` into Implement. Scope is limited to the shared heading/body copy contract, native
  Studio Settings primitives, trusted maintenance tester eligibility/candidate list, focused tests,
  and narrow DEV redeployment. Production, parent rollout, candidate freeze, unrelated work,
  settings mutation, commit/push, and Signoff remain forbidden.

- 2026-09-10 — Owner visual QA **PASS** for Est. print time (label band + ceil inches + ft
  parentheses; status-row placement). Authorized commit/push of print-time polish only.
  Signoff **approved**. Maintenance pause unchanged.

- 2026-09-10 — Orthogonal Studio polish implemented: Est. print time on Show Queue / Internal
  Sheet glance (Standard packing, 8 s/in). Plan/review under `docs/workflow/*show-queue-print-time-estimate*`.
  Automated tests 7/7. Awaiting owner visual QA before commit/push. Maintenance pause unchanged.

- 2026-09-10 — Owner visual QA **PASS** for Portal Request totals modal Size tiers primary
  button; authorized commit/push.

- 2026-09-10 — Owner visual QA **PASS** for Studio Show Queue / Internal Sheet / CR-IR dollar
  totals and glance stats. Authorized commit/push without stopping. Signoff **approved**.
  Maintenance prerequisite remains paused at Formal Review until owner acceptance.

- 2026-09-10 — Owner accepted per-PR `$` totals and asked for glance stats (replacing Whatnot
  metadata), rail `$` totals, CR/IR list `$` pills, pill styling, size mix `P x N`, and layout
  tweaks. Implemented locally with sync sheet-count estimates from existing packing planners.

- 2026-09-10 — Owner requested Studio visual tweak during maintenance pause: add `$` totals using
  existing gang-sheet pricing. Plan + Review **approved**; implemented locally.

- 2026-09-10 — Owner accepted the reviewed maintenance prerequisite Plan and explicitly authorized
  `Continue FreshForge` into Implement. DEV-side implementation and verification are authorized;
  production deployment/activation, parent rollout, candidate freeze, and unrelated work remain
  forbidden.

- 2026-09-10 — Maintenance prerequisite implementation and automated Test completed in DEV
  source. Full Firebase Rules regression is 179/179 across 24 suites; targeted maintenance Rules
  coverage is 5/5; shared/contract tests are 6/6; Portal typecheck, Functions build, and changed
  source ESLint pass. Studio repo-wide typecheck retains unrelated baseline errors and Portal
  production build is blocked by EPERM on the existing `.next/trace` while a dev server is active.
  Ready for the single owner DEV-QA journey; production remains forbidden.

- 2026-09-10 — Owner DEV-QA block diagnosed as a DEV source mismatch: both maintenance callables
  were absent from `fresh-prints-dev` and the public callable returned HTTP 404 while Portal and
  Studio local source targeted DEV. Deployed the two maintenance callables, the 34 guard-bearing
  customer callable revisions, and the reviewed Firestore and Storage Rules to `fresh-prints-dev`.
  All 36 allowlisted Functions are ACTIVE; the absent `settings/portalMaintenance` document returns
  public-safe OFF. Deployment evidence:
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-dev-deployment.md`.
  Owner DEV QA may resume; Signoff and production remain blocked.

- 2026-09-10 — Owner requested a pause while making a small change. Maintenance prerequisite is
  paused after DEV dependency deployment and before Owner DEV QA; no further QA, deployment,
  signoff, commit/push, production activation, or parent rollout is authorized until resumed.

- 2026-09-10 — Owner resumed `Continue FreshForge` with DEV-QA feedback requiring an amendment
  before Signoff: centered admin Access Denied polish, full-screen customer maintenance UX, and
  one trusted maintenance-test customer. Plan Amendment and Formal Review are complete with no
  app/source/runtime changes; owner acceptance is required before Implement. Production remains
  untouched and forbidden.

- 2026-09-10 — Owner accepted the amended Plan and explicitly authorized `Continue FreshForge`
  into Implement. Implement is DEV-only and limited to the reviewed tester exception, full-screen
  customer maintenance replacement/banner, and Admin Show Queue denial polish. Test and narrow
  dependency deployment remain required before Owner DEV QA; production remains forbidden.

- 2026-09-10 — Amendment Implement and Test completed. Targeted shared/Functions/Portal/Admin
  contracts passed 16/16; the paired Firestore/Storage Rules regression passed 182/182; Portal
  typecheck, Functions build, changed-source lint, and `git diff --check` passed. Studio retains
  25 unrelated baseline typecheck diagnostics; Portal production build retains the existing
  Windows `.next/trace` EPERM condition. After the Test gate, exactly 36 named DEV Functions were
  deployed and verified ACTIVE, followed by Firestore and Storage Rules only. The live DEV
  maintenance document is owner-controlled and currently ON with no tester; it was not changed.
  Amendment implementation, Test, and DEV deployment evidence are recorded in the three dated
  amendment review artifacts. Owner DEV QA is now the only next action; Signoff and production
  remain forbidden.

- 2026-09-10 — Trusted resolver integration caught a Firestore API misuse when clearing optional
  fields (`FieldValue.delete()` in non-merge `set()`). The write path now uses replacement
  semantics, integration validation passes 2/2 (including invalid/inactive/deleted/disabled target
  rejection and immediate clear), and only `updatePortalMaintenanceState` was explicitly
  redeployed to DEV as revision `updateportalmaintenancestate-00003-zaf` (ACTIVE). No Rules or
  other Function changed in this follow-up.

- 2026-09-10 — Corrective Implement/Test completed and the reviewed exact 37-Function allowlist
  was deployed to `fresh-prints-dev`; `firebase functions:list` verified 37/37 present and ACTIVE.
  Key maintenance revisions are `getportalmaintenancestate-00003-kil`,
  `updateportalmaintenancestate-00004-qub`, and `listportalmaintenancetestcustomers-00001-tez`.
  No Rules/indexes/hosting or production action occurred. The live maintenance document remains
  owner-controlled and present/ON; the public callable returned the safe ON projection without a
  UID, and the unauthenticated candidate-list endpoint returned 401. Owner DEV QA is now the only
  next action; Signoff, commit/push, and production remain forbidden.

- 2026-09-10 — Owner reported final corrective DEV QA **PASS**: Studio styling and separate copy
  fields, runtime saved-copy convergence, merged/disabled exclusion, valid active tester, ordinary
  customer full-screen maintenance, tester banner and safe mutation, admin Show Queue access and
  centered denial, and OFF recovery all passed. Signoff is now **approved_with_notes**. The
  prerequisite is closed in DEV; production deployment/activation, parent rollout, publish,
  commit, and push remain separately gated.

- 2026-09-10 — New managed goal `production-maintenance-mode-prerequisite-production-promotion`
  started. Read-only reconciliation found no immutable maintenance-only revision: 56 tracked and
  40 untracked working-tree entries, 1,877 committed paths versus `origin/production`, 28 modified
  guard-bearing source files (18 with nontrivial unrelated deltas), whole-file Rules drift, and no
  selective Portal App Hosting or Studio publication mechanism. Production has 113 ACTIVE Functions,
  no maintenance callables, absent `settings/portalMaintenance` (safe OFF), Portal build-003, and
  Studio v1.0.9. Plan and Formal Review are complete; verdict **blocked** pending owner selection of
  Strategy A (explicit production-based patch exception) or Strategy B (maintenance as first layer
  of the full coordinated candidate). No implementation, branch, commit, merge, deploy, publish,
   setting mutation, or production action occurred.

- 2026-09-10 — Owner selected Strategy B for `production-maintenance-mode-prerequisite-production-
  promotion`: no production-based hotfix branch/worktree and no standalone maintenance-only
  release. The signed-off DEV maintenance capability is now a required first safety layer of the
  full frozen `coordinated-production-promotion-release-readiness` candidate. Parent Plan and
  Formal Review were amended with the reconciled Rules/Functions/Portal/Studio sequence,
  `FULL MAINTENANCE CAPABILITY READY` OFF checkpoint, separate ON checkpoint, source-integrity and
  rollback requirements, and the safe-write fixture proposal. Formal Review is
  `approved_with_changes`; owner acceptance was then recorded. No implementation, candidate freeze,
  commit, push, merge, deploy, publish, setting mutation, maintenance activation, or production
  action occurred. The child goal was closed as `superseded_by_coordinated_candidate`; this does
  not represent a production deployment.

 - 2026-09-10 — Owner accepted the Strategy B parent Plan/ Formal Review. The child maintenance-
  promotion goal is closed as `superseded_by_coordinated_candidate` (not a production deployment).
  M0 preparation mechanically inventoried 100 pre-report
  working-tree entries (101 after this documentation report), preserved all user work, and found
  the current Studio customer-directory hard-delete action remains production-visible. A narrow
  child Plan/Review for reusing the existing DEV-only project/build gate was prepared with verdict
  `approved_with_changes`; owner acceptance is required before Implement → Test. Inherited request-
  design parity and Portal admin signoff documents remain explicitly unresolved for freeze
  disposition. No runtime implementation, candidate freeze, commit, push, merge, deploy, publish,
 setting mutation, maintenance activation or production action occurred.

- 2026-09-10 — Owner accepted the hard-delete child Plan/Review and authorized Implement → Test.
  `CustomerDirectoryTable` now gates the hard-delete menu/callback with
  `isOperationalWipeUiEnabled()`. Focused users/identity contracts passed 12/12; targeted ESLint,
  Studio Vite build, and `git diff --check` passed. Studio repo typecheck retains the documented
  unrelated baseline diagnostics. The DEV source still retains both hard-delete exports, while the
  parent production allowlist excludes both. Child Signoff is `approved_with_notes` and recorded
  at `docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-signoff.md`.
  No customer mutation, deploy, publish, freeze, commit, push, or production action occurred.

- 2026-09-10 — Parent M0 rerun completed after child closure. The request-design parity Plan is
  explicitly excluded for separate review; the Portal admin Show Queue signoff is explicitly
  included as approved-with-notes evidence for the scoped read-only admin runtime. The exact M1
  candidate-freeze proposal is prepared, but runtime transitive closure and a clean committed
  candidate are still required before owner freeze approval.

- 2026-09-10 — Read-only M0 runtime reconciliation completed at the dirty snapshot. Deterministic
  Function closure covers 170 current exports/120 production exports and 509 local closure paths
  (hash `a045c0514e855a08469cffadb81b487d4f5fbfb15e5757a9a588f5b8a3720a90`), with both hard-delete
  exports explicitly `EXCLUDE`. Whole-file Rules hashes, the 77+10 index union (legacy index
  restored), Portal/Studio build-input manifests, and config/data dispositions are recorded in
  `docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md` and its linked
  artifacts. The worktree is now 115 status entries (59 tracked/56 untracked); no commit, push,
  freeze, deploy, publish, setting mutation, or production action occurred. Owner authorization is
  required before staging only the reviewed path set, creating/pushing one clean development SHA,
  and regenerating the manifests at that SHA.

**Allowed Actions:** Review the Test Report; perform only owner-directed DEV/local QA; update
state/handoff after the checkpoint; no production or Git promotion actions.

**Forbidden Actions:** Signoff before Owner DEV QA; production Functions/Rules/Storage/Hosting deploy or
setting mutation; production maintenance activation; production reads/writes or runner invocation;
candidate freeze; staging, commit, push, merge, PR, or publication; any data migration/backfill or
customer mutation; unrelated refactors; force push.

## Current cutover-prerequisites outcome — 2026-09-12

Implementation and automated Test are complete within the approved Plan plus Review Required Change 1.
The final/transition Rules pair, projection-preferred Portal dual-read with canonical fallback,
production-locked runner contract, commit-byte manifest tooling, Studio 1.0.10 metadata, and synchronized
security/risk documentation are recorded in the implementation review and Test Report. Focused tests
passed 87/87. The owner explicitly reported `OWNER DEV QA: coordinated-production-cutover-prerequisites - PASS`;
the child Signoff is `approved_with_notes` and the child is CLOSED. This section is retained as the
child-phase record; the active parent phase is the frozen-candidate RC outcome above.

## Next Required Step

Owner decision: `OWNER DECIDE RC BLOCKER REMEDIATION / REVALIDATE FROZEN CANDIDATE`. Until the
Portal build, Studio RC package/install/update evidence, and immutable remote Rules snapshot are
resolved or explicitly accepted by the owner, no production GO, runner execution, deployment,
publication, staging, commit, push, maintenance activation, or data operation may proceed.
