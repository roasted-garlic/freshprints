# Plan: Assisted Final Artwork Ready Email

| Field | Value |
|-------|-------|
| Date | 2026-09-12 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal | `assisted-final-artwork-ready-email` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Related | Proof-ready / catalog-share email outbox (`emailDeliveryJobs`) |
| Formal Review | `docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-review.md` |

---

## Goal

When Studio staff uploads final assisted artwork (`final_source_needed` → `approved`), the
customer receives a transactional email that deep-links to the Portal assisted status page
(`/custom-designs?flow=assisted&step=status`, environment-resolved base URL).

## Background

Proof-ready and library-match notices already enqueue `emailDeliveryJobs` and send via
`onEmailDeliveryJobCreated`, using `resolveProofReviewUrl()` →
`{portalBase}/custom-designs?flow=assisted&step=status`. Final artwork attach
(`staffAddAssistedCreationFinalSource`) currently updates status/history only — no email job and
no in-app alert. Owner deferred this until after
`portal-staff-artwork-neutral-projection-corrective` (now signed off) and authorized Implement.

## Scope

### In Scope

- Enqueue durable `emailDeliveryJobs` row on successful final-source attach (idempotent per request + finalSource id).
- New email template for final artwork ready; CTA uses existing portal URL resolver.
- Worker handles new job kind; respects existing `assistedProofEmailOptIn` opt-out.
- Append system history note after successful send (parity with proof-ready).
- In-app `customerNotifications` alert with same status deep-link (parity with proof attach).
- Docs: DATA_MODEL / FIREBASE or BACKEND email kinds; brief TESTING note if commands change.
- DEV deploy of touched Functions after Test.

### Out of Scope

- Changing proof-ready / catalog-share copy or URLs.
- New customer preference toggle (reuse proof-email opt-out).
- Push/FCM template changes beyond existing notification create path.
- Production deploy, commit/push, parent M0/freeze.
- Sentinel corrective QA / multi-proof selection.

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/assistedCreationRequests.ts` — enqueue job + notification after final attach
- `functions/src/onEmailDeliveryJobCreated.ts` — send path for new kind
- `functions/src/lib/email/emailTemplates.ts` — `buildFinalArtworkReadyEmail`
- `functions/src/lib/email/emailJobIdentity.ts` — deterministic job id
- `functions/src/lib/email/email.test.ts` — template + job id tests
- `packages/shared/src/types/customerNotifications/customerNotifications.types.ts` — new kind
- `packages/shared/src/utils/customerNotifications.ts` (+ tests) — title/href/id helpers
- `packages/shared/src/utils/assistedCreationHistory.ts` (+ tests) — history note helper if needed
- `docs/architecture/DATA_MODEL.md` (and related email notes as needed)

### Architecture Impact

- [x] Details: Reuse existing outbox + worker; no new provider or client email send.

### Security Impact

- [x] Details: Admin-only callable unchanged; jobs remain Admin-SDK write / Rules deny client;
  no request IDs in email body beyond authenticated Portal deep-link; opt-out honored.

### Data Model Impact

- [x] Details: New `emailDeliveryJobs.kind` value `assisted_final_artwork_ready`; new
  `customerNotifications.kind` `assisted_final_artwork_ready`; history note string for successful send.
  No schema migration / backfill.

### Backend Impact

- [x] Details: Extend final-source callable + email worker; same secrets/providers as proof notices.

### UI / UX Impact

- [x] Details: Portal Alerts list gains a new kind title/body; no Studio UI change required for send.

### Migration Impact

- [x] None (additive kinds only; old clients ignore unknown kinds safely if any)

---

## Approach

1. Add `createFinalArtworkEmailJobId(requestId, finalSourceId)` → `assisted-final-{sha256}`.
2. Add `buildFinalArtworkReadyEmail` (subject/body: final artwork ready; CTA “View your artwork” → `reviewUrl`).
3. In `staffAddAssistedCreationFinalSource` transaction: require `customerId` + `customerUid`;
   `tx.create` delivery job with kind `assisted_final_artwork_ready`, `finalSourceId` (or reuse
   `proofId` field only if worker already requires it — prefer explicit `finalSourceId` field with
   worker reading either for claim logging).
4. After commit: `createCustomerNotification` with new kind (idempotent id
   `final_{requestId}_{finalSourceId}`), href = status overview base (same as catalog-share overview
   or plain status URL).
5. Extend `onEmailDeliveryJobCreated` to build final-artwork template when kind matches; history note
   `Final artwork email sent`.
6. Unit tests for template, job id stability, notification title/href; Functions build.
7. Deploy DEV: `staffAddAssistedCreationFinalSource`, `onEmailDeliveryJobCreated` (and shared build).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (email templates / job id) | `npx tsx --test functions/src/lib/email/email.test.ts` | yes |
| Unit (notifications) | `npx tsx --test packages/shared/src/utils/customerNotifications.test.ts` | yes |
| Unit (history if touched) | focused assistedCreationHistory test | yes if changed |
| Functions build | `npm run build` in `functions/` | yes |

### Manual

- [x] Details: Owner DEV QA — upload final artwork on assisted request; confirm email to opted-in
  customer with status URL; opted-out customer skipped; Alerts row appears; history shows send note.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — Owner DEV QA email + Alerts
- [ ] Production deploy — separately gated
- [ ] Other: pause sentinel QA tracking while this child runs; resume after Signoff

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate emails on retry | Medium | Deterministic job doc id; create fails if already exists |
| Opt-out ignored | Medium | Same `isAssistedProofEmailOptedIn` gate as proof |
| Worker claim fields missing | Low | Store customerId/Uid/requestId/finalSourceId like proof jobs |

---

## Rollback Plan

Redeploy prior Functions revisions; unused job kinds become no-ops if worker rolled back first.
No data migration to reverse.

---

## Documentation Updates Required

- [x] DATA_MODEL.md — notification/email kinds
- [ ] Other: DEV deployment note under `docs/workflow/reviews/`

---

## Open Questions

- [x] None — reuse proof-email opt-out; deep-link = existing status URL.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-review.md`
- Verdict: pending
