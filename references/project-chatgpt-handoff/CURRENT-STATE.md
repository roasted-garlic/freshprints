# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-12

## FreshForge workflow

| Item | Value |
|---|---|
| Status | **OPEN — parent final M0 complete; awaiting owner candidate commit/push authorization** |
| Parent | Coordinated production promotion and release readiness |
| Current phase | Parent final M0 complete; reviewed candidate commit/push checkpoint |
| Latest child phase | `coordinated-production-cutover-prerequisites` — **CLOSED / approved_with_notes** |
| Most recently closed goal | `coordinated-production-cutover-prerequisites` — **approved_with_notes** (Owner DEV QA PASS 2026-09-12) |
| Closed promotion child | `production-maintenance-mode-prerequisite-production-promotion` — **superseded_by_coordinated_candidate** (no production deployment) |
| Current plan/review | Parent Plan/Formal Review remain authoritative; cutover-prerequisites Plan complete with Formal Review **approved_with_changes** and implementation/test artifacts recorded |
| Signoff | **approved_with_notes** — `docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-signoff.md` |
| Related closed goal | `user-info-print-request-lifecycle-activity-ordering` |
| Autonomous | **OFF** (`shadow`) |
| Production | untouched |
| Commit/push | No commit/push performed. M0 classification **A — READY FOR REVIEWED CANDIDATE COMMIT/PUSH**; explicit owner authorization is still required. |

## Authoritative final parent M0 outcome — 2026-09-12

The owner-authorized final read-only parent M0 reconciliation is complete. The current
`development` tree is **256 status paths** (**134 tracked modifications + 122 untracked files**),
with no unexplained paths; sorted status-path SHA-256 is
`bfd1a1911d94449dee74dea0134061744814f42b51b80f90014bc38f357da0ac`. Git truth is
`HEAD = origin/development = a76d8be218571e1260bdb983f86ee5cf86563e1b`, ahead/behind `0 / 0`, and
`origin/production = 36165096f09bef6817adb5b11d496dbb1502b34b`.

Function closure is 186 current exports / 120 production exports, 530 unique local closure paths,
with actions ADD 54, UPDATE 110, RETAIN LIVE VERSION 3, EXCLUDE 10, NO ACTION 9. The current Rules,
transition Rules/config, additive 95/77 index union, Portal 747-input manifest, Studio 1,145-input
manifest, config/data disposition, and commit-byte tooling all reconcile with the completed child
scope. Studio metadata is `1.0.10`; SECURITY/FIREBASE/RISK_REGISTER include the accepted authenticated
Staff Artwork preview/thumbnail known-ID residual risk.

M0 classification is **A — READY FOR REVIEWED CANDIDATE COMMIT/PUSH**. This is not a freeze or
deployment approval: the tree remains dirty, candidate SHA is TBD, and commit-byte output must be
generated only after an owner-authorized clean commit. No production reads, runner invocation,
DRY RUN/VERIFY/APPLY, deployment, publication, maintenance, settings/data mutation, staging,
commit, push, or freeze occurred. Exact next checkpoint: **OWNER AUTHORIZE FINAL REVIEWED CANDIDATE
COMMIT/PUSH**.

## Historical M0 outcome — 2026-09-12

The owner-authorized read-only M0 rerun inventoried an evidence snapshot of **231** status paths
(125 tracked modifications, 106 untracked) with canonical path digest
`f244839eededa736574b86303ae1f65127165c41875bee2022b68986eecc0626`. Function closure now has
186 current exports versus 120 at `origin/production`; the full production-relative disposition is
54 ADD, 110 UPDATE, 3 RETAIN, 10 EXCLUDE, and 9 NO ACTION. The current Firestore and Storage Rules,
95-index union, and corrected Portal/Studio build-input manifests were also regenerated.

M0 is **passed_with_notes** and its owner dispositions are now resolved: the stray file was deleted;
the two-ask/activity work is accepted under the umbrella evidence; cutover is additive dual-read; a
production-locked runner is planned with APPLY separately gated; Studio is `1.0.10`; and the
authenticated preview/thumb known-ID risk is accepted with required documentation synchronization.
The current managed child was
`coordinated-production-cutover-prerequisites`: Plan → Review → Implement → Test → Signoff. Its Plan
is complete, Formal Review is **approved_with_changes**, implementation and automated Test are
complete, and the explicit Owner DEV QA checkpoint is **PASS**. The child Signoff is
**approved_with_notes** and the child is now CLOSED. The sole required change distinguishes
pre-APPLY population-delta VERIFY from post-APPLY exact-equality VERIFY plus repeat zero-diff DRY RUN.
No staging, commit, push, candidate freeze, deployment, publish, production data write, runner
invocation, or settings mutation was performed. Updating the mandatory state/handoff records after that
snapshot added one documentation-only tracked status path, the subsequent Plan/Review artifacts
added documentation-only untracked paths, this implementation/test pass added the reviewed cutover
artifacts, this final Signoff added its own documentation artifact, and the handoff refresh updated
the active records. The live tree is now **251** status paths (134 tracked, 117 untracked); the
recorded 231-path digest intentionally remains the
reproducible pre-reporting M0 evidence boundary.

## Authoritative cutover-prerequisites implementation/test outcome — 2026-09-12

- Implementation stayed within the approved Plan plus the Formal Review’s required verification
  clarification. Final and transition Rules artifacts, projection-preferred Portal dual-read,
  production-locked runner, commit-byte manifest tooling, Studio `1.0.10`, and the synchronized
  SECURITY/FIREBASE/Risk Register entries are present.
- Focused automated suites passed **87/87**; Functions build, Portal typecheck, targeted lint, and
  `git diff --check` passed. Portal production build, Rules emulator suite, Studio typecheck, and
  whole-repository lint retain documented baseline/environment failures in
  `docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-test-report.md`.
- Owner explicitly reported **`OWNER DEV QA: coordinated-production-cutover-prerequisites - PASS`**
  for the required DEV/local projection-first, canonical fallback, delayed/stale, duplicate/order,
  error-fallback, and authenticated Staff Artwork preview/thumbnail checks. The final Signoff is
  **approved_with_notes** and the child is CLOSED. No production runner, DRY RUN, VERIFY,
  APPLY/backfill, deployment, publication, staging, commit, push, freeze, or maintenance action
  occurred.

