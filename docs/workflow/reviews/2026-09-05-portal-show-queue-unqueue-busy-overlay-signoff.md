# Signoff: Portal show queue/unqueue busy overlay

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Status | **approved** |
| Plan | `docs/workflow/plans/2026-09-05-portal-show-queue-unqueue-busy-overlay-plan.md` |
| Review | `docs/workflow/reviews/2026-09-05-portal-show-queue-unqueue-busy-overlay-review.md` |

## Tests

| Check | Result |
|-------|--------|
| Contract tests (`portalShowQueueBusyOverlay.contract.test.ts`) | **passed** 3/3 |
| Owner Portal smoke (add + remove overlays) | **PASS** |

## Manual tests

- Add to show → busy overlay visible without scrolling — PASS
- Remove from Show & Edit → busy overlay visible — PASS

## Follow-ups

- Studio Add-to-Show busy overlay (deferred; staff)
- Show queue add/remove performance (deferred by owner)
