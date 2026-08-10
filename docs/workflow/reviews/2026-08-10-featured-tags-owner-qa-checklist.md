# Owner QA Checklist: Featured Tags amendment

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Environment | **fresh-prints-dev** Studio + Portal (localhost) |
| Reply with | `DEV FEATURED TAGS QA: PASS` / `FAIL: …` / `PASS WITH NOTES: …` |
| **Owner result** | **`DEV FEATURED TAGS QA: PASS`** (2026-08-10) |

---

## Studio — Tag Management

- [ ] Open Design Library → **Tags**
- [ ] Edit an approved tag → checkbox **Featured on Portal** is present
- [ ] Mark a tag Featured → Save → list shows **Featured** badge
- [ ] Unmark Featured → Save → badge gone
- [ ] Create a new tag with Featured checked → appears featured in Tag Management
- [ ] **Immediately** open Edit Design → Tags field suggestions include the new tag (type its name or focus empty input — featured tags float to the top of the empty suggestion list)
- [ ] Assign that tag to a **ready** design and save → design syncs (existing Algolia path)
- [ ] Aliases / Preferred when / Archive still work (no regression)

## Portal — Tag filter modal

- [ ] Open Design Library → **Tags**
- [ ] Featured section appears **only** for featured tags that already have an Algolia facet count (assigned to ≥1 ready design in current filter context)
- [ ] Featured-only tags with **zero** designs / not in facet list do **not** appear as pills
- [ ] Each featured pill shows a count when Algolia provides one
- [ ] Click featured pill → selected; same tag checked in list below
- [ ] Select a second tag (pill or checkbox) → Apply → catalog uses **AND** (designs must include every selected tag) — same as before
- [ ] Uncheck in list → featured pill deselects
- [ ] Section **hidden** when no featured tags qualify
- [ ] Mobile: pills wrap cleanly; drawer still usable
- [ ] Typed catalog search / Algolia still works (no “temporarily unavailable” for normal search)

## Algolia expectations (no schema change)

- [ ] Creating a tag + marking Featured does **not** require an Algolia index change
- [ ] After assigning the tag to a ready design, the tag appears in the Portal facet list with a count (existing design→Algolia sync)
- [ ] Featured pills appear only after that facet exists (same as normal tags)

## Regression (prelaunch bundle)

- [ ] Companions / Matching Designs / post-add suggestion still OK
- [ ] Censored / Uncensored still OK
- [ ] Placement badge still OK

---

## FAIL notes addressed (2026-08-10)

1. Portal featured pills = Firestore featured ∩ Algolia faceted tags with count (no orphan pills).
2. Studio design TagChipInput refreshes authoritative tag list after Tag Management create/update; featured prioritized in empty suggestions.
3. Confirmed: `isFeatured` is Firestore-only; Algolia still facets on design `tagIds` after assign/sync.
4. **Permission denied when saving tags on a design** — same Rules expression-budget class as prior approve/placement denials. Fix: `catalogMetadataOnlyUpdate` fast path (tags/title/category/description/background/placement/explicit) deployed to **fresh-prints-dev** only. Retry Edit Design → add tag → Save.

---

## Safety

- fresh-prints-prod / App Hosting prod / Studio prod / Algolia mutate / myprintrequest.com: **must remain untouched**
