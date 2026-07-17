# Plan: Provider-Agnostic Proof-Ready Email

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-16-provider-agnostic-proof-ready-email-review.md` |
| Target | Repository and `fresh-prints-dev`; production deploy excluded |

---

## Goal

Notify an Assisted Creation customer by email whenever staff sends a proof and the request enters `proof_ready`, including the first proof and each proof sent after requested revisions. Put email delivery behind a provider-neutral server interface, use Resend now, preserve invitation-email behavior through that interface, and add owner-only Studio settings that independently choose the invitation and proof-notice providers at runtime. Brevo must be visible only as a disabled future option until a separately reviewed implementation exists.

## Background

Phase 9C Assisted Creation is signed off with owner manual QA `PASS`. Today, invitation emails call a Resend-specific service directly from `createTeamUser` and `createCustomerWithPortalInvite`; proof-ready transitions do not notify customers. The next slice should avoid duplicating provider-specific code and should make a future Brevo adapter a contained addition rather than another invitation/proof workflow rewrite.

Locked owner decisions:

- Resend sends proof-ready notices now.
- The first proof and every revised proof sent after customer revision receive a notice.
- Invitation and proof-notice providers are independently configurable at runtime.
- Invitations remain on Resend for now.
- Brevo implementation is deferred.

---

## Scope

### In Scope

1. Define a provider-neutral server email contract, message model, provider registry, typed delivery result, timeout/error mapping, and stable idempotency-key support.
2. Adapt the existing Resend transport behind that interface and refactor both existing invitation paths to select their configured provider without changing account-creation behavior.
3. Create an idempotent proof-ready delivery job for every newly attached proof. Use a deterministic identity based on request and proof IDs so retries or repeated function events cannot create a second logical notice.
4. Deliver the proof-ready notice asynchronously from the durable job, resolving the customer recipient from `customers` first and the linked `users` profile as a validated fallback.
5. Include a customer-safe subject/body and a Portal review CTA to the canonical Assisted status page.
6. Add owner-only Studio settings for:
   - invitation provider
   - proof-notice provider
7. Offer `Resend` as the only enabled provider choice. Show `Brevo (coming later)` disabled; do not accept or persist `brevo` server-side in this phase.
8. Keep `RESEND_API_KEY` in Functions Secret Manager. Keep sender addresses and Portal base URL in Functions parameter/config values, never Firestore secrets.
9. Add delivery metadata sufficient for idempotency, retry state, auditing, and support without storing another copy of the recipient email.
10. Update architecture, data model, backend, security/setup, decisions, testing, and roadmap documentation.

### Out of Scope

- Brevo client, API key, credentials, sending, or production enablement.
- Production deployment, DNS/domain verification, secret rotation, or shared-environment changes.
- Marketing campaigns, bulk mail, newsletters, templates/editor, analytics dashboards, unsubscribe management, or contact-list sync.
- Proof attachments in email; the CTA returns the authenticated customer to Fresh Prints Portal.
- Changing Assisted Creation statuses, proof permissions, or customer response rules.
- Retrofitting email notices for proofs attached before this phase.
- SMS, push, or in-app notification work.

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/lib/email/` — provider-neutral contracts, registry/router, Resend adapter, templates, recipient resolution, and tests.
- `functions/src/lib/resendEmailService.ts` — migrate or reduce to a compatibility wrapper; no duplicate Resend transport.
- `functions/src/createTeamUser.ts`
- `functions/src/createCustomerWithPortalInvite.ts`
- `functions/src/assistedCreationRequests.ts`
- `functions/src/index.ts`
- `functions/src/lib/secrets.ts`
- `functions/src/updateEmailProviderSettings.ts` and proof-ready delivery trigger/job handler.
- `packages/shared/src/types/` or `packages/shared/src/constants/` — settings/provider contracts shared with Studio where appropriate.
- `apps/studio/src/renderer/src/features/settings/` — isolated email-provider settings component, hook, service, and tests; do not further enlarge the already-large Settings page with workflow logic.
- `apps/studio/src/renderer/src/features/permissions/` — owner-only settings permission.
- `firestore.rules` and rules-alignment tests.
- Documentation listed below.

