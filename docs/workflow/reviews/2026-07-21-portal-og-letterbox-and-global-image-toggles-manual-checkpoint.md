# Manual Test Checkpoint: Portal OG letterbox + global image toggles

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Feature | Studio Social sharing toggles + letterbox compositor + global library OG |
| Environment | fresh-prints-dev / `https://myprintrequest.dev` |
| Prerequisites | Studio owner login; Functions soft-deployed (done 2026-07-21) |

---

## Manual Test Checkpoint

**Feature / area:** Portal Open Graph letterbox + global image source  
**Why automated tests are insufficient:** Facebook/Messenger preview cache and visual crop/letterbox require live Debugger scrapes.  
**Environment:** local Studio + QA Portal (`myprintrequest.dev`)  
**Prerequisites:** Soft-deployed Functions; at least one ready library design

### Steps

1. Studio → **Settings → Social sharing** → confirm toggles: **Global preview image** (Library / Brand logo) and **Letterbox share images**. Save with Library + Letterbox **on**.
   → **Expected:** Save succeeds; settings persist after reload. Copy notes that library rotates **once per UTC hour** (Scrape Again alone does not change the design; **Pick next** forces an early change).
2. [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → scrape `https://myprintrequest.dev/` → **Fetch / Scrape Again**.
   → **Expected:** Title/description from settings; `og:image` is a **library design** (letterboxed 1200×630 on **grey** `#e5e7eb` margins), not only the brand logo.
3. Studio → **Pick next library preview** → then Scrape Again on home or `/custom-designs`.
   → **Expected:** A **different** library design appears (salt bump). Scrape Again without Pick next keeps the same design until the next UTC hour.
4. (Optional) Wait until the next UTC hour boundary, then Scrape Again without Pick next.
   → **Expected:** Library preview may change to the next hourly rotation.
4. Scrape a design share URL `https://myprintrequest.dev/share/design/{READY_ID}` (e.g. `…/1mW8O8VyqdHsGw9Ks53K`).
   → **Expected:** Design title/description; full artwork visible; **light grey** letterbox margins (`#e5e7eb`, not black). Debugger `og:image` should include `fit=contain&bg=e5e7eb` (new cache key after black-margin deploy).
5. Toggle **Letterbox** **off** → Save → Scrape Again on the same design share.
   → **Expected:** Preview may crop (Facebook wide frame); image URL is Storage signed (not `fit=contain`).
6. Toggle global source to **Brand logo** → Save → Scrape Again on `https://myprintrequest.dev/`.
   → **Expected:** Brand logo preview image.
7. Scrape a non-root URL e.g. `https://myprintrequest.dev/catalog` or `/requests/artwork?returnTo=%2Fcatalog` → **Fetch new information** if “never shared”.
   → **Expected:** Same global title/description/image as configured (HTTP 200 tags present; not an empty failure).

### Pass criteria

- [ ] Studio toggles save and reload
- [ ] Home shows library image when source=library (after scrape)
- [ ] **Pick next library preview** changes the global library image after Scrape Again
- [ ] Library copy / behavior is **hourly** UTC (not daily); optional: next-hour scrape changes image without Pick next
- [ ] Design share letterbox on shows full art on **grey** (`#e5e7eb`) margins (not black); `og:image` has `bg=e5e7eb`
- [ ] Letterbox off allows crop
- [ ] Logo mode shows brand logo on home
- [ ] Non-root URL scrape shows global OG after Fetch (not “broken” meta)

### Owner retest after grey cache-bust (2026-07-21)

1. Open [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).
2. Paste `https://myprintrequest.dev/share/design/1mW8O8VyqdHsGw9Ks53K` → **Scrape Again**.
3. Confirm `og:image` URL ends with `fit=contain&bg=e5e7eb` and preview margins are light grey (not black).
4. Optionally scrape `https://myprintrequest.dev/` the same way for global library image.

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
