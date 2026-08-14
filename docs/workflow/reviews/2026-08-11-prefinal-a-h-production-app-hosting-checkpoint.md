# Checkpoint: Prefinal A–H + Track B — Production App Hosting rollout

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Owner phrase | `APPROVE APP HOSTING ROLLOUT` → `APP HOSTING ROLLOUT: DONE` |
| Status | **COMPLETE — VERIFY PASS** · owner **`PROD PORTAL QUICK QA: PASS`** |
| Plan | `docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md` |
| Project | **`fresh-prints-prod`** |
| Backend | **`fresh-prints-portal`** |

---

## Pre-rollout (earlier) — PASS

Production tip `76205da…`; freeze contained; Storage Rules + Functions wave live; Secret Manager Firebase/Algolia prod identity; Portal typecheck + prod-env build PASS.

---

## Rollout

| Item | Value |
|------|-------|
| Command | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 76205da8eeab43c545112f7399522e6b4106a03e --force` |
| Executor | **Owner (manual CLI)** — agent hook-blocked |
| Source SHA | `76205da8eeab43c545112f7399522e6b4106a03e` |
| Build ID | **`build-2026-08-11-004`** |
| Build state | **READY** |
| Rollout ID | **`build-2026-08-11-004`** |
| Rollout state | **SUCCEEDED** (`2026-08-11T22:31:42Z`) |
| Traffic | **100%** → `build-2026-08-11-004` |
| Auto-rollout | **disabled** |
| Backend URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |

---

## Post-rollout verification — **PASS**

| Check | Result |
|-------|--------|
| `origin/production` | still `76205da8eeab43c545112f7399522e6b4106a03e` |
| Build commit | **exact match** `76205da…` |
| `GET /` | **200** |
| `GET /catalog` | **200** |
| `GET /help` | **200** |
| `fresh-prints-dev` / DEV Algolia in HTML+sampled JS | **absent** |
| `fresh-prints-prod` in HTML/JS | **present** |
| Firestore Rules | unchanged (`2026-08-10T19:40:23Z`) |
| Storage Rules | unchanged (`2026-08-11T20:45:02Z` — static-og) |
| Functions / Algolia mutate / Track A / Studio | **none this gate** |
| Owner `PROD PORTAL QUICK QA: PASS` | **2026-08-11** — recorded |

---

## APP HOSTING GATE: **COMPLETE**

### Next Plan checkpoint (#7)

Post-E **read-only** production inventory + Track A **DRY RUN** (not APPLY).

Exact inventory/dry-run approval phrase: **[NEEDS REPO CHECK]** in  
`docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md`  
(APPLY remains separately gated: `APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR`).

Recommended until Plan/Review records it:

```
APPROVE PROD TRACK A: POST-E INVENTORY + DRY RUN
```
