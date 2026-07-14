## Current Goal
print-request-add-to-show-selection-bounce

## Phase
test

## Plan Status
complete

## Review Status
approved

## Implementation Status
complete

## Test Status
pending_manual

## Signoff Status
pending

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Manual Portal + Studio verification: stay on detail after queue/add; calendar stays mounted (no flicker)

## Allowed Actions
Read docs; wait for owner PASS / FAIL / PASS WITH NOTES; record feedback

## Forbidden Actions
Production deploy; new scope until checkpoint feedback

## Next Required Step
Await human feedback on `docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-manual-checkpoint.md`

## DONE
no

## Last Completed Step
Amendment implemented — Portal stay on detail; Studio/Portal keep ShowPicker mounted; close modal before refresh

## Decision Log
- 2026-07-13 — Studio follow-to-Queued detail after Add to Show.
- 2026-07-13 — Owner: original intent was Portal; keep Studio fix; smooth calendar flicker on both.
- 2026-07-13 — Portal: removed navigate to `/requests?tab=queued`; silent in-place refresh on detail.
- 2026-07-13 — Studio/Portal: calendar stays mounted during submit/celebrate; modal closes before parent reload.
- 2026-07-13 — Owner: Queued progress readout = “Waiting for the printing to start”; counting timer only once printing has started.
- 2026-07-13 — Owner: first catalog Add to request feels laggy (create-before-add); make optimistic so badge/qty/toast feel instant.
- 2026-07-13 — Owner: make discover home `/` (no /catalog); library at `/catalog`; drop Home nav (logo returns home).
