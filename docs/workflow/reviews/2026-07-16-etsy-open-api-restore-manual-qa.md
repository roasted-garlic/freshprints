# Manual QA: Restore Etsy Open API (link-first)

**Feature / area:** Portal Custom Designs → Help me find a Design  
**Why automated tests are insufficient:** Layout order, copy (no “Etsy” in link/fallback CTAs), and live Open API cards need human verification.  
**Environment:** `fresh-prints-dev` Portal + Functions  
**Prerequisites:**
- Signed-in Portal customer
- `ETSY_X_API_KEY` set and `searchEtsyRecommendations` deployed (if secret still missing, expect soft empty previews + working search links)

### Steps

1. Open Custom Designs → Help me find a Design → complete a **short** subject (e.g. “highland cow”) + optional tone → Search.  
   **Expected:** Specificity warning visible; Primary (+ Broader if different) search link cards **above** listing area; CTAs say “Open search” / “Browse designs” (not “Open on Etsy”); if secret configured, listing cards with image/title/price/shop and “View listing”; purchases open off-platform.

2. Edit search to a **very elaborate** subject + long wording → Search again.  
   **Expected:** Warning still visible; fewer or empty API listings possible; soft message points to search links above **without** naming Etsy in that message.

3. With empty/unavailable previews (or before secret is set): use Primary search link.  
   **Expected:** New tab opens official search URL; links remain usable.

4. Confirm admin Subject/Tone suggestions still work (regression).  
   **Expected:** Autocomplete still shows static + any admin overlays.

### Pass criteria

- [ ] Warning about elaborate queries is shown
- [ ] Search links are above listing grid
- [ ] Link/fallback CTAs and empty messages do **not** say “Etsy” (trademark aside OK)
- [ ] When secret is configured: listing cards render and “View listing” opens a listing URL
- [ ] Soft empty/unavailable still shows usable search links
- [ ] No scrape / ScraperAPI / Firecrawl behavior
- [ ] Admin suggestion overlays still work

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
