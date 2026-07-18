# Plan: Brevo transactional email provider

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Planning Agent |
| Status | implementing (code-first; live QA gated on secret) |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-brevo-email-provider-review.md |
| Depends on | ADR-FP-089 (provider-neutral email); Resend adapter already shipped |

---

## Goal

Add **Brevo** as a first-class transactional email provider behind the existing provider-neutral contract so owners can select Brevo for invitation and/or proof-ready notices independently of Resend. Use Brevo **HTTP API** with secret `BREVO_API_KEY` (not SMTP).

## Background

Owner order after web-push PASS + cancel-reason residual: move to Brevo. Provider-agnostic email (ADR-FP-089) already routes through `sendEmail` / `EmailProvider`; Studio shows “Brevo — coming later” disabled. Product email must not use the Cursor Brevo MCP token (`BREVO_MCP_TOKEN` is agent-only).

Locked owner direction (this phase):

- HTTP API + `BREVO_API_KEY` (Secret Manager), **not** SMTP.
- Extend existing adapter/router; do not rewrite invitation or proof outbox flows.
- Keep Resend working; Brevo is additive and selectable.

## Scope

### In Scope

1. **Brevo adapter** — `createBrevoEmailProvider` implementing `EmailProvider` via Brevo Transactional Emails HTTP API (`POST https://api.brevo.com/v3/smtp/email` or current documented equivalent), API key header `api-key`, timeout/error mapping aligned with Resend adapter (rate limit / 5xx transient, 4xx rejected, abort → timeout).
2. **Registry** — extend `EMAIL_PROVIDER_IDS` / `isEmailProviderId` / router `sendEmail` to accept `"brevo"`.
3. **Secrets** — `defineSecret("BREVO_API_KEY")`; wire into Functions that call `sendEmail` for invite + proof-ready (and any other transactional path using the router). Document in BACKEND / DEPLOYMENT / setup notes. **Do not** put key values in chat or git.
4. **Settings** — enable Brevo in Studio `EmailProviderSettingsSection`; allow persist via `updateEmailProviderSettings`.
5. **Job metadata** — `emailDeliveryJobs.provider` may snapshot `"brevo"`; no schema break.
6. **Sender identity** — confirm Brevo verified sender/domain requirements; reuse or document Functions params for from-address (may share invitation/proof from params or add Brevo-specific if required — prefer existing from-address params if compatible).
7. **Tests** — unit tests for Brevo adapter (fetch mock) mirroring Resend coverage; update shared provider id tests if any.
8. **Docs** — DATA_MODEL `settings/emailProviders`, BACKEND, SECURITY/setup, DECISIONS (ADR follow-up or amend ADR-FP-089), ROADMAP, setup guide for Brevo API key (not MCP).
9. **Dev deploy checkpoint** — after implement, human `APPROVE DEV DEPLOY` + secret set in Secret Manager for `fresh-prints-dev` before live send QA.

### Out of Scope

- SMTP / relay configuration
- Marketing campaigns, contact sync, templates editor, unsubscribe product UI
- Replacing Resend as default (defaults stay Resend until owner changes settings)
- Production deploy / production secrets
- Changing proof outbox identity, CTA URLs, or opt-out model
- Cursor MCP Brevo tooling changes
- Attachments in transactional mail

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/emailProviders.constants.ts`
- `functions/src/lib/email/brevoEmailProvider.ts` (new)
- `functions/src/lib/email/emailRouter.ts`
- `functions/src/lib/email/email.test.ts` (+ Brevo cases)
- `functions/src/lib/secrets.ts`
- Callables/workers that declare `resendApiKeySecret` — also declare/use Brevo secret when provider is Brevo (pattern: both secrets available; select by settings)
- `apps/studio/.../EmailProviderSettingsSection.tsx`
- `functions/src/updateEmailProviderSettings.ts` (via shared `isEmailProviderId`)
- Docs as listed above

### Architecture Impact

- [x] Details: New adapter behind existing router; UI settings enable existing enum values.

### Security Impact

- [x] Details: Secret Manager only; never client-exposed; validate provider id server-side; no PII in logs (keep ADR-FP-089 logging rules).

### Data Model Impact

- [x] Details: `inviteProvider` / `proofNoticeProvider` may be `"brevo"`; job `provider` field accepts `brevo`.

### Backend Impact

- [x] Details: New secret `BREVO_API_KEY`; Functions must load Brevo key when selected; human sets secret before live QA.

### UI / UX Impact

- [x] Details: Enable Brevo radio/select in Studio email settings.

### Migration Impact

- [x] None — additive; existing Resend settings unchanged.

---

## Approach

1. Implement Brevo HTTP provider matching `EmailProvider` contract + idempotency header if Brevo supports an equivalent (document if not; rely on Firestore job dedupe as primary).
2. Extend shared provider ids + router switch.
3. Ensure invite + proof delivery paths pass the correct API key for the selected provider.
4. Enable Studio UI + server persist.
5. Tests + docs.
6. Stop for human: create Brevo API key (product, not MCP), set Secret Manager on `fresh-prints-dev`, `APPROVE DEV DEPLOY`, then manual send QA.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Functions unit (email) | `npx tsx --test functions/src/lib/email/email.test.ts` (or project equivalent) | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Shared typecheck if needed | as applicable | yes if constants change consumers |

### Manual

- [x] Owner: Studio select Brevo for proof and/or invite → send proof / invite on `fresh-prints-dev` → receive mail; Resend path regression; opt-out still skips proof mail.

---

## Human Checkpoints Anticipated

- [x] Secrets / env — create product Brevo API key; set `BREVO_API_KEY` in Firebase Secret Manager for `fresh-prints-dev` (and later prod under separate approval)
- [x] Auth / external service setup — verify sender domain/address in Brevo dashboard
- [x] Manual UI/UX review — live email QA after deploy
- [x] Production deploy — excluded until separately approved
- [ ] Design approval
- [ ] Database migration
- [ ] Business logic decision

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Confusing MCP token with product API key | high | Docs + setup explicitly separate `BREVO_API_KEY` vs `BREVO_MCP_TOKEN` |
| Sender not verified in Brevo | medium | Setup checklist before QA |
| Idempotency weaker than Resend | medium | Firestore job state remains source of truth |
| Both secrets required on every email function | low | Declare both secrets on email Functions; select at runtime |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Disable Brevo in Studio settings (switch back to Resend); or redeploy prior Functions build. Docs note Brevo optional.

---

## Documentation Updates Required

- [x] DATA_MODEL.md
- [x] BACKEND.md
- [x] DEPLOYMENT.md / setup guide
- [x] DECISIONS.md (amend ADR-FP-089 or add ADR)
- [x] SECURITY.md if secrets table needs update
- [x] ROADMAP.md
- [x] Other: Brevo product setup (not MCP-only)

---

## Open Questions

- [ ] Confirm Brevo from-address: reuse existing Functions invitation/proof from params vs Brevo-specific verified sender — resolve during implement against Brevo account (human may need to verify domain). Non-blocking for plan approval; blocking for live QA.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-brevo-email-provider-review.md
- Verdict: approved
