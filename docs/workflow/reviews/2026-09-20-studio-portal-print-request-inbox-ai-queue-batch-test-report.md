# Test Report: Studio / Portal Print Request, Inbox, and AI Queue Batch

| Field | Value |
|---|---|
| Date | 2026-09-20 |
| Tester | FreshForge Test Agents Bohr and Lovelace, with managing-agent repository-wide checks |
| Plan | `docs/workflow/plans/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-plan.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-implementation-review.md` |
| Overall | **pending_manual** |

## Summary

All requested focused implementation suites, typechecks, targeted lint checks, Functions build, Studio Vite/package builds, and static Firestore index validation passed. The Portal production build was blocked by an environment `EPERM` opening the existing `.next/trace` file. Repository-wide lint remains blocked by unrelated pre-existing lint errors outside this goal. Manual Owner DEV QA is still required for the Studio and Portal visual/accessibility flows, so Signoff is not authorized.

## Commands Run

| Check | Command / scope | Exit code | Result | Notes |
|---|---|---:|---|---|
| A/D focused unit/contracts | `npx tsx --test` over gang-sheet label/layout/cache/nesting/compositor/IPC/Print Request export/selection suites | 0 | PASS | 84 passed, 0 failed |
| B focused tests | `npx tsx --test` over discovered Staff Inbox/shared suites, including pagination/reconciliation contracts | 0 | PASS | 32 passed, 0 failed |
| E focused tests | `npx tsx --test` over AI Processing, reconciliation, Staff Artwork, lifecycle, and supplementary AI suites | 0 | PASS | 32 + 52 passed, 0 failed |
| C/Portal/Functions focused tests | `npx tsx --test` over Portal Admin, search/grouping, dashboard, shared pricing, Staff Artwork lifecycle, and AI validation/reprocess suites | 0 | PASS | 75 passed, 0 failed |
| Studio pricing regression | Shared + Studio allocation pricing tests after snapshot-only correction | 0 | PASS | 14 passed, 0 failed |
| Studio typecheck | `npx tsc -p apps/studio/tsconfig.json --noEmit` | 0 | PASS | — |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | PASS | — |
| Functions build | `npm --prefix functions run build` | 0 | PASS | Initial workspace-form command was invalid; corrected command passed |
| Targeted ESLint | Changed Studio/shared files and changed Portal/Functions/shared files | 0 | PASS | 45-file Studio/shared lane and 25-file Portal/Functions lane passed |
| Studio Vite build | `cd apps/studio; npx vite build` | 0 | PASS | — |
| Studio packaged build | `npm run build:studio` | 0 | PASS | Electron-builder emitted recoverable EPERM rename warnings but completed |
| Portal production build | `npm run build:portal` | 1 | ENVIRONMENT FAILURE | `EPERM: operation not permitted, open C:\coding\fresh-prints\apps\portal\.next\trace` |
| Repository lint | `npm run lint` | 1 | FAILED_DOCUMENTED | 14 errors/1 warning in unrelated pre-existing files; no goal file was among the reported failures |
| Firestore index validation | JSON parse, signature uniqueness, and required B cursor signatures | 0 | PASS | 116 unique indexes; four required B signatures present; no deployment |
| Diff integrity | `git diff --check` | 0 | PASS | Only CRLF normalization warnings were emitted |

## Focused test commands

The primary focused commands were:

```powershell
npx tsx --test packages/shared/src/utils/gangSheetLabelRendering.test.ts packages/shared/src/utils/gangSheetGroupedLayout.test.ts packages/shared/src/utils/gangSheetContinuousCustomerGroupedLayout.test.ts packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts packages/shared/src/utils/gangSheetNesting.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts apps/studio/electron/ipc/export/exportRequestValidation.test.ts apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestGangSheetSelection.test.ts apps/studio/src/renderer/src/features/print-requests/components/generatePrintRequestGangSheetModal.contract.test.ts
```

