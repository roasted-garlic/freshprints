# Plan: Amendment 1 — Past + Printing Show Queue Auto-Completion

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal id | `print-request-shared-sizing-and-queue-integrity` |
| Kind | **Owner-requested Amendment 1** (same managed goal; not a second workflow) |
| Parent plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` |
| Related | `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-review.md` |

---

## Goal

Correct the Show Queue lifecycle so a Whatnot show cannot remain indefinitely **Printing** after Studio classifies it as **Past**. When that happens, run the **same** authoritative Finish/finalization path already used by staff **Mark finished**. Also expose a manual **Mark Complete** recovery action for any Past show that is still Printing.

This is a lifecycle-integrity amendment to the currently running managed goal. It does not replace the sizing/queue-integrity work.

---

## Background

Checkout at amendment-plan time:

| Item | Value |
|------|-------|
| Checkout | `C:\coding\fresh-prints` |
| Branch | `development` |
| HEAD | `1b967fd610300904dcfe0a390ed9766d012f22ca` |
| Parent Formal Review | **approved** — sizing plan; Implement **not started** |

Owner-reported production defect:

- Show is under Studio **Past** (scheduled start already passed)
- Production badge still **PRINTING**
- Live Printing timer still running
- Attached Print Requests remain `IN_PROGRESS`
- Example: scheduled Aug 20, 2026 at 8:00 PM

Parent goal Formal Review already approved the sizing fix. This amendment was received **before Implement**. No application code has been written for either scope.

Durable product rule (to record in ADR during Implement):

> When a Show Queue entry has crossed the application's authoritative Upcoming-to-Past time boundary, a stale production state of Printing must be reconciled through the normal show Finish/completion workflow. Staff must also have a manual Mark Complete recovery action for any Past show that remains Printing.

---

## Scope

### In Scope

- Reuse `upcomingShowService.markShowPrintingFinished` as the single authoritative completion operation
- Harden that operation for idempotent automatic invocation
- Automatic Past + Printing reconciliation in Studio Show Queue (open-at-boundary and closed-app reopen)
- Manual **Mark Complete** for Past + Printing Whatnot shows
- Same permission, confirmation, allocation, request, and timer semantics as Finish
- Focused regression tests listed below
- ADR-FP-139 during Implement (durable product decision)
- Workflow / CURRENT-STATE updates

### Out of Scope

- Badge-only / Past-tab display patches
- Changing Whatnot `status` / external show status
- Capacity, allocation quantities, request quantities, print dimensions, cutoff, catalog, uploads, Whatnot import
- Staff Gang Sheet **Mark Complete** (`completeStaffGangSheetAndOpenNext`) — different product path
- Auto-completing `open`, `full`, `canceled`, `archived`, `completed`, `fully_printed`
- New Cloud Scheduler / scheduled Function / new trigger / new permissions (human checkpoint if ever proposed)
- Production Firestore edits; production Function deploy; production Studio release
- New Portal UI
- Creating branches/worktrees (ADR-FP-137)

---

## Investigation Findings (required amendment return)

### 1. Exact current Upcoming/Past classification source

Authoritative function:

`getShowScheduleTab` in `packages/shared/src/utils/showScheduleGrouping.ts`

Studio re-exports it from `apps/studio/src/renderer/src/features/upcoming-shows/utils/groupShowsByUpcomingPast.ts` without changing the comparison.

Show Queue list grouping:

`UpcomingShowsPage.tsx` → `filterShowsByScheduleTab(surfaceShows, tab, now)` inside `showsByScheduleTab`.

`08-tech-stack-repo-map.md` was **not found** in this checkout (`[NEEDS REPO CHECK]`). Paths below are from current HEAD.

### 2. Exact `scheduledStartAt` comparison and timezone semantics

```ts
scheduledDate.getTime() > now.getTime() ? "upcoming" : "past"
```

| Question | Answer |
|----------|--------|
| Field | `upcomingShows.scheduledStartAt` (Firestore Timestamp) |
| Instant | `scheduledStartAt.toDate().getTime()` vs `now.getTime()` |
| Timezone | Epoch milliseconds. No calendar-timezone conversion. Display labels format that instant in the Studio local zone. |
| Equality | **`scheduledStartAt == now` is Past** |
| Missing schedule | **Upcoming** (`scheduledDate` null) |
| Whatnot import | Import writes `scheduledStartAt`; classification does **not** depend on Whatnot `status` |

Existing tests: `groupShowsByUpcomingPast.test.ts`, `showScheduleGrouping.test.ts`.

### 3. Exact current production status model

`ShowProductionStatus` in `packages/shared/src/types/upcomingShow/upcomingShow.enums.ts`:

| Value | Meaning in current HEAD |
|-------|-------------------------|
| `open` | Not started |
| `full` | Persisted full (capacity display also derives Full live; not required for this defect) |
| `printing` | Production run started. **Paused and running both keep this status.** |
| `fully_printed` | Legacy/compat terminal; Finish writes `completed`, not this |
| `completed` | Finish / Staff Gang Sheet Mark Complete terminal |
| `archived` | Archived |
| `canceled` | Canceled |

Separate from Whatnot `UpcomingShowStatus` (`scheduled` / `live` / `completed` / …).

### 4. Exact status represented by the `PRINTING` badge

`getDerivedShowStatusDisplay` in `packages/shared/src/utils/showCapacityDisplay.ts`:

`productionStatus === "printing"` → label `"PRINTING"`.

Lifecycle states beat the Past overlay. Idle `open`/`full` Past shows display **PAST**; a Printing Past show still displays **PRINTING**. That is why the screenshot can be Past-tab + PRINTING.

### 5. Whether paused production still has that same status

**Yes.** Pause writes:

- `productionStatus` stays `"printing"`
- `activePrintStartedAt` deleted
- `printPausedAt` set
- `accumulatedPrintMs` folded

`isShowPrintTimerPaused`: `productionStatus === "printing" && printPausedAt set && activePrintStartedAt absent`.

This amendment **includes paused Printing**.

### 6. Exact current Finish component → backend path

```text
UpcomingShowsPage.tsx
  "Mark finished" button (hidden when Past)
  → confirmation modal completeConfirmKind === "show_finished"
  → productionTimer.markFinished()
      useShowProductionTimer.ts
      → upcomingShowService.markShowPrintingFinished(user, showId)
          Studio Firestore writeBatch (not a Cloud Function)
          → show productionStatus = "completed"
          → timer fields finalized
          → matching showAllocations status = "done"
          → markPrintRequestCompletedIfFullyPrinted per exact printRequestId
              printRequestService.markPrintRequestCompletedForShowReconciliation
          → Portal printed via existing progress (completed / fully_printed → done)
