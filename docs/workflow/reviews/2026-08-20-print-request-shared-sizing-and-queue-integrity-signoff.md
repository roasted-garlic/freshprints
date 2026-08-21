# Signoff: Print Request shared sizing and queue integrity

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` |
| Amendment 1 plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md` |
| Amendment 2 plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-plan.md` |
| Review | `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-review.md` |
| Amendment 1 review | `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-review.md` |
| Amendment 2 review | `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-review.md` |
| Test report | `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-test-report.md` |
| Amendment 2 test report | `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-test-report.md` |
| Final status | **approved** |

---

## Summary

DEV signoff for `print-request-shared-sizing-and-queue-integrity`. Owner combined QA: **`PASS`**.

Manual Print Request sizing is **≥200 effective DPI and ≤22″** only. ADR-FP-080 approved-max remains processing/initial-size, not a later save ceiling. Queue/export use persisted requested inches. Whatnot shows that are Past while still Printing finish through the existing Finish path, with **Mark Complete** recovery (ADR-FP-139). Studio **Add designs** no longer recreates resized catalog items at default size; save uses request item IDs.

Work is on `development`, **uncommitted**. This is **not** a production signoff. Functions deploy for `queuePortalPrintRequestToShow` size assert remains a later checkpoint.

---

## Changes Delivered

### Behavior

- Manual save: 200 DPI floor + 22″ cap. 200–299 DPI warns: “Requested size is below 300 DPI. It can be printed, but quality may be reduced.”
- Painkiller-class 14″ × 21.1″ (~308 DPI) is saveable.
- Dirty/invalid/saving/failed/optimistic sizes cannot be queued; dirty-valid flushes first.
- Studio allocate and Portal queue callable use the same assess. Export/gang fail closed on requested inches.
- Past + Printing Whatnot shows auto-Finish via `markShowPrintingFinished`; Past + Printing shows **Mark Complete**. Staff Gang Sheets excluded.
- Studio Add Designs creates items only for newly selected catalog designs. Existing items keep ID, size, quantity, and notes. Duplicate remains the intentional second-size path. No `designId` uniqueness rule.

### Files Created

- `packages/shared/src/utils/printRequestItemPersistenceHealth.ts`
- `packages/shared/src/utils/printRequestItemPersistenceHealth.test.ts`
- `packages/shared/src/utils/printRequestQueuedInches.ts`
- `packages/shared/src/utils/printRequestQueuedInches.test.ts`
- `packages/shared/src/utils/printRequestItemSizing.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/planPrintRequestDesignSelectionWrites.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/planPrintRequestDesignSelectionWrites.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestPersistenceBarrier.contract.test.ts`
- `apps/portal/features/print-requests/components/printRequestPersistenceBarrier.contract.test.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useStalePastPrintingShowReconciliation.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showFinishMutationPlan.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showFinishMutationPlan.test.ts`
- `functions/src/lib/assertQueuePrintRequestItemSize.ts`
- `functions/src/lib/assertQueuePrintRequestItemSize.test.ts`
- Plan, review, test-report, and this signoff artifacts under `docs/workflow/`

### Files Modified

- `packages/shared/src/utils/printRequestItemSizing.ts`
- `packages/shared/src/utils/currentRequestAggregates.test.ts`
- `packages/shared/src/utils/showScheduleGrouping.ts`
- `packages/shared/src/utils/showScheduleGrouping.test.ts`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts`
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.ts`
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts`
- `apps/studio/src/renderer/src/features/gang-sheets/hooks/useGangSheetBuilder.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useExportGangSheetPng.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useExportShowZip.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/groupShowsByUpcomingPast.ts`
- `functions/src/queuePortalPrintRequestToShow.ts`

### Documentation Updated

- `docs/project/DECISIONS.md` (ADR-FP-139; ADR-FP-075 / ADR-FP-080 manual-save clarification)
- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/ROADMAP.md`
- Handoff: `CURRENT-STATE.md`, `13-recent-completed-work.md`, `03-roadmap-and-phases.md`, `04-features-inventory.md`, `05-workflows-summary.md`, `12-decisions-and-constraints.md`, `07-backend-and-ai-pipeline.md`

---

## Tests

### Automated

- Parent + Amendment 1: shared/Studio/Functions unit and contracts; Portal typecheck; Studio `tsc`; Functions build; Portal build; Studio Vite build; changed-file eslint — recorded pass in the parent test report.
- Amendment 2: 80 unit tests (planner + selection-state + parent regression); Studio eslint; Studio `tsc`; Studio Vite build — recorded pass in the Amendment 2 test report.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Amendment 2 QA 1–5 (Add Designs replay, no-op, repeat, Duplicate, remove) | PASS | human (owner `PASS` 2026-08-20) |
| Portal 14 × 21.1 sizing persist + Add to Show | PASS | human |
| Studio 14 × 21.1 sizing persist / attach / export | PASS | human |
| Portal request → Show Queue size preservation | PASS | human |
| Explicit Duplicate with independent sizes | PASS | human |
| Past + Printing automatic completion | PASS | human |
| Manual Mark Complete recovery | PASS | human |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Combined owner DEV QA | obtained | 2026-08-20 | Owner reply `PASS` |
| Production deploy | not required | | Later checkpoint |
| Database migration | N/A | | No schema migration |
| Design / UX | obtained | 2026-08-20 | Covered by owner QA |
| Business / policy | obtained | 2026-08-20 | 200 DPI + 22″; Finish reuse; no designId unique constraint |
| Secrets / env | N/A | | Unchanged |
| Functions deploy | not required | | `assertQueuePrintRequestItemSize` in source; deploy later |
| Production data repair | not required | | No console edits; pre-existing accidental duplicates not auto-deleted |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Uncommitted `development` working tree | Medium | Commit when owner asks; do not lose parent + both amendments |
| Portal queue size assert not live until Functions deploy | Medium | Studio allocate already asserts; deploy callable with a later approved release |
| Accidental default-size duplicates created before Amendment 2 | Low | Not auto-deleted; staff can remove leftover items |
| Portal catalog save still matches designId + default size | Low | Portal dirty-row filter avoids the Studio reproduction; out of Amendment 2 scope |

---

## Deferred Items (Roadmap)

- Owner-requested git commit / push (not done in this signoff).
- Production promotion PR `development` → `production`.
- DEV/production Functions deploy for `queuePortalPrintRequestToShow` size assert.
- App Hosting / Studio installer release.
- Optional later Portal Add Designs matching cleanup (not required for this goal).

---

## Open Blockers

- [x] None for DEV signoff

---

## Verdict

**approved.** Owner combined QA passed. Automated checks for parent, Amendment 1, and Amendment 2 passed. Scope stayed on `development` with no production mutation.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (no new register entry; deferred deploy noted here)
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated**
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files per `MANIFEST.md` (03, 04, 05, 07, 12)

**Recommended next action for user:** Commit this `development` working tree when ready. Production PR, Functions deploy, and App Hosting remain separate human checkpoints.
