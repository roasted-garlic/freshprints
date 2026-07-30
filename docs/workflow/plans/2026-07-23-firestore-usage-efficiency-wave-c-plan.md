# Plan: Firestore Read Efficiency Wave C

## 2026-07-26 amendment — Private print-request JSON read model (pass 6) ABANDONED and REMOVED; bounded Firestore (pass 5, below) is the permanent Print Requests path

Pass 6 (below) added private, generated Studio/Portal print-request JSON read-model caches on top
of pass 5's bounded Firestore architecture. The implementation was completed, corrected twice for
real defects (a manifest/page path-orphaning bug, then an immutability violation), deployed to
`fresh-prints-dev`, and staged for a controlled real-publication test. The owner then abandoned the
architecture entirely after the final runtime evidence showed it never actually eliminated the
Firestore/latency cost it was built to remove (~10s load, ~5.29s manifest callable, and 4 count
queries + 1 item query + 4 catalog design reads still occurring). See ADR-FP-121 in
`docs/project/DECISIONS.md` for the full decision record.

**All pass-6 read-model source has been removed.** This plan document's pass-6 section below is
preserved as historical record of what was built and why — it does not describe the current
architecture. Pass 5's bounded Firestore architecture (queueTab, server pagination, exact
`getCountFromServer` counts) is the current, permanent, and sole Print Requests read path.

## 2026-07-25 amendment — Studio Print Requests bounded hydration (pass 5)

### Context

Pass 4 (249-read spike) explicitly deferred the Print Requests page's own unbounded hydration
(full `printRequests`, `customers`, `showAllocations`, `upcomingShows` collection scans on every
mount) as a flagged gap requiring explicit owner approval. The owner directed the strict bounded
architecture: no full-corpus scan ever, exact tab counts (never approximate), a maintained field
if exact bounded counting is genuinely impossible, server pagination, page/selection-scoped
supporting reads, and a safe resumable dry-run-capable backfill gated at a human checkpoint.

### Architecture decision: maintained `queueTab` field

Tab membership (Working/Queued/Printing/Printed) is derived from item-quantity and
allocation-quantity sums — there is no raw Firestore field to filter or `getCountFromServer`
against, and Firestore cannot compound two inequality filters (would be needed for an equivalent
of the derivation without a persisted field). Per the owner's explicit direction, this genuinely
qualifies as "exact indexed queries are impossible" — the correct fix is a maintained
`printRequests/{id}.queueTab` field (see `packages/shared/src/types/printRequest/printRequest.types.ts`),
kept in sync by two new narrowly-scoped triggers
(`functions/src/onPrintRequestQueueTabInputsWritten.ts`):
`onPrintRequestItemQueueTabInputWritten` (`printRequestItems`, create+update+delete) and
`onShowAllocationQueueTabInputWritten` (`showAllocations`, create+update+delete). Each event:
resolves the affected `printRequestId` from the event payload (before/after), skips immediately if
the relevant field (item quantity; allocation quantity+status) did not change, then recomputes via
the new pure `computePrintRequestQueueTab` (`packages/shared/src/utils/printRequestQueueTabRecompute.ts`,
9 tests) using only that one request's own parent doc + its own items + its own allocations — never
a corpus scan — and writes `queueTab` only when the derived value actually changed (unchanged-value
no-op). Never written to a design; never used for production/print authority.

Active/Stale/Empty triage (a secondary filter *within* the Working tab, not one of the four primary
tabs) is **not** given a maintained field: it depends on `itemCount` (already a raw field) and
`updatedAt` age, which cannot be exactly counted in one indexed query (two independent inequality
filters), but the owner's directive frames primary tab counts as the "must be exact, never
approximate" requirement — the triage chips are a secondary, in-page-only filter, not a corpus-wide
count, and are computed exactly over whatever page is currently loaded (transparent about scope, not
approximated silently). Flagged explicitly for review as an interpretation, not decided unilaterally.

### Bounded service layer (`printRequestService.ts`)

