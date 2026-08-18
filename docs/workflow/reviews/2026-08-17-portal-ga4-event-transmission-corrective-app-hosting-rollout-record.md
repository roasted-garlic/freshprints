# App Hosting Rollout Record — GA4 event-transmission corrective (PR #81)

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Managed goal | `portal-ga4-event-transmission-corrective` |
| Authorization | `AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 EVENT TRANSMISSION CORRECTIVE` |
| Production source SHA | `cb006bd5a21580cccf89d6c1d13d31f07633c51f` |
| Status | **BUILD LIVE / OWNER QA PASS — SIGNOFF COMPLETE** |
| Signoff | **approved** — `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-production-signoff.md` |

---

## Rollout (LIVE — read-only verified)

| Item | Value |
|------|-------|
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Git commit | `cb006bd5a21580cccf89d6c1d13d31f07633c51f` (**exact**, App Hosting `source.codebase.commit`) |
| Build / revision | **`fresh-prints-portal-build-2026-08-18-001`** |
| Build state | **READY** (`latestReadyRevisionName`) |
| Traffic | **100%** → `build-2026-08-18-001` |
| Backend updateTime | `2026-08-18T04:29:56Z` (CLI Updated Date `2026-08-17 23:29:56`) |
| Build createTime | `2026-08-18T04:26:01Z` |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Canonical | `https://myprintrequest.com` |
| Previous live / rollback | **`fresh-prints-portal-build-2026-08-17-002`** @ `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` |

Agent CLI `rollouts:create` was hook-blocked. Live build appeared afterward (owner/local create). Inspected read-only; **no second create** this session.

### GA Measurement ID wiring

- Revision still mounts Secret Manager `NEXT_PUBLIC_GA_MEASUREMENT_ID` (BUILD/RUNTIME via `apphosting.yaml`)
- Literal `G-` value **not printed**

---

## Technical smoke (read-only, not production QA)

| Check | Result |
|-------|--------|
| `https://myprintrequest.com/` | **200**; HTML includes `googletagmanager.com/gtag/js?id=G-…` |
| Tag detection alone | **insufficient** — owner must still prove **`g/collect`** |

---

## Confirmations

- NO Functions / Rules / indexes / Algolia / Auth / DNS / Studio / Secret Manager / GA4 console this pass
- Rollback remains `build-2026-08-17-002` @ `124c6fa` until this build is accepted

---

## Owner QA

**`PROD GA4 TRANSPORT QA: PASS`** (2026-08-17).

---

## Related

- Production Signoff: `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-production-signoff.md`
- Implement/Test Signoff: `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-signoff.md`
