# Signoff: AI Processing — Auto advance Toggle component

**Date:** 2026-06-24  
**Plan:** `docs/workflow/plans/2026-06-24-ai-processing-auto-advance-toggle-plan.md`  
**Status:** approved

## Summary

Replaced Processing tab Auto advance native checkbox with shared `Toggle` pill switch. Added optional `disabled` to `Toggle` for queue-run and loading states.

## Acceptance criteria

- [x] Auto advance renders as pill toggle (shared `Toggle`)
- [x] Toggle disabled when `isAutoQueueActive || isActionLoading`
- [x] Start/Pause vs Process image with AI unchanged (behavior-only confirmation)
- [x] Uses `.form-toggle` / `.toggle-switch` like Design Library Archived toggle
- [x] No queue logic changes

## Tests

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |

## Manual test checkpoint

**Environment:** local dev, Processing tab

1. Toggle OFF → **Process image with AI** visible; run one design.
2. Toggle ON → **Start AI** / **Pause AI** visible; start queue, confirm toggle disabled during run; Pause mid-queue.
3. Compare toggle appearance to Design Library **Archived** toggle.

**Manual result:** pending human QA