```

Staff Gang Sheet header **Mark Complete** is a **different** callable path (`completeStaffGangSheetAndOpenNext`). Do not reuse it for Whatnot shows.

### 7. Exact authoritative function

`upcomingShowService.markShowPrintingFinished`

Post-commit request seam: `reconcileShowCompletionWithCommittedVerification` → `markPrintRequestCompletedIfFullyPrinted` → `reconcileCompletedPrintRequest`.

No second Finish implementation for Whatnot shows. Do not add a third.

### 8. Exact allocation reconciliation performed by Finish

Query: `showAllocations` where `upcomingShowId ==` selected show.

Finishable: status in `pending | queued | in_progress`, excluding `canceled`.

Each: `status: "done"`, `completedAt`, `completedBy`, `updatedBy`, `updatedAt`.

Collect `printRequestId` from those rows only.

### 9. Exact Print Request reconciliation performed by Finish

For each unique affected `printRequestId` (not a collection-wide query):

`reconcileCompletedPrintRequest`:

- already `completed`/`archived` → `already_terminal` (no write)
- printed allocation qty (status `printed` or `done`, non-canceled, **all allocations for that request across shows**) < requested qty → `not_eligible` (`not_fully_printed`) — **split requests stay incomplete**
- else write `{ status: "completed", updatedBy, updatedAt }`

Failed vs remediation distinction is preserved.

### 10. Exact timer writes performed by Finish

On the show document:

| Field | Write |
|-------|-------|
| `productionStatus` | `"completed"` |
| `accumulatedPrintMs` | `computeElapsedPrintMs({ accumulated, activePrintStartedAt, now })` |
| `activePrintStartedAt` | `deleteField()` |
| `printPausedAt` | `deleteField()` |
| `printFinishedAt` | `serverTimestamp()` |
| `printFinishedBy` | caller id |
| `updatedBy` / `updatedAt` | caller / server |

Paused Finish uses accumulated only (no active start). Automatic completion later than `scheduledStartAt` uses this **truthful** elapsed — no fabricated duration.

Reload: `isPrinting` false → 1s tick stops; elapsed is frozen `accumulatedPrintMs`.

### 11. Why a Past show can currently remain Printing indefinitely

1. `getShowScheduleTab` is **display grouping only** — comment: never changes `productionStatus`.
2. Finish UI is **hidden** when Past: `canMarkFinished = isPrinting && !isPastScheduledShow`.
3. Pause/Resume also hidden when Past; Start blocked in service via `canStartShowPrinting`.
4. Service Finish itself **does not** block Past — staff simply cannot click it.
5. No load/focus/tick job finalizes Printing.
6. No scheduled Function for show production.
7. Worse: while the selected Printing show is open, the timer 1s tick re-renders the hook; `isPastScheduledShow` becomes true and **Finish disappears at the boundary** while the timer keeps running.

### 12. Lifecycle reconciliation when time passes?

**None** for production status.

Tab list `showsByScheduleTab` useMemo depends only on `surfaceShows`. `now = new Date()` is captured when that memo runs (show snapshot / remount), **not** on a clock. A show can stay listed under Upcoming until the next list refresh even after the boundary.

Selected-show Past flags (`isSelectedShowPast`, timer `isPastScheduledShow`) recompute on render. The printing timer **does** re-render every 1s, so the selected show can be treated as Past (and Finish hidden) without the list moving.

### 13. Lifecycle reconciliation on Studio load/focus?

Load: `useUpcomingShows` one-shot list + optional live doc for the selected show. No production-status repair.

Focus/visibility: **none**.

There is a post-Finish reconstruction effect, but only when status is already `completed` or `fully_printed`.

### 14. Existing server-side scheduled mechanism?

**No reusable show-lifecycle scheduler.**

Existing `onSchedule` jobs:

- `reconcilePortalCatalogAlgoliaIndexScheduled` (catalog search)
- `purgeExpiredAssistedCreationProofsScheduled` (assisted-creation proofs)

Finish is a **Studio client Firestore batch**, allowed by Rules `printing → completed` for staff. There is no Finish callable.

**Do not invent Cloud Scheduler / a new scheduled Function.** Closed-app recovery = next Show Queue load by a permitted staff user.

### 15. Proposed automatic-completion trigger

Studio-only, effect-driven (never inside render):

Shared predicate (must call `isPastScheduledShow` / `getShowScheduleTab`):

```text
show.source === "whatnot"
AND productionStatus === "printing"
AND isPastScheduledShow(show, now)
AND caller canManageUpcomingShows
```

`now` must be the **same clock** used to split Upcoming/Past (see Approach).

Triggers:

1. Show Queue shows list load / reload / selected-show snapshot
2. Schedule clock tick (1s while any loaded Whatnot show is `printing`; otherwise on visibility/focus)
3. `document.visibilitychange` / window `focus`

In-flight map per show id so ticks do not start duplicate Finish calls.

Action: `upcomingShowService.markShowPrintingFinished` only.

### 16. Behavior when Studio is closed at the transition

Nothing runs while closed. On next Show Queue load (or focus into an already-mounted queue), predicate matches → Finish runs. Staff does not need to click Finish for the happy path.

If Finish fails, status stays Printing; error is visible; **Mark Complete** remains.

### 17. Exact manual Mark Complete UI location

Same production-timer action row as **Mark finished** (`UpcomingShowsPage.tsx` timer card), not a new architecture.

- Upcoming + Printing: keep **Mark finished** (existing)
- Past + Printing: show **Mark Complete** (same `markFinished()` / same confirmation modal)
- Relabel confirmation primary to **Mark Complete** when Past

Do **not** use Staff Gang Sheet header **Mark Complete**.

### 18. Exact permission gate

Same as Finish: `permissionService.canManageUpcomingShows` (active staff). Service already checks this. Auto-complete uses the same logged-in user.

### 19. How Mark Complete reuses Finish

`canMarkFinished` becomes: `isPrinting` (drop `!isPastScheduledShow` for Finish only; keep Past blocks on Start/Pause/Resume).

Both labels call `productionTimer.markFinished()` → `markShowPrintingFinished`. No second completion writer.

### 20. Idempotency / race strategy

Today Finish **throws** if `productionStatus !== "printing"`. Unsafe for auto/retry.

Harden **inside** `markShowPrintingFinished` (not a client flag):

1. Re-read show.
2. If `completed` or `fully_printed`: skip show/allocation writes; optionally reconstruct request reconciliation for this show's exact request ids; return success.
3. If not `printing`: do **not** complete; return/throw without mutation (`open`/`full`/`canceled`/`archived`).
4. If `printing`: existing batch.
5. Prefer a transaction (or equivalent compare) so a second writer that lost the race **skips** timer/allocation writes instead of overwriting `printFinishedAt` / `accumulatedPrintMs`. Rules allow `completed → completed` same-status updates; the client must not rely on Rules to stop duplicate timer writes.
6. Request reconciliation already no-ops `already_terminal`.

Concurrent auto + Mark Complete: one mutating Finish, the other no-op success.

### 21. Exact failure / retry behavior

- Show batch failure: leave Printing; `actionError`; do not show Finished/COMPLETED.
- Show committed, request reconciliation partial: existing warning + Retry (`retryShowCompletionReconciliation`). Auto-complete must surface that, not claim full success.
- Invalid allocations: existing throw; Mark Complete stays.
- Zero finishable allocations: existing throw today; keep it (visible failure, retry/remediation). Do not complete the show by status patch alone.

### 22. Exact files overlapping the sizing fix

| File | Sizing plan | Amendment 1 |
|------|-------------|-------------|
| `apps/studio/.../upcomingShowService.ts` | `allocatePrintRequestItem` assess | `markShowPrintingFinished` idempotency + auto callers |
| `apps/studio/.../useExportShowZip.ts` | dimension fallback | **none** |
| `apps/studio/.../useExportGangSheetPng.ts` | dimension fallback | **none** |
| `apps/studio/.../useGangSheetBuilder.ts` | placement inches | **none** |
| `functions/src/queuePortalPrintRequestToShow.ts` | size validation | **none** |
| Shared sizing utils / Portal cards | sizing | **none** |

Same-file overlap is **only** `upcomingShowService.ts`, different methods. Implement sizing allocate changes first, re-read the file, then Finish/idempotency. Do not revert sizing.

`UpcomingShowsPage.tsx` is Amendment 1 UI/clock; sizing plan did not list it as a required edit.

### 23. Exact additional files to change

Expected (adjust at Implement if names shift; re-read HEAD/working tree first):

- `packages/shared/src/utils/showScheduleGrouping.ts` — optional exported predicate `isStalePastPrintingShow`; **do not change** the Past comparison
- `packages/shared/src/utils/showScheduleGrouping.test.ts`
- `apps/studio/.../pages/UpcomingShowsPage.tsx` — shared `now`, Mark Complete, wire reconciliation
- `apps/studio/.../hooks/useShowProductionTimer.ts` — Finish available when Past + Printing; invoke auto-complete from shared now
- New hook e.g. `useStalePastPrintingShowReconciliation.ts` (page/hook layer, calls service)
- `apps/studio/.../services/upcomingShowService.ts` — idempotent Finish
- Tests listed below
- `docs/project/DECISIONS.md` — ADR-FP-139 during Implement
- `docs/architecture/DATA_MODEL.md` / Show Queue workflow notes only as needed for the durable rule
- Workflow state / CURRENT-STATE

### 24. Exact tests to add/change

| Case | Expected |
|------|----------|
| Upcoming + Printing | no auto-complete |
| Exact boundary (`scheduledStartAt == now`) | Past + trigger (equality is Past) |
| Past + Printing | Finish path; timer stop; `completed`; allocations `done`; exact requests reconcile |
| Studio opened after transition | load/reconcilation catches stale Printing |
| Past + already completed | no extra mutation / no error |
| Past + `open` | no auto-complete |
| Past + canceled/archived | no auto-complete |
| Manual Mark Complete | confirmation; same Finish path |
| Auto + manual race | idempotent; no duplicate terminal corruption |
| Repeated refresh | stable no-op |
| Multiple allocations / multiple requests | only that show's rows; exact request ids |
| Split request | `not_fully_printed` if other shows still need qty |
| Failure/retry | not falsely completed; Mark Complete remains; retry safe |
| Running + paused timers | truthful Finish fold; no endless tick after terminal |
| Staff gang sheet Printing | **not** auto-completed by this predicate |

Reuse `showFinishReconciliationRecheck.test.ts` / `postFinishCommittedVerification.test.ts` patterns. Do not duplicate Finish writers in tests.

### 25. Function deployment required?

**Not for this amendment.** Finish is Studio Firestore.

Parent sizing goal still needs DEV Function deploy later for `queuePortalPrintRequestToShow` — separate checkpoint, unchanged by this amendment.

### 26. New scheduler / trigger required?

**No.** Explicitly rejected unless the owner later asks for closed-app completion with Studio never opened.

### 27. Rules / index / schema change required?

**Not expected.**

Rules already allow staff `printing → completed` and same-status no-ops. Allocation `done` writes already used by Finish.

**STOP** if Implement discovers a Rules/index/schema gap.

### 28. Amendment Plan artifact path

`docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md`

### 29. Amendment Formal Review artifact path

`docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-review.md`

### 30. Formal Review verdict

See Amendment 1 review (written in the same Plan → Review pass).

### 31. Human checkpoints

| Checkpoint | When |
|------------|------|
| Owner approval of **combined** sizing + Amendment 1 Plan/Review | **Now — STOP before Implement** |
| Combined Implement | After owner continues |
| DEV Studio QA (this amendment + sizing) | After automated tests |
| DEV Function deploy | Sizing callable only; not this amendment |
| Production Studio release | Separate |
| Production Function deploy | Sizing only, separate |
| Production data repair of the live stuck show | **Not during this goal.** After Studio rollout, Mark Complete or auto-reconcilation. **No console/Firestore edit in Plan/Review/Implement/Test.** |
| New scheduled Function / Cloud Scheduler | **STOP; owner approval required.** Not in this plan. |

---

## Past tab transition trace

```text
upcomingShows.scheduledStartAt (Timestamp)
  → Timestamp.toDate() epoch ms
  → getShowScheduleTab(show, now)
  → UpcomingShowsPage showsByScheduleTab (recomputed when surfaceShows changes, not on a clock today)
  → visibleShows[activeScheduleTab]
  → selected show detail
  → useShowProductionTimer: 1s tick while printing && !paused