> The child-phase narrative below is retained as historical evidence and may describe checkpoints
> that were subsequently closed. This M0 section and the workflow table above are authoritative.

## Parent continuation checkpoint — 2026-09-12 (superseded by final M0)

Active control has returned to `coordinated-production-promotion-release-readiness`. The child
`coordinated-production-cutover-prerequisites` is terminal and must not be reopened. Candidate
assembly/freeze and all production actions remained out of scope for the child Signoff turn. The
owner-authorized final parent M0 is now complete; this historical child checkpoint is superseded.

**Superseded checkpoint:** `RERUN FINAL PARENT M0 / COMMIT-BYTE CANDIDATE RECONCILIATION`
**Current exact next checkpoint:** `OWNER AUTHORIZE FINAL REVIEWED CANDIDATE COMMIT/PUSH`

### Historical child detail — Portal Assisted Final Artwork Progress and Re-add Corrective

Owner explicitly reported **`OWNER DEV QA: portal-assisted-final-artwork-progress-and-readd-corrective - PASS`**.
Signoff is complete with disposition **`approved_with_notes`**:

`docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-signoff.md`

The corrective guards all existing-upload updates against empty patches while preserving legacy
origin backfill, and adds server-owned real-stage progress with elapsed/step/remaining-step Portal
feedback. First Add, remove/re-add, no duplicate upload/item, no consent/retention regression, and
ordinary customer-upload behavior passed Owner DEV QA. The DEV callable is ACTIVE at revision
`customeraddassistedapprovedprooftoprintrequest-00037-juk`. No production, parent M0, freeze,
staging, commit, or push action occurred.

### Implemented but not closed — Portal Assisted Final Artwork Add Retention Sentinel Corrective

The sentinel corrective remains independently implemented and automated-tested, but the later
progress/re-add QA does not explicitly cover every original sentinel manual criterion. Missing
explicit checks are: queue/staff-intake transition, final-source preference plus sizing/quantity/
request-count, maintenance/ownership rejection, separate donation/Ask Again/Allow/Decline/Restore/
staff-promotion paths, and direct document inspection of omitted consent/retention fields.

Its Signoff remains intentionally **not created**. See the updated Test Report:
`docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-test-report.md`

### Read-only multi-proof source-delta reconciliation

The approved `assisted-creation-multi-proof-selection` Plan/Formal Review remains implementation-
unauthorized and is classified **B — PLAN NEEDS MINOR AMENDMENT**. The additive round/option design
is architecturally compatible, but implementation must preserve the signed-off progress DTO/parser,
stale guard, direct no-consent Add-to-Request wiring, final-source authority, and existing progress
modal. No multi-proof runtime was implemented.

Reconciliation: `docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-source-delta-reconciliation.md`

### Closed managed child — Portal Staff Artwork projection corrective

Owner explicitly reported **`OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - PASS`**.
Signoff is complete with disposition **`approved_with_notes`**:

`docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-signoff.md`

Portal Staff Artwork uses Admin `portalPrintRequestItems` projections with preview/title/DPI;
`staffArtworkId` may be projected but is not the display title; Firestore `staffArtworks` remains
customer-denied; Storage allows customer preview/thumb only (accepted residual known-ID risk);
Upscale deferred; Portal production-build EPERM not claimed resolved; production untouched.

**Remaining pre-freeze children:**

1. `portal-assisted-final-artwork-add-retention-sentinel-corrective` — outstanding QA → Signoff
2. `assisted-creation-multi-proof-selection` — Plan amendment → Implement → Test → Owner QA → Signoff

**Next checkpoint:** `OWNER DEV QA: portal-assisted-final-artwork-add-retention-sentinel-corrective`

### Historical audit — Staff Artwork corrective path (superseded stages)

Owner accepted the image/title/DPI Plan Amendment + Formal Review and authorized Implement → Test →
DEV prep → population DRY RUN → STOP before APPLY. Prior neutral no-image/no-title Portal contract is
**superseded**. Architecture remains `printRequestItems` → Admin projection → `portalPrintRequestItems`
→ Portal (no Portal `staffArtworks` document reads). Staff Artwork rows still do **not** require
`designId`.

Enriched Staff Artwork projection fields: `sourceLabel: "Staff-added"`, `titleSnapshot`,
`staffArtworkId`, `previewStoragePath`, `thumbnailStoragePath`, `widthPx`, `heightPx`, optional
`artworkBackgroundHex`. Refresh trigger reprojects attached items when `staffArtworks` changes.
Storage allows customer read of preview/thumb only. Firestore `staffArtworks` remains customer-denied.
No new index required (existing `staffArtworkId` fieldOverride). Upscale remains deferred.

Enriched population APPLY completed on `fresh-prints-dev`: actualWrites **6** (create 0 / update 6 /
errors 0). Post-apply dry-run + VERIFY=1: alreadyCorrect **114**, actualWrites 0. Portal localhost
`http://localhost:3100` serving HTTP 200. No App Hosting.

Historical context (visibility FAIL → mapper fix → product restore decision) follows for audit:

Historical context (visibility FAIL → mapper fix → product restore decision) follows for audit:

Plan: `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-plan.md`

Formal Review: `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-review.md`

Implementation/Test evidence:
`docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-implementation-review.md`
and `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-test-report.md`.

Owner DEV QA then returned **FAIL**: a Staff Artwork item present in Studio was absent in Portal
after cutover. Read-only DEV tracing of exemplar `printRequestItems/e2zYqAJHGCEua1CjtJrL` in request
`TQS4twylUafCbpz5Z2rL` found the canonical item, same-ID safe projection, non-null shared projection
mapper result, and successful `portalPrintRequestItems` query. All five DEV Staff Artwork canonical
items inspected had matching projections. The Portal service `mapPrintRequestItem()` applies the
catalog-only `!designId` guard to `staff_artwork`; it throws, and list/subscription readers catch and
drop the item before detail/drawer/queue/card rendering. No private Staff Artwork fields or library
reads cross the Portal boundary. This is Outcome A (runtime mapper visibility defect), so no
population APPLY rerun, Rules/index change, or projection-shape change is warranted.
The current DEV neutral copy is `Staff-added` per the earlier owner-directed wording update; the
latest QA phrase `Staff-added artwork` would be a separate explicit copy/projection decision, not an
implicit part of this visibility fix.

