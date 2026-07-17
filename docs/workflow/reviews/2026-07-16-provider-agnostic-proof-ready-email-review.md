# Review: Provider-Agnostic Proof-Ready Email

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-16-provider-agnostic-proof-ready-email-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan is bounded, consistent with the Firebase/service-layer architecture, and addresses the principal risks: secret isolation, recipient integrity, asynchronous delivery, provider allowlisting, and duplicate logical jobs. Implementation may proceed with the required clarifications below; production deployment, shared environment changes, and live email QA remain human-gated.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Resend-only implementation; Brevo, production, campaigns, attachments, and historical backfill are explicitly excluded. |
| Architecture alignment | pass | Functions own transport and credentials; Studio uses component → hook → service → callable/Firestore; proof mutation and network I/O remain separated. |
| Security impact addressed | pass | Server-side recipient resolution, owner-only settings, provider allowlist, HTML escaping, PII-safe logs, and Secret Manager are specified. |
| Data model impact addressed | pass | Additive settings and server-only delivery-job documents are described with status/audit fields and no migration. |
| Backend impact addressed | pass | Existing invitation contracts remain compatible; explicit timeout, retry classes, sender parameters, and canonical URL resolution are included. |
| Test strategy adequate | pass | Unit, integration, rules, build, lint, role, invitation-regression, first/revised-proof, and duplicate-event coverage are identified. |
| Human checkpoints identified | pass | Dev deploy, live email delivery/CTA QA, shared config or secret changes, and all production actions remain gated. |
| Roadmap alignment | pass | Implements the approved Resend-now/provider-neutral slice and leaves Brevo for a later reviewed phase. |
| Documentation plan | pass | Architecture, data model, backend, security, testing, deployment/setup, decisions, roadmap, and handoff updates are listed. |
| No silent scope expansion | pass | No provider/account setup, production operation, Portal UI, status-machine, or unrelated refactor is authorized. |

---

## Architecture Review

**Findings:**
- A durable Firestore outbox job created in the same transaction as the proof update correctly prevents provider availability from affecting proof submission.
- A deterministic `{requestId, proofId}` identity gives one logical job for the first proof and each distinct revision proof.
- The existing Settings page is large; an isolated email-provider component, hook, and service is required.
- The existing invitation paths synchronously return `invitationEmailSent`; the provider abstraction must preserve that response behavior.

**Required changes:**
- [x] Treat the Firestore job as the authoritative logical dedupe boundary. Provider idempotency is an additional safeguard, not a permanent exactly-once guarantee.
- [x] Keep all lease/attempt transitions transactional and make trigger retries safe after an expired lease.
- [x] Add a dedicated owner-only email-provider permission instead of broadening or reinterpreting the existing owner/admin `manageSettings` permission.

---

## Security Review

**Findings:**
- The current Resend compatibility service logs raw recipient addresses, sender addresses, and rejected response bodies. The refactor must remove those PII-bearing logs.
- Provider settings contain identifiers only. `RESEND_API_KEY` remains bound only to sending Functions.
- `emailDeliveryJobs` must be explicitly denied to every client, including owners; operational visibility in this phase is through sanitized server logs/support inspection rather than client access.
- `settings/emailProviders` must be readable only by an active owner and writable only through an owner-authorized callable.

**Required changes:**
- [x] Never log recipient email, message HTML/text, reset links, CTA URLs, provider response bodies, or secrets.
- [x] Validate customer and user linkage before fallback: the customer document must match the job's trusted `customerId` and expected `customerUid`; the fallback user document ID must equal that UID and remain an active customer profile.
- [x] Reject every provider value except `resend`; do not persist or accept `brevo`.
- [x] Escape every dynamic template field and use only the canonical authenticated Portal route.

**Human approval needed before production:**
- [x] Any production deploy, sender/domain/config change, secret change, or live production email test.

---

## Data Model Review

**Findings:**
- `settings/emailProviders` is additive and backward compatible because missing settings resolve to `resend`.
- `emailDeliveryJobs/{jobId}` is server-only and stores no duplicate recipient address.
- Required job metadata is sufficient if the implementation includes: stable `id`, kind, request/proof/customer identities, provider snapshot, status, attempt count, max attempts, lease expiry/owner, safe error code, provider message ID, and audit timestamps.
- No backfill, destructive migration, or new index is required for direct document-trigger processing.

**Required changes:**
- [x] Keep `createdAt` immutable and update `updatedAt` for every transition.
- [x] Use only documented statuses and safe error codes; do not persist raw provider errors.
- [x] A job that exhausts attempts must finish as `failed`; a successful job must never be reclaimed.

---

## Backend Review

**Findings:**
- The repository currently uses raw `fetch` rather than the installed Resend SDK, so the adapter may set the documented `Idempotency-Key` HTTP header directly and parse the returned message ID.
- Use a bounded abort timeout. Classify network/timeout, HTTP 429, and HTTP 5xx as transient; classify other HTTP 4xx as permanent.
- The background trigger must enable event retry and throw only after atomically recording/releasing a transient attempt. Permanent or exhausted failures should be recorded and returned without another retry.
- The environment-aware Portal URL resolver must recognize `fresh-prints-dev` and the production project mapping, allow an explicitly validated local/test override, and throw for unknown deployed projects. It must not derive a browser host.
- Defining parameter defaults in source is allowed; changing shared parameter values or secrets is not part of implementation.

**Required changes:**
- [x] Use a stable, bounded idempotency key derived from the deterministic job ID and record that Resend's protection window does not replace Firestore job state.
- [x] Preserve both invitation callable response contracts and failure copy.
- [x] Bind `RESEND_API_KEY` to every exported Function that can send.
- [x] Do not deploy Functions/rules or set parameter/secret values during implementation.

---

## Testing Review

**Findings:**
- The proposed automated matrix covers the changed layers and the highest-risk paths.
- Tests must use injected/mock transport and Firestore/job fixtures; automated tests must not send live email.
- Rules coverage must prove owner-only settings reads and deny all client job access.
- Manual QA is required for real Resend delivery, sender identity, owner-only Studio presentation, first/revised proof behavior, invitation regression, and CTA routing.

**Required changes:**
- [x] Include timeout, 429, 5xx, permanent 4xx, HTML escaping, redacted logging, stale lease, max-attempt, duplicate event, missing settings, invalid provider, unknown project, and recipient-link mismatch tests.
- [x] Record existing unrelated lint/typecheck failures separately from regressions.
- [x] Stop at a human checkpoint after automated checks; do not deploy to `fresh-prints-dev` without fresh explicit approval for this email slice.

---

## Documentation Review

**Findings:**
- The documentation list is complete.
- The permanent docs must distinguish implemented repository behavior from deployment/configuration that is still pending.
- The setup guide must document parameter names and expected values without storing secret values.

---

## Required Changes (approved_with_changes)

1. Apply the retry/lease, PII-safe logging, strict owner-only permission, recipient-link validation, and provider-idempotency constraints stated in this review.
2. Keep deployment and shared config/secret mutation outside implementation; request a human checkpoint after local automated checks.
3. Document Resend idempotency as a bounded provider safeguard and Firestore as the durable logical dedupe source of truth.

---

## Blockers

None for repository implementation and local automated testing.

---

## Verdict Rationale

The design is safe and coherent enough to implement without further product decisions. The listed changes tighten operational semantics and access boundaries without changing scope, so the plan is **approved_with_changes**.

---

## Next Step

Implement the approved scope and required review changes. Run automated checks and prepare the manual/deploy human checkpoint; do not deploy or change shared configuration.
