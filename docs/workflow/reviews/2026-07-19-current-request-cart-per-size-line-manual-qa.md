# Manual QA: Current Request cart — one line per size (+ newest-first recheck)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Workflow | managed-phase / test / cart per-size lines |
| Reason | Owner PASS WITH NOTES: cart must show each size as its own line |
| Status | **resolved** |
| Resolution | **PASS** — owner 2026-07-19 (“PASS on everything”); closed with duplicate-preparing signoff |

---

## Prior result

Newest-first detail + cart + duplicate-right + resize-stable: **PASS** (owner 2026-07-19), with note that cart must not collapse sizes — addressed and re-confirmed **PASS**.

---

## What We Need From You

Confirm the cart lists each size as its own row with dimensions · Qty (e.g. `3.5 x 3.89 · Qty 2`).

---

## Manual Test Checkpoint

**Feature / area:** Current Request cart per-size rows  
**Environment:** local Portal  
**Prerequisites:** Soft-reload Portal

### Steps
1. Soft-reload → add the same design twice at **different sizes** (or duplicate and resize one) → open cart → **Expected:** two separate rows for that design, each showing its size · qty (not `2 Sizes · Qty …`).
2. Trash one row → **Expected:** only that size is removed; the other size remains.
3. Spot-check newest-first still holds (last added size at top).

### Pass criteria
- [x] Each size is its own cart line with `W x H · Qty N`
- [x] Remove is per line
- [x] Newest-first order still looks correct

### Result

**PASS** (owner, 2026-07-19)

### Please reply with
- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
