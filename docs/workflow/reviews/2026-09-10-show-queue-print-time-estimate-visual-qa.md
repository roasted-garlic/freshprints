# Human Checkpoint: Show Queue print-time estimate visual QA

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Workflow | managed-phase / Test / show-queue-print-time-estimate |
| Reason | Owner visual QA for Est. print time glance pill |
| Status | **pending** → **resolved** |
| Resolution | Owner visual QA **PASS**; commit/push authorized for print-time polish only |

---

## What We Need From You

Confirm the **Est. print time** glance pill looks correct on Show Queue and Internal Sheets.

---

## Context

Implementation complete. Formula: Standard (efficiency) feed inches (including label band) × 8 seconds, inches rounded up, shown as e.g. `16m 8s · 121 in (10.08 ft)`. Automated unit tests passed.

Plan: `docs/workflow/plans/2026-09-10-show-queue-print-time-estimate-plan.md`

---

## Manual Test Required

**Feature / area:** Studio Show Queue / Internal Sheet — Est. print time

**Environment:** local Studio (DEV)

**Prerequisites:**
- Local Studio running against a show/sheet with queued allocations
- Or an empty/canceled-only show to verify `—`

### Steps
1. Whatnot Show Queue → select a show with allocations → **Expected:** Status pills on the left; **Est. print time** right-aligned like `Xm Ys · N in (X.XX ft)` (inches rounded up; includes label band). Not in the glance stats grid.
2. Internal Sheets → same → **Expected:** same placement/format on the status pill row.
3. Empty or canceled-only show → **Expected:** Est. print time shows `—` (still right-aligned on that row).
4. Optional: Generate Standard gang sheet and compare total length — estimate should be at or slightly above export inches.

### Pass criteria
- [x] Est. print time is on the status pill row (not in glance stats)
- [x] Right-aligned on that row
- [x] Format is duration · inches (ft)
- [x] Empty/canceled-only shows `—`

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** PASS

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint doc, answer clarifying questions

**Forbidden:** Commit/push until owner PASS (if requested); deploy; expand scope

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-09-10 | PASS; commit and push just these changes | yes | Signoff approved; commit/push polish only |
