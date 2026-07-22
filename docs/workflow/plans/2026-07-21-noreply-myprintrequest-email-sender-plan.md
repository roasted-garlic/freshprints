# Plan: Transactional email from noreply@myprintrequest.com

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-21-noreply-myprintrequest-email-sender-review.md |

---

## Goal

All Fresh Prints transactional emails (team invites, Portal customer invites, proof-ready, catalog-share-ready) send from **`Fresh Prints <noreply@myprintrequest.com>`** instead of `team@funkyfreshprints.com`, and every template includes a clear disclaimer that the address is **not monitored**.

## Background

Outbound mail still defaults to `Fresh Prints <team@funkyfreshprints.com>` via Functions params `INVITATION_FROM_EMAIL` / `PROOF_NOTICE_FROM_EMAIL`. Portal customer hosts are already `myprintrequest.com` / `myprintrequest.dev`. Owner wants sender identity aligned with the Portal domain and an explicit “do not reply / not monitored” notice in the body.

Previous managed goal (`custom-request-ai-context-and-final-source-workflow`) is parked mid-QA; this phase does not continue that work.

## Scope

### In Scope

- Change Functions param **defaults** for `INVITATION_FROM_EMAIL` and `PROOF_NOTICE_FROM_EMAIL` to `Fresh Prints <noreply@myprintrequest.com>`.
- Add a shared HTML footer (or equivalent shared snippet) to **all** transactional templates in `functions/src/lib/email/emailTemplates.ts` stating the mailbox is not monitored / do not reply.
- Unit tests asserting every template includes the disclaimer and that defaults/docs examples use the new address where they document the product sender.
- Update docs and examples: `functions/.env.example`, `docs/architecture/BACKEND.md`, `docs/standards/DEPLOYMENT.md`, `docs/workflow/setup/brevo-email-setup.md`, `docs/workflow/setup/resend-email-setup.md`, and a short ADR note in `docs/project/DECISIONS.md` if review wants permanence.
- Soft-deploy path for email-sending Functions on `fresh-prints-dev` **after** provider domain verification (human).
- Confirm / update **deployed** Firebase Functions params (not only code defaults) so live sends use the new from-address.

### Out of Scope

- Changing customer-facing marketing/copy links to `funkyfreshprints.com` (e.g. bidding acknowledgment exclusive-order link) — those are intentional product links, not email senders.
- Production deploy or production Brevo/Resend domain verification (separate human approval).
- Adding Reply-To to a monitored inbox (owner chose noreply + disclaimer; no monitored fallback in this phase).
- Renaming email subjects/brand strings from “Fresh Prints” to “My Print Request” (display name stays **Fresh Prints** unless owner overrides in Open Questions).
- New email providers, template redesign beyond footer disclaimer, or Studio Email Provider settings UI changes.

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/lib/secrets.ts` — param defaults
- `functions/src/lib/email/emailTemplates.ts` — shared unmonitored footer on all builders
- `functions/src/lib/email/email.test.ts` — disclaimer + any from-address assertions
- `functions/.env.example`
- `docs/architecture/BACKEND.md`
- `docs/standards/DEPLOYMENT.md`
- `docs/workflow/setup/brevo-email-setup.md`
- `docs/workflow/setup/resend-email-setup.md`
- `docs/project/DECISIONS.md` (ADR for sender + disclaimer policy)

### Architecture Impact

- [x] Details: No new layers. Shared template helper for footer; params remain `defineString` as today. Provider adapters unchanged.

### Security Impact

- [x] Details: Sender domain must be verified in Brevo and/or Resend before live send; unverified `noreply@myprintrequest.com` fails closed at the provider. No new secrets. Do not log full from/to bodies beyond existing redaction rules. Production param/secret changes remain human-gated.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: From-address param defaults change; deployed params must be updated on target projects. Soft-deploy email Functions after code + param change. No callable contract changes.

### UI / UX Impact

- [x] Details: Customer/staff email body gains a short unmonitored disclaimer (copy below). No Studio/Portal UI screens.

### Migration Impact

- [x] Forward steps:
  1. Code + docs land.
  2. Owner verifies `myprintrequest.com` (or single sender `noreply@myprintrequest.com`) in **Brevo** and **Resend** as used by Settings.
  3. Set Firebase params on `fresh-prints-dev` (and later prod) to the new from string if params were previously overridden.
  4. Soft-deploy email Functions; smoke-test one invite + one proof-ready.
- [x] Rollback / compatibility: Revert params to prior from-address (or previous code default); redeploy. Templates without disclaimer if rolled back. No Firestore migration.

---

## Approach

1. Add `UNMONITORED_EMAIL_DISCLAIMER_HTML` (or `appendUnmonitoredEmailFooter(html)`) in `emailTemplates.ts` with owner-approved copy (default below).
2. Append footer to `buildTeamInvitationEmail`, `buildCustomerInvitationEmail`, `buildProofReadyEmail`, and `buildCatalogShareReadyEmail`.
3. Update `invitationFromEmail` / `proofNoticeFromEmail` defaults to `Fresh Prints <noreply@myprintrequest.com>`.
4. Extend unit tests: every built message HTML contains the disclaimer; keep existing escape tests.
5. Update env examples and setup/ops docs to the new sender; note domain verification for `myprintrequest.com`.
6. Record ADR: Portal-domain noreply sender + unmonitored disclaimer on all transactional mail.
7. **Stop for human:** verify sender in Brevo/Resend → set Functions params → APPROVE SOFT-DEPLOY → manual inbox smoke.

### Assumed disclaimer copy

> This email was sent from an address that is not monitored. Please do not reply.

(Adjust only if owner supplies different wording before implement.)

### Assumed from string

`Fresh Prints <noreply@myprintrequest.com>` for both invitation and proof-notice params.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npm test` (or project script for `functions` email tests) | yes |
| Typecheck | functions/package typecheck if present | yes if configured |
| Lint | if configured for functions | yes if configured |
| Build | functions build as used before deploy | yes before soft-deploy |
| Integration | n/a | no |
| E2E | n/a | no |
| Backend/rules | n/a (no rules change) | no |

