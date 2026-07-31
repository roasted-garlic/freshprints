# Formal Review: Post-rollout Portal registration loading-ownership amendment

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent of Planning Agent amendment authoring) |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-registration-post-rollout-amendment.md` |
| Parent | `docs/workflow/plans/2026-07-31-production-portal-registration-stuck-plan.md` |
| Verdict | **approved** |

---

## Summary

Owner QA after App Hosting rollout of `b882e5c` / `8943d17` is **FAIL**: permanent complete-profile
busy overlay; no Firestore provisioning; 45s terminal error never appears. Read-only verification
confirms the new build **is** served. Independent source review shows the timeout never runs when
Google sign-in leaves `isAuthActionLoading: true` on `missing-profile`, because
`CompleteProfileForm` mounts a fixed overlay from that flag alone. The amendment correctly targets
loading-state ownership, escape visibility, composed regression tests, and gated rollout. **No
implementation in this pass.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal auth client ownership only; no Auth Console / Functions / Rules |
| Architecture alignment | pass | Keep callables behind services; AuthProvider + form coordination |
| Security impact addressed | pass | No secret logging; no Rules weakening; Auth delete still gated |
| Data model impact addressed | pass | No schema change; resume-first Auth-only policy |
| Backend impact addressed | pass | Callable still not invoked; no Functions change required for selected cause |
| Test strategy adequate | pass | Composed FAIL reproduction required, not helper-only |
| Human checkpoints identified | pass | New implementation + new App Hosting phrases |
| Roadmap alignment | pass | Goal #13; branding/Stage 2 remain paused |
| Documentation plan | pass | Incident/checkpoint/state/ROADMAP/handoff updated this pass |
| No silent scope expansion | pass | Explicit non-scope preserved |

---

## Architecture Review

**Findings:**

- Dual busy authorities (`isSubmitting` vs `isAuthActionLoading`) plus fixed overlay is the
  structural defect; amendment’s single provision-authority requirement is correct.
- Auth listener `registrationInProgressRef` early-return remains a secondary trap; amendment
  includes it without over-claiming it as the sole cause.

**Required changes:**

- [ ] None for plan approval (implement must follow amendment file list)

---

## Security Review

**Findings:**

- Stage logs remain stage-only; no token/PII logging requested.
- Production Auth/data/Console changes correctly forbidden until new evidence.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] App Hosting rollout of the **new** fix (separate phrase after implement review)
- [x] Any Auth orphan delete (only if inventory shows Google Auth-only and resume fails)

---

## Data Model Review

**Findings:** None for schema. Post-FAIL Admin inventory: only owner password user
`7v3SLjRN…`; customers/usernames/customer users still 0. Google Auth-only user reported by owner
was **not** present at diagnosis time — resume policy must re-inventory.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:** `registerCustomer` Cloud Run showed **0** entries in the post-rollout query window —
consistent with client never invoking. Do not deploy Functions for this amendment.

**Required changes:**

- [ ] None

---

## Test Review

**Findings:** Prior Phase 1 tests covered the timeout helper and some form paths but did not
reproduce sticky Google `isAuthActionLoading` overlay without entering provision — explaining
why automated tests passed while owner QA failed. Amendment’s composed test requirement closes
that gap.

**Required changes:**

- [ ] None beyond implementing the stated composed cases

---

## Required Changes Before Implementation

1. Implement exactly the loading-ownership correction in the amendment (do not widen to Auth
   Console / API keys / domains from historical 400).
2. Include composed regression for sticky Google busy **and** hung-provision timeout clearing
   all authorities.
3. Do **not** reuse `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` until the new code passes
   Implementation Review; use
   `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: LOADING-OWNERSHIP FIX` thereafter.
4. Re-inventory Auth before any orphan delete; do not delete/disable based on stale prefixes.

---

## Human Checkpoints

- Stop before runtime source until:
  `APPROVE PORTAL REGISTRATION LOADING-OWNERSHIP FIX IMPLEMENTATION`
- Branding / Stage 2 / domain cutover remain paused
- Preserve Stage 1 fixtures + Class D closed + PR #12 / `8943d17` history

---

## Verdict Rationale

Root cause is proven from deployed bundle presence + source control flow matching owner
symptoms + zero callable invocations. Plan is narrowly scoped, testable, and correctly gated.
**approved** to proceed to implementation **only after** the owner sends the new approval phrase.
