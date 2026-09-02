# Show Queue Batch Allocation Performance — Deferred Follow-Up Plan

**Date:** 2026-09-01  
**Status:** Deferred (not in `pre-smart-profiling-print-request-and-gang-sheet-polish` signoff)  
**Suggested future goal:** `show-queue-batch-allocation-performance`

---

## Purpose

Reduce latency when adding multiple print request items to a show from Studio **Add to Show** by replacing N sequential `allocatePrintRequestItem` round trips with a single Firestore batch per show leg.

---

## Why deferred

Bucket 7 reconciliation for `pre-smart-profiling-print-request-and-gang-sheet-polish` scoped signoff to:

- WS1 / WS2 / WS3 owner-PASS behavior
- Internal Gang Sheet settings completion
- Supporting navigation/export fixes

Batch allocation is a **new performance/UX feature** that was never owner-QA’d in WS1/WS2/WS3. It was removed from the working tree during reconciliation to avoid silent scope expansion. Implementation details are recorded here for a small follow-up managed phase.

---

## Affected files and functions

| File | Symbol / area | Role |
|------|---------------|------|
| `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts` | `allocatePrintRequestItemsBatch` | Service: one read pass + `writeBatch` for multiple items on one show |
| same | `AllocatePrintRequestItemsBatchInput`, `AllocatePrintRequestItemsBatchLine`, `AllocatePrintRequestItemsBatchProgress` | Types + phased progress callback |
| `apps/studio/src/renderer/src/features/print-requests/components/AddToShowModal.tsx` | `handleConfirm` | UI: call batch API per show leg; phased progress (`preparing` / `saving` / `syncing`) |

---

## Uncommitted behavior (removed 2026-09-01)

### Service (`allocatePrintRequestItemsBatch`)

- Permission + origin gates mirror `allocatePrintRequestItem` (including staff gang sheet rules).
- Parallel size validation via `assertPersistedPrintRequestItemSize` for unique item IDs.
- Single `writeBatch`: N allocation docs + show `allocatedQuantity` increment.
- One `syncPrintRequestQueueTabBestEffort` after commit (not per line).
- Progress phases: `preparing` (per-item load), `saving` (batch commit), `syncing` (queue tab sync).
- Returns `[]` (callers did not use returned allocations).

### UI (`AddToShowModal`)

- Groups legs by show; calls `allocatePrintRequestItemsBatch` once per show.
- Progress bar uses phased labels (“Saving N prints…”, “Updating queue status…”).
- `AllocationProgress` included optional `phase` field.

---

## Tests / QA still needed (future goal)

1. Unit/integration tests for batch service:
   - multi-item single show
   - capacity enforcement across batch total
   - staff gang sheet permission + internal-only origin
   - canceled allocations excluded from remaining quantity math
2. Contract test: batch outcome matches sequential `allocatePrintRequestItem` for same inputs.
3. Manual Studio QA:
   - Add to Show with 5+ items to one show — progress UX + capacity celebration
   - Split across two shows — two batch commits
   - Internal Gang Sheet destination tab
4. Firestore usage trace: confirm reduced write round trips vs sequential path.

---

## Implementation notes

- Reuse existing `allocatePrintRequestItem` validation helpers; do not duplicate business rules.
- Keep sequential path as fallback until batch path is tested and signed off.
- Consider returning created allocation IDs if future UI needs them.

---

## Relationship to current goal

- **Not required** for WS1 / WS2 / WS3 PASS restoration.
- **Does not block** Internal Gang Sheet settings signoff.
- Start only after `pre-smart-profiling-print-request-and-gang-sheet-polish` signoff and workflow IDLE (or explicit owner override).
