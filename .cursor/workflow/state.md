## Current Goal
studio-etsy-search-tab

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
partial

## Signoff Status
pending

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Deploy firestore.rules + wipeOperationalTestData to fresh-prints-dev; manual QA of Etsy two-column layout + Test Data–only wipe.

## Allowed Actions
Record manual QA; deploy rules/function to fresh-prints-dev if human approves; update test/signoff docs; wait.

## Forbidden Actions
Production deploy; silent further scope expansion; commit unless asked.

## Next Required Step
Await human deploy + manual QA PASS/FAIL, then signoff.

## DONE
no

## Last Completed Step
2026-07-16 — Removed on-tab wipe; Etsy tab is two-column master/detail with Best match / broader cards; wipe stays on Test Data only.

## Plan Path
docs/workflow/plans/2026-07-16-studio-etsy-search-tab-plan.md

## Review Path
docs/workflow/reviews/2026-07-16-studio-etsy-search-tab-review.md

## Test Report Path
docs/workflow/reviews/2026-07-16-studio-etsy-search-tab-test.md

## Manual QA Path
docs/workflow/reviews/2026-07-16-studio-etsy-search-tab-test.md

## Decision Log
- 2026-07-16 — Wipe is Test Data only; Etsy tab two-column detail with Portal-style browse cards.

## Deploy commands
firebase deploy --only firestore:rules,functions:wipeOperationalTestData --project fresh-prints-dev

## Parked Goal
studio-customer-requests-suggestions — may still need deploy + manual QA if not completed separately.
