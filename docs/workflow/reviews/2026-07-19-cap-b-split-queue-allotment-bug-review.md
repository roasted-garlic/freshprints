# Review: Cap B split UI allots 25 but queues entire request (50)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-19-cap-b-split-queue-allotment-bug-plan.md |
| Verdict | **approved** |

---

## Summary

Root cause classification is correct: Portal client already builds and sends `selections` after bidding ack; the live `fresh-prints-dev` callable matches the pre-split all-or-nothing `HEAD` behavior (no Cap B, ignore unknown `selections`, always `active`). Redeploy of local split-aware functions plus a thin client harden and 25+25 unit coverage is the right fix. No production deploy.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Deploy + harden + tests; no product redesign |
| Architecture alignment | pass | Existing service → callable path |
| Security Impact addressed | pass | Cap B / capacity / selection enforcement restored on server |
| Data model impact addressed | pass | No new schema |
| Backend impact addressed | pass | Dev-only redeploy of two callables |
| Test strategy adequate | pass | Unit + owner manual Cap B scenario |
| Human checkpoints identified | pass | Manual QA after deploy |
| Roadmap alignment | pass | Parked split QA follow-up |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Layering already correct; bug is stale backend vs new Portal UI.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Redeploy restores server Cap B and selection validation. Client harden is defense-in-depth only.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev only)

---

## Data Model Review

**Findings:**
- Partial allocations + draft-until-fully-queued already designed in prior plan.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Must deploy `queuePortalPrintRequestToShow` and `listPortalAllocatableShows` together so fit UI Cap B data matches enforcement.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Add explicit 25+25 → queue 25 of A unit coverage as planned.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Workflow docs + state; no permanent doc rewrite required for this hotfix.

---

## Required Changes (if approved_with_changes)

—

---

## Blockers (if blocked)

—

---

## Verdict Rationale

Clear root cause, narrow remediation, security boundary restored by redeploy, manual QA gated appropriately.

---

## Next Step

Implement approved scope: harden client, add unit tests, deploy to `fresh-prints-dev`, soft-reload Portal, request owner re-test.