Visibility corrective Plan:
`docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-plan.md`

Visibility corrective Formal Review:
`docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-review.md`

Formal Review verdict was **`approved_with_changes`** and is now owner-accepted. The reviewed smallest
change exempts `isStaffArtworkItem` from the catalog `!designId` guard while preserving upload and
catalog validation. The corrective implementation is local-only; no additional data mutation,
staging, commit, push, freeze, or production action occurred.

Functions build, Portal typecheck, targeted lint, focused projection/Rules/Storage tests, and
`git diff --check` pass. A Portal production-build attempt was blocked by Windows `EPERM` opening the
existing `apps/portal/.next/trace`; no generated output was removed and the lock was not bypassed.

The owner then accepted the visibility corrective and authorized implementation. The mapper guard was
corrected, direct mapper/security/projection contracts passed (9/9), Portal typecheck and targeted
lint passed, and the existing localhost Portal at `http://localhost:3100` returned HTTP 200. No
Functions/Rules/Storage/index deployment or population rerun was required. Implementation Review:
`docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-implementation-review.md`.
Test Report:
`docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-test-report.md`.

Historical note only: Owner DEV QA later **PASS**ed after the image/title/DPI amendment; this child
is signed off. The prior QA FAIL remains recorded as audit history for the mapper visibility defect.

### Closed managed child — Studio Staff Artwork library and Print Request source

The owner-requested goal is a persistent Studio-only `Staff Artwork` library for private, reusable
request artwork. **Signoff is complete — approved_with_notes** after explicit Owner DEV QA PASS. The child Plan
and Formal Review trace the distinct Firestore/Storage entity, reuse of the customer-upload
technical image pipeline, a third `staff_artwork` Print Request source, direct Print Request upload,
selection mode, production/export/gang-sheet propagation, safe deletion, manual AI Review promotion,
and the Portal request-truth boundary.

Plan: `docs/workflow/plans/2026-09-11-studio-staff-artwork-library-and-print-request-source-plan.md`

Formal Review: `docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-review.md`

The owner accepted all four Formal Review decisions: (1) the customer-safe neutral no-image Portal
row for an attached item, (2) helper selection of existing ready/non-archived Staff Artwork while
management remains owner/admin-only, (3) the proposed `staffArtworks` / `/staff-artwork/{id}/...`
names, and (4) alias-based historical/merged customer retention with no mass rewrite. Implementation
and automated Test are complete within that scope. DEV deployment and corrective redeploys are
complete. Parent M0 was subsequently rerun read-only and classified **A — READY FOR REVIEWED
CANDIDATE COMMIT/PUSH**. Candidate assembly/freeze and production remain gated; immutable manifests
must be regenerated only after the separately authorized clean candidate commit.

Implementation Review: `docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-implementation-review.md`

Test Report: `docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-test-report.md`

Automated evidence: original focused Staff Artwork checks **22/22 pass**; post-QA source-focused
contracts **31/31 pass**; emulator-backed Staff Artwork/catalog create Rules suites **11/11 pass**;
Functions build, Portal typecheck, and `git diff --check` pass. The repository-wide Rules command
retains a documented legacy expression-budget baseline; Studio typecheck/build retain unrelated
baseline diagnostics. Owner reported full DEV testing and **PASS** on 2026-09-12. Signoff:
`docs/workflow/reviews/2026-09-12-studio-staff-artwork-library-and-print-request-source-signoff.md`.
No migration, commit, push, freeze, or production action occurred. Next checkpoint: rerun parent M0
and regenerate manifests from a new reviewed candidate snapshot.

### Closed managed child — customer-upload Studio deferral, personal library, inline remove

The accepted follow-up delivered Workstream D Studio intake deferral until Add to Show, Workstream A
post-success queue-alert timing, Portal inline Remove confirmation, and C1/C2 personal retention and
Your designs tabs. Owner explicitly reported **`OWNER DEV QA: PASS`** on 2026-09-11; the gallery QA
record is also PASS. The reviewed DEV Functions/indexes were deployed, local Portal/Studio source was
served, and the retention scheduler remained paused. Signoff is **`approved_with_notes`** because the
focused rerun had 92 passing tests and one known unrelated deletion-eligibility manifest baseline
failure; prior broad build/typecheck/lint baselines remain documented.

Signoff: `docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-signoff.md`.
Test report: `docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-test-report.md`.
Owner QA evidence: `docs/workflow/reviews/2026-09-11-gallery-add-to-request-owner-qa.md`.

Exact next checkpoint: rerun parent M0, regenerate immutable manifests, assemble a new candidate SHA,
and request separate owner authorization for M1 freeze. No production deploy, publish, maintenance
activation, backfill, or candidate freeze is authorized.

### Completed managed child — customer-upload-follow-up-catalog-permission

Read-only source reconciliation found that an authenticated print-request upload with
`catalogUseAcknowledged=false` currently remains `catalogReviewStatus: "not_eligible"` and is
filtered out of Pending rather than persisted as Excluded. The existing generic staff restore
callable does not inspect an exclusion reason, while promotion already rejects explicit false.
The child Plan proposes a typed exclusion reason/follow-up status on `customerUploads`, preserves
the original false answer, uses one opaque action token with the existing `customerNotifications`
Alert/deep-link system, and adds trusted staff request, customer context, and customer response
boundaries. Allow returns the upload to Pending without Design/AI/catalog side effects; Decline is
terminal for v1. Anonymous/catalog-donation uploads remain out of scope because they have no
proven authenticated Portal recipient/linkage.

Plan: `docs/workflow/plans/2026-09-10-customer-upload-follow-up-catalog-permission-plan.md`

Formal Review: `docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-review.md`

Formal Review verdict: **`approved_with_changes` — accepted by owner**. Implement → Test completed
within the reviewed scope and child Signoff is **`approved_with_notes`**. No deployment,
migration/backfill, customer mutation, commit, push, production action, or candidate freeze occurred.
Parent M0 must reassemble and reconcile a new reviewed development SHA; the previous candidate
`04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` is stale and must not be frozen or reused.

Implementation review: `docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-implementation-review.md`

