# Review: Portal bidding acknowledgment (signup + Add to Show)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-portal-bidding-acknowledgment-plan.md |
| Verdict | **approved** |

---

## Summary

Bounded consent feature: pre-registration modal before Auth/Firestore create, and binding Add to Show confirmation enforced in `queuePortalPrintRequestToShow`. Server-side versioned audit on `users` and `printRequests` matches security rules (no client writes to `users`). Signup and queue acknowledgments stay separate as required.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Signup gate + queue gate only |
| Architecture alignment | pass | UI → services → existing callables |
| Security impact addressed | pass | Fail-closed queue; signup requires ack on new provision |
| Data model impact addressed | pass | Additive fields; documented |
| Backend impact addressed | pass | Extend two callables; no rules change expected |
| Test strategy adequate | pass | Validation/unit + manual QA |
| Human checkpoints identified | pass | Manual UI; dev deploy allowed by owner ask |
| Roadmap alignment | pass | Additive Portal UX / trust |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS |
| No silent scope expansion | pass | Studio queue out of scope |

---

## Architecture Review

**Findings:**
- Correct layering; shared copy/version in packages/shared.
- Google complete-profile correctly gated before `registerCustomer` even though Auth may exist.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Queue must reject missing `biddingAcknowledgmentAccepted` / unknown version.
- Signup ack on user doc via Admin only.
- Checkbox state not trusted for queue without payload flag.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production deploy (out of scope)

---

## Data Model Review

**Findings:**
- Nested `portalBiddingAcknowledgments` on users + `showQueueBiddingAcknowledgment` on print request is clear and separately queryable.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Prefer writing user + printRequest ack inside the existing queue transaction.
- registerCustomer already-provisioned path should not demand re-ack.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Validation tests + plural copy tests sufficient for automated gate; manual covers modal ordering.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Plan lists required doc updates.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Owner timing clarified (modal before account create). Scope, security, and storage design are sound. Approve for implement → test → soft-reload + `fresh-prints-dev` Functions deploy.

---

## Next Step

Implement approved scope.
