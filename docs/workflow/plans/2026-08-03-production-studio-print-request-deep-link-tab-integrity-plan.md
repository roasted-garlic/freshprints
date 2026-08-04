# Plan: Studio Print Request Deep-Link Tab Integrity

Date: 2026-08-03
Branch: `docs/production-studio-print-request-deep-link-tab-integrity` (created from `origin/production`)
Scope: **Plan phase only.** No application source code was read-write modified to produce this
document beyond the investigation reads listed below. Implementation is explicitly out of scope
until this Plan and its independent Formal Review are both approved and the owner issues the
approval phrase in §9.

## 1. Reported symptom (owner smoke test, stable 1.0.0 build)

Navigating from Studio Show Queue's "Attached Print Requests" list into a print request whose
authoritative `printRequests.queueTab` is `"queued"` opens the Print Requests page defaulting to
the **Working** tab, showing the queued request inside what should be an empty Working list.

Two potentially-independent defects were called out and are traced separately below, per explicit
instruction not to assume a shared root cause.

## 2. Architecture ground truth (corrects an assumption in the originating task brief)

The task brief that opened this investigation stated `queueTab` is "the authoritative tab
classification" and asked me to treat any client-side re-derivation as suspect on that basis. Direct
source inspection shows the actual, current, documented architecture is the **opposite assignment
of authority**:

- `packages/shared/src/types/printRequest/printRequest.types.ts:25-34` (the `queueTab` field's own
  doc comment): *"Server-maintained mirror of `derivePrintRequestListTab`'s output... Never
  authoritative for production/queue status shown elsewhere — `derivePrintRequestListTab` over live
  data remains the source of truth; this field is a read-optimization mirror, recomputed, never
  hand-edited."*
- `functions/src/onPrintRequestQueueTabInputsWritten.ts` — the exact Cloud Functions trigger pair
  (`onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten`) recomputes
  `queueTab` via `computePrintRequestQueueTab` (a Functions-side port of the same
  `derivePrintRequestListTab` logic in `packages/shared/src/utils/printRequestListGrouping.ts`)
  whenever a request's own `printRequestItems` quantity or `showAllocations`
  quantity/status changes, and persists it as a plain Firestore field update.
- This mirror exists **only** so the Studio Print Requests list can filter (`where(queueTab==X)`)
  and get exact tab counts (`getCountFromServer`) without a full-collection items/allocations scan
  — a Wave C hydration remediation (2026-07-25) performance optimization, not a queue-status
  system of record.
- ADR-FP-121 (`docs/project/DECISIONS.md:373-427`) confirms `queueTab` and its two maintenance
  triggers are "fully preserved" by that decision and refers to them as inputs to the abandoned
  read-model, not as a redefinition of `queueTab`'s own authority.

**Conclusion:** `queueTab` and the live `derivePrintRequestListTab(...)` computation are intended to
always agree — `queueTab` is the same computation, cached server-side. They are not two competing
sources of truth in the sense the original brief assumed. They can still **transiently disagree**
across a Cloud Functions trigger's asynchronous propagation delay (typically sub-second, but not
zero) between a show-allocation write and the mirrored field landing on the `printRequests`
document. That transient disagreement window, not an authority conflict, is the actual shared
substrate underneath both symptoms — though, as required, the two symptoms are still independently
diagnosed below because they manifest through entirely different code paths and one can occur
without the other.

## 3. Defect A — deep link opens on the wrong tab (tab-selection defaulting to Working)

**File:** `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx:204-209`

```ts
const tabParam = searchParams.get(PRINT_REQUEST_TAB_QUERY_PARAM);
...
const activeListTab: PrintRequestListTab = isPrintRequestRouteTab(tabParam)
  ? tabParam
  : "working";
```

The page's active tab is resolved **exclusively from the `tab` URL query parameter**, defaulting to
`"working"` whenever the parameter is absent or fails `isPrintRequestRouteTab`. Nothing in this file
or in `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.ts` ever
reads the target request's own `queueTab` (or recomputes it live) to choose the tab. The tab is
supplied entirely by whichever caller constructed the link.

**Link construction (the actual immediate cause):**
`apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx:1332-1343`:

```ts
const matchedRequest = requests.find((request) => request.id === group.printRequestId);
const requestTab = derivePrintRequestListTab({
  totalRequestedQuantity: requestSummary.totalQuantity,
  totalAllocatedQuantity: requestAllocationTotals.totalAllocatedQuantity,
  totalInProgressQuantity: requestAllocationTotals.totalInProgressQuantity,
  totalPrintedQuantity: requestAllocationTotals.totalPrintedQuantity,
  status: matchedRequest?.status ?? "active",
});
const printRequestHref = getPrintRequestsPath({
  tab: requestTab,
  requestId: group.printRequestId,
});
```