Test report: `docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-test-report.md`

Signoff: `docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-signoff.md`

### Active managed goal — coordinated production promotion and release readiness (M0 candidate boundary)

The owner selected Strategy B: maintenance is not a standalone production release. The signed-off
DEV maintenance capability is a required first safety layer of the full frozen coordinated candidate.
The accepted Strategy B parent Plan and Formal Review define the source, dependency and owner gates.
The hard-delete UI child, customer-upload follow-up child, Studio Staff Artwork library child, and
Assisted progress/re-add corrective are closed. The Staff Artwork neutral-projection corrective,
the Assisted retention-sentinel QA gaps, and the multi-proof child remain open. The read-only
post-Staff-Artwork M0 runtime reconciliation is superseded for candidate assembly, and no candidate
is frozen:

- Runtime tip: `development`/`HEAD`/`origin/development` =
  `a76d8be218571e1260bdb983f86ee5cf86563e1b` (feature commit `35d80ec7`); `origin/production` remains
  `36165096f09bef6817adb5b11d496dbb1502b34b`.
- The customer-upload follow-up child is signed off **approved_with_notes** after Owner DEV QA
  **PASS**; its Functions/indexes and current Portal/Studio source are now part of the runtime tip.
- The prior M0 packet remains historical evidence only and must not be reused as a frozen candidate.
  The current dirty manifests are evidence only; the required Portal boundary audit found Outcome B:
  customer-facing code reads `staffArtworks`, exposes IDs/titles/private summary fields, resolves
  preview/thumbnail URLs, and renders Staff Artwork images/titles/DPI. No runtime correction was made
  in the audit.
- Parent Formal Review remains **approved_with_changes — accepted**. The hard-delete UI gate remains
  **approved_with_notes** and both hard-delete exports stay excluded from production disposition.
  The request-design parity Plan remains explicitly excluded pending separate review.
- Production is untouched; no maintenance activation, publication, data operation, freeze, or merge
  occurred. The exact `FULL MAINTENANCE CAPABILITY READY` checkpoint remains behind the parent frozen
  SHA and a separate owner checkpoint.

### M0 preparation result

The authoritative post-Staff-Artwork M0 rerun is recorded in
`docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md` and the refreshed
closure, Rules, index, Portal, Studio, and config/data manifests. Git truth is
`development`/`origin/development` at `a76d8be218571e1260bdb983f86ee5cf86563e1b`, zero divergence,
dirty; the expanded status inventory is 111 paths (85 tracked, 26 untracked). Current closure is
183 exports / 120 production-source exports / 523 local closure paths; the additive-only index union
is 77 production + 17 additions with zero deletion; Portal and Studio input sets are 725 and 1,019
files with their regenerated digests. No candidate SHA is currently proposed or frozen.

The exact next actions are owner acceptance/implementation of the neutral no-image Portal projection
corrective, completion of the sentinel-specific QA gaps, and later implementation of the amended
multi-proof Plan. After every remaining pre-freeze child completes Plan → Review → Implement → Test
→ Owner DEV QA → Signoff, rerun M0 and request the separate commit/push checkpoint. Do not stage,
commit, push, freeze, deploy, publish, activate maintenance, run a scheduler/backfill, or mutate
production before then.

## Closed polish — Show Queue / Internal Sheet print-time estimate

Owner visual QA **PASS** (2026-09-10). Signoff **approved**:

- Plan: `docs/workflow/plans/2026-09-10-show-queue-print-time-estimate-plan.md`
- Review / test / QA / signoff: `docs/workflow/reviews/2026-09-10-show-queue-print-time-estimate-*`
- Behavior: status-row **Est. print time** from Standard feed (incl. label band) × 8 s/in,
  inches rounded up, e.g. `16m 8s · 121 in (10.08 ft)`

## Closed polish — Studio Show Queue / Internal Sheet dollar totals

Owner visual QA **PASS** (2026-09-10). Signoff **approved**:

- Plan: `docs/workflow/plans/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-plan.md`
- Review / test / signoff: `docs/workflow/reviews/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-*`
- Behavior: Show Queue + Internal Sheet per-PR `$`, glance stats (totals, sheet estimates, size mix),
  rail card `$`, CR/IR list card `$`; Whatnot ID instead of unused Whatnot link.
- Committed/pushed to `origin/development` on owner authorization after PASS.

## Closed managed goal — Production maintenance-mode prerequisite

The original prerequisite and prior Owner DEV-QA amendment remain implemented/tested and deployed
to DEV under their existing records:

- Original Plan/Review: `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-plan.md` and `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-review.md`
- Prior amendment Plan/Review/Implementation/Test/Deployment: the dated `...prerequisite-amendment-*` artifacts
- Prior gates: targeted 16/16, trusted tester integration 2/2, Rules 182/182, Portal typecheck,
  Functions build, changed-source lint, and diff check passed; the documented Studio baseline and
  Windows Portal `.next/trace` EPERM remain known constraints.
- Prior DEV deployment: 36 named Functions ACTIVE, Firestore/Storage Rules released, no indexes;
  `updatePortalMaintenanceState` follow-up revision `updateportalmaintenancestate-00003-zaf` ACTIVE.

Read-only source and DEV data proved: Portal hard-coded its enabled heading/body and ignored saved
`message`; Studio’s bare textarea omitted native Settings classes; and the selected Chris hawkins
`merged-src-*` source is `isMerged` with an inactive linked user, while Studio’s selector omitted
merged filtering. The live DEV maintenance document remained owner-controlled and was not mutated by
Codex.

Corrective Plan Amendment and Formal Review are complete with verdict **approved_with_changes**; the
owner has now explicitly accepted them and authorized Implement:

- Plan: `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-review.md`

The corrective design added an optional shared `heading` beside the existing `message`, makes Portal
render saved copy at runtime, reuses native Studio Settings primitives, and introduces a narrow
owner/admin-only candidate-list callable backed by one trusted eligibility helper. Merged, disabled,
deleted, guest, orphaned, and inactive-user accounts are excluded from ordinary tester options; the
existing update callable revalidates the exact UID and the shared guard revalidates status. The
exact 37-Function DEV deployment is verified ACTIVE.