### Architecture Impact

- [x] Details:
  - Cloud Functions remain the only layer that knows provider credentials or sends email.
  - A provider-neutral `EmailProvider` contract accepts a normalized message plus a stable idempotency key and returns a typed delivery result/provider message ID.
  - Message composition stays separate from provider transport.
  - A registry/router chooses an allowlisted provider from runtime settings. Missing/invalid settings fail closed to the documented `resend` default; unsupported values are rejected on writes.
  - `staffAddAssistedCreationProof` keeps the status/proof mutation authoritative and creates one durable delivery job in the same Firestore transaction. External network I/O must not occur inside that transaction.
  - A retry-capable Firestore trigger/worker resolves the recipient, snapshots/uses the selected proof-notice provider, sends the message, and updates delivery status.
  - Existing synchronous invitation outcomes (`invitationEmailSent`) remain compatible while routing through the same provider abstraction.

### Security Impact

- [x] Details:
  - `RESEND_API_KEY` remains a bound Functions secret; no key enters Firestore, Studio, Portal, logs, or response payloads.
  - Email-provider settings contain provider IDs only and are owner-readable/owner-writable in Studio, with server authorization enforced by a callable and matching Firestore read rules.
  - Provider writes are allowlisted; `brevo` is not accepted until its implementation and secrets have separate review.
  - Recipient resolution is server-side from the request's trusted `customerId`/`customerUid`; client-supplied recipient addresses are never accepted.
  - Validate and normalize the resolved address. Fail closed when customer ownership/linkage is inconsistent.
  - Logs contain request/job/provider IDs and safe status codes, not API keys, CTA tokens, HTML bodies, or raw customer email addresses.
  - Escape all customer/staff-controlled values included in HTML. Do not include private proof notes or proof URLs in email.

### Data Model Impact

- [x] Details:
  - Add `settings/emailProviders`:
    - `inviteProvider: "resend"`
    - `proofNoticeProvider: "resend"`
    - `updatedAt`
    - `updatedBy`
  - Add a server-only `emailDeliveryJobs/{jobId}` record (final name may be adjusted in review) with:
    - stable `id`, `kind: "assisted_proof_ready"`, `requestId`, `proofId`
    - `customerId`, `customerUid`
    - selected provider snapshot
    - `status: "pending" | "sending" | "sent" | "failed"`
    - bounded attempt/lease fields, provider message ID, safe last-error code
    - `createdAt`, `updatedAt`, and `sentAt` when successful
  - Deterministic proof job ID: one logical delivery per `{requestId, proofId}`. A revised proof has a new proof ID and therefore a new notice.
  - Clients have no read/write access to delivery jobs.
  - No destructive migration or backfill.

### Backend Impact

- [x] Details:
  - Existing secret: `RESEND_API_KEY`.
  - Existing config retained: `INVITATION_FROM_EMAIL`.
  - Planned proof sender config: `PROOF_NOTICE_FROM_EMAIL` after owner confirms the address.
  - Planned review link uses configured `PORTAL_BASE_URL` plus `/custom-designs?flow=assisted&step=status`; owner must confirm the deployed base URL.
  - Resend calls use an explicit timeout and stable provider idempotency header/key. Retry only safe transient classes (network, 429, 5xx) with bounded attempts; permanent 4xx becomes `failed` with safe diagnostics.
  - Existing `resend` package is already installed; add no dependency.
  - Invitation calls resolve `inviteProvider` at runtime; proof jobs snapshot `proofNoticeProvider` when enqueued so an in-flight job is auditable and deterministic.

### UI / UX Impact

- [x] Details:
  - Add a compact Email Providers section to Studio Settings, visible and editable only by active owners.
  - Two labeled selects: Invitation emails and Proof-ready emails.
  - Resend enabled; Brevo shown disabled with “Coming later” explanation.
  - Save/loading/error/success states must use existing Settings patterns and semantic tokens in light/dark/system modes.
  - No Portal UI change; the email CTA opens the existing authenticated Assisted status page.

### Migration Impact

