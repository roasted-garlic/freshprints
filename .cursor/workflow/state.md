## Current Goal
studio-mac-autoupdate-signing-and-searchable-category-picker

## Current Mode
managed-phase

## Phase
implement — C corrective applied; awaiting owner re-QA for C

## Plan Status
amended — C+D reviewed

## Review Status
A/B: approved_with_changes (binding)
C+D amendment: approved_with_changes
C+D implementation review: approved_with_notes
C corrective implementation review: approved_with_notes

## Implementation Status
partial — B + A1 + C + D + C corrective; A2 credential-gated; DEV backend previously deployed

## Test Status
passed_with_notes — C corrective focused tests green; owner B/D PASS; C re-QA pending

## Signoff Status
not_started

## Human Checkpoint Required
yes

## Human Checkpoint Reason
(1) Owner re-QA Workstream C corrective checklist. (2) A2 Apple cert + MAC_CSC_*. (3) No Test phase until C PASS. (4) No production promote/publish.

## Allowed Actions
Owner QA recording; docs; A2 only after Apple secrets checkpoint

## Forbidden Actions
FreshForge Test phase until C PASS; Production deploy; Studio publish; Apple secret configuration without owner

## Next Required Step
Owner re-QA Workstream C — then `Continue Workflow` for Test only after C PASS

## DONE
no

## Last Completed Step
Workstream C corrective (tab flicker + Add Request) + Implementation Review approved_with_notes

## Plan
docs/workflow/plans/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-plan.md

## Review (A/B binding)
docs/workflow/reviews/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-review.md

## Review (C+D amendment)
docs/workflow/reviews/2026-08-14-studio-1.0.6-workstreams-c-d-plan-amendment-review.md

## Implementation Review (C+D)
docs/workflow/reviews/2026-08-15-studio-1.0.6-workstreams-c-d-implementation-review.md

## Implementation Review (C corrective)
docs/workflow/reviews/2026-08-15-studio-1.0.6-workstream-c-corrective-implementation-review.md

## DEV Deploy Record
docs/workflow/reviews/2026-08-15-studio-1.0.6-staff-gang-sheet-dev-deploy-record.md

## Owner QA checklist (B)
docs/workflow/reviews/2026-08-14-studio-searchable-category-picker-owner-qa-checklist.md

## Owner QA checklist (C+D)
docs/workflow/reviews/2026-08-15-studio-1.0.6-workstreams-c-d-owner-qa-checklist.md

## Owner QA checklist (C corrective re-test)
docs/workflow/reviews/2026-08-15-studio-1.0.6-workstream-c-corrective-owner-qa-checklist.md

## Branch
feature/studio-1.0.6-mac-signing-and-searchable-category

## Target release
Studio 1.0.6

## Decision Log
- 2026-08-15: Owner DEV QA — B PASS, C FAIL, D PASS
- 2026-08-15: C corrective — URL query no longer forces Shows over Staff surface; Add Request in header + Staff permission gate
- 2026-08-15: Owner authorized DEV deploy; rules+indexes+4 functions on fresh-prints-dev (unchanged by this corrective)

## Prior Goal (preserved, closed)
- Goal: `studio-ai-review-reprocess-local-reconciliation`
- Status: DONE — Studio 1.0.5 / PR #75