The corrective DEV deployment record is
`docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-dev-deployment.md`.
No Rules/indexes/hosting or production action occurred. The live maintenance document remains
owner-controlled and present/ON; the public state response is customer-safe and the unauthenticated
candidate-list endpoint returns 401. Studio should reload its renderer and Portal may be refreshed
before the owner begins QA. Owner DEV QA subsequently passed; see
`docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-dev-qa.md`.

Owner DEV QA verified normal Studio styling, separate copy fields, runtime copy convergence without
rebuild, merged/disabled exclusion, valid active tester configuration, ordinary-customer full-screen
maintenance, tester banner and safe mutation, admin Show Queue access/denial styling, and OFF
recovery. Portal auth/navigation maintenance gating is also present; its corrective source remains
local and uncommitted pending separate owner authorization. Signoff is **approved_with_notes**. No production, parent-rollout, hosting, publish,
commit, or push action occurred.

## Parent managed goal — Coordinated production promotion and release readiness

Formal Review is complete with verdict **approved_with_changes**. The authoritative amended Plan is
`docs/workflow/plans/2026-09-10-coordinated-production-promotion-release-readiness-plan.md`, and the
review record is `docs/workflow/reviews/2026-09-10-coordinated-production-promotion-release-readiness-review.md`.
Production remains untouched. No maintenance implementation, candidate freeze, rehearsal apply,
Portal rollout, Studio publish, settings/secret/Auth mutation, Function deletion, merge to
`production`, commit, or push occurred for this goal. The maintenance prerequisite is now separately
Plan/Formal-Review complete; the main candidate and first coordinated production mutation remain
individually human-gated and cannot proceed until the prerequisite is implemented, tested, DEV-QA'd,
and closed.

### Parallel local polish (not release-readiness)

Owner-authorized Portal dashboard gallery tweak (2026-09-10): mobile "Your designs" preview shows
two rows of four (CSS hides tiles after the 8th under the existing mobile breakpoint); desktop
remains 14 tiles. Owner DEV QA **PASS**. Committed/pushed as `93199fca` to `origin/development`
(`shell.css` + `PREVIEW_LIMIT` comment only). No Portal hosting deploy.

## Closed managed goal — Print Request lifecycle activity ordering

The requested Plan + Formal Review are complete with verdict **approved_with_changes**, and the
managed goal is now **CLOSED** with final disposition **approved_with_notes**. The DEV
indexed Studio User Info reader now orders cards by `lastLifecycleActivityAt DESC` with stable
document-ID ties; the compatibility reader remains available as rollback. Raw
`printRequests.updatedAt` is not a lifecycle clock: merge reassignment and queue-tab/mirror work
can change it without customer-facing operational activity, while a direct allocation re-add can
occur without changing it.

A source-only fix is insufficient. Studio remove-for-Editing deletes the allocation document,
which removes the source-show/removal evidence needed to truthfully narrate the later
remove → Editing → re-add journey. `customerActivityEvents` is likewise insufficient because it
is the immutable identity/account audit stream and has only `account.*` event types.

The reviewed lifecycle-history corrective is implemented and its DEV backend deployment is complete. It is additive: two server lifecycle triggers
(`onPrintRequestLifecycleRequestWritten` and `onPrintRequestLifecycleAllocationWritten`) write
immutable request-scoped lifecycle events and maintain `lastLifecycleActivityAt` as an indexed
card-order mirror. Cards use bounded per-logical-customer cursor streams and a k-way merge;
Details load lazily and display newest → oldest, with historical fallback only from preserved
domain timestamps. Current active destination context remains on the card; prior canceled source
  context stays in Details. The historical ordering mirror backfill is complete and the required
  indexes are READY; the indexed reader is enabled in local Studio source against DEV. A local
  Rules corrective now allows lifecycle mirror fields on
  the full request after-image used when re-adding an edited request, while preventing client edits
  to those server fields. The exact re-add regression and full Rules suite pass 170/170; this
  prior Rules corrective was deployed to DEV as Rules release
  `projects/fresh-prints-dev/rulesets/3c7788f8-c023-44cb-8b75-6e9cd9f137df`. The follow-up Studio
  re-add corrective is now deployed: `allocateStudioPrintRequestToShow` is ACTIVE Gen 2
  `nodejs20` in `us-central1`, revision `allocatestudioprintrequesttoshow-00001-lod`, latest
  traffic, source hash `ef932a1c115c0867c783692dcd4cbb089ac51125`, and Rules are released as
  `projects/fresh-prints-dev/rulesets/bc9e3e7a-6597-4228-8aa7-e9f006388a26`. Exactly one Function
  and Firestore Rules changed. No indexes, Storage Rules, lifecycle redeploy, backfill writes,
  indexed-reader change, publish, production action, data repair, commit, or push occurred in this
  corrective checkpoint. Focused Rules are 23/23, callable + Portal contracts are 10/10, full Rules
  are 174/174, and Studio source contracts are 12/12. Owner DEV re-QA returned **PASS**: the
  remove→Editing→re-add flow had no permissions error, did not leave the request partially queued
  or in Editing, and Studio reconciliation was correct. The corrective is accepted. The authorized
  backfill tie-handling correction shares the reviewed
  comparator with the forward writer and reads forward lifecycle evidence. The final pre-apply
  dry-run was green; the authorized APPLY wrote 8 request mirrors, preserved all 3 trusted
  equal-time forward tuples, and the post-apply dry-run proposed 0 further mirror writes with
  100% reader-eligible coverage. However, the deployed request trigger also created 2 unexpected
  lifecycle-event documents during mirror-only updates for converted historical requests. No event
  repair or rollback was attempted. The local request-trigger mirror-only equality corrective is
  implemented, reviewed, and deployed to DEV as a single Function corrective. The existing indexed
  reader is now enabled in local Studio source against the verified DEV backend; the compatibility
  reader remains intact as rollback. Owner DEV QA for the indexed reader then returned **PASS**;
  no active corrective remains and the managed goal is closed by the signoff below.

Artifacts:

