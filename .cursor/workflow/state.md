## Current Goal
studio-upload-preview-and-show-queue-links

## Phase
implement

## Plan Status
n/a — narrow Studio UX fix (upload preview + nav links)

## Review Status
n/a — narrow bug/UX fix

## Implementation Status
complete — upload preview + show-queue ↔ request links

## Test Status
pending — owner visual confirm

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Owner visual confirm of upload preview/filename on request detail and bidirectional show-queue links.

## Next Required Step
Await owner PASS / FAIL / PASS WITH NOTES on the two Studio checks


## Decision Log
- 2026-07-13 — Studio: load customer upload summaries for request detail (preview + filename title); show-queue deep-link `?showId=&requestId=` with highlight; reverse link from attached request rows to print request detail.
- 2026-07-13 — Owner: Studio request detail missing upload preview/title; need show-queue ↔ print-request bidirectional links (including scroll to request card on show queue).
