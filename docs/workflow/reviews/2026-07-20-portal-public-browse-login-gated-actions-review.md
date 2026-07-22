# Review: Portal public browse + login-gated actions (#13)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Reviewer | Review Agent (Security + Architecture perspectives) |
| Plan | `docs/workflow/plans/2026-07-20-portal-public-browse-login-gated-actions-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly scopes a high-impact auth-boundary change: public **read** of ready catalog + derivatives, login for mutations, with rules (not AuthGate) as the security boundary. Scope stays on #13; #12 remains queued; production rules/deploy stay human-gated. Approved with binding implement constraints below (defaults, rules predicates, doc updates, deploy checkpoint).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Public browse + action CTAs + rules; #12 / prod / projection collection out |
| Architecture alignment | pass | UI UX gates; services/rules enforce; minimal route-group churn OK |
| Security impact addressed | pass | Explicit public read surface; originals/writes stay private; deploy gates |
| Data model impact addressed | pass | Permission narrative only; no schema migration |
| Backend impact addressed | pass | Firestore + Storage rules; callables verify-only |
| Test strategy adequate | pass | Typecheck + units + honest rules matrix / probes (no full rules emulator suite today) |
| Human checkpoints identified | pass | Manual UI; rules deploy to shared projects; production later |
| Roadmap alignment | pass | #13 elevated; #12 Queued |
| Documentation plan | pass | SECURITY / BACKEND / DECISIONS / ROADMAP |
| No silent scope expansion | pass | Open-question defaults prevent thrash |

---

## Architecture Review

**Findings:**
- Keeping AuthProvider at root and softening AuthGate (or path allowlist) matches existing Portal layout; splitting `(public)` / `(authenticated)` route groups is optional, not required.
- Shell providers must be guest-safe — plan correctly calls this out; implement should treat permission-denied console noise as a defect.
- Catalog deep link + share redirect path is the right integration with completed #11.

**Required changes:**
- [x] None beyond Required Changes section (binding defaults)

---

## Security Review

**Findings:**
- Current rules already expose **full** ready design documents to authenticated customers (`isCustomerReadableDesign`). Extending the same resource predicates to unauthenticated readers increases *audience*, not *field surface*, versus today’s customer read. Acceptable if documented in SECURITY.md + ADR; originals remain staff-only in Storage — verify Storage helper drops `isCustomer()` without weakening filename / ready checks.
- Critical: public `allow read` must be **resource-constrained** (`status == "ready"`, category `isActive`, tag `approved`). Never broad collection `allow read: if true`.
- Client AuthGate is UX only — shipping guest UI against private rules is broken product; shipping public rules without UI gates would still be safe for writes if callables/rules deny, but poor UX. Both layers in scope is correct.
- Residual medium risk: scrapers + document fields (`originalPath`, AI metadata, staff UIDs). Plan correctly keeps field-level projection out of scope; do not pretend UI mapping is a security control.
- Rules deploy to `fresh-prints-dev` / production requires **human approval** before Test claims cloud guest browse PASS.

**Required changes:**
- [x] See Required Changes §1–4

**Human approval needed before production:**
- [x] Firestore rules deploy (any shared project)
- [x] Storage rules deploy (any shared project)
- [x] Production Portal App Hosting release (later; out of this phase’s implement unless owner expands)

---

## Data Model Review

**Findings:**
- No entity/status changes. Permission docs must state unauthenticated **read** of ready catalog subset.

**Required changes:**
- [ ] None required beyond SECURITY/DECISIONS narrative

---

## Backend Review

**Findings:**
- Callables should remain auth-gated; implement checklist: spot-check mutation callables used by catalog CTAs still throw `unauthenticated` for guests (no code change expected).
- No new secrets/env. Share Admin SDK path unchanged.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Honest about missing `@firebase/rules-unit-testing` suite — acceptable with documented permission matrix + manual probes after approved rules deploy, plus Portal unit tests for path classification / returnTo.
- Manual guest + signed-in regression is mandatory before signoff.

**Required changes:**
- [x] Record rules probe commands/results in Test phase report (project id, allow/deny cases)

---

## Documentation Review

**Findings:**
- SECURITY.md still has outdated “customers have no Firestore read” Desktop language and “Portal rules not implemented in Phase 2A” — must be corrected in this phase so docs match rules.

---

## Required Changes (if approved_with_changes)

1. **Treat plan Open Question defaults as binding** unless owner overrides in Decision Log before Implement: public `/` + `/catalog/**`; hard-auth mutation-primary routes (`/donate`, `/requests/**`, `/favorites`, `/custom-designs/**`, `/account/**`); no public `shows` reads; counts visible on cards.
2. **Rules helpers** must mirror today’s customer-readable predicates (ready / active / approved) and staff bypass; Storage ready-derivative check must not require auth but must still require ready design existence + canonical filename.
3. **Same workflow:** update SECURITY.md (and BACKEND Storage public/private row + short DECISIONS ADR) when rules land — do not leave Phase 2A “not implemented” language.
4. **Do not deploy** Firestore/Storage rules to any shared Firebase project without recorded human approval in workflow state; confirm project id (`fresh-prints-dev` vs prod) in the approval note.
5. **Guest shell:** Favorites / print-request / notifications providers must no-op when signed out (no uncaught permission errors).

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Plan is thorough, security-aware, and roadmap-aligned. Residual risks are acknowledged and acceptable for the product intent. `approved_with_changes` binds implement to the open-question defaults, rules predicate discipline, doc updates, and human rules-deploy gate — without requiring a plan rewrite.

---

## Next Step

Implement approved scope (with required changes above). Stop for human approval before any Firebase rules deploy. Do not start #12.