```

Classification is **client-side filtering** of the already-loaded list. Not a Firestore field. Not Whatnot status. Not a Cloud Function. Recalculated on list memo / render; selected Printing show also re-evaluates Past every timer tick.

Amendment adds one shared Studio `now` so list tab, selected-show Past, auto-complete, and Mark Complete **cannot disagree**.

---

## Approach

1. **Do not implement until owner approves this amendment review.**
2. At Implement start, re-read overlapping files from the working tree (sizing may land first in the same session).
3. **Implementation order (single coherent pass):**
   1. Shared sizing policy + tests (parent plan)
   2. Persistence/queue barriers (parent)
   3. Studio allocate + Portal callable validation (parent; `upcomingShowService.allocate*` first)
   4. Export/gang fail-closed (parent)
   5. **Then** Finish idempotency in `markShowPrintingFinished`
   6. Shared `now` + auto-reconciliation hook + Mark Complete UI
4. Extract `isStalePastPrintingWhatnotShow(show, now)` next to `getShowScheduleTab`. Comparison function stays one.
5. Drive Upcoming/Past filtering from a clock `now` owned by Show Queue (1s while any loaded Whatnot show is `printing`; visibility/focus otherwise).
6. Hook: Component → Hook → `markShowPrintingFinished`. No Firebase in the page.
7. Auto-complete all matching loaded Whatnot shows (not only the selected one), serialized per id.
8. Keep Start/Pause/Resume blocked for Past.
9. Failure stays Printing; reuse existing actionError / Retry.
10. Docs: ADR-FP-139 + short DATA_MODEL/workflow note. Do not rewrite historical Show Queue records.

---

## Affected Areas

### Files / Modules (expected)

See findings 22–23.

### Architecture Impact

- [x] Details: Studio Component → Hook → Service → Firestore. Completion remains the existing Finish batch. No UI Firebase. No new Finish clone.

### Security Impact

- [x] Details: Same staff `canManageUpcomingShows` gate. Exact-show allocation query; exact request ids. No new public endpoints. Auto-complete must not run for anonymous/non-staff.

### Data Model Impact

- [x] Details: No new fields. No new enum values. Uses existing `printing` → `completed` and allocation `done`. Document the Past + Printing auto-Finish rule.

### Backend Impact

- [x] Details: No Function/scheduler/Rules/index change expected. Finish stays Studio-authored.

### UI / UX Impact

- [x] Details: Past + Printing exposes **Mark Complete** with existing Finish confirmation. Upcoming Finish label unchanged. Timer stops after real completion. Manual QA required.

### Migration Impact

- [x] None. Existing stuck production show is repaired after Studio rollout via product behavior, not a backfill.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck` | yes |
| Lint | `npm run lint` | yes |
| Unit tests | `npm test` (focused files + full suite before signoff) | yes |
| Build | `npm run build` / Studio build as documented in TESTING.md | yes if Studio surface changed |
| Integration | none new | no |
| E2E | none new | no |
| Backend/rules | existing Studio timer rules tests if Finish transaction shape changes | yes if write shape changes |

