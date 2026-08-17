# App Hosting Rollout Record — GA4 enablement (PR #80)

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Managed goal | `portal-ga4-production-enablement` |
| Authorization | `AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 ENABLEMENT` |
| Production source SHA | `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` |
| Status | **BUILD LIVE / OWNER QA PASS — SIGNOFF COMPLETE** |
| Signoff | **approved** — `docs/workflow/reviews/2026-08-17-portal-ga4-production-enablement-signoff.md` |

---

## Preflight

Owner ran the authorized create after the agent CLI was hook-blocked:

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 124c6fa4ad3c86defa8fd61c578b3efeaf6609bb --force --non-interactive
```

---

## Rollout (SUCCEEDED — read-only verified)

| Item | Value |
|------|-------|
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Git commit | `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` (**exact**, App Hosting build `source.codebase.commit`) |
| Build / revision | **`fresh-prints-portal-build-2026-08-17-002`** |
| Build state | **READY** (`latestReadyRevisionName`) |
| Traffic | **100%** → `build-2026-08-17-002` |
| Backend Updated Date | `2026-08-17 13:57:44` (`updateTime` `2026-08-17T18:57:43Z`) |
| Build createTime | `2026-08-17T18:52:29Z` |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Canonical | `https://myprintrequest.com` |
| Previous live / rollback | `fresh-prints-portal-build-2026-08-17-001` @ `f8acb26` |

### GA Measurement ID wiring

- Revision env: `NEXT_PUBLIC_GA_MEASUREMENT_ID` from Secret Manager **version 1**
- App Hosting `effectiveEnv` origin: `APPHOSTING_YAML` / `apphosting.yaml`, availability **BUILD + RUNTIME**
- Prior live revision `build-2026-08-17-001` did **not** mount this secret

---

## Technical smoke (read-only)

| Check | Result |
|-------|--------|
| `https://myprintrequest.com/` | **200**, HTML includes `googletagmanager.com/gtag/js?id=G-…` |
| `https://www.myprintrequest.com/` | **302** then **200** (follow redirect); same gtag loader |
| Hosted.app `/` | **200**; same gtag loader |
| Literal `G-` value printed here | **no** |

---

## Confirmations

- Localhost / development: **not changed** this pass
- NO Functions / Rules / Storage Rules / indexes / Algolia / Auth / DNS / Studio this pass
- Measurement ID / Enhanced Measurement console settings: **not modified** this pass

---

## Owner QA

**`PROD GA4 QA: PASS`** (2026-08-17).

---

## Related

- Signoff: `docs/workflow/reviews/2026-08-17-portal-ga4-production-enablement-signoff.md`
- Checkpoint D: `docs/workflow/reviews/2026-08-17-portal-ga4-production-enablement-checkpoint-d.md`
