# Review: Assisted Creation approved proof PNG download (14-day full-res retention)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-assisted-approved-proof-download-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly reuses existing proof Storage objects (no promote), matches owner lifecycle (sibling purge on approve, full purge on non-approve terminal, physical delete after 14 days), and keeps AuthZ on existing Storage rules plus Admin SDK deletes. Scope is bounded; docs and manual QA are identified. Proceed to implement on `fresh-prints-dev` only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Download + lifecycle purge; no preview generation |
| Architecture alignment | pass | Callables/services own purge; UI thin |
| Security impact addressed | pass | No public bucket; customer/staff path rules; Admin deletes |
| Data model impact addressed | pass | Additive fields; fail-closed for legacy |
| Backend impact addressed | pass | Hooks + schedule/callable |
| Test strategy adequate | pass | Unit retention + Functions build + manual |
| Human checkpoints identified | pass | Manual QA; no prod |
| Roadmap alignment | pass | Assisted Creation Phase 9C extension |
| Documentation plan | pass | DATA_MODEL / BACKEND / SECURITY / ADR |
| No silent scope expansion | pass | Studio expiry optional skipped |

---

## Architecture Review

**Findings:**
- Reuse path avoids customer-upload-style promote pipeline — appropriate.
- First `onSchedule` is acceptable; callable dry-run preserves operability if Scheduler setup lags.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Download via authenticated client Storage read of own path is consistent with preview.
- Purge must only target paths under the request’s proof prefix.
- Fail closed for legacy approved without `approvedProofId`/`approvedAt`.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production deploy (explicitly out of scope)

---

## Data Model Review

**Findings:**
- `approvedProofId` + `approvedAt` + per-proof `fullSizePurgedAt` are sufficient.
- Deriving expiry from `approvedAt + 14d` avoids dual clocks.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Hook deletes after status transaction; then patch `fullSizePurgedAt`.
- Orphan cleanup on schedule for terminal leftovers is good belt-and-suspenders.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Retention helper unit tests are the main automated gate; manual covers transparency.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR-FP-093 + DATA_MODEL/BACKEND/SECURITY updates required in implement.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Owner lifecycle is clear; storage choice is least-waste; security and migration notes are adequate. Approved for implementation.

---

## Next Step

Implement approved scope on `fresh-prints-dev`; then test + manual QA.