### Manual

See **Manual owner QA** below. DEV fixtures only.

---

## Human Checkpoints Anticipated

- [x] Owner approval before combined Implement (**this STOP**)
- [x] Manual UI/QA after Implement
- [x] Production Studio deploy (later)
- [x] Production data repair only via product after rollout
- [ ] Design approval — not a visual redesign
- [ ] Database migration — none
- [ ] Auth / secrets — none
- [x] Other: never deploy a new scheduler without a new owner checkpoint

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Auto-complete races with Mark Complete / second client | High | Idempotent Finish; skip writes if not `printing` |
| Completing the wrong requests | High | Keep exact `upcomingShowId` allocation query |
| Split-request over-complete | High | Keep `reconcileCompletedPrintRequest` qty rule |
| Completing Staff Gang Sheets | Medium | Predicate requires `source === "whatnot"` |
| Completing Past `open` shows | Medium | Predicate requires `printing` only |
| Fabricated timer duration | Medium | Reuse Finish fold; no backdated `scheduledStartAt` |
| Silent failure marked Completed | High | Fail closed; keep Printing; surface error |
| Sizing and Finish edits collide in `upcomingShowService.ts` | Medium | Ordered Implement; re-read file |
| Studio-only recovery if nobody opens Show Queue | Accepted | Documented; scheduler is out of scope |
| Production stuck show edited during development | High | Forbidden |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the Studio Show Queue / Finish-idempotency commits on `development`. No schema to roll back. A show already correctly Finished stays Finished (safe). Do not reverse production completions.

