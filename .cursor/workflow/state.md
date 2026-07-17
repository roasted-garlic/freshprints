## Current Goal
provider-agnostic-proof-ready-email

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
not_started

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Explicit approval is required before the selective fresh-prints-dev email Functions/rules deploy; live Resend/UI QA is then required.

## Allowed Actions
Read documentation; answer questions; record the owner's dev deploy decision and subsequent manual QA result.

## Forbidden Actions
Implement; deploy without explicit approval; change secrets or shared environment values; production actions; implement Brevo; begin unrelated work; sign off before manual QA.

## Next Required Step
Await owner response to `docs/workflow/reviews/2026-07-16-provider-agnostic-proof-ready-email-manual-checkpoint.md`: APPROVE DEV DEPLOY, NO DEPLOY, or I WILL DEPLOY.

## DONE
no

## Last Completed Step
2026-07-16 — Automated email checks complete: Functions build, targeted lint, Studio build, 38 tests, and rules alignment pass; unrelated full-lint/typecheck failures documented; manual/deploy checkpoint pending.

## Plan Path
docs/workflow/plans/2026-07-16-provider-agnostic-proof-ready-email-plan.md

## Review Path
docs/workflow/reviews/2026-07-16-provider-agnostic-proof-ready-email-review.md

## Previous Goal Signoff
docs/workflow/reviews/2026-07-16-terminal-only-assisted-past-requests-signoff.md

## Previous Goal Status
terminal-only-assisted-past-requests — Signoff Status: approved_with_notes; DONE: yes; Last Completed Step: Signoff

## Prior Goal Signoff
docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-signoff.md

## Decision Log
- 2026-07-16 — Email test status `pending_manual`; no deploy/config mutation performed. Selective fresh-prints-dev deploy requires explicit owner approval before live Resend/UI QA.
- 2026-07-16 — Email plan review verdict `approved_with_changes`: Firestore job state is logical dedupe authority; bounded Resend idempotency is supplemental; transactional leases/retries, owner-only permission, strict recipient linkage, PII-safe logs, and no deploy/config mutation required.
- 2026-07-16 — Past Requests bug complete: terminal-only filter + hide when empty; shared helpers + unit tests; no Firebase deploy.
- 2026-07-16 — Owner confirmed email senders: `INVITATION_FROM_EMAIL` and `PROOF_NOTICE_FROM_EMAIL` both `Fresh Prints <team@funkyfreshprints.com>`; Portal URLs `https://myprintrequest.dev` (dev) and `https://myprintrequest.com` (production); environment-aware Portal URL resolver with fail-closed unknown envs; production deploy excluded. Email human checkpoint cleared for review.
- 2026-07-16 — Owner returned `PASS` for Phase 9C Assisted Creation manual QA.
- 2026-07-16 — Phase 9C test status set to `passed_with_notes`; signoff `approved_with_notes`; Phase 9C complete.
- 2026-07-16 — New email phase decisions: Resend now; provider-neutral contract; Brevo later; separate runtime provider selection for invites and proof notices; invites remain on Resend; notify on first and revised proofs.
- 2026-07-16 — Email phase plan completed; sender/URL confirmations now recorded in plan.
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

- Terminal-only Past Requests: `passed_with_notes` — see `docs/workflow/reviews/2026-07-16-terminal-only-assisted-past-requests-test-report.md`.
- Email phase automated: Functions build pass; targeted lint pass; Studio build pass; 38 targeted tests pass; rules alignment pass; full lint and Studio typecheck retain unrelated/config failures. See `docs/workflow/reviews/2026-07-16-provider-agnostic-proof-ready-email-test-report.md`.
- Previous Phase 9C: `passed_with_notes`; see `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-test-report.md`.

## Previous Phase Notes

- Past Requests signoff: `docs/workflow/reviews/2026-07-16-terminal-only-assisted-past-requests-signoff.md`
- Phase 9C signoff: `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-signoff.md`
- Phase 9C manual QA: `PASS`
- Do not use bare `firebase deploy --only functions` until orphan remote `ensurePortalWorkingPrintRequest` is restored in source or explicitly deleted with human approval.

## Confirmed Email Config (for upcoming implement)

- `INVITATION_FROM_EMAIL`: `Fresh Prints <team@funkyfreshprints.com>`
- `PROOF_NOTICE_FROM_EMAIL`: `Fresh Prints <team@funkyfreshprints.com>`
- Portal base URLs: `https://myprintrequest.dev` (dev), `https://myprintrequest.com` (production)
- Resolver: known project/environment map → canonical URL; validated local/test override OK; fail closed on unknown deployed environments
- Production deploy: excluded
