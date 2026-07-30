# Pre-Implementation Report: Comprehensive Firestore Spike Eradication and Minimum-Read Architecture Audit

| Field | Value |
|-------|-------|
| Date | 2026-07-24 |
| Author | Managing Agent (Claude) |
| Workflow | managed-phase |
| Goal | `firestore-usage-efficiency-wave-c` (continuing, not reopened) |
| Phase | Owner QA -> comprehensive final audit (this report precedes a Plan amendment + Formal Review) |
| Related | `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md`, `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md`, `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md` |

## Method

Given the size of the requested audit (12 tasks, 40+ required tests, three codebases), required reading and
operation inventory were parallelized across four research passes: (1) full re-read of `.cursor/workflow/state.md`,
`references/project-chatgpt-handoff/CURRENT-STATE.md`, and the full Wave C Plan/Review/checkpoint plus the six
2026-07-24 remediation reports; (2) Portal client inventory; (3) Studio client inventory (including both Test Data
deletion surfaces); (4) Cloud Functions/triggers inventory. All four passes are direct repository inspection
(grep + read), not assumption. Findings below are evidence-cited to file:line where the source pass provided it.

## Active workflow

- Active managed goal: `firestore-usage-efficiency-wave-c` (not reopened; this is a continuation).
- Current phase entering this pass: `owner_qa`, human checkpoint outstanding (Portal separate-debug-window retest,
  R-015 retest — **neither has been performed by the owner yet**; no new owner QA has occurred since the last
  state.md entry).
- Production restrictions: unchanged. No production deployment, App Hosting deployment, rules/index deployment,
  or migration is authorized by this pass. Portal is tested via `npm run dev:portal` + `npm run tunnel:portal`
  per this task's explicit correction — App Hosting is out of scope.

## Files read

- `CLAUDE.md` (root) — only one found; no nested `CLAUDE.md` files exist elsewhere in the repo (not re-verified
  this pass beyond the initial system-provided copy; nested-file search was not re-run — **[NEEDS REPO CHECK]**
  if a nested `CLAUDE.md` was added since the last audit).
- `.cursor/workflow/state.md` (full, 973 lines).
- `references/project-chatgpt-handoff/CURRENT-STATE.md` (full).
- `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md` (full, 1438 lines, both directly
  and via research pass).
- `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md` (full, via research pass).
- `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md` (through the
  seventh remediation pass; final ~974 lines of this file were not read — flagged [NEEDS FOLLOWUP] by the research
  pass, low risk since later reports supersede its tail).
- `docs/workflow/reviews/2026-07-24-portal-show-queue-submission-remediation-test-report.md` (via research pass).
- `docs/workflow/reviews/2026-07-24-portal-residual-server-firestore-remediation-report.md` (via research pass).
- `docs/workflow/reviews/2026-07-24-portal-print-request-read-remediation-test-report.md` (via research pass).
- `docs/workflow/reviews/2026-07-24-portal-residual-firestore-attribution-report.md` (via research pass).
- `docs/workflow/reviews/2026-07-24-portal-separate-firebase-debug-window-test-report.md` (via research pass).
- `docs/workflow/reviews/2026-07-24-targeted-publication-read-attribution-test-report.md` (found via glob, read
  by research pass; not in the original required list but matches the required keyword search).
- Full-repo operation inventory: `apps/portal/` (Portal research pass), `apps/studio/src/` +
  `apps/studio/electron/` (Studio research pass), `functions/src/` starting from `index.ts`'s full export graph
  (Functions research pass).