---

## Documentation Updates Required

- [ ] DECISIONS.md — **ADR-FP-139** during Implement
- [ ] DATA_MODEL.md — one paragraph on Past + Printing → Finish
- [ ] WORKFLOWS.md — only if the current Finish summary needs the auto/manual recovery sentence
- [ ] CURRENT-STATE.md / workflow state
- [ ] Parent plan/review already cross-linked
- [ ] Do not rewrite unrelated historical Show Queue docs

---

## Manual owner QA

DEV only. Do not create unsafe production fixtures. Do not mutate the live stuck show during this goal.

### Automatic path

1. DEV Whatnot show whose scheduled time can cross during QA.
2. Start production so it shows PRINTING.
3. Leave Studio Show Queue open.
4. Cross the Upcoming → Past boundary (`scheduledStartAt <= now`).
5. Confirm it moves to Past.
6. Confirm it automatically leaves Printing (status `completed`, badge not PRINTING).
7. Confirm timer stops.
8. Confirm allocations `done`.
9. Confirm attached requests reconcile (Printed when fully allocated).
10. Confirm Portal shows the same Printed/progress state as a normal Finish.

### Closed-app recovery

1. Another DEV show; start printing.
2. Close Studio before the boundary.
3. Wait until Past.
4. Reopen Studio → Show Queue.
5. Confirm stale Past + Printing is detected and Finished without a staff click.

### Manual recovery

1. DEV fixture that is Past + Printing with auto-reconciliation suppressed, or a failure leftover.
2. Confirm **Mark Complete** is visible.
3. Confirm it.
4. Same terminal outcome as Finish.
5. Reload Studio; state persists.
6. Confirm Portal.

---

## Open Questions

- [x] None blocking planning. Closed-app-without-ever-opening-Studio is an accepted limitation unless the owner later requests a scheduler.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-review.md`
- Verdict: **approved** (owner must still explicitly continue before Implement)
