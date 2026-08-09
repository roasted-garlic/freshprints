# App Hosting Rollout Record — Home/Discover population corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `prod-portal-home-discover-population-regression` |
| Authorization | `APPROVE PROD HOME DISCOVER APP HOSTING ROLLOUT` |
| Status | **CORRECTIVE BUILD LIVE / OWNER CONTENT QA: PASS WITH NOTES** (goal signed off) |

---

## Preflight (PASS)

| Check | Result |
|-------|--------|
| `origin/production` | `ccfc97487a42553146ea3186bde8f710a54b86ca` |
| Contains `f5e9cf6` | **YES** |
| Prior build | `build-2026-08-08-001` @ `1e65a43` (100%) |
| Auto-rollout | **disabled** |
| readyAt indexes (pre) | **4/4 READY** |
| Algolia | **OFF** |

---

## Rollout

| Item | Value |
|------|-------|
| Command | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit ccfc97487a42553146ea3186bde8f710a54b86ca --force` |
| Executor | **Owner (manual)** — Cursor hook blocked agent |
| Source SHA | `ccfc97487a42553146ea3186bde8f710a54b86ca` |
| New build ID | **`build-2026-08-08-002`** |
| Build state | **READY** |
| Rollout ID | **`build-2026-08-08-002`** |
| Rollout state | **SUCCEEDED** |
| Traffic | **100%** → `build-2026-08-08-002` |
| Backend URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |

---

## Technical smoke (PASS — not sufficient for defect close)

| Check | Result |
|-------|--------|
| `GET /` | **200** (body ~16.8 KB) |
| `GET /catalog` | **200** |
| `GET /catalog?category=all` | **200** |
| `fresh-prints-dev` in HTML | **not found** |
| Algolia tokens in HTML | **not found** |
| readyAt indexes post | **4/4 READY** (unchanged) |

### Home multiple-design automated evidence

**Not visually proven in this pass** (no browser UI automation). Static HTML smoke cannot assert Discover rail card counts.

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
| Firestore indexes | not redeployed; remain **4/4 READY** |
| Functions | not deployed/deleted |
| Algolia | remains **OFF** |
| readyAt document backfill | not run |
| taxonomy / Storage cleanup / Studio / DNS | not touched |

---

## Owner content QA (binding for close)

Checklist:
`docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-owner-qa-checklist.md`

Environment: production Portal URL above · Algolia OFF.

**Result (2026-08-08): PASS WITH NOTES**

- Home multi-design fixed; catalog / category / other Discover View All paths working.
- Note: New This Week empty (legacy readyAt coverage) — accepted; see Signoff.
- Signoff: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-signoff.md`

Defect **CLOSED** for whole-Home single-design regression (approved_with_notes).

---

## Confirmations

- NO Rules / Functions / indexes / Algolia / backfill / Storage cleanup this pass
- App Hosting corrective rollout only (owner CLI + agent verify)
