# Owner QA Checklist: NTW count badge corrective (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Environment | Production **after** separate source promotion + App Hosting of this corrective |
| Live today (pre-corrective deploy) | `build-2026-08-08-003` still has NTW Counting stuck |
| Related | Corrective Implementation Review **approved** |

---

## Prerequisites

- [ ] Corrective source on `production`
- [ ] App Hosting build with corrective is live (100%)
- [ ] Algolia still OFF

---

## Manual Test Checkpoint

**Feature / area:** New This Week View All count badge  
**Why automated tests are insufficient:** Real Firestore aggregate + index + UI  
**Environment:** production (post-corrective rollout)

### Steps

1. Refresh New This Week View All (`/catalog?discover=new`).  
   → **Expected:** Badge may briefly show “Counting designs…”, then resolves to true total (≈ **45**).  
   → **Must not** remain stuck on Counting after load settles.
2. First page may show up to **40** cards; **Load more** if membership > 40.
3. Load more → remaining designs; final visible set matches badge; no duplicates.
4. Spot-check another View All / category — totals still resolve.
5. (If aggregate cannot be forced) Confirm failure copy contract in code review: **“Count unavailable”** not infinite Counting; browsing/Load more still work.

### Pass criteria

- [ ] NTW badge resolves to true total (not stuck Counting)
- [ ] Load more reaches full membership
- [ ] Other View All totals OK
- [ ] No new visible errors

### Please reply with

- `DISCOVER VIEW ALL PAGINATION QA: PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

**Do not Signoff TD-031 until PASS (or PASS WITH NOTES accepted).**
