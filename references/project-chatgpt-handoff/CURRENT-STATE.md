# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-16

## CURRENT AUTHORITATIVE PHASE — COORDINATED PRODUCTION PROMOTION

Owner release instruction has lifted the previous production hold for managed
goal `coordinated-production-promotion-2026-09-16`.

The reviewed candidate preparation is on clean `origin/development` tip
`2532c0acbb54365d3def0f907c698cf17bc80fde`, which includes the required Studio
fix `37655dcd52760992cc2892e096bac30cbaa797ba`. Current production remains
`840d596b058b3f7bef2dae886154aa667f9e2a57` (`v1.0.12`). The exact final
candidate SHA is not frozen until the final read-only gates and rollback packet
are refreshed.

Formal Review is `approved_with_changes`; deterministic corrections are applied:
the live `completeStaffGangSheetAndOpenNext` callable is an UPDATE in the
Function closure, and Studio is version `1.0.13`.

The owner explicitly accepted the exact three Rules failures reproduced against
`firestore.transition.rules` as a known baseline emulator limitation: 179/182
tests pass, with no candidate-only regression identified. The final frozen
candidate must still confirm the same three failures, the 1,000-expression
signature, passing candidate-specific Rules contracts, and no access broadening.

Current next step: refresh rollback anchors and freeze the exact candidate, then
use the protected development → production path and the reviewed Firebase →
Portal → Studio order. No production data repair, AI setting change, secret
change, or broader IAM change is authorized.

The prior `selected-print-request-live-sync-studio-portal` DEV QA record remains
included in the cumulative promotion manifest and its signoff evidence.
