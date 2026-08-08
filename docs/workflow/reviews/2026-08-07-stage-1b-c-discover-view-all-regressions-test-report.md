# Test Report: Stage 1b-C Discover View All regressions

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-discover-view-all-regressions-plan.md` |
| Plan review | `docs/workflow/reviews/2026-08-07-stage-1b-c-discover-view-all-regressions-plan-review.md` (**approved**) |
| Test Status | **passed** (automated); **pending_manual** owner re-QA |

---

## Commands run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit (focused + containment + ranking) | `npx tsx --test` on catalogService discover/readyAt/category/inFlight/stage1a tests, useCatalogDesigns, phase1a containment, catalogDiscoveryRanking | 0 | **68/68 pass** |
| Portal typecheck | `npm run typecheck` (cwd `apps/portal`) | 0 | pass |
| Lint (touched) | `npx eslint` on touched catalog files `--max-warnings 0` | 0 | pass |
| Whitespace | `git diff --check` on touched files | 0 | pass |

---

## Discriminating coverage added

- Popular metric sort with missing `requestCount` → 0 (not blank / not readyAt demotion)
- Category ready-order `readyAtMs ?? createdAtMs` vs createdAt-only demotion
- Cursor slice stability after client-sorted membership
- Home pool `skipClientSortRepair` (no full-membership repair on Discover home)
- New This Week demotion refusal preserved

---

## Manual / owner

Required before signoff — see Implementation Review reduced re-QA checklist.
