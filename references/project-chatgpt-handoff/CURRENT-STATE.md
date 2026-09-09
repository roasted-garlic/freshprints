# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-09

## FreshForge workflow

| Item | Value |
|---|---|
| Status | **COMMITTED — STOP FOR OWNER DEV FUNCTION REDEPLOY AUTH** |
| Parent | `portal-admin-daily-show-queue` |
| Active child phase | **Owner DEV QA PASS; `908d9123` committed/pushed; awaiting Function redeploy authorization** |
| Closed goal | `print-request-direct-export-gangsheet-and-copy` |
| Signoff | Legacy tag retirement: **approved** — Owner DEV QA **PASS** (2026-09-09). Prior Print Request goal: **approved** — commit/push `ab319468` complete |
| Related closed goal | `ai-processing-live-review-auto-process-and-ui-polish` |
| Autonomous | **OFF** (`shadow`) |
| Production | untouched |
| Commit/push | Show Queue commit `908d9123` and legacy tag retirement `1c43f6e1` pushed to `origin/development`; no force push |

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

## Active managed goal — Portal admin daily Show Queue

The owner authorized implementation and selected `America/Chicago` as the canonical IANA
operational-day timezone. Local source implementation of the daily queue slice is complete on
`development`. The owner authorized exactly one DEV Function deployment; the first Owner DEV QA
failed on a Portal loading lifecycle defect. A Portal-only corrective fixed loading. Owner DEV
re-QA confirmed the page loads, then **withheld final acceptance** and requested a substantial
product amendment: mobile-first upcoming-show dashboard (admin sidebar, default next show,
Design/Print/PR qty + capacity, PR summaries, lazy View Designs modal with artwork).

**Dashboard amendment is implemented locally (not deployed).** Callables:
`getPortalAdminUpcomingShowQueueDashboard`, `getPortalAdminShowQueueRequestDesigns`. Admin sidebar,
default next-upcoming selection, stats/capacity, PR summaries, lazy signed View Designs modal. The
responsive refinement adds a mobile action-cluster hamburger, off-canvas drawer, explicit mobile
gutters, compact responsive title treatment, centered modal, themed scrollbars, and status-free
`origin · upload/catalog` design metadata. ADR-FP-187 amended. Focused tests 33/33 plus admin UI
contract/lifecycle 13/13; designs performance contract 3/3; Portal typecheck PASS; Functions build
PASS. Portal build retains Windows `.next/trace` EPERM baseline. The designs Function source has a
local performance corrective and requires a fresh owner-authorized DEV redeploy; no deployed
Function changed.

Artifacts:

- Amended Plan: `docs/workflow/plans/2026-09-09-portal-admin-daily-show-queue-plan.md`
- Formal Review Amendment: `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-amendment-review.md`
- Dashboard Implementation Review: `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-implementation-review.md`
- ADR: `docs/project/DECISIONS.md` — ADR-FP-187 (amended)

Next checkpoint:
`[NEEDS OWNER AUTHORIZATION: REDEPLOY PORTAL ADMIN SHOW QUEUE REQUEST DESIGNS FUNCTION PERFORMANCE CORRECTIVE]`

Commit/push is complete. Do not deploy or sign off until the Function redeploy checkpoint is authorized. Production remains untouched.

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