- Plan: `docs/workflow/plans/2026-09-09-user-info-print-request-lifecycle-activity-ordering-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-review.md`
- Test report: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-test-report.md`
- Implementation Review: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-implementation-review.md`
- Corrective Plan: `docs/workflow/plans/2026-09-09-studio-editing-readd-show-queue-permissions-corrective-plan.md`
- Corrective Formal Review: `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-permissions-corrective-review.md`
- Corrective Implementation Review: `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-implementation-review.md`
- Corrective Test Report: `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-test-report.md`
- Corrective DEV deployment: `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-dev-deployment.md`
- Corrective DEV QA: `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-dev-qa.md`
- Lifecycle ordering backfill dry-run: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-dry-run.md`
- Lifecycle ordering backfill apply: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-apply.md`
- Lifecycle trigger mirror-only corrective Implementation Review: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-trigger-mirror-only-corrective-implementation-review.md`
- Lifecycle trigger mirror-only corrective DEV deployment: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-trigger-mirror-only-corrective-dev-deployment.md`
- Lifecycle indexed-reader DEV activation: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-indexed-reader-dev-activation.md`
- Final Signoff: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-signoff.md`

The current Studio lifecycle/indexed-reader focused suite is 24/24; the request-trigger/allocation/
backfill corrective suite is 14/14; prior focused lifecycle tests (20/20), the exact re-add-after-
editing Rules regression, Functions build, targeted lint, index JSON parsing, diff hygiene, and the
full Rules suite remain green. Earlier lifecycle Rules validation was 170/170; the latest
re-add-corrective full Rules validation is 174/174 across 22 suites under shell-local Microsoft
OpenJDK 25.0.4.1 and Firebase CLI 15.26.0; the Studio typecheck retains unrelated baseline errors.
The owner-authorized DEV backend deployment includes exactly the two lifecycle Functions,
Firestore Rules, and lifecycle indexes. Both Functions are ACTIVE Gen 2 `nodejs20` services in
`us-central1` on latest traffic; Rules released as `1cdf293c-18c7-41b9-a5d4-0595936c0150`; the
two lifecycle indexes are now READY. The owner-authorized mirror APPLY was the only data mutation.
The indexed-reader activation changed no Rules/index definitions; no additional Rules/index
deployment, Storage Rules, Portal/Studio publish, production action, data repair, commit, or push
occurred in the activation or signoff follow-up. The separately authorized request-trigger
corrective is deployed as recorded above.

DEV deployment evidence:
`docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-dev-deployment.md`

Final accepted Details order: **newest → oldest**. Any older Plan/Review wording that says
oldest → newest is retained as historical planning evidence and is superseded by the owner-tested
final behavior. The two historical duplicate conversion events remain
`SAFE_TO_LEAVE_AS_HISTORICAL_DUPLICATE`; existing Details deduplication prevents a duplicate
visible row and no cleanup is required for this DEV goal.

Owner DEV QA: **PASS**. The owner-authorized lifecycle commit `6bf7a25d` was pushed to
`origin/development`; no force push occurred. FreshForge: **IDLE** with no active managed goal.

Next checkpoint:
`[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`

Workflow marker: `[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`

## Closed managed goal — legacy tag retirement and Smart Profile search parity

The owner authorized the reviewed implementation and DEV checkpoint. The required decisions remain:
Halftone is preserved as a dedicated `halftoneStaffDecision.value` filter; Studio `?tags=` and
`?tag=` are ignored without mapping or crashes; and Ready designs with incomplete Smart Profiles
remain discoverable through non-tag copy/category/exact ID without tag fallback. Portal, Studio,
shared, and Functions source slices are complete. Historical `design.tags`, tag documents,
schema-v1 taxonomy compatibility, Rules/indexes, and deployed tag-trigger/archive exports remain
untouched for separate authorization. On 2026-09-09, exactly six reviewed DEV Functions were
deployed, the existing local DEV Smart Filter flags were confirmed enabled, and the existing
owner/admin Algolia reconcile rebuilt 350 ready records in `portal_catalog_ready_dev` after removing
legacy tag settings. No production, Portal/Studio publish, Rules/index deploy, migration/backfill,
tag deletion occurred. Owner DEV QA passed and the final DEV disposition was approved on
2026-09-09. The closed goal was committed as `1c43f6e1` and pushed to `origin/development`.

Artifacts:

- Plan: `docs/workflow/plans/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-review.md`
- Implementation Review: `docs/workflow/reviews/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-implementation-review.md`
- DEV cutover evidence: `docs/workflow/reviews/2026-09-09-legacy-tag-retirement-smart-profile-dev-cutover.md`
- Signoff: `docs/workflow/reviews/2026-09-09-legacy-tag-operational-retirement-and-smart-profile-search-parity-signoff.md`

Next checkpoint:
`[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`

## Closed managed goal — Portal admin daily Show Queue

The owner selected `America/Chicago` as the canonical operational-day timezone and accepted the
mobile-first upcoming-show dashboard amendment. The final surface is a read-only, owner/admin-only
Portal route with an isolated shell, upcoming-show sidebar/default selection, Design/Print/PR
metrics, capacity, request summaries, and a lazy View Designs modal. Helpers, customers, guests,
customer providers, mutation controls, raw Storage paths, and original artwork remain excluded.

Owner DEV QA passed. Focused tests 33/33; admin UI contract/lifecycle 13/13; designs performance
3/3; Portal typecheck, Functions build, and targeted lint passed. The Portal build retains the
documented Windows `.next/trace` EPERM baseline.

Artifacts:

- Amended Plan: `docs/workflow/plans/2026-09-09-portal-admin-daily-show-queue-plan.md`
- Formal Review Amendment: `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-amendment-review.md`
- Dashboard Implementation Review: `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-implementation-review.md`
- ADR: `docs/project/DECISIONS.md` — ADR-FP-187 (amended)
- Signoff: `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-signoff.md`

The owner-authorized DEV deployment completed successfully:

| Function | Revision | State |
|----------|----------|-------|
| `getPortalAdminUpcomingShowQueueDashboard` | `getportaladminupcomingshowqueuedashboard-00003-fug` | ACTIVE / latest traffic |
| `getPortalAdminShowQueueRequestDesigns` | `getportaladminshowqueuerequestdesigns-00005-fad` | ACTIVE / latest traffic |

Exactly two Functions deployed; zero errored or aborted. No Rules, Storage Rules, indexes,
migrations/backfills, data changes, App Hosting, Studio publish, or production action occurred.
The goal is **CLOSED** with Signoff **approved_with_notes**. Commit `908d9123` is pushed to
`origin/development`; the current documentation signoff is uncommitted. Production remains
separately gated.

