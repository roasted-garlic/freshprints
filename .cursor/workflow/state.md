## Current Goal
studio-mac-autoupdate-signing-and-searchable-category-picker

## Current Mode
managed-phase

## Phase
implement — C+D implemented; DEV deploy complete; awaiting owner DEV QA

## Plan Status
amended — C+D reviewed

## Review Status
A/B: approved_with_changes (binding)
C+D amendment: approved_with_changes
C+D implementation review: approved_with_notes

## Implementation Status
partial — B + A1 + C + D complete; A2 credential-gated; DEV rules/functions/indexes deployed for QA

## Test Status
passed_with_notes — automated green locally; DEV backend updated 2026-08-15; owner DEV QA pending for B/C/D

## Signoff Status
not_started

## Human Checkpoint Required
yes

## Human Checkpoint Reason
(1) Owner DEV QA for C+D (and B if still pending) using checklist. (2) Confirm new Firestore index Enabled in Console if complete+next fails. (3) A2 Apple cert + MAC_CSC_*. (4) No production promote/publish.

## Allowed Actions
Owner QA recording; docs; A2 only after Apple secrets checkpoint; Test phase after QA

## Forbidden Actions
Production Rules/Functions/indexes deploy; Studio publish; Apple secret configuration without owner; reopen A/B scope; synthetic whatnotShowId

## Next Required Step
Owner DEV QA for C+D — then `Continue Workflow` for Test

## DONE
no

## Last Completed Step
Authorized DEV deploy: rules + indexes + Staff Gang Sheet functions → fresh-prints-dev (2026-08-15)

## Plan
docs/workflow/plans/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-plan.md

## Review (A/B binding)
docs/workflow/reviews/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-review.md

## Review (C+D amendment)
docs/workflow/reviews/2026-08-14-studio-1.0.6-workstreams-c-d-plan-amendment-review.md

## Implementation Review (A1/B slice)
docs/workflow/reviews/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-implementation-review.md

## Implementation Review (C+D)
docs/workflow/reviews/2026-08-15-studio-1.0.6-workstreams-c-d-implementation-review.md

## DEV Deploy Record
docs/workflow/reviews/2026-08-15-studio-1.0.6-staff-gang-sheet-dev-deploy-record.md

## Owner QA checklist (B)
docs/workflow/reviews/2026-08-14-studio-searchable-category-picker-owner-qa-checklist.md

## Owner QA checklist (C+D)
docs/workflow/reviews/2026-08-15-studio-1.0.6-workstreams-c-d-owner-qa-checklist.md

## Branch
feature/studio-1.0.6-mac-signing-and-searchable-category

## Target release
Studio 1.0.6

## Decision Log
- 2026-08-14: A/B Review approved_with_changes; B+A1 implemented; A2 gated
- 2026-08-14: Plan amended with C+D
- 2026-08-14: C+D Review **approved_with_changes**
- 2026-08-15: C+D Implement complete; Implementation Review **approved_with_notes**
- 2026-08-15: Owner authorized DEV deploy; rules+indexes+4 functions deployed to **fresh-prints-dev** only (exit 0)

## Prior Goal (preserved, closed)
- Goal: `studio-ai-review-reprocess-local-reconciliation`
- Status: DONE — Studio 1.0.5 / PR #75
