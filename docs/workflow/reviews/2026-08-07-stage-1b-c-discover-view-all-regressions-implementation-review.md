# Implementation Review: Stage 1b-C Discover View All regressions

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Implementation Review |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-discover-view-all-regressions-plan.md` |
| Plan review | **approved** |
| Test report | `docs/workflow/reviews/2026-08-07-stage-1b-c-discover-view-all-regressions-test-report.md` |
| Verdict | **APPROVED** — stop for owner re-QA |

---

## Root causes (confirmed)

| Defect | Root cause | Shared? |
|--------|------------|---------|
| **A. Popular → View All blank** | Firestore `orderBy(requestCount)` omits docs missing the field. Home rail uses `listHomeDiscoveryPool` + client `rankPopular` (missing → 0), so the rail can be full while View All is empty. | Related pattern (orderBy omission), **different field** |
| **B. Category View All wrong order** | Completeness guard for `orderBy(readyAt)` previously **re-queried with `orderBy(createdAt)`**, dropping documented ready-order key `readyAtMs ?? createdAtMs`. | Same service path family |

**Legacy `readyAt`:** Yes — incompleteness vs `countReadyDesigns` is what triggered the createdAt demotion. Fix preserves legacy compatibility via client sort on the ready-order key (no backfill).

**Not shared as one bug:** Popular is metric-field omission; category is readyAt completeness demotion.

---

## Fix summary

In `catalogService.listReadyDesignsPage`:

1. **Metric (`requestCount` / `favoriteCount`)**: if first page empty/incomplete vs ready count (or Load More with cursor), fetch complete membership via `createdAt`, client-sort by metric (missing → 0), page slice. Does **not** convert Popular to readyAt.
2. **readyAt (non–New This Week)**: if native `orderBy(readyAt)` incomplete, same membership fetch + client-sort by `getDesignSortValue(..., 'readyAt')` — **not** createdAt order.
3. **New This Week** (`readyAfterMs`): unchanged; still refuses createdAt demotion.
4. **Home pool**: `skipClientSortRepair: true` so Discover home does not pull full membership on every load.
5. **`lastAddedToShowAt`**: left Firestore-native (Recently Requested field eligibility).

---

## Ordering contract after fix

| Surface | Contract |
|---------|----------|
| Popular View All | Ready designs ranked by `requestCount` desc (missing → 0), id tie-break |
| Category / Library browse (`readyAt`) | `readyAtMs ?? createdAtMs` desc, id tie-break; legacy missing `readyAt` included |
| New This Week | Membership + order on `readyAt` window; no demotion |
| Home rails | Unchanged client ranking over bounded pools |

---

## Files changed

- `apps/portal/features/catalog/services/catalogService.ts`
- `apps/portal/features/catalog/types/catalog.types.ts` (`skipClientSortRepair`)
- `apps/portal/features/catalog/services/catalogService.discoverViewAllRepair.test.ts` (new)
- `apps/portal/features/catalog/services/catalogService.readyAtOrdering.test.ts`

---

## Tests

- **68/68** focused unit/containment/ranking
- Portal **typecheck** pass
- Touched-file **eslint** pass
- **git diff --check** pass

---

## Scope confirmations

- No production
- No PR #40 merge
- No Stage 4/5/6
- Publisher remains alive
- No Algolia redesign / no migration/backfill / no Rules changes

---

## Verdict

**APPROVED** for owner re-QA. Do not sign off until manual checklist passes.
