# Implementation Review — Taxonomy trigger rebuild corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Implementation Review (independent of Implement) |
| Plan | `docs/workflow/plans/2026-08-07-taxonomy-trigger-rebuild-corrective-plan.md` |
| Formal Review | `approved_with_changes` (RC-R1–RC-R8) |
| Test report | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-test-report.md` |
| Verdict | **APPROVED** |

---

## Summary

Option A awaited coalesce is implemented cleanly in `taxonomyTriggerCoalesce.ts` and wired with explicit `await awaitTaxonomySourceRebuild(...)` in both triggers. Detached `scheduleCoalescedRebuild` / post-return rebuild is gone. Focused unit tests prove single-write, coalesce, mid-rebuild trailing, failure reset, and containment. `rebuildTaxonomyMaterialization.ts` was not modified (RC-R4). Future deploy remains the two trigger Functions only.

---

## Challenge answers

### 1. Can either trigger return before rebuild completion?

**No (source).** Both handlers `await awaitTaxonomySourceRebuild(...)`. Containment asserts those awaits. Rebuild runs inside the shared Promise the handler awaits.

### 2. Can a write arriving mid-rebuild be dropped?

**No (tested).** Dirty flag during rebuild forces another pass before settle; test C expects two rebuilds; waiters resolve after the trailing pass.

### 3. Can a joiner resolve before its dirty trailing pass finishes?

**No (design + test C).** Joiners await the same `inFlight`; owner loop continues while `dirty`; post-await `if (dirty)` re-entry covers the settle race.

### 4. Can a rejected Promise poison future cycles?

**No (tested).** Failure clears `dirty`, `finally` clears `inFlight`; test E retries successfully.

### 5. Is Option A unnecessarily complex?

**No.** Helper is ~120 lines including types/telemetry; core state is three locals + one loop. Within RC-R5 budget; no need to fall back to B.

### 6. Should Implement have fallen back to Option B?

**No.** Trailing/join invariants are unit-proven.

### 7. Was any CAS/fleet-lock work introduced?

**No.** `rebuildTaxonomyMaterialization.ts` untouched.

### 8. Did rebuild fence behavior change?

**No.** Still chunks → meta inside unchanged rebuild helper.

### 9. Did scope expand into Studio/Rules/Algolia/Storage?

**No.** Only Functions taxonomy trigger/coalesce + tests + BACKEND/ADR note.

### 10. Is future deploy limited to the two triggers?

**Yes.** Only `onTaxonomySourceWritten.ts` (+ new coalesce module bundled into those exports) changed for runtime. Callable source path unchanged; do **not** redeploy callable unless owner expands allowlist.

---

## RC-R1–RC-R8 checklist

| RC | Status |
|----|--------|
| RC-R1 await + containment | **PASS** |
| RC-R2 trailing before settle | **PASS** |
| RC-R3 failure reset | **PASS** |
| RC-R4 no CAS | **PASS** |
| RC-R5 A retained | **PASS** |
| RC-R6 server vs Studio re-QA split | Documented (not run this pass) |
| RC-R7 failure telemetry | **PASS** (`taxonomy-materialization-rebuild-failure`) |
| RC-R8 test seam | **PASS** (`createTaxonomyTriggerCoalesce`) |

---

## Residual (accepted)

Cross-instance duplicate rebuild / last-writer corpus race unchanged — no fleet lock (per plan).

---

## Verdict

**APPROVED** for source Implement + Test.

**Does not authorize:** Functions deploy, taxonomy mutation, alias removal, Studio refresh QA, production, or PR merge.

**Next owner phrase:** `APPROVE DEV TAXONOMY TRIGGER REBUILD CORRECTIVE DEPLOY`
