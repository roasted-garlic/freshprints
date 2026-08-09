# App Hosting Rollout Record — NTW count badge corrective (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `portal-discover-view-all-complete-pagination` |
| Authorization | `APPROVE PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT` |
| Owner start notice | `PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT STARTED` |
| Status | **BUILD LIVE / OWNER QA PASS — SIGNOFF COMPLETE** |

---

## Preflight (PASS)

| Check | Result |
|-------|--------|
| `origin/production` | `7e139685099f90eb1532771e927384316a432e87` |
| Contains `82ea610` (NTW corrective) | **YES** |
| Contains `ce80dac` (schedule companion) | **YES** |
| PR #45 | **MERGED**; merge SHA = tip `7e13968` |
| Live before | **100%** `build-2026-08-08-003` |
| Agent CLI | Hook-blocked; **owner ran** `apphosting:rollouts:create` |

---

## Rollout (SUCCEEDED)

| Item | Value |
|------|-------|
| Command | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 7e139685099f90eb1532771e927384316a432e87 --force` |
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Git commit | `7e139685099f90eb1532771e927384316a432e87` (**exact**) |
| Build | **`build-2026-08-08-004`** |
| Build state | **READY** |
| Rollout state | **SUCCEEDED** |
| Traffic | **100%** → `build-2026-08-08-004` |

---

## Technical smoke (PASS)

Base: `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`

| Path | Status | Notes |
|------|--------|-------|
| `/` | **200** | no `fresh-prints-dev`; no crash markers |
| `/catalog` | **200** | same |
| `/catalog?discover=new` | **200** | NTW View All; Algolia markers **OFF**; `fresh-prints-prod` present |
| `/requests` | **200** | list shell loads (auth UI may gate detail) |

No runtime crash markers (`Application error` / `Unhandled Runtime Error` / `Internal Server Error`) in sampled HTML.

---

## PR #45 schedule companion spot-check (PASS — source + shell)

| Check | Result |
|-------|--------|
| Tip tree includes `scheduledShowEntries` memo in `PrintRequestDetailView` | **YES** |
| Progress panel receives `scheduledShowEntries={…}` | **YES** |
| `PortalPrintRequestScheduleSection entries={scheduledShowEntries}` wired | **YES** (progress panel + fallback section) |
| `/requests` HTTP | **200** (no shell crash) |
| Authenticated per-request schedule UI | **Owner QA** (requires login + a request with schedules) |

---

## Confirmations

- NO Functions / Rules / Storage Rules / indexes / Algolia / data mutation this pass
- **STOP before Signoff** — awaiting `DISCOVER VIEW ALL PAGINATION QA: PASS`

---

## Next

Owner QA **PASS** (2026-08-08). Signoff:
`docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-signoff.md`
