# Production smoke checklist: Prefinal A–H + Track B

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Candidate | `qa/prefinal-a-h-dev` @ `3b7a978f324d3c133ead8707ffc51454a20e1f5d` |
| Plan | `docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md` |
| Environment | `fresh-prints-prod` / production Portal / production Studio when available |

Reduced checklist — deployment-sensitive only. Do **not** re-run full DEV suite unless a smoke item fails.

## Prerequisites

- [ ] Production Git tip contains frozen candidate content
- [ ] Storage Rules (static-og) deployed if required
- [ ] Functions allowlist deployed (includes E + Track B OG)
- [ ] App Hosting rollout from exact production SHA
- [ ] H indexes Enabled (reconfirm if Studio intake fails)

## Smoke items

| # | Check | Pass? |
|---|--------|-------|
| 1 | Portal production loads | |
| 2 | Search `prefixLast` behavior | |
| 3 | Rapid typing / URL race stable | |
| 4 | Global OG metadata (`getPortalGlobalOpenGraph`) current after Save | |
| 5 | Static Design letterbox (Facebook Scrape Again) | |
| 6 | Static Upload letterbox (Facebook Scrape Again) | |
| 7 | Customer upload attach stays **out** of Pending | |
| 8 | Successful Add to Show enters Pending | |
| 9 | Donation confirm → Pending | |
| 10 | Customer delete / quota refund | |
| 11 | Studio cold-start Uploaded Designs badge ↔ Pending list | |
| 12 | Donated/Uploaded intake load performance acceptable | |
| 13 | About/FAQ production purchase wording | |
| 14 | No DEV Algolia/Firebase identifiers in production clients | |
| 15 | Production Algolia index health (app `Z1FVCM5QUX` / `portal_catalog_ready_prod`) | |

## Track A post-APPLY (only after separate APPLY approval)

| # | Check | Pass? |
|---|--------|-------|
| A1 | Repaired IDs no longer Pending | |
| A2 | Upload docs / artwork files / request items remain | |
| A3 | Badge and Pending list agree | |

## Owner result

_Await production smoke after promote — not this Plan pass._