Historical prior-goal verification: Portal focused 82/82; Studio focused 39/39; Functions/shared focused 45/45; Portal
TypeScript and Functions build pass; Studio TypeScript remains blocked by unrelated baseline
errors; Portal Next build remains blocked by the Windows `.next/trace`/timeout issue; diff check
passes. Live DEV parity checks and the read-only corrective audit pass. Signoff is approved,
Owner DEV QA is **PASS**, and commit/push completed as `1c43f6e1`. Production and publish remain
separately gated.

## Print Request goal signoff — CLOSED

Owner DEV QA is **PASS** and the final DEV disposition is **approved**. The managed goal
`print-request-direct-export-gangsheet-and-copy` is closed; there is no active child phase.

- Authorized DEV Firestore Rules deploy: project `fresh-prints-dev`, ruleset
  `0d32ca64-8cfc-4bd8-bd56-b34f426d47bd`.
- Authorized DEV Function deploy: `copyStudioPrintRequest`, `us-central1`, Node.js 20,
  revision `copystudioprintrequest-00001-yec`, source hash
  `6484fccde1612904191273e4e92138f1c9c780e0`, ACTIVE with 100% traffic on latest revision.
- Rules validation: exact `npm run test:rules`, Microsoft OpenJDK `25.0.4.1`, emulators
  started, **169/169 passed across 22 suites**, exit code 0.
- Show Queue regression, request Export regression, Copy regression, focused amended tests,
  Functions build, Studio Vite build, targeted lint, and `git diff --check`: **PASS**.
- Full Studio typecheck/build remains blocked only by documented unrelated baseline TypeScript
  errors.
- Storage Rules, indexes, migration/backfill, Portal, Studio publish, and production: **NO**.
- Autonomous: **OFF**. Automatic Pass 2: **PARKED**. WS6: **NOT STARTED**.
- Commit/push: **COMPLETE** — `ab319468` pushed normally to `origin/development`.

Signoff artifact:
`docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-signoff.md`

Next checkpoint:
`[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`

### Closed goal implementation history

The original request-scoped Export Images, Export x(Qty), Standard Generate Gangsheet, and
transactional Copy Request scope remains implemented locally, with Direct Export/Generate/Copy
buttons hidden on Working and Editing requests while Add to Show/Internal Gangsheet remains
available. The owner-authorized amendment is now also implemented locally: canonical
`settings/showQueue` global Gang Sheet Settings with read-only legacy Internal fallback, six
layout fields, fixed four-tier saved-width pricing/weight, Settings UI, local editor retirement,
request Standard price/weight rendering, cache invalidation, narrow canonical Rules fields, and
the requested Settings UX refinement (single-column Show Queue modal, vertical Settings section
sidebar, wider content, and two-column Gang Sheet Settings form). The latest modal refinement puts
the Whatnot URL first at full width, pairs default allocation with portal cutoff, and uses a
full-width normal-height Gang Sheet Settings button. The authorized DEV Firestore Rules and
  `copyStudioPrintRequest` deployments are complete. Owner DEV QA has now passed and the goal is
  signed off; commit, push, Studio publish, and production remain separately gated.

Implementation Review:
`docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-implementation-review.md`

Historical checkpoint before signoff: authorize Studio publish if desired. Commit and push are
now complete; Studio publish and production remain separately gated. Production is untouched;
provider calls remain 0.

Test-only Rules checkpoint: owner authorization was received, but read-only Java preflight found no
compatible JDK (`java -version` unavailable, no `where.exe java`, empty `JAVA_HOME`, and no
`bin\\java.exe` in normal Windows locations). `npm run test:rules` was not started and Java was not
installed. Current blocker: `[BLOCKED: COMPATIBLE JDK REQUIRED FOR FIRESTORE RULES TESTS]`.

Rules checkpoint resumed after the owner installed Microsoft OpenJDK 25.0.4.1. The JDK was
verified shell-locally and the first rerun reached Firebase CLI 15.26.0, but the Firestore
emulator could not start because port 8080 was occupied by unrelated `Remote_Keyboard.exe` (PID
29420). Tests did not begin; no process was terminated and no Rules/code change was made. The
owner then freed port 8080.

Final Rules validation: `netstat -ano | findstr :8080` showed no listener before the test. With
Microsoft OpenJDK 25.0.4.1, the exact `npm run test:rules` command started Firestore and Storage
emulators and passed **169/169 tests across 22 suites** (0 failed, 0 cancelled, 0 skipped, 0
todo), exit code 0. No corrective Rules/code change was needed. The Rules validation gate is
clear; stop before DEV deployment / Owner QA.

Amended Formal Review outcome: approved for implementation planning. Canonical recommendation is
the existing `settings/showQueue` Gang Sheet fields with non-destructive legacy Internal fallback;
no migration unless mechanically required. New four-tier fields require narrow existing Rules
allowlist updates. Legacy large-tier 0.75 oz is the resolved equivalent for non-Pocket tiers,
including Extra Oversized.

Required next marker after signoff and push:
`[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`

### Authorized DEV deployment checkpoint

- Project: `fresh-prints-dev`
- Firestore Rules command: `firebase deploy --only firestore:rules --project fresh-prints-dev` — PASS,
  exit code 0; released ruleset `0d32ca64-8cfc-4bd8-bd56-b34f426d47bd`.
- Function command: `firebase deploy --only functions:copyStudioPrintRequest --project fresh-prints-dev` —
  PASS, exit code 0; exactly one Function deployed.
- Function: `copyStudioPrintRequest`, `us-central1`, Node.js 20, ACTIVE, revision
  `copystudioprintrequest-00001-yec`, 100% traffic on latest revision, source hash
  `6484fccde1612904191273e4e92138f1c9c780e0`.
- Non-deployed surfaces: Storage Rules, indexes, migrations, other Functions, Portal, Studio, and
  production — none deployed or touched.
- Owner DEV QA: **PASS**, 2026-09-08; this checkpoint is closed by the signoff above.

### Post-deployment pricing/weight refinement

- Price and weight are rendered as separate lines on generated request/group labels.
- Grouped summaries use logical source request items, saved dimensions, and saved quantities;
  physical gang-sheet placement/sheet splitting no longer changes those totals.
