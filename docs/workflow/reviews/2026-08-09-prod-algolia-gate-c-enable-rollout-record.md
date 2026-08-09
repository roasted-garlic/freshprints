# Rollout Record: Production Algolia Portal enable

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Authorization | `APPROVE PROD ALGOLIA ENABLE` → secrets READY → source PROMOTED → owner **`PROD ALGOLIA ENABLE ROLLOUT: COMPLETE`** |
| Project | `fresh-prints-prod` |
| Backend | `fresh-prints-portal` |
| Git commit | **`f5c0bdb7f37d0d7fab589fbe31a6a76963e456a0`** (PR #49) |
| Status | **LIVE (traffic) / await owner QA** |

---

## Live traffic (agent read-only)

| Item | Value |
|------|--------|
| Build / revision | **`fresh-prints-portal-build-2026-08-09-001`** |
| Traffic | **100%** |
| Backend updated | `2026-08-09 11:05:27` (firebase backends:get) |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Prior build | `build-2026-08-08-004` (tagged; 0% traffic) |

### HTTP smoke

| URL | Result |
|-----|--------|
| Cloud Run 100% revision | Confirmed via `gcloud run services describe` |
| `https://myprintrequest.com/` | **200** — initial HTML does **not** embed App ID/index strings (expected if client bundle-only) |
| Run.app direct | **403** (ingress; use custom domain / hosted.app) |
| Search key | **Not** inspected or logged |

Agent cannot fully prove client Algolia bake-in from bare HTML; **owner QA** is authoritative for managed search behavior.

---

## Still required

Owner QA → **`PROD ALGOLIA ENABLE QA: PASS`** (or FAIL / PASS WITH NOTES)

Checklist: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-owner-qa-checklist.md`

---

## Kill-switch

Set `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` secret to `false` and roll out tip again.
