# Review: Portal unqueue capacity cache + Studio cancel-parity remove

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Narrow, evidence-backed follow-up to Owner DEV QA failures on count parity. Scope correctly separates the real Portal cache bug from the clarified non-bug (CR022 really is 25 prints). Studio cancel-vs-delete alignment matches recorded owner product direction. Approve with small implementation conditions below.

---

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Cache invalidate + Studio cancel only; cap math and data repair out of scope |
| Architecture alignment | pass | Invalidation at Portal service mutation boundary; Studio staff callable only |
| Security impact addressed | pass | Staff gate unchanged; cancel actor fields required |
| Data model impact addressed | pass | Reuses existing `canceled` + timestamps; no schema migration |
| Backend impact addressed | pass | Functions change noted; deploy gated |
| Test strategy adequate | pass | Contract/unit + Owner DEV QA |
| Human checkpoints identified | pass | Owner QA after implement; no prod deploy |
| Roadmap alignment | pass | Pre-production reliability follow-up |
| Documentation plan | pass | WORKFLOWS.md still says remove **deletes** — must update |
| No silent scope expansion | pass | Parent Signoff stays blocked |

---

## Architecture Review

**Findings:**
- Portal dual cache (read TTL + hook session) must both clear; service-layer invalidate after successful queue/unqueue is the right seam.
- Studio Show Queue already renders canceled / History only when canceled rows remain; fixing the callable is sufficient for display parity.

**Required changes:**
- [x] Prefer a single `invalidatePortalAllocatableShowsCaches()` entry point that clears both layers without the service importing React hook internals awkwardly (register session clear from the hook module, or shared cache module).

---

## Security Review

**Findings:**
- Cancel writes must set `canceledBy` / `updatedBy` to staff caller id.
- Do not broaden who can call the Studio unqueue function.

**Required changes:**
- [x] None beyond plan (actor fields already listed)

---

## Data Model Review

**Findings:**
- Aligns with DATA_MODEL canceled-history contract already used by Portal/move/requeue.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Mirror Portal cancel semantics for show quantity recompute (`canceledThisTx` treated as canceled in the in-TX snapshot).
- Cancel all currently deleted non-canceled rows on that show/request (same breadth as today's delete), not only `pending`/`queued`, unless editability already forbids later statuses.

**Required changes:**
- [x] Document that shared DEV/Studio QA needs the updated Functions build/emulator; no production deploy in this goal.

---

## Test Review

**Findings:**
- Add: after invalidate, next list load hits loader; queue/unqueue success paths call invalidate; Studio source/contract asserts cancel update not delete.

**Required changes:**
- [x] None beyond plan

---

## Required Changes Before/During Implement

1. Implement unified cache invalidation for read + session layers; call it on successful Portal queue and unqueue only (not on failure).
2. Studio callable: cancel-with-audit fields; recompute quantity including canceled-marked this-TX rows as canceled; keep `canceledAllocationIds` meaning.
3. Update `docs/WORKFLOWS.md` remove wording from “deletes” to cancel/retain history (active-only capacity recompute).
4. Do not change per-show cap copy or CR022 data.

---

## Verdict

**approved_with_changes** — proceed to Implement under the conditions above. Owner continuous Implement → Test → QA prep is already implied by “Continue.”
