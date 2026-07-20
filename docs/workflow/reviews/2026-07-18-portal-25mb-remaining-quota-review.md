# Review: Portal 25 MB image cap + remaining daily quota UI

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-portal-25mb-remaining-quota-plan.md |
| Verdict | **approved** |

---

## Summary

Owner-locked scope is clear: lower single-image max to 25 MB (ZIP unchanged), add a read-only quota callable, and show Etsy-style remaining counts on Portal Upload and Donate. Security posture matches existing rate-limit pattern (client-denied docs; Admin read via callable). Proceed to implement and deploy to `fresh-prints-dev` only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Residuals from upload-caps plan only |
| Architecture alignment | pass | Service → callable → Admin |
| Security impact addressed | pass | Auth + customer-only; no client rate-limit reads |
| Data Model impact addressed | pass | Read-only; no schema change |
| Backend impact addressed | pass | New callable + storage + redeploy size Functions |
| Test strategy adequate | pass | Alignment test + Functions build + manual QA |
| Human checkpoints identified | pass | Manual Portal re-test; no production |
| Roadmap alignment | pass | Follow-on to Small Managed Items #2 |
| Documentation plan | pass | FIREBASE / BACKEND (+ SECURITY if needed) |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Reuse `loadCustomerUploadQuotaSettings` + `resolveDailyQuotaTarget`; do not invent a second limit source.
- Format helper can live under Portal utils (mirror `formatEtsyPreviewQuota`) or shared; prefer Portal-local unless reused elsewhere.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Callable must use `requirePortalCustomer` and auth UID for rate-limit doc id (same as `chargeDailyQuota`).
- Validate `purpose` enum; reject unknown values.
- Do not return other users’ usage.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production deploy forbidden this phase

---

## Data Model Review

**Findings:**
- None. Existing `customerUploadRateLimits` + settings doc.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Redeploy create-batch + finalize (+ retry if it validates size) so bundled 25 MB constant is live.
- Deploy `storage` rules and `getCustomerUploadDailyQuota`.

**Required changes:**
- [x] None

---

## Test / Manual Review

**Findings:**
- Soft-fail UI if quota callable fails (do not block uploads solely because remaining display failed).

**Required changes:**
- [x] None

---

## Verdict Rationale

Approved: bounded residual, clear security model, owner-authorized dev deploy.
