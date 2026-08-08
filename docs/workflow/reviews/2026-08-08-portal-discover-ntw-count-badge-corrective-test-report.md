# Test Report: NTW count badge corrective (TD-031 follow-up)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Goal | `portal-discover-view-all-complete-pagination` (NTW count corrective) |
| Plan | `docs/workflow/plans/2026-08-08-portal-discover-ntw-count-badge-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-plan-review.md` |
| Result | **passed** |

---

## Commands

| Check | Exit |
|-------|------|
| `npx tsx --test` focused hook + ntwCountOrder + Stage 1b-C discover/readyAt + phase1a | **0** — **42/42 pass** |
| `npm run typecheck --workspace @fresh-prints/portal` | **0** |
| eslint touched files | **0** |
| `git diff --check` touched files | **0** |
| `npm run build:portal` | **0** |

---

## Coverage map

| Case | Result |
|------|--------|
| A NTW count orderBy shape | PASS (`catalogService.ntwCountOrder.test.ts`) |
| B Non-NTW count not globally ordered | PASS (gated on `readyAfterMs`) |
| C/D/E pending vs failed UI | PASS |
| F retry recovery | PASS |
| G failure after full hydration → loaded total | PASS |
| H/I TD-031 45 / 85 paging | PASS (prior tests retained) |
| Indexes DESC sufficient (no ASC added) | PASS containment |

---

## Notes

- No production deploy this pass.
- No new Firestore index; no Rules change.
