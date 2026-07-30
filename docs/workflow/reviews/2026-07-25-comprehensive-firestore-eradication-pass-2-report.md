# Comprehensive Firestore Cost Eradication — Pass 2 Final Report

| Field | Value |
|-------|-------|
| Date | 2026-07-25 |
| Goal | `firestore-usage-efficiency-wave-c` |
| Supersedes | the 2026-07-24 narrowed five-item pass (independently audited this pass, not trusted) |
| Related | Wave C Plan 2026-07-25 amendment; Wave C Review 2026-07-25 independent verdict (`approved_with_changes`, both findings resolved); `2026-07-24-comprehensive-firestore-eradication-pre-implementation-report.md` (operation inventory) |

## Method

Three parallel source audits (Portal mutation chains; deletion formula/wipe/allocation callers; remaining-area
sweep) plus an isolated independent reviewer that did not author any change. The four owner evidence items were
each resolved as required: fixed this pass, or proven already-fixed in current source with line citations.

## Owner evidence resolution

| Owner evidence | Resolution |
|---|---|
| Catalog-add refresh chain (draft+editing+1+2+3+4 items) | **Proven fixed in current source** — single-add path consumes the callable item DTO, zero post-success reads (`useAddDesignToRequestFlow.ts:322-359`). Owner's trace predates the unrestarted build. |
| Queue-success 1 request + 4 items + 4 allocations reread | **Root-caused and fixed this pass** — fired via two effects: `usePrintRequestDetail.ts` working-transition reload (was lines 213-218) and the detail view's status-keyed allocation effect. `reconcileQueued()` now clears the transition refs synchronously; `handleQueuedToShow` arms a one-shot allocation-load suppression. Target met in source: 0 immediate client reads after queue success. |
| Request-creation rereads | **Proven fixed** — `refreshCustomer()` removed (pass 1); no draft/editing/empty-item query on the primary path (`useMyPrintRequests.ts:136-156`, `useWorkingCurrentRequestItems` keys off `workingRequest.id`, not the pending ID). |
| Studio single-request deletion ~1,663 reads | **Exact formula established.** Current: `4 + 2I` reads, `I + 1` writes, 0 post-delete client reads, 0 triggers (no `onDocumentDeleted` exists for these collections). Historical spike reconstructs as the removed post-delete `reloadPrintRequests` (R unbounded list reads + N+1 summaries ≈ 3R) + `listAllShowAllocations` full scan (A): e.g. R≈300, A≈760 → ≈1,660. Not the bulk-wipe tool. |

## Changes (both passes, all locally verified)

Pass 1 (independently audited this pass): AI Review categories → generated taxonomy; Studio delete/archive
local reconciliation (+ new pure util, 4 tests); Portal `createPrintRequest` `refreshCustomer` removal;
transactional redelivery guards in `onPrintRequestItemCreated`/`onShowAllocationCreated`;
`deleteEligiblePrintRequest` redundant preview removal.

Pass 2:
1. **Queue-success suppression** — `usePrintRequestDetail.ts` (`reconcileQueued` clears
   `wasViewingWorkingRef`/`lastSyncedWorkingSignatureRef`), `PrintRequestDetailView.tsx`
   (`skipAllocationLoadAfterQueueRef` one-shot, armed in `handleQueuedToShow`).
2. **Wipe reset no-op skips** — `wipeOperationalTestData.ts`: all three reset scans now skip already-reset
   docs; batches commit only when non-empty; the design-stats skip also stops bumping `updatedAt`, which
   previously fired one `onPortalCatalogSnapshotSourceWritten` invocation per design per repeat wipe.
   Repeat wipe over reset data now costs reads only.
3. **Studio item-summary N+1 removal** — `printRequestService.listPrintRequestItemSummariesForRequests` now
   uses chunked `where('printRequestId','in',chunk)` (cap 10): identical summaries in `ceil(N/10)` queries
   instead of `N`. Benefits every Print Requests list load, not just deletion.
4. **Review-required fix** — AI Review surfaces "Category filters are temporarily unavailable." on generated
   taxonomy failure (fail-closed, now visible).

## Independent review

Verdict `approved_with_changes`; finding 1 fixed (above), finding 2 investigated and attributed to
pre-existing dirty-worktree work from an earlier Wave C pass (session-start `git status` predates this pass's
first edit). Full detail in the Review doc's 2026-07-25 section. Idempotency-guard steady-state cost
(+1 read/+1 marker write per real event, bounded, no new collection) reviewed and accepted.

## Before/after budget table

