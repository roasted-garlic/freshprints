# App Hosting Rollout Record — Discover / View All complete pagination (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `portal-discover-view-all-complete-pagination` |
| Authorization | `APPROVE PROD DISCOVER VIEW ALL PAGINATION APP HOSTING ROLLOUT` |
| Status | **CORRECTIVE BUILD LIVE / OWNER QA: FAIL — corrective Plan+Review open** |

---

## Preflight (PASS)

| Check | Result |
|-------|--------|
| `origin/production` | `9f3a01ae0585d607f9a332dad2c86ad2a541548b` |
| Contains `a01a9dc` | **YES** |
| Prior build | `build-2026-08-08-002` (100%) |
| Algolia | **OFF** |
| Agent rollout | Cursor hook blocked; **owner ran CLI** |

---

## Rollout (SUCCEEDED)

| Item | Value |
|------|-------|
| Command | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 9f3a01ae0585d607f9a332dad2c86ad2a541548b --force` |
| Executor | **Owner (manual)** |
| Source SHA | `9f3a01ae0585d607f9a332dad2c86ad2a541548b` |
| New build ID | **`build-2026-08-08-003`** |
| Build state | **READY** |
| Build codebase commit | `9f3a01ae0585d607f9a332dad2c86ad2a541548b` (verified via App Hosting API) |
| Rollout / traffic | **100%** → `fresh-prints-portal-build-2026-08-08-003` |
| Backend URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |

---

## Technical smoke (PASS — not sufficient for defect close)

| Check | Result |
|-------|--------|
| `GET /` | **200** (body ~16.8 KB) |
| `GET /catalog` | **200** |
| `GET /catalog?discover=new` | **200** |
| `fresh-prints-dev` in HTML | **not found** |
| Algolia markers in HTML | **not found** |

| Label | Status |
|-------|--------|
| AUTOMATED RUNTIME VERIFY | **PASS** (build/traffic/HTTP/smoke) |
| OWNER CONTENT QA | **REQUIRED** |

---

## Unchanged components (this pass)

| Component | Confirmation |
|-----------|--------------|
| Firestore Rules | not deployed |
| Storage Rules | not deployed |
| Firestore indexes | not deployed |
| Functions | not deployed/deleted |
| Algolia | remains **OFF** |
| Production documents / readyAt | not mutated |
| taxonomy / Storage cleanup / Studio | not touched |

---

## Owner QA (binding for close)

Checklist:
`docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-owner-qa-checklist.md`

### Result (2026-08-08)

**`DISCOVER VIEW ALL PAGINATION QA: FAIL`**

- NTW designs load; other View All totals OK
- NTW badge stuck on **“Counting designs…”** (reproducible after refresh)
- Corrective Plan+Review: `2026-08-08-portal-discover-ntw-count-badge-corrective-plan.md` (+ review)
- **Do not Signoff** until corrective live + QA PASS

### Minimum checks (original)

1. New This Week View All — badge ≈ **45** (true total), not 40
2. First page may show 40; **Load more** appears
3. Load more → remaining designs; final set matches badge
4. No duplicate / skipped cards across page boundary
5. Another >40 View All/category/tag/Halftone if data allows
6. Filter change resets rows/count
7. `/catalog` normal; no new visible errors

### Please reply with

```text
DISCOVER VIEW ALL PAGINATION QA: PASS
```

or `FAIL: [description]` / `PASS WITH NOTES: [notes]`

**Do not Signoff before owner QA.**

---

## Confirmations

- App Hosting rollout executed by owner CLI only (agent hook-blocked)
- NO Functions / Rules / indexes / Algolia / data mutation
