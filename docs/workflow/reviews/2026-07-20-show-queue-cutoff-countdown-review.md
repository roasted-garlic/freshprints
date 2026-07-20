# Review: Show queue cutoff + calendar countdown

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-20-show-queue-cutoff-countdown-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly places a global Portal-only queue cutoff on existing `settings/showQueue` (Show Queue settings), enforces it in list + queue callables, and keeps countdown compact in the shared picker. Studio staff allocation stays open after cutoff. Timezone approach (absolute Timestamp math; America/Chicago noted for other buckets) is sound.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | #5 only; no FP-102 churn |
| Architecture alignment | pass | Settings → shared utils → Functions → Portal/Studio UI |
| Security impact addressed | pass | Server enforce; rules allowlist; staff write |
| Data model impact addressed | pass | Optional field + code default 5 |
| Backend impact addressed | pass | list + queue; fresh-prints-dev deploy |
| Test strategy adequate | pass | Unit + typecheck + manual QA |
| Human checkpoints identified | pass | Owner manual PASS |
| Roadmap alignment | pass | Small Managed #5 |
| Documentation plan | pass | DATA_MODEL, BACKEND, ADR-FP-103 |
| No silent scope expansion | pass | Global not per-show; Portal-only |

---

## Architecture Review

**Findings:**
- Separate Portal cutoff check (not mixed into Studio `canAcceptNewShowAllocations`) preserves staff workflows.
- ShowPicker remains DTO-driven; countdown as option meta is fine.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Must update `firestore.rules` `showQueueSettingsFieldsValid` or Studio saves fail.
- Functions must re-read setting at queue time (not trust client).

**Required changes:**
- [x] None beyond plan

**Human approval needed before production:**
- [x] None (dev only)

---

## Data Model Review

**Findings:**
- Optional `portalQueueCutoffHoursBeforeStart` on `settings/showQueue`; default 5 in code.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Expose cutoff hours on list response for UI; enforce on queue inside txn path.
- New error code `SHOW_QUEUE_CUTOFF` preferred over overloading `SHOW_ALLOCATION_BLOCKED` for clear Portal copy.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Pure cutoff unit tests required; manual Portal/Studio QA for countdown layout.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR-FP-103; DATA_MODEL settings section; BACKEND callable notes; ROADMAP #5.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Scope matches owner wording; enforcement and settings placement are correct; UX constraints documented. Safe to implement.

---

## Next Step

Implement approved scope.
