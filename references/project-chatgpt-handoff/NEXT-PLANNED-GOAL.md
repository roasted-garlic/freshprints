# Next Planned Goal

**Updated:** 2026-09-09

## Current state

- No active managed goal. The most recently closed goal is
  `user-info-print-request-lifecycle-activity-ordering` — final disposition
  **approved_with_notes**.
- Corrective Plan + Formal Review are complete with verdict **approved_with_changes**, and the
  owner-authorized Approach A implementation is deployed to DEV. Owner DEV re-QA returned **PASS**:
  remove→Editing→re-add succeeded without permissions errors, partial queue, or stuck Editing, and
  Studio reconciliation was correct. Phase 0 realistic post-unqueue
  Rules fixtures pass 23/23; callable/Portal contracts pass 10/10; the full Rules suite is
  174/174; and Studio source contracts pass 12/12. The exact callable export is
  `allocateStudioPrintRequestToShow`; Studio Add to Show now submits one complete atomic plan and
  reconciles UI state on failure/success. The narrow Rules activation fast path preserves lifecycle
  mirror/parking immutability. The callable is ACTIVE Gen 2 `nodejs20` in `us-central1`, revision
  `allocatestudioprintrequesttoshow-00001-lod`, latest traffic, source hash
  `ef932a1c115c0867c783692dcd4cbb089ac51125`; Rules are released as
  `bc9e3e7a-6597-4228-8aa7-e9f006388a26`. No indexes, Storage Rules, lifecycle redeploy,
  Studio/Portal publish, backfill, data repair, commit, push, or production action occurred for
  this follow-up or QA checkpoint. The corrective is accepted. The authorized tie-handling
  correction shares the reviewed comparator with the
  forward writer and reads forward lifecycle evidence. The bounded DEV APPLY wrote 8 request
  mirrors, preserved all 3 equal-time trusted forward tuples, and the post-apply dry-run proposed
  0 further mirror writes with 100% reader-eligible coverage. However, the deployed request trigger
  created 2 unexpected lifecycle-event documents during mirror-only updates for converted historical
  requests. No event repair or rollback was attempted. The request-trigger mirror-only equality
  corrective is implemented, reviewed, and deployed to DEV as a single Function. The existing
  indexed reader is now enabled in local Studio source against the verified DEV backend; the
  compatibility reader remains intact as rollback. Owner DEV QA for the indexed reader returned
  **PASS**; the final managed-goal Signoff is recorded below and no active corrective remains.
- The DEV indexed User Info reader now sorts by `lastLifecycleActivityAt DESC` with stable
  document-ID ties across logical customer streams; the compatibility reader remains the rollback
  path. Raw `printRequests.updatedAt` is not a reliable lifecycle clock and cannot support globally
  bounded pagination. Scheduled show date is not an ordering authority.
- Source-only history cannot truthfully cover Studio remove-for-Editing because it deletes the
  allocation source row. Account `customerActivityEvents` remain a separate identity/audit surface.
- The current request-trigger/allocation/backfill corrective suite is 14/14; prior focused lifecycle
tests 20/20, the re-add-after-editing Rules regression, Functions build, and the full Rules suite
pass. Earlier lifecycle Rules validation was 170/170; latest re-add-corrective validation is
174/174 across 22 suites under shell-local Microsoft OpenJDK 25.0.4.1 and Firebase CLI 15.26.0; Studio
  typecheck retains unrelated baseline errors. The authorized DEV deployment is complete for
  exactly the two lifecycle Functions, Firestore Rules, and lifecycle indexes. Both Functions are
  ACTIVE Gen 2 `nodejs20` services in `us-central1` on latest traffic, Rules released as
  `1cdf293c-18c7-41b9-a5d4-0595936c0150`, and the two lifecycle indexes are READY. The corrected
  backfill APPLY is complete. This reader activation changed no Rules/index definitions, did not
  repair events, commit, push, publish Studio/Portal, or touch production. The separately authorized
  request-trigger Function deployment and reader activation are recorded below.

Closed goal artifacts:

- Plan: `docs/workflow/plans/2026-09-09-user-info-print-request-lifecycle-activity-ordering-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-review.md`
- Test report: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-test-report.md`
- Implementation Review: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-implementation-review.md`
- DEV deployment record: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-dev-deployment.md`
- Trigger corrective DEV deployment: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-trigger-mirror-only-corrective-dev-deployment.md`
- Indexed-reader DEV activation: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-indexed-reader-dev-activation.md`
- Final Signoff: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-signoff.md`
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

