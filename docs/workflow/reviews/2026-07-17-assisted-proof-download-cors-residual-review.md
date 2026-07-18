# Review: Assisted proof download CORS residual + Approved label

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-assisted-proof-download-cors-residual-plan.md |
| Verdict | **approved** |

---

## Summary

Residual under assisted-approved-proof-download. Replacing Portal `getBlob` with a short-lived Admin signed URL callable correctly avoids Storage CORS for download while keeping AuthZ server-side. Approved list/modal labeling is a small UX fix with no data-model risk. Proceed to implement and deploy the callable to `fresh-prints-dev` only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | CORS download + Approved label only |
| Architecture alignment | pass | Service/callable boundary preserved |
| Security impact addressed | pass | Ownership + eligibility before URL mint; short TTL |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | New callable; no prod |
| Test strategy adequate | pass | Build/unit + manual download/label |
| Human checkpoints identified | pass | Manual retest; CORS gsutil only if needed |
| Roadmap alignment | pass | Residual of ADR-FP-093 |
| Documentation plan | pass | BACKEND/SECURITY/DECISIONS |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Client `getBlob` is the wrong tool when bucket CORS is unset; signed URL download is the robust pattern.
- Previews may keep `getDownloadURL` + `<img>`.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Must re-check eligibility and ownership in the callable (UI gates are not enough).
- Signed URL must not be minted for purged/expired/non-owned proofs.
- Prefer ~15 minute expiry and `attachment` disposition.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None for this residual (dev deploy only)

---

## Data Model Review

**Findings:**
- No schema changes.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Deploy `customerGetAssistedCreationApprovedProofDownloadUrl` to `fresh-prints-dev`.
- Optional CORS config is backup documentation only.

**Required changes:**
- [x] None

---

## Required Changes Before Implement

None.

---

## Verdict Rationale

Owner FAIL is clear; plan matches the preferred fix; security boundary is stronger than relying on client Storage + CORS alone.
