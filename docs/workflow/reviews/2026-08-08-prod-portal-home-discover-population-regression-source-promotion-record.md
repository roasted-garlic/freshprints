# Source Promotion Record — Home/Discover population regression

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `prod-portal-home-discover-population-regression` |
| Authorization | `APPROVE PROD HOME DISCOVER FIX PROMOTION` |
| Status | **SOURCE PROMOTED / LIVE PORTAL STILL AFFECTED** |

---

## Preflight

| Check | Result |
|-------|--------|
| Feature branch | `fix/prod-home-discover-population` |
| Approved fix head | `f5e9cf62524e223aef7f2e289bad51e9b35b18d6` |
| Commits after approved review | **none** (at promotion time) |
| App source scope | `catalogService.ts` + `catalogService.homeDiscoveryPool.test.ts` (+ workflow docs) |
| `origin/production` before merge | `1e65a43e131b3b5709a8870b1a24a40f8a004978` |
| Intervening production commits | **none** |
| Suite re-run this pass | **Not required** — Implement evidence reused (54/54, typecheck, build, lint, diff-check; Implementation Review APPROVED) |

---

## Protected Git promotion

| Item | Value |
|------|-------|
| PR | **#42** |
| URL | https://github.com/roasted-garlic/freshprints/pull/42 |
| Title | fix: restore Home discovery pool fallback |
| Head OID | `f5e9cf62524e223aef7f2e289bad51e9b35b18d6` |
| Mergeable at create | MERGEABLE / CLEAN |
| Merge method | **merge commit** |
| Merged at | `2026-08-08T16:12:47Z` (GitHub) |
| Agent merge | Blocked by Cursor hook; **owner completed merge** |
| Production SHA before | `1e65a43e131b3b5709a8870b1a24a40f8a004978` |
| Production merge SHA | `ccfc97487a42553146ea3186bde8f710a54b86ca` |
| Parents | `1e65a43` + `f5e9cf6` |
| Subject | `Merge PR #42: restore Home discovery pool fallback` |

---

## Post-merge verification (2026-08-08)

| Check | Result |
|-------|--------|
| PR state | **MERGED** / CLOSED |
| `origin/production` | `ccfc97487a42553146ea3186bde8f710a54b86ca` |
| Contains `f5e9cf6` | **YES** (ancestor) |
| `catalogService` on production | Contains `shouldFillHomeDiscoveryPoolFromBaseReady` / membership incompleteness fill |
| Live App Hosting traffic | **100%** → `build-2026-08-08-001` @ commit `1e65a43` |
| Live Home/Discover defect | **STILL PRESENT** (runtime not yet on `ccfc974` / `f5e9cf6`) |
| Auto-rollout | **disabled** (`rolloutPolicy.disabled: true`) |

---

## Binding status

| Layer | Status |
|-------|--------|
| Git source | **PROMOTED** to `production` |
| App Hosting | **NOT YET ROLLED OUT WITH FIX** |
| Functional QA | **FAIL / AWAITING CORRECTIVE ROLLOUT** |

---

## Next gate (not executed)

Index deploy gate:
`docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-index-deploy-gate.md`

Owner phrase:

```text
APPROVE PROD READYAT INDEX DEPLOY
```

Index-only deploy would **not** have fixed the Home short-circuit; source fallback restores Home even with 0 `readyAt` fields. Indexes still required for preferred readyAt query paths.

Then: wait indexes ENABLED → `APPROVE APP HOSTING ROLLOUT` from `ccfc974` (or later production tip containing the fix) → owner content QA → signoff.

---

## Confirmations

- NO production index deploy
- NO Rules / Functions / Algolia / backfill / App Hosting
- NO direct push to `production` by agent
- NO force push
