# Implementation Review — Production Home/Discover population regression

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Implementation Review (independent) |
| Status | **APPROVED** (source only) |
| Managed goal | `prod-portal-home-discover-population-regression` |
| Plan | `docs/workflow/plans/2026-08-08-prod-portal-home-discover-population-regression-plan.md` |
| Formal Review | `approved_with_changes` |
| Test report | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-test-report.md` |
| Branch | `fix/prod-home-discover-population` |
| Scope | Source Implement + Test + deploy checkpoint prep — **no** production mutation |

---

## Verdict

**APPROVED** for source. Production Home/Discover defect remains **OPEN** until index deploy + App Hosting rollout + owner content QA.

---

## Challenge responses

| # | Challenge | Answer |
|---|-----------|--------|
| 1 | Reproduces/fixes one-design prod defect? | **Yes.** Removed `byId.size > 0` early return. CASE 1 encodes readyAt index fail + 1 metric + 46 ready → must fill. |
| 2 | Can a single metric hit still suppress fallback? | **No.** `shouldFillHomeDiscoveryPoolFromBaseReady` uses membership incompleteness and/or readyAt index unavailability. |
| 3 | Invented magic pool-size threshold? | **No.** Rule is Plan’s “incomplete relative to ready membership” capped by existing `HOME_DISCOVERY_POOL_PAGE_SIZE` (80). No 8/12/20. |
| 4 | Fallback bounded? | **Yes.** Fill uses `HOME_DISCOVERY_POOL_PAGE_SIZE` only; no unbounded collection read. |
| 5 | Reuses catalog fallback? | **Yes.** `listReadyDesignsPageWithSortFallback` (readyAt → createdAt on index error), then explicit `createdAt` page when readyAt succeeds empty (0 `readyAt` fields). |
| 6 | Ready-only preserved? | **Yes.** Fill still goes through `listReadyDesignsPage` / mapper (`status === 'ready'`). |
| 7 | Metric ranking preserved? | **Yes.** First-wins merge keeps metric rows; CASE 4 ranking asserts. |
| 8 | Dedupe correct? | **Yes.** `mergeHomeDiscoveryPoolById` / Map first-wins. |
| 9 | Accidental Algolia? | **No.** Home path unchanged Firestore-only; containment assert. |
| 10 | Generated catalog dependency? | **No.** |
| 11 | Unexpected Firestore/security errors? | **Yes preserved.** Index classification unchanged; hard non-index failures rethrown when pool remains empty. `WithSortFallback` still rethrows non-index errors. |
| 12 | Steady-state Firestore reads? | **Bounded increase only when fill needed** (count + ≤2 pages). Healthy complete readyAt path skips fill. |
| 13 | Correct with zero legacy `readyAt` fields? | **Yes.** Explicit createdAt completion after empty readyAt success. |

---

## Required changes

- [x] None — APPROVED as implemented

---

## Production status (binding)

| Item | Status |
|------|--------|
| Source fix | **APPROVED** on feature branch |
| Production runtime | **STILL AFFECTED** (`build-2026-08-08-001` / `1e65a43`) |
| readyAt indexes live | **0/4** (definitions verified in repo; not deployed this pass) |
| Algolia | **OFF** (unrelated; do not enable as fix) |

---

## Confirmations

- NO production index deploy
- NO App Hosting rollout
- NO Algolia / Rules / Functions / backfill / data mutation
