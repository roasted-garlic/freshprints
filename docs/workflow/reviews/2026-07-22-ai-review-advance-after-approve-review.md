# Review: AI Review advance to next item after approve/reject

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-ai-review-advance-after-approve-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow UX bug fix: after approve/reject, selection should stay on the next-below queue item. Root cause (pending-advance cleared before retention effect runs, which resets to `designs[0]`) is correctly identified. Scope is bounded to hook coordination + a pure helper; no security, data, or backend impact.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Approve/reject advance only; parked firestore work untouched |
| Architecture alignment | pass | Util + hook; no layer violation |
| Security Impact addressed | pass | None |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Unit helper + brief manual smoke |
| Human checkpoints identified | pass | Manual UI smoke after implement |
| Roadmap alignment | pass | Bug fix; does not conflict with parked goal |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | Explicitly excludes processing auto-queue |

---

## Architecture Review

**Findings:**
- Keeping `pendingAdvanceIndexRef` until selection sticks is the right coordination fix; extracting index math keeps the hook thinner.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No auth/permission/data exposure changes.

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
- Helper unit tests are sufficient for index math; manual smoke covers the React effect race in the real inbox.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- No durable product doc updates required.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Clear root cause, minimal surface, adequate tests, no elevated risk. Approved for implementation as planned.

---

## Next Step

Implement approved scope.
