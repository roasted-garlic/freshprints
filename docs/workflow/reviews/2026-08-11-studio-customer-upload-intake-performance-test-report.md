# Test Report: Workstream H — Studio upload intake perf + counts

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Branch | `fix/studio-upload-intake-perf-counts` |
| Plan | `docs/workflow/plans/2026-08-11-studio-customer-upload-intake-performance-plan.md` |
| Status | **passed_with_notes** (automated focused); manual / prod index checkpoint outstanding |

---

## Commands run

```bash
npx tsx --test \
  apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeQueries.test.ts \
  apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeParityContract.test.ts \
  packages/shared/src/utils/customerUploadPurpose.test.ts
# → 13 pass, 0 fail

npx tsc --noEmit   # from apps/studio
# → exit 0
```

## Not run in this pass

| Check | Reason |
|-------|--------|
| Full `npm run lint` | Deferred; focused Studio change |
| Vite / Electron package build | Deferred to pre-release |
| Prod Firestore index verify | **Human checkpoint** — confirm `purpose + catalogReviewStatus (+ createdAt)` composites exist in prod before Studio release |
| Manual Studio cold-start QA (criteria 22–30) | Requires owner Studio build against environment with indexes |

## Notes

- Legacy missing-purpose companion uses status-scoped metadata listeners (filter before enrich) so H-DM-2 is honored without reintroducing cross-purpose image hydration.
- Badge predicate remains Pending-only; `not_eligible` is not counted.
- A–G branches untouched; H is on its own branch from production.
