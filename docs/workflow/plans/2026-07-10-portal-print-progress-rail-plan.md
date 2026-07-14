# Plan: Portal print progress rail + live elapsed clock

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-10-portal-print-progress-rail-review.md |

---

## Goal

On Portal print request detail, when a request is **Queued**, **Printing**, or **Printed**, show a modern **stage rail** (`Queued → Printing → Done`) and a **live show-level elapsed clock** driven by the same print timer Studio uses — without requiring staff to mark individual gang sheets or designs printed.

## Background

Customers currently see only a status pill on request detail. Studio already runs a show-level Live Printing timer (`accumulatedPrintMs`, `activePrintStartedAt`, pause/finish). Customers cannot read `upcomingShows` directly (staff-only Firestore rules). Quantity/design-level progress is deferred until automation exists.

**Product decisions (2026-07-10):**
- Ship stage rail + elapsed clock only
- Active stage labels: **Queued** / **Printing** / **Done** (Done = printed/finished)
- Defer quantity bar and per-design checklist

## Scope

### In Scope

- Stage rail on Portal request detail for non-working requests
- Live/paused/finished elapsed display from show print timer fields
- Callable that returns **customer-safe** timer snapshot(s) for shows linked to the owned request’s allocations
- Reuse shared `computeElapsedPrintMs` / `formatPrintElapsed` / `isShowPrintTimerPaused`
- Poll or focus-refresh for live ticking while printing (1s client tick from last snapshot + `activePrintStartedAt`)

### Out of Scope

- Quantity progress (“42 of 200”)
- Per-design waiting/printing/done checklist
- Opening `upcomingShows` client read rules to customers
- Staff workflow changes / gang-sheet “mark printed”
- Studio UI changes
- ETA / fake percentage bars

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/getPortalShowPrintProgress.ts` (new) + `functions/src/index.ts`
- `packages/shared/src/types/portal/getPortalShowPrintProgress.types.ts` (new)
- `apps/portal/features/print-requests/services/portalShowSelectionService.ts` (or new progress service)
- `apps/portal/features/print-requests/hooks/usePortalShowPrintProgress.ts` (new)
- `apps/portal/features/print-requests/components/PortalPrintRequestProgressPanel.tsx` (new)
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/styles/requests.css`
- Optional unit tests for stage mapping / DTO validation helpers

### Architecture Impact

- [x] Details: Portal UI → callable → Admin SDK reads owned allocations + linked shows. No client reads of `upcomingShows`.

### Security Impact

- [x] Details: Callable requires auth + portal customer + ownership of `printRequestId`. Returns only timer/progress fields (`showId`, `productionStatus`, timer ms fields). No notes, Whatnot URLs, sync errors, or capacity internals.

### Data Model Impact

- [x] None (read existing show timer fields)

### Backend Impact

- [x] Details: New HTTPS callable `getPortalShowPrintProgress`. Deploy required for Portal to receive live data.

### UI / UX Impact

- [x] Details: Progress panel above request items on detail when list tab ≠ Working. Manual UI review recommended.

### Migration Impact

- [x] None

---

## Approach

1. **Stage rail (client-only data):** Use existing `derivePrintRequestListTab` / allocation totals already on detail:
   - `queued` → Queued active
   - `printing` → Printing active
   - `printed` → Done active
   - `working` → hide panel

2. **Callable `getPortalShowPrintProgress({ printRequestId })`:**
   - `requirePortalCustomer`
   - Load print request; verify `customerId`
   - Load non-canceled `showAllocations` for request
   - Admin-read each distinct `upcomingShowId`
   - Return safe DTO list (usually one show)

3. **Clock display:**
   - Prefer show with `productionStatus === "printing"`, else first linked show
   - Queued / not started: `Waiting for the printing to start` (no counting timer)
   - Running: counting elapsed timer (`formatPrintElapsed`)
   - Paused: `Paused` + elapsed
   - Finished (`completed` / `fully_printed` or Done stage): `Finished` + elapsed

4. **Live tick:** Client `setInterval` 1s while running (same pattern as Studio `useShowProductionTimer` display half), re-fetch callable on focus / every ~30s to resync pause/finish.

5. **UI:** Compact panel matching Portal style — stage rail + status line with elapsed; subtle pulse on active Printing stage.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck Portal | `npm run typecheck -w @fresh-prints/portal` (or project script) | yes |
| Typecheck Functions | `npm run build -w functions` (or project script) | yes |
| Unit tests | Shared timer utils already covered; add small stage-mapping test if extracted | yes if helper extracted |
| Lint | project lint | yes |
| Backend/rules | no rules change | n/a |

### Manual

- [ ] Queued request (show not started): rail on Queued; waiting copy; no fake %
- [ ] Staff Start printing: portal shows Printing + ticking clock
- [ ] Pause / Resume: clock freezes / resumes
- [ ] Mark finished: Done active; Finished · elapsed
- [ ] Working draft: panel hidden
- [ ] Other customer’s request id: callable denied

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval
- [ ] Business logic decision — **done** (ship 1+2 only)
- [x] Production / shared env: **Firebase callable deploy** required before Portal can load timer data
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Callable not deployed → clock empty/error | Medium | Graceful fallback: show rail only; muted “Timer unavailable” |
| Stage from allocations vs show timer briefly diverge | Low | Rail from allocations (what list tabs use); clock from show — copy explains printer run |
| Multi-show allocations | Low | Pick printing show first; else first show |

---

## Rollback Plan

Remove progress panel UI; undeploy or ignore callable. No schema changes.

---

## Open Questions

- None blocking. Quantity/design progress deferred by product decision.

---

## FreshForge Impact Classification

N/A — Fresh Prints product work (Portal + Functions), not FreshForge starter surface.

---

## Decision Log

- 2026-07-10 — User: ship stage rail + elapsed clock; defer quantity/design checklist; Done label for finished stage.
