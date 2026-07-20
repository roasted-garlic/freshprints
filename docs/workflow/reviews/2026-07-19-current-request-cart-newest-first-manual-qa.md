# Manual QA: Current Request cart — newest added at top

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Workflow | managed-phase / test / Current Request cart newest-first |
| Reason | UI order verification after sequential Add to Request |
| Status | **resolved** |
| Resolution | **PASS** — owner 2026-07-19 (“PASS on everything”); closed with duplicate-preparing signoff |

---

## What We Need From You

Confirm the Current Request cart lists designs last-added → first-added, top → bottom.

---

## Context

Cart previously followed ascending `sortOrder` (oldest at top). Drawer now presents groups newest-first. Detail-page order later aligned in the same batch.

Plan: docs/workflow/plans/2026-07-19-current-request-cart-newest-first-plan.md

---

## Manual Test Checkpoint

**Feature / area:** Portal Current Request cart drawer order  
**Why automated tests are insufficient:** Visual/sequential add UX  
**Environment:** local Portal (e.g. :3100)  
**Prerequisites:** Soft-reload Portal after this change; signed-in customer; empty or clearable Current Request

### Steps
1. Soft-reload Portal → open catalog → clear Current Request if needed → **Expected:** empty cart / ready to add.
2. Add design **A**, then **B**, then **C** (three different designs) → open Current Request cart → **Expected:** top→bottom **C**, **B**, **A**.
3. Add a fourth design **D** → reopen/refresh cart → **Expected:** **D** at top, then C, B, A.
4. (Optional) On request detail, duplicate an item → **Expected:** copy still appears to the **right** of the source on the detail grid (not part of cart reverse).

### Pass criteria
- [x] Cart shows last added at top through first added at bottom
- [x] Detail duplicate insert-right still works (if checked)

### Result

**PASS** (owner, 2026-07-19)

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
