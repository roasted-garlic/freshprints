# Plan: Current Request cart — one line per size

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-19-portal-detail-newest-first-match-cart-plan.md |

---

## Goal

Current Request cart shows **one row per print-request item (size)**, with meta like `3.5 x 3.89 · Qty 2`, instead of collapsing same-design sizes into `2 Sizes · Qty 2`.

## Background

Owner PASS on newest-first detail/cart with one note: cart must not group multiple sizes of the same design into a single row.

## Scope

### In Scope
- `CurrentRequestDrawer`: one list row per `workingItems` entry (newest-first order unchanged)
- Meta line: dimensions · Qty N (from item width/height or `sizeLabel`)
- Trash removes that single item only

### Out of Scope
- Detail page card layout
- Merging same size+design into one row
- Changing add/duplicate/resize backends

---

## Affected Areas

### Files / Modules
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- Optional small format helper colocated or in utils + unit test
- Manual QA update

### Architecture / Security / Data / Backend
- [x] None (presentation only)

### UI / UX
- [x] Cart lists every size as its own line; remove is per line

---

## Approach

1. Stop grouping by `designId` / upload id.
2. Render `workingItems` (already newest-first) as rows.
3. Size text: format inches without forcing useless trailing zeros; omit `in` to match owner example (or strip from `sizeLabel`).
4. `handleRemoveItem(itemId)` replaces multi-id group remove.

---

## Test Strategy

| Check | Required |
|-------|----------|
| Portal typecheck | yes |
| Unit for size meta helper if extracted | yes |
| Manual: two sizes of same design → two cart rows | yes |

---

## Human Checkpoints
- [x] Manual UI — cart per-size rows

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-19-current-request-cart-per-size-line-review.md
- Verdict: approved
