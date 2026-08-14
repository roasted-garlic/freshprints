# Manual QA Checkpoint — Phase 9 Etsy + Discover remediation

| Field | Value |
|-------|-------|
| Date | 2026-08-13 |
| Goal | `phase-9-custom-request-results-and-routing-remediation` |
| Environment | local Portal and/or Portal against `fresh-prints-dev` after owner-authorized DEV deploy |
| Status | **awaiting owner** |
| Prerequisite | Local implement complete; **no DEV deploy yet** without owner auth |

---

## Feature / area

Etsy Recommendations results lifecycle + Discover category rails / curated counts.

## Why automated tests are insufficient

UI/lifecycle and live Firestore membership need human verification.

### Steps — Etsy

1. Complete Help Me Find a Design → results → **Expected:** lifecycle notice “One active search at a time.”
2. Click **Mark as satisfied** → **Expected:** returns to choose path; request status `completed`; can start a new search without replace conflict from that request.
3. Start another search → Cancel this search (confirm) → **Expected:** `cancelled`; quieter than primary CTA.
4. Purchased path → Upload your download → **Expected:** `/requests/artwork` (existing flow).

### Steps — Discover

1. Category rail with known ~10 ready designs → **Expected:** rail shows up to 10 (not pool-only undercount).
2. Category with >25 ready → **Expected:** rail ≤25; View All still full.
3. Recently Requested with 2 eligible → **Expected:** badge “2 designs”, 2 cards, no Load more.
4. Most Liked → **Expected:** no zero-favorite membership in count/list.
5. Popular / New This Week / category browse / search / tags → **Expected:** no regression.

### Pass criteria

- [ ] Etsy satisfied/cancel/purchase OK
- [ ] Discover rails + Recent/Most Liked counts OK
- [ ] No Assisted regression (drawer/cancel/proof)

### Please reply with

- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
- Or first: `AUTHORIZE DEV PORTAL VALIDATION` if remote DEV hosting is required before QA
