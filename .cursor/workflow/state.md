## Current Goal
etsy-open-api-restore

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
pending_manual

## Signoff Status
pending

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Manual QA for chips, Custom Designs nav → options, and no resume/start-over draft UI. After Etsy closes, next is Studio Customer Requests.

## Allowed Actions
Record manual QA feedback; answer questions; no production; no scrape; no commit unless asked.

## Forbidden Actions
Production deploy; ScraperAPI/Firecrawl; commit unless asked; signoff before manual QA recorded.

## Next Required Step
Hard-refresh Portal. Confirm Find a design always starts blank with no resume banner. Reply PASS / FAIL / PASS WITH NOTES.

## DONE
no

## Last Completed Step
2026-07-16 — Removed resume/start-over draft gating. Find a design always starts blank; Edit search from results keeps answers in memory; submit still saves Firestore audit trail. Portal typecheck PASS.

## Plan Path
docs/workflow/plans/2026-07-16-etsy-open-api-restore-plan.md

## Review Path
docs/workflow/reviews/2026-07-16-etsy-open-api-restore-review.md

## Test Report Path
docs/workflow/reviews/2026-07-16-etsy-open-api-restore-test-report.md

## Manual QA Path
docs/workflow/reviews/2026-07-16-etsy-open-api-restore-manual-qa.md

## Decision Log
- 2026-07-16 — **No draft resume UI:** Cleared localStorage drafts on options / Find a design. No Resume/Start over. Edit search from results keeps answers in memory only. Final Find designs still persists audit trail in Firestore.
- 2026-07-16 — **Chip inputs + nav fix:** Subject and tone/style use removable chips. Separators: pill tap, comma, Enter (not space). Selected suggestion pills disappear and cannot be duplicated. Caps: 3 subjects, 2 tones. Clicking Custom Designs while on `?step=subject` (or other wizard steps) returns to options. **Next after Etsy signoff:** Studio Customer Requests page with suggestion-request queue and AI/Fresh Prints placeholders.
- 2026-07-16 — Manual QA returned to implement for chip-input refinements (prior).
