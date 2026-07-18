# Plan: Wizard Back, Notifications, Studio Startup, Unread Badges, Email History

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Planning Agent |
| Status | implemented |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-wizard-back-notif-studio-startup-review.md |

---

## Goal

Fix Assisted Creation questionnaire Back flash; add Portal account opt-out for proof-ready emails; speed Studio cold start; show Studio unread customer-update badges (tab / card / History); append a request History entry when a proof-ready email successfully sends.

## Background

Owner selected these items for the next phase (not request-type branching). Provider-agnostic proof-ready email remains implemented but deferred for live deploy (`NO DEPLOY`). Opt-out and email-sent history integrate with that worker so preferences and audit notes apply once email Functions are deployed.

## Scope

### In Scope

1. **Assisted Creation Back flash** — intentional Back mid-wizard must move to the previous step and update the URL without snapping forward.
2. **Account email notification opt-out** — Account (`/dashboard`) **Settings** control on the profile header card opens the Notifications modal (proof-ready email opt-in); preference persisted and enforced in the proof email delivery worker. Standalone Settings section removed; Quick links stays in the right column beside Overview.
3. **Studio cold start** — stop automatic Sharp derivative self-test on every `npm run dev:studio` launch; keep on-demand IPC verification.
4. **Studio unread customer-update badges** — count unread customer updates while `submitted` (same-status revision entries); badges on stage tab total, request card, and History header; mark read via **Read** next to History unread count; history note copy `"Request updated"` (drop redundant “Customer”).
5. **Proof-ready email sent history** — when delivery job completes successfully, append `revisionHistory` note (e.g. “Proof-ready email sent”) with `byRole: "system"` so Studio/Portal History shows it.

### Out of Scope

- Branching questionnaire steps from request type
- Proof-ready email Functions live deploy / Resend QA (deferred; same wave as opt-out + history when owner approves)
- Brevo
- Portal cold-start deep optimization
- Production deploy

---

## Affected Areas

### Files / Modules (expected)

- Wizard: `useAssistedCreationWizard.ts`, `AssistedCreationPageContent.tsx`
- Account: dashboard + notification modal/service; `Customer` type; Firestore rules for preference fields
- Email worker: `onEmailDeliveryJobCreated.ts` — opt-out skip + append history on successful send
- Shared: helpers for customer-update detection, unread count, ack doc id; history note constants
- Studio: `AssistedCreationRequestsSection.tsx`, ack service/collection, CSS badges; `electron/main.ts`
- Functions: `customerUpdateAssistedCreationRequest` note copy
- Docs: DATA_MODEL, BACKEND, TESTING, ROADMAP as needed

### Architecture Impact

- [x] Wizard URL sync allows intentional backward navigation without losing deep-link hydrate.
- [x] Customer preference checked by email worker (server enforcement).
- [x] Per-staff unread acks in `assistedCreationUpdateAcks` (not reuse `staffInboxAcks`).
- [x] Email success path owns history append (not enqueue-only).

### Security Impact

- [x] Preference writes: authenticated customer on own `customers/{id}` only (narrow field allowlist) or equivalent; worker is enforcement boundary.
- [x] Update acks: staff-only, scoped to `userId == auth.uid`.
- [x] History append via Admin SDK in email worker only.

### Data Model Impact

- [x] `customers/{id}.assistedProofEmailOptIn` boolean, default **true** when absent; optional `assistedProofEmailOptInUpdatedAt`.
- [x] `assistedCreationUpdateAcks/{userId__requestId}` with `userId`, `requestId`, `readThroughAt`, timestamps.
- [x] `revisionHistory` may include system entries for email sent (same schema; optional `emailDeliveryJobId` in note text or omit if not already patterned).

### Backend Impact

- [x] Worker: skip send when opted out (`failed` + non-retryable `customer_opted_out`, or `skipped` if added with minimal churn).
- [x] Worker: after successful send, append revision history on the Assisted Creation request.
- [x] Customer update note: `"Request updated"` / `"Request updated — {note}"`.

### UI / UX Impact

- [x] Back works mid-flow; Notifications modal on Account; Studio faster cold start; unread badges; History shows email-sent and cleaner update copy.

### Migration Impact

- [x] Forward: rules + Functions when deploying email/opt-out/history wave; missing preference = opted in; missing ack = all customer updates unread.
- [x] Rollback: revert UI/worker/acks; leave unused fields.

---

## Approach

1. **Back flash:** Allow `onStepChange` to write earlier URL steps. Use an intentional-back ref so the wizard effect updates the URL instead of snapping `stepIndex` forward when `windowStep > stepIndex` after Back. Keep hydrate-only forward snap for deep links.
2. **Opt-out:** Persist preference; Account modal; worker skips Resend when false.
3. **Studio startup:** Remove auto `runDevDerivativeGenerationVerification()` from `app.whenReady`.
4. **Unread badges:** Shared helpers detect customer update entries (`fromStatus === toStatus === "submitted"` + role/note). Subscribe to acks; count entries with `at > readThroughAt`. Badge on New-stage tab sum, list card, History summary. **Read** next to History unread count writes/updates ack `readThroughAt` to latest customer-update `at`.
5. **Email history:** In `markSent` path (after successful send), transactionally append revision entry: `byRole: "system"`, note `"Proof-ready email sent"`, `fromStatus`/`toStatus` = current request status (typically `proof_ready`). Treat as displayable (not boilerplate). Prefer success path over enqueue.
6. Docs + targeted tests.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Unit tests | wizard back sync, opt-out skip, unread helpers, history note helpers | yes |
| Studio Vite build | `npx vite build` from `apps/studio` | yes |
| Targeted lint | changed files | yes |

### Manual

- Mid-wizard Back without flash
- Notifications toggle persists
- Unread badges appear/clear when History **Read** is clicked
- History shows “Request updated” and “Proof-ready email sent” (email after Functions deploy)
- Studio cold start faster

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX — Back, Notifications, badges
- [x] Business — default opted-in; proof emails only; email-sent on success
- [ ] Email/opt-out/history Functions + rules deploy — stop for approval
- [ ] Production — excluded

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Back fix breaks deep-link hydrate | medium | Intentional-back ref; keep hydrate snap |
| Opt-out/history only live after Functions deploy | medium | Document; ship code now |
| Badge false positives on other history | low | Structural detection + role |

---

## Rollback Plan

Revert wizard/URL, account modal, main-process self-test call, ack collection/UI, worker history/opt-out changes.

---

## Documentation Updates Required

- [x] DATA_MODEL.md — preference, acks, history note
- [x] BACKEND.md — opt-out + history on send
- [x] TESTING.md — Studio self-test on-demand
- [x] ROADMAP.md — deferred branching note if needed

---

## Open Questions

- [x] None blocking

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-wizard-back-notif-studio-startup-review.md
- Verdict: approved_with_changes
