# Review: Portal upload limits, speed, confirmations, DPI (r7)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-plan.md |
| Verdict | **approved** |

---

## Summary

Owner locked limits (100 files, 100 MB, 2 GB batch, concurrency 8, daily 200), confirmation copy, and catalog-permission semantics: optional default-on, attach without it, staff can still promote but must see the decline. Scope is bounded to shared limits, Storage/Functions, Portal upload UX, attach sizing, compact DPI on request cards, and Studio visibility of the flag.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | |
| Architecture alignment | pass | Shared constants + attach helper |
| Security impact addressed | pass | Caps + daily + lease; higher surface accepted |
| Data model impact addressed | pass | terms v2; boolean may be false |
| Backend impact addressed | pass | rules + callables; promote not blocked |
| Test strategy adequate | pass | unit + manual |
| Human checkpoints identified | pass | post-implement UI; no prod |
| Roadmap alignment | pass | r7 under customer-upload parent |
| Documentation plan | pass | FIREBASE/BACKEND/DECISIONS |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Attach sizing via `resolveInitialPrintRequestItemSize` matches Studio/Portal catalog path.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Larger uploads increase cost/abuse risk; mitigated by 2 GB batch + daily 200 + concurrency 8.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Storage rules + Functions deploy to production (later; this remediates to **dev** only)

---

## Data Model Review

**Findings:**
- `catalogUseAcknowledged: false` must remain valid on confirmed uploads; Studio UI must display decline.

**Required changes:**
- [x] None (implement display, do not block promote)

---

## Backend Review

**Findings:**
- Storage rules must match 100 MB / ZIP caps; confirm validation must allow `catalogUseAcknowledged: false`.

**Required changes:**
- [x] None beyond plan

---

## Testing Review

**Findings:**
- Update shared limit alignment tests and confirm validation tests.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Update limit tables + ADR/DECISION for optional library permission visibility.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Owner decisions resolve all open questions. Safe to implement on fresh-prints-dev only.

---

## Next Step

Implement approved r7 scope.
