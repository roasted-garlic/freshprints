# Review: Portal Review Request navigation race

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-19-portal-review-request-nav-race-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow Portal UX fix for a confirmed race: drawer Review falls back to the working tab list when `workingRequest` is null even though `pendingWorkingRequestId` / ensure already cover the create lag. Plan correctly prefers pending id and waits on ensure when cart is non-empty—no backend or data-model changes.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Drawer + optional resolver only |
| Architecture alignment | pass | Uses existing context ensure/pending |
| Security impact addressed | pass | Own request id from context |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Unit resolver + owner manual QA |
| Human checkpoints identified | pass | Soft-reload manual QA |
| Roadmap alignment | pass | Bugfix; Cap B parked |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | Explicitly out of scope duplicate-create deep fix |

---

## Architecture Review

**Findings:**
- Correct to keep create coalescing in context; drawer only needs resolved id / ensure await.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No new exposure; navigation targets authenticated user’s pending/working id.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None

---

## Data Model Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Resolver unit test + manual wipe/rapid-add path is sufficient for this UI race.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Workflow plan/review/state adequate; no permanent doc required.

---

## Required Changes (if approved_with_changes)

—

---

## Blockers (if blocked)

—

---

## Verdict Rationale

Root cause and fix match owner intent; scope is minimal and reversible; tests + manual QA gate signoff.

---

## Next Step

Implement approved scope.