```powershell
npx tsx --test apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts apps/portal/features/admin-show-queue/hooks/portalAdminShowQueueLoad.test.ts apps/portal/features/admin-show-queue/utils/portalAdminShowQueueSearch.test.ts functions/src/lib/portalAdminUpcomingShowQueueDashboard.test.ts functions/src/getPortalAdminUpcomingShowQueueDashboard.contract.test.ts packages/shared/src/utils/portalAdminShowQueueMetrics.test.ts packages/shared/src/utils/showAllocationDollarTotals.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/showAllocationDollarTotals.test.ts functions/src/staffArtworkAiLifecycle.test.ts functions/src/ai/enqueueAiEnrichmentValidation.test.ts functions/src/ai/reprocessReadyDesignWithAiCore.test.ts functions/src/reprocessReadyDesignWithAi.contract.test.ts
```

The Studio lane also ran the Staff Inbox pagination/reconciliation contracts, AI queue behavioral tests, Staff Artwork lifecycle contracts, and supplementary AI suites. The AI behavioral coverage includes multi-page traversal, empty client-filter pages, pause/stop, retry, stale, terminal, and duplicate/concurrency safeguards.

## Failures and environment notes

### Portal `.next/trace` access failure

- **Command:** `npm run build:portal`
- **Output:** `EPERM: operation not permitted, open C:\coding\fresh-prints\apps\portal\.next\trace`
- **In scope to fix:** no; environment/file-lock issue
- **Action:** documented; no deletion, reset, or destructive cleanup was performed

### Repository-wide lint baseline

- **Command:** `npm run lint`
- **Output:** 14 errors and 1 warning in unrelated existing files, including deletion/design-tag/show-rail/propagate-identity/print-request-limit/show-recovery paths
- **In scope to fix:** no; outside the approved goal
- **Action:** targeted lint for all changed implementation surfaces passed; baseline retained unchanged

### Absent requested test paths

- `apps/studio/src/renderer/src/features/ai-review/hooks/backgroundAiQueueReconciliation.test.ts` was not present; the available AI reconciliation test under `ai-review/utils/` passed.
- `packages/shared/src/utils/gangSheetProductionGroups.test.ts` was not present; no applicable test file exists.

## Skipped checks

| Check | Reason |
|---|---|
| `npm run test:rules` | No Firestore Rules changes were made; static index validation passed. No Rules deployment or emulator mutation was authorized. |
| Firestore emulator query integration | No dedicated query-shape harness exists for these client listeners; index JSON/signature validation was run. Live DEV index behavior remains a later Owner/DEV QA concern. |
| Production smoke tests | Explicitly forbidden before release/deployment approval. |

## Manual Owner DEV QA checklist

### Studio

- Long direct Print Request name: shrink, wrap, no horizontal overflow, no artwork overlap.
- Long grouped and continuous customer-grouped headings: same output geometry as preview, cache refresh after rename.
- Partial gang sheet: all/none/subset, mixed catalog/upload/Staff Artwork, saved quantities/dimensions, stale selection reset, no request mutation.
- Staff Inbox: Load More, loaded-count wording, live insert/update/removal, older-page request hydration, acknowledgement/Done behavior.
- Staff Artwork: new/imported, existing imported, ready/approved reprocess, rejected reset, unsupported/terminal safe handling.
- AI Processing: more than 100 designs, empty filtered pages, pause/stop/retry/stale/terminal behavior.

### Portal Admin

- `/admin/show-queue`: request ID/name/customer-label search and clear.
- Customer grouping is deterministic and does not merge same-label customers.
- Request total and selected-show allocation total are separately labeled.
- Snapshot pricing, legacy surcharge fallback, canceled exclusion, and unpriceable/null states.
- Responsive layout, keyboard focus, labeled controls, and accessible empty/loading states.

## Signoff readiness

- [x] Focused automated checks passed.
- [x] Typechecks/builds required for implementation completed, except documented Portal environment failure.
- [x] Failures and baseline issues documented honestly.
- [ ] Manual Owner DEV QA complete.
- [ ] Signoff authorized.

**Next step:** Owner DEV QA checkpoint. Do not deploy, release, change Rules, deploy indexes, or perform Signoff from this report.
