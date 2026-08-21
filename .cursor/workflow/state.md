## Current Goal
none

## Current Mode
idle

## Phase
signoff

## Plan Status
complete

## Review Status
approved

## Implementation Status
complete

## Test Status
passed

## Signoff Status
approved

## DONE
yes

## Human Checkpoint Required
no

## Human Checkpoint Reason
none

## Allowed Actions
read docs; wait for next owner goal

## Forbidden Actions
production index deploy; production PR; Studio release; Portal deploy; Functions deploy; Rules change; schema change; production data mutation; scan/backfill/repair printRequests; add additional indexes; create branches or worktrees; pop stashes; force-push; direct-push production; Phase 9; tag-alias unless owner activates

## Plan
docs/workflow/plans/2026-08-20-studio-print-request-customer-internal-list-split-plan.md

## Review
docs/workflow/reviews/2026-08-20-studio-print-request-customer-internal-list-split-review.md

## Checkout
C:\coding\fresh-prints on development @ 4865c2b

## Production Signoff
docs/workflow/reviews/2026-08-18-portal-pr-83-production-signoff.md

## Rollout record
docs/workflow/reviews/2026-08-18-portal-pr-83-app-hosting-rollout-record.md

## DEV Signoffs
docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-signoff.md
docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-signoff.md
docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-signoff.md
docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-signoff.md

## Owner public-ID decision
ADR-FP-138

## Preserve stash
stash@{0}: repository-development-first-reconciliation: preserve dirty main checkout 2026-08-18
stash@{1}: On development: td030-wip-leave-unrelated (protected; do not drop)

## Production PR
https://github.com/roasted-garlic/freshprints/pull/83

## Production merge
99b230333efd9a4892f8c4a30ccf72008baf2246

## Test Report
docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-test-report.md

## Signoff
docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-signoff.md

## Last Completed Step
Signoff approved. Goal `studio-print-request-customer-internal-list-split` CLOSED (DEV). Owner Studio QA `PASS`.

## Next Required Step
IDLE. Await next owner goal. Commit on `development` when requested. Production index / Studio release later.

## Tests Run
2026-08-21: list-split unit 50 pass; sizing+Add Designs 38 pass; Studio `tsc --noEmit` 0; `npm run lint` 0; `firebase deploy --only firestore:indexes --project fresh-prints-dev` 0. Owner QA `PASS`.

## portal-add-to-show-unmissable
CLOSED/LIVE — 5d042696ddbc7bce2bc40675e5cae82124e5dc04; layout follow-up 3fe17d8644524afb973e4ce294764405dda95deb; production `99b2303`

## portal-design-engagement-analytics
CLOSED/LIVE — 7350bc42e206c0aa000768e3595f06406433a26b; production `99b2303`

## print-request-shared-sizing-and-queue-integrity
CLOSED (DEV) — `4865c2b` on `development`; signoff `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-signoff.md`

## studio-print-request-customer-internal-list-split
CLOSED (DEV) — uncommitted on `development`; signoff `docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-signoff.md`; owner QA `PASS`

## portal-tag-alias-search-discoverability
QUEUED ONLY, not activated

## Phase 9
PARKED

## Cutover (CLOSED)
docs/workflow/reviews/2026-08-16-myprintrequest-com-cutover-signoff.md

## Live App Hosting
fresh-prints-portal-build-2026-08-19-001 @ 99b230333efd9a4892f8c4a30ccf72008baf2246

## Rollback
fresh-prints-portal-build-2026-08-18-001 @ cb006bd5a21580cccf89d6c1d13d31f07633c51f

## Decision Log
- 2026-08-21: Owner Studio QA `PASS`. Signoff **approved**. Goal `studio-print-request-customer-internal-list-split` CLOSED (DEV). No production. IDLE.
- 2026-08-21: Owner QA visual: Customer/Internal kind switcher restyled to match Users page Staff/Customers segmented control. Lifecycle pills unchanged. Checkpoint still open for remaining list-split QA.
- 2026-08-21: Implement complete. Automated Test passed. Composite index deployed to `fresh-prints-dev` only. STOP for owner Studio QA. No production.
- 2026-08-21: Owner `APPROVE IMPLEMENT: studio-print-request-customer-internal-list-split` and `APPROVE DEV INDEX` for `isInternal + queueTab + updatedAt DESC + __name__ DESC` on `fresh-prints-dev` only. No known missing-`isInternal` docs; do not scan/backfill. If count query is unserved or missing-field records appear, STOP. No production.
- 2026-08-20: Started new managed goal `studio-print-request-customer-internal-list-split` after sizing/queue-integrity CLOSED (DEV). Plan + Formal Review **approved**. STOP before Implement. New composite index required; not added/deployed.
- 2026-08-20: Committed and pushed `4865c2b` to `development`. No production promotion, Functions deploy, Portal deploy, or Studio release.
- 2026-08-20: Owner `Continue Workflow`. Amendment 2 Implement complete (item-id Add Designs save). Automated Test passed. STOP for combined owner QA. No commit, no production.
- 2026-08-20: Owner Amendment 2 (Add Designs duplicates resized items at default size). Investigation complete. Plan + Formal Review **approved**. STOP before Implement. Parent sizing + Amendment 1 preserved.
- 2026-08-20: Owner requested 200–299 DPI warning copy: "It can be printed, but quality may be reduced." Applied in shared assess. Still awaiting owner QA.
- 2026-08-20: Combined Implement complete. Automated Test passed. STOP for owner QA (sizing + Past/Printing). No commit, no Functions deploy, no production.
- 2026-08-20: Owner `Continue Workflow`. Combined Implement started (sizing first, then Amendment 1 Finish/auto-complete).
- 2026-08-20: Owner Amendment 1 added to the same goal (Past + Printing Finish reuse + Mark Complete). Amendment 1 Plan + Formal Review **approved**. Combined Implement still blocked on owner.
- 2026-08-20: Started managed goal `print-request-shared-sizing-and-queue-integrity` from idle. Plan + Formal Review complete. Implement blocked on owner approval.
- 2026-08-18: Started portal-design-engagement-analytics after show-clarity commit 5d04269
- 2026-08-18: portal-add-to-show-unmissable committed and pushed; no production PR
- 2026-08-18: Formal Review approved; Implement complete; automated Test 99/99; STOP for owner g/collect QA
- 2026-08-18: Owner requested Amendment 1 (modal virtual page_view). Formal Review approved. Implemented. 104/104. STOP again for owner QA. No signoff.
- 2026-08-18: Stopped Portal next-dev; `npm run build:portal` exit 0. Classified leftover show-clarity dirty files as owner-approved layout (B); committed `3fe17d86` and pushed. Analytics remains uncommitted.
- 2026-08-18: Owner requested Amendment 2 (Modal:/Share: prefixes + public catalog design IDs). Formal Review **approved**. ADR-FP-138 recorded. Implemented. Automated Test 109/109.
- 2026-08-18: Owner `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS` (Amendment 2 transport). QA checkpoint resolved.
- 2026-08-18: PR **#83** merged @ `99b2303`. Owner authorized App Hosting. Preflight PASS. Agent create hook-blocked (same as prior prod rollouts). Awaiting owner-local `apphosting:rollouts:create` then Continue Workflow.
- 2026-08-18: Owner-local create succeeded. LIVE `fresh-prints-portal-build-2026-08-19-001` @ `99b2303` **100%**. Infrastructure smoke PASS. **AWAITING OWNER PRODUCTION QA.**
- 2026-08-18: Owner `PROD PR 83 QA: PASS`. Production Signoff **approved**. Both goals CLOSED/LIVE. Workflow IDLE.
