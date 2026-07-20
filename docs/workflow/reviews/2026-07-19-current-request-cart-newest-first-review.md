# Review: Current Request cart — newest added at top

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-19-current-request-cart-newest-first-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly scopes a cart-drawer presentation reverse (newest-first) while leaving durable ascending `sortOrder` / duplicate insert-right intact. Approach is UI-only with a testable helper and ADR amendment. No backend or schema risk.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Cart groups only; detail sorter untouched |
| Architecture alignment | pass | Presentation in drawer; shared ascending helper unchanged |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | Docs-only clarification |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Unit + owner manual QA |
| Human checkpoints identified | pass | Manual cart order check |
| Roadmap alignment | pass | Owner UX correction vs ADR-FP-098 cart ascending |
| Documentation plan | pass | DECISIONS + DATA_MODEL |
| No silent scope expansion | pass | Explicitly out of scope: prepend sortOrder, detail reverse |

---

## Architecture Review

**Findings:**
- Extracting `sortCurrentRequestDrawerGroups` keeps drawer thin and testable.
- Must not reverse `sortPrintRequestItemsForDisplay` or detail hooks.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No auth, rules, or data exposure changes.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None

---

## Data Model Review

**Findings:**
- Persisted `sortOrder` semantics unchanged; cart reverse is display-only.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- No callable or Functions changes.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Unit tests for max-sortOrder desc + createdAt fallback are sufficient; manual sequential-add check required.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR-FP-098 amendment + DATA_MODEL one-liner match the product exception.

---

## Required Changes (if approved_with_changes)

—

---

## Blockers (if blocked)

—

---

## Verdict Rationale

Owner asked for cart newest-first; plan preserves ADR-FP-098 detail/duplicate behavior with a narrow presentation exception. Safe to implement.

---

## Next Step

Implement approved scope.
