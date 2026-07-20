# Manual QA: Portal request detail — newest-first (match cart)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Workflow | managed-phase / test / detail newest-first match cart |
| Reason | UI order + duplicate adjacency + resize stability |
| Status | **resolved** |
| Resolution | **PASS** — owner 2026-07-19 (“PASS on everything”); closed with duplicate-preparing signoff |

---

## What We Need From You

Confirm request **detail** and **cart** share newest-first order, duplicate still lands to the **right** of the source, and resize/qty does not reshuffle.

---

## Context

Portal detail now uses the same newest-first sort as the cart. Duplicate uses insert-before math so “to the right” still holds under reversed display. Function redeployed to fresh-prints-dev.

---

## Manual Test Checkpoint

**Feature / area:** Portal print request detail + cart order  
**Why automated tests are insufficient:** Visual layout / adjacency  
**Environment:** local Portal + fresh-prints-dev Functions  
**Prerequisites:** Soft-reload Portal; signed-in customer

### Steps
1. Clear Current Request if needed → add designs **A**, then **B**, then **C** → open cart → **Expected:** top→bottom **C**, **B**, **A**.
2. Open the same request’s **detail** page → **Expected:** left→right (or first→last) **C**, **B**, **A** — same relative order as cart.
3. Duplicate **B** on detail → **Expected:** copy appears immediately to the **right** of **B** (not left / not at far end only).
4. Change qty or resize on an item → **Expected:** that item stays in the same position; neighbors do not jump.

### Pass criteria
- [x] Detail matches cart newest-first order
- [x] Duplicate lands to the right of source
- [x] Resize/qty does not reshuffle order

### Result

**PASS** (owner, 2026-07-19)

### Please reply with
- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
