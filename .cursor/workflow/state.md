## Current Goal
production-promote-portal-and-studio-2026-08-23

## Current Mode
managed-phase

## Phase
test

## Plan Status
complete

## Review Status
approved_with_changes

## Implementation Status
complete

## Test Status
passed_with_notes

## Signoff Status
not_started

## DONE
no

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Gate B complete on development. Await owner authorization to open/merge the production PR (development → production). No Firebase, App Hosting, or Studio release mutations authorized.

## Allowed Actions
read docs; answer owner questions; create production PR only after owner phrase (do not merge until merge phrase)

## Forbidden Actions
merge to production without phrase; production Firebase deploy; App Hosting rollout; Studio dispatch/publish; force-push; Phase 9

## Plan
docs/workflow/plans/2026-08-23-production-promote-portal-and-studio-plan.md

## Review
docs/workflow/reviews/2026-08-23-production-promote-portal-and-studio-review.md

## Test Report
docs/workflow/reviews/2026-08-23-production-promote-portal-and-studio-gate-b-test-report.md

## Signoff
(n/a — production Signoff later)

## Retrospective DEV Signoffs
- docs/workflow/reviews/2026-08-22-customer-request-show-discovery-and-search-correctives-signoff.md (approved)
- docs/workflow/reviews/2026-08-23-our-shows-page-ux-and-print-request-actions-signoff.md (approved)

## Tests Run
Gate B suite — see Gate B test report (lint, typechecks, Functions build, Portal build, Studio vite+electron-builder 1.0.9, 114 unit + 27 signing-policy)

## Last Completed Step
Gate B verified; RC committed/pushed to development. STOP at production PR checkpoint.

## Next Required Step
Await owner: `APPROVE PRODUCTION PR: production-promote-portal-and-studio-2026-08-23` — then open (and only merge after any separate merge phrase if required).

## Phase 9
PARKED

## Baseline Commit
54357435e978359b180a2201aa207831dd927411

## Production Tip (verified)
27b0b4fb691c081ea1167f863f5fc45224a9c651

## Release Candidate Tip
5b86f181328164d07224d7bb00b1b5216f8601f8

## Decision Log
- 2026-08-23: Prior goal `studio-workflow-organization-and-grouped-gang-sheet` signed off @ `5435743`; FreshForge was IDLE.
- 2026-08-23: New managed goal `production-promote-portal-and-studio-2026-08-23` opened. Verified development tip `5435743`, production tip `27b0b4f` (PR #87), published Studio v1.0.8 @ `32101904`, last recorded live Portal build-2026-08-21-001 @ `7716d4a`.
- 2026-08-23: Inventory = 2 commits (`7dfd7ee`, `5435743`). Class E: missing formal Signoffs for show-discovery + Our Shows. Formal Review approved_with_changes. ChatGPT handoff package missing on disk (gitignored references/) — Gate G must recreate/update. STOP — no production mutation.
- 2026-08-23: Owner `APPROVE PRODUCTION RELEASE PLAN` + `CONFIRM DEV SIGNOFF FOR PROMOTION` for show-discovery + Our Shows. Retrospective DEV Signoffs recorded. Gate B authorized (1.0.9 pin + verification only).
- 2026-08-23: Gate B complete — Studio 1.0.9 pinned; verification passed_with_notes (discovery test + lint fixes). RC tip `5b86f18` on development. STOP at production PR checkpoint.
