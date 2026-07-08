# Plan: Show Queue Production Timer and Customer Progress

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | `docs/workflow/plans/2026-07-06-gang-sheet-builder-foundation-plan.md` (Slice 4 deferred) |

---

## Goal

Add **Show Queue–level** production timer controls (Option B): staff explicitly **Start / Pause / Resume / Mark finished** printing on a show. Export remains file-only and does not change status. Customer-visible progress becomes **Working → Queued → Printing → Printed**, driven by `showAllocations` status writes — not gang sheet builder.

## Background

- Allocations are created as `pending` but nothing transitions them to `in_progress` or `done`.
- `updateShowAllocationStatus()` exists but has no UI callers.
- Portal and Studio derive Queued/Printed from allocations; Printed never appears without manual Firestore edits.
- Gang sheet timer (Slice 4) was deferred; user confirmed timer lives on Show Queue only.

## Scope

### In Scope

- Timer fields on `upcomingShows` (`accumulatedPrintMs`, `activePrintStartedAt`, `printStartedAt`, `printPausedAt`, `printFinishedAt`, `printFinishedBy`)
- `upcomingShowService` actions: `startShowPrinting`, `pauseShowPrinting`, `resumeShowPrinting`, `markShowPrintingFinished`
- Start: `productionStatus → printing`; active allocations `pending`/`queued` → `in_progress`
- Pause/Resume: timer only; allocations stay `in_progress`
- Mark finished: fold timer; all active non-done allocations → `done`; reconcile print requests; show `productionStatus → completed` when all allocations finished
- Shared derivation: **Printing** tab/state when any allocation `in_progress`
- Studio Show Queue detail: timer display + controls
- Portal `/requests`: **Printing** tab; progress-aware list badges
- Studio Print Requests: **Printing** tab (aligned with Portal)
- Firestore rules: allow new `upcomingShows` timer fields (local file; deploy requires human approval)
- Unit tests for timer math and list grouping
- `DATA_MODEL.md` + ADR note in `DECISIONS.md`

### Out of Scope

- Gang sheet builder timer or revival
- Export triggering status changes
- Per-request mid-show finish (follow-up)
- Reset/stop timer (follow-up)
- Firestore rules deploy to dev/prod (human checkpoint)
- Backfill of existing shows (reads default `accumulatedPrintMs` to 0)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/types/upcomingShow/upcomingShow.types.ts`
- `packages/shared/src/utils/showAllocationTotals.ts`
- `packages/shared/src/utils/printRequestListGrouping.ts`
- `packages/shared/src/utils/printRequestQueueState.ts`
- `packages/shared/src/utils/portalPrintRequestListTabs.ts`
- `packages/shared/src/utils/showPrintTimer.ts` (new)
- `src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts`
- `src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.ts` (new)
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `src/renderer/src/styles/components/show-queue.css`
- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/portal/app/(app)/requests/page.tsx`
- `apps/portal/features/print-requests/components/PrintRequestCard.tsx`
- `firestore.rules`
- Tests alongside shared utils

### Architecture Impact

- Production orchestration in `upcomingShowService` (feature service layer)
- Pure timer math in `@fresh-prints/shared`
- UI via hook coordinating service; no Firebase in components

### Security Impact

- Staff-only writes (existing `canManageUpcomingShows`)
- Customers read allocations only (existing rules); no new customer writes

### Data Model Impact

- Optional timer fields on `upcomingShows`
- Allocation status transitions: `pending`/`queued` → `in_progress` → `done`
- Canonical finished write: `done` (read `printed` as legacy compatible)

### Backend Impact

- None (client-side Firestore writes by staff)

### UI / UX Impact

- Show Queue detail production card with elapsed timer
- Fourth **Printing** tab on Portal and Studio print request lists

### Migration Impact

- None required; backward-compatible reads

---

## Approach

1. Extend `UpcomingShow` type and Firestore mapper with timer fields (default `accumulatedPrintMs: 0` on create/read).
2. Add `showPrintTimer.ts` pure helpers: `computeElapsedPrintMs`, `formatPrintElapsed`.
3. Extend `showAllocationTotals` with `totalInProgressQuantity`.
4. Update `derivePrintRequestListTab` and `derivePrintRequestQueueState` for **printing**.
5. Implement service methods with batch allocation updates + `markPrintRequestCompletedIfFullyPrinted`.
6. Add `useShowProductionTimer` hook with 1s tick while actively printing.
7. Wire Show Queue detail UI.
8. Portal + Studio four-tab lists and progress chips.
9. Update `firestore.rules` `upcomingShowRequiredFieldsValid`.
10. Tests and docs.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes |
| Unit tests | `npx tsx --test packages/shared/src/utils/showPrintTimer.test.ts packages/shared/src/utils/printRequestListGrouping.test.ts packages/shared/src/utils/printRequestQueueState.test.ts packages/shared/src/utils/portalPrintRequestListTabs.test.ts packages/shared/src/utils/showAllocationTotals.test.ts` | yes |
| Build | `npx vite build` | yes |

### Manual

- [ ] Add request to show → Portal **Queued**
- [ ] Start printing → Portal **Printing**; timer runs in Studio
- [ ] Pause / Resume → timer freezes/resumes; Portal stays **Printing**
- [ ] Mark finished → Portal **Printed**; show locked from removal

---

## Human Checkpoints Anticipated

- [ ] Firestore rules deploy when ready for live timer writes
- [ ] Manual UI/UX review of Show Queue timer card

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Existing shows lack timer fields | Low | Optional in rules; default on read |
| Rules deploy not done | Medium | Document deploy step; local rules updated |
| Show-level finish marks all allocations | Low | Documented v1; per-request finish deferred |

---

## Rollback Plan

Revert code; timer fields on shows are inert if unused. No data migration required.

---

## Documentation Updates Required

- [x] DATA_MODEL.md — show timer fields and Option B workflow
- [x] DECISIONS.md — ADR for Show Queue timer vs gang sheet

---

## Open Questions

- [x] Export starts timer? **No** — explicit Start only (user confirmed Option B)
- [x] Gang sheet? **Out of scope**

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-07-show-queue-production-timer-review.md`
- Verdict: approved (2026-07-07, user direction)
