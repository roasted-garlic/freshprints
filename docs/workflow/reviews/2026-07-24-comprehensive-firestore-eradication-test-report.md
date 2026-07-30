# Test Report: Comprehensive Firestore Spike Eradication (narrowed 5-item scope)

| Field | Value |
|-------|-------|
| Date | 2026-07-24 |
| Author | Managing Agent (Claude) |
| Related | `docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-pre-implementation-report.md`, Wave C Plan amendment (top of `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md`), Wave C Review amendment (top of `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md`) |

## Scope implemented

Five narrow, evidence-backed fixes per the amended Plan, all `approved_with_changes` by the self-reviewed
Formal Review amendment:

1. `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` — category filter dropdown now
   reads `useGeneratedDesignLibraryTaxonomy` (existing zero-Firestore-read generated client-safe taxonomy
   snapshot) instead of `useCategories()` (Firestore-backed, unconditional). `useAiReviewInbox.ts`'s and
   `TagManagementModal.tsx`'s tag loading were explicitly left untouched (genuine write/archived-data needs).
2. `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` (+ new
   `utils/reconcileDeletedOrArchivedRequest.ts`), `components/PrintRequestDeletionDialog.tsx`,
   `pages/PrintRequestsPage.tsx` — a single delete/archive no longer triggers a full unbounded
   `listPrintRequests` + N+1 `listPrintRequestItemSummariesForRequests` reload; the affected request is
   reconciled locally (removed on delete, status-patched on archive). Explicit "Refresh"/tab-change reloads are
   unchanged.
3. `apps/portal/features/print-requests/hooks/useMyPrintRequests.ts` — `createPrintRequest` no longer
   unconditionally calls `refreshCustomer()`. Verified safe: the callable's transaction only bumps
   `customers.nextPrintRequestSequence`/`totalPrintRequests`, and the dashboard's only reader of
   `totalPrintRequests` uses it purely as a loading-state fallback before `requests.length` (already refreshed
   by the existing `reload()` call) takes over.
4. `functions/src/onPrintRequestItemCreated.ts`, `functions/src/onShowAllocationCreated.ts` — added a
   transactional idempotency guard against Cloud Functions v2/Eventarc CloudEvent redelivery double-counting
   `requestCount`/`showAddCount`. Guard uses a marker field on the small triggering document
   (`printRequestItems`/`showAllocations`), not a new field on the potentially-hot `designs` document, per the
   Review's requirement to avoid a steady-state cost increase on the catalog-add hot path beyond what the guard
   itself needs.
5. `functions/src/deleteEligiblePrintRequest.ts` — removed the redundant first `buildPreview()` call inside
   `deleteEligiblePrintRequest`; goes straight to the existing recheck-immediately-before-mutate call. Reads for
   one successful delete drop from 3x base preview cost to 2x. `assertOwnerCaller`/`loadCallerProfile` still run
   unconditionally before any preview/recheck work — no authorization check was removed.

## Tests

### New tests

- `apps/studio/src/renderer/src/features/print-requests/utils/reconcileDeletedOrArchivedRequest.test.ts` — 4
  new tests: deletion removes the request and its item summary while leaving others untouched; archiving patches
  status locally without touching other requests; archiving preserves item summaries (only deletion drops them);
  reconciliation targeting a missing ID is a no-op. All 4 pass.

### Why fixes 3, 4, 5 have no new direct unit test

This repository's established testing convention (confirmed by inspecting existing coverage before writing new
tests, e.g. `functions/src/lib/deletionEligibility.test.ts`, `functions/src/clearPortalWorkingPrintRequest.test.ts`)
tests **pure, extracted logic** directly; `onCall`/`onDocumentCreated` function bodies themselves (which own
Admin SDK transaction/read calls) are not directly unit-tested anywhere in this codebase — there is no
emulator-backed harness for that in the existing suite. Fixes 4 and 5 are control-flow/transaction changes
inside existing `onCall`/`onDocumentCreated` bodies with no new pure logic to extract; adding an emulator harness
for these two would be new testing infrastructure beyond this pass's narrow, evidence-backed scope. Fix 3 is a
one-line removal with no new logic. This is disclosed honestly rather than fabricating test coverage; the exact
manual/owner retest for the read-count claims of fixes 4 and 5 is in the Runtime Audit Matrix below.

