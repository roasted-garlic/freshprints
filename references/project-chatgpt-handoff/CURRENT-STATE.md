# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-10

## FreshForge workflow

| Item | Value |
|---|---|
| Status | **PAUSED — PRODUCTION MAINTENANCE MODE PREREQUISITE — OWNER REQUESTED PAUSE** |
| Parent | Coordinated production promotion and release readiness |
| Active child phase | DEV dependencies deployed after automated Test; paused at owner request before QA; production remains forbidden |
| Most recently closed goal | `studio-show-queue-internal-sheet-dollar-totals` — **approved** (prior: lifecycle ordering **approved_with_notes**) |
| Signoff | Studio dollar totals: **approved** — Owner visual QA **PASS** (2026-09-10). Lifecycle ordering: **approved_with_notes**. Prior Portal Show Queue: **approved_with_notes**; prior Print Request: **approved** |
| Related closed goal | `user-info-print-request-lifecycle-activity-ordering` |
| Autonomous | **OFF** (`shadow`) |
| Production | untouched |
| Commit/push | Studio print-time estimate polish: owner PASS; commit/push of this polish only; maintenance still paused; no force push |

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

## Active managed goal — Production maintenance-mode prerequisite

The separate prerequisite Plan and Formal Review are complete with verdict **approved_with_changes**:

- Plan: `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-review.md`

The reviewed design uses a private runtime `settings` control, a per-invocation trusted Functions
guard before quota/external side effects, Firestore/Storage Rules reinforcement for direct customer
writes, a bounded Portal read-only experience, and existing owner/admin Studio Settings and Portal
Show Queue recovery paths. Customer notification read-marker writes are blocked while ON for a
strict read-only contract. The owner accepted the Plan and authorized this DEV-only implementation.
Implementation and automated Test are now complete. The two maintenance Functions, all 34
guard-bearing customer callable revisions, and reviewed Firestore/Storage Rules have since been
deployed to `fresh-prints-dev`; production mutation,
deployment, commit, push, candidate freeze, and parent rollout remain forbidden pending the single
owner DEV-QA journey.
Test report: `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-test-report.md`.
DEV deployment evidence: `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-dev-deployment.md`.
The full Firebase Rules regression is 179/179 across 24 suites; targeted maintenance Rules is 5/5;
shared/source contracts are 6/6; Portal typecheck, Functions build, and changed-source ESLint pass.
Studio repo-wide typecheck retains unrelated baseline errors; Portal production build was blocked by
EPERM on `.next/trace` while the existing dev server was active.
The local Portal process can converge via its bounded refresh/focus handling; the local Studio
renderer should be reloaded/restarted because its prior denied `onSnapshot` subscription is
terminal. The owner then requested a pause while making a small change. No further QA, deployment,
signoff, commit/push, activation, or parent rollout is authorized until the owner resumes.

The Studio dollar-totals polish that paused this prerequisite is now closed. The owner accepted the
reviewed maintenance scope and authorized `Continue FreshForge` for Implement. DEV-side
implementation, verification, and the narrow dependency deployment are complete; owner DEV QA is
the next action. Production deployment or activation, parent rollout, candidate freeze, and
unrelated work remain forbidden.

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