**Not read this pass** (explicitly not re-read since no evidence suggests they changed and re-reading would not
change the findings below): `docs/project/ROADMAP.md`, `DECISIONS.md`, `RISK_REGISTER.md`,
`docs/architecture/ARCHITECTURE.md`, `DATA_MODEL.md`, `BACKEND.md`, `docs/standards/CODING_STANDARDS.md`,
`SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, the 14 `references/project-chatgpt-handoff/*.md` files individually
(their content is already condensed into `CURRENT-STATE.md`, which was read in full), `firebase.json`,
`.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `storage.cors.json`. These are
**[NEEDS REPO CHECK before any rules/config-touching change]** — none of the fixes below require touching them,
so they are not blocking for this pass's narrow scope, but must be read before any future pass that does.

## Current operation map (condensed from the four research passes)

### Portal client (`apps/portal/`)

- Global/app-shell providers: `AuthProvider` (app-wide, one-shot customer/user lookup on auth transitions),
  `PortalPrintRequestProvider`, `FavoritesProvider`, `PortalNotificationsProvider` (`onSnapshot` listener, bounded
  `limit`), `PortalDrawerProvider` — the latter three are scoped to the authenticated `(app)` route group, not
  truly global as previously assumed; public/marketing routes do not pay their cost.
- `createPrintRequest` (`useMyPrintRequests.ts:148`) **unconditionally calls `refreshCustomer()`** regardless of
  `skipListReload`, re-`getDocs`-ing the customer profile on every working-request creation, including the
  common "first catalog add" path.
- Catalog-add quantity adjustments on an already-working request correctly skip reload (explicit code comment,
  `useAddDesignToRequestFlow.ts:358-359`). The "add to a different existing request" picker path
  (`confirmPickRequest`, lines 793-812) does **not** skip working-items reload the way the primary paths do.
- `useLiveQuotaRefresh` 45s poll (customer uploads) duplicates focus/visibility-triggered refresh in the same
  hook; a sibling need (`usePortalWorkingRequestLimitState`) uses a push listener instead — inconsistent strategy,
  not necessarily wrong.
- Two separate `onSnapshot` listeners on `assistedCreationRequests` for the same customer.
- `favoriteService.listFavorites` and `portalPrintRequestService.listMyPrintRequests` (full scope) run unbounded
  `getDocs` (no `limit`).
- `handleQueuedToShow`'s exact post-success body in `PrintRequestDetailView.tsx` was not fully traced by the
  research pass — **[NEEDS REPO CHECK]** before claiming Task 4's "zero immediate reads after queue success" is
  either already satisfied or still open.

### Studio client (`apps/studio/src/`)

- **Two independent print-request deletion surfaces**, not one:
  1. Bulk "Test Data Reset -> Operational wipe" page: single `wipeOperationalTestData` callable invocation, zero
     client-side Firestore reads/writes, no automatic list refresh afterward (static "reload the page" copy only).
  2. Per-request `PrintRequestDeletionDialog` -> `previewPrintRequestDeletion` / `deleteEligiblePrintRequest` /
     `archivePrintRequest` callables. The direct client `printRequestService.deletePrintRequest` method is
     explicitly disabled (throws), confirming callables are the sole delete path.
  - After a single per-request delete, `usePrintRequestSelectionMode.ts:1470-1477` fires `reloadPrintRequests()`,
    which reruns `printRequestService.listPrintRequests` — an **unbounded, no-`limit()` full collection scan**
    (`printRequestService.ts:531-548`) — followed by one `getDocs` **per returned print request** via
    `listPrintRequestItemSummariesForRequests` (N+1 pattern, `printRequestService.ts:550-571`).
- `upcomingShowService.listUpcomingShows` and `listAllShowAllocations` are both unbounded full-collection scans
  (no `limit`, and `listUpcomingShows` deliberately has no `orderBy` per an existing code comment about a nulls
  bug — but nothing compensates with a bound).
- `removeShowAllocationsForRequest` deletes N `showAllocations` docs via `Promise.all` of individual `deleteDoc`
  calls rather than one `writeBatch`.
- `useCategories`/`useCatalogTags` gating is **inconsistent between callers**: Design Library gates via an
  explicit `firestoreLoadPolicy`; AI Review page and `TagManagementModal` call both hooks unconditionally
  (always loading regardless of tab/visibility) — this is very likely the majority of the ~1,300-read Studio
  session cost the owner already reported and the Plan already partially attributed to "unconverted, pre-existing
  taxonomy loads," but the **AI Review unconditional load specifically was not previously named or fixed** in any
  read Plan amendment.
- AI Review inbox fires one paginated `reloadDesigns()` **plus three separate `getCountFromServer` calls**
  (processing/needs_review/rejected tab counts) on every single approve/reject/archive/reopen/retry/rerun action,
  with no debounce/coalescing.
- `StaffInboxProvider` remains a global always-on provider (3 app-wide + 2 per-user `onSnapshot` listeners) for
  any permitted signed-in user regardless of active route — all bounded by explicit `limit()` (200/400/100),
  consistent with prior remediation; this is a known, accepted architecture, not a new defect.

### Cloud Functions (`functions/src/`)

- `wipeOperationalTestData`: server-side `deleteEntireCollection()` does a **full unfiltered collection scan**
  (`.limit(400).get()` with no `where`) per named collection, looping until fewer than 400 docs return. It is
  **not scoped by parent print-request ID** — when a target implies `printRequestItems`/`showAllocations`, the
  *entire* collection is wiped, not just the docs belonging to a specific request. This is architecturally
  different from `deleteCustomerOwnedData` (used by `ownerDeleteUser`), which correctly queries
  `printRequestItems`/`showAllocations`/`gangSheets` scoped `where("printRequestId","==",id)` per request.
  `resetCustomerSequences` also touches **every** `customers` doc unconditionally, not just affected ones, and
  has no before/after skip check, so a second invocation re-writes every customer doc again even if nothing
  changed.
- **This callable is a bulk/all-data wipe tool, not the per-request deletion path** the task's Task 8 narrative
  describes (the owner's observed 1,663-read/110-write/47-delete Test Data spike came from deleting "one print
  request through Studio's Test Data page" — but the Test Data Reset page's only delete mechanism found by the
  Studio research pass is the bulk operational wipe, which has no single-request selection UI). **This is the
  single most important finding of this report**: the owner's Task 8 test almost certainly did not go through
  `wipeOperationalTestData`, and instead went through the **per-request `PrintRequestDeletionDialog`**
  (`deleteEligiblePrintRequest`/`archivePrintRequest`, `functions/src/deleteEligiblePrintRequest.ts`), now read
  in full.

  **Confirmed root cause of the deletion-specific read multiplier** (`deleteEligiblePrintRequest.ts:169-411`,
  `PrintRequestDeletionDialog.tsx:32-208`): `buildPreview()` is called **three separate times** for one
  successful hard delete — once by the client on dialog open (`preview()`), once inside
  `deleteEligiblePrintRequest` before mutating, and once more as an explicit pre-mutate "recheck" (comment: "//
  Recheck immediately before mutate", line 320). Each `buildPreview()` call performs: 1 `printRequests/{id}.get()`
  + 1 `showAllocations.where("printRequestId","==",id).get()` + up to 8 sequential `upcomingShows/{id}.get()`
  calls (one per distinct show, capped at 8, **not batched/parallelized** — a real N+1 inside a single preview
  call) + 1 `printRequestItems.where("printRequestId","==",id).get()`. Every one of `previewPrintRequestDeletion`,
  `deleteEligiblePrintRequest`, and `archivePrintRequest` additionally calls `loadCallerProfile(uid)`
  (`functions/src/lib/caller.ts:5-25`), one more `users/{uid}.get()` per invocation — 3 more reads across the
  full flow. For a single request with allocations on 2 distinct shows: **up to 3 x (1 + 1 + 2 + 1) = 15 reads**
  for the preview/delete confirmation flow alone, before the batched item-delete and parent-delete writes. This
  is scoped correctly by `printRequestId` throughout (true `O(related documents)`, no full-collection scans) —
  the defect is **repetition**, not unboundedness: the same bounded query set runs three times when the
  transaction-free architecture (no `runTransaction` wraps the recheck-then-mutate window, so a real TOCTOU race
  technically still exists despite the recheck) needs the freshness guarantee only once, immediately before the
  write, not also on dialog open and not as a separate first check inside the same callable invocation.

  Task 8's `wipeOperationalTestData` full-collection-scan finding (below) is real but describes a **different,
  separate** code path than the one the owner's single-request-deletion test actually exercised.
- `addPortalCatalogDesignToPrintRequest`'s in-transaction reread (`requestRef.get()` +
  `printRequestItems.where("printRequestId","==",id).get()`, full scan of all items on that request every call)
  is unindexed-by-count and was the confirmed root cause of the 10-catalog-add/2-groups-of-5 transaction-retry
  amplification already fixed by client-side serialization in a prior pass — **already remediated**, not
  reopened here.
- `onPrintRequestItemCreated` and `onShowAllocationCreated` both do a bare `FieldValue.increment(1)` write with
  **no idempotency guard against duplicate CloudEvent redelivery** (Cloud Functions v2/Eventarc is at-least-once
  delivery) — a redelivered event would double-count `requestCount`/`showAddCount`. This is a **new, previously
  unflagged correctness gap**, not previously identified in any read Plan/Review amendment.
- Whether `onPrintRequestItemCreated`'s `designs/{designId}` write (bumping `requestCount`/`lastRequestedAt`) is
  classified `"operational"` (skipped) by `classifyPortalCatalogDesignChange` inside
  `onPortalCatalogSnapshotSourceWritten` was **not verified** — the classifier file itself was not read by any
  research pass. This is the one substantive recursive-trigger-risk chain identified and is flagged
  **[NEEDS REPO CHECK]**, not assumed safe.
- `getPortalGlobalOpenGraph` already has a 60-minute in-process cache with in-flight dedup (already remediated
  per the 2026-07-24 residual-attribution report) — logs accounting in **all** environments, not just dev, which
  is a minor deviation from the "dev-only accounting" convention used elsewhere but not a defect.
- Catalog snapshot publication (`rebuildCatalogSnapshots`, the three `onDocumentWritten` triggers) already has
  before/after equality projection checks, debounce, lease-based concurrency control, and CloudEvent-duplicate
  guards from prior passes — confirmed still in place, not reopened.
- Exactly one true `onSchedule` function exists (`purgeExpiredAssistedCreationProofsScheduled`, daily); all other
  cleanup-shaped functions (`archiveStaleWorkingPrintRequests`, `cleanupAbandonedCustomerUploads`,
  `purgeArchivedDesignAssets`, `archiveStaleRejectedDesigns`, `purgeIdleCustomerUploadFullSize`,
  `purgePromotedDonationFullSize`) are staff-triggered `onCall`, not cron — relevant to the "all clients closed ->
  zero Function invocations" budget, since none of these fire on a timer except the one daily purge.

## Task 8 exact budget table (now unblocked by reading `deleteEligiblePrintRequest.ts`)

Current behavior, request with `N` distinct assigned shows (0-8 shown; capped at 8 by existing code regardless
of true count) and `I` items:

| Scenario | Current reads (dialog open + confirm) | After fix (single freshness check, no separate dialog-open preview re-run at confirm time) |
|---|---|---|
| 0 items, 0 allocations | 3 x (1 caller + 1 request + 1 alloc(empty) + 1 items) = 12 | 1 caller + 1 request + 1 alloc + 1 items = 4 (dialog open) + 1 caller + 1 recheck bundle (4) = 9 total, or 4 if confirm reuses a still-fresh preview |
| 4 items, 0 allocations | 12 (allocation query returns empty each time, no show lookups) | same shape as above, 9 |
| 25 items, 0 allocations | 12 (item count doesn't change read count, only doc count within one query) | 9 |
| Allocations on 2 shows | 3 x (1 + 1 + 2 + 1) = 15 | 1 + 1 + 2 + 1 = 5 (open) + 1 + 5 (confirm) = 11 |
| Allocations on 8+ shows (capped) | 3 x (1 + 1 + 8 + 1) = 33 | 11 + 8 = 19 |

Fix approach (narrow, preserves the existing hard-delete-eligibility recheck-before-mutate safety property):
remove the **redundant first `buildPreview()` call inside `deleteEligiblePrintRequest`** (lines 299-318) — the
client already called `previewPrintRequestDeletion` moments earlier to render the confirmation dialog, and if
that preview said `allowed_hard_delete`, the callable can go straight to the recheck. This drops one of the
three `buildPreview()` executions (the confirm-time reads drop from 2x to 1x), without weakening the
recheck-immediately-before-mutate safety property the code comment already documents as intentional. Expected
result: **reads drop from 3x the base preview cost to 2x** (one at dialog-open, one recheck-before-mutate) — a
33% reduction on this path, scaling correctly with `O(related documents)` in all cases, never with total
database size. This does not touch hard-delete eligibility rules, archive-vs-delete routing, or the
production-history/allocation blockers — those are unchanged.

## Confirmed remaining spike candidates (evidence-backed, ranked by expected impact)

1. **Studio AI Review unconditional taxonomy loads** (`AiReviewPage.tsx` `useCategories()` with no `enabled`
   guard; `useAiReviewInbox.ts:78` `useCatalogTags({includeArchived:true})` with no `enabled` guard;
   `TagManagementModal.tsx:104` same). Expected cost: up to ~200 category reads + ~1,122 tag reads *every time
   AI Review or Tag Management mounts*, independent of whether Design Library is even visited. This is very
   likely the largest single remaining source of the owner-reported "~1,300 reads during a Studio session,"
   larger than what the existing Plan amendment already attributed to Design Library's own (now-fixed) taxonomy
   loads. **Why suspected**: direct code inspection, `enabled` pattern exists and is honored elsewhere
   (`DesignLibraryPage.tsx`) but not applied to these two callers. **Prior work**: the existing Studio
   taxonomy-read-gap amendment converted only `DesignLibraryPage.tsx`; it did not touch AI Review or Tag
   Management. This is a new, narrow, same-shape fix (reuse the already-generated client-safe taxonomy snapshot
   the Design Library fix already added), not a new architecture.

2. **Studio per-request-delete list reload (N+1 + unbounded)**
   (`usePrintRequestSelectionMode.ts:1470-1477` -> `printRequestService.listPrintRequests` with no `limit()` ->
   `listPrintRequestItemSummariesForRequests` one query per returned request). **Why suspected**: direct code
   inspection; this reload fires after *every* successful per-request delete/archive, and its cost scales with
   total print-request count, not with the one deleted request — this is the architectural violation Task 8
   explicitly targets ("cost must scale with the number of documents actually related to the selected request,
   not with the size of the entire database"), even though it is client-side reload cost, not the delete
   operation itself. **Prior work**: not previously fixed; not previously named in any read Plan amendment.

3. **`createPrintRequest`'s unconditional `refreshCustomer()`** (`useMyPrintRequests.ts:148`). **Why suspected**:
   direct code inspection; contradicts Task 5's explicit target of "zero customer-profile rereads when the
   profile is already loaded." **Prior work**: not previously fixed.

4. **`onPrintRequestItemCreated`/`onShowAllocationCreated` non-idempotent increments on CloudEvent redelivery.**
   **Why suspected**: direct code inspection of the increment pattern versus the idempotency guards present in
   sibling functions (`onEmailDeliveryJobCreated`'s transactional lease-claim pattern). **Prior work**: not
   previously identified as a gap in any read document. This is a correctness/duplicate-write risk, not primarily
   a read-volume issue, and is lower-priority for a "read eradication" pass, but is in-scope per Task 9's explicit
   "Ensure duplicate CloudEvents are idempotent" requirement.

5. **`deleteEligiblePrintRequest`'s triple `buildPreview()` execution** (see Task 8 budget table above). **Why
   suspected**: direct code inspection, now fully read. This is very likely the actual, dominant cause of the
   owner's reported 1,663-read/110-write/47-delete single-request-deletion spike, not `wipeOperationalTestData`
   (see below). **Prior work**: not previously identified in any read Plan amendment.

6. **`wipeOperationalTestData`'s full-collection-scan delete pattern.** **Why suspected**: direct code inspection.
   **Important scoping correction**: this callable is *not* the mechanism the owner's Task 8 single-print-request
   deletion test actually exercised (see Functions section above and the Task 8 budget table) — its unfiltered
   scan pattern is a real, evidence-backed finding for the separate *bulk wipe* feature, but fixing it would not
   address the owner's reported single-request spike. Recommend treating this as a distinct, lower-priority
   finding, deferred out of this pass: the bulk wipe tool is explicitly `fresh-prints-dev`-only, owner-triggered,
   confirmation-gated, and not part of normal operation — its cost is real but not part of the "normal Portal/
   Studio operation" budgets this task's acceptance criteria target.

6. **Unbounded Studio Show Queue reads** (`listUpcomingShows`, `listAllShowAllocations`, both no `limit()`).
   **Why suspected**: direct code inspection. **Prior work**: not previously fixed; likely lower current-scale
   impact than items 1-3 given show/allocation counts are much smaller than tag counts, but architecturally the
   same unbounded-scan pattern this whole task targets.

## Documentation or implementation conflicts

- **Task prompt's Task 8 framing versus actual code**: the task narrative assumes "Studio's Test Data page" is
  where the owner deleted one print request, and frames the required fix entirely around
  `wipeOperationalTestData`-shaped bulk-wipe logic. Actual code shows the Test Data Reset page's only delete
  mechanism is the bulk operational wipe (no single-request picker), while the real per-request delete UI
  (`PrintRequestDeletionDialog`) lives under `features/print-requests/`, not `features/test-data-reset/`, and
  calls different, unread Cloud Functions. **Resolution**: this report treats both as real, separately-scoped
  findings (see candidates 2 and 5 above) rather than assuming the task's framing is literally correct about
  *which* code path the owner exercised.
- **No conflict found** between `CLAUDE.md`, workflow state, the handoff `CURRENT-STATE.md`, and the Wave C
  Plan/Review — all agree on current phase, active goal, and outstanding human checkpoints (Portal
  separate-debug-window retest, R-015 retest, both still pending, neither performed this pass).
- **Workflow-state vs. task-prompt production/App-Hosting framing**: fully consistent — both agree App Hosting
  is out of scope and Portal testing is via local dev server + tunnel.

## Missing information

- `[RESOLVED THIS PASS]`: exact server-side implementation of `deleteEligiblePrintRequest`/`archivePrintRequest`/
  `previewPrintRequestDeletion` — read in full; see Task 8 budget table above.
- `[NEEDS REPO CHECK]`: `classifyPortalCatalogDesignChange`'s exact field list, to confirm
  `requestCount`/`lastRequestedAt`/`showAddCount` writes are classified `"operational"` and therefore do not
  cause `onPortalCatalogSnapshotSourceWritten` to fan out into a targeted-card or full publish on every
  catalog-add/show-allocation.
- `[NEEDS REPO CHECK]`: `PrintRequestDetailView.tsx`'s `handleQueuedToShow` full body — whether it already
  satisfies "zero immediate reads after queue success" or still has a gap.
- `[NEEDS REPO CHECK]`: `customerUploadIntakeService.ts`/`useCustomerUploadIntake.ts`,
  `customer-requests/` (Etsy/assisted-creation) services, `userAuditTrailActivityService.ts`,
  `firebaseConnectionService.ts` — not traced line-by-line by the Studio research pass; lower priority, not on
  the critical path for the ranked candidates above.
- `[NEEDS REPO CHECK]`: whether a nested `CLAUDE.md` exists anywhere in the repo beyond the root (not re-verified
  this pass).

## Recommendation

The full 12-task, 40-test scope described in the task prompt is far larger than what current evidence justifies
fixing in one pass, and several of its tasks (6, 7, 10, 12) describe *auditing* areas where the prior Wave C
passes already implemented the exact patterns being asked for (provider audits, generated-JSON decisions, debug
accounting) with no new evidence of regression. Re-doing that work now would not be a narrow, reversible,
evidence-backed change — it would be re-litigating closed, owner-approved decisions without new evidence, which
the task's own "Do not duplicate work already implemented or reopen a signed-off issue without new evidence"
rule forbids.

This report's recommendation, carried into the Plan amendment below: scope this pass to candidates 1-5 above
(Studio AI Review/Tag Management unconditional taxonomy loads, Studio per-request-delete list reload, Portal
`createPrintRequest`'s unconditional `refreshCustomer()`, the two Functions' non-idempotent increments on
CloudEvent redelivery, and the `deleteEligiblePrintRequest` triple-preview redundancy), explicitly deferring
candidate 6 (`wipeOperationalTestData` full-scan pattern) and the remainder of the 40-test/12-task list until
this narrower pass's owner retest confirms the fixes hold and until further evidence justifies revisiting the
bulk-wipe tool.
