# Plan: Studio Print Request Editing lifecycle tab (+ Internal Printed group order)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Amended | 2026-09-02 (owner decisions 1–6 + Internal Printed group-order amendment) |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal | `studio-print-request-editing-tab` |
| Baseline | `development @ e985c95888b4002688eaf4d781d57c43258f0262` |
| Related | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-review.md` |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| `show-queue-batch-allocation-performance` | **DEFERRED** |

---

## Goal

1. Add an **Editing** Studio `/print-requests` lifecycle tab using the existing persisted `status === "editing"` and extending the `queueTab` mirror to `"editing"`.
2. Fix **Internal Requests → Printed** Internal Gang Sheet **group** ordering to newest-first, reusing the dedicated History sort contract.

---

## Owner decisions recorded (2026-09-02)

| # | Decision | Status |
|---|----------|--------|
| 1 | Extend `queueTab` mirror with `"editing"` (no new field) | **APPROVED** |
| 2 | Firestore Rules `isValidPrintRequestQueueTab` includes `"editing"` | **APPROVED** (DEV deploy later; prod NOT AUTHORIZED) |
| 3 | DEV Functions redeploy of existing queueTab recompute consumers | **APPROVED** (list at deploy checkpoint; prod NOT AUTHORIZED) |
| 4 | DEV reconcile via existing backfill/recompute tooling | **APPROVED** (run only after Implement/Test/Impl Review + owner auth at checkpoint) |
| 5 | Portal exposes Editing tab (same derive); ADR-FP-071 Continuable unchanged | **APPROVED** (amended 2026-09-02 — owner reversed “fold into Working”) |
| 6 | Internal Requests expose Editing tab: Working \| Editing \| Queued \| Printed | **APPROVED** |

---

## Scope

### In Scope

**A. Editing tab**

- Shared `derivePrintRequestListTab`: after allocation-driven tabs, `status === "editing"` → `"editing"`, else `"working"`.
- Studio tabs/counts/routes/helpers/CSS (one-line lifecycle row).
- Portal `/requests` lifecycle tabs including **Editing** (same derive; ADR-FP-071 Continuable unchanged).
- Rules allowlist `"editing"`; Functions inherit shared recompute (no new callable).
- Docs + tests; DEV reconcile checkpoint (do not auto-run).

**B. Internal Printed group order (amendment)**

- Print Requests → Internal → Printed section sort: newest Internal Gang Sheet group first.
- Reuse History contract: `printFinishedAt` DESC → missing finish last → `staffGangSheetCycleNumber` DESC → `id` tie-break.
- Preserve per-request order within groups (`updatedAt` DESC as today).
- Do **not** change Upcoming Shows ASC, Past Shows DESC, or History behavior beyond shared-helper extraction if needed.
- Do **not** change Customer request grouping sort.

### Out of Scope

- New Firestore field / new status value
- ADR-FP-071 Continuable / one-working-request rule changes
- New transition buttons / Show Queue behavior
- Lightbox Previous/Next (next separate goal)
- Production deploy / production backfill
- Smart Profiling; batch-allocation performance

---

## Audit — Internal Printed group sort (exact)

| Item | Finding |
|------|---------|
| Group builder | `packages/shared/src/utils/groupPrintRequestsByShow.ts` → `groupPrintRequestsByShow` |
| Called from | `PrintRequestsPage.tsx` `visibleRequestSections` (all kinds/tabs) |
| Current section sort | `scheduledStartAt` **ASC**; Unassigned last; tie → `sectionKey.localeCompare` |
| Per-request order | `updatedAt` DESC (preserve) |
| Why #4 above #5 | Unscheduled Internal sheets lack `scheduledStartAt` → both get `+Infinity` → **ID string compare**, **not** cycle/`printFinishedAt`. Cycle ASC is **not** used here; wrong order is schedule-ASC / ID fallback. |
| History helper | `sortStaffGangSheetHistoryForDisplay` in `apps/studio/.../upcomingShowListSort.ts` — correct contract already exists |
| Shows hydrated? | Yes — `showsById` from `upcomingShowService` includes `printFinishedAt`, `staffGangSheetCycleNumber` |
| Invent timestamp? | **No** |

### Proposed sort wiring

- Extract shared comparator (same semantics as History) into `packages/shared` (or export compare from a shared util History already can call).
- Add `sectionOrder: "scheduled_start_asc" | "staff_gang_sheet_history"` to `groupPrintRequestsByShow` (default remains `scheduled_start_asc`).
- `PrintRequestsPage` passes `staff_gang_sheet_history` **only** when `kind === "internal" && tab === "printed"`.
- History list continues to use the same comparator (thin wrapper).

No `[NEEDS OWNER DECISION]` on recency — `printFinishedAt` + cycle DESC matches owner preferred contract and existing History goal.

---

## Authoritative Studio lifecycle

```
printed → printing → queued → editing → working
```

Allocation states override `status === "editing"`. Mutual exclusivity via one resolver.

Customer tabs: Working \| Editing \| Queued \| Printing \| Printed  
Internal tabs: Working \| Editing \| Queued \| Printed  

---

## Approach (implementation order)

1. Shared derive + Portal adapter + tests  
2. Studio routes / counts / page labels / helper copy / CSS nowrap  
3. Rules allowlist  
4. Internal Printed `sectionOrder` + shared History comparator reuse + tests  
5. Docs (DATA_MODEL, ADR, ROADMAP)  
6. Test phase → Implementation Review → **STOP** at DEV deploy/reconcile checkpoint  

### DEV reconciliation (checkpoint only — do not run in Implement)

Prefer existing `backfillPrintRequestQueueTab` (owner-only, `fresh-prints-dev`-only, dryRun, confirmation phrase `BACKFILL QUEUE TAB`, Studio console `window.freshPrintsDev.backfillPrintRequestQueueTab`). After derive change, recomputing all pages updates `status=editing` mirrors from `working` → `editing` idempotently. Exact command/scope reported at checkpoint.

---

## CSS

- `.print-requests-tab-bar`: `flex-wrap: nowrap; overflow-x: auto;`
- `.print-requests-tab-button`: `white-space: nowrap;` + modest padding/gap reduction
- No fixed per-tab widths; no awkward font shrink

---

## Test Strategy

Editing tests 1–15, layout 16–21, IGS sort 22–32 per owner brief. Automated unit + Studio/Portal typecheck + Functions build. Owner QA after DEV deploy/reconcile.

---

## Human Checkpoints

- [x] Owner decisions 1–6 recorded  
- [ ] DEV Functions + Rules deploy authorization  
- [ ] DEV backfill dry-run then apply authorization  
- [ ] Owner QA (Editing + Internal group order)  
- [ ] Production — **NOT AUTHORIZED**

---

## Risks

| Risk | Mitigation |
|------|------------|
| Stale mirrors until backfill | Checkpoint gate; dry-run first |
| Portal breaks without adapter | Adapter maps editing → Working; Portal tsc |
| Accidental Customer group sort change | Default `scheduled_start_asc`; history mode only Internal+Printed |
| History/Print Requests sort drift | Single shared comparator |

---

## Rollback

Revert derive/tabs/CSS/sort option/Rules; redeploy Functions; re-run backfill to restore mirrors if needed.

---

## Open Questions

- [x] None blocking Implement after owner decisions + sort audit

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-review.md`
- Verdict: pending amendment
