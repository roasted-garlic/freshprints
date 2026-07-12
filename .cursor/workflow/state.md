## Current Goal
portal-customer-artwork-upload — remediation r7 (limits, speed, confirmations, DPI)

## Phase
test — await manual UI checkpoint

## Plan Status
complete — approved

## Review Status
approved

## Implementation Status
complete — including mid-checkpoint PNG fast-path + 200 DPI save floor

## Test Status
passed_with_notes — sizing unit tests pass (200 DPI floor); awaiting owner manual checkpoint

## Signoff Status
G / parent: blocked until manual PASS

## DONE
no

## Blocked
no

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Manual verify r7 + mid-checkpoint fixes — docs/workflow/reviews/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-manual-checkpoint.md

## Allowed Actions
Read docs; wait for owner PASS / PASS WITH NOTES / FAIL; record feedback

## Forbidden Actions
Production deploy; always-in-selection redesign; G/parent signoff without manual PASS

## Next Required Step
Await owner reply on r7 manual checkpoint


## Decision Log
- 2026-07-12 — Owner approved r6; always-in-selection deferred to roadmap follow-up.
- 2026-07-12 — r6 implemented; listPortalAllocatableShows deployed to fresh-prints-dev.
- 2026-07-12 — During r6 manual check: selection-mode Upload artwork now saves pending designs before opening upload.
- 2026-07-12 — During r6 manual check: Upload artwork UI changed from inline panel to near-fullscreen modal.
- 2026-07-12 — r7 plan approved: 100 files, 100MB, 2GB batch, concurrency 8, daily 200, copy OK; staff can promote but must see library decline.
- 2026-07-12 — r7 implemented + deployed to fresh-prints-dev; awaiting manual checkpoint.
- 2026-07-12 — Daily create-batch cap raised 10→100 (error was batch sessions, not MB/images); clearer quota messages; per-row Retry removed.
- 2026-07-12 — Mid-checkpoint: PNG fast-path (sample transparency, conditional trim/upscale/convert, GCS production copy) + stages converting/trimming/upscaling; redeployed finalize/retry/zip to fresh-prints-dev.
- 2026-07-12 — Owner: Print Request saves require ≥ 200 effective DPI (was 72). ADR-FP-075; shared assess + initial size clamp updated.
