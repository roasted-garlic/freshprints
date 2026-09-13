# App Hosting Rollout Record — PR #89 Upcoming Shows theme toggle hotfix (Gate E supplement)

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Parent goal | `production-promote-portal-and-studio-2026-08-23` |
| Hotfix goal | `portal-shows-theme-toggle-sidebar` — DEV signoff **approved** |
| Authorization | Owner requested merge + App Hosting rollout in same session after visual QA PASS |
| Production source SHA | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** (PR **#89** merge) |
| Status | **BUILD LIVE** — post-rollout verification **PASS** |

---

## Rollout (LIVE — read-only verified)

| Item | Value |
|------|-------|
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Git commit | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** |
| Commit message | `Merge pull request #89 from roasted-garlic/development` / Restore Upcoming Shows sidebar theme toggle |
| Build / revision | **`fresh-prints-portal-build-2026-08-24-002`** |
| Build state | **READY** |
| Rollout | `rollouts/build-2026-08-24-002` — **SUCCEEDED** |
| Traffic | **100%** → `fresh-prints-portal-build-2026-08-24-002` |
| Cloud Run `latestReadyRevisionName` | `fresh-prints-portal-build-2026-08-24-002` |
| Build createTime | `2026-08-24T16:33:52Z` |
| Backend updateTime | `2026-08-24T16:39:21Z` (approx) |
| Canonical | `https://myprintrequest.com` |
| Previous live / rollback | **`fresh-prints-portal-build-2026-08-24-001`** @ `94a1ed0009deab775d8b0c60be44ca931c0ad291` |

---

## Post-rollout verification

| Check | Result |
|-------|--------|
| `origin/production` | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** |
| PR #89 | **MERGED** @ `f35c96d` |
| App Hosting traffic 100% on build-002 | **PASS** |
| `https://myprintrequest.com/` | **200** |
| `https://myprintrequest.com/catalog` | **200** |
| `https://myprintrequest.com/shows` | **200** |
| `/shows` static HTML: no `portal-chrome` | **PASS** (floating header chrome absent) |
| `/login` static HTML: `portal-chrome` present | **PASS** (auth pages unchanged) |
| Hotfix DEV owner visual QA | **PASS** (recorded in hotfix signoff) |

**Note:** Theme toggle buttons are client-rendered; static HTML smoke confirms route-level chrome split (`portal-chrome` absent on `/shows`, present on `/login`). Owner already verified sidebar toggle visually during hotfix QA.

---

## Confirmations

- NO Firebase Functions/Rules/Secrets/DNS/Studio changes
- Parent promote Gate D unchanged
- Gate F still **not started**

---

## Rollback options

| Build | SHA | When to use |
|-------|-----|-------------|
| `build-2026-08-24-001` | `94a1ed0` | Revert hotfix only; keep PR #88 promote |
| `build-2026-08-21-001` | `7716d4a` | Full rollback before this promote wave |

---

## Next (parent promote — Gate F draft only, after owner authorizes)

Production Git tip is now **`f35c96d`** (includes hotfix). Studio dispatch should use **current `origin/production`**:

```text
AUTHORIZE STUDIO 1.0.9 RELEASE DISPATCH: STABLE INTERNAL-UNSIGNED FROM PRODUCTION f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2
```

Publish remains separate: `APPROVE STUDIO PUBLISH: 1.0.9`
