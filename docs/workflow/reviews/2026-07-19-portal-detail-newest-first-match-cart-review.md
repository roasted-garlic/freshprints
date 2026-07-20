# Review: Portal request detail — newest-first (match cart)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-19-portal-detail-newest-first-match-cart-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly extends cart newest-first to detail and identifies the required duplicate math flip (insert-before under descending display) so “to the right” stays true. Studio left alone; resize durability preserved. Scope is bounded and deploy is fresh-prints-dev only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal only; Studio untouched |
| Architecture alignment | pass | Shared helpers; Portal wrapper + callable |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | Docs only |
| Backend impact addressed | pass | Duplicate callable + dev deploy |
| Test strategy adequate | pass | Unit + manual duplicate/resize |
| Human checkpoints identified | pass | Manual QA; dev Function deploy |
| Roadmap alignment | pass | Owner UX alignment |
| Documentation plan | pass | ADR + DATA_MODEL |
| No silent scope expansion | pass | No prepend-on-add rewrite |

---

## Architecture Review

**Findings:**
- Newest-first display + insert-before is the correct pair for visual-right.
- Do not change Studio’s ascending display helper.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No auth/rules changes.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev-only Function)

---

## Data Model Review

**Findings:**
- Fractional sortOrder semantics unchanged.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Must redeploy `duplicatePortalPrintRequestItem` after helper switch.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Update Portal sort tests to expect newest-first; cover insert-before midpoint.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR-FP-098 must state Portal newest-first + insert-before for visual-right.

---

## Verdict Rationale

Owner wants detail = cart order with duplicate/resize behavior preserved visually. Plan’s insert-before pairing is necessary and sound.

---

## Next Step

Implement approved scope; deploy Function to fresh-prints-dev; manual QA.
