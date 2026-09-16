# Human Checkpoint: Studio Pre-Release Owner DEV QA

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| Workflow | managed-phase / Owner DEV QA / `studio-pre-release-pr-item-download-and-intake-navigation` |
| Reason | Manual verification is required for native PNG output/save behavior and interactive Studio lightbox keyboard behavior. |
| Status | **resolved** |
| Resolution | **PASS — Owner DEV QA completed 2026-09-16** |

---

## What We Need From You

Run the short DEV QA checklist below and reply with `PASS`, `FAIL: [description]`, or `PASS WITH NOTES: [notes]`.

## Context

Automated Test is complete: focused coverage 70/70, regression coverage 85/85, Studio typecheck,
targeted lint, Studio build/package, and diff check passed. No production or backend deployment
occurred. See the [test report](2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-test-report.md).

## Manual Test Required

**Environment:** local DEV Studio build with authorized staff account.

**Prerequisites:**

- A Print Request containing a catalog item with a valid production asset.
- If available, one customer-upload item and one Staff Artwork item.
- Uploaded Designs and Donated Designs contain multiple currently loaded previewable rows.

### Workstream A — Print Request per-item Download

1. Open a Print Request with a catalog item. Set and save a known size such as `10" × 12"`.
   **Expected:** Download is disabled while the size is dirty/saving and becomes available after
   the saved item refreshes.
2. Click that item’s Download action and save the PNG.
   **Expected:** Exactly one PNG is saved; its dimensions are `3000 × 3600` pixels. Quantity does
   not create duplicate files. The success notice shows an **X** to dismiss and auto-clears after
   about 5 seconds (hover pauses the timer).
3. Change and successfully save the same item to `11" × 13.2"`; then download again.
   **Expected:** The next PNG is `3300 × 3960` pixels, proving the new saved dimensions are used
   and no stale target survives.
4. Repeat one quick download with a customer-upload or Staff Artwork item, if available.
   **Expected:** The correct production asset downloads; enhanced mode uses its enhanced derivative
   or fails visibly without falling back to baseline.
5. If a native save dialog is canceled, or an asset is intentionally unavailable, verify the card
   does not report cancellation as an error and shows a bounded failure when resolution fails.

### Workstream B — Uploaded/Donated list selection navigation

1. Open Studio Uploaded Designs with several loaded list rows. Select a middle row, then press
   ArrowUp and ArrowDown.
   **Expected:** Selection moves to the previous/next list row and the detail panel follows.
   The list scrolls just enough to keep the selected row visible. Arrow keys do not merely
   scroll the scrollbar without changing selection.
2. At the first row press ArrowUp and at the last loaded row press ArrowDown.
   **Expected:** No wraparound and no auto-load-more.
3. Open a preview lightbox, then use Previous/Next (buttons or Left/Right) across items.
   **Expected:** The lightbox stays open and shows the next/previous previewable item; list
   selection follows. ArrowUp/ArrowDown do not move list selection while the lightbox is open.
4. Focus the search field (or another editable control) and press ArrowUp/ArrowDown.
   **Expected:** List selection is not hijacked.
5. Repeat steps 1–4 in Donated Designs.
   **Expected:** The same behavior applies using the `catalog_donation` intake scope.

### Pass criteria

- [x] Saved-size Download produces the expected 300-DPI PNG dimensions.
- [x] Download success notice can be dismissed with X and auto-clears on timeout.
- [x] A saved-size change changes the next Download dimensions; no stale target remains.
- [x] Catalog plus one upload/Staff Artwork source behaves correctly when available.
- [x] One Download produces one PNG regardless of quantity.
- [x] Uploaded Designs Up/Down moves list selection (not scrollbar-only) with no wrap.
- [x] Donated Designs Up/Down moves list selection (not scrollbar-only) with no wrap.
- [x] Lightbox Previous/Next keeps the lightbox open and updates the preview/selection.
- [x] Lightbox Left/Right/Escape/visible controls remain correct; Up/Down do not steal list selection while a modal/lightbox is open.
- [x] Search/editable focus is not hijacked by list Up/Down.
- [x] No unrelated or Portal behavior was observed to change.

## Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS — Owner DEV QA completed 2026-09-16.** No notes or failures supplied.

## Resolution record

| Date | Owner result | Notes |
|------|--------------|-------|
| 2026-09-16 | **PASS** | Owner replied `PASS`; all checklist criteria are accepted with no follow-up notes. |

## Impact If Delayed

Signoff is complete. The later coordinated Studio/Portal promotion remains separately gated. No
production action is needed for this checkpoint.

## Agent Actions While Paused

**Allowed:** Record the Owner DEV QA response, update the test report/state, complete Signoff, and
prepare the reviewed commit/push.

**Forbidden:** Production deployment/release, Functions or Rules deployment, migration/data
mutation, or scope expansion.
