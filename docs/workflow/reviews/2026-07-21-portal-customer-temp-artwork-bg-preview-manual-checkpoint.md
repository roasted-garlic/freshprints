# Manual Test Checkpoint: Portal customer temporary artwork background preview

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Workflow | managed-phase / test / Portal temp artwork bg preview |
| Reason | Visual/layout UX for nested color picker |
| Status | **PASS** |
| Resolution | Owner PASS 2026-07-21 (includes title “Background Color” copy) |

---

## What We Need From You

Verify the compact **Background** button + nested color picker in Portal design details. Reply with `PASS`, `FAIL: …`, or `PASS WITH NOTES: …`.

---

## Context

- Temporary preview only — never writes Firestore / staff `artworkBackgroundHex` / OG.
- Palette: 16 shirt-style colors (includes app grey + light black) + custom hex.
- Layout: toolbar swatch button opens a **small separate dialog** (not an inline full palette in the details body).

Plan: `docs/workflow/plans/2026-07-21-portal-customer-temp-artwork-bg-preview-plan.md`

---

## Manual Test Required

**Feature / area:** Portal catalog design details — temporary shirt-color preview  
**Environment:** local Portal  
**Prerequisites:** At least one ready catalog design; ideally one with a non-default saved artwork background (e.g. light black)

### Steps

1. Open Catalog → open a design’s **details modal**.  
   → **Expected:** Hero mat matches the design’s saved background (or app grey). Toolbar shows a compact **Background** button with a small swatch of that color. Description/tags layout is **not** crowded by a big color grid.

2. Click **Background**.  
   → **Expected:** A small separate dialog opens titled **Background Color**, with shirt-color swatches + custom hex field. Hint: preview on another background; pick a shirt color or enter a hex — preview only; nothing is saved.

3. Pick several palette colors (e.g. navy, white, mustard).  
   → **Expected:** Design details hero mat (and toolbar swatch) update immediately behind/under the picker. Catalog grid cards outside the modal are unchanged.

4. Enter a custom hex (e.g. `#aabbcc`) → **Apply**.  
   → **Expected:** Mat updates; invalid hex (e.g. `zzz`) shows an error and does not apply.

5. Click **Cancel**.  
   → **Expected:** Preview reverts to the color that was active when the picker opened; picker closes.

6. Re-open picker, change color, click outside the dialog (or **Done** / Escape).  
   → **Expected:** Picker closes; temporary preview **keeps** the applied color while details stay open.

7. Open the full-size lightbox from the hero (if available).  
   → **Expected:** Lightbox mat matches the temporary preview color.

8. Close design details, reopen the same design.  
   → **Expected:** Preview resets to the design’s saved background (not your last temporary pick). Staff saved color / share OG unchanged.

9. Optional: In Studio, confirm the design’s artwork background field was **not** modified by Portal previewing.

### Pass criteria

- [x] Compact Background button only in details toolbar (no inline full palette crowding the modal)
- [x] Nested picker: palette + custom hex work; Cancel reverts open-time color; Done/outside keeps preview
- [x] Closing details resets temporary preview; nothing persisted

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  

**Your result:** **PASS** (2026-07-21) — including copy update to title “Background Color”

---

## Impact If Delayed

Signoff blocked until PASS / FAIL / PASS WITH NOTES.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint doc, answer clarifying questions  

**Forbidden:** Implement further scope, production deploy, invent PASS  

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-07-21 | PASS (incl. “Background Color” title) | yes | Signoff |