- [x] Forward steps:
  - Deploy rules/settings callable and delivery trigger/job handler only to an explicitly approved environment.
  - Configure/confirm `PROOF_NOTICE_FROM_EMAIL`, `INVITATION_FROM_EMAIL`, and `PORTAL_BASE_URL`; bind existing `RESEND_API_KEY`.
  - Missing `settings/emailProviders` resolves to Resend for both categories, allowing gradual rollout without a data backfill.
- [x] Rollback / compatibility:
  - Disable/remove proof job creation and trigger; existing proof workflow remains functional.
  - Invitation paths can temporarily route directly to the Resend adapter without changing callable response contracts.
  - Existing settings document may remain; it contains no secret and defaults are backward compatible.

---

## Delivery and Idempotency Design

1. `staffAddAssistedCreationProof` validates and attaches a new proof.
2. In the same transaction, it creates `emailDeliveryJobs/{requestId}__proof__{proofId}` with create-if-absent semantics.
3. The delivery worker claims a pending/expired job with a lease and bounded attempt count.
4. It resolves the customer email:
   - load `customers/{customerId}` and use its normalized email when valid;
   - otherwise load `users/{customerUid}` and use its normalized email when valid;
   - if neither is valid or IDs conflict, mark failed with a safe code and do not guess.
5. It builds the canonical Portal review URL and proof-ready template without embedding the private proof asset.
6. It calls the configured provider with the job ID as the stable provider idempotency key.
7. Success records `sent`, `sentAt`, and provider message ID. Transient failure releases/retries safely; permanent failure records a safe code.
8. A repeated Firestore event, callable retry, or duplicate enqueue observes the same deterministic job and does not create another logical send.

Implementation review must verify the exact Resend idempotency-header behavior supported by the installed SDK/API and the Firebase trigger retry/lease semantics before approval.

---

## Approach

1. Add shared provider/settings contracts and pure validation/default resolvers with unit tests.
2. Introduce server provider contracts, router, Resend adapter, explicit timeout, safe logging, and email-template escaping tests.
3. Refactor team/customer invitation paths through the router while preserving response contracts and failure fallback copy.
4. Add owner-only email-provider settings callable, Firestore read rules, Studio service/hook/component, and permission tests.
5. Add deterministic proof-ready delivery job creation to the proof transaction and implement the retry-safe worker.
6. Add recipient-resolution tests covering customer email, user fallback, missing/invalid email, and mismatched linkage.
7. Add proof-notice integration tests for first proof, revised proof, duplicate proof/job event, provider failure, and disabled unsupported provider.
8. Update project docs and setup instructions.
9. Run automated checks, then request manual QA for owner settings, invitation regression, and first/revised proof email delivery on `fresh-prints-dev`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Functions build | `npm --prefix functions run build` | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes; known config failure must be documented if unchanged |
| Targeted lint | ESLint over changed Functions/shared/Studio files | yes |
| Full lint | `npm run lint` | yes; existing unrelated/config failures may be documented |
| Unit tests | `npx tsx --test` over email provider/settings/template/idempotency/recipient tests | yes |
| Existing Assisted tests | targeted Assisted Creation transition/validation tests | yes |
| Studio build | `npx vite build` from `apps/studio` | yes |
| Rules tests/alignment | targeted Firestore settings/job access tests or documented emulator check | yes |
| Portal build/typecheck | not required unless Portal code changes; URL utility may be pure-tested in Functions/shared | conditional |
| Integration | mocked provider + Firestore/emulator path where practical; no live email in unit tests | yes |

### Manual

- [x] Details:
  - Owner sees Email Providers settings; admin/helper/customer cannot access the section or callable.
  - Both selects show Resend selected and Brevo disabled.
  - Team and customer invitations still send through Resend and preserve existing success/failure UX.
  - First proof sends one proof-ready email with the correct CTA.
  - Customer requests revisions; a newly sent revised proof sends one additional email.
  - Retrying/reloading/replaying the job does not send another logical email.
  - CTA opens the correct Portal Assisted status page after authentication.
  - Provider failure leaves proof submission successful and records an operationally visible failed delivery job without exposing secrets/PII.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — owner-only Studio settings and email delivery flow.
