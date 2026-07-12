# Review: Portal Discover hint + Start-request Upload/Browse guidance (remediation r3)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-remediation-r3-discover-start-guidance-plan.md |
| Verdict | **approved** |

---

## Summary

Plan is a narrow Portal UX remediation: restyle the request-workflow hint and add a same-modal Upload vs Browse step after Start request confirmation. No backend, rules, or data-model changes. Creating the request only after path choice correctly avoids orphan drafts if the customer cancels mid-flow.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Discover/Library hint + start modal path; continue-flow out of scope |
| Architecture alignment | pass | Hook + shared modal + detail deep-link; services untouched |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Portal typecheck + manual UX |
| Human checkpoints identified | pass | Manual UI after implement |
| Roadmap alignment | pass | Fast-follow under portal-customer-artwork-upload |
| Documentation plan | pass | Workflow artifacts sufficient |
| No silent scope expansion | pass | Explicit out-of-scope for continue / Studio / prod |

---

## Architecture Review

**Findings:**
- Two-step modal in shared components with creation orchestration remaining in `usePrintRequestCreationFlow` is correct.
- Upload deep-link via query param is a light coordination pattern; strip after open to avoid sticky panel on refresh.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No new public surfaces or permission changes.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev-only deploy if any later)

---

## Data Model Review

**Findings:**
- None

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Manual path for cancel-without-create and both navigation targets is essential.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Workflow plan/review/checkpoint adequate; permanent docs optional.

---

## Required Changes (if approved_with_changes)

None

---

## Blockers (if blocked)

None

---

## Verdict Rationale

Owner product direction is clear; scope is reversible Portal-only UX; create-after-path mitigates the main orphan-request risk.

---

## Next Step

Implement approved scope.
