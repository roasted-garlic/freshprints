# Current Goal
Brevo proof-ready email: owner IP/blocklist deliverability (not first-proof app skip)

## Current Mode
managed-phase

## Phase
test

## Plan Status
n/a - investigation pivot; no app fix planned

## Review Status
n/a

## Implementation Status
n/a - no speculative code deploy

## Test Status
partial - Functions logs confirm enqueue + Brevo `provider_rejected` on failed first proofs

## Signoff Status
pending (Brevo); wipe presets **approved_with_notes** 2026-07-18

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Brevo/provider IP allowlisting or blocklist - clear in Brevo dashboard, then retest first-proof email. See docs/workflow/reviews/2026-07-18-brevo-proof-email-ip-block-checkpoint.md

## Allowed Actions
Read docs; await owner Brevo IP/blocklist fix + retest result. No production deploy.

## Forbidden Actions
Speculative first-proof code fixes; Functions deploy for this email issue; production deploy; secrets in chat

## Next Required Step
Await owner Brevo transactional-log / IP allowlist fix; then first-proof email retest (PASS/FAIL)

## DONE
no (Brevo open). Wipe presets goal closed.

## Last Completed Step
2026-07-18 - Studio Test Data Reset presets + wipe expansion signed off **approved_with_notes** after owner **PASS** (short labels, presets incl. **All (-) Designs**, expanded Etsy/Custom leftovers; `wipeOperationalTestData` already on fresh-prints-dev). Signoff: docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-signoff.md

## Plan Path
(n/a - deliverability / Brevo console)

## Review Path
docs/workflow/reviews/2026-07-18-brevo-proof-email-ip-block-checkpoint.md

## Manual QA Path
docs/workflow/reviews/2026-07-18-brevo-proof-email-ip-block-checkpoint.md

## Signoff Path
(wipe closed) docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-signoff.md

## Files Modified
(wipe closed - see signoff). Brevo: no app code.

## Deploy
- Prior: `wipeOperationalTestData` → `fresh-prints-dev` (2026-07-18)
- No deploy for Brevo pivot
- No production

## Parked Prior Workflow
(none) - Studio Test Data Reset presets closed 2026-07-18 after owner PASS.

## Decision Log
- 2026-07-18 - Owner **PASS** on Studio Test Data Reset wipe UX → signoff **approved_with_notes**; wipe human checkpoint cleared.
- 2026-07-18 - Owner request: preset for everything but designs → `EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS` = all ops targets except `designs`. Final UI label: **All (-) Designs**.
- 2026-07-18 - Owner pivot: first-proof email miss is Brevo/IP blocking, not app skip. Logs: enqueue OK; `provider_rejected` on failed first proofs; follow-up proof same day sent via Brevo. No speculative deploy.
- 2026-07-18 - Owner follow-up: include `etsyRecommendationSuggestions` + `etsySuggestionRequests` in Etsy wipe. Deploy wipe function to fresh-prints-dev - deployed.
- 2026-07-18 - Started managed phase: Test Data Reset presets + short labels; expand assisted/etsy wipe to orphan side collections.
