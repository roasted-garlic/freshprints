# Test Report (final closeout): Studio Print Request Editing tab

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-print-request-editing-tab` |
| Status | **passed_with_notes** |
| Plan | `docs/workflow/plans/2026-09-02-studio-print-request-editing-tab-plan.md` |
| Owner QA | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-owner-qa.md` — **PASS** |

---

## Final focused regression

**Command:**

```bash
npx tsx --test \
  packages/shared/src/utils/printRequestListGrouping.test.ts \
  packages/shared/src/utils/printRequestQueueTabRecompute.test.ts \
  packages/shared/src/utils/portalPrintRequestListTabs.test.ts \
  packages/shared/src/utils/portalOneWorkingPrintRequest.test.ts \
  packages/shared/src/utils/portalPrintRequestUnqueue.test.ts \
  packages/shared/src/utils/printRequestTabSelection.test.ts \
  packages/shared/src/utils/groupPrintRequestsByShow.test.ts \
  packages/shared/src/utils/staffGangSheetHistorySort.test.ts \
  packages/shared/src/utils/showProductionRecovery.test.ts \
  apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.test.ts \
  apps/studio/src/renderer/src/features/print-requests/utils/printRequestLifecycleTabLayout.contract.test.ts \
  apps/studio/src/renderer/src/features/print-requests/utils/filterPrintRequestsByActiveTab.test.ts \
  apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.test.ts \
  apps/studio/src/renderer/src/features/print-requests/utils/reconcileDeletedOrArchivedRequest.test.ts \
  apps/studio/src/renderer/src/features/upcoming-shows/utils/upcomingShowListSort.test.ts \
  apps/portal/features/print-requests/utils/resolvePortalPrintRequestCardLabel.test.ts
```

**Result: 147 / 147 PASS** (exit 0)

Coverage includes: lifecycle derive + `queueTab` mirror, Portal Editing list tabs, ADR-FP-071 continuable / unqueue guards, Customer + Internal routes/tabs, counts/filter/merge/reconcile, tab CSS nowrap contract, Internal Printed / History sort helper, Upcoming/Past show ordering regressions, DNP recovery ADR-FP-071 guard.

Prior focused baseline was 107/107; final closeout suite is intentionally broader (same goal scope).

---

## Builds / typecheck

| Check | Command | Result |
|-------|---------|--------|
| Functions build | `npm --prefix functions run build` | **PASS** |
| Studio `tsc` | `npx tsc --noEmit -p apps/studio/tsconfig.json` | **pre-existing errors only** — no goal-scoped hits on Editing/sort/routes/layout files |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **pre-existing** `catalogService` `interactiveEnhance*` only — **no** Editing/requests path errors |

---

## DEV deploy / reconcile (already completed — not re-run)

| Item | Status |
|------|--------|
| Project | `fresh-prints-dev` |
| Firestore Rules (`editing` allowlist) | Deployed |
| Functions (10 named runtime exports) | Deployed |
| Backfill dry-run / apply | COMPLETE / **0 writes** (corpus already consistent) |
| Post-deploy Functions source drift | Comment-only in `onPrintRequestQueueTabInputsWritten.ts` — **no DEV redeploy required** for closeout |

---

## Notes

- Production not in scope.
- Continuable parking goal **not started**.
