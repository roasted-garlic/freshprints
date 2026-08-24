# Fresh Prints - Current State Snapshot

## 2026-08-24 — Upcoming Shows theme toggle (DEV SIGNOFF; production promote next)

| Item | Value |
|------|-------|
| Managed goal | `portal-shows-theme-toggle-sidebar` — **DONE (DEV)** |
| Signoff | **approved** — owner local visual `PASS` |
| Delivered | `/shows` and `/shows/[id]` use sidebar theme toggle; floating header toggle removed |
| Signoff doc | `docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-signoff.md` |
| Phase 9 | **PARKED** |

### Live production (until hotfix App Hosting)

| Item | Value |
|------|-------|
| Git `production` | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** (PR #88) until hotfix PR merges |
| App Hosting | **`fresh-prints-portal-build-2026-08-24-001`** @ 100% — still has header toggle on `/shows` |
| Canonical | `https://myprintrequest.com` |
| Rollback | `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a` |
| Published Studio | **1.0.8** (1.0.9 pinned; Gate F not started) |

### Owner next

1. Merge `development` → `production` PR for this chrome hotfix (if agent merge is hook-blocked)
2. App Hosting rollout of the merge SHA (if agent create is hook-blocked):
   `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit <MERGE_SHA> --force --non-interactive`
3. Confirm `/shows` on `https://myprintrequest.com` uses the sidebar toggle
4. Parent Gate F still parked:
   `AUTHORIZE STUDIO 1.0.9 RELEASE DISPATCH: STABLE INTERNAL-UNSIGNED FROM PRODUCTION 94a1ed0009deab775d8b0c60be44ca931c0ad291`
   (SHA will change after this hotfix merge — use the new production tip)

---

## Parked parent

`production-promote-portal-and-studio-2026-08-23` — Gates C+D+E LIVE; Gate F parked until this chrome hotfix is live.

---

## FreshForge workflow

| Item | Value |
|------|-------|
| Mode | managed-phase |
| Goal | `portal-shows-theme-toggle-sidebar` **DONE** (DEV) |
| Human checkpoint | production merge + App Hosting if shell guard blocks the agent |
