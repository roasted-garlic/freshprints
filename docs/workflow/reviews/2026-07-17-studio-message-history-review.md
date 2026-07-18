# Review: Studio Messages history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-studio-message-history-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow Studio renderer UX to mirror Portal Alerts: unread-only live Messages panel plus a Message history modal of acked customer updates. Shared helper for read-list is appropriate; no backend/rules/deploy. Scope stays clear of parked Portal/Brevo/web-push work.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio Messages history only |
| Architecture alignment | pass | Provider + UI; shared util; no UI→Firestore bypass beyond existing ack service |
| Security impact addressed | pass | Same permission gate (`canViewDesigns`); no new endpoints |
| Data Model impact addressed | pass | No schema change; derived from revisionHistory + acks |
| Backend impact addressed | pass | No Functions/rules |
| Test strategy adequate | pass | Shared unit test + Studio typecheck + manual QA |
| Human checkpoints identified | pass | Manual UI QA |
| Roadmap alignment | pass | Residual UX after Studio Messages inbox |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Matches Portal provider split (`unreadItems` / `readItems`, history open state).
- Reusing Studio `Modal` overlay is preferred over inventing a second modal system.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- History items are a client-side filter of already-loaded Assisted requests; no broader data exposure.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None

---

## Data Model Review

**Findings:**
- Read = customer updates with `at <= readThroughAtMillis`; correct inverse of unread helper.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- No deploy required.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Unit test for new shared helper required; manual QA for split + deep-link.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Workflow plan/review/manual QA sufficient; permanent product docs unchanged for this residual UX.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Bounded mirror of an already-approved Portal pattern; existing ack persistence; safe to implement without human product decisions beyond post-implement manual QA.

---

## Next Step

Implement approved scope.
