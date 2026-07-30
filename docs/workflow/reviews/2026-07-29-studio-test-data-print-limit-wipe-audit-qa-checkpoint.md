# Studio Test Data legacy print-limit counter cleanup — Owner QA Checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Workflow | managed-phase / `studio-test-data-print-limit-wipe-audit` |
| Reason | Non-destructive owner UI verification |
| Status | **resolved — PASS** |
| Resolution | Owner PASS, 2026-07-29 |

---

## What We Need From You

Confirm that Studio now presents the retired Cap A documents as optional legacy cleanup and that the
existing preset selection behavior remains intact.

## Context

Formal Review is `approved`; Implementation Review 19 is `APPROVED`; focused tests pass 28/28.
The stable `printRequestDesignDailyLimits` target and its exact backend expansion are unchanged.
No deployment is required.

## Manual Test Required

**Feature / area:** Studio → Test Data Reset  
**Environment:** development Studio connected to `fresh-prints-dev`  

**Prerequisites:**

- Sign in as an owner.
- Fully reload Studio so the current renderer source is active.
- Do not submit any wipe.

### Steps

1. Open **Test Data Reset**.
   - **Expected:** the preset button and target label both say **Legacy print-limit counters**.
2. Expand that target.
   - **Expected:** the copy says the counters are legacy and no longer written or enforced.
   - **Expected:** it says deletion does not change current limit `L`, customer room, or show
     capacity, and keeps print requests/items.
3. Select the **Legacy print-limit counters** preset.
   - **Expected:** only that target is checked.
4. Select **Print Requests**, then **All (-) Designs**.
   - **Expected:** each selection includes **Legacy print-limit counters**.
5. With the legacy-only preset selected, click **Wipe selected…**.
   - **Expected:** the typed `WIPE TEST DATA` confirmation dialog appears.
6. Cancel/close the dialog.
   - **Expected:** no wipe runs and no data is deleted.

### Pass criteria

- [x] New label appears on the preset and target.
- [x] Copy clearly describes obsolete, unenforced cleanup.
- [x] Copy does not promise restored customer allowance.
- [x] Legacy-only preset selects only the legacy target.
- [x] Print Requests and All (-) Designs include the legacy target.
- [x] Confirmation appears and is canceled without submitting a wipe.

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS**

## Impact If Delayed

Final signoff is paused. No deployment, production action, or later queued goal may begin.

## Agent Actions While Paused

**Allowed:** record the owner result and answer questions.

**Forbidden:** submit a wipe, implement further changes, deploy, touch production, sign off, or
start `preproduction-static-analysis-cleanup`.
