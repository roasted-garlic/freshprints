# Amendment 1 Plan: All-status customer schedule visibility

| Field | Value |
|---|---|
| Date | 2026-07-31 |
| Parent plan | `2026-07-31-production-portal-show-schedule-and-limit-settings-plan.md` |
| Status | approved_with_changes; implemented |

## Evidence and defect

The approved nine-Function allowlist was deployed to `fresh-prints-dev` successfully. Source audit after deployment proves a remaining details-path defect: `PrintRequestDetailView` obtains schedule data only from `usePortalShowPrintProgress(printRequestId, preLiveAuthority.pollingEnabled)`. `resolvePortalMountedProgressAuthority` disables that hook for `done` and null progress stages, and the hook clears `shows` when disabled. Printed/completed and working/historical details therefore cannot receive schedule data even when positive allocations exist.

The list page has one `PrintRequestCard` rendering branch for all four tabs and passes `schedulesByRequestId[request.id]` independently of tab/status. However, its batch request currently sends the complete request list to a callable capped at 50; the client must chunk requests to retain schedule visibility for customers with more than 50 requests.

## Narrow scope

1. Add a detail schedule loader that calls the existing ownership-bounded `getPortalPrintRequestShowSchedules` for the single request independently of print-progress polling.
2. Render that sanitized schedule model on every details status/layout; keep print-progress timer polling behavior unchanged.
3. Chunk list schedule requests into batches of at most `PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX`, merge results, and preserve in-flight dedupe.
4. Add automated coverage for every supported list tab/status transition and details status, including terminal/canceled/historical allocations, no allocation, missing show, multi-show ordering/`+ N more`, and privacy-safe labels.
5. Run focused tests, Portal typecheck/build, Functions build only if backend source changes (not expected), lint, and `git diff --check`.

## Non-goals

- No ownership or Rules changes.
- No broad client Firestore reads of `upcomingShows`.
- No production deploy, Portal rollout, Studio rebuild, settings change, Stage 2, or domain work.
- No additional development deployment unless backend source changes.

## Acceptance

- Cards and details retain schedules across working, queued, printing, printed, completed, canceled, archived, and other mapped historical states while positive allocations exist.
- No allocation renders neither a schedule nor `Schedule unavailable`.
- A missing referenced show renders `Schedule unavailable`.
- Customer-visible output contains no show name, show/allocation/Whatnot identifiers, capacity, or other internal metadata.