- The previous child goal `legacy-tag-operational-retirement-and-smart-profile-search-parity` is
  **CLOSED** with approved signoff after Owner DEV QA **PASS** on 2026-09-09; there is no active
  goal.
- Commit/push is complete as `1c43f6e1` on `origin/development`; production and publish remain
  separately gated.
  The owner decisions are resolved: Halftone uses the existing `halftoneStaffDecision.value`,
  legacy Studio tag URLs are ignored without mapping, and incomplete Smart Profiles do not fall
  back to historical tags.
- Prior managed goal `print-request-direct-export-gangsheet-and-copy` is closed with approved
  signoff after Owner DEV QA **PASS** on 2026-09-08.
- The original request Export/Generate/Copy implementation, the owner-authorized global Gang
  Sheet Settings/four-tier amendment, and the requested Settings UX refinement are complete and
  validated. The authorized DEV Rules/Function deployment is preserved as completed evidence.
- The prior Print Request commit `ab319468` and the legacy tag retirement commit `1c43f6e1` are
  pushed to `origin/development`; Studio publish and production remain separately gated; no new
  goal is selected.
- Direct Export/Generate/Copy buttons are hidden on Working and Editing requests; existing Add to
  Show/Internal Gangsheet actions remain available there.
- Studio publish and production remain separately gated.

## Closed managed goal handoff — Print Request lifecycle activity ordering

- Owner DEV QA for the indexed history reader: **PASS**.
- Final disposition: **approved_with_notes**; the managed goal is **CLOSED** and no active
  corrective remains.
- Final Details ordering: **newest → oldest**. Earlier Plan/Review wording that says oldest →
  newest remains historical and is superseded by the owner-tested final contract.
- Reader-eligible mirror coverage: **8/8 (100%)**; both lifecycle indexes are **READY**; the
  compatibility reader remains available as rollback.
- The two historical duplicate conversion events remain
  `SAFE_TO_LEAVE_AS_HISTORICAL_DUPLICATE`; they do not alter mirror ordering, Details dedupes the
  visible row, and no cleanup is required.
- No backfill rerun, event repair, Rules/index change, Firebase deploy, Studio publish, Portal
  deployment, production action, commit, or push occurred in the signoff turn.