This constructs the `tab` query param at link-render time using a **client-side live recomputation**
of the same classification `queueTab` mirrors — not `queueTab` itself, and not a value read from the
target `PrintRequest` document at all (`matchedRequest?.status` is the only field pulled from the
request; the quantities come from separately-loaded summary/allocation-totals maps keyed by request
ID). If any of `requestSummary`, `requestAllocationTotals`, or `matchedRequest` is stale, missing, or
still in a default/zero state at render time (e.g., the allocation just added hasn't yet hydrated
into `allocationTotalsByRequestId` for this Show Queue page instance), `derivePrintRequestListTab`
here can return `"working"` even though the request's persisted `queueTab` already correctly says
`"queued"`. The link is then generated with `tab=working`, and `PrintRequestsPage` faithfully opens
exactly that tab — the page itself is not misreading anything; it is given the wrong instruction by
its caller.

**Root cause (Defect A): CONFIRMED**, contingent on the freshness of Show Queue's own local
`requestAllocationTotals`/`requestSummary` maps at the moment `+ Add Print Request` (or any action
that re-adds/re-queues a request) completes and the row is rendered/clicked. This is a **narrower
claim** than "always defaults to Working" — the defect is a **staleness race in the link-time
recomputation**, not a permanent default. Verifying the exact trigger (first render after
attach vs. every render, and whether `reloadAllAllocationData`-equivalent refresh on this page
closes the window) is listed as a required pre-implementation check in §7, since the current
evidence establishes the mechanism but not yet the precise timing boundary the owner observed.

## 4. Defect B — wrong-tab list contamination

**File:** `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts`

```ts
export function useShowQueuePrintRequests(attachedRequestIds: string[]) {
  const working = usePrintRequests("working");
  const queued = usePrintRequests("queued");
  const printing = usePrintRequests("printing");
  const { ensureRequestsLoaded } = working;
  ...
  useEffect(() => {
    if (!attachedIdsKey) return;
    void ensureRequestsLoaded(attachedIdsKey.split("|"));
  }, [attachedIdsKey, ensureRequestsLoaded]);

  const merged = useMemo(() => mergeShowQueuePrintRequestSources(sources), [sources]);
  ...
}
```

and `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts:49-69`
(`mergeShowQueuePrintRequestSources`), which unions all three sources' `requests` arrays by ID with
**no `queueTab` filtering at all** — any request present in any source's local state appears in the
merged `requests` used for `matchedRequest` lookups and the "+ Add Print Request" picker
(`buildShowQueuePrintRequestOptions`).

Every attached request ID is force-loaded via `ensureRequestsLoaded`, which is destructured **only
from the `working` source's own `usePrintRequests("working")` instance**
(`apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts:236-262`,
`ensureRequestsLoaded` → `getPrintRequestsByIds` → unconditionally merged into that hook's own
`state.requests` via `mergePrintRequestsById`, with **no `queueTab` check**). Consequently, a request
whose real `queueTab` is `"queued"` or `"printing"` still gets written into the **`working` source's
local `requests` array** on the Show Queue page whenever it isn't already present there from a paged
`working`-tab query. This is a genuine, independently-confirmed defect: it corrupts what "belongs" to
the `working` hook instance on this one page, even though it never touches `PrintRequestsPage`'s own
separate `usePrintRequests` instance (confirmed below) and is cosmetic/functional only within
`UpcomingShowsPage.tsx`'s own local `matchedRequest` lookup and Add-Request picker — it is not the
direct cause of the `tab=working` deep link (that is Defect A), but it is a related, independent
architectural violation of "bounded Firestore + `queueTab`-filtered tab membership" in the exact
files this task's constraints were written to protect.

**Confirmed NOT to leak into `PrintRequestsPage.tsx`:** that page calls its own, separate
`usePrintRequests(activeListTab)` instance — a fresh React hook call with its own `useState`, not a
shared store — so `UpcomingShowsPage`'s contaminated `working` source cannot corrupt what
`PrintRequestsPage` itself renders when a user later opens `/print-requests` directly.
`printRequestsPageReadCache.ts` (the only cross-mount cache involved) is keyed by
`{tab}:page-1`/`counts` request results, not by individual merged `requests` arrays, and is written
by `loadPrintRequestsPageCached`, never by `ensureRequestsLoaded`'s merge path — so this cache is not
an additional contamination vector either.

**Root cause (Defect B): CONFIRMED**, scoped entirely to `UpcomingShowsPage.tsx`'s own
`matchedRequest`/`requestOptions` derivations via `useShowQueuePrintRequests`/
`mergeShowQueuePrintRequestSources`. Independent of Defect A's mechanism (Defect A does not require
Defect B to reproduce — a fresh, correctly-summary-hydrated `working` source with a merely-stale
`allocationTotalsByRequestId` entry is sufficient on its own), though both stem from the same general
pattern: **something other than the request's own persisted `queueTab` is used to answer "which tab
does this request belong to."**

