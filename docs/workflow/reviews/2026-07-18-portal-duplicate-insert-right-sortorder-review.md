# Review: Portal duplicate insert-right + durable sortOrder

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-portal-duplicate-insert-right-sortorder-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly identifies that Portal detail/cart newest-first (`createdAt` desc) overrides duplicate `sortOrder`, and that Portal’s insert-before helper conflicts with owner’s insert-right / Studio parity. Scope is narrow, matches documented `DATA_MODEL` display ordering, and limits deploy to fresh-prints-dev.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Detail + shared sorter + callable; no drag-reorder |
| Architecture alignment | pass | Shared util + service/callable; UI via hooks |
| Security impact addressed | pass | No auth/rules changes |
| Data model impact addressed | pass | Optional fractional sortOrder already documented |
| Backend impact addressed | pass | Callable only; dev deploy |
| Test strategy adequate | pass | Unit + owner manual QA |
| Human checkpoints identified | pass | Manual UI; no prod |
| Roadmap alignment | pass | Owner bugfix supersedes newest-first detail |
| Documentation plan | pass | DECISIONS + DATA_MODEL clarification |
| No silent scope expansion | pass | Cart alignment only via same sorter |

---

## Architecture Review

**Findings:**
- Restoring `sortPrintRequestItemsForDisplay` aligns Portal with Studio and DATA_MODEL.
- Insert-after helper should live in shared package (callable + Portal optimistic).

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No permission or rules changes.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev-only Function deploy)

---

## Data Model Review

**Findings:**
- No schema migration; fractional sortOrder already allowed.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Redeploy `duplicatePortalPrintRequestItem` to fresh-prints-dev after insert-after change.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Shared + Portal sort unit tests required; owner manual for grid adjacency.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR note that Portal duplicate inserts to the right under sortOrder display; supersede newest-first detail behavior.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Owner product rules are explicit; fix restores documented ordering and Studio parity without expanding scope.

---

## Next Step

Implement approved scope.
