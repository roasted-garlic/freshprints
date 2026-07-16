# Manual Test Checkpoint: Etsy link-only results (+ questionnaire UX)

**Feature / area:** Custom Designs → Help Me Find a Design (questionnaire + link-only results)  
**Why automated tests are insufficient:** Visual polish, keyboard autocomplete UX, mobile layout, Etsy new-tab behavior  
**Environment:** Local Portal (`npm run dev:portal`) against `fresh-prints-dev` Firebase  
**Prerequisites:** Portal customer login; hard-refresh after pulling changes

## Steps

### Questionnaire UX (new)

1. Open Portal → **Custom Designs** → **Help me find a design** → start questionnaire.  
2. **Step 1 — subject:** Type enough to show suggestions.  
   **Expected:** Dropdown sits flush under the input (small gap only). Arrow Down/Up moves highlight. Enter selects highlighted (or first). Escape closes list. Click still selects.  
3. **Step 2 — Tone / style:**  
   **Expected:** Text input (same pattern as Step 1), **not** a checkbox grid. Optional — can Continue blank. Suggestions (Funny, Cute, …) appear; free text allowed.  
4. Continue to review → confirm tone (if entered) appears in summary and in “We’ll search Etsy for” preview.

### Link-only results (unchanged)

5. Submit → **Expected:** Results show **no** listing grid, skeleton loaders, ScraperAPI debug box, or “Fetch live” button.  
6. Confirm **Primary search** (+ **Broader** if shown) polished link cards; open Primary → Etsy new tab with `instant_download=true&explicit=1` and tone words in `q` when provided.  
7. DevTools Network → **Expected:** No call to `searchEtsyWebsiteRecommendations`.

## Pass criteria

- [ ] Step 2 is free-text tone with optional suggestions (no checkboxes)
- [ ] Subject autocomplete: close to input; Enter / arrows / Escape work
- [ ] Only polished Primary (+ Broader) link cards — no scrape UI
- [ ] Tone free-text appears in Etsy search `q` when provided
- [ ] No callable scrape request in Network tab

## Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
