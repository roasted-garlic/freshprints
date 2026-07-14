# Test Report: Portal home Most Liked carousel

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Goal | portal-home-most-liked-carousel |
| Status | passed |

---

## Automated

| Check | Exit | Result |
|-------|------|--------|
| `npx tsx --test` designFavoriteCount + catalogDiscoveryRanking | 0 | pass (12) |
| Portal typecheck | 0 | pass |
| Functions build | 0 | pass |

---

## Deploy required before manual

```bash
firebase deploy --only functions:onCustomerFavoriteCreated,functions:onCustomerFavoriteDeleted,firestore:indexes --project fresh-prints-dev
node functions/scripts/backfill-design-favorite-counts.mjs
```

(Indexes may take time to build.)

---

## Manual

| Test | Result | Date |
|------|--------|------|
| Favorite/unfavorite → **Most Liked** updates; **Popular** still request-based | **PASS** (owner) | 2026-07-14 |

### Deploy notes
- Functions + indexes deployed to `fresh-prints-dev` by owner
- Backfill skipped (empty favorites; ADC error if run without `firebase login:application-default`)