New methods, all either single-page-bounded or ID-scoped: `listPrintRequestsPage` (server-paginated,
`updatedAt DESC, __name__ DESC` cursor, page size 50, +1-peek `hasMore` detection — mirrors the
Design Library's existing convention), `countPrintRequests` (`getCountFromServer` against the same
filter the list page uses — exact, zero document hydration), `getPrintRequestsByIds` (direct reads,
for deep-linked/off-page selections), `listAllocationTotalsForRequests` (chunked `in` queries scoped
to the visible page's request IDs, reusing the existing pure `buildPrintRequestAllocationTotalsByRequestId`
grouping — identical totals to a full scan, since grouping has no cross-ID dependency),
`listCustomersByIds` (direct reads, scoped to the page's non-internal requests' customer IDs),
`listPrintRequestsByCustomer` (customer-scoped, replaces the one non-list-page caller of the removed
unbounded `listPrintRequests`, in the customer audit-trail activity feed — naturally bounded by that
customer's own request count). `listCustomers` (full scan) and `listAllPrintRequestsForBackfillOnly`
are retained, explicitly marked deprecated/scope-limited: the former only for the create-request
"choose a customer" picker (a real full-directory need, now lazy-loaded only when that form control
is shown); the latter only for the one-time backfill script.

### Bounded hook (`usePrintRequests.ts`) and page rewrite

`usePrintRequests(activeTab)` now loads exactly one tab's bounded page plus all four tabs' exact
counts (cached), hydrating only the visible page's summaries/allocations/customers. A new
auth-scoped remount cache (`printRequestsPageReadCache.ts`, 8 tests, mirrors Portal's proven
`portalPrintRequestReadCache`) makes returning to the page within the session free. Every mutation
handler in `PrintRequestsPage.tsx` (update/remove/duplicate item, save request detail, create
request, add/remove show queue) now reconciles the visible row locally instead of a full-list
reload — extending the delete/archive local-reconciliation pattern already merged in pass 1/2 to
every mutation on this page. Deep-linked/selected requests outside the loaded page are fetched
directly by ID (`ensureRequestLoaded`), never by widening the page query. Full-corpus
`useCustomers`/`usePrintRequestAllocationTotals`/`useUpcomingShows` hooks are removed from this
page entirely; shows are now fetched by ID only for the selected request's own allocation groups
(`upcomingShowService.getUpcomingShowsByIds`) — `useUpcomingShows`/`listUpcomingShows` remain
unchanged for the Show Queue page, which genuinely manages the whole show corpus.

### Backfill (built, NOT run — human checkpoint)

`functions/src/backfillPrintRequestQueueTab.ts`: owner-only, `fresh-prints-dev`-only (reuses
`isOperationalWipeAllowedProjectId`), confirmation-phrase-gated, `__name__`-cursor-paginated
(bounded 400/page, resumable via `startAfterRequestId`), dry-run supported, skips already-correct
values (idempotent, safe to re-run or re-invoke with overlapping ranges). Not wired into any
automatic path — requires explicit manual invocation. **This pass does not run it.** Existing
`printRequests` documents will lack `queueTab` until the owner explicitly approves and runs the
backfill; until then, pre-existing requests are simply absent from the new bounded tab
queries/counts (a real, disclosed limitation of not yet backfilling) — newly created/mutated
requests get a correct `queueTab` immediately via the two new triggers regardless.

### Boundaries

No rules/index/schema-breaking change (the new field is additive, optional). No production/App
Hosting action. Backfill execution requires an explicit separate owner approval and is out of scope
for this implementation pass.

| Field | Value |
|-------|-------|
| Date | 2026-07-25 (pass 5) |
| Status | approved_with_changes — all 4 required findings resolved; 46/46 tests, builds, lint, diff-check clean |

---

## 2026-07-25 amendment — 249-read Studio request-creation spike (pass 4)

### Attribution (log-proven + code-proven)

Deployed Function logs for 19:13:30-19:16:30Z prove the server side is already constant-cost and clean:
exactly 4 `onPrintRequestItemCreated` executions (each `readOperations: 1, writes: 2,
transactionAttempts: 1, duplicateSkip: false` — the pass-1 idempotency guard's exact budget), exactly 4
`onPortalCatalogSnapshotSourceWritten` executions (all `classification: "operational"`, `mode: "none"`,
0 reads/0 writes — no publication), **no other function in or adjacent to the window** (19:12-19:13 and
19:15-19:16 empty). Server total: 8 reads of 249. The ~241 remainder is therefore untraced Studio client
reads, and code inspection identifies them exactly:

1. **Per-add hidden reads** in `printRequestService.addPrintRequestItem`: an unconditional parent
   `getPrintRequestById` + full `listPrintRequestItems` (growing 0..3 docs) before every add, plus a
   `getDoc` read-after-write per created item — ~4 + 6 + 4 ≈ 14 untraced reads across 4 adds.
2. **Print Requests page mount/remount hydration** — returning from Design Library selection mode
   remounts the page and refires `listPrintRequests` (unbounded R), chunked item summaries (all items),
   `listCustomers` (C), `listAllShowAllocations` (full A scan), `listUpcomingShows` (full S scan) — none
   read-traced, which is why the debug report showed only 4 reads. At dev-corpus scale this hydration is
   the dominant ~220+ read block, consistent with activity confined to 19:14:23-32.

### Approved scope (implemented)

1. `addPrintRequestItem`: parent update uses `increment(1)` (no parent read; safer under concurrency);
   item list fetched only when the caller supplies no explicit `sortOrder`; read-after-write replaced
   with local synthesis from the known payload (next authoritative load restores server timestamps).
2. One-shot read tracing added to the six untraced hot reads (`listPrintRequests`, chunked summaries,
   `listPrintRequestItems`, `listCustomers`, `listUpcomingShows`, `listAllShowAllocations`) — the next
   owner report attributes every mount-hydration read instead of hiding ~241 of 249.
3. No Functions change: `onPrintRequestItemCreated` already meets Task 2's normal-delivery budget
   (1 read/2 writes/1 transaction, marker-based bounded idempotency, no item reread — the CloudEvent
   payload supplies all fields; the transaction rereads only the small item doc for the duplicate check);
   classifier already proves analytics-only writes are operational skips (Task 3 satisfied with live
   evidence). Request creation is O(1) (counter transaction; Task 4 satisfied).

### Budget position (honest, updated after independent review)

Independent review found the growing per-add items query was not actually eliminated for the caller the
owner's workflow exercises (`savePrintRequestDesignSelections`, the Design Library multi-select add path) —
only the parent-read was removed. Resolved: `addPrintRequestItem` now accepts an optional `existingItems`
hint; the multi-select caller (which already calls `getPrintRequestById` once up front, proving existence)
passes its one preloaded item list through the whole loop, appending each created item locally. Net effect
for the owner's exact 4-design-add workflow: **1 request read + 1 items read (once, not per-add) + 4 design
reads + creation transaction reads**, server 4 trigger reads — no growing 0+1+2+3 pattern remains for this
path. **The Print Requests page's own mount/remount hydration (R+items+C+A+S) remains above the ~20 hard
budget and is now fully traced but not yet bounded** — bounding it is the known deferred behavior-sensitive
item from pass 2 and requires explicit owner approval per this task's own rule before Wave C signoff.
Flagged, not silently accepted.

| Field | Value |
|-------|-------|
| Date | 2026-07-25 (pass 4) |
| Status | pending independent review |

---

## 2026-07-25 amendment — Live cost-test failure remediation (pass 3)

### Live evidence resolved (owner runtime test, 2026-07-25)

1. **AI Review 1,122-tag mount read (proven defect)**: `useAiReviewInbox.ts:78` still called
   `useCatalogTags({includeArchived:true})` — the pass-1 boundary decision ("tag approval is a management
   flow") did not survive live evidence: the corpus loaded on every normal mount alongside the generated
   taxonomy. Fixed: approved-tag display/autocomplete now uses the generated client-safe taxonomy (zero
   Firestore reads); `approveSuggestedTag` calls the service lazily on the explicit user action using the
   callable's returned tag; no corpus reload after approval. Tag management flows keep Firestore. A tag
   approved mid-session appears in autocomplete after the next republish (accepted generated-model staleness).
2. **Quota double-call (working as designed — documented, no code change)**: the server quota is genuinely
   per-purpose (`readDailyQuota` resolves separate counters per purpose); the two calls ~6s apart were
   different purposes from the two quota-consuming routes (`/requests/artwork` = print_request, `/donate` =
   catalog_donation). Per-purpose cache+in-flight sharing already exists and is correct; merging purposes
   would return wrong quota data. Target reinterpreted as one callable per user **per purpose** per 45s.
3. **Storage bucket redundancy (proven gap)**: `fetchJson` in both apps' generated-asset services had a
   parsed-value cache but **no in-flight Promise per path** — concurrent consumers of the same uncached
   bucket each downloaded it (12 misses for 4 items). Fixed in both services: path-keyed in-flight map,
   rejection-evicted, traced as `in-flight-reuse`; manifest no-cache semantics unchanged.
4. **Queue failed-then-succeeded (explained from deployed logs — legitimate rejection, plus two accounting
   defects fixed)**: attempt 1 failed pre-transaction with `showAllocationsReturned: 4` (that show already
   carried the customer's earlier allocations — one-request-per-customer-per-show/capacity rejection);
   attempt 2 had `showAllocationsReturned: 0` — a **different show chosen on retry**, hence success with no
   state written between calls. Defects fixed: every capacity/eligibility throw after the items stage left
   `validationStage` at the catch-all label (logs misleading), and the client debug report showed
   `failureStage: null`. Now: seven distinct stage labels + the sanitized stage attached centrally to the
   error details. Zero validation-logic changes.
5. **Clear Request stale UI (proven defect)**: `clearWorkingPrintRequest` never invalidated the 30s read
   cache (unlike catalog-add), so the post-clear silent reloads served the pre-clear items back. Fixed:
   service invalidates the read cache; the context reconciles locally from the callable result (items
   emptied, list entry patched to returned status + itemCount 0, summary dropped, pending item loads
   epoch-discarded so a late pre-clear read cannot resurrect rows); the two awaited reloads are removed —
   zero immediate post-clear reads. One-working-request rule and server authority unchanged.
6. **Portal startup ~99 reads (attributed)**: function logs prove only `registerWebPushSubscription`
   (4 reads, unchanged-no-op) ran server-side in the window; the remainder is one-time client startup
   hydration (notifications initial listener docs, continuable requests + items, favorites, settings) —
   bounded, enumerated, not idle activity; closed baseline stayed quiet. No code change this pass; deeper
   startup slimming deferred with documentation.
7. **Deletion budget verification unblocked**: preview/delete had no server accounting (log check confirmed
   both invocations were cold-start-inflated with no completion lines). Added sanitized dev accounting
   (reads/documents/deletes/batch/duration per outcome) to preview, delete, and both early-return paths so
   the owner's next controlled deletion produces exact live numbers to check against `4 + 2I` / `I + 1`.
8. **Minor listeners (reviewed, documented, no change)**: assisted-creation attach/detach churn is Strict
   Mode dev behavior on bounded queries; Portal Help stays a single-doc listener (real-time need modest but
   cost is one small doc; converting to cached one-shot deferred as not evidence-backed).

### Boundaries

No rules/index/migration/CORS/schema/App Hosting/production change. Dev deploy authorized post-review for
exactly: `queuePortalPrintRequestToShow`, `deleteEligiblePrintRequest` (accounting/stage changes only).

| Field | Value |
|-------|-------|
| Date | 2026-07-25 (pass 3) |
| Status | pending independent review |

---

## 2026-07-25 amendment — Comprehensive eradication pass 2 (full-repo one-pass completion)

### Context

The owner directed a full one-pass completion superseding the prior narrowed five-item pass, treating that
pass as unverified until independently audited, with dev Functions deployment authorized after independent
review and tests pass. Three parallel source audits re-verified the owner's four evidence items against
current source and swept all remaining areas. Findings:

- **Catalog-add refresh chain (owner item 1): already fixed in current source** — the single-add path on an
  existing working request consumes the callable's item DTO and performs zero post-success reads
  (`useAddDesignToRequestFlow.ts:322-359`). Residual reads exist only on the first-create branch (one chrome
  list reload) and the multi-request picker branch. The owner's trace predates the undeployed/unrestarted fix.
- **Queue-success reload (owner item 2): still broken in current source — root cause found and fixed this
  pass.** The 1+4+4 reread fired via two effects, not the handler: (a) `usePrintRequestDetail.ts`'s
  "request left the working set" effect (lines 213-218) reloading request+items when `reconcileQueuedRequest`
  dropped the request from `continuableRequests`; (b) `PrintRequestDetailView.tsx`'s allocation effect
  re-running `listShowAllocationsForPrintRequests` on the local status flip. Fix: `reconcileQueued()` clears
  the working-transition refs synchronously (local transition, not external change), and the view suppresses
  exactly one allocation reload via a one-shot ref set in `handleQueuedToShow` before reconciling. Explicit
  refresh and fresh navigation remain authoritative.
- **Request creation (owner item 3) and metadata/push (owner item 8): verified fixed in current source** with
  exact line citations recorded in the audit outputs.
- **Deletion formula (owner item 4): exact formula established.** Current hard-delete =
  `4 + 2I` reads, `I + 1` writes, zero post-delete client reads, zero triggers (no `onDocumentDeleted` exists
  for `printRequests`/`printRequestItems`). The historical ~1,663-read spike reconstructs as the now-removed
  post-delete `reloadPrintRequests` (unbounded R list reads + N+1 summaries ≈ 3R) plus
  `listAllShowAllocations` full scan (A) — e.g. R≈300, A≈760.
- **Recursion risk closed**: `classifyPortalCatalogDesignChange` confirms `requestCount`/`lastRequestedAt`/
  `showAddCount`/`lastAddedToShowAt`/`updatedAt`-only changes classify `"operational"` (no publication).

### Approved scope (pass 2 fixes, all implemented this pass)

1. **Queue-success local reconciliation completion** (Portal): suppress the two effect-driven rereads after
   queue success as described above. Target: 0 immediate client reads after queue success.
2. **Wipe reset no-op skips** (`functions/src/wipeOperationalTestData.ts`): `resetCustomerSequences`,
   `resetUpcomingShowAllocationTotals`, and `resetDesignRequestStats` previously rewrote every document
   unconditionally; each now skips documents already at reset values. Besides the wasted writes, the design
   reset previously bumped `updatedAt` on every design, firing one `onPortalCatalogSnapshotSourceWritten`
   invocation per design per repeat wipe — now eliminated for already-reset designs. Repeat wipe over reset
   data now costs reads only.
3. **Studio item-summary N+1 removal** (`printRequestService.listPrintRequestItemSummariesForRequests`):
   replaced one-query-per-request with chunked `where('printRequestId','in',chunk)` queries (cap 10),
   mirroring Portal's proven pattern; the summary aggregation reads only
   `printRequestId`/`designId`/`quantity` and is order-independent, so returned summaries are identical in
   `ceil(N/10)` queries instead of `N`. This reduces every Print Requests list load/refresh, not just
   deletion.

### Documented, explicitly deferred (behavior change or already mitigated)

- AI Review per-action `reloadDesigns` (≤100 docs) + 3 `getCountFromServer`: replacing with local
  reconciliation changes staleness/self-correction semantics — deferred.
- `listPrintRequests`/`listUpcomingShows`/`listAllShowAllocations` unbounded: bounding changes staff-visible
  completeness; aggregate-counter redesign is a data-model change — deferred with documentation.
- Customer-upload intake per-row enrichment (2 getDocs/row): already cached per row id; chunked-`in` batching
  deferred as lower priority.
- Portal favorites/full-history queries: naturally domain-bounded, cached — no action.
- `useLiveQuotaRefresh`: proven idle-quiet, callable-based, cache-guarded at the same 45s window — no action.

### Boundaries

Same as the 2026-07-24 amendment. No new asset, manifest, schema, rules, index, migration, CORS, or
production change. Dev deployment of exactly the changed Functions is authorized by the owner's pass-2
directive after independent review and tests pass.

| Field | Value |
|-------|-------|
| Date | 2026-07-25 |
| Author | Managing Agent (Claude) |
| Status | pending independent review |
| Workflow | managed-phase |
| Goal | `firestore-usage-efficiency-wave-c` |

---

## 2026-07-24 amendment — Comprehensive Firestore spike eradication (narrowed scope)

### Context

An owner-issued comprehensive audit prompt requested an exhaustive 12-task, 40-test review of every
Firestore-capable operation across Portal, Studio, and Functions. Full required reading (Wave C Plan/Review/
checkpoint, six 2026-07-24 remediation reports, `.cursor/workflow/state.md`,
`references/project-chatgpt-handoff/CURRENT-STATE.md`) plus a parallelized four-pass operation inventory across
all three codebases is recorded in
`docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-pre-implementation-report.md`.

That report's central finding: most of the 12-task scope re-audits areas the existing Wave C passes already
implemented correctly with no new evidence of regression (provider bounds, generated-JSON boundaries, debug
accounting, catalog snapshot triggers). Re-doing that work now would violate this goal's own established rule
against reopening signed-off work without new evidence. Five narrow, newly-evidenced defects were found instead,
all consistent with the already-approved Wave C architecture (reuse of the existing generated client-safe
taxonomy snapshot, no new asset, no schema change, no rules change). This amendment scopes implementation to
exactly those five.

### Approved scope (five narrow fixes)

1. **Studio AI Review category-dropdown taxonomy read.** `AiReviewPage.tsx:37` calls `useCategories()`
   unconditionally (no `enabled` guard) purely to populate a read-only, active-only filter dropdown
   (`categoryOptions`, filtered to `isActive`). This duplicates a problem already solved for Design Library:
   reuse the existing `useGeneratedDesignLibraryTaxonomy` hook (already reading
   `generated/catalog-reference/client/**`, zero Firestore reads, already field-sufficient for
   `id/name/sortOrder/isActive`) instead of `useCategories()`'s Firestore-backed `categoryService.listCategories`.
   **Explicitly not touched**: `useAiReviewInbox.ts:78`'s `useCatalogTags({includeArchived:true})` and
   `TagManagementModal.tsx:104`'s identical call — both are genuine tag-management/approval flows (writable,
   archived-inclusive, used by `approveSuggestedTag`), matching the exact boundary the original Design Library
   amendment already drew ("management pages keep Firestore-backed hooks"). Converting these would risk breaking
   tag-approval correctness for no evidenced benefit — out of scope.

2. **Studio per-request-delete list reload (N+1 + unbounded).** After a successful print-request delete/archive,
   `usePrintRequestSelectionMode.ts:1470-1477` calls `reloadPrintRequests()`, which reruns
   `printRequestService.listPrintRequests` (`printRequestService.ts:531-548`, **no `limit()`**, full collection
   scan) followed by one `getDocs` per returned request via `listPrintRequestItemSummariesForRequests`
   (`printRequestService.ts:550-571`, N+1). Add a bounded `limit()` matching the existing pattern used elsewhere
   in this service (`[NEEDS REPO CHECK during implementation]` exact existing page-size constant to reuse, if one
   exists in this file; otherwise use the same constant Show Queue/Design Library already use for consistency)
   and reconcile the deleted/archived request locally (remove or patch the one affected row) instead of
   reloading the entire list after a single-request mutation. Preserve full-list reload behavior for actual list
   navigation/refresh actions — only the post-single-delete/archive reload path changes.

3. **Portal `createPrintRequest` unconditional `refreshCustomer()`.** `useMyPrintRequests.ts:148` calls
   `refreshCustomer()` (re-`getDocs` on `customers`) on every working-request creation regardless of
   `skipListReload`. No print-request-creation callable writes to the `customers` document's profile fields (the
   callable's own dev accounting already documents its writes as `1 transaction, printRequests` only — no
   `customers` field is part of that write). Remove the unconditional `refreshCustomer()` call from the
   request-creation success path; customer profile remains reactive to its own explicit invalidation triggers
   elsewhere (sign-in, account-settings save) which are unchanged by this fix.

4. **`onPrintRequestItemCreated`/`onShowAllocationCreated` non-idempotent increments on CloudEvent redelivery.**
   Both functions perform a bare `FieldValue.increment(1)` write on `designs/{designId}` with no guard against
   Cloud Functions v2/Eventarc's at-least-once delivery redelivering the same creation event and double-counting
   `requestCount`/`showAddCount`. Add an idempotency guard consistent with the existing pattern already used by
   `onEmailDeliveryJobCreated` (transactional claim keyed on the triggering document's own ID) — specifically: a
   small per-item/per-allocation marker field (`requestCountAppliedFor`/`showAddCountAppliedFor`, storing the
   triggering document ID) checked via `runTransaction` before applying the increment, skipping if already
   applied. This is a **correctness fix for duplicate-write risk**, not a read-volume fix; it adds one
   transactional read+conditional-write per event (no change to the steady-state no-redelivery cost) and does not
   change `requestCount`/`showAddCount`'s public meaning, the catalog snapshot change-classifier's treatment of
   these fields, or any client-visible contract.

5. **`deleteEligiblePrintRequest` triple `buildPreview()` execution.** For one successful hard delete, the flow
   currently runs `buildPreview()` three times (client-side `preview()` on dialog open; once inside
   `deleteEligiblePrintRequest` before mutating; once more as an explicit "recheck immediately before mutate").
   Each `buildPreview()` call costs 1 `printRequests` read + 1 `showAllocations` query + up to 8 sequential
   `upcomingShows` reads (N+1, capped) + 1 `printRequestItems` query, plus a `users/{uid}` caller-profile read
   per callable invocation. Remove the redundant first `buildPreview()` call inside `deleteEligiblePrintRequest`
   (lines 299-318) — the client already has a fresh preview from opening the confirmation dialog moments earlier;
   go straight to the existing recheck-immediately-before-mutate call, which remains unchanged and preserves the
   documented TOCTOU-safety intent. Drops reads from 3x base preview cost to 2x (one at dialog-open, one
   recheck-before-mutate) — see the exact before/after budget table in the pre-implementation report. No change
   to hard-delete eligibility rules, archive-vs-delete routing, confirmation-phrase gating, or the
   production-history/allocation blockers.

### Explicitly deferred (not in this pass's scope)

- `wipeOperationalTestData`'s full-collection-scan delete pattern (real, evidence-backed, but is the separate
  bulk-wipe tool — `fresh-prints-dev`-only, owner-triggered, confirmation-gated — not the code path the owner's
  reported single-request-deletion spike actually exercised; deferred pending new evidence this bulk tool is
  itself causing owner-visible cost in normal operation).
- The remaining Task 1-12 items not named above (provider audits, generated-JSON decision re-review, debug
  panel accounting extensions, Functions-wide idempotency sweep beyond the two functions named in item 4,
  Portal `useLiveQuotaRefresh` poll-vs-listener reconciliation, unbounded `favoriteService.listFavorites`/
  `listMyPrintRequests`(full scope)/`listUpcomingShows`/`listAllShowAllocations`, `removeShowAllocationsForRequest`'s
  per-doc-delete-via-`Promise.all` instead of `writeBatch`, `assistedCreationRequests`'s two listeners) — all
  real, evidence-cited findings in the pre-implementation report, none newly regressed since the last signed-off
  pass, deferred to a future amendment once this pass's fixes are owner-verified.

### Boundaries

No new generated asset, manifest field, schema change, rules change, migration, deployment, App Hosting
deployment, or production action is approved by this amendment. Item 1 reuses an existing asset/hook verbatim.
Items 2, 3, 5 are client/server logic-only changes with no schema impact. Item 4 adds one new field per
`printRequestItems`/`showAllocations` document (`requestCountAppliedFor`/`showAddCountAppliedFor`) — additive,
no migration needed since it is only read/written going forward and its absence is treated as "not yet applied."

| Field | Value |
|-------|-------|
| Date | 2026-07-24 |
| Author | Managing Agent (Claude) |
| Status | approved_with_changes (self-reviewed per Formal Review below; narrow, reversible, evidence-backed) |
| Workflow | managed-phase |
| Goal | `firestore-usage-efficiency-wave-c` |
| Related | `docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-pre-implementation-report.md` |

---

## 2026-07-24 amendment — Portal show-queue submission remediation

### Evidence

The owner trace proves three distinct browser callable starts for one intended queue action. Repository
inspection finds no automatic retry, effect-owned submission, form submission, or duplicate event
listener. Both buttons are `type="button"` and confirmation has one handler. The hook's React state
lock is not synchronous and is instance-local, so rapid confirmation or modal/remount callers can
enter before `isSubmitting` rerenders; the service has no shared in-flight owner. Historical server
logs contain two HTTP 400 responses and one HTTP 200 from revision `00028-ruk`, but the deployed
Function logs no sanitized failure stage. Therefore the two exact preconditions cannot be recovered
without guessing.

The callable currently launches request, show, full request-items, and request-allocation reads in
parallel before checking whether the request/show is eligible. On success, the page explicitly
reloads request, items, working statuses, customer, and allocations. Catalog-add deliberately reads
the returned item document because its response exposes only an item ID. Upload quota has no
service-level in-flight sharing, while `useLiveQuotaRefresh` can overlap initial/focus triggers.

### Approved scope

1. Add one service-owned in-flight Promise per authenticated request/show pair; concurrent callers
   share it, rejection evicts it, and unrelated pairs remain independent. Keep a synchronous hook
   guard so controls lock before the network call.
2. Add development-only queue accounting with sanitized validation stage, returned counts,
   transaction attempts, writes, duration, outcome, and safe failure code.
3. Reorder cheap named request/show checks ahead of item/allocation corpus reads while preserving
   the authoritative transaction and all authorization/capacity rules.
4. Extend catalog-add's sanitized callable result with the authoritative item fields required by
   Portal reconciliation, eliminating the immediate item-document reread for create and increment.
5. Add auth/purpose-scoped quota in-flight sharing using the existing live-refresh interval; evict
   rejection and provide explicit invalidation after quota-changing operations.
6. Reconcile successful queue state locally: mark detail active, clear the working request/cart, and
   seed allocation completion without customer, item, working-status, or allocation reloads.
   Explicit refresh/navigation remains authoritative.
7. Add focused tests for in-flight sharing/retry, quota sharing/eviction, callable result mapping,
   cheap failure ordering/accounting, and local success reconciliation.

### Boundaries

No persisted idempotency collection, rules/index/schema change, generated asset change, capacity
policy change, migration, deployment, rebuild, or republish is approved. Server-persisted
cross-device idempotency would require a separate reviewed data-contract amendment.

| Field | Value |
|-------|-------|
| Date | 2026-07-23 (amended same-day: AI-private snapshot budget, R-013; amended 2026-07-24: Portal tag-facet summary; amended 2026-07-24: Studio Design Library generated-catalog assets; amended 2026-07-24: Studio ordering corrected to createdAt after owner QA) |
| Author | Planning Agent |
| Status | approved_with_changes; prior amendments approved; **Studio generated-catalog amendment implemented; owner QA (generation 38) found an ordering defect (updatedAt-based, not createdAt), now corrected in a further narrow amendment below — implementation complete, pending owner Functions redeploy/republish approval and retest** |
| Workflow | managed-phase |
| Goal | `firestore-usage-efficiency-wave-c` |
| Related | `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md`, `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md` |

---

## Goal

Contain the currently unexplained idle Firestore reads first, then replace the known tag/category and
catalog read amplifiers with versioned generated snapshots, bounded design queries, deduplicated
subscriptions/lookups, and measurable read budgets. Firestore remains the canonical editable source.
No production deployment is in scope.

## Workflow Decision

This is a **new managed goal**, `firestore-usage-efficiency-wave-c`, rather than reopening
`firestore-usage-efficiency`. The prior goal is signed off `approved_with_notes`; its signoff explicitly
deferred Staff Inbox bounds, Studio `loadAll`, Print Requests N+1, Functions cache work, and other Wave C
items. Reopening a closed phase would erase that audit trail. This phase consumes those deferred items
and the owner-supplied reference-snapshot/catalog requirements.

## Incident Evidence and Current Root-Cause Assessment

### Owner-supplied measurement

Over approximately six hours, Usage Insights reported 8,328 reads, including 4,488 `/tags`,
2,951 `/designs`, 302 `/users`, 97 `/upcomingShows`, 94 `/settings`, and 72 `/categories`. About
90 expected design writes followed an import of at least 90 designs.

### Repository-proven amplifiers

| Source | Exact code evidence | Current behavior | Classification |
|--------|---------------------|------------------|----------------|
| AI tags/categories | `functions/src/ai/aiEnrichmentRuntimeCache.ts`; callers in `aiEnrichmentPipeline.ts` and `aiEnrichmentPlayground.ts` | Module cache lasts 60s, but cache misses have no shared in-flight Promise. A miss queries all approved tags and all active categories. Parallel misses and separate Function instances can stampede. | Proven code path; production attribution needs controlled logs |
| Studio Design Library | `DesignLibraryPage.tsx:206` → `useDesigns(listQuery, { loadAll: true })`; `useDesigns.ts` | Pages through the matching set up to 2,000 documents on ordinary route entry. | Proven |
| Portal search/multi-tag | `useCatalogDesigns.ts` → `catalogNeedsFullClientHydrate` → `catalogService.listAllMatchingReadyDesigns()` | Search or two-plus tags pages through the full matching ready catalog. | Proven |
| Portal Discover | `catalogService.listHomeDiscoveryPool()` | Four concurrent design queries, each limited to 80; overlapping documents can be billed repeatedly. | Proven |
| Studio global operational listeners | `AppShell.tsx` → global `StaffInboxProvider` → `staffInboxSubscriptionService.subscribe()` | Unbounded realtime queries for all Portal-origin print requests, allocations, and all upcoming shows remain active on every Studio route. | Proven; not a `/designs` source |
| Per-design realtime | `designDocumentSubscriptionService.ts`; callers in `useAiReviewInbox.ts` and `aiProcessingWaitService.ts` | Selected/actively processing designs use document listeners. Cleanup exists at the service boundary, but route/Strict Mode lifecycle needs measurement. | Legitimate candidate; verify lifecycle |
| Portal ID resolution | `catalogService.getReadyDesignsByIds()` and Favorites/request/detail callers | Deduplicates IDs within one call, but does not cache/dedupe concurrent calls across consumers. Uses one `getDoc` per unique ID. | Proven N+1 risk |
| Client taxonomy | `catalogService.listActiveCategories/listApprovedTags`, Studio `categoryService` and `catalogTagService` | Read-heavy routes query the collections independently; Studio management mutations reread collections for validation/order. | Proven |
| Existing tracer | `packages/shared/src/utils/firestoreUsageTrace.ts` | Counts only instrumented attach/detach/read keys. No timestamps, constraints, route/source, duplicate interval, cache events, focus/visibility trigger, or Functions coverage. | Proven diagnostic gap |

### Immediate machine-state finding (2026-07-23)

A read-only process inspection found all of the following still running:

- Studio Vite dev server and Electron renderer
- Portal Next dev server
- Cloudflare tunnel

Therefore the billing screenshot cannot be treated as an “everything closed” baseline. Studio is
definitively capable of ongoing client reads while visually idle because its global providers remain
mounted. The current code audit found no Electron tray/background-on-close policy: `main.ts` quits on
`window-all-closed` on non-macOS, but the current Electron renderer is still running.

### Tag-read hypothesis

**Calculated, not yet measured:** if the approved taxonomy is approximately 50 tag documents, then
90 independent cache misses cost approximately 4,500 tag reads. That is within 12 reads of the observed
4,488 and makes the AI cache stampede/cold-instance path the leading explanation. The code proves the
mechanism exists; Phase 0 Functions diagnostics and a 10–20 design import must prove attribution.

### Important distinction

`/tags` is loaded with one-shot Admin SDK queries, not a client listener. If tag reads continue after
imports/jobs finish and after Usage Insights reporting delay, investigate still-running/retried
enrichment invocations. Studio’s global listeners explain continuing request/allocation/show reads,
not continuing tag reads.

## Scope

### In Scope

1. Emergency idle-read containment before architecture work.
2. Complete runtime source attribution for tags, categories, settings, designs, and relevant rules reads.
3. Development-only client and Functions diagnostics.
4. Smallest safe fixes for listener leaks, remount loops, polling, focus/visibility reloads, and duplicate queries.
5. Versioned AI-only and client-safe tag/category snapshots generated from canonical Firestore data.
6. Atomic manifest publication, previous-version retention, schema validation, module cache, in-flight
   Promise deduplication, and bounded Firestore fallback.
7. Automatic coalesced invalidation after trusted tag/category changes.
8. Narrow, bounded Studio Imports/AI Review queries where evidence finds broad reads.
9. Cursor-paginated Studio Design Library with no hidden `loadAll`.
10. Bounded Portal Library, generated Discover snapshot, and removal of full design hydration for search/multi-tag.
11. Generated client-safe catalog search/filter index plus bounded card retrieval.
12. Service-level design-by-ID cache and concurrent Promise deduplication.
13. Shared/ref-counted identical subscriptions where runtime evidence proves duplication.
14. Controlled before/after measurements and full workflow records.

### Out of Scope

- Production deployment or production data changes
- Deleting, merging, or renaming taxonomy solely for billing
- AI model/prompt/output behavior changes
- Design lifecycle, print request, show allocation, one-working-request, or 200 DPI policy changes
- New external search provider
- New third-party package unless Review explicitly approves it (none planned)
- Broad security-rule rewrite
- Treating expected import design writes as a defect
- Google Analytics or production release work

## Emergency Phase 0 Gate

No reference snapshot, Portal catalog snapshot, or search architecture implementation may begin until
the containment result has been reviewed.

### 0A — Controlled isolation (human checkpoint)

The owner must approve/perform the out-of-repo actions needed to:

1. Fully quit Studio and confirm no Electron renderer remains.
2. Close every Portal tab.
3. Stop Studio/Portal dev servers and the Cloudflare tunnel.
4. Confirm no local emulator/import/test process remains.
5. Record Usage Insights totals, wait a controlled interval plus reporting delay, and record again.
6. List other computers/browser sessions connected to `fresh-prints-dev`.

Expected: zero continuing client-originated reads. Any continuing reads must be attributed to deployed
Functions, queued/retried work, another client, or reporting delay before code architecture proceeds.

### 0B — Instrumented idle matrix

After diagnostic implementation, measure:

- Studio dashboard only, 30 minutes
- Portal non-catalog route only, 30 minutes
- Imports, AI Review Processing, AI Review Needs Review, Studio Design Library
- Portal Discover, Library, and Current Request
- Five repeated navigation cycles with final active-listener count equal to the first cycle
- One controlled import of 10–20 known dev designs

Record attach/detach, active count, stable signature, source/route, constraints, one-shot calls,
emissions, focus/visibility/reconnect causes, cache/fallback events, and Function invocation/job outcome.

### 0C — Containment changes

Apply only evidence-backed changes first:

- Correct cleanup or unstable dependencies if found.
- Remove accidental polling/focus/visibility full reloads.
- Bound or status/time-filter global Staff Inbox queries while preserving alerts.
- Ensure completed AI jobs cannot retry/reload reference data indefinitely.
- Lazy-load route-owned catalog/taxonomy data.
- Share identical subscriptions instead of broadening them.

### Phase 0 acceptance budget

| State | Required budget |
|-------|-----------------|
| Everything closed | 0 client reads; every server read individually identified |
| Studio dashboard after initial load | 0 repeated full tags/categories/designs queries; no attach/detach loop; only documented bounded operational listener deltas |
| Portal non-catalog after initial load | 0 tag/category/catalog hydration; no repeated request/user loop |
| Navigation ×5 | Same active listener count as cycle 1 |
| Completed import idle | 0 continuing reference-data reads after jobs terminate and reporting delay is accounted for |

If these cannot be proven, stop and report remaining candidate sources; do not claim snapshots solved
the incident.

## Proposed Architecture

### Reference snapshot contracts

Add strict shared contracts under `packages/shared/src/catalog-snapshots/`:

- `CatalogReferenceManifest`
- `AiCatalogReferenceSnapshot`
- `ClientCatalogReferenceSnapshot`
- validators/parsers with explicit `schemaVersion`

AI-only fields include approved tag IDs/names/aliases/`preferredWhen`, resolver exclusions already
consumed by the pipeline, active category IDs/names/descriptions required by AI, content version, and
generated timestamp. Client-safe fields include only IDs, display names, search aliases when approved,
active/customer-visible state, category order, schema/content version, and generated timestamp.
Internal AI guidance must never enter client assets.

### Storage layout

Exact proposed paths:

```txt
generated/catalog-reference/manifest.json
generated/catalog-reference/ai/v{contentVersion}.json
generated/catalog-reference/client/v{contentVersion}.json

generated/portal-catalog/manifest.json
generated/portal-catalog/v{catalogVersion}/discover.json
generated/portal-catalog/v{catalogVersion}/recent/page-{page}.json
generated/portal-catalog/v{catalogVersion}/categories/{categoryId}/page-{page}.json
generated/portal-catalog/v{catalogVersion}/filters/tags/{tagId}.json
generated/portal-catalog/v{catalogVersion}/search/shard-{shard}.json
generated/portal-catalog/v{catalogVersion}/cards/bucket-{bucket}.json
```

AI objects remain Admin-only. Client/Portal objects contain public-catalog-safe data only. Because
Portal catalog browse is guest-readable, Review selects these delivery boundaries:

- `generated/catalog-reference/ai/**`: private; Firebase Admin Storage access only.
- `generated/catalog-reference/client/**`: narrowly public, read-only Firebase Storage delivery.
- `generated/portal-catalog/**`: narrowly public, read-only Firebase Storage delivery.

Portal/Studio services use the Firebase Storage client to download blobs; React components never call
Storage directly. Immutable versioned objects use long-lived immutable cache metadata. Manifests use a
short cache lifetime and conditional refresh. A callable is rejected for normal delivery because it
would add an invocation per cache miss and weaken ordinary HTTP/browser caching. Hosting delivery is
not selected because it would add a second publication/deployment surface without improving the
field-security boundary. Any Storage rules deployment remains an explicit human checkpoint, and
production is out of scope. Strict projection tests must prove that public assets contain no AI guidance,
owner-only fields, raw AI output, processing metadata, internal notes, sensitive data, or secrets.

### Atomic publication

1. Read canonical taxonomy/ready-design data in trusted Functions.
2. Generate a monotonic opaque content version (timestamp + random/hashed suffix; never trust client input).
3. Validate every asset in memory.
4. Upload all assets under new immutable names with content type and cache metadata.
5. Re-read/validate required object metadata.
6. Write a new manifest only after every required asset succeeds.
7. Keep the immediately previous version and manifest fields for rollback.
8. Failed generation leaves the active manifest untouched and records structured failure.
9. A manual owner/admin rebuild callable provides recovery; it is never public.

### Mutation invalidation/coalescing

Firestore remains canonical. Trusted `onDocumentWritten` handlers for `tags/{tagId}`,
`categories/{categoryId}`, and relevant ready-design public fields mark a rebuild generation dirty.
Use exactly two Admin-only coordination documents:

```txt
snapshotPublicationState/catalog-reference
snapshotPublicationState/portal-catalog
```

Each contains `requestedGeneration`, `publishedGeneration`, `leaseEpoch`, `leaseOwner`,
`leaseExpiresAt`, `status`, `wakeGeneration`, `lastAttemptAt`, `lastPublishedAt`, and bounded
`lastErrorCode`/`lastErrorAt`. Generation counters and `leaseEpoch` increment transactionally.
`leaseOwner` is `{functionName}:{eventId}:{randomUUID}`. A lease lasts 10 minutes and is reclaimable
after expiry. Only the current fencing epoch may publish.

Mutation triggers compare before/after and mark dirty only when snapshot-relevant fields or ready
membership changed. A state-document worker waits one bounded 15-second debounce window, then claims
the lease transactionally. Sibling workers exit when another unexpired lease owns the job. One
invocation performs at most two publication passes. If a newer requested generation arrives during
the second pass, the worker releases its lease and updates `wakeGeneration` once, causing a new
bounded worker event. A worker exits without writing when `requestedGeneration <=
publishedGeneration`, preventing an unlimited self-trigger loop.

Manifest replacement uses the Storage object's generation-match precondition captured before the
build. Together with the Firestore fencing epoch, this prevents a stale/expired publisher from
overwriting a newer manifest. A collision-safe asset version is
`{requestedGeneration}-{sha256(content)[0..15]}`. The manifest records numeric generation and rejects
any lower generation. Immediately previous assets remain retained.

A crash leaves the prior manifest valid. Recovery occurs on the next relevant mutation after lease
expiry or through the owner/admin-only `rebuildCatalogSnapshots` callable, which reconciles manifest
and coordination state before forcing a new generation. No one-minute scheduled poll is added.
Each relevant mutation costs approximately one small coordination transaction; a coalesced batch
causes at most two full builds per worker invocation, not one build per design approval.

### Function consumption and fallback

- Module-level parsed cache keyed by manifest/content version.
- Shared in-flight Promise per resource/version.
- Short manifest TTL; immutable content cached for instance lifetime with bounded retained versions.
- On manifest change, load/validate new version then swap cache.
- Missing/malformed/unsupported snapshot: one deduplicated Firestore fallback per warm instance with
  bounded TTL and structured reason.
- No recursive retry and no per-design fallback.
- A later manifest refresh retries recovery; fallback cannot silently become permanent.
- AI settings remain a small Firestore/settings read unless measurement supports including non-secret,
  pipeline-safe configuration in the AI snapshot. Secrets remain Secret Manager only.

### Studio designs

- Imports: active/recent batch IDs and relevant statuses only; bounded history.
- AI Review: preserve server-side state filters/count aggregations; bound each tab; realtime only for
  active processing and selected detail.
- Design Library: remove `loadAll`; retain the repository's existing `DESIGN_LIST_PAGE_SIZE` of 100,
  stable `updatedAt DESC` + document-ID `DESC` cursor, ready-only default, archived only on request.
  Repository evidence is `DESIGN_LIBRARY_DEFAULT_SORT_FIELD = "updatedAt"` and
  `DESIGN_LIBRARY_DEFAULT_SORT_DIRECTION = "desc"` in `designLibraryFilters.ts`; matching
  status/category/tag + `updatedAt` + `__name__` indexes already exist and must be verified, not
  redeployed, before coding.
- Category and single-tag filters use indexed Firestore constraints.
- Search/multi-tag use generated client-safe index to produce a bounded ordered ID page, then one
  deduplicated service load per unique design ID/chunk. No card-owned reads.
- Cache loaded pages by stable query signature; edits invalidate affected IDs/query keys.
- Request-selection mode uses the same ready-only 100-document pages and must never fall back to
  `loadAll`.

### Portal catalog

- Discover reads one generated asset containing exactly the current rail cards/rankings.
- Library normal browse remains bounded 40-card Firestore cursor pages in this implementation and
  caches loaded pages. Moving normal browse to generated pages is not required to remove the proven
  amplification and would expand publication surface without reducing first-page cost below a
  bounded query.
- Search/multi-tag reads only relevant generated search/tag shards, intersects IDs client-side, and
  fetches bounded generated card buckets/pages. It never calls `listAllMatchingReadyDesigns`.
- The generated search index contains normalized customer-safe title/category/tag/alias tokens only.
- Manifest changes invalidate page references; immutable prior pages may finish in-flight safely.
- Limit in-memory pages with a small LRU; do not persist an unbounded catalog.
- Current Request never mounts catalog hydration.

Review selects generated search/tag shards now (**Option A**). Option B is rejected because Firestore
cannot preserve the existing arbitrary text search and AND-style multi-tag behavior with a catalog-size
independent candidate set. No external search provider is added.

Generated-search budgets:

- manifest: at most 32 KiB compressed
- taxonomy snapshot: at most 256 KiB compressed
- Discover asset: at most 512 KiB compressed
- each search/tag shard: at most 256 KiB compressed
- each card bucket: at most 32 KiB compressed
- one cold search page: at most 2 MiB transferred and 8 MiB parsed working set
- search result page: 40 cards; no unbounded ID/materialized-card accumulation
- in-memory immutable-asset LRU: at most 16 MiB per client

Generation fails before manifest swap if an asset exceeds its budget; increase deterministic shard
count and regenerate instead of publishing an oversized version. Search/multi-tag pagination uses a
stable generated ordering plus design ID tiebreaker and fetches only the shards/buckets needed for the
current 40-card page.

### Amendment 2026-07-23 — AI-private reference snapshot budget raised to 512 KiB (owner-approved, R-013)

The first real `fresh-prints-dev` `rebuildCatalogSnapshots` invocation failed twice with
`snapshot-asset-budget-exceeded:generated/catalog-reference/ai/v{N}.json`. Measured root cause: the
"taxonomy snapshot: at most 256 KiB compressed" budget above was applied as a single shared ceiling,
but the **AI-private** snapshot (`generated/catalog-reference/ai/**`) carries `preferredWhen`
guidance text per tag that the **client-safe** snapshot (`generated/catalog-reference/client/**`)
omits. At Fresh Prints Dev's real approved-tag count (~1,122 tags, 18 categories), the AI snapshot
measures **295,152 bytes (~288.2 KB) uncompressed** — over 256 KiB — while the equivalent client-safe
snapshot measures ~161 KB, comfortably under budget.

**Owner decision (2026-07-23):** raise only the AI-private snapshot's uncompressed byte ceiling to
**512 KiB (524,288 bytes)**. No other budget in this table changes:

| Asset | Ceiling | Changed? |
|-------|---------|----------|
| `generated/catalog-reference/ai/**` (AI-private, server-only) | **512 KiB (524,288 bytes)** | **yes — was 256 KiB** |
| `generated/catalog-reference/manifest.json` | 32 KiB | no |
| `generated/catalog-reference/client/**` (public, client-safe) | 256 KiB | no |
| `generated/portal-catalog/manifest.json` | 32 KiB | no |
| Portal Discover asset | 512 KiB | no (pre-existing, unrelated Portal ceiling) |
| Portal search/tag/category filter shards | 256 KiB | no |
| Portal card buckets | 32 KiB | no |
| Portal browse pages (recent/category) | 2 MiB | no |

Rationale (owner-approved, recorded here and in `docs/project/DECISIONS.md` and
`docs/project/RISK_REGISTER.md` R-013):

1. The AI reference snapshot is private, server-only, and consumed through a bounded module-level
   Functions cache (`functions/src/ai/loadAiCatalogReferenceSnapshot.ts`) — it is never delivered to
   a browser or mobile client, so the sizing pressure that motivates the Portal/client 256 KiB and
   sharded-asset ceilings (guest bandwidth, mobile parse memory) does not apply to it the same way.
2. The measured 288.2 KB payload is modest for Cloud Storage and Functions memory/network use.
3. Raising only this one ceiling preserves the existing single-object AI/client/manifest contract —
   no new coordination documents, manifest fields, consumer changes, or publication steps.
4. Sharding the AI snapshot (matching the Portal catalog asset strategy) was considered and
   explicitly deferred: at the current and near-term measured scale it would add coordination,
   manifest, fetch/merge, fallback, and rollback complexity with no present benefit. It becomes the
   required next step if growth approaches the new ceiling (see the 80% warning below), not before.
5. The public client taxonomy and every Portal asset ceiling are explicitly unchanged; this
   amendment does not touch `PUBLIC_ASSET_MAX_BYTES` or any Portal-specific literal budget.
6. AI content (full `preferredWhen` guidance per tag, aliases, descriptions) is preserved in full —
   no field was truncated or removed to fit the original budget.
7. 512 KiB provides headroom over the current 288.2 KB measured payload (56.3% of the new ceiling);
   the 80%-of-512-KiB (409,600-byte) developer diagnostic warning below exists precisely so growth
   toward the ceiling is caught with lead time, rather than only discovered by a second production
   `snapshot-asset-budget-exceeded` failure.

**New diagnostic (non-blocking) warning:** when the AI reference snapshot's serialized byte size
reaches or exceeds 80% of 512 KiB (409,600 bytes), `rebuildCatalogSnapshots`/the source-write
triggers emit one structured `logger.warn` (path, actual bytes, max bytes, percent used, content
version, tag count, category count — no taxonomy content) documenting that deterministic sharding
must be planned before the hard 512 KiB limit is reached. This does not fail publication; the
existing hard failure above 512 KiB is unchanged.

This is a narrow numeric-budget amendment only. It does not change the manifest contract, generated
paths, consumers/parsers, security boundary, or any other Plan decision above.

### Amendment 2026-07-24 — Portal tag-facet summary (owner-reported Portal QA regression)

Post-publication owner QA against the live generation-4 snapshots found two regressions and a
several-thousand-read Firestore increase. Diagnosis and required fixes:

**Read spike attribution.** The increase traces to `catalogService.listApprovedTags()`'s pre-fix
Firestore fallback path (`generatedPortalCatalogEnabled()` false, or the generated path throwing and
falling back) querying the full `tags` collection with no bound, combined with repeated Portal page
loads/tag-modal opens during the owner's QA session — each triggering that same unbounded query.
This is now fixed (see below): the generated path uses one small facet asset instead of the full
taxonomy, and the Firestore fallback is rebounded to a scan of ready designs rather than the full
`tags` collection, matching the plan's existing "zero Firestore tag/category reads" budget for the
tag modal.

**Regression 1 (tag filter) — root cause.** `catalogService.listApprovedTags()` returned every tag
from `loadClientTaxonomy()` (the full client-safe taxonomy snapshot) with no ready-design count and
no exclusion of zero-count tags. The pre-Wave-C Portal derived this same "tags with >=1 ready
design + count" shape by scanning the (then fully-hydrated) catalog client-side; Wave C removed full
hydration but never gave the tag modal an equivalent bounded data source.

**Fix.** Add one new compact, immutable, versioned, public-safe generated asset:

```txt
generated/portal-catalog/v{catalogVersion}/filters/tags-facet.json
```

Contract (`PortalCatalogTagFacetSummary`): `{ schemaVersion, catalogVersion, generatedAt, tags: [{
id, name, count }] }` — only tags with `count >= 1`; malformed/zero-count entries rejected by the
parser. Built server-side from the same ready-card tag membership already computed for search/filter
assets, with display names sourced from the canonical taxonomy (never invented). Excludes AI
guidance, descriptions, and any private field — allowlisted the same way as every other Portal
asset. Enforced budget: 256 KiB (measured ~a few KB at the real dev-scale corpus, comfortably under
budget even projected to thousands of tags).

The root manifest gains one new fixed field, `filters.tagFacetPath` (a single path, not a per-tag
enumeration — consistent with the deterministic-addressing principle from the prior manifest-size
fix). `PORTAL_CATALOG_SCHEMA_VERSION` (per-asset) is unchanged; `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION`
remains 2 (this is an additive field, not a breaking manifest reshape, and still no deployed consumer
exists to break).

Existing `generated/portal-catalog/{allPaths=**}` Storage rules already cover the new path — no rules
change was required; a narrow rules test proves this rather than assuming it.

**Regression 2 (search pagination) — root cause.** `portalCatalogAssetService.listMatchingDesigns`
combined every tag/category/search-term candidate ID set via `intersect()` but never applied a
deterministic sort before slicing into a page — result order depended on `Set` insertion order,
which in turn depended on non-guaranteed Firestore/publish-time ordering. This risked a match
appearing to be missing from the first page even when `total` was already correct.

**Fix.** Extracted a pure, directly-tested `planPortalCatalogSearchPage(candidateSets, options)` that
intersects every candidate set, applies a deterministic ascending design-ID sort, and only then
slices into the requested page. This guarantees: the complete ordered matching ID set is assembled
before any pagination occurs; `total` always reflects the complete set; `Load more` only appears when
more than the current page's results remain. No change to search token/prefix/case-insensitive
semantics, AND-style multi-tag semantics, or the 40-card page cap.

**Preserved:** manifest-last publication, previous-version rollback, generated-path security
boundary, and every other approved architecture decision. No design lifecycle, print request,
customer upload, AI prompt, or production behavior changed. No new package added.

### Amendment 2026-07-24 — Move Studio Design Library to generated low-read catalog assets (owner decision)

**Owner decision:** the normal ready-design experience in Fresh Prints Studio's Design Library
should use the same low-read generated-JSON architecture proven by Portal (CORS-fixed, dynamic
tag-facet narrowing working). Studio's existing UX — search, tag filter, dynamic narrowing, counts,
category filters, card layout, `updatedAt DESC` ordering, 100-design page size, request-selection
behavior — must not change. Only the data-delivery layer underneath changes.

#### Existing Studio read inventory (verified 2026-07-24 by direct code inspection, not assumption)

Cold entry to the normal ready Design Library (`DesignLibraryPage.tsx`) currently starts exactly
three one-shot Firestore reads, all already cached (no realtime listeners anywhere in this path):

| Read | Constraints | Cost | Cache |
|---|---|---|---|
| Categories | no `where` (includes inactive), `limit(200)` | ≤200 docs | 12h TTL, `boundedAsyncCache` |
| Tags | pages to completion via `startAfter`, 500/page | **~1,122 docs at the real dev corpus** (3 pages) — the single largest cold-entry cost | 12h TTL, `boundedAsyncCache` |
| Designs (first page) | `where(status==ready)`, `orderBy(updatedAt desc)`, `orderBy(__name__ desc)`, `limit(101)` | ≤101 docs | 15s TTL, `boundedAsyncCache` |

**Critical existing-architecture fact, confirmed by the code's own comment**
(`DesignLibraryPage.tsx:175-176`): *search, category filtering, single/multi-tag AND filtering, and
dynamic tag narrowing are already 100% client-side* over the in-memory `designs` array loaded by
`useDesigns` — none of these interactions issue a new Firestore query today. This is the opposite
starting point from Portal's pre-fix problem (where search/multi-tag caused *unbounded* Firestore
hydration via `listAllMatchingReadyDesigns`). Studio never had that defect: its `useDesigns` call
omits `loadAll` on this page, so it only ever holds whatever page(s) have been fetched via mount +
explicit "Load more" clicks.

This changes what "moving to generated assets" actually buys Studio, compared to Portal:

- **Removed by this amendment:** the ~1,122-document tag-list read and the ≤200-document category
  read on cold entry (replaced by generated assets), and the repeated ~100-document first-page design
  read on cold entry (replaced by a generated card/index asset). These are the only reads a valid
  generated-snapshot path removes.
- **Intentionally retained:** every Firestore read used to open one design for authoritative
  editing, save, archive/restore, AI Review, Imports, Customer Uploads, and all operational
  workflows — completely out of scope, unchanged.
- **A known existing limitation that generated assets fix as a side effect, not a regression to
  avoid:** dynamic tag narrowing today (`computeFacetedTagsForDraftSelection`) only produces
  *accurate* counts over whatever page(s) have been loaded so far (own doc-comment,
  `designLibrarySearch.ts:248-250`) — a user who hasn't clicked "Load more" enough times sees
  under-scoped counts. A generated card/index asset covering the full ready-design scope up front
  makes narrowing accurate for the *whole* catalog immediately, which is a genuine (welcome)
  behavior improvement, not scope creep — Formal Review must still confirm the owner wants this
  rather than treating it as an unapproved behavior change.

#### Field-level comparison: Studio card vs Portal generated assets

Studio's rendered card surface (`DesignCard.tsx`) needs: `id`, `title`, `artworkBackgroundHex`,
`thumbnailPath`, `assetsPurgedAt` (archived-mode purge gating only). Search/filter/order/narrow logic
additionally needs: `description`, `tags`, `categoryId`, `updatedAt`, and document ID (already `id`).

Portal's existing `PortalCatalogCard` (`packages/shared/src/catalog-snapshots/catalogSnapshot.types.ts:66-85`)
already carries `id, title, description?, categoryId?, tags, thumbnailPath, previewPath?,
artworkBackgroundHex?, updatedAtMs?` — a strict superset of what Studio's card needs, **except**:

1. **`assetsPurgedAt` is absent** (Portal has no purge/archived concept) — must be added if archived
   designs are ever represented in a reused/shared card shape, or archived mode must stay on a
   separate asset family that Portal doesn't need to carry.
2. **Portal's card set is `ready`-only.** Studio's archived-mode toggle browses `status == "archived"`
   designs — these are **staff-only, never customer-visible** (`docs/standards/SECURITY.md` "Original
   Image Security" / staff-only workflow scope). Archived designs must never be added to the existing
   `generated/portal-catalog/**` prefix, which is `allow read: if true` (fully public,
   `storage.rules:244-247`) — that would leak staff-only browsing data (which designs staff archived,
   when) to any unauthenticated Portal guest. This is a hard security boundary, not a style choice.
3. **`originalPath` must never appear in any public-read asset** (staff-only per `SECURITY.md`) —
   Portal's card already excludes it; any new Studio asset must too.

**Conclusion:** the *ready*-scope generated cards Portal already publishes are field-safe and
sufficient for Studio's ready-browse card surface. Archived-scope browsing cannot reuse the existing
public prefix and needs its own delivery boundary (see Selected Architecture below).

#### Electron transport review (verified, not assumed)

Studio already uses `firebase/storage` client `getDownloadURL()` extensively today (design
derivatives, customer upload previews, brand logos — `designDerivativeUrlService.ts`,
`customerUploadIntakeService.ts`, etc.), but exclusively for **`<img src>`-style asset loads**, never
for `fetch()`-and-parse-as-JSON. Portal's generated-asset consumer pattern (`fetch(url).then(r =>
r.json())`) has never been exercised in Studio and is subject to CORS in a way image loads are not.

Two distinct Studio renderer origins exist (`apps/studio/electron/main.ts:262-266`):

- **Dev**: `VITE_DEV_SERVER_URL` (Vite's default dev port, `http://localhost:5173` unless overridden)
  — an `http://` origin, same CORS model as Portal's `localhost:3100`. The corrected
  `storage.cors.json` origin list (`https://myprintrequest.dev`, `http://localhost:3100`,
  `http://127.0.0.1:3100`) does **not** currently include Studio's dev origin.
- **Packaged**: `win.loadFile(...)` loads the renderer via the **`file://` protocol** — a
  fundamentally different origin model than `http(s)://`. Most CORS configurations (including ours)
  do not, and should not by default, allow-list `file://`/`null` origins, since that is a much
  broader and less auditable trust boundary than a fixed hostname. Whether Chromium's `fetch()` from
  a `file://` page even sends a usable `Origin` header, and whether allow-listing it is safe, is a
  genuine open question this amendment must resolve before implementation — not something Option A
  can silently assume works because Portal's browser fetch works.

**Existing IPC precedent**: `apps/studio/electron/preload.ts` already implements a standard
`contextBridge.exposeInMainWorld("freshPrints", {...})` / `ipcMain.handle` pattern
(`contextIsolation: true`, per `docs/standards/SECURITY.md`'s Electron rules). Electron's **main
process** is plain Node — a `fetch()` there has no browser CORS model at all (CORS is a
browser-enforced restriction; Node's `fetch` doesn't enforce it), so routing the generated-asset
downloads through a new IPC channel (main process fetches the JSON, returns it to the renderer) is a
concrete, already-precedented way to sidestep the packaged-`file://`-origin CORS question entirely,
at the cost of one new narrow IPC channel.

#### Architecture options evaluated

**Option A (reuse existing Portal assets verbatim) — rejected as insufficient on its own.** Portal's
manifest/card/search-shard/tag-facet assets are field-safe for Studio's *ready*-scope browse, but:
archived designs have no Portal equivalent and cannot be added to the public prefix (security
boundary above); Studio's search is single-substring-over-id/title/description/tags with no
tokenization, while Portal's generated search index is token/substring-per-word sharded — reusing
Portal's search shards verbatim would silently broaden Studio's search semantics (e.g., matching
partial-word substrings Studio's current `.includes()` test wouldn't), which the task explicitly
forbids changing without an owner decision. Tag-facet counts also differ in scope (Portal: global
ready-count; Studio's existing narrowing already computes correctly once given a correct base set —
it doesn't need Portal's separately-shaped facet asset, just a complete card set to filter over).

**Option C (fully separate Studio catalog asset family, own manifest/triggers) — rejected as
over-scoped.** Studio's filtering/search/narrowing logic is already correct and entirely
client-side; it does not need its own generated *search index* or *tag facet* asset the way Portal
did, because Studio was never doing server-side/generated-index-driven search — it was always
filtering an in-memory array. Building a parallel Studio-specific search-shard/tag-facet publication
pipeline would duplicate Portal's most complex machinery (search sharding, dynamic-facet
co-occurrence) to solve a problem Studio doesn't have (Studio's problem is purely "get the ready-card
array into memory without 100+1,122+200 Firestore reads," not "compute search/filter results without
full hydration" — Portal's problem). A second manifest family, second trigger set, and second
publication coordination surface is unjustified complexity for what Studio actually needs.

**Selected: Option B — reuse the existing public ready-card data, add one new compact,
versioned, immutable Studio-scope index asset; archived designs stay Firestore.**

1. **Reuse `generated/portal-catalog/v{version}/cards/bucket-{bucket}.json`** (existing, public,
   already contains every ready design's `id, title, description, categoryId, tags, thumbnailPath,
   updatedAtMs, artworkBackgroundHex` — everything Studio's card/search/filter/narrow logic needs
   except `assetsPurgedAt`, which is always absent/irrelevant for `ready` designs anyway since only
   archived designs can be purged). No new card asset, no manifest change for this part.
2. **Add one new compact generated asset, Studio-scope only, for ready-design browsing**:
   `generated/portal-catalog/v{version}/studio/ready-index.json` — a flat, ordered list of every
   ready design's `id` in Studio's exact `updatedAt DESC, id DESC` order (Portal's card buckets are
   keyed/ordered by Portal's own `createdAt`-based `portalCatalogBrowseOrder`; Studio needs its own
   independent ordering list, not a re-sort of Portal's), **plus each ready design's full `tags` array
   inline** (needed for Studio's exact-membership AND-filter and narrowing logic to run without
   fetching every card bucket up front) — modeled directly on the already-proven, already-tested
   `PortalCatalogTagFacetSummary`/`intersectDesignIdLists`/`computeNarrowedTagFacets` pattern from the
   dynamic-facet work, reusable at the shared-utility layer (`packages/shared` or a Studio-side
   service import of the same pure functions), not rewritten.
   - Path is `[NEEDS REPO CHECK / FORMAL REVIEW SIGN-OFF]` for the exact final segment name;
     `.../studio/ready-index.json` is the proposed name, versioned under the same
     `v{contentVersion}` root as every other portal-catalog asset, published atomically alongside the
     rest of `publishPortal()`'s manifest-last sequence (no new manifest, no new coordination
     document — added as one more path under the existing `filters`/root shape, `[NEEDS REPO CHECK]`
     exact manifest field name, e.g. `studio.readyIndexPath`).
   - **Public-read, same as every other `generated/portal-catalog/**` object** — this is the
     `ready`-only scope, which is already customer-visible in Portal; it contains nothing staff-only.
     Confirmed safe: no `originalPath`, no AI fields, no archived designs.
   - Payload budget: `[NEEDS FORMAL REVIEW SIGN-OFF]` numeric ceiling — propose 512 KiB uncompressed
     (an ID + tags-array list for ~1,122-tag/multi-hundred-design dev scale is expected far smaller
     than the existing 256 KiB tag-facet asset budget, but must be measured against the real corpus
     before the ceiling is fixed, per the existing budget-amendment pattern in this Plan).
3. **Archived designs remain Firestore-only, unchanged** — Studio's existing archived-mode toggle
   keeps its current `getDocs(status==archived, ...)` path exactly as-is. This is explicitly
   acceptable per the task's own "Normal unfiltered browse" fallback framework (archived mode is a
   narrow, staff-only, less-frequently-used toggle, not the "normal ready Design Library" the task
   targets) and avoids ever putting archived-design existence into any public-read asset.
4. **Categories**: reuse the existing `generated/catalog-reference/manifest.json` +
   `client/**` client-safe taxonomy snapshot (already public, already contains `id, name, sortOrder,
   isActive, isCustomerVisible` — a strict superset of what Studio's category filter dropdown needs).
   No new category asset.
5. **Tags**: Studio's *existing* tag list needs `id, name, status` (approved vs archived) plus, for
   Studio's tag-management page specifically, `aliases`/`preferredWhen` (out of scope — that page
   keeps its current Firestore path per the task's explicit "Taxonomy management pages" out-of-scope
   list). For the **Design Library's** tag filter/narrowing only, the new
   `studio/ready-index.json` asset (item 2) carries per-design `tags`, which is sufficient input to
   run the existing `computeFacetedTagsForDraftSelection`-equivalent logic locally — no separate tag
   facet asset is needed the way Portal needed one, because Studio was never missing a bounded count
   source; it was missing a bounded *card* source to compute counts from in the first place.

#### Studio ordering, search, and tag-behavior preservation (explicit, testable requirements)

- **Ordering**: primary `updatedAt DESC`, tiebreaker document ID `DESC` — enforced by the new
  `studio/ready-index.json`'s own publish-time sort (a new, Studio-specific pure sort function
  mirroring `portalCatalogBrowseOrder`'s shape but keyed on `updatedAtMs`/id exactly as
  `sortDesignsForListQuery.ts`'s existing `compareDesignsForListSort` does), **not** a reuse of
  Portal's `createdAt`-based `portalCatalogBrowseOrder`. The Studio consumer must not re-sort
  alphabetically or by Storage/object order.
- **Search**: preserve exact current semantics — single case-insensitive substring test across
  `id`/`title`/`description`/`tags` (`filterDesignsBySearch`), applied **client-side over the
  generated card set**, exactly as it is applied today over the Firestore-sourced `designs` array. No
  new server-side/generated search index, no tokenization, no shard lookup — this is a straight
  reuse of the existing pure `filterDesignsBySearch`/equivalent logic against a different data
  source (generated cards instead of Firestore-sourced cards), which requires **zero search-semantic
  changes**, only a data-source swap.
- **Category/tag/halftone filtering and dynamic narrowing**: same reuse principle — existing pure
  functions (`filterDesignsByCategory`, `filterDesignsByTags`,
  `computeFacetedTagsForDraftSelection`, halftone helpers) run unchanged against the generated card
  set instead of the Firestore-sourced `designs` array. Because the generated set covers the *whole*
  ready catalog from the first fetch (not just loaded pages), narrowing counts become accurate
  catalog-wide immediately — see the "known existing limitation" note above; Formal Review must
  confirm this improvement is acceptable/desired, not silently ship it as a side effect.
- **Page size**: **100**, unchanged — the client already slices/paginates its in-memory array for
  "Load more"; with the full ready-card set present from one generated fetch, "Load more" becomes a
  pure client-side reveal-more-of-already-loaded-array operation (no new network request per page),
  which is a strict simplification, not a behavior change to the visible 100-per-page/"Load more"
  contract.
- **Request-selection mode**: reuses `useDesigns`/the same page exactly as today (confirmed: it does
  not use a separate hook); once the page's `designs` source is generated cards instead of Firestore
  results, selection mode inherits the same field/order/filter behavior automatically, no separate
  selection-mode code path to change.

#### Generated failure behavior (Studio-specific)

- **Search, category, tag, multi-tag, narrowing**: if the generated ready-index (or its underlying
  card buckets/taxonomy) cannot load, show a Studio-safe "Design Library is temporarily unavailable"
  state — mirrors Portal's existing pattern exactly (no Firestore fallback, no partial-page scan,
  bounded retry, exact dev-only failure reason logged).
- **Normal unfiltered browse fallback — explicit choice required by Formal Review**: unlike Portal
  (whose Plan already commits normal browse to bounded Firestore pages permanently), Studio's normal
  browse *is* the thing being moved off Firestore by this amendment. Formal Review must pick one:
  (1) on generated-asset failure, fall back to the **existing, already-correct, already-bounded**
  100-document Firestore first page (`designService.listDesignsPage`) — this is safe because it is
  the exact mechanism already in production today, not a new fallback to build, or (2) a bounded
  "unavailable" state with no Firestore fallback at all, matching Portal's stricter convention.
  Recommendation: **(1)**, because Studio's existing bounded Firestore path is already proven correct
  and safe (unlike Portal's removed unbounded fallback) — reusing it as an explicit, traced,
  TTL'd fallback costs nothing new and gives staff continuity during a generated-asset outage. This
  is a recommendation, not a decision Review may skip.

#### Cache, freshness, and edit-invalidation

- Same generated-asset TTL/immutable-cache/in-flight-dedup pattern already implemented in
  `portalCatalogAssetService.ts` — reused at the shared-utility layer where possible, or mirrored in
  a new Studio-side service (`[NEEDS REPO CHECK]` exact file, e.g.
  `apps/studio/src/renderer/src/features/designs/services/studioCatalogAssetService.ts`).
- **After a staff member saves/archives/restores a design**, the editor continues to show the
  authoritative Firestore-saved result immediately (unchanged — editing stays Firestore-authoritative
  per this amendment's explicit scope). The Design Library's generated card set does **not**
  automatically reflect the edit until the next snapshot republish; the existing
  `applyDesignPatch`/local-card-invalidation pattern already present in `useDesigns.ts` must be
  extended to patch the in-memory generated-card copy the same way it already patches Firestore-page
  results today, so a return to the list shows the just-edited card correctly without waiting for
  republish or reloading the whole generated set.

#### Electron transport — decided by Formal Review

**Decision (Formal Review, 2026-07-24): Option 2 — Electron main-process IPC bridge.** Rejected
Option 1 (browser `fetch()` + CORS extension) because packaged Electron's `file://` renderer origin
very likely sends no usable `Origin` header (or `Origin: null`) on cross-origin fetches, and
allow-listing a `null`/`file://` origin in bucket CORS is a materially broader, harder-to-audit trust
boundary than a fixed hostname — per `SECURITY.md`'s "when uncertain, choose the more secure option."

The new IPC channel's main-process handler:
- Accepts only an asset path string matching an allowlisted prefix pattern
  (`generated/portal-catalog/**` or `generated/catalog-reference/**` only); rejects anything else,
  per `SECURITY.md`'s IPC input-validation rule.
- Resolves the download URL and fetches server-side using the same Firebase Storage client SDK
  already used elsewhere in Studio (no new dependency).
- Returns parsed JSON or a structured error only — never a raw Node error object or stack trace to
  the renderer.
- Requires **no bucket CORS change at all** (this option was selected specifically to avoid that);
  works identically in dev and packaged builds with no dev/packaged branching in the renderer.

No CORS entry is added for Studio's dev origin under this decision. If a future need for direct
browser `fetch()` from Studio's renderer arises, that would require its own separate Review.

#### Normal-browse generated-failure fallback — decided by Formal Review

**Decision (Formal Review, 2026-07-24): reuse the existing, already-bounded 100-document Firestore
first page** (`designService.listDesignsPage`) as the fallback when the generated ready-index (or its
underlying card buckets/taxonomy, reached via the IPC bridge) fails to load. This is safe because it
is Studio's actual existing production behavior today (already `limit(101)`-bounded, already 15s
cached, already traced) — not a new fallback being invented. Requirements:
- Must log a structured dev-only reason ("generated ready-index unavailable, used bounded Firestore
  fallback") — never silent.
- Must never page-to-completion or loop on its own.
- A later successful generated-asset fetch must supersede a prior fallback state (the page must not
  get permanently stuck showing the Firestore-fallback result set once recovery is possible).

#### Payload budgets, cache limits (fixed by Formal Review, subject to Test-phase measurement)

| Asset | Ceiling | Basis |
|---|---|---|
| `generated/portal-catalog/v{contentVersion}/studio/ready-index.json` (new) | 512 KiB uncompressed, **provisional** — Test phase must measure the real dev-corpus size before this is final; apply the same non-blocking 80%-of-ceiling diagnostic warning already used for the AI reference snapshot (R-013) if measured size approaches it | Modeled on the existing tag-facet (256 KiB) and card-bucket (32 KiB/bucket) budgets |
| Reused card buckets | unchanged (32 KiB/bucket) | no change |
| Reused client taxonomy | unchanged (256 KiB) | no change |

**Exact path and manifest field (fixed by Formal Review):**
- Path: `generated/portal-catalog/v{contentVersion}/studio/ready-index.json`
- Manifest field: `studio.readyIndexPath` — additive, single fixed path, following the existing
  `filters.tagFacetPath` precedent (`PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION` unchanged; no
  dual-parser fallback needed since no deployed consumer of the old manifest shape exists for Studio).
- Content shape: `{ schemaVersion: 1, catalogVersion, generatedAt, designs: [{ id, tags: string[],
  updatedAtMs }] }` — array order **is** the canonical `updatedAt DESC, id DESC` order (no separate
  ordering-metadata field). No fields beyond `id`/`tags`/`updatedAtMs` — title/description/
  thumbnailPath/etc. are already available from the existing card buckets keyed by the same `id`,
  keeping this index minimal and its budget small.

#### Deployment/publication impact (if this amendment is approved as scoped)

- **Affected Function**: only `publishPortal()` (in `functions/src/catalogSnapshots/publishCatalogSnapshots.ts`)
  gains one new asset-build step; `rebuildCatalogSnapshots` and `onPortalCatalogSnapshotSourceWritten`
  are the same two Functions already identified for redeployment in this goal's existing checkpoints
  — no new Function, no new trigger, no new coordination document.
- **Manifest**: additive field only (one new path under the existing `portal-catalog` manifest,
  `[NEEDS REPO CHECK]` exact key), consistent with the existing manifest-schema-unchanged-for-additive-fields
  precedent already used for `filters.tagFacetPath`.
- **Storage Rules**: no change needed for the new asset — it falls under the existing
  `generated/portal-catalog/{allPaths=**}` public-read wildcard, exactly as `tags-facet.json` did
  (must still be proven, not assumed, via a rules test the same way the tag-facet path was proven).
- **CORS**: only if Formal Review selects Electron transport option 1 above; not needed for option 2.
- **Studio deployment**: no Firebase deployment for the Studio *renderer* code itself (it's a desktop
  build, `npm run build:studio`), but the generated-asset *producer* side does require the same
  Functions redeploy + one republish already pending for this goal.

#### Owner decision (resolved)

Formal Review (see the Review doc's amendment) decided the Electron transport (IPC bridge), the
normal-browse failure fallback (existing bounded Firestore page), and fixed the exact asset
path/manifest field/provisional budget. The one remaining owner-only decision is resolved:

**Owner approved (2026-07-24): dynamic tag narrowing becomes accurate catalog-wide**, replacing
today's limitation where counts only reflect whatever page(s) had been loaded via "Load more." This
is accepted as an intentional, approved behavior improvement, not an unapproved side effect.

**All amendment gates are now clear. Implementation may begin.**

#### Amendment 2026-07-24 — Studio ordering corrected to createdAt (owner QA on generation 38)

Owner tested the generation-38 Studio ready catalog. Two findings:

1. **Ordering defect.** Designs visibly moved in the Design Library when added to a print request,
   allocated to a show, or edited — none of which should affect catalog position. Root cause:
   `studioCatalogReadyOrder`/`buildPortalCatalogStudioReadyIndex` sorted by `updatedAtMs`, mirroring
   Studio's own pre-existing Firestore-backed default sort field (`DESIGN_LIBRARY_DEFAULT_SORT_FIELD
   = "updatedAt"`, `designLibraryFilters.ts`). `updatedAt` is bumped by `requestCount`/
   `lastRequestedAt`/`lastAddedToShowAt`/edit writes (confirmed via `onPortalCatalogSnapshotSourceWritten`'s
   own change-detection field list, which already treats these as "relevant" for republication —
   correct for triggering a rebuild, but the *ordering field itself* should never have been one that
   moves on its own). **Owner decision: order by the design's original creation timestamp instead —
   `createdAt DESC, id DESC` — since `createdAt` is immutable after creation.**
2. **~1,300 Firestore reads during the Studio test — attributed, not a new defect.** Confirmed via
   direct code inspection (not the live session — see the Review amendment's read-attribution
   analysis): this traces entirely to `useCatalogTags({ includeArchived: true })` (pages the full
   `tags` collection at `TAG_LIST_PAGE_SIZE = 500`/page — ~3 pages ≈ 1,122 reads at the real
   ~1,122-tag dev corpus, cached 12h) plus `useCategories()` (`categoryService.listCategories`,
   ≤200 reads, cached 12h) — both called unconditionally by `DesignLibraryPage.tsx` on every mount,
   **unchanged since before this Studio generated-catalog effort began**. The design-card/browse
   path itself is confirmed at zero Firestore reads (structural proof, unchanged). This is not a
   regression introduced by the generated-catalog work; it is a pre-existing cost this task's
   original scope never targeted (only design browse/search/filter/card data was in scope; tag/
   category taxonomy loading was explicitly deferred — see the existing Plan text's item 4/5 above).

**Creation-timestamp semantics, confirmed by direct repository investigation (not assumed):**

- **Authoritative field**: `designs/{designId}.createdAt`, a Firestore `Timestamp`.
- **Every creation path** writes it unconditionally: `designService.createDesign`
  (`serverTimestamp()`, Studio renderer client SDK, the only caller being the import-to-catalog
  path) and `promoteCustomerUploadToAiReview` (`FieldValue.serverTimestamp()`, Cloud Function,
  Admin SDK). No other `designs` document–creation path exists in the repository.
- **Immutability enforced by `firestore.rules`**: the `designs/{designId}` update rule requires
  `request.resource.data.createdAt == resource.data.createdAt` — no client update can change
  `createdAt` once set. No code path (client, server, or the one existing backfill script) writes
  to `createdAt` on an already-existing document.
- **No repo-visible evidence of legacy designs missing `createdAt`** — no ADR, migration script, or
  comment discusses `createdAt` ever being optional or backfilled for this collection. This cannot
  be verified to 100% certainty from static repository inspection alone (a live Firestore query
  would be required); flagged honestly as a residual, low-probability risk rather than assumed away.
- **Conclusion: use `createdAt` directly. No backfill, migration, or legacy-handling code required.**

**Generated contract change:**

| | Before | After |
|---|---|---|
| `PortalCatalogStudioReadyIndex` entry field | `updatedAtMs: number` | `createdAtMs: number` |
| Ordering | `updatedAt DESC, id DESC` | `createdAt DESC, id DESC` |
| Manifest field | `studio.readyIndexPath` (unchanged path/shape otherwise) | unchanged |
| Schema version | `PORTAL_CATALOG_SCHEMA_VERSION` / `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION` | unchanged (field rename within the same schema version — no deployed Studio consumer of the old shape exists to break, per the same precedent used for the original `studio.readyIndexPath` addition) |

Files changed: `packages/shared/src/catalog-snapshots/catalogSnapshot.types.ts` (type field rename +
doc comments), `catalogSnapshot.parsers.ts` (validates `createdAtMs`, not `updatedAtMs`),
`functions/src/catalogSnapshots/snapshotBuilders.ts` (`studioCatalogReadyOrder`,
`buildPortalCatalogStudioReadyIndex`), `apps/studio/.../services/studioCatalogAssetService.ts` (doc
comments only — the function body was already field-name-agnostic), `apps/studio/.../hooks/
useGeneratedReadyDesigns.ts` (doc comments), `apps/studio/.../utils/generatedReadyDesignMapping.ts`
(`ReadyIndexEntry.createdAtMs`), plus all associated tests.

**Portal impact: none.** Portal's own generated assets (`portalCatalogBrowseOrder`, card buckets,
Discover, search shards) already use `createdAt`-based ordering and are completely untouched by this
correction — they were never the source of the defect.

**Legacy-data handling**: per the investigation above, no backfill is required or being performed.
If a live design is ever found missing `createdAt` in production (not confirmed to exist, but not
provably absent either), `studioCatalogReadyOrder`'s `?? 0` fallback treats it as the oldest entry —
a safe, non-crashing default, not a silent misuse of a different field.

**Deployment/republish requirement**: identical scope to the original Studio generated-catalog
amendment — `rebuildCatalogSnapshots`/`onPortalCatalogSnapshotSourceWritten` (same two Functions,
`publishPortal()`'s output changed again) plus one republish. No Storage/Firestore rules or CORS
change.

#### Amendment 2026-07-24 — Close the Studio Design Library taxonomy read gap (categories + tags)

The read-attribution analysis above found `useCategories()` and `useCatalogTags({ includeArchived:
true })` unconditionally querying Firestore on every Design Library mount (~200 + ~1,122 reads at
the real dev corpus) — a gap against this Plan's own earlier text (item 4/5 of the original Studio
amendment), which already said categories should reuse the generated client-safe taxonomy. This
amendment closes that gap for the normal (non-archived) Design Library.

**Scope, confirmed by direct inspection of every consumer before changing anything:**

- `DesignLibraryPage.tsx`'s own `categories`/`catalogTags` variables feed exactly four things: the
  category filter dropdown (`buildCategoryFilterOptions` — reads `id`/`name`/`isActive` only), the
  category-name lookup for the detail modal (`id`/`name`), the tag filter/narrowing modal
  (`DesignLibraryTagFilterModal` → `computeFacetedTagsForDraftSelection` — reads `name`/`aliases`/
  `status`/`preferredWhen`), and `EditDesignModal`'s tag/category pickers
  (`buildCatalogTagSuggestions`/`resolveCatalogTagCandidate` — reads `name`/`aliases`/`status`;
  `TagChipInput` never reads `preferredWhen`). None of these are management flows.
- `CategoryManagementModal` (create/edit/archive/restore/reorder categories) and
  `TagManagementModal` (same for tags) are **management** flows and must keep the full
  Firestore-backed data (`firestoreCategories`/`firestoreCatalogTags` — `TagManagementModal` already
  calls its own independent `useCatalogTags` internally, no prop threading involved).
  `CategoryManagementModal` needs `description` (not in the generated snapshot) and the full
  active+inactive set for restore — it now explicitly receives `firestoreCategories`, not the
  generated-sourced `categories` variable.

**Data source**: the existing `generated/catalog-reference/manifest.json` + `client/**` snapshot —
the same one Portal already publishes and consumes. No new generated asset, no manifest change, no
publisher change. Added `studioCatalogAssetService.loadClientTaxonomy()` (mirrors Portal's
`portalCatalogAssetService.loadClientTaxonomy` exactly: 30s manifest-TTL-scoped cache, in-flight
dedup, content-version staleness check).

**Field mapping (`generatedReadyDesignMapping.ts`)**:
- `clientCategoryToCategory`: `id/name/sortOrder/isActive` preserved; `description` (not in the
  snapshot, never read by any Design-Library-facing consumer) and audit fields are safe placeholders.
- `clientTagToCatalogTag`: `id/name/aliases/status` preserved; `preferredWhen` becomes `""`
  (server-only AI guidance, correctly excluded from the public snapshot).

**Owner-approved narrow behavior change**: `tagMatchesCatalogSearch` (tag-modal search) previously
also matched against each tag's `preferredWhen` guidance text — that sub-path silently stops matching
now that `preferredWhen` is empty for generated-sourced tags. Name/alias matching (the primary path)
is completely unaffected. Confirmed via `AskUserQuestion` — owner chose to drop this narrow
`preferredWhen` search path rather than keep the full tag Firestore read solely to preserve it.

**Active-only category convention**: the generated taxonomy snapshot only ever contains active
categories (`isActive === true` in its own Firestore build query) — a ready design whose category
was deactivated after assignment will show no category label in the generated-sourced dropdown,
where Studio's prior Firestore-backed `includeInactive: true` behavior would still show that one
design's (now-inactive) category name. This exactly matches Portal's own already-accepted convention
for its generated categories (same active-only snapshot, same limitation, never treated as a defect
there) — not a new tradeoff introduced by this amendment.

**Fallback**: if the generated taxonomy snapshot fails to load, the Design Library falls back
transparently to the existing Firestore-backed `useCategories`/`useCatalogTags` hooks (already
running unconditionally regardless, since hooks cannot be called conditionally) — bounded, already
cached 12h, matching the existing accepted cost rather than a new failure mode.

**Files changed**: `studioCatalogAssetService.ts` (new `loadClientTaxonomy`),
`generatedReadyDesignMapping.ts` (`clientCategoryToCategory`, `clientTagToCatalogTag`), new
`useGeneratedDesignLibraryTaxonomy` hook, `DesignLibraryPage.tsx` (category/tag source swap,
`CategoryManagementModal` pinned to `firestoreCategories`, `refreshCatalog` always reloads the
Firestore-backed hooks since management modals depend on them regardless of Design Library mode).

**Portal impact: none** — reuses an existing Portal-published asset unchanged; no publisher change,
no manifest change, no new deployment surface.

**Deployment/republish requirement: none for this specific fix** — it consumes an already-published,
already-live generated asset (`generated/catalog-reference/**`). No Functions redeploy or republish
is required to activate the categories/tags conversion. It ships as part of the same Studio build the
`createdAt`-ordering fix requires; only the ordering fix needs the Functions redeploy/republish.

### AI snapshot field parity

The AI snapshot must provide the exact direct-loader projection used today:

- tags: `id`, `name`, `aliases`, `preferredWhen`, and approved `status`
- categories: `id`, `name`, optional `description`, plus derived `names` and case-normalized
  `idsByName`

The same parsed snapshot feeds primary enrichment, resolver/alias matching, optional reranker,
suggested-tag author, AI playground, tag-rerank playground, reprocessing, and retry flows. Effective
tag exclusions, prompt/model selection, rerank/author modes, and suggested-tag policy remain in the
separate AI settings loader. Secrets remain in Secret Manager. Direct Firestore and snapshot-backed
loaders must pass the same parity fixtures before consumption is enabled.

### Repeated design lookups

Create a service-owned design-by-ID cache with:

- unique-ID normalization
- concurrent Promise deduplication
- bounded TTL/LRU
- rejection eviction
- explicit invalidation after authoritative edits
- batch/chunk retrieval where rules/indexes safely permit it

Cards consume parent query data. Detail pages reread only fields that are intentionally authoritative
and not in the card projection.

## Expected Files / Modules

### Existing files to change

- `functions/src/ai/aiEnrichmentRuntimeCache.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/aiEnrichmentPlayground.ts`
- `functions/src/index.ts`
- taxonomy mutation/invalidation paths including `functions/src/archiveTaxonomyWithGuards.ts`
- `apps/studio/.../staff-inbox/services/staffInboxSubscriptionService.ts`
- `apps/studio/.../staff-inbox/components/StaffInboxProvider.tsx`
- `apps/studio/.../designs/hooks/useDesigns.ts`
- `apps/studio/.../designs/pages/DesignLibraryPage.tsx`
- `apps/studio/.../designs/services/designService.ts`
- `apps/studio/.../designs/services/catalogTagService.ts`
- `apps/studio/.../designs/services/categoryService.ts`
- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts`
- `apps/portal/features/catalog/services/catalogService.ts`
- request/favorite/detail design-resolution callers found by the inventory
- `packages/shared/src/utils/firestoreUsageTrace.ts`
- `firestore.rules`, `storage.rules`, and `firestore.indexes.json` only if Review confirms necessity

### New module groups

- `packages/shared/src/catalog-snapshots/`
- `functions/src/catalog-snapshots/`
- Studio/Portal snapshot cache services and query/page cache utilities
- focused tests beside each module

Final filenames are implementation details, but Firebase access stays in services/Functions, never
React components.

## Data, Security, Backend, UI, and Migration Impact

### Architecture

Durable generated read models and manifest publication require an ADR. Firestore remains canonical;
Storage assets are derived, replaceable, and never accepted as write authority.

### Security

- AI snapshot is server-only.
- Client snapshot and Portal catalog are allowlisted field projections.
- Public guest delivery, if selected, is restricted to generated client-safe prefixes.
- Publisher/rebuild callable requires owner/admin authorization.
- Diagnostics log IDs/signatures/counts only, never artwork, prompts, tokens, secrets, or document bodies.
- Rules tests are mandatory for any rules change.

### Data model

Add the two `snapshotPublicationState/*` documents defined above. Client reads/writes are denied;
Admin Functions own them. No design lifecycle field changes. Generated JSON contracts are documented
in `DATA_MODEL.md`.

### Backend/deployment

Expected deployable resources are tracked separately:

1. changed AI/reference-loading Functions
2. new tag/category/design invalidation triggers
3. new publication-state worker trigger
4. new owner/admin `rebuildCatalogSnapshots` callable
5. Storage rules for the two public-safe generated prefixes and private AI prefix
6. Firestore rules denying client access to `snapshotPublicationState`
7. Firestore indexes only if implementation proves an existing index is insufficient
8. initial reference/catalog snapshot publication
9. creation/reconciliation of the two coordination documents

Each requires an exact-resource **fresh-prints-dev** approval before deployment/initialization.
Production remains forbidden. No secrets or environment variables are planned.

### UI/UX

Visible workflows and ranking remain unchanged. Loading becomes paginated/cached; search may show a
clear bounded loading state while index shards/cards load. Significant visible behavior changes return
to Review/owner approval.

### Migration/initialization

Consumers remain compatible with Firestore fallback until an approved dev initialization publishes
the first valid manifest. Rollback selects the previous manifest/version or disables snapshot
consumption and returns to bounded Firestore paths. No destructive migration.

## Scaling Model

All numbers below are calculated/estimated unless labeled measured.

### Reference data

Let `T` = approved tags (~50 supplied), `C` = active categories, `D` = enrichment jobs, and `I` =
Function instances/cache generations.

| Workflow | Current worst-case Firestore docs | Proposed normal Firestore docs |
|----------|-----------------------------------|--------------------------------|
| 20-design import | `20T + 20C` = ~1,000 tag docs + categories | 0 tag/category docs; ~`I` Storage manifest/snapshot loads |
| 90-design import | `90T + 90C` = ~4,500 tag docs + categories | 0 tag/category docs; ~`I` Storage manifest/snapshot loads |

Fallback temporarily costs `T + C` per warm instance/cache generation, not per design.

### Catalog

| Catalog size | Current Studio Library | Current Portal search/multi-tag | Proposed first page |
|--------------|------------------------|---------------------------------|---------------------|
| 100 | up to 100 | up to 100 matching | ~40 or one bounded generated page |
| 1,000 | up to 1,000 | up to 1,000 matching | ~40 or one bounded generated page |
| 10,000 | capped at 2,000 but incomplete | up to 10,000 matching | ~40 or one bounded generated page |

Portal Discover currently requests up to 320 document results per cold route mount; proposed normal
Firestore design reads are 0 for a valid Discover snapshot.

For 10/100 Portal customers, generated immutable assets shift repeated catalog card delivery from
per-customer Firestore document reads to cached Storage/HTTP requests. Exact bandwidth/request cost is
unknown until generated payloads are measured. The test report must record compressed/uncompressed
bytes, object count, and cold/warm request count.

### Quantitative acceptance budgets

| Controlled state | Required result |
|------------------|-----------------|
| Everything closed | 0 client-originated reads; 0 unexplained repeating server reads |
| Studio dashboard, 30 minutes after initial load, no writes/reconnect | 0 tag/category/design queries; 0 listener reattachments; 0 listener emissions |
| Portal non-catalog, 30 minutes after initial load, no writes/reconnect | 0 taxonomy/catalog queries; 0 repeated user/request queries; 0 listener reattachments |
| Navigation sequence repeated five times | Final active-listener count exactly equals cycle 1; attach minus detach count returns to the same route baseline |
| 10–20 design import with valid reference snapshot | 0 Firestore tag reads; 0 Firestore category reads; 0 Firestore reference fallback loads; at most one manifest + one AI snapshot download per warm Function instance/content version |
| 10–20 design import direct design reads | At most two direct server design-document reads per enrichment job, plus explicitly counted bounded initial route pages and one changed-document delivery per matching active listener/status transition; measured total must reconcile to that formula within 10% |
| Completed import, 30 minutes after terminal job state | 0 reference-data reads and 0 enrichment retries/invocations for completed jobs |
| Studio Library first page | At most 101 returned documents (100 cards + lookahead), independent of catalog size; one optional aggregate count |
| Portal Library first page | At most 41 returned documents (40 cards + lookahead), independent of catalog size; one optional aggregate count |
| Portal Discover with valid snapshot | 0 Firestore design reads; cold path at most one manifest + one Discover object; cached return does not reread design documents |
| Search/multi-tag first page | 0 full-catalog Firestore hydration; at most 40 cards, 2 MiB transfer, 8 MiB parsed working set |
| Cached page return before manifest TTL | 0 Firestore document reads and 0 immutable-object redownloads |

Operational writes or reconnects must be annotated separately. A listener emission is allowed only
when a matching document actually changed or Firestore performed a documented reconnect; it may not
be relabeled as idle baseline.

## Implementation Sequence and Internal Gates

1. Add harmless, default-off diagnostics only; no query behavior change.
2. Run fully-closed and route-by-route Phase 0 baseline.
3. Apply and test only evidence-backed containment fixes.
4. Create a Phase 0 containment review record. If any repeating source is unexplained, stop.
5. After that internal gate passes, add shared snapshot schemas/validators and coordinator primitives.
6. Add atomic reference publication, mutation invalidation, cache/in-flight dedupe, and bounded fallback.
7. Add client-safe taxonomy consumption and verify AI/direct-loader parity.
8. Remove Studio `loadAll`; implement 100-card `updatedAt DESC` pagination/cache/search-ID path.
9. Bound/dedupe remaining design listeners and design-by-ID resolution.
10. Publish/consume Portal Discover, search/tag shards, and card buckets.
11. Remove `listAllMatchingReadyDesigns` from customer search/multi-tag execution paths.
12. Run full automated suite and the identical controlled measurement matrix.
13. Stop for exact dev Functions/rules/index/coordination/snapshot-initialization approval.
14. After approved dev deployment, run delayed Usage Insights verification.
15. Request owner `PASS`, `FAIL`, or `PASS WITH NOTES`, then Signoff.

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Root lint | `npm run lint` | yes; document pre-existing failures |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal build | `npm run build:portal` | yes |
| Studio build/typecheck | `npm run build:studio` | yes; separately record known TS5103 if still present |
| Functions build/typecheck | `npm run build --prefix functions` | yes |
| Focused tests | `npx tsx --test <all changed/new test files>` | yes |
| Rules tests | new emulator suite command documented during implementation | yes if rules change |

Focused coverage must include all owner-supplied snapshot generation/consumption, AI behavior,
reference counting/Strict Mode, bounded design query, pagination, Portal snapshot, malformed/fallback,
publication failure/rollback, coalescing, and client-safe-field cases.

No emulator rules harness exists in the inspected repository. Review approves adding the official
dev-only `@firebase/rules-unit-testing` package and a narrow Firestore/Storage emulator test command.
No other dependency is approved by this plan.

### Manual / measured

- Full Phase 0 isolation and route matrix.
- Controlled 10–20 design import only; do not repeat 90 until understood.
- Tag/category management create/edit/archive/restore/delete and publication verification.
- AI title/description/category/tag/alias/preferred/exclusion/suggested-tag/reranker parity.
- Studio and Portal catalog/filter/search/load-more/add-to-request parity.
- Snapshot payload size, Storage request count, cache hit/miss, stale window, and fallback.
- Same workflow before/after; record Usage Insights reporting delay.

## Human Checkpoints

| Checkpoint | Status |
|------------|--------|
| Formal generated-read-model architecture Review | completed by Review Agent; owner deployment approval not implied |
| Out-of-repo process/tab/tunnel shutdown for isolation test | required future checkpoint; owner action pending |
| Phase 0 containment result before long-term architecture | required future internal gate; not completed |
| Exact dev Functions/rules/index deployment | required future checkpoint; owner approval pending |
| Snapshot/coordination initialization | required future checkpoint; owner approval pending |
| Manual UI/workflow/read-budget verification | required future checkpoint; owner action pending |
| Production deployment | not applicable; explicitly out of scope |

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Snapshots hide an active retry/listener loop | Critical | Hard Phase 0 gate; stop if unexplained |
| Public asset exposes AI/private fields | Critical | Separate schemas/prefixes, field allowlist tests, rules tests |
| Trigger storm rebuilds once per mutation | High | Lease/generation coalescing and bounded follow-up |
| Manifest points to partial version | High | Validate/upload all before atomic manifest swap |
| Snapshot failure makes AI stale | High | Previous version + structured fallback + manual rebuild |
| Full search index harms mobile memory | High | Sharded index/card buckets, payload budgets, LRU |
| Pagination changes visible result order | Medium | Stable indexed sort + ID tiebreaker + regression/manual tests |
| Listener bounding misses operational alert | High | Derive exact active states/time bounds in Review; manual ops test |
| Cache returns stale edited design | Medium | version/updatedAt keys and explicit mutation invalidation |
| New indexes/rules unavailable | Medium | implementation fallback; human deploy checkpoint |
| Current dev processes contaminate baseline | High | fully-closed Test A before claims |
| Existing build/lint debt masks regression | Medium | record baseline and isolate changed-file/focused results honestly |

## Rollback

1. Disable snapshot consumption with a centralized service flag and use bounded Firestore fallback.
2. Point manifests to `previousVersion` if a published version is bad.
3. Revert query/listener changes by commit while keeping diagnostics.
4. Remove/disable new triggers/callables only through an approved Firebase deployment.
5. Keep generated objects for forensic comparison; delete only in a separately approved cleanup.
6. No canonical taxonomy/design data is deleted or rewritten by rollback.
7. Deployed rule/index additions may remain unused safely; removing them requires a separately approved
   deploy. Rollback rules must continue denying client access to private AI assets/state.
8. Firestore fallback remains bounded. Rollback must not restore Studio `loadAll`, Portal full
   hydration, or four-query Discover except under a separately documented emergency decision.

## Documentation Updates Required

- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/BACKEND.md`
- `docs/architecture/FIREBASE.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/standards/SECURITY.md`
- `docs/standards/TESTING.md`
- `docs/standards/DEPLOYMENT.md`
- `docs/project/DECISIONS.md` (new ADR)
- `docs/project/RISK_REGISTER.md` for any residual unexplained/accepted read source
- implementation, containment review, test, manual checkpoint, and signoff records
- `.cursor/workflow/state.md` and `references/project-chatgpt-handoff/CURRENT-STATE.md`

## Review Decisions / Remaining Owner Decisions

- Staff Inbox constraints are not guessed in advance. Phase 0 maps required alert states/time windows;
  the containment review must approve the exact bounded query before it ships.
- Client assets use narrowly public generated Storage paths; AI assets remain private Admin-only.
- Portal normal browse remains bounded Firestore; Discover/search/multi-tag use generated assets now.
- The official Firebase rules-unit-testing dev dependency/harness is approved.
- Coordination paths and lease/version fields are fixed in this Plan.
- No product decision is currently required. Owner action remains required for process shutdown,
  Firebase deployment/initialization, and final manual verification.

## Approval

- Review doc: `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md`
- Verdict: approved_with_changes

---

## Amendment — Remaining Targeted-Publication Read Attribution (2026-07-24)

The owner-confirmed card-only edit at `2026-07-24T19:01:22Z` used one deployed
`onPortalCatalogSnapshotSourceWritten` execution. Its development accounting reported zero
ready-design, category, tag, and coordination-document reads. The remaining Console delta therefore
must not be "reduced" by weakening the already-zero-Firestore targeted path.

Keep the current event-payload classifier and Storage generation-precondition merge. Extend its
sanitized development accounting with logical manifest reads/writes, override-asset reads,
transaction attempts, generation-precondition retries, Storage download/write/metadata operations,
and a duplicate-delivery outcome. Treat an already-identical override card as an idempotent no-op;
use the CloudEvent timestamp for deterministic publication metadata. Do not add Firestore reads,
transactions, coordination documents, corpus queries, or a new asset family.

Focused verification must cover card-only/full/operational routing, zero targeted Firestore reads,
event-payload mapping, bounded manifest operations/retries, duplicate idempotency, concurrent merge
preservation, and unchanged Studio session override behavior. This amendment authorizes local code,
tests, and documentation only. It does not authorize deployment, rebuild, republish, or production
access.

---

## Amendment — Separate Portal Firebase Debug Window (2026-07-24)

The Portal owner QA report was inactive (`startedAtIso: null`) because the app-wide mount only
attached a shortcut and rendered an in-page panel; it did not start tracing. Tracing depended on a
persisted opt-in flag or the panel's Reset/reload controls, and navigation made the same-window panel
unusable for observation.

Keep the main Portal tab as the sole trace owner. In eligible development builds for exactly
`fresh-prints-dev`, the app-wide provider starts or restores the trace session independently of
debug UI and publishes only the existing sanitized snapshot contract through a same-origin
`BroadcastChannel`. `Ctrl+Shift+F` opens/focuses one named `/firebase-debug` browser window. The
debug window must complete an owner-token handshake before showing data; direct access without a
live eligible owner fails closed. Reset and enable/disable commands are validated and executed by
the owner tab. Closing/reopening the debug window never clears the owner session; refreshing the
owner creates a new owner/session identity.

The report contract must explicitly distinguish active from inactive sessions. An inactive
`startedAtIso: null` report may be displayed only with a clear inactive state and must not appear to
be a valid zero-activity capture. Popup blocking produces a concise safe message in the owner tab.
No document bodies, payloads, URLs, tokens, customer data, or secrets cross the channel.

This correction reuses the existing tracer, report formatter, panel UI, and gate. It adds no
Firebase calls and authorizes no query changes, Functions/rules changes, deployment, snapshot
rebuild, republish, production action, or idle-spike diagnosis.

---

## Amendment — Separate Studio Firebase Debug Window (2026-07-24)

Replace Studio's in-renderer Firebase Debug overlay with one development-only Electron
`BrowserWindow`. Portal keeps its existing in-page panel. This correction changes only diagnostic UI
transport and lifecycle; it does not diagnose or fix the read spike, card-refresh issue, or catalog
ordering issue, and it authorizes no deploy, republish, or Firebase mutation.

The main Studio renderer remains the sole owner of the active trace session. Existing
instrumentation continues writing to the renderer-local shared tracer. A narrow tracer subscription
publishes sanitized `FirestoreTraceSnapshot` values through preload IPC to an Electron-main broker.
The broker retains only the latest snapshot and forwards it to the one debug-window renderer. Reset
and enable/disable commands travel back through main to the authoritative main renderer. Closing the
debug window never resets or disables tracing.

Preserve `Component → Hook → Service → Electron API → IPC → Main`. Add an allowlisted
`firebaseDebug` preload surface for open/focus, sanitized snapshot publication/subscription/current
snapshot, reset, tracing toggle, and close. Electron main owns window creation, sender validation,
singleton/focus/restore behavior, and lifecycle cleanup; React components call services/hooks only.

`Ctrl+Shift+F` remains attached once in the main renderer and requests open/focus without changing
the route. The debug window loads the existing renderer entry with an internal marker and renders
only debug UI, so it never mounts normal Studio routing or overwrites route/action attribution.
Closing and reopening the debug window preserves the main-renderer session. Main-app shutdown closes
the debug window.

Opening fails closed unless Electron is unpackaged/development, the request originated from the
retained main Studio window, and the existing gate reports project ID exactly `fresh-prints-dev`.
Context isolation remains enabled and Node integration remains disabled. Only the existing sanitized
trace schema may cross IPC—never document bodies, callable payloads, customer data, signed URLs, raw
errors, authentication tokens, or secrets.

Focused verification must cover gate denial, sender validation, singleton/focus/restore/reopen/close
behavior, shared live snapshots, main-route preservation, reset/toggle commands, report equivalence,
sensitive-field exclusion, and Portal compatibility.

---

## Amendment — Session Card Overrides and Targeted Card Publication (2026-07-24)

### Problem and measured scope

A locally reconciled generated card is currently held in `DesignLibraryPage` state, so route
unmount destroys it. The affected immutable card bucket is invalidated, but remount resolves the
same old generated version until automatic publication completes. Separately, the design trigger
currently treats every public/operational field change as a full catalog rebuild. One background
edit therefore reads the ready-design, active-category, and approved-tag corpora.

### Session override boundary

Add a Studio service-owned, memory-only override registry keyed by authenticated session and design
ID. The generated-ready hook writes an explicitly mapped public card plus the immutable
`createdAtMs`; every card resolution overlays this registry after parsing generated assets. Route
unmount does not clear it. It clears on sign-out/session change, non-ready reconciliation, explicit
safe invalidation, or only after a newer generated result matches every saved public card field.
Generated bucket objects remain immutable and Firestore remains authoritative.

Trace only sanitized lifecycle events: created, applied, superseded, removed; opaque ID hash,
content version, and booleans only.

### Change classifier

The design trigger will compare explicit projections:

1. `card-only`: thumbnail/preview/background/dimensions/print dimensions changed while membership,
   search, and order fields did not.
2. `index-filter`: status/title/description/category/tags/createdAt changed.
3. `operational`: request/favorite/show/update metadata only.

Operational-only changes do not publish. Index/filter changes retain the existing full, leased,
debounced publication. Card-only changes use the targeted overlay below.

### Immutable targeted overlay

Extend the additive Portal manifest contract with an optional immutable card-override asset
reference. A card-only trigger maps the event's `after` document (no design query), reads the
current manifest/previous override from Storage, writes a new content-addressed immutable override
asset containing the merged public-card overrides, then swaps the manifest with Storage generation
preconditions. On a concurrent precondition conflict it rereads/merges/retries a small bounded
number of times. The base content version and all prior assets remain immutable.

Portal and Studio card resolvers overlay the optional asset by design ID. A later full publication
incorporates authoritative values into the base assets and emits a manifest without stale
overrides. Rollback is the existing previous-manifest/content mechanism; a failed targeted swap
leaves the old manifest valid. No Firestore taxonomy or ready-design query occurs on card-only
publication.

### Development accounting

For `fresh-prints-dev` only, emit one sanitized structured record per full or targeted pass:
classification/reason, pass number, ready/category/tag returned counts, coordination reads/writes,
duration, outcome, and full/targeted mode. No IDs or document fields. This instrumentation requires
deployment before exact live counts can be confirmed.

### Verification and deployment gate

Tests must cover session remount persistence, old-generated precedence prevention, match-based
supersession, non-ready removal, stable `createdAtMs`, classifier behavior, zero corpus queries for
card-only/operational changes, full path for index changes, optimistic concurrency, resolver
overlays, no client fallback, and sanitized accounting. Functions and Studio builds are required.

Do not deploy, republish, run `rebuildCatalogSnapshots`, or touch production. Stop at the owner
development deployment/retest checkpoint.
# Amendment — residual Portal mutation/server accounting (2026-07-24)

## Evidence

Cloud Logging for `2026-07-25T02:34:00Z`–`02:43:00Z` proves ten
`addPortalCatalogDesignToPrintRequest` calls, ten `onPrintRequestItemCreated` executions, ten
`onPortalCatalogSnapshotSourceWritten` executions, three `clearPortalWorkingPrintRequest` calls,
three unchanged push-sync calls, one metadata miss, and one allocatable-shows call. All ten design
publication events classified `operational` and skipped with zero catalog/coordination reads.

The ten add calls were launched in two tight groups of five against one parent request. Each
transaction rereads the parent plus the growing item query and contends on the same parent write;
transaction retry counts are not currently logged. The item-created trigger then performs a
redundant existence read of a design already authoritatively validated by the creating callable.
The three clear calls are the only logged delete-capable invocation and exactly bracket nine Console
deletes; clear currently rewrites the parent even when the request is already empty.

## Approved narrow implementation

1. Serialize catalog-add calls per request in the Portal service. Preserve optimistic UI and
   callable authorization; rejected work must not poison the queue.
2. Count transaction attempts and exact returned documents in development accounting for catalog
   adds. Keep payloads/IDs absent.
3. Remove `onPrintRequestItemCreated`'s redundant design existence read; use `update()` directly and
   emit sanitized success/failure accounting.
4. In `clearPortalWorkingPrintRequest`, load items before allocations and return a zero-write,
   zero-delete no-op when already empty. Emit exact read/write/delete/batch accounting.
5. Add exact accounting to `listPortalAllocatableShows`; do not change its query/index contract
   until returned-document evidence proves a safe replacement.
6. Keep push, metadata, generated catalog, rules, storage, and persisted data contracts unchanged.

## Gates

- No deploy in implementation.
- No index/rules/migration/republish/rebuild.
- Owner approval is required before deploying the four affected dev Functions and restarting the
  Portal dev surface.

## 2026-07-25 amendment (pass 6) — Private generated print-request read models (Studio + Portal)

### Context and relationship to pass 5

Pass 5 delivered a bounded, exact-count Firestore hydration path for Studio's Print Requests page
(`queueTab` maintained field + two triggers, `listPrintRequestsPage`/`countPrintRequests`/etc.,
locally-reconciling hook/page). That work is **not reverted or superseded** — it remains the
permanent secure fallback. This amendment adds a *preferred* read path: two private, generated,
immutable Cloud Storage JSON read models (one Studio staff-only, one Portal customer-scoped),
built with the same publication mechanics as ADR-FP-120's catalog snapshots (manifest-last atomic
publish, content-addressed immutable assets, `snapshotPublicationState`-style lease/epoch/debounce
coordination doc, generation-precondition manifest swap, targeted vs. full publication
classification) but as two **separate security/data contracts** — neither the Studio nor the Portal
generated asset is public-read; both require Storage Rules-enforced authorization, unlike every
existing `generated/**` asset in this repo.

Firestore/Cloud Functions remain sole authority for every mutation, validation, allocation,
capacity decision, and production-status transition. The generated read models are non-authoritative
display caches. Every mutation handler continues to write through the existing Admin-SDK-authoritative
paths (`printRequestService`, Portal's existing print-request callables); this amendment only adds a
publisher that projects post-mutation state into Storage, and consumer wiring that prefers the
generated asset for **display** while routing every write, and the read-fallback, back to the
already-approved pass-5 bounded Firestore path.

### Repository-confirmed facts governing this design (from direct inspection, not assumption)

1. **`customers/{id}` doc ID ≠ Firebase Auth UID.** Confirmed in
   `functions/src/createPortalPrintRequest.ts` (`findCustomerByUserId`) and
   `functions/src/lib/portalWorkingPrintRequest.ts`: the canonical mapping is a query,
   `customers.where("userId","==",authUid).limit(1)`, never a direct doc-ID lookup. `printRequests`,
   `printRequestItems`, and `showAllocations` all store `customerId` (the `customers` doc ID) — never
   the Auth UID directly. Therefore the Portal generated read model's Storage path **must not** be
   keyed directly by Auth UID under the assumption it equals `customerId`. It is keyed by the resolved
   `customerId` (`generated/portal-print-requests/customers/{customerId}/...`), and Portal's consumer
   resolves its own `customerId` once (already-necessary work — Portal already performs this same
   `userId`-scoped customer lookup for every other print-request read/write) before requesting the
   asset. Storage Rules independently re-derive and check this mapping server-side (see below) — the
   path segment is never trusted as an authorization decision by itself.
2. **No existing Electron-main-to-renderer-auth bridge exists.** Grepped `apps/studio/electron` for
   `firebase/auth|currentUser|idToken|getIdToken` — zero matches. The existing `catalogAsset` IPC
   transport is deliberately unauthenticated (plain Node `fetch`, no Admin SDK, no token), which only
   works because that asset family is public-read. It **cannot** be reused as-is for a private asset,
   and building a new raw-ID-token-over-IPC bridge is explicitly out of scope (task requirement: no raw
   ID tokens into Electron main without existing reviewed precedent — none exists).
3. **Authenticated Storage SDK reads already have direct, reviewed precedent in both apps.**
   `assistedCreationService.ts` (Portal) and `assistedCreationRequestsService.ts` (Studio) both already
   call `getBytes(ref(storage, path))` against `assisted-creation/{userId}/...` paths that are already
   Storage-Rules-gated by `isStaff() || (isCustomer() && userId == request.auth.uid)` — the exact
   per-uid-scoped-or-staff pattern this task needs. This is the **preferred transport for both apps**:
   Studio's renderer (which already runs an authenticated Firebase client SDK session identical to
   Portal's) fetches the private asset directly via `getBytes`, no Electron IPC hop required at all.
   This sidesteps finding #2 entirely rather than requiring new main-process auth work.
4. **`isStaff()` (storage.rules) and `assertStaffCaller()` (`functions/src/lib/caller.ts`) are the same
   check expressed in two languages** — `role in ["owner","admin","helper"] && isActive == true`. The
   new Storage Rules paths reuse `isStaff()` verbatim; any new callable (backfill/initial-publish) reuses
   `assertStaffCaller`/`loadCallerProfile` verbatim, consistent with every prior Wave C pass.

### Studio read model — staff-only

- Path family: `generated/studio-print-requests/manifest.json` (staff-read only, no public fallback
  unlike catalog manifests) plus paginated list-page assets and per-request detail assets, mirroring
  `PortalCatalogManifest`'s path-template convention (`pathTemplate` with `{page}`/`{tab}` substitution,
  reusing `resolvePortalCatalogPath`'s exact substitution helper rather than inventing a second one).
- Schema: one asset per `(queueTab, page)` containing the same allowlisted projection the pass-5
  `mapPrintRequestData`/`mapPrintRequestItemData`/`mapCustomerData` mappers already expose to Studio
  today (no new field surface) — `id, name, customerId, isInternal, requestOrigin, status, itemCount,
  queueTab, requestSequenceNumber, customerUsernameSnapshot, customerDisplayNameSnapshot,
  internalBaseName, nameFormatVersion, createdAt, updatedAt` per request, plus a small denormalized
  allocation-total summary and customer display fields already resolved page-side in pass 5 (no
  additional Firestore reads at publish time beyond what the triggering write already touches).
  `notes` (internal, sensitive) is excluded from the generated projection — Studio's detail view falls
  back to a direct Firestore read for `notes` and any other pass-5-fallback-only field, consistent
  with "generated is a display cache, not a complete mirror."
- Storage Rules: `match /generated/studio-print-requests/{allPaths=**} { allow read: if isStaff();
  allow write: if false; }` — reuses the existing `isStaff()` helper verbatim. All writes remain
  Admin-SDK-only (bypasses rules), identical to every other `generated/**` prefix.
- Publisher: a new targeted trigger pair mirroring `onPrintRequestQueueTabInputsWritten.ts`'s exact
  shape (extract-affected-key helper, before/after field-diff skip guard, one shared
  `recomputeAndPersist`-style function scoped to the one affected request's own page, no corpus scan)
  attached to `printRequests` writes (new — no trigger currently listens on `printRequests` itself)
  plus the existing `printRequestItems`/`showAllocations` writes. **Error-isolation correction after
  independent review**: this new read-model publish step is called from within the *same* trigger
  invocation as the existing `queueTab` recompute (to avoid a second parallel listener doubling reads
  per event), but it is a functionally separate concern with a different severity — a cache-staleness
  failure is low-severity, while a `queueTab` write failure affects the already-approved pass-5
  authoritative tab-count path. The read-model publish call is therefore wrapped in its own
  `try/catch` that logs and swallows failures (never rethrows, never blocks, never retries the
  triggering event), placed *after* the `queueTab` write completes successfully, so a Storage/manifest
  failure in the new code can never cause the existing `queueTab` write to fail, retry, or appear
  failed in monitoring. This isolation is a required test case, not just a code-review note.
  Publication is **targeted-per-request-page only** — never a full-corpus rebuild; the
  coordination doc (`snapshotPublicationState/studio-print-requests`) exists only to fence a rare
  full-manifest bootstrap/rebuild path (initial publish, or manifest-schema migration), not steady-state
  per-request updates, which write only the affected page asset + a generation-preconditioned manifest
  patch (mirrors `publishPortalCardOverride`'s bounded-retry precondition pattern, not the full
  `markAndPublishAfterDebounce` leased rebuild). Per the same retry-budget correction noted for the
  Portal manifest below, a same-request rapid-burst test is required here too (one request's page
  manifest has the same single-manifest contention profile as a single customer's).
- Consumer: Studio's `usePrintRequests` hook prefers the generated page asset (via a new
  `studioPrintRequestAssetService.ts`, authenticated `getBytes`, same LRU/TTL/in-flight-dedupe pattern
  as `studioCatalogAssetService.ts`) and falls back transparently to the existing pass-5 bounded
  Firestore path (`listPrintRequestsPage`/`countPrintRequests`) on any load/parse failure — never a
  corpus scan, matching pass 5's own already-approved fallback shape. Mutations continue to reconcile
  locally (unchanged from pass 5); the generated asset catches up asynchronously via the publisher.

### Portal read model — customer-scoped

- Path: `generated/portal-print-requests/customers/{customerId}/manifest.json` +
  paginated/detail assets, same path-template convention.
- Schema: allowlisted customer-safe projection only — no internal/staff-only fields
  (`internalBaseName`, staff notes, `requestOrigin` staff-only variants) ever enter this asset,
  matching the existing public-catalog-projection discipline (explicit allowlist, not a field-exclusion
  blocklist).
- Storage Rules: `match /generated/portal-print-requests/customers/{customerId}/{allPaths=**} {
  allow read: if isStaff() || (isCustomer() && customerBelongsToCaller(customerId)); allow write: if
  false; }`. **Correction after independent review**: unlike `canAccessOwnCustomerUploadPath`, no
  existing rules helper today performs a `firestore.get()` keyed by a non-uid doc ID
  (`customers/{customerId}`) — this is genuinely new rules logic, not a drop-in adaptation of an
  existing pattern, and must be treated and tested as such. `customerBelongsToCaller(customerId)`
  reads `customers/{customerId}` via `firestore.get()` and checks
  `resource.data.userId == request.auth.uid` **and** that the doc exists (Firestore Rules'
  `firestore.get()` on a missing doc throws, so existence is implicit but must be asserted in a test,
  not assumed) — it must not treat a missing/malformed `customers` doc as an allow. This exact helper
  requires its own dedicated rules-emulator test group (own-customer-scope allow; a second customer's
  ID against the first customer's auth token denied; a `customerId` with no matching `customers` doc
  denied; a `customers` doc missing `userId` denied) before it is trusted, independent of the
  existing `canAccessOwnCustomerUploadPath` test coverage.
- Publisher: same targeted-per-customer-page mechanism as Studio's, keyed by the mutation's resolved
  `customerId` (already present on every `printRequests`/`printRequestItems`/`showAllocations`
  document — no extra lookup needed at publish time). **Retry-budget correction**: `publishPortalCardOverride`'s
  3-retry generation-precondition budget is sized for contention across the *entire* catalog (many
  designs, rare concurrent edits to the same one). A per-customer manifest has a materially different
  contention profile — a single customer's own rapid same-request edits (e.g. a staff member quickly
  adjusting several item quantities, or a Portal customer rapid-clicking quantity changes) all target
  the *same* one manifest. The 3-retry budget is not assumed sufficient by analogy; it must be
  verified under a same-customer burst test (5+ rapid same-customer-page writes) as part of the
  publication test group, and raised or replaced with a small bounded backoff if that test shows
  exhaustion under realistic burst sizes.
- Consumer: Portal's `useMyPrintRequests` hook (`apps/portal/features/print-requests/hooks/useMyPrintRequests.ts`,
  which already resolves `customer.id` via `useAuth()` before every existing Firestore query) and
  `portalPrintRequestService.ts` prefer the generated asset (authenticated `getBytes`, mirroring the
  existing `assistedCreationService.getPreviewObjectUrl` signed-URL-first/`getBytes`-fallback
  precedent) and fall back transparently, on failure, to `useMyPrintRequests`'s own existing
  `reload()`/Firestore query path (already scoped by `where("customerId","==",customer.id)` — the
  same resolved `customer.id`, never a scan) — this is the specific existing fallback function, not a
  general unverified claim.

### Backfill / initial publication

A new, separate, owner-only, `fresh-prints-dev`-only, confirmation-phrase-gated callable
initializes both manifests and back-publishes existing print requests' pages, following the exact
pattern of the just-built `backfillPrintRequestQueueTab` (cursor-paginated, bounded batch size,
dry-run supported, idempotent, resumable via `nextStartAfter`, zero auto-run callers). It is
additive — the existing `queueTab` backfill is untouched and still required independently.
**Sequencing correction after independent review**: "must run after the `queueTab` backfill" was
previously prose-only. The new backfill callable enforces this: for each request it reads before
publishing, if `queueTab` is absent it skips that request (recording it under a new `skippedNoQueueTab`
counter in the response, not silently dropped) rather than computing/publishing a page projection
against a pre-migration request. The response schema explicitly reports `skippedNoQueueTab` alongside
`scanned`/`updated` so the owner can see, before running this backfill, whether the `queueTab`
backfill still needs a further pass. This is a required test case (a request without `queueTab`
present in a dry-run batch increments `skippedNoQueueTab` and is not published), not just a documented
expectation.

### Fallback policy (explicit, both apps)

On any generated-asset load/parse/authorization failure, both apps fall back to their **existing,
already-approved bounded Firestore path** — pass 5's `listPrintRequestsPage`/`countPrintRequests` for
Studio, Portal's existing customer-scoped queries for Portal. Neither fallback path is ever a
corpus scan. This fallback is not new work; it is the pass-5/pre-existing implementation, left
unmodified and wired as the failure branch.

### Required tests (60, per category)

Security/contract (manifest/page/detail schema round-trip, allowlist exclusion of internal/notes
fields, path-template resolution); Storage Rules emulator (staff read-allow, customer own-scope
read-allow, customer cross-scope read-deny, unauthenticated deny, write-deny for every role including
staff, default-deny unaffected); publication (targeted single-request/single-customer-page publish,
no corpus query, manifest generation-precondition retry/conflict, coalescing of same-request
back-to-back writes, idempotent duplicate-CloudEvent skip, no-op on unchanged derived projection);
Studio consumer (cache hit/miss/in-flight-dedupe, fallback-on-failure, mutation-reconciliation
unaffected, no Electron IPC used); Portal consumer (customerId resolution reuse, cache/fallback
parity, cross-customer asset never requested); product regression (existing pass-5 fallback behavior
unchanged, existing `queueTab` triggers/backfill unaffected, existing catalog snapshot architecture
unaffected).

### Verification commands

`npm run build --prefix functions`; `npm run typecheck --workspace @fresh-prints/portal`;
`npm run build:portal`; `npm exec --workspace @fresh-prints/studio -- vite build`;
`npm run test:rules`; `npx tsx --test <affected files>`; `npx eslint <changed files>
--max-warnings 0`; `git diff --check`.

### Gates

- Firestore/Functions remain sole mutation authority; generated assets are display-only. In
  particular, the per-page denormalized allocation-total summary carried in the generated projection
  (Studio read model) must never be read by any capacity, quota, allocation, or production-status
  decision anywhere in the codebase — those decisions already read Firestore directly today (pass 5's
  `listAllocationTotalsForRequests` and the show-queue capacity checks) and must continue to. This is
  a required regression test: grep/confirm no new code path feeds the generated asset's allocation
  summary into any write-authorizing decision.
- No Storage Rules deploy, Functions deploy, or backfill/initial-publish run without a separate,
  explicit owner checkpoint.
- Independent, non-authoring review required before any deployment checkpoint, covering: cross-customer
  leak risk, credential-exposure risk in the chosen transport, publication fan-out/coalescing
  boundedness, manifest-last atomicity, fallback-never-scans guarantee, backfill resumability/dry-run
  safety, and confirmation that pass 5's `queueTab` architecture and this repo's existing catalog
  snapshot architecture are unmodified by this work.
- **Independent review already completed once against the original draft of this amendment
  (2026-07-25, separate non-authoring Explore-agent pass)** — verdict `APPROVED_WITH_CHANGES`, all 6
  findings addressed inline above (novel-rules-helper test requirement, per-manifest retry-budget
  verification, publish/queueTab error isolation, backfill sequencing enforcement, citing the exact
  Portal fallback function, and the capacity-authority-guard gate above). A second, final independent
  review is still required after implementation, per this repo's established Wave C convention of
  reviewing the actual diff, not only the plan.
- Pre-existing dirty-worktree changes (all prior Wave C passes, confirmed via `git status` before this
  amendment began) are preserved unchanged; this amendment's diff is additive only.
- Stop at the dev deployment checkpoint. Do not deploy Storage Rules, Functions, or run any
  backfill/initial-publish without explicit owner approval.
