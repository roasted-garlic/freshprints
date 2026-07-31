# Review: Production-release domain-last sequencing amendment

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-30-production-release-plan.md` §7 |
| DEPLOYMENT | `docs/standards/DEPLOYMENT.md` remaining steps 9–12 |
| Verdict | **approved** |

---

## Summary

The owner decision to keep Coming Soon live and treat `myprintrequest.com` as the final production
setup switch is correctly recorded. The amendment splits remaining work into domain-independent
setup → hosted.app smoke → readiness gate → cutover + domain-dependent smoke, without dropping
existing production requirements or authorizing any DNS/Auth/OAuth/App Hosting action.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Docs/workflow only; no runtime or external config |
| Architecture alignment | pass | Hosted.app remains the verification surface until cutover |
| Security impact addressed | pass | Authorized Domains / Google sign-in paired with cutover |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | No deploy; CORS already live and documented |
| Test strategy adequate | pass | Explicit independent vs dependent classification |
| Human checkpoints identified | pass | `APPROVE MYPRINTREQUEST.COM CUTOVER` |
| Roadmap alignment | pass | Goal #13 Phase G sequencing |
| Documentation plan | pass | Plan §7, DEPLOYMENT 9–12, state/handoff |
| No silent scope expansion | pass | GA4/Search Console remain later |

---

## Architecture Review

**Findings:**
- Does not skip Rules/Functions/App Hosting/Studio/CORS work already completed.
- Does not falsely mark domain-dependent Auth/email-link/robots/sitemap/share checks as runnable
  on hosted.app alone.
- Keeps transactional invitation/proof-notice **link** validation after canonical domain works,
  while still allowing provider-config / sender-domain verification earlier.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Auth Authorized Domains remains immediately with domain cutover (Stage 4), not earlier.
- Rollback to Coming Soon required before DNS change.
- No production action authorized by this documentation amendment.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] `APPROVE MYPRINTREQUEST.COM CUTOVER` before any DNS / custom-domain / Authorized Domains /
  Google OAuth change

---

## Testing Review

**Findings:**
- Stage 2 lists domain-independent smoke; Stage 4 lists domain-dependent smoke.
- Strategy correctly minimizes public-domain exposure to an unverified app.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Historical §3.16 / §3.18 items marked superseded rather than deleted (provenance preserved).
- DEPLOYMENT remaining order rewritten to match §7.

---

## Verdict Rationale

Amendment is consistent with the production-release goal, preserves all prior requirements, and
implements the owner’s explicit domain-last decision without authorizing external actions.

---

## Next Step

Immediate production task: **Stage 1** — complete domain-independent setup (start with Studio
email-provider selection if unset). Do **not** connect `myprintrequest.com`.
