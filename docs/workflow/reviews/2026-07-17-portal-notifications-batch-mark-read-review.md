# Review: Portal notifications — batch mark-read by request + kind

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-notifications-batch-mark-read-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow residual is well-scoped: batch mark-read by `requestId` + `kind` on deferred destination match, plus optional Mark all as read. Confirms Portal has no Studio-style Read link and should not add one. Security stays within existing customer update rules. Approved to implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Residual UX only; web-push parked |
| Architecture alignment | pass | Provider + service layer |
| Security impact addressed | pass | Same `readAt`/`updatedAt` only; no rules change |
| Data Model impact addressed | pass | No schema change |
| Backend impact addressed | pass | Client-only |
| Test strategy adequate | pass | Unit + typecheck + owner manual QA |
| Human checkpoints identified | pass | Manual re-test; no prod |
| Roadmap alignment | pass | portal-notifications residual |
| Documentation plan | pass | Plan + QA |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Matches existing deferred mark-read pattern; extends payload with request/kind.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Batch updates still owner-scoped via existing rules; no privilege expansion.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (no deploy in this phase)

---

## Data Model Review

**Findings:**
- Unread → read only; history retention unchanged.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- No Functions/rules/env changes.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Selector unit test + Portal typecheck + owner manual QA sufficient.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Canonical product rule documented in plan; manual QA for owner.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Product default is clear, implementation surface is small, security model unchanged. Safe to implement.

---

## Next Step

Implement approved scope.
