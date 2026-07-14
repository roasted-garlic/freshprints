# Plan amendment: Optimistic first catalog add (create path)

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | ready_for_review |
| Amends | `print-request-add-to-show-selection-bounce` session polish / Portal Current Request |
| Verdict intent | approved for narrow UX perf |

## Goal

Make the first “Add to request” (when no Current Request doc exists yet) **feel instant**: optimistic qty/badge/drawer, toast immediately, create+add in background.

## Problem

`useAddDesignToRequestFlow` create branch awaits `createPrintRequest` → `addOrIncrement` → `refreshRequests` before toast/UI. Existing-request path already uses optimistic `queuePrimaryQuantity`. Also `currentRequestAggregates` is forced empty when `workingRequest` is null, so optimistic items would not show on cards/badges; drawer treats virtual-empty as empty even with items.

## Approach

1. Create branch: seed summary, optimistic item qty=1, immediate success toast; background create+add; replace optimistic id; `reloadRequests` silent; avoid wiping items via stale null `reloadWorkingItems`.
2. Context: expose aggregates from items even without `workingRequest`.
3. Drawer: `isEmpty` based on `workingItems.length === 0` only.
4. Manual: first add from catalog feels instant; failure rolls back.

## Out of Scope

Backend create+add merge into one callable (nice follow-up, not required now).
