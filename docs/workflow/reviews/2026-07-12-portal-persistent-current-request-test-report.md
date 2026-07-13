# Test Report: Portal Persistent Current Request

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | `docs/workflow/plans/2026-07-12-portal-persistent-current-request-plan.md` |
| Review | `docs/workflow/reviews/2026-07-12-portal-persistent-current-request-review.md` |
| Status | **passed_with_notes** — automated green for Portal scope; owner manual checkpoint required |

---

## Commands Run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit (aggregates + one-working + branch) | `npx tsx --test packages/shared/src/utils/currentRequestAggregates.test.ts packages/shared/src/utils/portalOneWorkingPrintRequest.test.ts apps/portal/features/print-requests/utils/resolveAddDesignToRequestBranch.test.ts` | 0 | 14/14 pass |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |
| Portal build | `npm run build:portal` | 0 | pass (`/requests/artwork` routed) |
| Monorepo lint | `npm run lint` | see notes | Portal clean; pre-existing Studio `exhaustive-deps` warning may fail `--max-warnings 0` |

## Notes

- Functions were not changed; Functions build/tests not required this pass.
- Selection-mode code retained pending manual PASS (Part G gate).
- Manual checkpoint: `docs/workflow/reviews/2026-07-12-portal-persistent-current-request-manual-checkpoint.md`

## Manual Checkpoint

Awaiting owner `PASS` / `PASS WITH NOTES` / `FAIL`.