| Workflow | Before | After | Evidence |
|---|---|---|---|
| Closed baseline | 0 client-origin; one daily scheduled purge | unchanged (0; one `onSchedule` daily purge exists repo-wide) | Functions export-graph audit |
| Portal 5-min idle | 0 (proven in prior owner R-015 trace) | unchanged 0; quota poll proven callable-only, panel-scoped, cache-guarded | sweep audit #4 |
| Studio 5-min idle | bounded listeners only (limits 200/400/100 + single-doc settings + badge) | unchanged; no new listeners | sweep audit #7, #9, #10 |
| Discover/Library/search/filter navigation | 0 Firestore (generated, owner-verified) | unchanged 0 | R-015 closed |
| First design detail open | 1 authoritative read | unchanged 1 | existing bounded `getDesignById` |
| Request creation (Portal) | 1 customer reread + conditional list reload | 0 customer reread; 0 on skip path | pass 1 fix + audit A |
| Add 1 catalog design (existing working request) | 0 in current source (DTO reconciliation) | unchanged 0 | audit A citations |
| Add 4 catalog designs | 0 client reads post-success (was draft+editing+1..4 items on old build) | unchanged 0; serialized server calls | audit A |
| Open 4-item request cold | 1 request + 4 items (+summaries via cache) | unchanged, ≤6 request-specific | prior pass, unchanged |
| Repeat request navigation | 0 within 30s read cache | unchanged | `portalPrintRequestReadCache` |
| Queue 4-item request, post-success client | **1 + 4 + 4 = 9 reads** | **0 reads** | pass-2 fix 1 |
| Studio Print Requests list load (R requests) | R list + R summary queries | R list + ceil(R/10) summary queries (same docs) | pass-2 fix 3 |
| Empty request deletion | 4 reads / 1 write (post-pass-1) | unchanged 4 / 1 | formula |
| 4-item deletion | 12 reads / 5 writes | unchanged 12 / 5 | formula `4+2I`, `I+1` |
| 25-item deletion | 54 reads / 26 writes | unchanged 54 / 26 | formula |
| Repeat deletion (already gone) | 4 reads / 0 writes | unchanged — idempotent no-op | formula |
| Old-build single deletion | ~1,663 reads observed | eliminated (0 post-delete reads; local reconciliation) | formula reconstruction |
| Repeat bulk wipe over already-reset data | N writes + N trigger invocations (designs) | **0 writes, 0 trigger invocations** (reads only) | pass-2 fix 2 |
| Duplicate analytics trigger event | double-count risk | idempotent no-op (marker read, 0 writes) | pass-1 guards |
| Metadata cache hit / library miss / logo miss | 0 / 1 / 2 settings reads, 0 design reads | unchanged — verified in source | audit A item 4 |
| Unchanged push registration | 0 writes, ≤25-sibling bounded read | unchanged — verified | audit A item 4 |
| AI Review cold load | up to ~200 category reads + inbox page + 3 counts | **0 category reads** + inbox page + 3 counts | pass-1 fix + generated snapshot |

## Deferred with documentation (behavior-change or already-mitigated; no new regression evidence)

AI Review per-action `reloadDesigns`(≤100)+3 counts (staleness semantics); unbounded
`listPrintRequests`/`listUpcomingShows`/`listAllShowAllocations` (staff-visible completeness; would need
aggregate-counter data model); upload-intake per-row enrichment (cached per row already); Portal
favorites/full-history (domain-bounded, cached). Recursion risk closed: change classifier confirms
counter/timestamp-only design writes are `"operational"` (no publication).

## Verification (all run this pass, exit codes recorded)

- `npm run build --prefix functions` — exit 0 (run after every functions edit)
- `npm run typecheck --workspace @fresh-prints/portal` — exit 0
- `npm run build:portal` — exit 0 (production build completed through static generation)
- `npm exec --workspace @fresh-prints/studio -- vite build` — exit 0 ×3 targets (renderer/main/preload),
  re-run after each Studio edit
- `npx tsx --test` focused + regression: 49/49 (read cache, submission owner, mutation queue, progress
  polling, catalog asset service, quota cache, catalog-add, clear, OpenGraph, push, deletion eligibility)
  plus 4/4 reconcile util, 7/7 combined re-run — 0 failures
- `npx eslint <changed files> --max-warnings 0` — clean (one pre-existing unused-param finding in the
  disabled `deletePrintRequest` stub resolved by dropping its unused params; no callers exist)
- `git diff --check` — exit 0
- Rules tests not run: no rules/index/generated-contract change in either pass

Pre-existing unrelated failures: the 5 DPI/print-sizing test failures confirmed via `git stash` in pass 1
remain pre-existing and untouched.

## Deployment (dev only, authorized by the pass-2 directive after review+tests)

Functions changed across both passes and deployed to `fresh-prints-dev`:
`onPrintRequestItemCreated`, `onShowAllocationCreated`, `deleteEligiblePrintRequest`,
`wipeOperationalTestData`. No rules/index/App Hosting/production/CORS/migration action. No generated-asset
contract changed — no republish needed.

**Deployment record (2026-07-25):** `npx firebase-tools deploy --only
functions:onPrintRequestItemCreated,functions:onShowAllocationCreated,functions:deleteEligiblePrintRequest,functions:wipeOperationalTestData
--project fresh-prints-dev --non-interactive` — exit 0. All four reported "Successful update operation"
(Node.js 20, 2nd Gen, us-central1); "Deploy complete!". Only the four named functions were updated — the
deploy log shows no other function touched.

## Rollback

Every change is a git-reversible local diff. Idempotency markers (`requestCountApplied`/
`showAddCountApplied`) are additive and inert if code reverts. Function rollback = redeploy prior revision of
the four functions. No data migration in either direction.
