# Owner QA Checklist: Portal Discover / View All complete pagination (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Environment | Production (or production-like) **after** separate App Hosting rollout — **not live yet** |
| Source | Local/branch implementation complete; deploy gated |
| Related | Plan + Formal Review + Implementation Review + Test Report (2026-08-08) |

---

## Prerequisites

- [ ] App Hosting build containing this fix is live (separate owner deploy phrase)
- [ ] Algolia still **OFF** in production (expected)
- [ ] New This Week membership still ≈ **45** after readyAt backfill (or note actual count)

---

## Manual Test Checkpoint

**Feature / area:** Portal `/catalog` Discover View All count + Load more  
**Why automated tests are insufficient:** Real Firestore membership, UI badge, and Load more UX  
**Environment:** production (post-rollout)  
**Prerequisites:** logged-in or guest catalog browse as today

### Steps

1. Open Discover → **New This Week** → View All (`/catalog?discover=new`)  
   → **Expected:** Badge shows true membership (currently ≈ **45 designs**), **not** 40.
2. Confirm first viewport / first page shows up to **40** cards.  
   → **Expected:** Load more visible if membership > 40.
3. Click **Load more**.  
   → **Expected:** Remaining designs appear (≈ 5 more for 45 total); no duplicate cards.
4. Confirm final visible card count equals the badge number.  
   → **Expected:** e.g. 45 cards ↔ “45 designs”.
5. Open another View All / category with >40 designs if available.  
   → **Expected:** Badge = true total; Load more reaches all.
6. Change filter (e.g. New This Week → a category, or clear discover).  
   → **Expected:** Rows, badge, and paging reset; no stale NTW rows/count.
7. Browse plain `/catalog` (no discover).  
   → **Expected:** Normal browse; Load more / counts still coherent.
8. Spot-check Discover **home rails**.  
   → **Expected:** Unchanged composition (not this fix’s surface).

### Pass criteria

- [ ] NTW badge is true count (not capped at 40)
- [ ] All matching NTW designs reachable via Load more
- [ ] No duplicate cards across Load more
- [ ] Filter change resets paging/count
- [ ] `/catalog` ordinary browse OK
- [ ] Home rails not obviously regressed

### Please reply with

- `DISCOVER VIEW ALL PAGINATION QA: PASS`
- `DISCOVER VIEW ALL PAGINATION QA: FAIL: [description]`
- `DISCOVER VIEW ALL PAGINATION QA: PASS WITH NOTES: [notes]`

---

## Confirmations (this implement pass)

- NO production data mutation
- NO readyAt mutation
- NO Functions / Rules / index / App Hosting / Algolia / Storage / taxonomy actions
