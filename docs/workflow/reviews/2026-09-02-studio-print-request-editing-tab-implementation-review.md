# Implementation Review: Studio Print Request Editing tab (+ Internal Printed group order)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-02-studio-print-request-editing-tab-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-test-report.md` |
| Verdict | **approved** |

---

## Summary

Implementation matches the approved amended plan: shared derive now emits `editing`; Portal adapter folds it to Working; Studio Customer/Internal tab lists and counts include Editing; Rules allowlist updated; Internal→Printed uses shared History sort; CSS keeps lifecycle tabs on one line. Tests 107/107 on focused suite; Functions build PASS. **No deploy or backfill executed.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope locked | pass | Editing + Internal Printed sort only |
| Authoritative derive | pass | printed→printing→queued→editing→working |
| Portal adapter | pass | `toPortalPrintRequestListTab` |
| Rules additive only | pass | `editing` on queueTab helpers |
| Sort root cause fixed | pass | `sectionOrder: staff_gang_sheet_history` for Internal+Printed |
| History helper reused | pass | `staffGangSheetHistorySort` shared |
| Tests | pass | 107/107 focused |
| Deploy gated | pass | Checkpoint below |

---

## DEV deploy / reconciliation checkpoint (STOP — not authorized yet)

### Exact DEV Functions to deploy

Redeploy consumers that compile in `computePrintRequestQueueTab` / `recomputeAndPersistQueueTab` (shared derive change):

```text
onPrintRequestItemQueueTabInputWritten
onShowAllocationQueueTabInputWritten
onPrintRequestStatusQueueTabInputWritten
syncPrintRequestQueueTab
backfillPrintRequestQueueTab
unqueuePortalPrintRequestFromShow
```

Plus any other already-deployed callables that embed `recomputeAndPersistQueueTab` and will run against DEV after this SHA (recommended bundle for safety):

```text
previewShowProductionRecovery / applyShowProductionRecovery (and requeue siblings if separate)
previewShowQueueMove / applyShowQueueMove
completeStaffGangSheetAndOpenNext (if it finishes sheets and recomputes tabs)
```

**Suggested minimal DEV command (owner-authorized later):**

```bash
firebase deploy --only functions:onPrintRequestItemQueueTabInputWritten,functions:onShowAllocationQueueTabInputWritten,functions:onPrintRequestStatusQueueTabInputWritten,functions:syncPrintRequestQueueTab,functions:backfillPrintRequestQueueTab,functions:unqueuePortalPrintRequestFromShow --project fresh-prints-dev
```

Confirm exact export names in `functions` index before running.

### Exact Firestore Rules change

`firestore.rules`:

- `isValidPrintRequestQueueTab` → includes `"editing"`
- `isOptionalPrintRequestListTab` → includes `"editing"`

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Production Rules **NOT AUTHORIZED**.

### DEV reconciliation tool / command

Existing owner-only DEV console bridge (after Studio points at post-deploy Functions):

```js
await window.freshPrintsDev.backfillPrintRequestQueueTab({
  dryRun: true,
  confirmationPhrase: "BACKFILL QUEUE TAB",
  pageLimit: 400,
})
```

Then, if dry-run `updated` count looks right, repeat with `dryRun: false`, paging via `nextStartAfterRequestId` until `hasMore === false`.

**Scope:** all `printRequests` pages on `fresh-prints-dev`; recomputes each doc’s `queueTab` from items+allocations+status. Idempotent for already-correct docs (`alreadyCorrect`). Documents with `status === "editing"` and stale `queueTab === "working"` become `"editing"`.

**Dry-run:** supported (`updated` = would-write count; no writes).

**Rollback:** re-run backfill after reverting derive (or force `syncPrintRequestQueueTab` per id); no destructive deletes.

### Indexes

**None new.**

### Migration / recompute scope

DEV only. Production backfill **NOT AUTHORIZED** — inventory for later coordinated promotion.

### Restart scope

Studio renderer reload after code pull. No Electron rebuild required for this CSS/logic change in DEV `npm run dev:studio`.

---

## Verdict Rationale

**approved** for Implement+Test. Proceed only after owner authorizes DEV Functions + Rules deploy, then dry-run backfill, then apply backfill, then Owner QA.

---

## Next Step

**STOP** — await owner authorization for DEV deploy/reconcile. Do not sign off, commit, or start lightbox goal.
