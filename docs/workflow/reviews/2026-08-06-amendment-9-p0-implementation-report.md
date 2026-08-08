# Amendment 9 P0 Implementation Report

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Amendment | 9 P0 — AI Review local reconciliation |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Baseline | `34f8766` (Amendment 9 Plan) |
| Scope | **P0 only** (no P1/P3/P4/Phase 1B) |

## Root cause corrected

Successful approve/reject/archive called `reloadDesigns()` + `onQueueChanged()` → full remaining-page `listDesignsPage` + three `countDesigns` after every action (O(n²) list docs for N≤100).

## Behavior shipped

### Success

1. Await returned `Design` from inbox service.
2. `reconcileSuccessfulInboxManualAction` → clear live design, set `pendingAdvanceIndexRef`, `applyDesignPatch` with tab-membership fields, local count deltas.
3. Existing selection effect advances via `resolveAdvanceIndexAfterInboxRemoval` (A→B→C→none).
4. **No** `reloadDesigns` / **no** three-tab `reloadCounts` on happy path.

### Failure

`recoverFailedInboxManualAction` → clear pending advance → one `reloadDesigns` → one `onQueueChanged` (≤3 counts).

### Processing preserved

`onQueueChanged` → `reloadCounts` remains for live-design completion, background observer, mount pending-work, processing queue, reopen/retry/rerun.

### K=∞

No timers, polling, or periodic reconciliation.

## Files

| Path | Change |
|---|---|
| `utils/aiReviewLocalReconciliation.ts` | New pure helpers + 45-design spy fixture |
| `hooks/useAiReviewInbox.ts` | Local success / bounded failure |
| `hooks/useAiReviewTabCounts.ts` | `applyCountsDelta` |
| `pages/AiReviewPage.tsx` | Wire `onInboxCountsDelta` |
| Tests | Local reconcile + wiring; Amendment 7 suites unchanged in intent |

## Out of scope confirmed

P1 oneshot reduction, Functions taxonomy, snapshots, Phase 1B, Firebase deploy, PR merge — not started.