### Regression verification (existing suites, unmodified by this pass)

- `apps/studio/src/renderer/src/features/designs/utils/generatedReadyDesignMapping.test.ts` — 19/19 pass
  (confirms `useGeneratedDesignLibraryTaxonomy`'s underlying mapping is unaffected by adding a second caller).
- `functions/src/lib/deletionEligibility.test.ts` — 4/4 pass (confirms the eligibility rules
  `deleteEligiblePrintRequest.ts` still calls are unaffected).
- `functions/src/lib/createPortalPrintRequestValidation.test.ts`,
  `functions/src/addPortalCatalogDesignToPrintRequest.test.ts`,
  `functions/src/clearPortalWorkingPrintRequest.test.ts` — all pass (confirm adjacent, previously-remediated
  Functions are unaffected).
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts` and
  `printRequestOversizedSelectionInitialization` (glob-matched via `utils/*.test.ts`) show 5 failures. Confirmed
  via `git stash`/`git stash pop` that these same 5 failures exist at the pre-existing baseline, unrelated to any
  file this pass touched (DPI/print-sizing logic, not reconciliation logic) — consistent with this repo's
  previously documented, unrelated, pre-existing DPI-sizing test debt. Not introduced or worsened by this pass.

## Commands and exact results

```txt
npx tsx --test apps/studio/src/renderer/src/features/print-requests/utils/reconcileDeletedOrArchivedRequest.test.ts
  -> 4/4 pass, exit 0

npx tsx --test apps/studio/src/renderer/src/features/designs/utils/generatedReadyDesignMapping.test.ts
  -> 19/19 pass, exit 0

npx tsx --test functions/src/lib/deletionEligibility.test.ts
  -> 4/4 pass, exit 0

npm run build --prefix functions
  -> exit 0, no errors

npm run typecheck --workspace @fresh-prints/portal
  -> exit 0, no errors

npm run build:portal
  -> exit 0; Next.js production build succeeded, all 19 routes generated, no type errors

npm exec --workspace @fresh-prints/studio -- vite build
  -> exit 0; renderer + Electron main + preload all built successfully (re-run twice, once before and once
     after the reconciliation-util lint fix, both clean)

npx eslint apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx
  apps/studio/src/renderer/src/features/print-requests/components/PrintRequestDeletionDialog.tsx
  apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts
  apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx
  apps/studio/src/renderer/src/features/print-requests/utils/reconcileDeletedOrArchivedRequest.ts
  apps/studio/src/renderer/src/features/print-requests/utils/reconcileDeletedOrArchivedRequest.test.ts
  apps/portal/features/print-requests/hooks/useMyPrintRequests.ts
  functions/src/deleteEligiblePrintRequest.ts
  functions/src/onPrintRequestItemCreated.ts
  functions/src/onShowAllocationCreated.ts
  --max-warnings 0
  -> exit 0, zero errors/warnings (one pre-fix run caught a real `no-unused-vars` finding in the new util file,
     fixed by using `delete` instead of a discarded rest-destructure binding; re-run clean)

git diff --check
  -> exit 0 (only pre-existing LF/CRLF advisory warnings on files this pass did not touch; no blocking
     whitespace-conflict errors)
```

Rules tests were not re-run: no `firestore.rules`/`storage.rules`/index change was made by this pass (the Plan
amendment's boundaries section confirms none was approved), so `npm run test:rules` is out of scope per the
task's own "run Rules tests only if rules or generated security boundaries change" instruction.

## No deployment or production action

No Functions deploy, Portal App Hosting deploy, rules/index deploy, migration, snapshot republish, or production
action occurred. All five fixes are local-only changes verified by the commands above.

## Exact dev Functions requiring redeploy before an owner retest of items 4-5

- `onPrintRequestItemCreated` (item 4 — new transactional idempotency guard)
- `onShowAllocationCreated` (item 4 — new transactional idempotency guard)
- `deleteEligiblePrintRequest` (item 5 — removed redundant preview call)

Items 1-3 are Portal/Studio client-only changes requiring no Functions redeploy.

## Restart requirements

- **Studio**: requires a full restart (build output changed for items 1, 2 — `AiReviewPage.tsx`,
  `usePrintRequests.ts`, `PrintRequestDeletionDialog.tsx`, `PrintRequestsPage.tsx`, new
  `reconcileDeletedOrArchivedRequest.ts`).
- **Portal**: requires a local rebuild/restart (`npm run dev:portal`) for item 3
  (`useMyPrintRequests.ts`). No App Hosting deployment is required or referenced — Portal continues to be
  tested via `npm run dev:portal` + `npm run tunnel:portal`, per this task's explicit environment correction.
- **Cloudflare tunnel**: no restart required (unaffected by any change in this pass).

## Rollback

Every change in this pass is a narrow, git-reversible local diff with no schema migration, no new persisted
collection, and no destructive data change:

- Items 1-3: revert the respective file to its pre-pass state; no data cleanup needed.
- Item 4: the new `requestCountApplied`/`showAddCountApplied` boolean fields are additive and inert if the code
  is reverted — old documents without the field are treated as "not yet applied" (falsy), so reverting the
  trigger code back to unconditional increments is safe and requires no field cleanup.
- Item 5: revert `deleteEligiblePrintRequest.ts` to restore the redundant first `buildPreview()` call; no data
  impact either way, since both versions perform the identical final recheck-then-mutate sequence.

## Owner retest checklist (consolidated)

After the three Functions above are redeployed and Studio/Portal are restarted per the requirements above:

1. **AI Review category filter** (item 1): open AI Review, open the category filter dropdown — same active
   categories appear as before. Firebase Debug panel/Console should show zero `categories` collection reads on
   AI Review mount (previously up to ~200).
2. **Studio delete/archive** (item 2): delete one eligible print request from the list — the row disappears
   immediately with no full-list reload; Firebase Debug panel should show no `listPrintRequests`/
   `listPrintRequestItemSummariesForRequests` calls immediately after. Archive one request with history — its
   status updates to "archived" in place, same no-reload behavior. Use the page's explicit refresh/tab-change
   action afterward and confirm it still performs a full authoritative reload (unchanged).
3. **Portal request creation** (item 3): create a new working print request — dashboard request count updates
   correctly (via `requests.length`, unaffected); Firebase Debug panel should show zero `customers` reads
   immediately after creation (previously one `getDocs`).
4. **Idempotency guard** (item 4): normal catalog-add and show-allocation flows should behave identically
   (`requestCount`/`showAddCount` increment exactly once per real add/allocation) — this is a redelivery-edge-case
   guard, not expected to change any normal-path Console reading. No specific owner action can force a CloudEvent
   redelivery to test this live; correctness relies on the transactional marker-check logic reviewed above.
5. **Delete-preview reads** (item 5): open the delete dialog for a request with 2+ show allocations, confirm
   deletion — Firebase Debug panel / Function logs should show 2 `buildPreview`-equivalent read groups instead of
   3 for that one operation.

Per this task's deployment-boundary rules, this pass stops here.

**READY FOR OWNER COMPREHENSIVE FIRESTORE RETEST**

(Functions redeployment for items 4-5 is required before their specific retest steps can be observed live; items
1-3 are retestable immediately after a local Studio/Portal restart with no Functions redeploy.)
