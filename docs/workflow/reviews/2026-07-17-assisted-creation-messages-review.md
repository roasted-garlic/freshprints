# Review: Assisted Creation Messages

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Managing Agent (security/backend review perspective) |
| Plan | `docs/workflow/plans/2026-07-17-assisted-creation-messages-plan.md` |
| Verdict | **approved** |

---

## Summary

The plan is bounded to request-scoped Assisted Creation communication and does not create a general messaging platform. A new message-only callable is materially safer than widening the existing submitted-only brief/reference update callable, and the plan explicitly permits all seven lifecycle statuses while preserving status.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Text-only messages, tab rename, capped thread; attachments/general chat excluded. |
| Architecture alignment | pass | Portal component → service → callable; shared types/predicates; Studio remains a consumer. |
| Security impact addressed | pass | Auth, active customer profile, ownership, allowlisted status, max length, cooldown, append-only patch. |
| Data model impact addressed | pass | Optional structural marker; same-status entries; no migration. |
| Backend impact addressed | pass | One selective callable deploy; rules/indexes/env unchanged. |
| Test strategy adequate | pass | Shared tests, Functions build, both app typechecks/builds, lint, authenticated manual QA. |
| Human checkpoints identified | pass | Dev deploy requires `APPROVE DEV DEPLOY`; visual/authenticated QA remains manual. |
| Roadmap alignment | pass | Explicit owner approval overrides the older generic messaging exclusion; feature stays request-scoped. |
| Documentation plan | pass | Data model, backend, security, workflow, QA artifacts included. |
| No silent scope expansion | pass | Prior invite/deploy workflow remains parked. |

---

## Architecture Review

**Findings:**
- `customerUpdateAssistedCreationRequest` owns mutable brief/reference edits and must stay `submitted`-only.
- A separate `customerSendAssistedCreationMessage` boundary gives the server a narrow payload and update patch.
- Reusing `revisionHistory` is compatible with the current UI and owner request; a subcollection is unnecessary for this limited enhancement but should be reconsidered if threads become high volume.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Every status, including terminal states, may receive a message because that is the explicit product requirement.
- The callable must not trust a client-supplied status or actor. It must load the request, verify `customerUid`, derive current status server-side, and append `byUid`/`byRole` itself.
- The transaction patch must contain only `revisionHistory` and `updatedAt`.
- New entries require `kind: "customer_message"`; rate limiting must use that marker, not note text.
- Ten seconds per request plus a 2,000-character limit is proportionate for human messaging and prevents obvious rapid array growth.
- Existing Firestore rules already deny client writes; no broadening is appropriate.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Any production Functions deploy remains a separate explicit checkpoint.

---

## Data Model Review

**Findings:**
- An optional `kind` field is backward compatible.
- Customer message records are same-status events and therefore do not alter lifecycle semantics.
- No migration/backfill/index is needed.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Selective dev deploy:
  `firebase deploy --only functions:customerSendAssistedCreationMessage --project fresh-prints-dev`
- No Firestore rules, Storage rules, indexes, secrets, or environment values change.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Shared classification tests should prove structurally marked terminal messages are labeled and unread-tracked without relying on `submitted`.
- Functions compilation covers callable contracts; authenticated ownership/status/cooldown behavior requires dev manual QA unless an emulator integration harness already exists.
- Both Portal and Studio require visual checks for nested scrolling, newest-at-bottom, and retained unread controls.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Permanent docs must remove the statement that all customer update history is submitted-only and distinguish locked brief edits from all-stage messages.
- Manual QA must include terminal statuses and the selective deploy prerequisite.

---

## Required Changes

None.

---

## Blockers

None for implementation. Deployment remains blocked until the owner says `APPROVE DEV DEPLOY`.

---

## Verdict Rationale

Approved because the plan follows least privilege, preserves the lifecycle state machine, uses a backward-compatible marker, and identifies the required deploy/manual checkpoints.

---

## Next Step

Implement the approved scope, run automated checks, then stop for owner deploy/manual QA.