### Manual

- [x] Details: After soft-deploy on `fresh-prints-dev`:
  1. Send a controlled team or Portal invite → From shows `noreply@myprintrequest.com`; body includes disclaimer.
  2. Trigger a proof-ready (or catalog-share) notice → same From + disclaimer.
  3. Confirm Brevo/Resend transactional log shows successful delivery (not rejected for unverified sender).

---

## Human Checkpoints Anticipated

- [ ] Manual UI/UX review
- [ ] Design approval
- [x] Business logic decision — optional: display name “Fresh Prints” vs “My Print Request” (default: Fresh Prints)
- [x] Production deploy — separate later approval; not this soft-deploy
- [ ] Database migration
- [x] Auth / external service setup — verify `myprintrequest.com` / `noreply@` in Brevo and Resend
- [x] Secrets / env vars — update Functions string params `INVITATION_FROM_EMAIL` / `PROOF_NOTICE_FROM_EMAIL` on target project(s)
- [x] Other: soft-deploy approval + inbox smoke PASS/FAIL

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Provider rejects unverified `noreply@myprintrequest.com` | high | Verify domain/sender in Brevo + Resend before soft-deploy; smoke test |
| Code defaults change but deployed params still `team@…` | high | Explicitly update Firebase params; document in setup + deploy checklist |
| Customers reply expecting support | medium | Clear unmonitored disclaimer on every template; no Reply-To to team@ |
| Soft-deploy misses a sending Function | medium | Deploy same known email Function set as prior Brevo/proof work |
| Confusion with funkyfreshprints.com marketing links | low | Out of scope; document distinction in plan/ADR |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Set `INVITATION_FROM_EMAIL` / `PROOF_NOTICE_FROM_EMAIL` back to previous verified sender.
2. Redeploy email Functions (or revert commit and redeploy).
3. Optional: revert template disclaimer if needed for consistency with old sender policy.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [x] BACKEND.md
- [ ] TESTING.md
- [x] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md
- [x] Other: `brevo-email-setup.md`, `resend-email-setup.md`, `functions/.env.example`

---

## Open Questions

- [x] Display name in From header: keep **Fresh Prints** (recommended) vs **My Print Request** — non-blocking; implement uses Fresh Prints unless owner replies otherwise before implement.
- [x] Exact disclaimer wording — non-blocking; use assumed copy above unless owner supplies alternate before implement.
- [ ] **Blocking for live send only (not for code implement):** Is `myprintrequest.com` already verified in Brevo and Resend for `noreply@`? Owner must confirm before soft-deploy smoke.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-noreply-myprintrequest-email-sender-review.md
- Verdict: approved_with_changes
