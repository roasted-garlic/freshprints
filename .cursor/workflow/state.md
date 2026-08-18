## Current Goal
portal-add-to-show-unmissable

## Current Mode
managed-phase

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
Read docs; answer questions; commit if the owner asks; prepare a later development → production PR only if asked

## Forbidden Actions
backend/Functions/Rules/schema; mix unrequested analytics implementation; production push; App Hosting; force-push; drop/clear stash; create branches or worktrees

## Plan
docs/workflow/plans/2026-08-18-portal-add-to-show-unmissable-plan.md

## Review
docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-review.md

## Test Report
docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-test-report.md

## Human Checkpoint
docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-dev-qa-checkpoint.md

## Signoff
docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-signoff.md

## Checkout
development (uncommitted Portal copy until owner commits)

## Preserve stash
stash@{0}: repository-development-first-reconciliation: preserve dirty main checkout 2026-08-18
stash@{1}: On development: td030-wip-leave-unrelated (protected; do not drop)

## Next Required Step
Idle — owner may commit on development; production PR is later and separate

## Last Completed Step
Signoff approved for portal-add-to-show-unmissable — 2026-08-18

## Tests Run
- npm run typecheck --workspace @fresh-prints/portal (exit 0)
- npx tsx --test apps/portal/features/print-requests/components/CurrentRequestDrawer.addToShowCopy.test.ts (8/8, exit 0)
- Owner DEV ADD TO SHOW UNMISSABLE QA: PASS

## portal-design-engagement-analytics
QUEUED — not mixed into this goal

## portal-tag-alias-search-discoverability
QUEUED ONLY, not activated

## Phase 9
PARKED

## Cutover (CLOSED)
docs/workflow/reviews/2026-08-16-myprintrequest-com-cutover-signoff.md

## Live App Hosting
fresh-prints-portal-build-2026-08-18-001 @ cb006bd5a21580cccf89d6c1d13d31f07633c51f

## Reconciliation
CLOSED — PR #82 merged; origin/development @ 60f0086

## Decision Log
- 2026-08-18: Signoff approved — owner `DEV ADD TO SHOW UNMISSABLE QA: PASS`
- 2026-08-18: Owner DEV QA asked to relabel review header CTA **Add Request to Whatnot Show** and make it wider (desktop) / full-width (mobile); picker behavior unchanged
- 2026-08-18: Formal Review approved — copy/presentation only
- 2026-08-18: PR #82 merged; development fast-forwarded to 60f0086
- 2026-08-18: ADR-FP-137 accepted — development-first Git workflow
