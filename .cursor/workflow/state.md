## Current Goal
provider-agnostic-proof-ready-email

## Current Mode
managed-phase

## Phase
plan

## Plan Status
complete

## Review Status
pending

## Implementation Status
not_started

## Test Status
not_started

## Signoff Status
not_started

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Owner confirmation is required for `INVITATION_FROM_EMAIL`, `PROOF_NOTICE_FROM_EMAIL`, and the deployed `PORTAL_BASE_URL` before the proof-ready email plan can be reviewed/implemented safely.

## Allowed Actions
Read documentation; answer clarifying questions; record the confirmed sender addresses and Portal base URL; revise the email plan if requested.

## Forbidden Actions
Review or implement the proof-ready email plan before the configuration decisions are recorded; deploy; change secrets or shared environment values; implement Brevo; begin unrelated work.

## Next Required Step
Await owner confirmation of the invitation sender, proof-notice sender, and deployed Portal base URL; then record the decision and run review phase for `docs/workflow/plans/2026-07-16-provider-agnostic-proof-ready-email-plan.md`.

## DONE
no

## Last Completed Step
2026-07-16 — Phase 9C signed off `approved_with_notes` after owner manual QA `PASS`; new provider-agnostic proof-ready email plan completed and paused for sender/base-URL confirmation before review.

## Plan Path
docs/workflow/plans/2026-07-16-provider-agnostic-proof-ready-email-plan.md

## Previous Goal Signoff
docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-signoff.md

## Previous Goal Status
phase-9c-assisted-creation — Signoff Status: approved_with_notes; DONE: yes; Last Completed Step: Signoff

## Review Path
pending

## Decision Log
- 2026-07-16 — Owner returned `PASS` for Phase 9C Assisted Creation manual QA.
- 2026-07-16 — Phase 9C test status set to `passed_with_notes`; signoff `approved_with_notes`; Phase 9C complete.
- 2026-07-16 — New email phase decisions: Resend now; provider-neutral contract; Brevo later; separate runtime provider selection for invites and proof notices; invites remain on Resend; notify on first and revised proofs.
- 2026-07-16 — Email phase plan completed; sender-address and Portal-base-URL confirmations are required before review/implementation.
- 2026-07-16 — No fee; screenshot-based wizard minus Rights; one open; owner/admin mutate helper view; proofing flow; Studio tabs Assisted|AI|Etsy|Suggestions.
- 2026-07-16 — Implementation complete for MVP; awaiting manual QA.
- 2026-07-16 — Owner approved fresh-prints-dev deploy; backend live for Assisted Creation.
- 2026-07-16 — Initial functions deploy (selective): `submitAssistedCreationRequest`, `cancelAssistedCreationRequest`, `customerRespondToAssistedCreationProof`, `staffUpdateAssistedCreationStatus`, `staffAddAssistedCreationProof`. Full `functions` deploy aborted (orphan `ensurePortalWorkingPrintRequest`). Rules/indexes/storage deployed.
- 2026-07-16 — QA bug fix: refresh on mid-wizard assisted URL no longer snaps to step 1 / choose.
- 2026-07-16 — QA bug fix: status Back + Custom Designs nav stay on choose path when an open request exists.
- 2026-07-16 — Portal customer views: richer brief/details + proofs tabs; cancel confirm; optional approval rating (needs callable redeploy on fresh-prints-dev).
- 2026-07-16 — Studio inbox stage tabs + proof detail modal; Find Reset/Continue draft controls.
- 2026-07-16 — Checks/balances: required staff cancel/reject reasons; owner restore; staged proof submit; sidebar actionable count; customer denser modular layout.
- 2026-07-16 — Product: until request is `in_progress`, customer may make additions (update answers + references while `submitted`); server-enforced via `customerUpdateAssistedCreationRequest`.
- 2026-07-16 — Diagnosis: Portal Update → `internal` because `customerUpdateAssistedCreationRequest` was never in any deploy wave (added after initial selective deploy). Code path exports + client name/payload match; local functions build includes the export.
- 2026-07-16 — Re-check (new refs): upload path parity with submit OK; Storage `assisted-creation/{userId}/pending` customer create OK; no move-to-references on submit (paths stay pending). Client maps not-found/internal to clearer copy; Update sheet header stacked (shared `AssistedCreationUpdateModal`). Still need functions redeploy before Update QA can pass.
- 2026-07-16 — Live list reconfirm: `customerUpdateAssistedCreationRequest` absent on fresh-prints-dev. Update modal keeps open on failure with in-modal error; closes on success. Parent page no longer shows update errors behind the overlay.
- 2026-07-16 — Human approved the pending dev deploy. Built Functions successfully and selectively deployed `customerUpdateAssistedCreationRequest`, `customerRespondToAssistedCreationProof`, `staffUpdateAssistedCreationStatus`, `staffAddAssistedCreationProof`, `submitAssistedCreationRequest`, `cancelAssistedCreationRequest`, and `wipeOperationalTestData` to fresh-prints-dev.
- 2026-07-16 — Automated checks completed and recorded in `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-test-report.md`; manual checkpoint created at `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-manual-qa.md`.

## Tests Run

- New email phase: none yet (plan only).
- Previous Phase 9C: `passed_with_notes`; see `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-test-report.md`.

## Previous Phase Notes

- Phase 9C signoff: `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-signoff.md`
- Phase 9C manual QA: `PASS`
- Do not use bare `firebase deploy --only functions` until orphan remote `ensurePortalWorkingPrintRequest` is restored in source or explicitly deleted with human approval.