- Validation: focused tests **18/18**, targeted ESLint **PASS**, Studio Vite build **PASS**
  (existing warnings only), and `git diff --check` **PASS**.
- This refinement is local and is not included in the prior deployed Studio package.

### Pricing presentation follow-up — local only

- Gang-sheet price and weight terms now sort by configured dollar amount ascending; the summary
  font is slightly smaller, and generated gang-sheet modal lengths show exactly two decimals.
- Print Request detail now shows labeled clickable `Total price` and `Total weight` pills. Either
  opens a modal with price/weight formulas and per-tier calculations.
- Design cards show a right-aligned `Cost $X x quantity = $Y` line beside the quantity controls.
- Validation: focused shared/export/UI tests **46/46**, targeted ESLint **PASS**, Studio Vite build
  **PASS** (existing warnings only), full Studio typecheck retains unrelated baseline errors, and
  `git diff --check` **PASS**.
- This follow-up is local only and is not in the deployed Studio package. Studio publish, Owner QA,
  commit, push, and production remain separately gated.

### Request-detail and gang-sheet modal polish — local only

- The request-detail header now uses Total price and Total weight controls instead of the older
  Pocket/Full Size count pill.
- Read-only design cards restore stacked Qty and dimensions lines, with a matching Cost line.
- Gang-sheet warning panels can be dismissed, and the generated-sheet list expands within the
  existing fixed modal height so more sheets are visible before scrolling.
- Validation: affected contract tests **9/9**, targeted ESLint **PASS**, Studio Vite build
  **PASS** (existing warnings only), and `git diff --check` **PASS**.
- This polish is local only. Studio publish, Owner QA, commit, push, and production remain gated.

### Design-card cost alignment refinement — local only

- Read-only design cards now place `Qty` and `Cost` on the first metadata row and dimensions and
  the cost calculation on the second row, mirroring the requested two-column alignment.
- Validation: affected contract tests **10/10**, targeted ESLint **PASS**, direct Studio Vite build
  **PASS** (existing warnings only), and `git diff --check` **PASS**. The full `npm run build`
  remains blocked before Vite by documented unrelated baseline TypeScript errors.
- This refinement is local only. Studio publish, Owner QA, commit, push, and production remain
  gated.

### Four-tier card size summaries — local only

- Show Queue/Internal Gang Sheet allocation cards now show the current compact labels `Pocket`,
  `Reg Full`, `Reg Oversize`, and `Ext Oversize` instead of the retired Pocket/Full Size split.
  Print Request list cards intentionally keep only their design and quantity totals because the
  full request detail already exposes the complete statistics. Zero-count tiers remain hidden.
- The shared width-only resolver uses the canonical gang-sheet boundaries (4, 11, and 14 inches)
  and ignores height.
- Validation: focused request/export/card tests **19/19**, targeted ESLint **PASS**, direct Studio
  Vite build **PASS** (existing warnings only), and `git diff --check` **PASS**.
- This refinement is local only. Studio publish, Owner QA, commit, push, and production remain
  gated.

### Print Request list-card follow-up — local only

- Removed the redundant four-tier size pill from Print Request list cards; the four-tier summary
  remains on Show Queue and Internal Gang Sheet allocation cards.
- Validation: focused request/export/card tests **19/19**, targeted ESLint **PASS**, direct Studio
  Vite build **PASS** (existing warnings only), and `git diff --check` **PASS**.

### Request totals inline size ranges — local only

- The totals modal now shows each bold tier name with its settings range inline in parentheses;
  the count remains on the following line.
- Validation: modal contract tests **6/6**, targeted ESLint **PASS**, direct Studio Vite build
  **PASS** (existing warnings only), and `git diff --check` **PASS**.

### Closed goal summary

Studio UX polish (owner PASS):

1. Needs Review live return after reprocess
2. Header **Auto** gates import / review reprocess / Ready auto-start (distinct from Auto advance)
3. AI Trace removed from Needs Review (Inspector unchanged)
4. Category alternative reason cap 240; normalizer **v7**
5. Ready Library reprocess stays in library; Auto OFF demote-only; restamp `readyAt` on Ready re-entry

### Atomic reprocess DEV deployment

| Function | Revision | Source hash | State / traffic |
|---|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00118-hoc` | `157d0398af52d92709775c9b824a8d33f0f37e2c` | ACTIVE / 100% |
| `resetAiEnrichmentForProcessing` | `resetaienrichmentforprocessing-00047-kip` | `8422e3f5d23fb619be61d9cfbebd1cf86eebb8cc` | ACTIVE / 100% |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00024-wuz` | `157d0398af52d92709775c9b824a8d33f0f37e2c` | ACTIVE / 100% |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00030-kav` | `157d0398af52d92709775c9b824a8d33f0f37e2c` | ACTIVE / 100% |

Project/region: `fresh-prints-dev/us-central1`; runtime: `nodejs20`.
Owner DEV QA: **PASS**, 2026-09-08. Unauthorized Functions deployed: **NO**.
Function deletions: **NO**. Rules/indexes/migrations/settings/vocabulary changed:
**NO**. Provider calls by Codex: **0**. Production touched: **NO**. No new
commit/push occurred in the deployment or QA turn.

## Atomic reprocess QA signoff

The owner DEV QA PASS closes the atomic reprocess phase. Automated validation
remains: Functions build PASS, focused Functions 38/38, focused Studio 78/78,
Explicit tests 42/42, targeted ESLint PASS, and `git diff --check` PASS. The
full Studio build remains blocked by documented unrelated TypeScript errors.

Artifacts:

- Plan: `docs/workflow/plans/2026-09-08-atomic-reprocess-automation-state-reconciliation-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-08-atomic-reprocess-automation-state-reconciliation-review.md`
- Implementation Review: `docs/workflow/reviews/2026-09-08-atomic-reprocess-automation-state-reconciliation-implementation-review.md`
- Signoff: `docs/workflow/reviews/2026-09-08-atomic-reprocess-automation-state-reconciliation-signoff.md`

Next action: owner may select a new managed goal. The parent program may retain
parked or deferred work, but there is no active implementation phase. Production
promotion, Autonomous enablement, and automatic Pass 2 remain separately gated.
