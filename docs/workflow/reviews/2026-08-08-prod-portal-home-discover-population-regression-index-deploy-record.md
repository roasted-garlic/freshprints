# Index Deploy Record — PR #40 readyAt composites (Home/Discover corrective)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `prod-portal-home-discover-population-regression` |
| Authorization | `APPROVE PROD READYAT INDEX DEPLOY` |
| Status | **COMPLETE — 4/4 READY** |
| Production source SHA | `ccfc97487a42553146ea3186bde8f710a54b86ca` |

---

## Step 1 — Production source preflight

| Check | Result |
|-------|--------|
| `origin/production` | `ccfc97487a42553146ea3186bde8f710a54b86ca` |
| Match expected merge SHA | **YES** |
| Intervening commits | **none** |

---

## Step 2 — Exact four definitions (from `firestore.indexes.json`)

Collection group: `designs` · `queryScope`: `COLLECTION`

1. `status` ASCENDING + `readyAt` DESCENDING + `__name__` DESCENDING
2. `categoryId` ASCENDING + `status` ASCENDING + `readyAt` DESCENDING + `__name__` DESCENDING
3. `tags` ARRAY_CONTAINS + `status` ASCENDING + `readyAt` DESCENDING + `__name__` DESCENDING
4. `categoryId` ASCENDING + `tags` ARRAY_CONTAINS + `status` ASCENDING + `readyAt` DESCENDING + `__name__` DESCENDING

---

## Step 3 — Pre-deploy live delta (HARD GATE) — **PASS**

Canonical keys strip trailing `__name__` (Firebase materializes it on live; many local defs omit it).

| Metric | Pre-deploy |
|--------|------------|
| Local total | **71** |
| Live total | **67** |
| readyAt live | **0/4** |

```text
CREATE:
1. designs | status ASC + readyAt DESC
2. designs | categoryId ASC + status ASC + readyAt DESC
3. designs | tags ARRAY_CONTAINS + status ASC + readyAt DESC
4. designs | categoryId ASC + tags ARRAY_CONTAINS + status ASC + readyAt DESC

DELETE:
NONE

UNEXPECTED:
NONE
```

---

## Step 4–5 — Deploy

| Item | Value |
|------|-------|
| Command | `firebase deploy --only firestore:indexes --project fresh-prints-prod --non-interactive` |
| Executor | **Owner (manual)** — Cursor hook blocked agent deploy |
| Result | Owner reported **success** / Deploy complete |
| Scope | Indexes only (no Rules / Functions / Storage / App Hosting) |

---

## Step 6 — Wait until ENABLED/READY — **PASS**

Monitored via `gcloud firestore indexes composite list --project=fresh-prints-prod`.

| # | Fields (live, incl. `__name__`) | Final state |
|---|--------------------------------|-------------|
| 1 | `status` ASC + `readyAt` DESC + `__name__` DESC | **READY** |
| 2 | `categoryId` ASC + `status` ASC + `readyAt` DESC + `__name__` DESC | **READY** |
| 3 | `tags` ARRAY_CONTAINS + `status` ASC + `readyAt` DESC + `__name__` DESC | **READY** |
| 4 | `categoryId` ASC + `tags` ARRAY_CONTAINS + `status` ASC + `readyAt` DESC + `__name__` DESC | **READY** |

**4/4 READY** (observed after CREATING → READY; no ERROR).

---

## Step 7 — Post-deploy canonical comparison — **PASS**

| Metric | Post-deploy |
|--------|-------------|
| Local total | **71** |
| Live total | **71** |
| readyAt live | **4/4** |
| missing (local not live) | **0** |
| unexpected (live not local) | **0** |
| deleted vs pre-deploy intent | **0** |

---

## Live Portal (unchanged)

| Item | Value |
|------|-------|
| App Hosting traffic | **100%** → `build-2026-08-08-001` |
| Build commit | `1e65a43` (pre–Home-fix) |
| Home/Discover defect | **STILL PRESENT** until corrective App Hosting rollout |
| Algolia | **OFF** / unrelated |

### Binding product note

Indexes make preferred `readyAt` query paths available. They do **not** alone fix Home while legacy docs lack `readyAt` and the live Portal still has the early-return bug. Source fallback on `ccfc974` / `f5e9cf6` restores Home after App Hosting rolls that SHA.

---

## Next gate (not executed)

```text
APPROVE PROD HOME DISCOVER APP HOSTING ROLLOUT
```

Roll out Portal from production tip containing the fix (`ccfc974` or later) → owner content QA → signoff.

Optional later (separate): `APPROVE PROD READYAT BACKFILL`.

---

## Confirmations

- NO Rules / Storage / Functions / Algolia / backfill / App Hosting this pass
- NO production document mutation
- Index deploy only (owner CLI) + agent read-only verify
