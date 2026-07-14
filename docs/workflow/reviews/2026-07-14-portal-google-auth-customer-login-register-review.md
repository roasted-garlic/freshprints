# Review: Portal Google login/register (customers only)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-14-portal-google-auth-customer-login-register-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly scopes Google to Portal customers, reuses `registerCustomer` for post-Google username provisioning, keeps Studio email-only, and adds a complete-profile path for the current dead-end bootstrap states. Security and human Firebase Console gates are explicit. Approve for implementation.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal-only; Studio out |
| Architecture alignment | pass | Auth → callable provision → session |
| Security impact addressed | pass | Staff blocked; console human gate |
| Data model impact addressed | pass | No schema change |
| Backend impact addressed | pass | Reuse registerCustomer |
| Test strategy adequate | pass | Manual + console checkpoint |
| Human checkpoints identified | pass | Enable Google provider |
| Roadmap alignment | pass | Owner-directed |
| Documentation plan | pass | ADR + FIREBASE/SECURITY |
| No silent scope expansion | pass | Linking deferred |

---

## Architecture Review

**Findings:**
- Complete-profile outside AuthGate is correct.
- Do not logout on Google missing-profile (unlike failed email register).

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Google only on Portal UI; Studio unchanged.
- `registerCustomer` already rejects staff roles.
- Human must enable provider; agent must not change production console without approval.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Enable Google on production Firebase project (separate from code)

---

## Data Model Review

**Findings:**
- Reuse existing entities and username reservation.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Prefer no callable contract change unless displayName default from token is trivial.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Manual Google flows + Studio regression are required.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR + FIREBASE Auth providers update required.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Bounded, secure, aligns with owner rules and existing provisioning. Proceed to implement; stop for human Firebase Console enablement before claiming end-to-end Google PASS.

---

## Next Step

Implement approved scope. Issue human checkpoint when Google provider enablement is needed for manual test.