- Signoff: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-signoff.md`.

FreshForge is **IDLE** at `[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`. The next checkpoint is:

`[NEEDS OWNER AUTHORIZATION: COMMIT/PUSH CLOSED PRINT REQUEST LIFECYCLE GOAL]`

DEV cutover evidence (2026-09-09): six explicitly allowlisted Functions were deployed to
`fresh-prints-dev`; existing local Portal/Studio Smart Filter flags were already enabled; the
existing owner/admin reconcile dry-run/apply processed 350 ready records in
`portal_catalog_ready_dev`; settings removed `tagIds` and `tagFacetKeys` while preserving all eight
Smart Profile facets and non-tag searchable fields. Live parity checks covered facets/AND,
category, q/text fields, pagination, zero counts, missing profiles, exact ID, former tag-name/
alias zeros, and Halftone via `halftoneStaffDecision.value`. No production, Portal/Studio publish,
Rules/index deploy, migration/backfill, or tag deletion occurred. Commit/push completed as
`1c43f6e1` after the Owner DEV QA signoff.
Owner DEV QA then passed; the deterministic read-only corrective audit re-derived 20 former
tag-name/alias samples, all with no preserved Ready-design baseline and no current Algolia hits,
with zero material regressions.

Artifact: `docs/workflow/reviews/2026-09-09-legacy-tag-retirement-smart-profile-dev-cutover.md`.
Signoff: `docs/workflow/reviews/2026-09-09-legacy-tag-operational-retirement-and-smart-profile-search-parity-signoff.md`.

## Closed goal evidence

Owner scope now includes one global Studio Gang Sheet Settings source for all six current physical
layout settings plus four width-based price/weight tiers; Show Queue/Internal local editors must
be removed or read-only; direct request Standard Gang Sheet output must visibly use the same
price/weight resolver; and all material settings must invalidate cache fingerprints.

The repository investigation and in-place Plan/Formal Review amendments are complete, as is the
owner-authorized local implementation. Focused amended tests, compositor regression, Functions
build, Vite build, targeted lint, and diff check passed. Studio typecheck/full build retain the
documented unrelated baseline failures. Java 25 is available and the owner freed the unrelated
port 8080 conflict. The exact `npm run test:rules` command started the Firestore and Storage
emulators and passed 169/169 tests across 22 suites (exit code 0); no corrective Rules/code
change was needed. The authorized DEV deployment then completed: Firestore Rules released
ruleset `0d32ca64-8cfc-4bd8-bd56-b34f426d47bd`, and `copyStudioPrintRequest` is ACTIVE in
`us-central1` on Node.js 20, revision `copystudioprintrequest-00001-yec`, 100% traffic on the
latest revision, source hash `6484fccde1612904191273e4e92138f1c9c780e0`. No other Function,
Storage Rules, indexes, migration, Portal, Studio, or production deployment occurred. A
  post-deployment local refinement now renders independent Price and Weight lines and calculates
  grouped totals from logical request source items, saved dimensions, and quantities rather than
  physical placements. The latest local presentation follow-up sorts price/weight terms in
  ascending configured price order, uses a smaller gang-sheet summary font, formats modal lengths
  to exactly two decimals, and adds labeled clickable Print Request totals with a calculation
  breakdown plus per-card cost formulas. Focused validation passed 46/46, targeted lint and Vite
  build passed, full Studio typecheck retains unrelated baseline errors, and `git diff --check`
  passed. A later local polish replaced the old request size-count pill with the richer Total price
  and Total weight controls, restored stacked Qty/dimensions/Cost card metadata, made gang-sheet
  warnings dismissible, and expanded the bounded sheet-list scroll region. The latest local card
  alignment refinement mirrors Qty/Cost and dimensions/calculation into two metadata columns. The
  latest size-summary refinement uses compact `Pocket`, `Reg Full`, `Reg Oversize`, and
  `Ext Oversize` labels on Show Queue and Internal Gang Sheet allocation cards only; Print Request
  list cards intentionally retain only design and quantity totals. The focused contract tests
  passed 19/19, targeted lint and direct Vite build passed, and `git diff --check` passed; the full
  Studio build remains blocked by documented unrelated baseline TypeScript errors. The latest
  totals-modal polish renders each bold tier label with its settings range inline in parentheses,
  with the count on the next line; modal contract tests passed 6/6.
  Owner DEV QA then passed, the goal was signed off, and commit/push completed as `ab319468`.
  Studio publish and production remain separate checkpoints.

`[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`

## Closed goal handoff

- Portal and Studio no longer expose active legacy tag filters, tag management, tag display, tag
  facet reads, or tag search corpus terms. Smart Profile facets/category/search, exact IDs, and
  dedicated Halftone filtering remain.
- Studio AI Review no longer seeds or writes regular tags; existing censored-term editing remains.
- Shared/Functions Algolia records and change classification no longer carry tag-specific fields or
  index work. Historical `design.tags`, Rules/indexes, taxonomy schema-v1 compatibility, and
  deployed tag-trigger/archive exports remain deferred compatibility.
- Focused verification: Portal 82/82, Studio 39/39, Functions/shared 45/45; Portal tsc and Functions
  build pass; Studio tsc has only documented unrelated baseline failures; Portal Next build is
  Windows `.next/trace`/timeout-blocked; `git diff --check` passes.
- Owner DEV QA is **PASS** and signoff is **approved**. Commit/push is complete as `1c43f6e1`.
  Production/backfill, physical tag cleanup, retained compatibility Function deletion, and
  Rules/index cleanup remain separately gated.

Parent program:
`smart-catalog-intelligence-completion-and-legacy-tag-retirement`

The parent may still contain parked or deferred work, but it is not itself an
active child goal.

## Parked or deferred work

| Item | Status |
|------|--------|
| WS5 Autonomous DEV canary | **CLOSED** — PASS under Model 2; Autonomous remains OFF |
| WS6 | **NOT STARTED** — candidate only; requires a new Plan/Review and owner authorization |
| Tag / reranker retirement | Operationally retired in DEV; physical cleanup and compatibility deletion deferred |
| Autonomous | **OFF** |
| Automatic Pass 2 | **PARKED** |
| Production promotion | **SEPARATELY GATED / NOT AUTHORIZED** |

The prior `portal-admin-daily-show-queue` goal is closed: its two reviewed Functions are ACTIVE
in DEV after the owner-authorized redeploy, and its signoff is `approved_with_notes`. The current
goal is the lifecycle-history corrective above; Owner DEV re-QA is **PASS**, and the separately
reviewed DEV backfill authorization is required before the next gate. Production remains separately
gated.
