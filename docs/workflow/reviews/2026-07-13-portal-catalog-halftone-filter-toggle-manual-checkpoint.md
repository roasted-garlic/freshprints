# Manual Test Checkpoint — Portal catalog Halftone filter toggle

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | `portal-catalog-halftone-filter-toggle` |
| Reason | UI/UX verification of filter dock toggle |
| Status | **resolved** |
| Result | **PASS** (owner 2026-07-14) |

---

## Manual Test Checkpoint

**Feature / area:** Portal catalog Halftone filter toggle  
**Why automated tests are insufficient:** Layout, switch affordance, and filter interaction need human eyes.  
**Environment:** local Portal (`/` discover and `/catalog` library)  
**Prerequisites:** Catalog has at least one design tagged `halftone` and one without; signed-in customer.

### Steps

1. Open catalog home or Design Library → **Expected:** Filter bar shows **Halftone** between Category and Tags (same row on mobile: Category | Halftone | Tags).
2. Turn **Halftone** ON → **Expected:** Only designs with the `halftone` tag remain; search/category still apply if set.
3. Turn **Halftone** OFF → **Expected:** Halftone constraint removed; prior search/category/other tags unchanged.
4. With Halftone ON, open **Tags** → **Expected:** `halftone` is **not** listed; other tags still selectable; AND with Halftone still applies after Apply.
5. On **mobile**, select tags so the list shrinks → **Expected:** Sheet height shrinks with the list (tags stay tightly packed, not stretched across empty space). Many tags still scroll inside the sheet.
6. Tags modal **Clear** then Apply → **Expected:** Other tags clear; Halftone toggle stays ON (modal clear preserves the dedicated filter).
7. Dock **Clear filters** → **Expected:** Search, category, tags, and Halftone toggle all reset.
8. Check mobile width → **Expected:** Filter dock stays two rows tall; controls aligned and usable.
9. Hover a design card on home/catalog → **Expected:** finger/pointer cursor (not magnifying glass). Open details and hover the preview → **Expected:** magnifying glass (`zoom-in`).
10. Dark mode: DPI pill on request item cards is readable; Your Stash drawer uses dark surfaces/text; header Current Request control has a visible subtle border.
11. Upload/donate Back + Submit sit with clear space above the footer divider.
12. Add a design → toast shows **Undo** + **X** close on one line (message ellipsizes; no wrap).

### Pass criteria

- [ ] Standalone Halftone toggle works without opening Tags
- [ ] Filters by tagged halftones only when ON
- [ ] `halftone` hidden from Tags modal / active chips
- [ ] Mobile tag sheet shrinks with fewer tags (no stretched gaps)
- [ ] Mobile filter dock: Category | Halftone | Tags on one row (no extra height)
- [ ] Clear filters resets toggle; modal Clear preserves toggle
- [ ] Card hover = pointer; details preview hover = zoom-in
- [ ] Dark mode: DPI pill, stash drawer, header cart border
- [ ] Upload footer spacing above divider
- [ ] Add toast: Undo + X, single line
- [ ] Desktop + mobile layout acceptable

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
