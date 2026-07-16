# Manual QA: Restore Etsy Open API (link-first)

**Feature / area:** Portal Custom Designs → Help me find a Design  
**Why automated tests are insufficient:** Layout order, copy (no “Etsy” in link/fallback CTAs), and live Open API cards need human verification.  
**Environment:** `fresh-prints-dev` Portal + Functions  
**Prerequisites:**
- Signed-in Portal customer
- `ETSY_X_API_KEY` set and `searchEtsyRecommendations` deployed (if secret still missing, expect soft empty previews + working search links)

### Steps

1. Open Custom Designs → Help me find a Design → on subject step, type `high` and tap **Highland cow**.  
   **Expected:** Chip appears in the field; that suggestion disappears from the pills; spaces stay inside the phrase.

2. Type another term and press Enter or comma, or tap a second suggestion.  
   **Expected:** Second chip is added beside the first; duplicates are blocked; max 3 subject chips.

3. Open tone/style and add up to 2 tones the same way.  
   **Expected:** Same chip behavior; max 2; selected pills disappear.

4. While on `?step=subject` (or any wizard/results step), click **Custom Designs** in the sidebar or bottom nav.  
   **Expected:** Returns to the options screen (`/custom-designs` with no step), with resume-draft available if answers were saved.

5. Complete a short search → results.  
   **Expected:** Best match / More options cards work; preview quota copy is clear; empty preview message mentions both cards.

### Pass criteria

- [ ] Pill tap creates a removable chip and removes that suggestion from choices
- [ ] Comma / Enter commit typed values; spaces do **not** split multi-word entries
- [ ] Subject max 3 chips; tone/style max 2 chips; duplicates blocked
- [ ] Custom Designs nav from a wizard step returns to options
- [ ] Search still works with chips on review / results
- [ ] No scrape / ScraperAPI / Firecrawl behavior

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

### After this Etsy phase closes

Next planned work: enable Studio **Customer Requests** with tabs for suggestion approvals (Portal “Suggest…” requests), plus placeholders for AI and Fresh Prints custom requests. Move live suggestion-list management out of Settings onto that page.
