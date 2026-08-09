# Signoff: Production Portal Home/Discover population regression

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Signoff by | Signoff Agent |
| Managed goal | **`prod-portal-home-discover-population-regression`** |
| Parent | `post-launch-catalog-and-processing-stability` / `pr-40-production-promotion` |
| Plan | `docs/workflow/plans/2026-08-08-prod-portal-home-discover-population-regression-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-plan-review.md` |
| Test report | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-test-report.md` |
| Implementation Review | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-implementation-review.md` |
| Source promotion | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-source-promotion-record.md` |
| Index deploy | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-index-deploy-record.md` |
| App Hosting rollout | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-app-hosting-rollout-record.md` |
| Owner QA checklist | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-owner-qa-checklist.md` |
| Final status | **approved_with_notes** |
| Project | **fresh-prints-prod** (Portal) |

---

## Summary

Production Home/Discover showed ~one design after PR #40 App Hosting (`build-2026-08-08-001`) while `/catalog` showed the full ready catalog. Root cause **PROVEN**: `listHomeDiscoveryPool` treated any non-empty metric candidate pool as sufficient (prod: ~1 design with metrics; 0 with `readyAt`; missing readyAt composites), so createdAt fallback never ran. Catalog already used `WithSortFallback` → createdAt.

Corrective delivered: source membership-completeness fallback → Git promote (PR #42 / `ccfc974`) → four readyAt indexes **4/4 READY** → App Hosting **`build-2026-08-08-002`** @ `ccfc974` (100% traffic). Owner content QA: **PASS WITH NOTES**.

Whole-Home single-design regression is **fixed**. Goal **CLOSED**.

---

## Changes Delivered

### Behavior
- Home discovery pool fills from bounded catalog `WithSortFallback` + `createdAt` when preferred readyAt is index-unavailable or the merged preferred pool is incomplete relative to ready membership (no magic 8/12/20 threshold).
- Preferred readyAt + metric ranking + dedupe preserved when viable.
- Four `readyAt` composites live on production.
- Corrective Portal build live.

### Files (source)
- `apps/portal/features/catalog/services/catalogService.ts`
- `apps/portal/features/catalog/services/catalogService.homeDiscoveryPool.test.ts`
- Workflow plans/reviews/records

### Runtime
| Item | Value |
|------|-------|
| Production merge | `ccfc974` (contains `f5e9cf6`) |
| Live build | `build-2026-08-08-002` |
| readyAt indexes | **4/4 READY** |
| Algolia | **OFF** (unrelated; unchanged) |

---

## Tests

### Automated
- Focused Home/catalog/ranking: **54/54** (Implement pass)
- Portal typecheck / build / lint / `git diff --check`: **pass**
- Implementation Review: **APPROVED**

### Manual / live
| Test | Result |
|------|--------|
| App Hosting smoke (HTTP `/`, `/catalog`) | PASS |
| Owner content QA | **PASS WITH NOTES** |

---

## Human Approvals Obtained

| Phrase / action | Status |
|-----------------|--------|
| `APPROVE PROD HOME DISCOVER FIX IMPLEMENT` | Done |
| `APPROVE PROD HOME DISCOVER FIX PROMOTION` | Done (PR #42 merged) |
| `APPROVE PROD READYAT INDEX DEPLOY` | Done (owner CLI) |
| `APPROVE PROD HOME DISCOVER APP HOSTING ROLLOUT` | Done (owner CLI) |
| `HOME DISCOVER CONTENT QA: PASS WITH NOTES` | **Recorded** |

---

## Owner QA — PASS WITH NOTES

### PASS
- Home / Discover shows multiple designs correctly
- Catalog full as expected
- Category browsing works
- View All / Discover filter pages tested are populated and working
- Original whole-Home single-design regression fixed
- No new visible errors

### NOTE (accepted — not a corrective failure)
- **New This Week** (filter / View All) currently shows **no content**
- Cause: legacy production ready designs largely **lack `readyAt`** field coverage; New This Week membership/order depends on ready-transition timestamps
- Approved checklist explicitly allows New This Week to be weak/empty until optional readyAt backfill
- **Do not** treat this as failure of the Home population correction

---

## Known legacy note — New This Week empty

| Item | Detail |
|------|--------|
| Symptom | Production New This Week page empty |
| Classification | **Known legacy `readyAt` coverage gap** — not a Home-pool short-circuit regression |
| Mitigation today | Home/catalog/other Discover modes restored via source fallback + indexes + corrective build |
| Fix path | Separate gated **production readyAt backfill** (script exists: `functions/scripts/backfill-design-ready-at.mjs`) |
| This Signoff | **No backfill executed** |
| Risk ID | **R-018** |

---

## Follow-up recommendation

**Yes — recommend a separate managed/gated production readyAt backfill** so New This Week (and preferred readyAt ordering for legacy docs) can populate correctly now that indexes are live and the Home short-circuit is fixed.

- Not required to keep Home multi-design correct
- Must not run without explicit owner phrase
- Remains out of scope for this closed goal

Suggested next phrase:

```text
APPROVE PROD READYAT BACKFILL
```

**Out of scope / still open elsewhere (do not auto-start):** PR #40 remaining gates (e.g. Algolia RC-R3, Rules/Storage cleanup) — unchanged by this Signoff.

---

## Risks / residual

| Risk | Status |
|------|--------|
| New This Week empty until backfill | **Accepted note**; follow-up recommended |
| Algolia OFF / RC-R3 | Unrelated; still OPEN on parent promotion |
| Metric rails sparse when few designs have metrics | Expected with current data |

---

## Final status

**approved_with_notes**

`prod-portal-home-discover-population-regression` = **DONE / CLOSED**.

---

## Confirmations

- NO Algolia config/enable
- NO Functions / Rules / Storage cleanup / publisher delete
- NO readyAt backfill
- NO additional App Hosting rollout
