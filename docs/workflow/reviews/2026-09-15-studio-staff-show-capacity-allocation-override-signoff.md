# Signoff: Studio staff show-capacity allocation override

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-15-studio-staff-show-capacity-allocation-override-plan.md` |
| Review | `docs/workflow/reviews/2026-09-15-studio-staff-show-capacity-allocation-override-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-15-studio-staff-show-capacity-allocation-override-test-report.md` |
| DEV QA prep | `docs/workflow/reviews/2026-09-15-studio-staff-show-capacity-allocation-override-dev-qa-preparation.md` |
| Final status | **approved_with_notes** |

---

## Summary

Authorized Studio staff (owner/admin/helper) can explicitly exceed a show’s configured `maxTotalQuantity` when allocating a Print Request via **Allocate Anyway**, which sends trusted `overrideShowCapacity: true` on `allocateStudioPrintRequestToShow`. Configured max stays unchanged; UI may show truthful overage (e.g. 7/5). Portal remains strict. Owner DEV QA recorded **PASS**. Production, Portal publication, Studio release, Rules, and schema changes were not authorized and did not occur.

---

## Changes Delivered

### Behavior

- Studio Add-to-Show overflow / already-full paths offer **Allocate Anyway** with Cancel / confirm.
- Confirm places **full remaining** quantity on the selected show with `overrideShowCapacity: true`.
- Callable accepts override only when value is boolean `true`.
- Bypass **only** numeric capacity ceiling and capacity-driven / `productionStatus: "full"` blocking.
- Does **not** bypass Past, terminal statuses, quantity integrity, sizing/DPI, maintenance, customer quotas, or unrelated guards.
- Does **not** mutate `maxTotalQuantity` or set `maxQuantityOverridden`.
- Optional Admin field `showAllocations.showCapacityOverride: true` on override-created rows.
- Capacity-full shows remain selectable in Studio for override; split-to-another-show remains when partial fit exists.
- Portal `queuePortalPrintRequestToShow` unchanged (no override).
- ADR-FP-160 Apply-to-existing skip-below-allocated unchanged.
- Transfer/move capacity override out of v1.

### Files Created

- `apps/studio/.../AddToShowModal.capacityOverride.contract.test.ts`
- Plan / Formal Review / Test report / DEV QA prep / this Signoff

### Files Modified

- `packages/shared/src/utils/showAllocationEligibility.ts` (+ tests)
- `functions/src/allocateStudioPrintRequestToShow.ts` (+ tests)
- `functions/src/queuePortalPrintRequestToShow.test.ts` (Portal no-override regression)
- `apps/studio/.../AddToShowModal.tsx`, `SplitDesignPickerModal.tsx`, `upcomingShowService.ts`
- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `docs/project/DECISIONS.md` (ADR-FP-182), `ROADMAP.md`

### Documentation Updated

- ADR-FP-182; DATA_MODEL / BACKEND capacity-override notes; ROADMAP split-allocation wording

---

## Tests

### Automated

- Focused suites **79/79 PASS** (eligibility, capacity display, ADR-FP-160 eligibility, allocate callable, Portal queue, AddToShowModal contracts)
- Studio + Functions typecheck **PASS**
- Functions build **PASS**
- Targeted ESLint on touched TS/TSX **PASS**
- `git diff --check` **PASS** (LF/CRLF warnings only)
- Rules tests skipped (no Rules change)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA — Show capacity override | **PASS** | Owner 2026-09-15 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Formal Review acceptance + Implement | obtained | 2026-09-15 | Owner authorized Implement → Test with binding Required Changes |
| Owner DEV QA | obtained | 2026-09-15 | `OWNER DEV QA: SHOW CAPACITY OVERRIDE — PASS` |
| Production deploy | not required / not authorized | | Separately gated |
| Database migration | N/A | | None |
| Design / UX | obtained via DEV QA | 2026-09-15 | Allocate Anyway confirmation accepted in PASS |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Production / Studio release of callable + Studio UI | medium | Separate owner-authorized promotion |
| Working tree may still be uncommitted | low | Commit/push only if owner requests |
| Transfer/move still hard-blocks over capacity | low | Documented out of v1 |
| Live DEV QA required Function present in target env | low | Owner QA PASS implies DEV callable was available |

---

## Deferred Items (Roadmap)

- Production Functions + Studio release promotion for this feature
- Transfer/move show-capacity override (follow-up)

---

## Open Blockers

- [x] None for this DEV-scoped goal

---

## Verdict

**approved_with_notes** — Goal complete in DEV with Owner DEV QA PASS. Notes: production/Portal/Studio release remain separately unauthorized; transfer/move override deferred; commit/push not performed unless owner asks.

---

## Next Step

Goal closed. New work requires a new managed Plan. Optional: owner-directed commit/push and later production promotion of the callable + Studio build.
