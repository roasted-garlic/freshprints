# Signoff: Show Queue Production Timer + Calendar Picker

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Signoff by | Signoff Agent |
| Plans | `docs/workflow/plans/2026-07-07-show-queue-production-timer-plan.md`, `docs/workflow/plans/2026-07-07-show-calendar-picker-plan.md` |
| Reviews | `2026-07-07-show-queue-production-timer-review.md`, `2026-07-07-show-calendar-picker-review.md` |
| Test report | `docs/workflow/reviews/2026-07-08-show-queue-timer-and-calendar-picker-test-report.md` |
| Final status | **approved** |

---

## Summary

Delivers Show Queue **Start / Pause / Resume / Mark finished** production timer (Option B), customer **Printing** progress in Portal and Studio, past-show read-only UX, shared **@fresh-prints/show-picker** calendar in Add to Show, and sidebar nav reorder (production links above AI Processing). User confirmed **Firestore rules deployed** and **manual QA PASS** 2026-07-08.

---

## Changes Delivered

### Behavior

**Production timer**
- Timer fields on `upcomingShows`; staff controls on Show Queue detail
- Start moves allocations `pending`/`queued` → `in_progress`; Mark finished → `done` + request reconciliation
- Portal/Studio **Printing** tab via allocation totals

**Past shows**
- Read-only detail actions; PAST status badges; past shows excluded from Add to Show picker
- Service guard on `allocatePrintRequestItem`

**Calendar picker**
- `@fresh-prints/show-picker` package; Studio Add to Show; Portal package/tsconfig ready
- `buildShowPickerOptions` shared mapper; auto-select default date slot

**Sidebar**
- Print Requests + Show Queue above AI Processing + Imports (dividers unchanged)

### Key packages / files

- `packages/show-picker/`
- `packages/shared/src/utils/showCalendarGrid.ts`, `showPrintTimer.ts`
- `src/renderer/.../AddToShowModal.tsx`, `UpcomingShowsPage.tsx`, `upcomingShowService.ts`
- `apps/portal` — `@fresh-prints/show-picker` dependency + `transpilePackages`
- `firestore.rules`, `docs/project/DECISIONS.md` (ADR-FP-064, ADR-FP-065)

---

## Tests

### Automated

See test report — typecheck, lint, 56 targeted unit tests, vite build all PASS.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Firestore rules deploy | Deployed | User 2026-07-08 |
| Add to Show calendar UX | PASS | User 2026-07-08 |
| Past show read-only + picker filter | PASS | User 2026-07-08 |
| Production timer flow | PASS | User 2026-07-08 |
| Portal Printing tab | PASS | User 2026-07-08 |
| Sidebar reorder | PASS | User 2026-07-08 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production rules deploy | obtained | 2026-07-08 | User confirmed |
| Manual Studio/Portal QA | obtained | 2026-07-08 | User confirmed PASS |

---

## Deferred Items

- Portal customer show-selection UI (package ready; wiring when product flow scoped)
- Per-request finish mid-show; timer reset
- Customer Requests (sidebar Later)

---

## Verdict

**approved** — Automated tests passed; Firestore rules deployed; manual QA confirmed by user 2026-07-08.

**Next roadmap item:** Phase 8 Portal Slice 3 live QA (Working/Queued/Printed flows) or Portal customer show-selection when scoped (`@fresh-prints/show-picker`).
