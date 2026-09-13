# Manual Test Checkpoint — Print Request Standard Size Presets

**Feature / area:** Standard Print Sizes (Studio Settings, Studio/Portal item cards)  
**Environment:** Studio + Portal local against `fresh-prints-dev`  
**Result:** **PASS WITH NOTES** (2026-08-29) — feature behavior passed; signoff deferred for v1 defaults + modal sub-tab corrective.

---

## Original checklist (completed PASS WITH NOTES)  
**Why automated tests are insufficient:** Modal layout, owner Settings save, cross-app settings sync, DPI UX, title alignment, and duplicate behavior require human eyes on DEV.  
**Environment:** Local Studio + Portal against **`fresh-prints-dev`** (DEV Firebase deploy completed 2026-08-29)  
**Prerequisites:** Owner login; editable Print Request with catalog item; optional customer-upload item; artwork with known aspect ratio

---

## A. Studio Settings

1. Open Studio Settings → **Standard Print Sizes**.
2. Confirm the tab/section is **owner-only**.
3. Verify all six placements: Full Front, Full Back, Back Collar, Left Chest, Sleeve, Hat.
4. Confirm Hat uses **Front Panel** and **Side Panel** (not age groups).
5. Confirm seeded widths match the approved owner table.
6. Change one preset width and **Save**.
7. Disable one preset and **Save**.

**Expected:**

- Save succeeds
- Changes resolve through the shared settings source immediately
- No existing Print Request item is retroactively resized

---

## B. Studio Standard Sizes

Use a Print Request containing a catalog item.

1. Open **Standard Size**.
2. Verify tab/group layout.
3. Select a Full Front preset.
4. Verify preview dimensions (width = preset; height from aspect ratio).
5. **Apply**.

**Expected:**

- Width becomes preset width
- Height auto-calculates from artwork aspect ratio
- DPI badge updates
- Persisted dimensions survive reload
- Selected preset survives reload (`Standard Size · …` label)

---

## C. Portal Standard Sizes

Open the same or another Portal-editable Print Request.

**Verify:**

- Same settings visible as Studio
- Disabled preset is unavailable
- Preset selection produces the same sizing behavior
- Mobile/narrow layout has no horizontal page overflow

---

## D. DPI protections

Test presets (or artwork) resulting in:

- under 200 DPI
- 200–299 DPI
- 300+ DPI

**Expected:**

- &lt;200: Apply **blocked**
- 200–299: **warn** but allow
- 300+: normal

---

## E. 22-inch protection

Use artwork/aspect ratio where resulting height would exceed 22″.

**Expected:**

- Apply **blocked**
- No silent clamping

---

## F. Manual override

Apply a preset, then manually change:

1. Width
2. Height

**Expected:**

- Aspect lock unchanged
- `standardSizePresetKey` clears when dimensions diverge
- Card shows generic **Standard Size** / Custom
- Manual sizing saves normally

---

## G. Duplicate

Duplicate a preset-sized item.

**Expected:**

- Exact requested width/height copied
- Preset key copied
- Duplicate **not** recalculated from current Settings

---

## H. Studio title alignment

Use short, medium, and very long design titles.

**Expected:**

- Studio single-line ellipsis like Portal
- Standard Size, Width, Height, DPI, quantity, Duplicate, Remove stay aligned
- Full persisted title unchanged (no new tooltip)

---

## I. Customer upload item

Repeat preset apply on a customer-upload-backed Print Request item.

**Expected:**

- Same sizing behavior as catalog item
- No source-type regression

---

## Please reply with

- `PASS` — all criteria met
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
- `FAIL: [description]` — what failed
