# App Hosting Rollout Record — Portal Discover show-rail loading and order polish

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `portal-discover-show-rails-loading-and-order-polish` |
| Authorization | `APPROVE PROD APP HOSTING ROLLOUT: portal-discover-show-rails-loading-and-order-polish` |
| Production Git | **`36165096f09bef6817adb5b11d496dbb1502b34b`** (PR **#90** merge) |
| Status | **BUILD LIVE** — owner prod smoke **PASS WITH NOTES** |

---

## Preflight

| Check | Result |
|-------|--------|
| Prior live / rollback | **`fresh-prints-portal-build-2026-08-24-002`** @ **`f35c96d`** @ 100% |
| Production source SHA | **`36165096f09bef6817adb5b11d496dbb1502b34b`** |
| PR #90 | **MERGED** |

---

## Rollout (LIVE — read-only verified)

| Item | Value |
|------|-------|
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Git commit | **`36165096f09bef6817adb5b11d496dbb1502b34b`** |
| Build / revision | **`fresh-prints-portal-build-2026-08-24-003`** |
| Traffic | **100%** → `build-2026-08-24-003` |
| Cloud Run `latestReadyRevisionName` | `fresh-prints-portal-build-2026-08-24-003` |
| Backend updateTime | **2026-08-24T21:01:20Z** |
| Canonical | `https://myprintrequest.com` |
| Rollback | **`fresh-prints-portal-build-2026-08-24-002`** @ **`f35c96d`** (tagged revision retained) |

---

## Owner production smoke

| Result | **PASS WITH NOTES** |
|--------|---------------------|
| Date | 2026-08-24 |

### Notes (non-blocking)

Immediately after rollout, a **pre-existing browser session** briefly showed `(0, A.e) is not a function` when opening **View All** from the new Discover show rails. A **true hard refresh** (`Ctrl+Shift+R`) resolved the error; it did **not** persist afterward.

**Classification:** transient stale/mixed Next.js client-chunk condition across the App Hosting deployment boundary — **not** a reproducible source defect. **No corrective code change required.**

---

## Confirmations

- NO Cloud Functions deploy
- NO Firestore Rules deploy
- NO Storage Rules deploy
- NO Firestore indexes deploy
- NO secrets changes
- NO Studio release
- NO Firebase data mutation

---

## Rollback reference

| Build | SHA | Use |
|-------|-----|-----|
| `fresh-prints-portal-build-2026-08-24-002` | `f35c96d` | Revert Discover show-rail polish only |
| `fresh-prints-portal-build-2026-08-24-001` | `94a1ed0` | Prior promote baseline |
