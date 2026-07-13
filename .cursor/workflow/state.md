## Current Goal
print-request-working-triage-search

## Phase
test

## Plan Status
complete — docs/workflow/plans/2026-07-13-print-request-working-triage-search-plan.md

## Review Status
approved — docs/workflow/reviews/2026-07-13-print-request-working-triage-search-review.md

## Implementation Status
complete

## Test Status
partial — unit tests + functions build + portal typecheck passed; manual Studio/Portal UI pending; Functions deploy required for clear/archive callables

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Manual UI verification of Studio Working triage + search; Portal Clear request; deploy Functions before shared-env clear works.

## Allowed Actions
Record test report; prepare manual checkpoint; docs-only fixes

## Forbidden Actions
Production deploy without approval; scope expansion

## Next Required Step
Owner manual PASS on Studio Print Requests rail + Portal clear; deploy clearPortalWorkingPrintRequest + archiveStaleWorkingPrintRequests

## Decision Log
- 2026-07-13 — Parked `portal-donate-designs` (manual PASS / deploy still outstanding).
- 2026-07-13 — Implemented ADR-FP-079: Working triage, cross-tab search, Portal clear callable, empty stale archive callable.

## Files Created
- packages/shared/src/utils/printRequestWorkingTriage.ts (+ test)
- apps/studio/.../utils/printRequestListSearch.ts (+ test)
- functions/src/clearPortalWorkingPrintRequest.ts
- functions/src/archiveStaleWorkingPrintRequests.ts
- docs/workflow/plans/2026-07-13-print-request-working-triage-search-plan.md
- docs/workflow/reviews/2026-07-13-print-request-working-triage-search-review.md

## Files Modified
- PrintRequestsPage + print-requests.css; Portal sidebar/drawer/context/service; functions index; DATA_MODEL, BACKEND, SECURITY, DECISIONS, tab helper copy
