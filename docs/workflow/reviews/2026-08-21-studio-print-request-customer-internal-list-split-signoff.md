# Signoff: Studio Print Request Customer vs Internal List Split

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-08-20-studio-print-request-customer-internal-list-split-plan.md |
| Review | docs/workflow/reviews/2026-08-20-studio-print-request-customer-internal-list-split-review.md |
| Test report | docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-test-report.md |
| Manual checkpoint | docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-manual-checkpoint.md |
| Final status | **approved** |

---

## Summary

DEV signoff for `studio-print-request-customer-internal-list-split`. Owner Studio QA: **`PASS`**.

Studio `/print-requests` now shows **Customer Requests** (default) and **Internal Requests**, split on persisted `isInternal` (not request names). Lifecycle tabs, Working triage, search, create, edit, Duplicate, Add Designs, sizing, and Show Queue attach rules are unchanged. Kind switcher visual matches the Users page Staff/Customers segmented control (owner QA request).

Work is on `development`, **uncommitted**. Composite index is on **`fresh-prints-dev` only**. This is **not** a production signoff. No Studio release, Portal, Functions, or Rules deploy.

---

## Changes Delivered

### Behavior

- Top-level Customer Requests | Internal Requests. Default Customer (`isInternal == false`, includes Studio and Portal customer origins). Internal is `isInternal == true`.
- List and counts query `isInternal` + `queueTab` with existing `updatedAt` / `__name__` pagination.
- Kind omitted from the URL when customer; `kind=internal` when internal.
- Create lands in the matching kind, Working / Empty, selected.
- Deep links wait for by-id load and reconcile `kind` (and tab/triage when needed) before canonical fallback can steal `requestId`.
- Show Queue still loads both kinds (`usePrintRequests` omits `isInternal`).
- Kind switcher uses the Users-page segmented control style. Working / Queued / Printing / Printed pills unchanged. No counts on kind tabs.

### Files Created

- `apps/studio/src/renderer/src/features/print-requests/utils/filterPrintRequestsByRequestKind.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/filterPrintRequestsByRequestKind.test.ts`
- Plan, review, test report, manual checkpoint, and this signoff under `docs/workflow/`

### Files Modified

- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.ts`
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/derivePrintRequestsListLoading.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/derivePrintRequestsListLoading.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `apps/studio/src/renderer/src/styles/components/show-queue.css`
- `firestore.indexes.json`

### Documentation Updated

- `docs/WORKFLOWS.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/project/DECISIONS.md` (ADR-FP-140)
- `docs/project/ROADMAP.md`

---

## Tests

### Automated

- List-split unit tests: 50 pass (planner pair, kind filter, merge, loading, routes, active-tab filter)
- Sizing + Add Designs regressions: 38 pass (≥200 DPI, item-id Add Designs)
- Studio `npx tsc --noEmit`: exit 0
- `npm run lint`: exit 0
- `firebase deploy --only firestore:indexes --project fresh-prints-dev`: exit 0

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Studio Print Requests Customer vs Internal lists | PASS | owner 2026-08-21 |
| Kind switcher visual (Users-page segmented control) | PASS | owner 2026-08-21 (requested then accepted) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Implement | obtained | 2026-08-21 | `APPROVE IMPLEMENT` |
| DEV index | obtained | 2026-08-21 | `APPROVE DEV INDEX` — `fresh-prints-dev` only |
| Design / UX | obtained | 2026-08-21 | Owner asked for Users-page kind tabs; then `PASS` |
| Owner Studio QA | obtained | 2026-08-21 | `PASS` |
| Production deploy | not required | | Later checkpoint |
| Production index | not required | | Later checkpoint |
| Database migration | not required | | No schema/backfill |
| Business / policy | not required | | Presentation/query only |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Documents missing `isInternal` omitted by equality queries | low | Rules require bool on writes. No backfill this goal. Report if QA finds missing-field records. |
| Production index not deployed | medium (release) | Required before production Studio uses this query. Separate checkpoint. |
| Uncommitted on `development` | process | Commit when owner requests. |

---

## Deferred Items (Roadmap)

- Production Firestore index deploy for `isInternal + queueTab + updatedAt + __name__`
- Production Studio release / PR
- Data repair if any historical docs lack `isInternal` (not started; owner did not authorize scan)

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — owner Studio QA `PASS`. Automated tests passed. DEV index deployed. Scope held. Production remains a later checkpoint.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (no new residual beyond ADR-FP-140 / known missing-field caveat)
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated**
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files per `references/project-chatgpt-handoff/MANIFEST.md` when behavior/architecture changed

**Recommended next action for user:** Commit this work on `development` when ready. Production index + Studio release remain later, separate checkpoints.