- [ ] Design approval — reuse existing Settings visual patterns; no new visual system decision expected.
- [x] Business logic decision — provider split and proof events are locked by owner.
- [x] Production deploy — excluded; requires separate explicit approval.
- [ ] Database migration — no destructive migration/backfill.
- [x] Auth / external service setup — no new provider account now; Brevo setup deferred.
- [x] Secrets / env vars — confirm sender addresses and deployed Portal base URL before implementation/deploy.
- [x] Other:
  - Confirm the current `INVITATION_FROM_EMAIL`.
  - Confirm `PROOF_NOTICE_FROM_EMAIL`.
  - Confirm the deployed `PORTAL_BASE_URL` used by the review CTA.

These values are required before implementation because guessing could send customer email from an unverified sender or generate an invalid review link.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate notices from callable/trigger retries | high | Deterministic job ID, transactional create, worker lease, stable provider idempotency key |
| Proof submission fails because email provider is down | high | Commit proof/job atomically; perform network send asynchronously; never roll back proof success for email failure |
| Wrong customer receives a notice | high | Resolve from trusted request IDs server-side, validate customer/user linkage, fail closed |
| Secrets or PII leak through settings/logs | high | Secret Manager only; provider IDs only in settings; redact email/body/link details from logs |
| Runtime setting selects an unavailable provider | medium | Server allowlist accepts only Resend now; disabled Brevo UI; safe default |
| Invalid sender/domain or Portal URL | high | Human confirmation before implementation/deploy; setup verification and manual email test |
| Refactor regresses existing invitation email | medium | Preserve callable response contracts and add invitation router regression tests |
| Worker crash around provider acceptance | medium | Provider idempotency key plus durable job state; document provider idempotency limitations |
| Settings page is already oversized | medium | Isolated component/hook/service; Settings page only composes the section |
| Provider API latency/hang | medium | Explicit timeout, bounded retries, typed transient/permanent errors |

See also: `.cursor/workflow/risk-checklist.md`.

---

## Rollback Plan

1. Stop creating proof-ready delivery jobs and disable the delivery trigger.
2. Leave Assisted Creation proof submission/status behavior unchanged.
3. Route invitations directly to the Resend adapter if router rollback is needed while preserving callable responses.
4. Keep or remove `settings/emailProviders`; absent settings already default to Resend.
5. Do not delete historical delivery records during rollback; they are audit evidence.

---

## Documentation Updates Required

- [ ] `docs/architecture/ARCHITECTURE.md` — provider-neutral server boundary and outbox/worker flow if warranted.
- [x] `docs/architecture/DATA_MODEL.md` — `settings/emailProviders` and delivery-job schema/status/permissions.
- [x] `docs/architecture/BACKEND.md` — provider contract, Resend adapter, worker, retry/timeout/idempotency, env names.
- [x] `docs/standards/SECURITY.md` — email settings permissions, secret/PII/logging requirements.
- [x] `docs/standards/TESTING.md` — targeted email/provider checks if commands are added.
- [x] `docs/standards/DEPLOYMENT.md` and `docs/workflow/setup/resend-email-setup.md` — sender/base URL and deployment verification.
- [ ] `docs/standards/STYLE_GUIDE.md` — no change expected if existing Settings patterns are reused.
- [x] `docs/project/DECISIONS.md` — provider-neutral architecture, Resend-now/Brevo-later, separate runtime provider selectors.
- [x] `docs/project/ROADMAP.md` — phase progress and Brevo follow-up.
- [x] Handoff package files applicable at signoff.

---

## Open Questions

- [ ] What exact value should `INVITATION_FROM_EMAIL` use in the target environment?
- [ ] What exact value should `PROOF_NOTICE_FROM_EMAIL` use, and is it the same verified sender as invitations?
- [ ] What deployed `PORTAL_BASE_URL` should the proof review CTA use?

No other product decision is currently blocking review.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-16-provider-agnostic-proof-ready-email-review.md`
- Verdict: pending
