## Current Goal
wizard-back-notif-studio-startup-unread-email-history

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
passed_with_notes

## Signoff Status
not_started

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Manual UI QA for Back flash, Notifications modal, unread badges (per-item History **Read**), and Studio cold start. History Read client fix applied (no silent getDoc denial); live clear still needs Firestore rules deploy for `assistedCreationUpdateAcks`. Selective fresh-prints-dev Functions/rules deploy still needs explicit owner approval.

## Allowed Actions
Read docs; answer questions; record manual QA result and deploy decision; prepare deploy command notes; apply owner-directed QA UX fixes for unread History Read. Do not deploy without approval.

## Forbidden Actions
Firebase deploy without explicit owner approval; production actions; push unless asked; Brevo; questionnaire branching; signoff before manual QA recorded.

## Next Required Step
Await owner reply on `docs/workflow/reviews/2026-07-17-wizard-back-notif-studio-startup-manual-qa.md` (PASS/FAIL + optional APPROVE DEV DEPLOY / NO DEPLOY / I WILL DEPLOY). Re-test per-item History **Read** after rules deploy (or confirm toast if rules still undeployed).

## DONE
no

## Last Completed Step
2026-07-17 — Fixed History **Read** no-op: removed getDoc-before-create (rules deny get on missing ack docs); surface toast/console on mark-read failure; local rules allow get on `{uid}__*` missing docs + id binding. Deploy still pending owner approval.

## Plan Path
docs/workflow/plans/2026-07-17-wizard-back-notif-studio-startup-plan.md

## Review Path
docs/workflow/reviews/2026-07-17-wizard-back-notif-studio-startup-review.md

## Test Report Path
docs/workflow/reviews/2026-07-17-wizard-back-notif-studio-startup-test-report.md

## Manual QA Path
docs/workflow/reviews/2026-07-17-wizard-back-notif-studio-startup-manual-qa.md

## Deferred Goal
provider-agnostic-proof-ready-email — implemented; deploy still deferred until owner approves (now includes opt-out + email-sent history + update acks).

## Previous Goal Signoff
docs/workflow/reviews/2026-07-16-terminal-only-assisted-past-requests-signoff.md

## Decision Log
- 2026-07-17 — Owner QA: History **Read** click no-op. Root cause: getDoc on non-existent `assistedCreationUpdateAcks` denied by rules + silent catch; rules also undeployed on fresh-prints-dev. Client fixed; rules tightened locally; **APPROVE DEV DEPLOY** still required for live Read.
- 2026-07-17 — Owner: **Read** must be per unread History row (not header). Read-through to that entry’s `at`; monotonic ack.
- 2026-07-17 — Owner: unread clear via explicit History **Read** (not expand alone).
- 2026-07-17 — Implemented Back flash, account proof-email opt-out, Studio startup (no auto Sharp verify), unread customer-update badges + `Request updated` copy, and system History `Proof-ready email sent` on successful delivery. Automated tests pass; manual QA + deploy checkpoint open.
- 2026-07-17 — Owner: pause email as NO DEPLOY deferred; new phase = Back flash + notification opt-out + Studio cold start + unread badges + email-sent history. Review `approved_with_changes`.
- 2026-07-16 — Email test status `pending_manual`; selective fresh-prints-dev deploy requires explicit owner approval.

## Tests Run

- This phase automated: 12 shared + 8 email unit tests pass; Functions build pass; Portal typecheck pass; Studio Vite build pass. See test report.
- Email phase automated (prior): see `docs/workflow/reviews/2026-07-16-provider-agnostic-proof-ready-email-test-report.md`.

## Suggested Dev Deploy (when approved)

```bash
firebase deploy --only functions:createTeamUser,functions:createCustomerWithPortalInvite,functions:customerUpdateAssistedCreationRequest,functions:staffAddAssistedCreationProof,functions:updateEmailProviderSettings,functions:onEmailDeliveryJobCreated,firestore:rules --project fresh-prints-dev
```

Rules-only (minimum for History **Read** acks):

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

## Confirmed Email Config (deferred deploy)

- `INVITATION_FROM_EMAIL` / `PROOF_NOTICE_FROM_EMAIL`: `Fresh Prints <team@funkyfreshprints.com>`
- Portal URLs: `https://myprintrequest.dev` (dev), `https://myprintrequest.com` (production)
- Production deploy: excluded
