# Review: Portal upload limits layout, plain copy, ZIP cap alignment

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-portal-upload-limits-copy-zip-plan.md |
| Verdict | **approved** |

---

## Summary

Residual polish after 25 MB + remaining-quota QA. Scope is bounded: layout, plain-English quota copy, ZIP byte cap derived from Settings image daily limit, and callable payload so Portal does not hardcode stale ZIP size. Storage stays at 2 GB ceiling; Functions enforce tighter max. No production.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Residual only |
| Architecture alignment | pass | UI → service → callable |
| Security impact addressed | pass | Tighter Function checks; storage ceiling OK |
| Data Model impact addressed | pass | None |
| Backend impact addressed | pass | Payload + ZIP validation |
| Test strategy adequate | pass | Unit + manual |
| Human checkpoints identified | pass | Manual QA; no prod |
| Roadmap alignment | pass | Small managed item #2 residual |
| Documentation plan | pass | FIREBASE / BACKEND / SECURITY |
| No silent scope expansion | pass | No per-ZIP image quota charging this phase |

---

## Architecture Review

**Findings:**
- Returning `maxZipBytes` from the quota callable avoids Portal guessing Settings.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Purpose-scoped ZIP max in create/finalize is correct; storage ceiling alone is not sufficient and must not be the only check.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev-only deploy)

---

## Data Model Review

**Findings:**
- None

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- `uploadStarts` rename is fine (Portal-only). Keep internal rate-limit fields unchanged.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Update format util tests; add compute helper unit test; manual layout/copy/ZIP checklist.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Note ZIP formula and that storage ceiling ≠ purpose display max.

---

## Required Changes (if approved_with_changes)

None

---

## Blockers (if blocked)

None

---

## Verdict Rationale

Clear owner FAIL residual with explicit layout, copy, and ZIP consistency rules. Safe to implement on fresh-prints-dev.

---

## Next Step

Implement approved scope.
