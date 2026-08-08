# Owner QA Checklist — Home/Discover population (post future rollout)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Environment | Production Portal (Algolia **OFF**) |
| When to run | After corrective App Hosting rollout **SUCCEEDED** |
| Pass reply | `HOME DISCOVER CONTENT QA: PASS` |
| Fail reply | `FAIL: [description]` |

**Do not accept HTTP 200 alone.**

## Manual Test Checkpoint

**Feature / area:** Production Home / Discover rails population  
**Why automated tests are insufficient:** Live Firestore membership, indexes, and rail composition require owner visual/content confirmation.  
**Prerequisites:** Corrective Portal build live; Algolia remains OFF; no generated catalog dependency.

### Steps

1. Open `/` → **Expected:** Multiple designs visible across Home rails (not ~1 tile).
2. Check **New This Week** → **Expected:** Populated appropriately **or** empty only if no designs qualify under readyAt/legacy createdAt membership (until backfill, “new” may be weak — acceptable interim if Home overall is multi-design).
3. Check **Popular** → **Expected:** Populated when eligible metric designs exist; Home must not collapse to a single tile.
4. Check **category rail(s)** → **Expected:** Populated for categories with ready designs (where rails apply).
5. Open `/catalog` → **Expected:** Full expected ready catalog still visible.
6. Category browse (`/catalog?category=…`) → **Expected:** Still works.
7. Confirm Algolia → **Expected:** Remains **OFF** (no managed-search dependency for Home).
8. Confirm architecture → **Expected:** No generated snapshot dependency returned for Home/catalog ordinary browse.
9. Console / UI → **Expected:** No new visible customer errors from Home load.
10. Optional developer evidence → **Expected:** Failed/missing readyAt path falls back correctly until legacy `readyAt` coverage exists.

### Pass criteria

- [ ] Home shows multiple designs
- [ ] Rails behave per eligible data (not whole-home single-tile regression)
- [ ] `/catalog` still full
- [ ] Algolia OFF
- [ ] No generated Home dependency
- [ ] No new visible errors

### Please reply with

- `HOME DISCOVER CONTENT QA: PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
