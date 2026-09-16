# Review: Selected Print Request live sync (Studio ↔ Portal)

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-16-selected-print-request-live-sync-studio-portal-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Scope is correctly bounded to selected/open request listeners. Accept plan defaults for dirty fields and list-rail out of scope. Proceed to implement with the conditions below.

---

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Selected detail only |
| Architecture alignment | pass | Hooks → services → onSnapshot |
| Security impact addressed | pass | Existing Rules; no query broadening |
| Data model impact | pass | Read-only |
| Backend impact | pass | No Functions |
| Test strategy adequate | pass | Lifecycle contracts + Owner QA |
| Human checkpoints | pass | Owner DEV QA |
| Documentation plan | pass | WORKFLOWS/TESTING note |
| No silent scope expansion | pass | |

---

## Required changes during Implement

1. Accept plan defaults: (a) remote item snapshots apply in v1 (Studio editors remain blur/save oriented); (b) unselected list-rail live update out of v1.
2. Studio: request-scoped `subscribePrintRequest` + `subscribePrintRequestItems` via existing shared/ref-counted or equivalent; wire `usePrintRequestDetails`; detach on selection change.
3. Portal: subscribe open request doc always; subscribe items when not already driven by live Working cart; subscribe allocations for open `printRequestId` to keep unallocated/show chrome fresh.
4. No collection-wide listeners; retain Firestore usage trace metadata.
5. Contract tests for attach/detach; Owner DEV QA checklist.

**Verdict: approved_with_changes** — continuous Implement → Test → Owner DEV QA prep authorized by owner Continue.