## 5. What is explicitly NOT the cause (ruled out)

- **Not** a `queueTab` backfill/migration gap — `printRequestQueueTabBackfillAdminService.ts` exists
  as a dev-only admin remediation tool; the reported request is a live, actively-allocated request on
  a fresh 2026 show, not a legacy pre-migration document missing the field.
- **Not** a Firestore Rules or permission issue — both pages already successfully read the request
  data; the defect is purely in client-side tab classification/link construction, not data access.
- **Not** the Wave C read-cache (`printRequestsPageReadCache.ts`) — confirmed scoped to
  page/count/customer/allocation query results keyed correctly per tab, not implicated in either
  symptom's mechanism.
- **Not** a violation of the "no full-collection scans" or "no Storage-backed read model" constraints
  — no code path found in this investigation reads beyond bounded, per-tab, or per-ID Firestore
  queries.

## 6. Required Plan Decisions

1. **Single source of truth for tab membership on both pages must become the request's own
   `queueTab` field (or a live-recomputed equivalent read from the same request document actually
   being linked), not a value derived from separately-loaded, independently-stale summary/allocation
   maps.** Recommendation: `UpcomingShowsPage.tsx`'s link construction should prefer
   `matchedRequest?.queueTab` when present and only fall back to the live
   `derivePrintRequestListTab(...)` recomputation when `queueTab` is absent (pre-backfill legacy
   documents) — this removes the staleness race in Defect A without contradicting the documented
   "mirror, not authority" architecture, since falling back to the live computation for the rare
   missing-field case is exactly what the mirror's own doc comment already prescribes.
2. **Defect B fix must not weaken `usePrintRequests`'s existing tab-scoping contract.** Recommended
   approach: `mergeShowQueuePrintRequestSources` (or `useShowQueuePrintRequests`) must filter each
   source's `ensureRequestsLoaded`-fetched requests by the request's own `queueTab` before admitting
   them into that source's merged bucket — an ID-fetched request whose `queueTab` is `"queued"`
   belongs conceptually to the `queued` source's data, not `working`'s, regardless of which hook
   instance happened to issue the direct-ID fetch.
3. **No new Firestore composite index, collection, or query pattern** is required for either fix —
   both corrections operate on data already being fetched (the `PrintRequest.queueTab` field is
   already part of every `PrintRequest` read).
4. **No change to the Cloud Functions trigger, `computePrintRequestQueueTab`, or
   `derivePrintRequestListTab` themselves** — both are confirmed correct and consistent with each
   other; the defects are entirely in client consumption, not in the classification logic or its
   server-side maintenance.
5. **`printRequestRoutes.ts`'s existing "no invented filenames" contract-testing pattern
   (`printRequestRoutes.test.ts`) is the right home for Defect A's routing-facing regression
   coverage**; `showQueuePrintRequestSources.test.ts` is the right home for Defect B's
   merge-filtering regression coverage. Both files already exist and already test the exact
   functions this Plan proposes to change.
6. **No change to `PrintRequestsPage.tsx`'s own tab-bar/canonical-route logic is required** — once
   Defect A's link is corrected to carry the right `tab` value, `PrintRequestsPage`'s existing
   `resolveCanonicalPrintRequestsRoute` behavior (open the requested tab if the request is eligible
   there) already does the right thing; no evidence found that this page mis-trusts a correctly
   supplied `tab` param.
7. **Timing verification is a prerequisite, not a documentation nicety** — before implementation
   begins, reproduce Defect A's exact staleness window (does it require a fresh page mount right
   after adding to a show, or is it persistent) so the fix is verified against the owner's actual
   observed scenario, not just the theoretical mechanism.
8. **Scope boundary:** this Plan does not extend to any other Studio page that also links into
   `/print-requests` (if any exist) unless discovered during implementation to share the same
   `derivePrintRequestListTab`-at-link-time pattern — a search for all `getPrintRequestsPath(` call
   sites is a required first implementation step, not assumed complete by this Plan.
9. **No Portal-side change** — the reported defect and both root causes are entirely Studio-only;
   `apps/portal/features/print-requests/` uses its own, separate tab/status model
   (`portalPrintRequestTabCopy.ts` et al.) not implicated by either mechanism above.
10. **No new dependency, no Storage-backed read model, no full-collection scan** is introduced by
    either recommended fix in item 1 or item 2 — both are narrow, same-shape corrections to existing
    bounded reads already in memory.

## 7. In scope for implementation (once approved)

- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` — link
  construction at line ~1332-1343 (Defect A fix: prefer `matchedRequest?.queueTab`).
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts` —
  `mergeShowQueuePrintRequestSources` (Defect B fix: filter by `queueTab` before bucket admission).
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts` — only if
  the Defect B fix requires passing each source's own expected `queueTab` value into the merge step
  (implementation detail to confirm, not yet decided).
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.test.ts` —
  new regression coverage for Defect B.
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.test.ts` and/or
  a new test file colocated with `UpcomingShowsPage.tsx`'s link-construction helper (extraction into
  a small testable function is likely necessary, since the logic is currently inline JSX-adjacent
  code — to be confirmed during implementation planning, not invented here).
- Any additional `getPrintRequestsPath(` call site discovered per Required Decision 8.

## 8. Explicitly out of scope

- Any change to `functions/src/onPrintRequestQueueTabInputsWritten.ts`,
  `packages/shared/src/utils/printRequestQueueTabRecompute.ts`, or
  `packages/shared/src/utils/printRequestListGrouping.ts`.
- Any change to `PrintRequestsPage.tsx`'s tab-bar, canonical-route resolution, or query construction.
- Any Portal-side file.
- Any Firestore Rules, index, or Cloud Function deployment.
- The stable `v1.0.0` release draft's publish status — remains unpublished pending this
  investigation and any resulting fix, per explicit owner instruction.
- Reviving the abandoned Storage-backed read model (ADR-FP-121) — not applicable to this defect and
  not proposed here.

## 9. Human Checkpoints

- **New checkpoint discovered by this investigation:** the stable `1.0.0` release draft should
  remain unpublished not only pending this Plan/Review but pending the actual fix + test pass, since
  the reported defect is a real, owner-observed, production-facing Studio bug in a build already
  packaged for that draft release.
- No production deploy, Firestore Rules/index/Functions change, or other irreversible action is
  proposed by this Plan — none of the standard "Human Approval Required" triggers in `CLAUDE.md`
  apply to the Plan phase itself.
- Implementation must not begin until the Formal Review (created alongside this Plan) is approved
  **and** the owner supplies the exact phrase:
  **`APPROVE STUDIO PRINT REQUEST DEEP-LINK TAB INTEGRITY IMPLEMENTATION`**

## 10. Test Planning (for the eventual Implement phase — not run in this Plan phase)

- Unit: `showQueuePrintRequestSources.test.ts` — a request fetched via `ensureRequestsLoaded` with
  `queueTab: "queued"` must appear only in the `queued` source's contribution to
  `mergeShowQueuePrintRequestSources`, never `working`'s.
  - Reproduce the pre-fix contamination as a failing test first (confirms the defect is real and
    the fix's assertion is meaningful), then verify it passes after the fix.
- Unit: a new or existing test around the extracted Defect A link-construction function — given a
  request whose `queueTab` is `"queued"` but whose passed-in summary/allocation-totals are still
  zero/default, the constructed href must carry `tab=queued`, not `tab=working`.
- Full existing suite (`printRequestRoutes.test.ts`, `printRequestQueryPlanning.test.ts`,
  `printRequestListGrouping`-adjacent tests if any, and the full Studio/shared unit test run) must
  continue to pass unchanged — neither fix touches the classification functions those tests cover.
- Manual/owner re-smoke-test of the exact reported scenario: attach a request to a show queue,
  confirm the "Attached Print Requests" link opens directly to the Queued tab with the request
  visible and selected, and confirm the request does not appear in the Working tab's list.
- `git diff --check`, lint, and typecheck must remain exit 0, consistent with every prior phase in
  this session.

## Investigation reads performed for this Plan (complete list)

- `docs/project/DECISIONS.md` (ADR-FP-121, lines 373-427)
- `.cursor/workflow/state.md` (attempted; file exceeds tool read size limit — not read in full this
  pass; no content from it is relied upon in this Plan. Flagged in the Review as a documentation gap
  to note, not a blocker, since its role per `CLAUDE.md` is workflow-state tracking, not architecture
  decisions, and this task's architecture questions were fully answered from source + DECISIONS.md.)
- `docs/project/ROADMAP.md` (lines 1-904; no print-request tab-routing-specific decision found
  beyond what DECISIONS.md and source already established)
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (full file)
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.ts` (full file)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` (full file)
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` (targeted
  sections: imports, attached-print-requests list rendering/link construction, add-request modal)
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts` (full
  file)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts` (full
  file)
- `packages/shared/src/utils/printRequestListGrouping.ts` (full file)
- `packages/shared/src/types/printRequest/printRequest.types.ts` (targeted: `queueTab` field and
  surrounding doc comment)
- `functions/src/onPrintRequestQueueTabInputsWritten.ts` (full file)
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestsPageReadCache.ts`
  (full file)
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` (partial,
  imports/query-plan usage)
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueueBadge.ts` (full file)
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.test.ts`
  (partial)

## Confirmation

No application source code was modified during this Plan phase. Only this Plan document and its
companion Formal Review (`docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-review.md`)
were created.
