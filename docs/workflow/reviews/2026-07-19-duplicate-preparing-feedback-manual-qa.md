# Manual QA: Duplicate preparing feedback

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Status | **resolved** |
| Resolution | **PASS** — owner 2026-07-19 (“PASS on everything”) |
| Signoff | docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-signoff.md |

---

## Context

Optimistic duplicates previously disabled all controls with no label. Now: preparing status, size/qty editable immediately, Duplicate/Remove locked until ready; edits flush when the real id arrives.

Folded-in cart work also covered in this PASS: per-size line items; Clear + quota in bordered meta bar; mobile scrollbar chrome hidden.

---

## Manual Test Checkpoint

**Environment:** local Portal — soft-reload

### Steps
1. On request detail, Duplicate an item → **Expected:** new card shows “Preparing duplicate…” (pulse + accent border); Width/Height/Qty are focusable and editable right away; Duplicate/Remove stay disabled with preparing title.
2. Change size or qty while preparing → wait until preparing clears → **Expected:** your edited values remain and save (Saved indicator / persisted after refresh).
3. After ready → **Expected:** Duplicate/Remove work normally.
4. Cart: two sizes of same design → two rows with `W x H · Qty N`.
5. Cart header: Clear (left) + quota (right) in meta bar between header and item list (two horizontal rules).

### Result

**PASS** (owner, 2026-07-19) — all criteria including folded cart polish.

### Please reply with
- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
