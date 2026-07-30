# Portal Print Request Pre-Launch Stability — Plan

- **Date:** 2026-07-27
- **Goal ID:** `portal-print-request-prelaunch-stability`
- **Phase:** Plan (this document). **No implementation has occurred.** Implementation is explicitly
  forbidden this session per the task brief.
- **Author:** Planning Agent
- **Status:** Awaiting Formal Review, then owner approval, before any Implement phase begins.

---

## 1. Executive Summary / Goal Restatement

The owner has reported eight defects in the Fresh Prints Portal print-request workflow that must be
fixed before production release, plus removal of a literal Firebase Debug availability toast string
from both Portal and Studio. This is a **required pre-production stabilization goal**, immediately
before the separate `production-release` roadmap goal (`.cursor/workflow/state.md`, current goal:
idle; last closed goal `portal-google-analytics`, PASS 2026-07-27; `firestore-usage-efficiency-wave-c`
closed 2026-07-27, PASS WITH NOTES).

This Plan does not change the core product workflow:

- One working print request per Portal customer (ADR-FP-071).
- Requests may contain catalog designs and customer uploads.
- Designs themselves never become queued/printing/printed — that state lives on `showAllocations` /
  `printRequestItems` (DATA_MODEL.md).
- Request/show allocation state controls Queued, Printing, and Printed.
- Print-request item saves still require ≥ 200 effective DPI, confirmed against current source: the
  owner brief's "200 effective DPI" floor is correct. `packages/shared/src/constants/printSize.constants.ts`
  defines `EFFECTIVE_DPI_BAD_MIN = 200` and `MIN_PRINT_REQUEST_EFFECTIVE_DPI = EFFECTIVE_DPI_BAD_MIN`;
  `packages/shared/src/utils/printRequestItemSizing.ts`'s `resolvePrintRequestItemDpiQualityLevel`
  (L193-196) rejects below that value (`"below_minimum"`), and its save-path error message (L324)
  reads literally "Requested size is below the 200 DPI minimum for standard Print Requests." An
  earlier draft of this Plan incorrectly asserted the real floor was 72 DPI — that was a conflation
  with the *separate* `MIN_ACCEPTABLE_EFFECTIVE_DPI = 72` constant, which governs a different code
  path entirely (catalog import/customer-upload acceptance validation in
  `packages/shared/src/utils/printSizeMath.ts` / `importPrintSizeMessages.ts`), not print-request item
  saves. This has been corrected; no defect item in this Plan requires touching DPI validation logic
  at all, and item 5's regression tests must assert the existing 200 DPI print-request-save floor,
  not 72 DPI.
- Bounded Firestore remains the permanent print-request data path (Wave C).
- No unbounded hydration, full-corpus reads, or the abandoned generated print-request read model
  (fully removed per Wave C signoff, `docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md`)
  is reintroduced by any fix in this Plan.

All 8 defects and the debug-toast removal were reproduced against source (not documentation) by
direct code reading. Root causes for items 2, 5, and 7 share a common pattern, investigated together
per the owner's "Consolidated root-cause requirement" (Section 4). Item 1's cold-start defect has an
independent, separately-diagnosed root cause (Section 5). No file was assumed from historical docs;
every path below was opened and read in this repo during this session.

---

## 2. Source-Backed Reproduction Matrix

| # | Defect | Primary file(s) (verified to exist) | Confirmed mechanism |
|---|--------|--------------------------------------|----------------------|
| 1 | Cold/rapid nav shows cards without images | `apps/portal/features/catalog/services/catalogService.ts` (`getReadyDesignsByIds`, L281-336), `apps/portal/features/catalog/services/portalCatalogAssetService.ts` (`getDesignsByIds`, L297-302), `apps/portal/features/catalog/services/catalogSnapshotFlags.ts`, `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` (item card render, L462-522), `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` (`showCatalogReuse`/design lookup) | Generated portal-catalog manifest/card snapshot (30-second cache window per `ARCHITECTURE.md` "Generated catalog read models") can lag a very recently-added/approved design after test-data wipe + restart. `getDesignsByIds` returns a **successful but incomplete** card list (missing the just-added design) — the `catch` fallback at `catalogService.ts` L291 only fires on a **thrown** error, never on a successful-but-partial snapshot read. The missing design then renders as `design: null` in the item card, which the UI (correctly, per its own contract) shows as "No longer in catalog" / falls into the thumbnail panel's `isUnavailable` terminal state — **not** the loading skeleton, because the component has no way to distinguish "still resolving" from "confirmed absent." |
| 2 | Removed items reappear after another action | `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` (`removeItem` L500-531, `reload` L67-106), `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts` (`reloadWorkingItems` L134-243, `mergeServerWorkingItemsWithLocal` merge at L177), `apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.ts`, `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` (`beginPendingItemRemovals`/`endPendingItemRemovals` plumbing, L71-73) | `usePrintRequestDetail`'s own `removeItem` (detail-page-local state) has **no** stale-completion guard and **no** `beginPendingItemRemovals`/`endPendingItemRemovals` call at all — those exist only in `useWorkingCurrentRequestItems` (the Current-Request/cart representation). A remove on the **detail page** updates only `usePrintRequestDetail`'s local `items` state; if a slower in-flight `reload()` (generation-guarded, but **only within `usePrintRequestDetail`'s own `loadGenerationRef`**) or the **separate** `useEffect` at L116-133 (design-summary refetch keyed on `catalogDesignIdsKey`) was already in flight from a stale pre-delete `items` snapshot, a subsequent unrelated action (canceling Add to Show closes the modal and returns to the same mounted page; editing another item's quantity calls `reloadWorkingItems({ silent: true })` from the parent `PrintRequestDetailView.handleUpdateItem`) triggers the working-items-sync `useEffect` in `usePrintRequestDetail` (L174-226), whose `cartSignature` comparison can re-apply a `workingItems` snapshot from `useWorkingCurrentRequestItems` that **still contains the removed row** if that hook's own `reloadWorkingItems` in-flight epoch (`reloadEpochRef`) resolved from a pre-delete server response and `pendingRemovedItemIdsRef` was never marked (because the detail page's `removeItem` never calls `beginPendingItemRemovals`). |
| 5(a) | Catalog add → qty change → detail still shows qty 1 | `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` (`queuePrimaryQuantity` L405-457, `flushDesiredQuantity` L291-383, temp-id replacement at L330-341), `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` (`cartSignature`/sync effect L166-226) | The catalog add flow's optimistic item carries id `optimistic:{designId}` in `useWorkingCurrentRequestItems`'s shared `workingItems`, not in `usePrintRequestDetail`'s own `items`. When `usePrintRequestDetail`'s sync effect (L174-226) copies `workingItems` into its local `items` via `cartSignature`, it does so **only when `isViewingWorkingRequest`** — if the customer navigates to the request detail **before** `flushDesiredQuantity`'s real-item-id patch (L330-341) has landed in `workingItems`, and before the `cartSignature` changes again to re-trigger the sync effect, the detail page can render the last-synced (pre-qty-change) `cartSignature` snapshot. |
| 5(b) | Detail-page autosave reverts / requires hard refresh | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` (`saveDraft` L295-354, debounce L287-293), `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` (`updateItem` L250-333) | `updateItem` optimistically patches **both** local `items` and (if `isViewingWorkingRequest`) `patchWorkingItems` (L296-300), but on the **error path** it calls `reload({ silent: true })` and `reloadWorkingItems({ silent: true })` — both of which race any newer optimistic edit. If a second `saveDraft` fires (debounced 300ms) while the first `updatePrintRequestItem` callable is still in flight, `saveInFlightRef`/`saveQueuedRef` in `PortalPrintRequestItemCard.tsx` correctly queues it, but `usePrintRequestDetail.updateItem` has **no per-item sequence/generation guard** — two concurrent `updateItem` calls for the *same item* (not gated by the card's own single-flight queue, which is a UI-level lock, not a hook-level one) can resolve out of order, and the **older** result's `reload({silent:true})` (called only on error, not success — but see item 2's stale-load pattern) or a concurrent `reloadWorkingItems` from an unrelated mutation can overwrite the newer local patch before its own callable resolves. |
| 7 | Progress tracker missing immediately after Add to Show | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` (`listTab` memo L248-263, `progressStage` L267), `apps/portal/features/print-requests/hooks/useMyPrintRequests.ts` (`summariesByRequestId`/`allocationTotalsByRequestId`, `'full'` scope reload only on `/requests` or `/dashboard` pathname change, L91-119), `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` (`reconcileQueuedRequest`, only patches `status`, not summaries/allocations) | `progressStage` is derived from `listTab`, which is derived from `derivePrintRequestListTab()` (`packages/shared/src/utils/printRequestListGrouping.ts` L23-41) using `summariesByRequestId[printRequest.id]` and `allocationTotalsByRequestId[printRequest.id]` — **both** sourced from `useMyPrintRequests`'s context-level maps, which are populated **only** by the `'full'`-scope `reload()`, itself triggered **only** by a `pathname` transition onto `/requests` or `/dashboard` (L98-119). The post-queue success handler `handleQueuedToShow` (`PrintRequestDetailView.tsx` L271-289) calls `reconcileQueuedRequest(printRequestId)`, which (per `useMyPrintRequests.ts` L158-164) patches only `request.status` to `'active'` — it does **not** update `allocationTotalsByRequestId`, so `derivePrintRequestListTab` still sees `totalAllocatedQuantity: 0` for that request (no allocation summary yet fetched) and returns `'working'`, so `resolvePortalPrintProgressStage('working')` returns `null` and no `PortalPrintRequestProgressPanel` renders — until the customer leaves and re-enters via `/requests`, which triggers the pathname-gated `'full'` reload and finally populates `allocationTotalsByRequestId`. |
| 3 | Firebase Debug toast text | `apps/portal/features/firebase-debug/components/FirebaseDebugPanelActivationToast.tsx` (exact string, L34), `apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanelActivationToast.tsx` (exact string, L32), mounted from `FirebaseDebugPanelMount.tsx` in both apps | Both are small, self-contained components rendering exactly `Firebase Debug panel available (Ctrl+Shift+F)` for 4 seconds. Mounting is gated by `isFirebaseDebugPanelEnabledForPortal()` / `isFirebaseDebugPanelEnabledForStudio()` (dev-only, `fresh-prints-dev`-only gates, per `ARCHITECTURE.md` "Development-only Firebase Debug window") — **separable** from the toast; the Ctrl+Shift+F shortcut (`useFirebaseDebugPanelShortcut`) is wired independently of the toast component. |
| 4 | Elapsed timer on show-linked detail | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` (`PortalPrintRequestProgressPanel` render, L402-416), `apps/portal/features/print-requests/components/PortalPrintRequestProgressPanel.tsx` (readout `formattedElapsed`/`showElapsed`, L40-146), `apps/portal/features/print-requests/hooks/usePortalShowPrintProgress.ts` (elapsed computation, unchanged) | `PortalPrintRequestProgressPanel` is the **current, only** component of this name (confirmed by grep — no successor/replacement exists). It renders a live elapsed clock readout (`readoutText`, driven by `formattedElapsed`/`isLive`) **and** the 3-step Queued/Printing/Done rail in the same component. `usePortalShowPrintProgress` (unchanged, underlying production timer) is shared and must be preserved — Studio Show Queue timing derives from the same source data (`getPortalShowPrintProgress` callable / `showAllocations` fields), not from this component. |
| 6 | Show-capacity copy | `packages/shared/src/utils/printRequestQuotaUserCopy.ts` (`formatShowCustomerLimitUserMessage`, L17-20) | Exact current string: `` You've used all ${safeCap} print spots on this show. Choose another show for more designs. `` — missing the word **"of your"**. Owner's required replacement inserts "of your" after "all 25". Single source function; all customer-facing call sites (`packages/shared/src/utils/portalShowQueueFit.ts`, `printRequestPerShowCustomerCap.ts`) already delegate to this one formatter (confirmed by grep — no duplicate hardcoded copy elsewhere). |
| 8 | Ambiguous "Add to request" on submitted requests | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` (`showCatalogReuse` block, L537-566, button text L552) | The button only renders when `readOnly && catalogDesignId.length > 0 && catalogReuseDesign !== undefined` (i.e., viewing a historical/submitted request's item that still exists as a ready catalog design) — this is **already** the correct historical-request-only condition; no new context plumbing is needed to distinguish "historical" from "active working request," because `readOnly` (passed from `PrintRequestDetailView.tsx` as `!isEditable`) is already `true` only for non-`draft`/non-`editing` requests. |

---

## 3. Request-State Ownership Diagram

```txt
                         ┌─────────────────────────────┐
                         │   Firestore / Callables      │
                         │ printRequests, printRequestItems,
                         │ showAllocations (authority)  │
                         └──────────────┬───────────────┘
                                        │
                 ┌──────────────────────┼────────────────────────────┐
                 │                      │                            │
                 ▼                      ▼                            ▼
   portalPrintRequestReadCache   portalPrintRequestService   catalogService /
   (30s TTL, per-key, generation-   (thin Firestore/callable   portalCatalogAssetService
   busted on clearPortalPrintRequestReadCache)  wrapper)      (design summaries; 30s manifest
                 │                      │                     cache window + per-id 5min cache)
                 │                      │                            │
                 └──────────────────────┴────────────────────────────┘
                                        │
                        ┌───────────────┴────────────────┐
                        ▼                                ▼
              useMyPrintRequests                useWorkingCurrentRequestItems
        (requests list, summariesByRequestId,   (workingItems, designSummaries,
         allocationTotalsByRequestId — 'chrome'  uploadSummaries — SOLE owner of
         scope always; 'full' scope only on      Current Request / cart item state;
         /requests or /dashboard pathname)       pendingRemovedItemIdsRef,
                        │                          reloadEpochRef, mergeServerWorkingItemsWithLocal)
                        │                                │
                        └───────────────┬────────────────┘
                                        ▼
                         PortalPrintRequestContext (React Context)
                  workingRequest, workingItems, requests, requestsByTab,
                  summariesByRequestId, allocationTotalsByRequestId,
                  pendingWorkingRequestId, beginPendingItemRemovals/end...,
                  reconcileQueuedRequest (status-only patch),
                  reconcileClearedRequest (status+itemCount-only patch)
                                        │
              ┌─────────────────────────┼─────────────────────────────┐
              ▼                         ▼                             ▼
    Shell/header/CurrentRequestDrawer  usePrintRequestDetail    useAddDesignToRequestFlow
    (reads workingItems/workingRequest  (SEPARATE local `items`  (per-design coalesced qty
     directly from context; no own      state; own `loadGenerationRef`;  writes; optimistic
     item-level pending/removal guard)  syncs FROM workingItems via  `optimistic:{designId}` items
                                        `cartSignature` when viewing  patched into context's
                                        the working request; NO       workingItems via
                                        beginPendingItemRemovals call  patchWorkingItems)
                                        on its own removeItem/updateItem)
```

**Key structural finding:** there are **two independent, only-partially-synchronized item
representations** for the same working request while its detail page is open:
`useWorkingCurrentRequestItems`'s `workingItems` (context-level, shared with drawer/header/catalog)
and `usePrintRequestDetail`'s own local `items` (page-level). They are reconciled **one-way**
(`workingItems` → local `items`, via the `cartSignature` effect) and **only** while
`isViewingWorkingRequest` is true. The detail page's own mutations
(`removeItem`, `updateItem`, `duplicateItem`) patch **local `items` first**, and only *sometimes*
also patch `workingItems` (`updateItem` does; `removeItem` does **not** call
`patchWorkingItems`/`beginPendingItemRemovals` at all — it relies entirely on the caller's separate
`reloadWorkingItems({ silent: true })` call in `PrintRequestDetailView.handleRemoveItem`, which has no
stale-completion protection of its own beyond `useWorkingCurrentRequestItems`'s epoch guard, and that
epoch guard was never told a removal is in-flight because `beginPendingItemRemovals` was never called
for a detail-page-initiated remove).

---

## 4. Exact Async Race Explanations for Items 2, 5, and 7 (Consolidated Root-Cause Investigation)

Per the owner's requirement, items 2, 5, and 7 were investigated together before any independent UI
patch was proposed. **Finding: they share one structural root cause with three distinct trigger
paths**, not three unrelated bugs:

### Shared root cause

`usePrintRequestDetail` (`apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`) is a
**second, independent** owner of print-request-item state that exists **in addition to**
`useWorkingCurrentRequestItems` (the context's single declared "SOLE owner of working Current Request
item loads," per that file's own doc-comment, L59-64). The detail hook was very likely built to
support **historical** (non-working) request detail viewing, where a second independent load is
correct and necessary (a historical request is not the shared working cart). But when the **same**
detail page is showing the **working** request, the detail hook's local `items` and the shared
`workingItems` are two different pieces of React state, reconciled only by the one-directional,
signature-gated `useEffect` at `usePrintRequestDetail.ts` L174-226 — and that effect is a **display**
sync, not a **mutation-ownership** transfer. The detail hook's own mutation handlers
(`removeItem`, `updateItem`, `duplicateItem`) do not participate in
`useWorkingCurrentRequestItems`'s stale-completion protections
(`pendingRemovedItemIdsRef`, `reloadEpochRef`) at all, because those refs are private to the other
hook and the context only exposes `beginPendingItemRemovals`/`endPendingItemRemovals` as functions —
which `usePrintRequestDetail` never calls.

### Item 2 (removed items reappear)

1. Customer opens working request detail (`isViewingWorkingRequest === true`).
2. Removes item A: `usePrintRequestDetail.removeItem` calls the callable, then patches **local**
   `items` only (`PrintRequestDetailView.tsx` `handleRemoveItem` also calls
   `reloadWorkingItems({ silent: true })` from context, but this races the context's own epoch —
   see below).
3. Before that removal's `reloadWorkingItems({silent:true})` resolves, the customer opens Add to
   Show (which itself does an allocation-only fetch, not an item reload — but simply **remounting**
   the modal or navigating triggers `usePrintRequestDetail`'s `catalogDesignIdsKey` effect (L116-133)
   again for the **still-locally-stale** `items` array captured in that effect's closure at the time
   it last ran) or edits another item's quantity (`handleUpdateItem` → `reloadWorkingItems({silent:
   true})` again).
4. A **second, unrelated** `reloadWorkingItems` call increments `useWorkingCurrentRequestItems`'s
   `reloadEpochRef`, but the **detail hook's own `cartSignature` sync effect** (L174-226) compares
   `workingItems` (now current per that hook's own epoch) against
   `lastSyncedWorkingSignatureRef.current` — if `mergeServerWorkingItemsWithLocal` (called inside
   `useWorkingCurrentRequestItems.reloadWorkingItems`, L177) merges in a **local** (pre-removal)
   optimistic/real row that the *shared* hook still had in its own `items` state (because the working
   hook was never told about the detail-page-only removal via `beginPendingItemRemovals`), the merge
   function's own preserve-local-rows logic (`mergeServerWorkingItemsWithLocal.ts` L33-49) can
   **resurrect** the removed row into `workingItems`, which then flows back into the detail page via
   the sync effect.
5. **Root cause:** `usePrintRequestDetail.removeItem` never calls `beginPendingItemRemovals`, so
   `useWorkingCurrentRequestItems` has no way to know a removal happened and can serve/merge a stale
   server or local snapshot that still contains the removed item, which the detail page's own sync
   effect then re-applies.

### Item 5 (quantity staleness / revert)

Same shared root cause, opposite direction: the **catalog add flow** (`useAddDesignToRequestFlow`)
correctly owns and patches `workingItems` via `patchWorkingItems`/`patchItemsAndSnapshot`, including
the `optimistic:{designId}` → real-item-id swap (`flushDesiredQuantity`, L330-341). But
`usePrintRequestDetail`'s local `items` only receives that update through the **same** one-directional
`cartSignature` sync effect — which is gated on `isViewingWorkingRequest` and on the signature
actually changing since the last sync. If the customer navigates to the detail route in the same tick
the qty flush is still in flight (item 5a), or if a **second** local mutation
(`usePrintRequestDetail.updateItem`, item 5b) races the shared hook's own reconciliation without any
per-item generation/sequence guard in the detail hook itself, the two representations diverge and the
one that "wins" the last render is whichever one last touched
`lastSyncedWorkingSignatureRef`/`lastSavedSignatureRef` — not necessarily the most recent server
truth.

### Item 7 (progress tracker missing after queue-to-show)

Different symptom, same "two independent, not-fully-synchronized state owners" pattern, but this time
between `useMyPrintRequests` (`requests`, `summariesByRequestId`, `allocationTotalsByRequestId`) and
the detail page's locally-derived `listTab`/`progressStage`. `reconcileQueuedRequest` (called from
`handleQueuedToShow`) is a **partial** reconciliation: it patches only `request.status`, not the
summary/allocation maps that `derivePrintRequestListTab` actually reads. The **`'full'`-scope reload**
that would populate those maps is gated behind a `pathname` transition onto `/requests` or
`/dashboard` (`useMyPrintRequests.ts` L98-119) — the request detail route itself never triggers it.

### Why a single, consistent fix strategy applies to all three (Section 6)

All three are instances of **"a second state representation was mutated/patched without updating (or
without being reconciled against) the one authoritative representation that a *different* piece of UI
reads."** The fix (Section 6) targets that structural gap directly — it does not patch each symptom
independently.

---

## 5. Exact Cold-Start/Image-Resolution Explanation for Item 1

`apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` renders artwork via
`CatalogThumbnailPanel` (`apps/portal/features/catalog/components/CatalogThumbnailPanel.tsx`), which
**already implements the correct, approved skeleton/loading pattern**: `useCatalogDerivativeUrl`
exposes `isLoading`/`url`, and the panel shows `loadingLabel` while `isLoading`, the resolved `<img>`
once `url` exists, and `fallbackLabel` ("Preview unavailable") only when
`!catalogPath?.trim() || (!isLoading && !hasResolvedUrl)` (L50). This part of the pipeline is
**not** the bug — a genuinely-loading thumbnail already shows the approved skeleton, never a blank
area.

**The actual defect is one level up**, in the *catalog design* itself being resolved as `null`
(not merely "still loading"):

1. `usePrintRequestDetail.reload()` calls `getDesignSummariesForItems(nextItems)`
   (`portalPrintRequestService.ts` L571-587), which calls `catalogService.getReadyDesignsByIds`.
2. `getReadyDesignsByIds` (`catalogService.ts` L281-336) checks
   `generatedPortalCatalogEnabled()` (`catalogSnapshotFlags.ts` — true unless
   `NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS=false`) and, when enabled, calls
   `portalCatalogAssetService.getDesignsByIds(uniqueIds)` (`portalCatalogAssetService.ts` L297-302),
   which loads the **generated portal-catalog manifest** and its card-bucket asset
   (`loadPortalManifest()` / `loadCards(manifest, uniqueIds)`).
3. Per `ARCHITECTURE.md` ("Generated catalog read models" section): "the manifest's documented
   30-second cache window" governs how quickly a newly-published catalog change (including a design
   that was just approved, or whose card bucket was just regenerated after a wipe + Studio restart)
   becomes visible through this generated path. If the design a customer just added is **not yet**
   present in the currently-cached manifest's card buckets (cold-start: fresh manifest, or a
   just-approved design whose publish trigger hasn't completed), `loadCards` returns a list that
   **omits** that design's card — **not an error**, a **successful, valid, but incomplete** result.
4. `getReadyDesignsByIds`'s `try { return await portalCatalogAssetService.getDesignsByIds(...) } catch
   { traceGeneratedFallbackActivation(...) }` (L288-298) only falls back to the direct per-doc
   Firestore read path (L300-335) on a **thrown exception** — a successful-but-partial array is
   returned as-is; the surrounding code has no length/completeness check against the requested
   `uniqueIds`.
5. Back in `getDesignSummariesForItems` (`portalPrintRequestService.ts` L584-586): `byId` is built
   from whatever designs came back; any `designId` not present in `byId` maps to `null` in the
   returned `Map`.
6. In `usePrintRequestDetail`, `design` is looked up as `designSummaries.get(item.designId)` — `null`,
   not `undefined`/"still loading." `PrintRequestDetailView.tsx` (L462) passes `design: null` (not a
   loading placeholder) into `PortalPrintRequestItemCard`, whose own internal `previewPath` resolution
   (`design?.previewPath ?? design?.thumbnailPath ?? upload?.previewPath ?? ...`) becomes `undefined`
   because `design` is `null` — so `CatalogThumbnailPanel` receives `catalogPath: undefined` and
   *correctly, per its own contract* renders `isUnavailable` (not loading) — the terminal
   "Preview unavailable"/blank-looking state — because as far as that leaf component is concerned, the
   caller told it there is no path to resolve at all.

**Conclusion:** request detail is being marked "ready to render" (`usePrintRequestDetail.reload()`
completing, `isLoading: false`) **before the request's authoritative item *display metadata*
(catalog design summary) is confirmed available**, exactly as the owner's investigation brief
anticipated — but the specific mechanism is a **generated-snapshot cold-start gap** in
`getReadyDesignsByIds`'s success-but-incomplete handling, not a raw Firestore listener/cache timing
issue and not the direct per-doc Firestore fallback path (which is fully consistent and would show the
design correctly once it exists, because it reads live Firestore, not a cached manifest). A stale
**empty first response does not overwrite a later populated response** here — the opposite failure
mode is what happens: a **successful-looking incomplete** response is treated as final truth and never
retried.

---

## 6. Selected Mutation Reconciliation and Stale-Completion Strategy

### Strategy selected: single-owner consolidation + sequence-tokened reconciliation, built on patterns already in this codebase

Rather than inventing a new generic primitive (no `AbortController`, no new versioning library), this
Plan extends **exactly the two mechanisms the codebase already uses successfully** in
`useWorkingCurrentRequestItems.ts`:

1. **`reloadEpochRef`-style monotonic generation counters** — already proven in
   `useWorkingCurrentRequestItems.reloadWorkingItems` (L137, L165-168, L209-214) and
   `usePrintRequestDetail.reload`'s own `loadGenerationRef` (L65, L93, L99, L102). Extend this pattern
   to **every** detail-page mutation (`removeItem`, `updateItem`, `duplicateItem`) so each mutation
   call is tagged with a generation token at start, and any reconciliation/reload that resolves after
   a newer mutation for the *same item* started is discarded — not applied.
2. **`pendingRemovedItemIdsRef`-style pending-mutation marker sets** — already proven for removal in
   `useWorkingCurrentRequestItems` (`beginPendingItemRemovals`/`endPendingItemRemovals`,
   `filterPendingRemoved`). Extend the **same context-level marker set** (not a second, parallel one)
   so it is the single source of truth for "this item id is mid-removal, filter it out of every merge
   regardless of which hook receives the server snapshot."

### The structural fix: `usePrintRequestDetail` stops being a second independent owner while viewing the working request

The single biggest correction, which resolves items 2, 5, and 7 by removing their shared root cause
rather than patching each symptom:

- **While `isViewingWorkingRequest` is true, `usePrintRequestDetail`'s mutation handlers
  (`removeItem`, `updateItem`, `duplicateItem`) delegate to the *same* context-level
  `beginPendingItemRemovals`/`endPendingItemRemovals`/`patchWorkingItems` calls that
  `useAddDesignToRequestFlow` already uses** — instead of only sometimes calling `patchWorkingItems`
  (as `updateItem` does today) and never calling `beginPendingItemRemovals` (as `removeItem` does
  today). This makes `useWorkingCurrentRequestItems` genuinely the **sole** owner of pending-mutation
  state for the working request, matching its own doc-comment's stated intent
  (`useWorkingCurrentRequestItems.ts` L59-64), regardless of which UI surface (drawer, catalog card,
  or detail page) initiated the mutation.
- While viewing a **historical** (non-working) request, `usePrintRequestDetail` keeps its own
  independent local state exactly as today — that code path is correct and out of scope (historical
  requests are not shared with the cart).
- For item 7, `reconcileQueuedRequest` (`useMyPrintRequests.ts`) is extended to accept the **callable's
  own authoritative queue-to-show result** (`isFullyQueued`, `remainingUnallocatedQuantity`,
  `totalAllocatedQuantity`, `upcomingShowId` — all already returned by
  `queuePortalPrintRequestToShow` and already available at the `handleQueuedToShow` call site in
  `PrintRequestDetailView.tsx` L271, which currently discards them into an unused parameter) and
  writes a **locally-synthesized allocation total** directly into
  `allocationTotalsByRequestId[printRequestId]` — no new fetch, no full-scope reload, no guessing an
  allocation the server didn't confirm. This is a **narrow, local reconciliation from an already-known
  authoritative callable result**, exactly matching the pattern the owner requested ("Use authoritative
  callable results or a narrow post-success fetch/local reconciliation").

### Why this is grounded in the existing codebase, not invented

Every mechanism cited above (`reloadEpochRef`, `pendingRemovedItemIdsRef`,
`mergeServerWorkingItemsWithLocal`, `beginPendingItemRemovals`/`endPendingItemRemovals`,
`patchWorkingItems`, `reconcileQueuedRequest`/`reconcileClearedRequest`) already exists in the current
source and is already used for exactly this class of problem in at least one other part of the same
feature. This Plan proposes **consistent application** of the existing pattern, not a new
architecture.

---

## 7. Proof the Strategy Remains Bounded (No New Unbounded Reads)

- **Item 1 fix** (Section 8, file list) adds a **narrow retry with a completeness check** on the
  *existing* per-item design-id list already being fetched (`getReadyDesignsByIds(uniqueDesignIds)`)
  — it does not fetch more designs, more requests, or any additional collection. The retry is bounded
  to exactly the design IDs already known to be missing from the first response (a strict subset of
  the current request's own items), with a small bounded retry count/backoff, not a poll loop against
  the whole catalog.
- **Items 2/5 fix** consolidates mutation ownership using state **already loaded** by
  `useWorkingCurrentRequestItems` — it adds zero new Firestore reads. `beginPendingItemRemovals` and
  `patchWorkingItems` are pure in-memory operations.
- **Item 7 fix** writes a **locally-computed** value into `allocationTotalsByRequestId` from data
  **already returned by the `queuePortalPrintRequestToShow` callable response** — zero new reads,
  zero new callables, zero full-history reload. This directly satisfies the owner's explicit
  requirement: "Do not do a full request-history reload."
- **No new Firestore listener, no new callable, no new Cloud Function, no schema change, and no new
  composite index** is required anywhere in this Plan (confirmed per-item in Section 13).
- The abandoned print-request read model (Storage-backed generated JSON for print requests) remains
  fully removed; nothing in this Plan reads or writes `generated/studio-print-requests/**` or
  `generated/portal-print-requests/**` (both already deleted per Wave C signoff) or reintroduces any
  equivalent.

---

## 8. Every File Proposed for Modification

All paths below were opened and confirmed to exist in this repo during this session.

| # | File | Change |
|---|------|--------|
| 1 | `apps/portal/features/catalog/services/catalogService.ts` | In `getReadyDesignsByIds`, when the generated-snapshot path (`portalCatalogAssetService.getDesignsByIds`) returns fewer designs than `uniqueIds.length`, retry the **missing IDs only** via the existing per-doc Firestore fallback (the code already below it, L300-335) instead of leaving them `null`. Bounded to the exact missing subset; no full-catalog fetch. |
| 2 | `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` | `removeItem`, `updateItem`, `duplicateItem`: while `isViewingWorkingRequest`, call the context's `beginPendingItemRemovals`/`endPendingItemRemovals` (for remove) and always (not conditionally) `patchWorkingItems` (for update/duplicate) so `useWorkingCurrentRequestItems` is authoritative for pending-mutation state regardless of which surface mutated. Add a per-item generation ref so a stale `reload()`/sync cannot overwrite a newer local mutation for the same item id. |
| 3 | `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts` | No behavior change to its own logic; confirm/extend `beginPendingItemRemovals`/`patchWorkingItems` signatures if needed so the detail hook can call them identically to `useAddDesignToRequestFlow`. (Verify during Implement whether any signature widening is actually needed — may be a zero-diff file.) |
| 4 | `apps/portal/features/print-requests/hooks/useMyPrintRequests.ts` | Extend `reconcileQueuedRequest` to accept the queue-to-show callable's authoritative result (`totalAllocatedQuantity`, etc.) and locally patch `allocationTotalsByRequestId[printRequestId]` in addition to the existing `status` patch. No new fetch added. |
| 5 | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` | `handleQueuedToShow` passes the `PortalQueueToShowResult` (already returned by `onQueued`, currently unused) through to the extended `reconcileQueuedRequest`. |
| 6 | `apps/portal/features/print-requests/components/PortalPrintRequestProgressPanel.tsx` | Remove the elapsed-clock readout (`formattedElapsed`/`readoutText`/live-dot pulse driven by time) from customer-visible rendering; keep the 3-step Queued/Printing/Done rail and status-chip label copy. Component keeps accepting the same props from the caller (no prop removal that would force an unrelated caller change) unless Implement determines a prop can be safely dropped — verify no other caller depends on the elapsed text. |
| 7 | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` | Stop passing `formattedElapsed`/`isLive`/`showElapsed` into the progress panel in a way that renders the clock (or pass a flag that suppresses the customer-visible clock while `usePortalShowPrintProgress` keeps computing timing data unchanged for any future non-customer-facing use). |
| 8 | `packages/shared/src/utils/printRequestQuotaUserCopy.ts` | `formatShowCustomerLimitUserMessage`: insert "of your" — `You've used all ${safeCap} of your print spots on this show. Choose another show for more designs.` |
| 9 | `packages/shared/src/utils/portalShowQueueFit.test.ts`, `packages/shared/src/utils/printRequestPerShowCustomerCap.test.ts` | Update the two existing regex assertions to the corrected exact string. |
| 10 | `packages/shared/src/utils/printRequestQuotaUserCopy.test.ts` | Update the exact-string assertion to the corrected copy. |
| 11 | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` | Change the `showCatalogReuse` button label from `Add to request` / `Adding…` to `Print again` / `Adding…`, add a repeat-style icon (Lucide `Repeat`, already available via the `lucide-react` dependency already used elsewhere in this feature area, e.g. `PortalQueueToShowModal.tsx`'s `TriangleAlert`/`X` imports) before the label, and set an explicit `aria-label` (e.g. `` Print `${title}` again ``) distinct from the visible short label. Behavior (`onAddToRequest`/`addDesignFlow.addDesign`) is unchanged — still the existing safe add-to-working-request path. |
| 12 | `apps/portal/features/firebase-debug/components/FirebaseDebugPanelMount.tsx` | Remove the `<FirebaseDebugPanelActivationToast />` render (and now-unused import) while keeping every other line (shortcut wiring, trace subscription, dev/project gate) unchanged. |
| 13 | `apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanelMount.tsx` | Same removal: drop `showActivationToast` state, the toast-mount effect, and the `<FirebaseDebugPanelActivationToast />` render; keep the shortcut (`useFirebaseDebugPanelShortcut`) and trace subscription untouched. |
| 14 | `apps/portal/features/firebase-debug/components/FirebaseDebugPanelActivationToast.tsx` | Delete the file (component becomes unused after #12). |
| 15 | `apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanelActivationToast.tsx` | Delete the file (component becomes unused after #13). |

### New test files to add (see Section 9 for full mapping)

| # | File | Purpose |
|---|------|---------|
| 16 | `apps/portal/features/catalog/services/catalogService.test.ts` (new — confirmed via Glob: no existing test file for `catalogService.ts` today; the sibling `portalCatalogAssetService.test.ts` and `catalogDesignByIdCache.test.ts` exist but cover different files, not this one) | Item 1 regression: generated-snapshot partial result triggers per-id fallback fill, not a permanent null. |
| 17 | `apps/portal/features/print-requests/hooks/usePrintRequestDetail.test.ts` (new — confirmed via Glob: zero `*.test.ts` files exist anywhere under `apps/portal/features/print-requests/hooks/` today) | Items 2 and 5 regression tests (delayed pre-delete load resolving after delete; pending-id qty carry-through; stale pre-edit load after newer save; remove-then-edit-another-item). |
| 18 | `apps/portal/features/print-requests/hooks/useMyPrintRequests.test.ts` (new — same confirmed-empty directory as #17) | Item 7 regression tests (immediate post-queue tracker state; cancel no-op; stale pre-queue response cannot remove confirmed allocation; re-entry consistency). |
| 19 | A repo-wide static string-absence test (e.g. `packages/shared/src/utils/firebaseDebugToastAbsence.test.ts`, new) | Item 3 regression: proves the exact string `Firebase Debug panel available (Ctrl+Shift+F)` no longer exists anywhere under `apps/portal/` or `apps/studio/` shipped UI source. |
| 20 | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.test.ts` (new — confirmed via Glob: zero `*.test.ts*` files exist anywhere under `apps/portal/features/print-requests/components/` today) | Item 8: button renders `Print again` with repeat icon + correct `aria-label` only in the historical/read-only + catalog-reuse context; renders normal add behavior otherwise. |

**No Functions, Rules, indexes, or migration file is proposed for modification anywhere in this
list** (see Section 13).

---

## 9. Tests to Add or Update (Mapped to Required Regression Tests)

### Item 2 required regression test

> Start a delayed pre-delete item load. Complete a delete. Resolve the stale load afterward. Verify
> deleted items do not reappear.

- New test in `usePrintRequestDetail.test.ts` (or the appropriate existing test convention for hooks
  in this feature — this repo's hooks are tested as pure logic where practical, per
  `docs/standards/TESTING.md`'s "no DOM-rendering dependency" convention used elsewhere, e.g. the
  `portal-google-analytics` goal's `runPortalAnalyticsControllerTick` pattern). Simulate: (1) start
  `reload()` with a mocked slow `listPrintRequestItems`, (2) call `removeItem(id)` before that resolves
  (asserting `beginPendingItemRemovals` is invoked, per the new fix), (3) let the slow load resolve,
  (4) assert the removed item id is absent from final `items`.

### Item 5 required regression tests

1. Pending design (`optimistic:{designId}`), change qty before real ID resolves, resolve real item,
   verify final item has edited qty — new
   `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.test.ts` (confirmed via Glob:
   no existing test file for this hook) plus a new
   `usePrintRequestDetail.test.ts` case proving the detail page shows the same final qty.
2. Change qty and navigate immediately; verify destination shows latest value — covered in the new
   `usePrintRequestDetail.test.ts` via the generation-ref fix.
3. Stale pre-edit load resolves after a newer save; old qty must not overwrite — same file, generation
   guard assertion.
4. Remove two items, edit remaining item's qty, verify deleted items don't reappear — combined
   regression covering both items 2 and 5's shared root cause in one test in
   `usePrintRequestDetail.test.ts`.
5. Simulate save failure; verify UI shows failure without claiming persisted — extend existing
   `PortalPrintRequestItemCard`-level or `usePrintRequestDetail`-level coverage; the existing
   `autosaveState`/`onAutosaveStateChange('failed', ...)` path in `PrintRequestDetailView.tsx` (L166-171,
   L526-548) already renders a "Save failed" indicator with retry — a regression test should confirm
   this path is reached and that `items` reverts to the authoritative (pre-optimistic) value on
   failure, not a silently-kept optimistic value.

### Item 7 required regression tests

1. Successful queue response immediately transitions local state to show-linked + renders tracker —
   new test in `useMyPrintRequests.test.ts` asserting the extended `reconcileQueuedRequest` populates
   `allocationTotalsByRequestId` from the passed result, and a `PrintRequestDetailView`-level
   (or `derivePrintRequestListTab`-level, since that's a pure function) assertion that `listTab`
   becomes `'queued'` immediately after.
2. Canceling show picker makes no state change — existing `PortalQueueToShowModal` cancel path
   (`onClose`) already does not call `onQueued`; add/confirm a test that `reconcileQueuedRequest` is
   never invoked on cancel.
3. Stale pre-queue response resolving after success cannot remove the newly confirmed
   allocation/progress state — new test asserting a slow-resolving pre-queue allocation fetch
   (`loadAllocationState` in `PrintRequestDetailView.tsx`) does not overwrite the just-set
   `unallocatedQuantity: 0` / new allocation totals (the existing `skipAllocationLoadAfterQueueRef`
   one-shot suppression is exactly this guard for `unallocatedQuantity` — extend equivalent coverage
   for the newly-added `allocationTotalsByRequestId` patch).
4. Re-entering later produces the same visible state as immediate post-success — new test comparing
   the `'full'`-scope reload's computed `listTab` against the immediate reconciliation's computed
   `listTab` for the same underlying data, asserting parity.

### Item 1 regression test

- New test proving: `getReadyDesignsByIds` called with N ids; mock
  `portalCatalogAssetService.getDesignsByIds` to return N-1 (simulating a manifest cold-start gap, not
  a thrown error); assert the missing id is retried via the per-doc Firestore path and the final
  result includes all N designs (when the per-doc path itself succeeds). Also assert: a fully
  successful complete response (today's happy path) makes zero extra calls (no regression to the
  bounded-read property confirmed in Wave C).

### Item 3 regression test (exact string, static)

- New test (or extend an existing repo-wide static-check test file if the codebase already has a
  convention for this — `[NEEDS REPO CHECK: no existing "string absence" test file found by Glob;
  proposing a new one]`) that reads the relevant Portal/Studio UI source directories (or specific
  known files) and asserts the literal string `Firebase Debug panel available (Ctrl+Shift+F)` does
  not appear. Also confirm via the same test (or a second assertion) that
  `isFirebaseDebugPanelEnabledForPortal`/`isFirebaseDebugPanelEnabledForStudio` and the Ctrl+Shift+F
  shortcut registration (`useFirebaseDebugPanelShortcut`) still exist unchanged (proves the dev tool
  itself was not removed, only the toast).

### Item 6 regression test (copy)

- Update the three existing test files (`portalShowQueueFit.test.ts`,
  `printRequestPerShowCustomerCap.test.ts`, `printRequestQuotaUserCopy.test.ts`) to assert the
  corrected exact string. No new test file needed — this is a pure string-constant change with
  existing coverage already asserting the (now-incorrect) string.

### Item 8 regression test

- New/extended `PortalPrintRequestItemCard` test asserting: when `readOnly === true` and
  `catalogReuseDesign` is a resolved design, the button renders text `Print again`, an
  `aria-label` containing "again" and the design title, and a repeat icon element; when
  `readOnly === false` (active working request), the same code path is never reached (existing
  behavior unchanged, proven by the existing `showCatalogReuse` gating condition already in source).

### Required automated verification commands (to run during a future Test phase — NOT run in this Plan session)

```bash
npx tsx --test apps/portal/features/catalog/services/catalogService.test.ts
npx tsx --test apps/portal/features/print-requests/hooks/usePrintRequestDetail.test.ts
npx tsx --test apps/portal/features/print-requests/hooks/useMyPrintRequests.test.ts
npx tsx --test apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.test.ts
npx tsx --test apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.test.ts
npx tsx --test apps/portal/features/print-requests/components/PortalPrintRequestItemCard.test.ts
npx tsx --test packages/shared/src/utils/printRequestQuotaUserCopy.test.ts packages/shared/src/utils/portalShowQueueFit.test.ts packages/shared/src/utils/printRequestPerShowCustomerCap.test.ts
npx tsx --test packages/shared/src/utils/firebaseDebugToastAbsence.test.ts
npm run typecheck --workspace @fresh-prints/portal
npm run build:portal
npm run build:studio
npm run lint
git diff --check
```

(Exact test file list must be re-confirmed against whatever files actually exist at Implement time —
several are marked `[NEEDS REPO CHECK]` above pending Implement-time file creation.)

---

## 10. Manual QA Steps

1. **Item 1 (cold-start images):** Wipe Studio test data (Print Requests preset), restart
   `npm run dev:studio` and `npm run dev:portal`. In Portal, immediately add a design to a new working
   request, navigate to Current Request, click Review Request as soon as the button is enabled.
   Confirm: item card shows either a resolved image or the existing loading skeleton — never a blank
   "Preview unavailable" area for a design that is actually still `ready` in Firestore. Repeat 5x to
   catch the race.
2. **Item 2 (removed items reappear):** Open a working request with 3+ items. Remove two directly.
   Confirm cards disappear immediately. Open Add to Show, cancel it. Confirm removed items do not
   reappear. Edit the remaining item's quantity. Confirm removed items still do not reappear. No hard
   refresh needed at any point.
3. **Item 5a (catalog add → qty → detail stale):** From Discover/Catalog, add a design, then
   immediately increase its quantity via the qty stepper, then navigate to Current Request detail.
   Confirm the detail page shows the just-edited quantity, not qty 1.
4. **Item 5b (detail autosave revert):** On request detail, change an item's quantity, wait for
   "Saved," then quickly change quantity again and navigate away and back. Confirm the latest value
   persists and never silently reverts.
5. **Item 7 (progress tracker after queue):** Submit a working request to an upcoming show. Confirm
   the destination page immediately shows the Queued progress tracker without leaving/returning.
   Cancel a subsequent Add to Show attempt on a different request and confirm no state change.
6. **Item 3 (debug toast):** In a dev build on `fresh-prints-dev`, load Portal and Studio. Confirm the
   Ctrl+Shift+F debug panel still opens via the shortcut, but the bottom-right toast text never
   appears. Confirm a production-configured build shows neither the toast nor the panel.
7. **Item 4 (elapsed timer removed):** Open a show-linked request detail while its show is actively
   printing. Confirm the Queued/Printing/Done rail and status label still update, but no live
   clock/timer digits are shown to the customer. Confirm Studio Show Queue's own elapsed timer for
   staff is completely unchanged.
8. **Item 6 (capacity copy):** Attempt to exceed the 25-print show limit. Confirm the exact new
   string: "You've used all 25 of your print spots on this show. Choose another show for more
   designs."
9. **Item 8 (Print again):** Open a previously submitted/queued request's detail page. Confirm the
   catalog-reuse button reads "Print again" with a repeat icon and an `aria-label` naming the design.
   Confirm clicking it adds the design to the customer's current *working* request (a different,
   active request) without altering the historical request's status or allocations. Confirm on an
   active (non-submitted) working request, no such relabeled button appears — the normal add controls
   are unchanged. Verify on both mobile and desktop viewport widths.

---

## 11. Rollback Plan

- All changes are Portal/Studio application-code-only (React components, hooks, one shared utility
  string, two shared test files). Every file is under version control; rollback is a standard
  `git revert` of the Implement commit(s).
- No Firestore document shape changes, no Storage object changes, no Function deploys, no Rules
  changes, no index changes — rollback requires **zero** Firebase-side reversal.
- The debug-toast component deletions (#14/#15) are the only file deletions; both are trivially
  restorable from git history if the owner ever wants the toast back (not anticipated).
- If item 1's bounded-retry fallback introduces any unexpected latency, it can be reverted
  independently of the other 7 fixes (no shared code path).

---

## 12. Deployment Impact

- **Dev target only:** any manual QA against live data uses `fresh-prints-dev`, consistent with every
  other goal in current state history. Production remains untouched.
- **No `firebase deploy` of any kind is required** for this Plan's scope (see Section 13) — this is a
  pure Portal/Studio Next.js/Electron-renderer application-code change. Standard `npm run build:portal`
  / `npm run build:studio` verification is sufficient; no App Hosting redeploy is required to validate
  locally, though the eventual `production-release` goal will naturally include these fixes in its own
  deploy.
- No environment variable changes, no new dependency (the `lucide-react` package used for the new
  repeat icon is already an existing dependency, already imported elsewhere in this exact feature
  directory — `PortalQueueToShowModal.tsx`).

---

## 13. Explicit Statement — Functions, Rules, Indexes, Data Migration

| Area | Required? | Justification |
|------|-----------|----------------|
| Cloud Functions | **No** | Every fix is a read-path retry, in-memory state reconciliation, or presentation-only change against data the client already has permission to read via existing callables/queries. `queuePortalPrintRequestToShow` (the callable involved in item 7) is unchanged — only its **already-returned** response is used more completely on the client. |
| Firestore Rules | **No** | No new read/write pattern is introduced; all reads use existing, already-permitted query shapes (`printRequestItems` by `printRequestId`, `designs/{id}` ready reads, `showAllocations` by `printRequestItemId`). |
| Firestore Indexes | **No** | No new query shape (no new field combination, no new sort) is introduced anywhere in this Plan. |
| Storage Rules | **No** | No new Storage path or access pattern. |
| Data migration / backfill | **No** | No schema field is added, renamed, or reinterpreted. `formatShowCustomerLimitUserMessage`'s string change is presentation-only. |

---

## 14. Customer-Visible Elapsed Clock (Removed) vs. Underlying Production Timer (Kept)

- **Removed (customer-visible only):** the live-updating clock readout
  (`formattedElapsed`/`readoutText`, the pulsing live-dot, and the numeric MM:SS-style text) currently
  rendered inside `PortalPrintRequestProgressPanel` on the Portal request-detail page for show-linked
  requests.
- **Kept, completely unchanged:**
  - `usePortalShowPrintProgress` (`apps/portal/features/print-requests/hooks/usePortalShowPrintProgress.ts`)
    — continues to poll/compute `elapsedMs`, `isRunning`, `isPaused`, `primaryShow`, and
    `statusHeadline` exactly as today. This Plan does not remove or alter its polling cadence, its
    `showElapsed` boolean, its visibility-change/focus re-poll behavior, or its underlying data source
    (`portalShowSelectionService.getShowPrintProgress`).
  - Studio Show Queue's own production timer, status derivation, and allocation rules
    (`showAllocations` fields such as `accumulatedPrintMs`, `activePrintStartedAtMs`,
    `printPausedAtMs`, `productionStatus`) — entirely untouched; Studio never renders
    `PortalPrintRequestProgressPanel` (a Portal-only component) and has its own separate timer display.
  - The Portal customer's **Printing tab** / status derivation elsewhere in Portal that may consume
    the same `usePortalShowPrintProgress` data for non-clock purposes (e.g., status headline text) is
    unaffected — only the numeric clock digits are suppressed from customer view, not the underlying
    computation.
- The Queued/Printing/Done rail and its status-chip label (`getStatusChipLabel`) remain fully visible
  and functional after this change — only the clock readout row is removed from customer view.

---

## 15. Debug Tool Remains Dev-Only — Only the Toast Is Removed

- `isFirebaseDebugPanelEnabledForPortal()` / `isFirebaseDebugPanelEnabledForStudio()` (the dev-build +
  `fresh-prints-dev`-project-only gates described in `ARCHITECTURE.md`'s "Development-only Firebase
  Debug window" section) are **not modified** by this Plan.
- The Ctrl+Shift+F keyboard shortcut (`useFirebaseDebugPanelShortcut`) and its wiring to
  `openFirebaseDebugWindow`/`openPortalFirebaseDebugWindow` remain fully intact in both apps.
- The actual debug panel/window components (`FirebaseDebugPanel`, the Portal `/firebase-debug` popup
  route, the Studio separate `BrowserWindow`) are **not touched** — only the small, self-contained
  `FirebaseDebugPanelActivationToast` component (and its render call site inside each app's
  `FirebaseDebugPanelMount`) is removed.
- Direct inspection of both `FirebaseDebugPanelMount.tsx` files (Portal and Studio) confirms the toast
  render is a separable, single-line JSX expression in each file — removing it does not require
  touching the surrounding gate logic, the shortcut registration, or the trace subscription
  `useEffect` blocks, proving toast and tool are **not** inseparable (the owner's stated exception
  condition for preserving the toast does not apply here).
- Production Studio builds and any Portal deployment without `NEXT_PUBLIC_...` dev flags already never
  render `FirebaseDebugPanelMount`'s gated contents at all (`isEnabled`/`isEligible` false → early
  `null` return) — this is unchanged; the toast could never have appeared in production before this
  fix, and still cannot after it.

---

## 16. Acceptance Criteria Checklist

**Request integrity**
- [ ] Removed items never reappear after Add to Show cancel, quantity edits elsewhere, or route
      remounts, without a hard refresh.
- [ ] A stale pre-delete load resolving after a delete never overwrites post-delete state.
- [ ] Quantity edits from Discover, Design Library selection, Current Request/cart, and request detail
      all persist and appear immediately everywhere, without a hard refresh.
- [ ] A pending optimistic item's temp ID → real ID swap carries its latest quantity.
- [ ] Multiple quick quantity edits resolve to the latest accepted value.
- [ ] Failed saves show honest failure state and restore authoritative data — never silent false
      success.

**Request rendering**
- [ ] Request detail never shows unexplained blank image areas; the approved loading skeleton is used
      while metadata is still resolving; no arbitrary delay is added to hide the race.
- [ ] Cold-start after test-data wipe + restart no longer shows a permanently-blank card for a design
      that is actually `ready`.

**Queue transition**
- [ ] Immediately after a successful queue-to-show callable response, the destination page shows the
      progress tracker without leaving/returning, remounting, or hard refresh.
- [ ] A canceled Add to Show interaction causes no state change.
- [ ] A stale pre-queue response resolving after success cannot remove the newly confirmed allocation
      state.
- [ ] Re-entering later produces the same visible state as the immediate post-success view.

**Customer-facing cleanup**
- [ ] The exact string `Firebase Debug panel available (Ctrl+Shift+F)` no longer appears anywhere in
      Portal or Studio UI, in dev or prod, while the dev-only Ctrl+Shift+F tool itself still works in
      dev builds.
- [ ] The customer-visible elapsed clock is removed from show-linked request detail; the
      Queued/Printing/Done rail and status labels remain; the underlying production timer and Studio
      Show Queue timing/status derivation are unchanged.
- [ ] The exact corrected capacity-limit copy appears everywhere the old string appeared; the 25-print
      limit/allocation logic itself is unchanged.
- [ ] A previously-submitted/show-linked request's reuse action reads "Print again" with a repeat icon
      and a descriptive `aria-label`, uses the existing safe add-to-working-request behavior, and does
      not appear on an active working request's own items.

**Regression safety**
- [ ] All required regression tests (Section 9) pass.
- [ ] `npm run typecheck --workspace @fresh-prints/portal`, `npm run build:portal`,
      `npm run build:studio`, and `npm run lint` all pass (or failures are honestly documented).
- [ ] `git diff --check` is clean.
- [ ] No new unbounded Firestore read, no reintroduced abandoned print-request read model, no new
      Functions/Rules/indexes/migration.

---

## 17. Human Checkpoints

- **Stop after Plan + Formal Review.** No implementation begins until the owner explicitly approves
  this Plan (and any changes a Formal Review requires).
- Any discovery during Implement that Functions, Rules, indexes, or data migration are actually
  required (contrary to Section 13's current assessment) is a **separate explicit checkpoint** — work
  must pause and the owner must be asked before proceeding.
- If a dev deployment is ever needed to validate against live `fresh-prints-dev` data (e.g., to
  reproduce the item 1 cold-start manifest-lag scenario realistically), that deployment targets
  `fresh-prints-dev` only. **Production remains untouched** throughout this entire goal, exactly as
  every prior goal in `.cursor/workflow/state.md`'s history.
- This Plan does not authorize any App Hosting deployment, any production Firebase action, or any
  action outside this repository.

---

## 18. Independent Formal Review Findings and Disposition

An independent Review Agent (separate context, no visibility into this Plan's authoring reasoning)
performed a Formal Review against this Plan and the actual current repository source. Full review:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-review.md`.

**Verdict: `approved_with_changes`.**

**One blocking finding, now resolved in this Plan:** Section 1's original text asserted the owner's
"200 effective DPI" brief was factually wrong and that the real print-request-item-save floor was 72
DPI. The reviewer independently re-checked `packages/shared/src/constants/printSize.constants.ts` and
`packages/shared/src/utils/printRequestItemSizing.ts` and found this was backwards: `EFFECTIVE_DPI_BAD_MIN
= 200` (aliased as `MIN_PRINT_REQUEST_EFFECTIVE_DPI`) is the genuine, already-shipped floor for
standard Print Request item **saves** (enforced by `resolvePrintRequestItemDpiQualityLevel`, with a
runtime error string reading "Requested size is below the 200 DPI minimum for standard Print
Requests"). The 72 DPI constant (`MIN_ACCEPTABLE_EFFECTIVE_DPI`) governs a separate, earlier code path
— catalog import / customer-upload acceptance validation — not print-request item saves. The owner's
original brief was correct; this Plan's earlier draft had conflated the two floors. **Disposition:**
Section 1 has been corrected in place to state the accurate floor (200 DPI) and its correct source
files. This is a documentation/test-guidance correction only — the reviewer independently confirmed no
file in Section 8's proposed-modification list touches DPI validation logic, so the fix design for
items 1–8 is unaffected. The practical consequence, now avoided: Section 9's item 5 regression tests
must assert save/reject behavior against the real 200 DPI boundary, not an invented 72 DPI one.

**Everything else in the review was independently confirmed sound, with file:line citations for every
claim checked:** the shared root-cause diagnosis for items 2, 5, and 7 (the reviewer re-derived it
independently from `usePrintRequestDetail.ts`, `useWorkingCurrentRequestItems.ts`, and
`PortalPrintRequestContext.tsx` rather than trusting this Plan's narrative, and reached the same
conclusion); the cold-start/generated-manifest explanation for item 1; the exact-string claims for
items 3 and 6; the elapsed-clock/production-timer separation for item 4; the already-correct
historical-request gating for item 8; the bounded-Firestore constraint (no new reads, no new
callables, no reintroduction of the abandoned read model); and every scope boundary (25-print-limit
arithmetic untouched, production timer untouched, dev-only Firebase Debug gate/shortcut untouched and
confirmed separable from the toast, no production action authorized or taken).

**Non-blocking notes** (no Plan change required): the item 1 "zero extra calls on a fully successful
response" assertion should not be dropped at Implement time; `useWorkingCurrentRequestItems.ts` is
very likely to end up a true zero-diff file, which is fine; Section 2's "5(a)/5(b)" sub-row labeling
vs. singular "item 5" references elsewhere is a minor labeling nit, not a missing criterion.

**No further Plan revision is required.** This Plan, as corrected, is ready for owner review and
approval. No implementation has occurred. No Firebase, deployment, or production action has occurred.

---

## 19. Amendment — Owner Runtime QA `FAIL`: Real Root Cause and Corrected Remediation

The owner ran manual QA against the Implementation-Review-approved code and found both removal and
quantity persistence still broken at runtime: removed designs remained visible until a hard refresh,
and quantity changes reverted or were lost. The prior Implementation Review had verified that the
reconciliation calls (`beginPendingItemRemovals`/`patchWorkingItems`/generation tracking) genuinely
exist and are wired correctly in isolation — that verification was accurate as far as it went, but it
did not prove the *rendered* state actually reflects those calls end-to-end. This amendment documents
the real runtime root cause, found by tracing the live component→hook→context call graph directly
(not re-reading the same functions in isolation).

### 19.1 Root cause — a second, unguarded reload races the reconciliation this Plan already built

**`apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`** destructures `reloadWorkingItems`
directly from `usePortalPrintRequests()` context (line 77) — the *raw* context function, not anything
wrapped by `usePrintRequestDetail`. Its `handleRemoveItem` (lines 221-237), `handleUpdateItem` (lines
192-203), and `handleDuplicateItem` (lines 205-219) each call `await removeItem(item.id)` /
`await updateItem(...)` / `await duplicateItem(...)` (the correctly-reconciled hook methods this Plan
built in Section 8 item #2) and then **immediately, unconditionally** call
`void reloadWorkingItems({ silent: true })` on the raw context function, completely independent of
anything `usePrintRequestDetail` does.

This second reload is a genuine, fresh `listPrintRequestItems` server read
(`useWorkingCurrentRequestItems.ts` lines 134-243). Two things make it unsafe:

1. **The pending-removal guard is already cleared by the time it runs.** `removeItem`'s own
   `beginPendingItemRemovals`/`endPendingItemRemovals` pair (Section 8 item #2's fix) brackets only
   the awaited `removePrintRequestItem` callable *inside* the hook — `endPendingItemRemovals` fires in
   `removeItem`'s own `finally`, which completes and returns control to
   `PrintRequestDetailView.handleRemoveItem` **before** that handler's own
   `reloadWorkingItems({ silent: true })` call even starts. So this second, component-level reload
   runs completely unprotected by the guard this Plan added.
2. **`mergeServerWorkingItemsWithLocal.ts`'s contract works against this reload, not for it.** Its
   documented purpose (lines 9-15) is protecting *not-yet-listed local additions* from being wiped by
   a lagging server list — "server rows win on matching id" (line 34: any local item whose id the
   server response also contains is dropped in favor of the server row). If the just-issued
   delete/update's write has not fully propagated to whatever read path `listPrintRequestItems` uses
   by the time this second reload's response lands — a completely ordinary Firestore eventual-
   consistency window, not a rare edge case — the "fresh" server list can still legitimately contain
   the just-deleted item or the pre-edit quantity, and this merge function keeps it, because from its
   own contract's point of view that is a genuine, not stale, server row.
3. That incorrect `workingItems` state change alters `cartSignature`
   (`usePrintRequestDetail.ts` line 183-186), which re-triggers the sync effect (lines 191-243),
   overwriting the just-corrected local `items` with the resurrected/stale data. This is why the
   defect appeared consistently rather than intermittently: the redundant reload fires on **every**
   remove/update, not occasionally.

The equivalent quantity-specific defect has a second, independent contributing cause in
**`apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`**: the prop-sync
effect (lines 216-230) resets `quantityInput` from the incoming `item.quantity` whenever
`buildItemSignature(item.quantity, ...)` differs from `lastSavedSignatureRef.current`.
`lastSavedSignatureRef.current` is only advanced in two places — this same effect, and `saveDraft`'s
success branch (line 334) — both of which race the same unguarded reload described above. When the
redundant `reloadWorkingItems({ silent: true })` (fired by `handleUpdateItem` immediately after a
successful `updateItem`) returns a stale pre-save quantity before or interleaved with `saveDraft`'s own
success callback, this effect cannot distinguish "a genuine newer external change" from "a stale
reload of data that predates my own already-committed save," and overwrites the correct, already-saved
draft with the stale value.

**Both defects are one shape:** a component-level reload that this Plan's original design did not
account for, calling the context's raw `reloadWorkingItems` directly and racing the exact
reconciliation machinery Section 8 item #2 built, with no stale-completion protection of its own.

### 19.2 Corrected remediation

1. **Remove the redundant component-level `reloadWorkingItems({ silent: true })` calls** in
   `PrintRequestDetailView.tsx`'s `handleRemoveItem`, `handleUpdateItem`, and `handleDuplicateItem`.
   `usePrintRequestDetail`'s `removeItem`/`updateItem`/`duplicateItem` already fully reconcile both
   `items` (local render state) and `workingItems` (shared context state, via `patchWorkingItems`)
   synchronously on success — a second, independent server refetch immediately afterward is not
   needed for correctness and is the actual source of both defects. If a specific known scenario
   still needs a reconciling reload (e.g. server-computed fields this Plan hasn't identified), that
   reload must carry the same per-item generation guard `usePrintRequestDetail` already has
   (`itemMutationGeneration.ts`) so a response older than the local mutation is discarded, not merged.
2. **`PortalPrintRequestItemCard.tsx`'s prop-sync effect must not overwrite a locally-saved-but-not-
   yet-reflected-in-props draft.** Track the last quantity/size *this card itself* successfully saved
   independent of `lastSavedSignatureRef`'s reset-on-every-incoming-prop behavior, or gate the reset on
   an explicit "this is a genuine newer external change" signal (e.g. compare against a monotonic
   version/updatedAt on `item` rather than a plain signature match) — `[NEEDS REPO CHECK]` at Implement
   time whether `PrintRequestItem` already carries a suitable field (e.g. `updatedAt`) for this, or
   whether the fix is fully covered by removing the racing reload in 19.2.1 alone (the two defects may
   collapse to the same fix once the racing reload is gone — verify at Implement time rather than
   assuming a second change is still needed).
3. **No new unbounded read is introduced; if anything, this removes reads** (deleting an unnecessary
   `listPrintRequestItems` call per mutation).
4. **Check `CurrentRequestDrawer.tsx`'s own `reloadWorkingItems({ silent: true })` calls** (a separate,
   pre-existing, out-of-scope-for-this-amendment call site, not part of the three being removed) against
   the same item-card stale-prop hypothesis before concluding 19.2.2's card-level guard is unnecessary —
   if the drawer and detail page can ever be mounted concurrently against the same working request, that
   reload could in principle still deliver a stale prop to a mounted item card even after the three
   `PrintRequestDetailView.tsx` calls are removed. Flagged by the amendment's Formal Review as a residual
   risk to verify, not a known defect.

### 19.3 Owner copy correction: `Print again` → `Request Again`

The owner has changed the exact required visible text for the item 8 historical/catalog-reuse button
from `Print again` (this Plan's original Section 8 item #11 / Section 16 wording) to exactly
**`Request Again`**. `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
lines 542-562 currently render `Print again` with the `Repeat` icon and
`aria-label={\`Print ${title} again\`}`. Both the visible label and the `aria-label` must change to
the owner's exact wording — visible label exactly `Request Again`, accessible label
`` `Request ${title} Again` `` (title-case "Again," consistent with the visible label's exact
capitalization — the Formal Review of this amendment flagged an inconsistent lowercase "again" in an
earlier draft of this note; use title case in both places). No other behavior in Section 8 item #11
changes — same historical/read-only + catalog-reuse gate (`showCatalogReuse`), same unchanged
`onAddToRequest` wiring, same pending/disabled behavior.

### 19.4 Owner-approved scope addition: Studio `tsconfig.json` build-blocker fix

The owner has explicitly approved a narrow, separate build-configuration correction as part of this
reopened Implement phase: `apps/studio/tsconfig.json` line 22 sets
`"ignoreDeprecations": "6.0"`, which the installed TypeScript (5.9.3, confirmed via `npx tsc -v`)
rejects with `TS5103: Invalid value for '--ignoreDeprecations'`, unconditionally failing
`npm run build:studio`. Confirmed via `git log -p -- apps/studio/tsconfig.json` that this line was
committed 2026-07-13, two weeks before this goal, and via `git diff --stat` that neither this goal's
original implementation nor this amendment has touched that file — a genuine pre-existing defect, not
caused by this goal, but now in-scope to fix per explicit owner approval.

**Minimum valid correction (to be confirmed at Implement time, per the owner's required process):**
`ignoreDeprecations` accepts only a small set of compiler-defined version-string values understood by
the *installed* compiler version — verify at Implement time which (if any) value TypeScript 5.9.3
actually accepts, or whether the setting can simply be removed if no current deprecation warning
actually requires suppressing (`skipLibCheck: true` already suppresses most third-party-type noise;
verify whether removing the line entirely produces a clean build before reintroducing any value).
**Do not** upgrade the `typescript` dependency (pinned `^5.2.2` in both root and
`apps/studio/package.json`, resolving to installed 5.9.3 — leave the version resolution as-is). **Do
not** change any other compiler option in this file or in `functions/tsconfig.json` /
`apps/portal/tsconfig.json` unless direct evidence at Implement time proves either has the identical
defect (neither showed it in this session's `build:portal`/Functions-adjacent checks). **Do not**
suppress a *new* class of error merely to force the build green — if removing/correcting
`ignoreDeprecations` exposes other genuine compiler errors, report them honestly and characterize each
as new, pre-existing, or caused by this goal, the same standard already applied to lint in this goal's
Test phase.

This narrow correction requires its own focused independent Formal Review before the change is made
(see Section 19.5), per the owner's explicit required process for this addendum — a smaller,
faster-turnaround review than the original whole-Plan Formal Review, scoped only to this one file and
this one line.

### 19.5 Required process for this amendment

1. This amendment (Section 19) documents the owner-approved scope addition and the corrected root
   cause/remediation for the two runtime `FAIL` findings.
2. A focused independent Formal Review of this amendment (Section 19 only, plus the Studio tsconfig
   addendum specifically) must run before either correction is implemented.
3. If that review approves (with or without changes) and creates no new unresolved owner decision,
   Implement proceeds under this explicit owner approval — no additional checkpoint is required
   beyond the amendment's own Formal Review.
4. Every constraint from the original Plan (Sections 1, 17) continues to apply unchanged: no DPI
   logic change, no `production-release`, no production/Firebase/deployment action, no
   Functions/Rules/indexes/migration unless proven unavoidable (none are, for either correction in
   this amendment), no reintroduction of the abandoned read model, no unbounded reload, unchanged
   25-print limit, unchanged one-working-request policy, unchanged production timer, debug toast stays
   removed.

### 19.6 Required behavior-level test correction

The prior Implement pass's regression tests for items 2/5/7 were source-wiring/static verification
plus genuine but separately-composed logic tests (`itemMutationGeneration.test.ts`,
`mergeServerWorkingItemsWithLocal.test.ts`) — real coverage of the mechanisms in isolation, but not
sufficient to have caught this amendment's actual defect, which lives in the *sequencing* between
`PrintRequestDetailView.tsx`'s handlers and the context's raw `reloadWorkingItems`. New or extended
tests for this amendment must model that same sequencing directly — construct the same state
transition the rendered page actually goes through (remove → resolve a stale/lagging server list
response → confirm the removed item stays removed in the resulting merged/rendered array; save a
quantity → resolve an older/stale server response → confirm the newer quantity survives) using either
a pure extracted reconciliation function representing this exact transition, or the actual
`mergeServerWorkingItemsWithLocal`/hook-level functions driven with realistic stale-then-fresh input
sequences — not a regex/string-presence check on source, and not a test that only proves a function
was *called*.

### 19.7 Amendment Formal Review disposition

A focused independent Formal Review of this amendment (Section 19 only)
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-review.md`):
**`approved_with_changes`**. The reviewer independently re-traced the full call sequence across all
five cited files and confirmed the root cause exactly as written (not merely plausible — reproducible
from source), confirmed the proposed remediation is narrowly scoped (grepped all ~30
`reloadWorkingItems` call sites app-wide; only the three in `PrintRequestDetailView.tsx` need
removing) and creates no regression risk to Section 8 item #2's existing fix or any other consumer,
independently re-verified the Studio tsconfig diagnosis (`npx tsc -v` gives 5.9.3; `git log`/`git diff`
confirm the setting predates this goal by two weeks and is untouched), and confirmed the
test-architecture requirement correctly diagnoses why the prior passing suite missed this defect (it
tested the pure reconciliation primitives in isolation, never the actual cross-file call sequence) and
that the required new-test approach would have caught it. Two non-blocking notes, both resolved
in-Plan: the "Request Again" capitalization inconsistency (corrected above to title-case "Again" in
both the visible label and `aria-label`), and a residual-risk check against `CurrentRequestDrawer.tsx`'s
own separate `reloadWorkingItems` calls (added as 19.2 item 4 above). No blocking findings. Per this
amendment's own required process (19.5), no additional owner checkpoint is required before Implement
proceeds under the owner's original explicit approval for this addendum.

---

## 20. Amendment 2 — Owner Runtime QA `FAIL` (Second Pass): Stale Detail-Route Read Cache, Discarded Server-Authoritative Quantity, and Studio Timer Permission Failure

Owner re-tested after Amendment 1's fix and found Amendment 1's fix genuinely resolved the
mutation-time race (cart/context state, Discover, Design Library, and Add to Show cancellation are now
correct) but the **Print Request detail route itself** still shows stale data after navigating away and
back, typed quantity entry is badly inconsistent (including values silently collapsing to `1`), and a
separate, previously-hidden Studio production-timer permission failure blocks a passing regression
criterion. This amendment documents three distinct, independently source-confirmed root causes and the
corrected remediation for each. As with Amendment 1, this documents the diagnosis and remediation plan
**before** any code changes — a focused Formal Review of this section must run first (Section 20.6).

### 20.1 Root cause 1 — a second, un-invalidated 30-second read cache serves stale detail-route data on remount

**Confirmed from source, not inferred.** `apps/portal/features/print-requests/services/portalPrintRequestService.ts`'s
`getPrintRequest` and `listPrintRequestItems` (the two calls `usePrintRequestDetail.reload()` makes on
every mount) both route through `loadPortalPrintRequestReadCached`
(`apps/portal/features/print-requests/services/portalPrintRequestReadCache.ts`) — a **module-level,
in-memory cache with a 30-second TTL** (`TTL_MS = 30_000`), keyed by `{uid}:request:{id}` /
`{uid}:items:{id}`, entirely separate from `PortalPrintRequestContext`'s `workingItems`.

`usePrintRequestDetail.ts`'s mount-time effect (currently ~lines 152-157):
```ts
useEffect(() => {
  wasViewingWorkingRef.current = false;
  lastSyncedWorkingSignatureRef.current = null;
  setItemClientKeyById(new Map());
  void reload();
}, [reload]);
```
runs **unconditionally on every mount** (i.e. every route entry, including navigating away and back to
the *same* working request — `usePrintRequestDetail` is a fresh hook instance each time the route
component mounts). `reload()` calls `listPrintRequestItems`/`getPrintRequest`, which hit this 30-second
cache. **Critically, neither of the two service methods the detail page's mutation handlers actually
call — `removePrintRequestItem` and `updatePrintRequestItemQuantity`
(`portalPrintRequestService.ts`, confirmed at their current definitions) — ever call
`clearPortalPrintRequestReadCache()`.** Only `addOrIncrementCatalogDesign` and `clearWorkingPrintRequest`
do. `clearWorkingPrintRequest`'s own invalidation call carries a code comment proving this exact class
of defect was already found and fixed once before, for a different mutation:

> "The clear mutated request + items server-side: the 30s read cache must not serve the pre-clear
> list/items back to any reload (owner live-test evidence: cleared items stayed visible until a browser
> refresh). Mirrors addOrIncrementCatalogDesign's invalidation."

That fix was never extended to `removePrintRequestItem` or `updatePrintRequestItemQuantity` — the exact
two mutations this entire goal is about. This is why cart/context (which never reads through this
cache) is correct while the detail route (which re-fetches through this cache on every mount) is not:
mutate on the detail page → Firestore write succeeds, local `items`/`workingItems` correctly patched →
**the 30-second cache entry for `listPrintRequestItems`/`getPrintRequest` is never invalidated** →
navigate away and back within that window → a fresh `usePrintRequestDetail` instance mounts → its
`reload()` hits the still-live stale cache entry → `setItems(...)` overwrites the correct state with the
pre-mutation snapshot → the item reappears (or the stale quantity returns) and stays that way for the
remainder of the 30-second window regardless of how many times the route is re-entered, exactly
matching the owner's observation ("no matter how many times... navigated away and returned").

This also explains why `usePrintRequestDetail`'s own `cartSignature`-driven sync effect (Amendment 1's
focus) does not protect against this: that effect only reconciles `items` from `workingItems` while
`isViewingWorkingRequest` — but `reload()`'s success handler (~line 110-114) unconditionally calls
`setItems(sortWorkingCurrentRequestItems(nextItems))` with **no check for `isViewingWorkingRequest`
and no coordination with the sync effect's own signature/timestamp** — whichever of the two effects'
async work resolves later simply overwrites whatever the other one set, with no arbitration.

### 20.2 Root cause 2 — typed quantity discards the server's authoritative clamped value, and a phantom fallback produces `1`

**Confirmed from source.** `updatePortalPrintRequestItemQuantity` (`functions/src/updatePortalPrintRequestItemQuantity.ts`)
is a Firestore-transaction-backed Cloud Function that independently re-derives the authoritative
`otherItemsPrintCount` from a fresh transactional read of every item on the request, clamps the
requested quantity via `clampItemQuantityToWorkingRequestMax` using that authoritative count, writes
the clamped (not necessarily the requested) value, and **returns the actual accepted `quantity` in its
response** (`UpdatePortalPrintRequestItemQuantityResponse.quantity`).

`portalPrintRequestService.updatePrintRequestItemQuantity` (the client wrapper) calls this function but
declares its own return type `Promise<void>` and **discards the response entirely** — the server's
authoritative clamped quantity is never read by the caller. `usePrintRequestDetail.updateItem` computes
its own **client-side** clamp (via the same `clampItemQuantityToWorkingRequestMax` function, but fed
`otherItemsPrintCount` computed from the client's own, possibly-stale `items` array — itself vulnerable
to Root Cause 1's stale-cache read) and optimistically commits that client-computed value as if it were
final, with no reconciliation against what the server actually accepted. When the client's locally
computed `otherItemsPrintCount` differs even slightly from the server's authoritative transactional
read (plausible any time `items` is even briefly stale — including from Root Cause 1), the client can
display a quantity the server silently capped differently, with no correction and no honest failure
signal — this is the exact "proposed `7`... left the value displayed as `7` instead of rejecting it and
restoring the prior valid value" defect.

**The specific collapse to `1` is a separate, compounding bug**, also in `usePrintRequestDetail.updateItem`
(currently ~lines 280-282):
```ts
const currentItem = items.find((item) => item.id === itemId);
const currentQuantity =
  currentItem && Number.isFinite(currentItem.quantity) ? currentItem.quantity : 1;
```
If `items` has already been overwritten by Root Cause 1's stale-cache reload at the moment of this
computation (e.g. mid-edit, or immediately after a route remount served stale data), `items.find(...)`
can fail to locate the item under the id being edited — or locate a version of it with different data —
and `currentQuantity` silently falls back to the literal `1`. `clampItemQuantityToWorkingRequestMax`'s
own logic (`packages/shared/src/utils/printRequestWorkingRequestMax.ts`, confirmed read) never itself
returns `1` on an over-cap rejection (it correctly returns `current` in that branch) — so a `1` appearing
anywhere in this flow is proof this `currentItem` lookup fallback fired, which is only reachable via a
mismatch between `items` and the item actually being edited — i.e., it is a *symptom* of Root Cause 1,
not an independent defect, though the fallback-to-`1` behavior is still worth hardening directly since
silently guessing `1` (a real, submittable quantity) rather than surfacing an explicit error is unsafe
regardless of what upstream state caused the lookup to miss.

### 20.3 Root cause 3 — Studio production-timer permission failure

**Not yet fully diagnosed from source alone — requires either a live comparison against deployed
`fresh-prints-dev` Rules (which this session cannot perform without Firebase CLI project access) or
reproduction with Firebase Debug / Studio's own error surface capturing the exact `HttpsError`/Rules
denial code.** What is confirmed from source:

- `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts`'s
  `startShowPrinting` performs a **direct client-side Firestore `writeBatch`** (not a callable) against
  `upcomingShows/{id}` (fields: `productionStatus`, `activePrintStartedAt`, `printStartedAt`,
  `printPausedAt` via `deleteField()`, `updatedBy`, `updatedAt`) and every startable
  `showAllocations/{id}` (fields: `status`, `updatedBy`, `updatedAt`), gated client-side by
  `permissionService.canManageUpcomingShows(caller)`.
- `firestore.rules`'s `upcomingShowRequiredFieldsValid`/`showAllocationRequiredFieldsValid` allowlists
  (confirmed read, current line numbers ~634-664 and ~710-741) **do include** every field this write
  touches — the currently-checked-in Rules text does not obviously reject this exact write.
- However, `allow update` for both collections uses `data.keys().hasOnly([...])` evaluated against
  `request.resource.data` — the **entire resulting document**, not just the changed fields. If any
  **existing** live document in `fresh-prints-dev` carries a field not present in this allowlist (a
  legacy field from before some earlier Rules revision, for example), any update to that specific
  document — including this timer-start batch write — would be rejected with exactly
  "Missing or insufficient permissions," even though the write itself only sends allowed fields. This
  is a plausible, source-consistent explanation but is **not yet confirmed** against the actual failing
  document.
- The other realistic explanation this session cannot rule out from source: **deployed
  `fresh-prints-dev` Rules differ from the checked-in `firestore.rules`** (e.g. an older, narrower
  allowlist still live in the project) — this repo's own history includes multiple prior sessions where
  local Rules edits were made but not yet deployed, so a Rules/deployment drift is a known recurring
  condition in this project, not a hypothetical.

**Required Implement-time diagnostic step (per the owner's explicit instructions, Section 6.5):**
reproduce with an authorized Studio owner against `fresh-prints-dev`, capture the exact `HttpsError`/
Rules denial detail (resolved role, exact document path, exact operation, exact rejected field set if
determinable), and determine which of the above (or another cause) is actually responsible **before**
proposing a fix — do not guess a Rules change without first confirming the actual rejected write.

### 20.4 Corrected remediation

**Fix 1 (Root Cause 1 — stale detail-route cache):**
1. `removePrintRequestItem` and `updatePrintRequestItemQuantity` in `portalPrintRequestService.ts` must
   call `clearPortalPrintRequestReadCache()` after a successful mutation, mirroring
   `addOrIncrementCatalogDesign`'s and `clearWorkingPrintRequest`'s existing, already-proven pattern —
   this is the narrowest fix directly addressing the confirmed gap.
2. Independent of cache invalidation, `usePrintRequestDetail`'s mount-time `reload()` must not be
   allowed to unconditionally overwrite `items` while `isViewingWorkingRequest` is true — per this
   Plan's own architecture principle (Section 19's shared-ownership direction, restated and now made
   binding): **while viewing the current working request, `workingItems` (the context's single owner of
   working-request item state) must be the detail route's source of truth for items; `reload()`'s
   detail-only fetch must be reserved for print-request metadata (`printRequest` itself,
   `designSummaries`/`uploadSummaries`) and for historical/non-working requests only.** Implement must
   restructure `usePrintRequestDetail` so that, while `isViewingWorkingRequest`, item state renders from
   `workingItems` (already synced via the existing `cartSignature` effect) and `reload()`'s own
   `setItems(...)` call is either skipped entirely for the item array in that case, or gated by the same
   generation/timestamp arbitration so it can never win against a synchronously-applied `workingItems`
   sync. This directly satisfies the owner's "preferred design principle" (Section 20 architecture
   requirements) rather than only patching the cache layer — the cache fix alone narrows the stale
   window to under 30 seconds; removing detail's independent item-fetch authority for the working
   request removes the race entirely.
3. This must not become a broad reload — it is the opposite: removing an unnecessary independent fetch
   path for the one case (viewing the current working request) where an authoritative source already
   exists in memory.

**Fix 2 (Root Cause 2 — quantity cap desync and phantom `1`):**
1. `portalPrintRequestService.updatePrintRequestItemQuantity`'s return type must change from
   `Promise<void>` to return the callable's actual response (at minimum the authoritative `quantity`),
   and `usePrintRequestDetail.updateItem` must commit **that returned, server-authoritative quantity**
   to local/shared state on success — not the client's optimistically-computed value. This makes the
   UI's final displayed value always match what the server actually persisted, closing the "displayed
   `7`, server actually capped it" gap regardless of any transient client/server `otherItemsPrintCount`
   mismatch.
2. The `currentItem` lookup fallback-to-`1` in `updateItem` must be hardened: if the item cannot be
   located in current state at the moment of a quantity edit, this is an inconsistent-state condition,
   not a legitimate "assume quantity 1" case — Implement must surface this as an explicit, user-safe
   failure (consistent with this goal's existing "honest failure state" requirement) rather than
   silently guessing a real, submittable quantity value.
3. Fix 1 (making `workingItems` authoritative for the working request's item state) independently
   removes the specific stale-`items`-array condition that was the only way the `currentItem` lookup
   could miss in the first place — Implement must verify at implementation time whether Fix 1 alone
   already eliminates the practical trigger for the `1`-fallback, while still hardening the fallback
   itself per point 2 as defense in depth (the owner's brief explicitly forbids treating an autosave
   indicator as proof of a successful end-to-end save, so an explicit guard is required regardless of
   whether Fix 1 also happens to prevent the trigger).
4. **(Added per this amendment's Formal Review, blocking finding — resolved here.)**
   `usePrintRequestDetail.ts` defines a **second, independent** function, `updateItemQuantity`
   (currently ~lines 503-543), with the identical shape of defect as `updateItem`: its own
   `items.find(...)` with an identical `: 1` fallback, its own client-side clamp, and it also calls
   `portalPrintRequestService.updatePrintRequestItemQuantity` and discards the response, committing its
   own locally-clamped value instead. Confirmed via grep (both by this Plan's authoring pass and
   independently by the Formal Review) that no component currently calls `updateItemQuantity` — it is
   dead code, returned from the hook's public surface but unwired. It is **not** the live cause of the
   owner's reported defect, but it must not be left as an undocumented, still-buggy duplicate after this
   remediation. Implement must do exactly one of: (a) apply the identical response-reconciliation and
   fallback-hardening fix from points 1-2 above to `updateItemQuantity` as well, or (b) remove it
   entirely as confirmed-dead code (preferred — an unused duplicate of `updateItem` carrying a
   known-bad pattern is itself a maintenance hazard this goal should not reintroduce by omission).
   Whichever option is taken, the Implementation Review must explicitly record which, and confirm no
   caller was missed by the dead-code grep before removal.

**Fix 3 (Root Cause 3 — Studio timer):** per Section 20.3, diagnose first, then propose the minimum
correction. If the actual cause is Rules-allowlist drift on a specific existing live document, the fix
may be a data correction on `fresh-prints-dev` — still a live-data change requiring a **separate,
explicit owner checkpoint** before any change is applied, per the owner's explicit constraint (not
production, but the same care/approval standard applies). If the actual cause is a genuine Rules gap,
prepare the exact Rules change, add Rules-emulator tests proving both the fix and that no other
role/collection is broadened, and **stop at a separate, explicit owner deployment checkpoint** before
deploying — do not deploy Rules automatically, per the owner's explicit instruction.

### 20.5 Required behavior-level tests

Per the owner's exact required test scenarios (restated here as the authoritative spec for Implement):
1. **Removal/remount reconciliation test** — shared `workingItems` = [A, B, C]; detail initially renders
   [A, B, C]; remove A successfully; shared `workingItems` becomes [B, C]; detail render becomes [B, C];
   simulate a stale detail-cache response still containing [A, B, C] resolving after removal (models
   Root Cause 1 directly — a `reload()`-shaped fetch resolving late); assert rendered detail items
   remain [B, C], A cannot reappear, and cart/detail item IDs remain identical throughout. This must
   exercise the same reconciliation logic the real route uses, not a hand-rolled substitute.
2. **Exact typed-cap test** — items begin at `15`/`5`/`5` (total 25); type `7` into one `5` field, commit
   through the real input-commit lifecycle (the actual `saveDraft`/`onUpdate` path, not a bypassed
   direct state set); assert the request total cannot exceed 25, the edited field returns to `5`, no
   save is issued with `7`, and no state becomes `1`; assert navigation/remount still shows `15`/`5`/`5`.
3. **Valid reduction test** — same starting values; type `1` into all three via the real lifecycle;
   assert shared state and detail-render state both become `1`/`1`/`1`; assert this persists across
   simulated navigation/remount.
4. **Stale completion test** — begin an older quantity save; begin and complete a newer valid quantity
   save; complete the older save afterward; assert the older completion cannot overwrite the newer
   value; assert autosave status reflects the latest operation truthfully.
5. **Cart/detail parity tests** — after each of remove / valid typed save / rejected over-cap edit /
   navigation-remount, assert cart item IDs/quantities equal detail item IDs/quantities.

Per the owner's explicit testing-architecture requirement (in preference order): use an existing React
hook/component test harness if one exists in this repo (`[NEEDS REPO CHECK]` at Implement time — this
repo's established convention has so far avoided DOM-rendering tests in favor of extracted pure
functions); failing that, extract a pure working-request-detail reconciliation controller/reducer that
production code actually uses, and test that directly. A regex/source-presence test may supplement but
may never be the sole evidence for these specific defects, per the owner's explicit instruction (this
mirrors, and tightens, Amendment 1's Section 19.6 requirement, which two prior "APPROVED" Implementation
Reviews still were not sufficient to catch this second, deeper defect).

### 20.6 Required process for this amendment

Same process as Amendment 1 (Section 19.5): this section requires its own focused independent Formal
Review before any code changes. If approved (with or without changes) and no new unresolved owner
decision is created, Implement proceeds under the owner's original explicit approval for this
reopened goal — no additional checkpoint beyond that review, **except** for Root Cause 3's Fix 3 if it
turns out to require an actual Rules or data change in `fresh-prints-dev`, which per the owner's
explicit instruction requires its own separate deployment checkpoint regardless of this review's
outcome. Every constraint from the original Plan and Amendment 1 continues to apply unchanged.

### 20.7 New queued goal: `preproduction-static-analysis-cleanup`

Per the owner's explicit instruction, a new managed goal is recorded (not started, no Plan authored) to
run **after** this stabilization goal and `studio-test-data-print-limit-wipe-audit` both close:
`preproduction-static-analysis-cleanup` — make `npm run build:studio` exit 0, resolve the 29 remaining
pre-existing Studio/shared TypeScript errors (exposed, not introduced, by this goal's tsconfig fix) and
bring repository lint to an approved pre-production state, without disabling strictness or hiding
errors, with independent review before `production-release`.

### 20.8 Amendment 2 Formal Review disposition

A focused independent Formal Review of this amendment (Section 20 only)
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-2-review.md`):
**`approved_with_changes`**. The reviewer independently re-derived all three root causes from source
(not deferring to either of the two prior "APPROVED" Implementation Reviews on this goal, both of which
the owner's runtime QA proved incomplete) and confirmed each exactly as written, including
independently re-deriving the full `firestore.rules` field allowlists against `startShowPrinting`'s
actual batch write for Root Cause 3 and finding no discrepancy — confirming the "diagnose first, do not
guess a Rules fix" framing is the correct, and most conclusive, answer obtainable from source alone.

**One blocking finding, resolved directly in Section 20.4 above (Fix 2, point 4):** the amendment's
original text analyzed only `updateItem` and never mentioned that `usePrintRequestDetail.ts` defines a
second, parallel function, `updateItemQuantity`, with the identical discarded-response and phantom-`1`
defect pattern. Confirmed currently dead code (unreferenced by any caller) by both this Plan's
authoring pass and the reviewer independently, so not the live cause of the owner's reported defect —
but required to be explicitly fixed identically or removed as dead code in the same Implement pass, not
left as an undocumented, still-buggy duplicate. Now added to Fix 2 as point 4.

**Non-blocking notes, both acknowledged for Implement to explicitly re-verify (not assumed automatically
safe):** Fix 1's restructuring must be checked against the existing working-request-exit transition
logic (`wasViewingWorkingRef`, `reconcileQueued`, the transition-away silent reload) to confirm no new
window opens where neither `workingItems` nor `reload()`'s fetch is authoritative; and the required test
scenarios should include an explicit case covering whichever of `updateItem`/`updateItemQuantity`
remains after the blocking finding is resolved. Confirmed no regression risk to Amendment 1's
already-approved fix (the removed redundant reloads and `itemPropSyncGuard.ts` are structurally
untouched by Fix 1/Fix 2's mechanisms).

**No further Plan revision required beyond the Fix 2 point 4 addition above.** Per this amendment's own
required process (20.6), no additional owner checkpoint is required before Implement proceeds under
the owner's original explicit approval for this reopened goal — except Root Cause 3's Fix 3, which
remains gated behind its own separate deployment checkpoint if a live Rules or data change proves
necessary.

---

## 21. Amendment 3 — Owner Runtime QA `FAIL` (Third Pass): Detail-Card Local Draft Reconciliation, Studio Timer Denial (Confirmed Real, Still Unresolved), and Show Queue Live Allocation Updates

Owner re-tested after Amendment 2's fix. **Two previously-failing behaviors now genuinely pass**
(removed-item route reconciliation; valid typed reduction to `1`/`1`/`1` persisting across remount) —
confirming Amendment 2's `workingItems`-authority and server-quantity-reconciliation fixes are real and
working at the hook/service layer. Three defects remain: the item-card's own local input draft does not
reconcile to the server-accepted quantity on an over-cap rejection (the shared/server state is correct,
only the visible field is wrong); the Studio timer's `permission-denied` is now confirmed with an actual
error code (not just `.message`), but remains genuinely unresolved; and a new, previously-untested
defect — Studio Show Queue does not reflect a cross-client allocation created by a Portal customer while
already mounted.

### 21.1 Root cause — the item card's own local draft never learns the server-accepted quantity

**Confirmed from source, precisely.** `PortalPrintRequestItemCard.tsx`'s `onUpdate` prop is typed
`Promise<void>` (interface, ~line 71-74) and `saveDraft`'s success path (~lines 364-375) never reads
any return value from `await onUpdate(...)`. On success it unconditionally does:
```ts
lastSavedSignatureRef.current = draftSignature;   // draftSignature = the REQUESTED (7) signature
lastAcceptedUpdatedAtMsRef.current = Date.now();
onAutosaveStateChange('saved');
```
`draftSignature` is built from `parsedQuantity` — the **locally typed, requested** value (`7`), not
anything returned by the server. The card's own `quantityInput` state is never touched by this success
path either, so it stays `'7'` in local state. This closes the loop entirely from Amendment 2's fix:
`usePrintRequestDetail.updateItem` genuinely does receive and commit the server's accepted `5` to
`items`/`workingItems` (verified in Amendment 2/Implementation Review 3) — but that correction reaches
this specific mounted card only as a new `item` prop, and the card's own prop-sync effect
(`shouldAcceptIncomingItemProp`, ~lines 233-266) is the only path by which an incoming prop can update
`quantityInput`. That guard requires `incomingUpdatedAtMs >= lastAcceptedUpdatedAtMsRef.current`
(`itemPropSyncGuard.ts`) — and `lastAcceptedUpdatedAtMsRef.current` was just stamped to `Date.now()` by
the card's own (incorrect) "saved 7" bookkeeping above. `usePrintRequestDetail`'s server-quantity patch
(`applyServerQuantityPatch`, confirmed at its current definition) only patches `quantity`, never
`updatedAt` — so the corrected `item` prop the card receives still carries the **original, pre-edit**
`updatedAt` timestamp, which is necessarily older than the `Date.now()` the card just stamped. The
guard therefore **rejects the correction as stale**, and the card is left permanently displaying `7`
until something resets its local refs from scratch — exactly matching the owner's observation that only
navigating away and back (a full remount, which reconstructs `lastSavedSignatureRef`/
`lastAcceptedUpdatedAtMsRef` fresh from the now-correct `item` prop) clears it. This also explains the
"minus works down to 5, but plus won't go back to 7" observation: `stepQuantity` (~lines 409-419)
schedules a save from whatever `quantityInput` currently holds, and once the user manually types/steps
it back down to a value matching the true clamp, a save succeeds and `lastSavedSignatureRef` finally
aligns with reality — the bug is specifically in the **one-way** trust of the optimistic/requested value
after a *rejected* commit, not in the clamp math or save mechanics themselves, both of which are correct.

**Owner's explicit requirement — do not maintain four separate cap algorithms.** Investigation confirms
Discover and Design Library's add-quantity flow (`useAddDesignToRequestFlow.ts`, `desiredPrimaryQtyRef`/
`qtyGenerationRef` coalescing, `[NEEDS REPO CHECK — confirm exact mechanism at Implement time]`) already
reconciles correctly because it flushes through `patchWorkingItems`/`reloadWorkingItems` without an
intermediate per-component "last saved" signature guard of the item card's shape — the request-detail
card is the **only** surface with its own local draft-vs-accepted reconciliation layer, which is exactly
where this defect lives. The underlying clamp function
(`clampItemQuantityToWorkingRequestMax`) is already shared and already correct; this is not a clamp-math
divergence, it is a **local UI state reconciliation** divergence unique to the item card component.

### 21.2 Root cause — Studio timer `permission-denied`, confirmed real, still unresolved

The new diagnostic (Amendment 2) captured a genuine Firestore `permission-denied` code from
`upcomingShowService.startShowPrinting`'s `writeBatch.commit()` (confirmed call site:
`useShowProductionTimer.ts`'s `startPrinting` → `upcomingShowService.startShowPrinting`). This
amendment re-derived, a **third** time, the full `firestore.rules` field allowlists
(`upcomingShowRequiredFieldsValid`, `showAllocationRequiredFieldsValid`,
`showAllocationSourceIdentityUnchanged`) against the exact batch write and found — again — no
discrepancy: every field the write sends is allowed, `productionStatus: "printing"` is a valid enum
value, and the allocation update's source-identity-unchanged constraint is satisfied by a partial
`batch.update()` (which Firestore merges against the existing document before Rules evaluate
`request.resource.data`, so `designId`/`customerUploadId` remain present and unchanged automatically).
**No new source-only explanation was found beyond what Amendment 2 already identified.** The two
remaining, live-only explanations stand: (a) deployed `fresh-prints-dev` Rules differ from the
checked-in `firestore.rules`, or (b) a specific existing live document carries a field outside the
current allowlist (only relevant given Rules' `hasOnly()` is evaluated against the full resulting
document, not a diff). **This cannot be resolved further without either a live Rules comparison
(`firebase deploy --only firestore:rules --dry-run` against `fresh-prints-dev`, or Console inspection)
or the owner's own authenticated session** — neither of which this session can perform. Per the owner's
explicit instruction not to "add more generic logging and stop again": the required next diagnostic step
is a **live Rules comparison**, not more client-side logging, since the client-side error code is now
already as specific as this environment can make it without live access.

### 21.3 Root cause — Show Queue has no cross-client live-update mechanism for allocations

**Confirmed from source.** `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowAllocations.ts`
is a pure one-shot fetch: `loadAllocations` calls `upcomingShowService.listShowAllocations` (a plain
`getDocs` query, confirmed at its definition) exactly once per mount / `upcomingShowId` change, with a
request-id guard against out-of-order responses but **no live subscription of any kind** — no
`onSnapshot`, no polling, no listener. This is why a Portal-submitted allocation for an already-open
Show Queue session is invisible until the page remounts (navigate away and back). This is a genuinely
new defect, not a continuation of Amendments 1/2 — those addressed same-client, same-session
reconciliation; this is a cross-client, cross-session gap that was never covered by any prior owner QA
scenario until this pass.

**A bounded, already-proven pattern already exists in this repo and must be reused, not invented.**
`apps/studio/src/renderer/src/features/firebase/utils/createSharedFirestoreSubscription.ts` provides a
ref-counted, deduplicated, traced (`traceFirestoreListenerAttach`/`traceWrappedUnsubscribe`), auto-
cleaned-up shared-subscription wrapper. **Correction from this amendment's Formal Review:** the actual
existing consumers of this utility are `assistedCreationRequestsService.ts` and
`assistedCreationUpdateAckService.ts` — not `staffInboxSubscriptionService.ts`, which independently
hand-rolls its own `onSnapshot` composition without this shared wrapper. Implement should use the
`assistedCreation*` files as the coding template for how `createSharedFirestoreSubscription` is
actually wired up in this codebase today. Separately (and still true, independent of which file is the
template), `staffInboxSubscriptionService.ts` does demonstrate a real, already-shipped bounded
`onSnapshot` query against `showAllocations` (`where("requestOriginSnapshot", "==", "portal_customer")`,
`orderBy`, `limit`) — proof this exact collection already supports a live listener pattern in this
codebase today, just not scoped to Show Queue's per-show view. The owner's stated preference #2
("subscribe only to allocations for the currently visible show IDs") is both the narrowest bound
available and the one that matches `useShowAllocations`' existing per-`upcomingShowId` scoping — the
fix should replace (or wrap) `useShowAllocations`'s one-shot `getDocs` with a bounded
`onSnapshot(query(showAllocationsCollection, where("upcomingShowId", "==", upcomingShowId)), ...)`,
routed through `createSharedFirestoreSubscription` (per the `assistedCreation*` template) so multiple
mounted consumers of the same show's allocations (if any) share one underlying listener, with the
emitted snapshot mapped through the same `mapShowAllocation`-shaped logic `listShowAllocations` already
uses (do not duplicate mapping logic —
extract/reuse it, `[NEEDS REPO CHECK]` for the exact current mapping function name at Implement time).

### 21.4 Corrected remediation

**Fix 1 (item-card local draft reconciliation):**
1. **(Scoped precisely per this amendment's Formal Review — the full chain, not just the card's prop.)**
   The server-authoritative accepted quantity must be threaded through every layer between the
   callable and the card, none of which currently return it past the hook: `usePrintRequestDetail.updateItem`
   itself is effectively `Promise<void>` to its caller today (it resolves the accepted quantity
   internally via `resolveServerAuthoritativeQuantity` but does not return it);
   `PrintRequestDetailView.handleUpdateItem` (currently `void`-returning) calls `updateItem` and must
   also return/pass through the value; and `PortalPrintRequestItemCard.tsx`'s `onUpdate` prop contract
   must change from `Promise<void>` to return the accepted quantity, which `saveDraft` then consumes.
   Implement must verify each of these three layers explicitly returns the value end-to-end — a partial
   plumb (e.g. only fixing the card's prop type without also fixing `updateItem`/`handleUpdateItem`'s
   own return types) would compile but silently carry `undefined`, reintroducing this exact defect.
2. `saveDraft`'s success path must use the **returned accepted value**, not the locally typed
   `parsedQuantity`, to: (a) update `quantityInput` to the accepted value if it differs from what was
   typed, (b) set `lastSavedSignatureRef.current` to a signature built from the **accepted** value, and
   (c) set `lastAcceptedUpdatedAtMsRef.current` in a way that does not retroactively block the very
   correction that produced it — since the accepted value is now applied directly and synchronously by
   the component that requested the save, this closes the loop without depending on the async prop-sync
   effect to carry the correction at all for this component's own in-flight edit. The prop-sync
   guard/effect remains exactly as-is for genuinely external changes (e.g. another tab, the drawer).
3. This must not introduce a second write path — `onUpdate` still calls the same
   `usePrintRequestDetail.updateItem` → `portalPrintRequestService.updatePrintRequestItem` →
   `updatePrintRequestItemQuantity` chain Amendment 2 already fixed; this amendment only changes what
   the **return value** of that chain is used for at the component boundary.
4. Verify plus/minus stepper parity explicitly: `stepQuantity` already routes through the same
   `scheduleSave`/`saveDraft` path as typed input, so fixing `saveDraft`'s success handling fixes both
   input methods simultaneously — Implement must add a test proving this parity explicitly (owner's
   Test B), not assume it.
5. Do not touch the underlying clamp function, the callable, or the transaction — root cause is
   entirely in this component's local-state handling of an already-correct server response.

**Fix 2 (Studio timer):** per 21.2, this session cannot resolve this further without live access.
Implement must: (a) prepare the exact live-Rules-comparison step (document it precisely — the command,
what to look for) as a request to the owner, since neither a Rules change nor a client-code change can
be safely proposed without first knowing which of the two remaining explanations is correct; (b) do NOT
guess a Rules change or deploy anything; (c) if, contrary to this amendment's own re-verification, a
genuine and provable Rules gap is found during Implement (not merely re-asserted), follow the original
Plan's Path A/B/C/D structure (Section 20's originating brief) exactly, stopping at
`APPROVE DEV RULES DEPLOY` before any deployment.

**Fix 3 (Show Queue live allocation updates):**
1. Add a bounded, per-show `onSnapshot` subscription to `showAllocations` (query scoped by
   `where("upcomingShowId", "==", upcomingShowId)`), wired through the existing
   `createSharedFirestoreSubscription` utility, replacing or supplementing `useShowAllocations`'s
   current one-shot fetch.
2. On each snapshot emission, patch local state directly from the snapshot (insert new, update
   changed, remove deleted allocation documents by id) rather than a full corpus reload — preserve
   selected show and scroll position.
3. Ensure the listener is scoped to the currently visible/selected show only (not all upcoming shows,
   not an unbounded `showAllocations` collection listener) — bounded per this Plan's Section 7/
   Wave C constraints.
4. Ensure proper cleanup on unmount/show-change via `createSharedFirestoreSubscription`'s existing
   ref-counted unsubscribe.
5. Ensure the listener is observable in Firebase Debug tracing (`traceFirestoreListenerAttach`,
   already built into `createSharedFirestoreSubscription` — no new tracing code needed if the existing
   utility is used as intended).
6. Do not add a new polling loop, and do not widen this to `upcomingShows` or `printRequests` — the
   owner's reported symptom is specifically about allocations not refreshing.

### 21.5 Required behavior-level tests

Per the owner's exact Test A–E (Section "Required quantity tests" in the owner's brief) for Fix 1, and
new tests for Fix 3's subscription behavior (per the owner's "Required Show Queue tests" list) —
authoritative specs, restated here for Implement's reference: Test A (exact typed 15/5/5→7 sequence,
assert visible input becomes 5, shared state 5, total 25, no item becomes 1, save state not falsely
"saved" for 7, no navigation required); Test B (plus-control parity at the same cap boundary); Test C
(Discover/Library/detail parity for the same proposed quantity — this may require a shared pure
comparison test rather than asserting three separate UI paths produce byte-identical code, since
Discover/Library's own quantity flow is architecturally different from the item card's — verify at
Implement time what "parity" can concretely mean and test that, not an artificial unification); Test D
(valid reductions still pass — already passing per this amendment's own owner QA, do not regress); Test
E (a stale earlier save response cannot overwrite a later valid result — extends the existing generation-
guard tests). For Fix 3: mounted Show Queue with existing allocations, a new allocation event for the
visible show appears immediately without navigation, request/print totals and capacity update, a
duplicate event does not duplicate the allocation, an event for a non-visible show does not trigger a
corpus reload, listener cleanup occurs on unmount, the subscription is bounded (scoped query, not a
collection-wide listener). Use `npx tsx --test` per this repo's established convention; extend existing
test files where a natural home exists (`itemPropSyncGuard.test.ts`/`resolveQuantityCommitOutcome.test.ts`
for Fix 1; a new focused test file for Fix 3's reconciliation logic, following
`createSharedFirestoreSubscription`'s own existing test conventions if any exist,
`[NEEDS REPO CHECK]`). A source-string/regex test may supplement but is never sole evidence.

### 21.6 Required process for this amendment

Same as Amendments 1 and 2: this section requires its own focused independent Formal Review before any
code changes, with the reviewer explicitly instructed not to defer to any of the three prior
Implementation Reviews on this goal. If approved (with or without changes) and no new unresolved owner
decision is created, Implement proceeds under the owner's original explicit approval for this reopened
goal for Fix 1 and Fix 3 — Fix 2 (Studio timer) remains gated behind a live-diagnosis step that must be
returned to the owner as a specific request, not resolved by this Implement pass, per 21.2/21.4.

### 21.7 Amendment 3 Formal Review disposition

A focused independent Formal Review of this amendment (Section 21 only)
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-3-review.md`):
**`approved_with_changes`**. The reviewer independently traced Root Cause 1's exact timestamp-comparison
sequence by hand and confirmed it precisely as written. The reviewer independently re-derived the
`firestore.rules` allowlists against `startShowPrinting`'s batch write a **fourth** time (across this
goal's full history) with fresh eyes and found nothing new beyond what Amendments 1-2 already
established — confirming "diagnose via live comparison, do not guess a Rules fix" remains the correct,
now four-times-independently-verified answer. The reviewer confirmed **no new Firestore index is
required** for Fix 3's proposed `where("upcomingShowId", "==", ...)` query (single-field equality,
auto-indexed, identical shape to the existing one-shot `listShowAllocations` query already in
production).

**One blocking finding, resolved directly in Fix 1 above:** the amendment's original text described the
remediation only in terms of `PortalPrintRequestItemCard.tsx`'s `onUpdate` prop, without explicitly
scoping that `usePrintRequestDetail.updateItem` and `PrintRequestDetailView.handleUpdateItem` also
currently discard/never expose this value to their own callers — a partial plumb would compile but
silently carry `undefined`. Fix 1 point 1 now explicitly requires all three layers.

**One non-blocking correction, resolved directly in Fix 3 above:** the amendment incorrectly cited
`staffInboxSubscriptionService.ts` as an existing consumer of `createSharedFirestoreSubscription` — it
independently hand-rolls its own `onSnapshot` composition. The actual existing consumers
(`assistedCreationRequestsService.ts`, `assistedCreationUpdateAckService.ts`) are now cited as the
coding template instead; `staffInboxSubscriptionService.ts` remains valid as separate proof that a
bounded `onSnapshot` against `showAllocations` is an established, working pattern in this codebase.

No regression risk found to Amendments 1/2's fixes (removed-item reconciliation, valid-reduction
persistence, `itemPropSyncGuard.ts`) or to any scope boundary (DPI, 25-print-limit arithmetic,
one-working-request policy, unbounded reads). Per this amendment's own required process (21.6), no
additional owner checkpoint is required before Implement proceeds on Fix 1 and Fix 3 — Fix 2 remains
gated behind its own live-diagnosis handoff to the owner.

## 22. Amendment 4 — Owner Runtime QA `FAIL` (Third Pass — corrected count): Amendment 3's Fixes Confirmed Real At the Unit Level But Incomplete At Runtime; Genuinely New Show Queue Root Cause Identified; Studio Timer Still Not Fixed

**Documentation correction, made at the owner's explicit instruction:** this section previously
mislabeled the owner's QA pass below as a "fourth" runtime FAIL. The recorded workflow history
(`.cursor/workflow/state.md`) shows only three owner FAIL checkpoints on this goal to date — this
section documents the third, not a fourth. This is a wording correction only; the root-cause
investigation, remediation, and review below are unaffected by it.

**Also stated explicitly per the owner's instruction: the Studio production timer is NOT remediated by
this amendment.** Section 22.3 below performs another static Rules re-comparison and finds no new
discrepancy — it makes no Rules, authentication, service, or payload change, and this amendment must
not be read as fixing the timer. This goal must not be signed off while the timer still returns
`permission-denied`, regardless of the outcome of the other two fixes below.

Owner ran a third manual QA pass against Amendment 3's Implementation-Review-4-`APPROVED` fixes.
**Two previously-failing behaviors remain genuinely fixed** (removed-item route reconciliation; valid
typed reduction to `1`/`1`/`1`) — Amendment 2's fixes continue to hold. **All three of Amendment 3's
targeted defects still fail at runtime**: the item-card typed over-cap display still gets stuck
(same exact repro: `15`/`5`/`5`, type `7` over a `5`, field stays on `7`, banner does not visibly
move, only a remount corrects it); the Studio timer still returns `permission-denied`; and the Show
Queue still does not reflect a cross-client Portal allocation while already open.

This confirms Implementation Review 4's own stated residual-risk caveat (Section 10 of that review):
review-level source tracing proved the *mechanism* was sound in isolation, but explicitly flagged that
"real Firestore/network timing jitter" and "real cross-client Firestore listener behavior" were outside
what static/unit-level review could verify — and that gap is exactly what this owner pass exposed.

### 22.1 Root cause — item-card typed over-cap: Amendment 3's single-save fix is real but does not cover overlapping/re-entrant edits, plus a contributing clamp-bypass defect

Confirmed by direct trace of `usePrintRequestDetail.ts`, `PortalPrintRequestItemCard.tsx`,
`itemPropSyncGuard.ts`, and `useWorkingCurrentRequestItems.ts` together, not any one file in isolation
(the exact gap: every prior review examined `saveDraft`'s own success path, but not the *other* live
path that also mutates the same card's `item` prop concurrently).

`usePrintRequestDetail.updateItem` (`usePrintRequestDetail.ts:352-392`) does the following, in order,
for **every** quantity edit while viewing the working request:

1. Computes `optimisticQuantity` via the shared clamp (`printRequestWorkingRequestMax.ts`), using
   `otherItemsPrintCount` derived from the hook's own `items` closure at call time.
2. **Synchronously, before the network `await`**: calls `setItems(applyLocalItemPatch)` (this hook's
   own local state) **and** `patchWorkingItems(applyLocalItemPatch)` (`useWorkingCurrentRequestItems.ts:272-277`
   — the shared context array). Neither patch function ever sets `updatedAt`; only `quantity` changes.
3. Awaits the callable, then — **only if `serverQuantity !== optimisticQuantity`** — calls
   `setItems`/`patchWorkingItems` a second time with the server-corrected quantity. If the client's
   optimistic clamp already computed the same value the server independently derives (the common case,
   since both use the same clamp function and the same up-to-date `otherItemsPrintCount` in this
   session), **this second patch never fires at all**, and `updatedAt` is never touched by this whole
   operation on either the hook's `items` or the shared `workingItems`.

Separately, `usePrintRequestDetail.ts:213-265` (the cart-sync effect) fires on **every** `workingItems`
change while viewing the working request — including the synchronous optimistic `patchWorkingItems`
call from step 2, well before the network call in step 3 resolves — and unconditionally does
`setItems(sortWorkingCurrentRequestItems(workingItems))`, producing a **new** `item` object reference
for every item on every one of these patches, which flows as a new `item` prop into
`PortalPrintRequestItemCard` (`PrintRequestDetailView.tsx:477-528`, mapped straight from the hook's own
`items`, confirmed by direct read — not from `workingItems` directly).

This second, independent channel (context patch → cart-sync effect → new `items` array → new `item`
prop) reaches the card's own prop-sync effect (`PortalPrintRequestItemCard.tsx:239-272`) on a
**different schedule** than `saveDraft`'s own direct, synchronous reconciliation
(`resolveSavedDraftReconciliation`, applied inside `saveDraft`'s `await onUpdate(...)` continuation).
Critically: at the moment this second channel's prop update reaches the guard,
`lastAcceptedUpdatedAtMsRef.current` still holds whatever it was **before this edit's save resolved**
(unchanged, since only `saveDraft`'s own success path bumps it, and only after the network round trip),
and the incoming prop's `updatedAt` is **also unchanged** (patch functions never touch it) — so
`incomingUpdatedAtMs >= lastAcceptedUpdatedAtMs` in `shouldAcceptIncomingItemProp`
(`itemPropSyncGuard.ts:47`) evaluates on two **equal, stale** timestamps, and the guard's `>=`
comparison **accepts** the prop. Ordinarily this only re-applies the same optimistic value the card
already displays (harmless). But this proves the guard's entire soundness model — "an incoming prop's
timestamp being no older than what this card last accepted means it's safe to apply" — silently
depends on an assumption (that a same-timestamp prop always carries the same quantity this card
already has) that Fix 1 (Section 21) never actually verified end-to-end against this second channel,
because every test added for Fix 1 (`usePrintRequestDetail.behavior.test.ts`'s `CardHarness`) modeled
only `saveDraft`'s own direct path and a hand-constructed, ordering-controlled `applyIncomingProp` call
— it never modeled this second, genuinely concurrent channel firing **in between** a typed edit and
that edit's own save resolving. The exact call at `usePrintRequestDetail.behavior.test.ts:462`
(`card.applyIncomingProp(5, 400)`, asserted to correctly not regress the already-`5` state) proves
only that an **older**-timestamped, already-consistent prop is handled — it does not model an
**equal**-timestamped prop carrying the pre-correction value arriving through the cart-sync-effect
channel while the field is still showing the user's freshly typed, not-yet-committed `7` and
`lastAcceptedUpdatedAtMsRef` has not yet been bumped for this edit at all (i.e., before `saveDraft`'s
own `await onUpdate` has resolved). Under this repo's 300ms debounce (`scheduleSave`,
`PortalPrintRequestItemCard.tsx:330-336`) and React's own batching/scheduling, whether the cart-sync
channel's prop update commits to this card before or after `saveDraft`'s own resolution is **not
something either the code or the existing tests constrain** — it is a genuine timing race between two
independent state-update paths that happen to converge on the same guard, and this amendment's
required fix must remove the race entirely rather than attempt to win it more often.

**Corrected diagnosis, precisely:** Fix 1 (Section 21) correctly stopped the card's *own* success path
from trusting the typed value — that part is proven sound (Test A/B pass, and Implementation Review 4
independently re-verified it). What Fix 1 did not address, and what this amendment must, is that the
card's prop-sync effect can **still** be reached and can **still** win via a second, legitimate,
concurrent update channel (the shared-context optimistic/corrective patch → cart-sync effect) whose
timestamp bookkeeping was never designed to be race-safe against the card's own in-flight edit,
because `patchWorkingItems`'s patch functions never carry or update any timestamp at all, and the
guard's "reject if older" model cannot distinguish "stale" from "same mutation, different channel,
zero information content" when both sides are frozen at the same pre-edit value.

**Second, independently confirmed mechanism — re-entrancy in `saveDraft`'s own overlap guard, which
directly explains a durable (not merely transient) stuck-at-7 outcome.** `saveDraft`
(`PortalPrintRequestItemCard.tsx:338-421`) uses `saveInFlightRef`/`saveQueuedRef`
(lines 362-365, 404-410) purely as a "don't send two overlapping network requests" guard — it stores
only a boolean (`saveQueuedRef.current = true`), never the value that must actually be resubmitted.
Concretely, if the user types `7` (save #1 dispatches, network round-trip in flight), then performs a
second interaction before save #1 resolves (types again, or clicks a stepper), `scheduleSave` reschedules
a debounced call that — seeing `saveInFlightRef.current === true` — only flags `saveQueuedRef.current =
true` and returns, **discarding that second interaction's own value entirely** except as a signal to
"run saveDraft again later." When save #1 resolves, its success handler
(`PortalPrintRequestItemCard.tsx:382-399`) reads `quantityInput` **from the closure captured when save
#1 itself was invoked** (`currentQuantityInput: quantityInput` at line 386) — not a ref reflecting the
live, current field value — and calls a plain (non-functional) `setQuantityInput(reconciliation.quantityInput)`,
**unconditionally overwriting whatever the user has typed since save #1 started**, then triggers the
queued follow-up save. If the user's actual final keystroke in this whole sequence is a re-typed `7`
landing in the same render pass as (or immediately after) save #1's own corrective `setQuantityInput('5')`,
the field can settle on `'7'` with **no further save in flight or queued to correct it** — `saveInFlightRef`/
`saveQueuedRef` only prevent duplicate network calls, they were never designed to preserve "the user's
most recent intent survives an overlapping, now-stale save's completion." This is the same defect class
Section 21 already fixed once (client-side reconciliation trusting a stale locally-held value instead of
the live/authoritative one) — recurring in a location none of the four prior fixes touched: the
overlap/re-entrancy path, not the single-save path every existing test exercises.

**Contributing/compounding factor, also confirmed from source — an unguarded bypass of the optimistic
clamp.** `usePrintRequestDetail.updateItem` (`usePrintRequestDetail.ts:319-327`) only applies
`clampItemQuantityToWorkingRequestMax` when `workingRequestLimit.limit != null`; when `limit` is
transiently `null` (`usePortalWorkingRequestLimitState.ts:65-82` resets it to `null` and `isLimitReady`
to `false` whenever `firebaseUser`'s reference changes, before the limit subscription's first emission
arrives — reachable at ordinary mount/reconnect timing if an edit fires in that window; **Amendment 4's
Formal Review corrected an earlier draft's overstated claim that a routine silent ID-token refresh
reliably re-triggers this window — `subscribeToAuthState` is backed by `onAuthStateChanged`, not
`onIdTokenChanged`, so that specific trigger is not demonstrated; the window's reachability at ordinary
mount timing is what's actually proven, and is sufficient on its own to require this fix**), the
optimistic patch falls back to `Math.max(1, Math.floor(input.quantity))` —
**the raw typed value, completely uncapped** — applied to both `items` and `workingItems` before the
server round-trip. In this state, the capacity banner (`usePortalWorkingRequestLimitState.ts:90`,
`isReady = isLimitReady && isPrintCountKnown`) is simultaneously `false`, so the banner freezes on its
last rendered text instead of reflecting the momentarily-uncapped total — plausibly matching the
owner's separate observation that "the banner does not change." This does not, by itself, explain a
*durable* stuck field (the subsequent server correction still lands via `applyServerQuantityPatch` once
`serverQuantity !== optimisticQuantity`), but it is a real, independently reachable defect that must
also be closed: an unknown limit must never be treated as "no limit."

### 22.2 Required remediation — Fix 1 (revised): close the re-entrancy hazard and stop bypassing the clamp on an unknown limit

1. **Re-entrancy fix (primary).** Replace `saveQueuedRef`'s boolean-only signal with a mechanism that
   lets a completing save recognize whether the value it is about to write back (`quantityInput`) is
   still the live, current one, or has been superseded by a newer edit issued while it was in flight:
   - Track a `quantityInputRef` mirrored synchronously on every `quantityInput` change (in `onChange`/
     `stepQuantity`, not only via `useState`), so the completing save's handler can compare against the
     true live value instead of its own stale closure.
   - A completing save's reconciliation must only call `setQuantityInput(...)` if the live value (per
     `quantityInputRef`) still matches what that save itself submitted (i.e., no newer edit has changed
     it since); if a newer edit is pending, the completing save updates only its own bookkeeping
     (`lastSavedSignatureRef` for its own submitted/accepted value) and defers the visible field to the
     newer, about-to-fire save — never stomping live user input with a superseded result.
   - The queued follow-up save (fired via `saveQueuedRef`) must re-derive its request from the live
     `quantityInputRef` value at the moment it actually executes (already effectively true today via
     `saveDraftRef.current()`, but must be verified explicitly by a new overlapping-save test, since no
     existing test exercises this path).
2. **Clamp-bypass fix (secondary, contributing).** `usePrintRequestDetail.updateItem` must not fall
   back to an uncapped `Math.max(1, Math.floor(input.quantity))` when `workingRequestLimit.limit` is
   `null` — an unknown limit is not "no limit." Skip the optimistic local patch entirely in that case
   (still send the request to the server, which independently and authoritatively clamps regardless of
   what the client believes the limit is) rather than optimistically writing an uncapped guess into
   `items`/`workingItems`.
3. This must not weaken the guard's existing, working behavior for a **genuinely external** change
   (e.g. the Current Request drawer editing the same item while this card has no edit in flight) —
   verify via a new explicit test that an external prop update while no local edit is pending/superseded
   still applies exactly as it does today.
4. Do not change `itemPropSyncGuard.ts`'s own timestamp-comparison logic — it remains correct for the
   case it was designed for (distinguishing a stale reload from a genuine external edit). This
   amendment's fix is in `saveDraft`'s own re-entrancy handling and in `updateItem`'s clamp-bypass
   condition, not in the prop-sync guard's decision function itself.
5. Do not introduce a new write path, and do not touch `clampItemQuantityToWorkingRequestMax` or the
   callable/transaction — this remains a local component-state defect only, exactly as Section 21
   diagnosed, just not yet fully closed by Section 21's remediation.

### 22.3 Root cause — Studio timer `permission-denied`: independently re-confirmed unresolved a fifth time; no new source-level explanation exists

This amendment independently re-derived the full `firestore.rules` field allowlists
(`upcomingShowRequiredFieldsValid` at `firestore.rules:634-696`, `showAllocationRequiredFieldsValid` at
`firestore.rules:710+`, `showAllocationSourceIdentityUnchanged` at `firestore.rules:1003`) against
`upcomingShowService.startShowPrinting`'s exact batch write
(`upcomingShowService.ts:959-1017`) a **fifth** time, independently of Amendments 2 and 3's own
re-derivations. Every field the batch writes — `productionStatus`, `activePrintStartedAt`,
`printStartedAt`, `printPausedAt` (via `deleteField()`), `updatedBy`, `updatedAt` on the show
(`firestore.rules:1085-1091` allow-update clause); `status`, `updatedBy`, `updatedAt` on each allocation
(`firestore.rules:1287-1295`) — is present in the corresponding allowlist, `"in_progress"` is a valid
`isValidShowAllocationStatus` enum value, and the partial `batch.update()` semantics (Firestore merges
against the existing document before Rules evaluate `request.resource.data`) satisfy
`showAllocationSourceIdentityUnchanged`'s unchanged-identity fields automatically. **No new
source-only explanation was found.** This is now the fifth independent confirmation across four
amendments that the checked-in Rules and the exact write are mutually consistent — reinforcing, not
undermining, the standing diagnosis that the failure can only be explained by (a) deployed
`fresh-prints-dev` Rules differing from checked-in `firestore.rules`, or (b) a specific existing live
document carrying a field outside the current allowlist. **No further source-side action is
appropriate; a fifth attempt to "diagnose harder" from source alone would not be diagnosis, it would be
guessing with extra steps.** **The Studio timer is explicitly NOT fixed by this amendment** — no
Rules, authentication, service, or payload change was made. The owner's live-Rules-comparison request
from Amendment 3 stands, corrected in the updated QA checkpoint to name the actually-supported
method: the Firebase Console's Firestore Rules tab, not a CLI `--dry-run` deploy (which only validates
the local file's syntax and does not fetch or diff against what is currently deployed — this repo's
installed `firebase-tools` has no command that does).

### 22.4 Root cause — Show Queue: a genuinely new, previously-unexamined gap, distinct from Fix 3's already-correct allocation-list fix

**Confirmed from source, precisely — this is not a regression of Fix 3, it is a second, adjacent gap
Fix 3 never covered.** Fix 3 (Section 21.3/21.4) correctly converted `useShowAllocations` to a live,
bounded, ref-counted per-show `onSnapshot` subscription — confirmed still correct and still working
(Implementation Review 4 verified this directly; nothing in this amendment disputes it). But
`useShowAllocations(selectedShowId)` only supplies the **allocation list for the currently selected
show** (`UpcomingShowsPage.tsx:421`). The **show-level capacity/summary state the owner explicitly
called out** — "the relevant show card, allocation list, request count, print count, and capacity state
must reconcile immediately" — is computed from `selectedShow`
(`UpcomingShowsPage.tsx:742-744`, `capacity = assessShowCapacity({ maxTotalQuantity:
selectedShow.maxTotalQuantity, allocatedQuantity: selectedShow.allocatedQuantity })`), and
`selectedShow` is derived from `shows`/`visibleShows`
(`UpcomingShowsPage.tsx:384-385`), which come from `useUpcomingShows()`
(`useUpcomingShows.ts`) — a **pure one-shot `getDocs` fetch** (`listUpcomingShows`,
`upcomingShowService.ts:421-442`) with `reloadUpcomingShows` as its only refresh mechanism, called
explicitly by mutation call sites, never subscribed live. Confirmed the actual write this defect is
about: `upcomingShowService.ts:887` — when a Portal-submitted allocation is added to a show,
`allocatedQuantity: show.allocatedQuantity + requestedQuantity` is written directly onto **the
upcoming-show document itself**. Since `useUpcomingShows()` never re-fetches until the owner
explicitly triggers `reloadUpcomingShows` (or the page remounts/navigates), the show card and capacity
banner the owner is looking at stay on the pre-allocation snapshot — exactly matching the reported
symptom, and exactly why "navigate away and back" clears it (a fresh mount re-runs `useUpcomingShows`'s
effect).

**This is why Fix 3 alone could not have closed this defect regardless of how correctly it was
implemented** — the allocation list (Fix 3's actual scope) and the show-level capacity/summary fields
(this amendment's scope) are two different Firestore reads, owned by two different hooks, and only one
of the two was converted to a live subscription.

### 22.5 Required remediation — Fix 3 (extended): a bounded, single-document live subscription for the currently selected show

1. Add a bounded, per-show-id `onSnapshot` subscription for exactly one `upcomingShows/{upcomingShowId}`
   document — the currently `selectedShowId` only, never a collection-wide `upcomingShows` listener (the
   full-collection `getDocs` in `listUpcomingShows` must remain a one-shot list-load; converting the
   entire collection to a live listener is explicitly out of scope and would reintroduce the class of
   unbounded-read problem this goal is required not to reintroduce).
2. Route this new subscription through the existing `createSharedFirestoreSubscription` utility
   (`apps/studio/src/renderer/src/features/firebase/utils/createSharedFirestoreSubscription.ts`), mirroring
   `getOrCreateShowAllocationsSubscription`'s exact shape (`upcomingShowService.ts:359-412`) — a
   module-level `Map<string, SharedSubscription>` keyed by `upcomingShowId`, single-document
   `onSnapshot(doc(...))` (not a `query`, since this targets exactly one document), reusing
   `mapUpcomingShowData` for mapping (do not duplicate that mapping logic).
3. On each snapshot emission, patch the single corresponding entry in `useUpcomingShows`' own `shows`
   array in place (replace-by-id), not a full `listUpcomingShows()` re-fetch — preserve every other
   show's object identity/reference to avoid needless re-renders of unrelated show cards.
4. Scope: only the currently selected show needs a live subscription to satisfy the owner's exact
   reported repro ("Studio is already open on Show Queue" implies a show is selected/expanded when the
   allocation arrives). Do not subscribe to every visible show in the list — that would approach an
   unbounded listener count as the queue grows; a single active subscription tied to `selectedShowId`,
   torn down and recreated on selection change (exactly mirroring `useShowAllocations`'s existing
   `activeShowIdRef` pattern), is the correct bound.
5. Ensure cleanup on unmount/selection change via the shared subscription's existing ref-counted
   teardown — no new listener class is introduced beyond what Fix 3 already established as the reviewed,
   approved pattern.
6. Ensure Firebase Debug tracing observes this new listener's attach/emission exactly as the existing
   `showAllocations` subscription already does (reuse `traceFirestoreListenerAttach`/emission helpers
   already wired into `createSharedFirestoreSubscription`; no new tracing code required).
7. Do not change `listUpcomingShows`, `reloadUpcomingShows`, or any other consumer of `useUpcomingShows`
   — this only adds a supplementary live patch for the one document the currently open Show Queue
   session is actually looking at.

### 22.6 Required behavior-level tests

**Fix 1 (revised):**
- A new overlapping-save test: dispatch a save for a typed `7`; before its (simulated) callable
  resolves, apply a second live edit to the same card/item; resolve the first save's callable with an
  accepted value; assert the completing (first, now-superseded) save does NOT overwrite the live,
  more-recent input; assert the second edit's own eventual save is what determines the final displayed
  value and shared state, and that value is server-authoritative (not the client's guess).
- A new test proving the queued-save path re-derives its request from the live current value at
  execution time, not a stale closure from when it was originally scheduled.
- A new test proving that when `workingRequestLimit.limit` is `null` at edit time, the optimistic local
  patch is skipped entirely (not applied with an uncapped raw value) while the request to the server
  still proceeds and the server's authoritative response is still committed on return.
- A new test proving a genuinely external prop update (no local edit pending/superseded) still applies
  exactly as today — no regression to the drawer/other-tab case `itemPropSyncGuard.ts` was built for.
- Re-run the existing owner Test A–E (Section 21.5) unchanged to confirm no regression to the
  already-working single-edit path.

**Fix 3 (extended):**
- A new test (extending `useShowAllocations.test.ts`'s existing conventions, or a new focused file
  following the same pattern) proving: a live single-document subscription for the selected show
  reflects an `allocatedQuantity` change without remount; only one subscription exists per show id
  (ref-counted, shared); a different, non-selected show's data is unaffected; the subscription tears
  down on selection change/unmount; no full `listUpcomingShows()` re-fetch occurs on this update path;
  the subscription is observable via Firebase Debug tracing.

**Fix 2:** no code change; no new test required beyond what Amendments 2/3 already added for the
diagnostic logging.

### 22.7 Required process for this amendment

Same as Amendments 1, 2, and 3: this section requires its own focused independent Formal Review before
any code changes, with the reviewer explicitly instructed not to defer to any of the four prior
Implementation Reviews on this goal — all four were "APPROVED" on prior passes of this same goal and
all four were subsequently proven incomplete by live owner QA, which is exactly why source-level review
alone, however careful, is not sufficient evidence of runtime correctness for these two specific
defects. The reviewer must independently verify the exact race described in 22.1 (not merely confirm
the fix exists) and the exact document/field described in 22.4. Fix 2 remains gated behind the owner's
live-Rules-comparison step; Fix 1 and Fix 3 may proceed to Implement upon approval, under the owner's
standing authorization for this reopened goal, with no new unresolved product decision.

### 22.8 Amendment 4 Formal Review disposition

A focused independent Formal Review of this amendment (Section 22 only)
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-4-review.md`):
**`approved_with_changes`**. The reviewer independently re-derived both the second-channel timing hazard
and the re-entrancy hazard in `saveDraft`'s stale-closure reconciliation by hand, confirming the latter
as the more serious, durable-defect-producing mechanism and confirming a genuine, previously-untested
gap in `usePrintRequestDetail.behavior.test.ts`'s `CardHarness` (single-threaded, never models an edit
occurring between a save's dispatch and its resolution). The reviewer independently confirmed the Show
Queue root cause (`useUpcomingShows`'s one-shot fetch never updates the show-level `capacity`/summary
fields Fix 3 never touched) and the proposed single-document subscription's soundness and bound. The
reviewer independently re-confirmed the Studio timer Rules allowlist analysis a fifth time with the same
result as the prior four passes. **One non-blocking correction, resolved directly in Fix 1 above (22.1):**
the amendment's original text overstated "token refresh" as the confirmed trigger for the
`workingRequestLimit.limit === null` window; corrected to describe the weaker, still-sufficient claim
that the window is reachable at ordinary mount/reconnect timing regardless of exact cause.

The reviewer's explicit assessment: this amendment is better-founded than Amendments 1-3 (it explains
why the exact same repro Amendment 3 already targeted still fails, via an ordinary, not exotic,
interaction pattern), but source review alone — consistent with this goal's entire history — cannot
certify runtime correctness; a fifth live owner QA pass remains the actual closing gate. No regression
risk found to any prior amendment's field-confirmed fixes. Implement may proceed on Fix 1 (revised) and
Fix 3 (extended) under the owner's standing authorization; Fix 2 remains gated behind the owner's own
live-Rules-comparison step.

## 23. Amendment 5 — Owner Runtime QA `FAIL` (Fourth Pass): Studio Timer Diagnostic Tooling, a Genuine Show-Capacity Policy Reversal (ADR-FP-122), and a Show-Switch Stale-Error Defect

Owner ran a fourth manual QA pass. **All three previously-fixed-and-approved areas (typed over-cap
reconciliation, Show Queue live allocation update, and the full regression smoke suite) passed
cleanly** — Amendment 4's fixes hold. Three new items surfaced: the Studio timer remains
`permission-denied` (still unresolved, no code change attempted); a genuine, previously-unencountered
show-capacity defect at the exact `23 + 2 = 25` boundary; and a show-switch stale-error defect where a
capacity/submission error for one show remained visible after a different show was selected.

### 23.1 Studio timer — programmatic deployed-vs-local Rules comparison tooling built; diagnosis still gated on live owner access

Per explicit instruction, the previous ad hoc "compare via Firebase Console" guidance is replaced with
a developer-controlled, read-only script:
`functions/scripts/compare-deployed-firestore-rules.mjs`. It uses the official Admin SDK Security
Rules API (`getSecurityRules(app).getFirestoreRuleset()`), initialized against the repo's single
active project (`fresh-prints-dev`, from `.firebaserc`) via Application Default Credentials /
`GOOGLE_APPLICATION_CREDENTIALS` — the same authentication convention every other script in
`functions/scripts/` already uses. It is strictly read-only (never creates/releases/patches/deletes a
ruleset), normalizes only BOM/CRLF/one-trailing-newline (never comments, expressions, or match
bodies), reports project id, deployed ruleset name/create time, local and deployed SHA-256 hashes, a
plain-language `IDENTICAL`/`DIFFERENT`/`UNABLE` result, and a unified diff when different. Exit codes:
`0` identical, `1` different, `2` unable to retrieve/compare.

**This session cannot execute the script against live `fresh-prints-dev` credentials** (no
Application Default Credentials or service-account key exists in this environment) — running it
correctly fails with an explicit, actionable authentication error (confirmed by direct execution:
exit `2`, "Credential implementation provided to initializeApp() ... failed to fetch a valid Google
OAuth2 access token", followed by the exact remediation step). This is the honest, correct behavior
for "unable to compare," not a defect in the script — the script's mechanics (correct API call,
correct project id, correct hashing/diff/exit-code contract) are independently verified working. **The
owner must run this script from a machine with `fresh-prints-dev` credentials configured** to get the
actual comparison result.

Separately, a new Rules-emulator test file,
`tests/firebase/studioProductionTimer.rules.test.ts`, reproduces `startShowPrinting`'s exact batch
write (both the `upcomingShows` update and the `showAllocations` update, in one `writeBatch`) against
the checked-in `firestore.rules`, with fixtures for an active owner, active admin, active helper,
active customer (must deny), inactive staff (must deny), and an unrelated-field-inclusion case (must
deny). **This session cannot execute this test file** — the Firestore Rules emulator requires a Java
runtime, and no Java is installed in this environment (confirmed: `firebase emulators:exec` fails at
its own preflight `java -version` check before running anything, and no `java` binary exists on `PATH`
in this sandbox). This is an environment limitation, not a defect in the test — the test file is
syntactically valid TypeScript (confirmed by `npx tsc --noEmit` passing across the Functions
workspace) and follows this repo's own established Rules-emulator test convention exactly
(`tests/firebase/catalogSnapshot.rules.test.ts`). **The owner or CI (wherever Java is available) must
run `npm run test:rules` against this new file** to get the actual pass/fail result, which — combined
with the five prior independent static allowlist re-derivations all finding the checked-in Rules
internally consistent with the batch write — would be strong additional evidence for or against the
standing diagnosis (deployed-Rules drift, or a live document with an out-of-allowlist field).

**No Rules, authentication, timer-service, or write-payload change was made this pass.** The Studio
timer remains explicitly unresolved.

### 23.2 Show-capacity boundary defect — a genuine product-policy conflict, not a math bug; resolved by explicit owner decision (ADR-FP-122)

**Investigation finding, confirmed from source before any code changed:** the reported `23 + 2 = 25`
rejection was **not** an off-by-one or double-counting defect in the capacity math. The actual
quantity-cap functions (`wouldExceedPerShowCustomerCap`, `remainingPerShowCustomerCap`,
`planPortalShowQueueFit`, `sumCustomerQuantityOnShow`) were already correct at this exact boundary,
confirmed both by direct reading and by the pre-existing test suite (`printRequestPerShowCustomerCap.test.ts`,
`portalShowQueueFit.test.ts`). The actual cause: `queuePortalPrintRequestToShow.ts` enforced a
**separate, unconditional uniqueness rule** — "one Portal print request per customer per show,"
ADR-FP-102 Decision §5, explicitly reconfirmed by the owner on 2026-07-20 as "working well; do not
change" — which threw `failedPrecondition("You already have a print request on this show...")`
**before the request ever reached the capacity math**, at both a pre-transaction check
(`existingOnShowQty > 0`, ~line 303) and a re-verified in-transaction check
(`freshCustomerOnShowQty > 0`, ~line 506). The owner's exact scenario (a first request of 23 queued to
a show, then — after that request left the working-request slot — a second, separate request of 2
prepared and queued to the **same** show) is precisely the case this uniqueness rule was designed to
block, independent of remaining capacity.

Because this is an existing, explicitly-owner-confirmed accepted decision (not a defect), this session
asked the owner directly rather than silently overriding an accepted ADR. **The owner's explicit
decision: reverse the uniqueness rule.** Recorded as **ADR-FP-122** in `docs/project/DECISIONS.md`
(superseding ADR-FP-102 Decision §5 and its 2026-07-20 owner-confirmation addendum only — every other
part of ADR-FP-102 remains unchanged and in effect): a customer may now submit multiple separate print
requests to the same show, accumulating toward the shared per-customer-per-show limit `L`; exactly `L`
is allowed, more than `L` is blocked; the one-working-request-at-a-time rule and the
one-show-per-individual-request structural invariant are both unrelated and unchanged.

**Exhaustive inventory performed before editing** (to ensure the removal is complete and consistent,
not leaving contradictory enforcement anywhere): `listPortalAllocatableShows.ts` does not enforce this
uniqueness rule (confirmed by full read — no change needed); no Portal client-side code
(`usePortalAllocatableShows.ts`, `portalShowSelectionService.ts`, `useQueuePrintRequestToShow.ts`,
`PortalQueueToShowModal.tsx`) enforces it either (confirmed — no client-side uniqueness gate exists
today; enforcement was server-only); `firestore.rules` has no uniqueness constraint on
`showAllocations` (confirmed — no change needed); no existing test file asserted this behavior
(confirmed via repo-wide search — none to delete); the quantity-cap negative assertions in
`printRequestPerShowCustomerCap.test.ts` (proving the cap-exhausted message never contains "already
have a request") remain correct and unaffected.

**Implemented:** both throw blocks removed from `queuePortalPrintRequestToShow.ts`
(`existingOnShowQty`/`freshCustomerOnShowQty` computations retained — both still feed the unchanged
quantity-cap math immediately below where the uniqueness throws used to sit). `docs/project/DECISIONS.md`
(new ADR-FP-122 entry + supersession note on ADR-FP-102), `docs/architecture/DATA_MODEL.md`,
`docs/architecture/BACKEND.md` updated to remove the now-inaccurate "one request per customer per
show" claims and reference ADR-FP-122.

### 23.3 Show-switch stale error — confirmed, fixed with a generation-scoped error contract

**Root cause, confirmed by direct trace:** `useQueuePrintRequestToShow.ts`'s `error` was a single
global string with no notion of which show a submission attempt was for, and
`PortalQueueToShowModal.tsx`'s `ShowPicker.onSelect` handler only called `setSelectedShowId(showId)` —
never `clearError()` — so a capacity/submission error surfaced for Show A remained rendered
(`{submitError ?? actionError}`, unconditional) after the customer selected Show B, making the stale
error appear to apply to the newly selected show. A second, independent instance of the same defect
class existed in `handleConfirmAcknowledgment`'s catch block, which additionally copied the same
message into a second, entirely unscoped local state variable (`actionError`) — meaning even a
`clearError()` call alone would not have been sufficient, since `actionError` had no show-id
awareness at all.

**Implemented:**
1. `useQueuePrintRequestToShow.ts`: `error` is now `{ showId, message } | null`; a monotonic
   generation counter (mirroring this repo's existing stale-completion pattern, e.g.
   `itemMutationGeneration.ts`) is bumped both by `clearError()` and by a fresh `queueToShow()`
   dispatch, so a late-arriving rejection for an attempt no longer considered current can never set
   the error. The hook now also exposes `errorShowId` alongside the (unwrapped, string) `error` for
   backward-compatible consumption.
2. `PortalQueueToShowModal.tsx`: the `ShowPicker.onSelect` handler now calls both `setActionError(null)`
   and `clearError()` before `setSelectedShowId(showId)`, clearing both error surfaces immediately on
   selection change.
3. `handleConfirmAcknowledgment`'s catch block no longer duplicates the queue error into `actionError`
   at all — the hook's own scoped `error`/`errorShowId` is the sole source of truth for a
   queue-submission failure; `actionError` is reserved for the allocation-loading failure path, which
   is unrelated to show selection.
4. Defense-in-depth: the render itself only displays `submitError` when `submitErrorShowId ===
   effectiveSelectedId`, so even a future code path that sets `selectedShowId` without calling
   `clearError()` cannot resurrect a stale error for a show no longer selected.

### 23.4 Wipe-residue investigation — read-only audit tooling built; wipe implementation itself confirmed structurally sound by source read

**Investigation, confirmed by full read of `functions/src/wipeOperationalTestData.ts` and
`packages/shared/src/utils/operationalWipeTargets.ts`:** the wipe correctly deletes
`showAllocations`/`printRequestItems`/`printRequests` (all three are in
`OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER` and selected whenever the `printRequests` target is
chosen), correctly zeroes every show's `allocatedQuantity`/`accumulatedPrintMs` and deletes
`activePrintStartedAt` (`resetUpcomingShowAllocationTotals`, fired whenever `showAllocations` is
wiped without also wiping `upcomingShows` itself), correctly resets each customer's
`nextPrintRequestSequence`/`totalPrintRequests` and deletes the internal `printRequests` counter
document (`resetCustomerSequences`). No client-side cache in Portal or Studio persists across a fresh
page load in a way that could cause the reported defect: `portalPrintRequestReadCache` is in-memory
only (cleared on reload) and already invalidated on the relevant mutations per Amendment 2's earlier
fix; the Studio Show Queue's and Portal's working-request subscriptions are live `onSnapshot`s, not
caches with independently-stale content — they reflect whatever Firestore currently has on their next
emission. **No wipe-residue defect was found that could explain the reported `23 + 2` rejection** —
this is fully consistent with 23.2's finding that the actual cause was the (now-reversed) uniqueness
rule, not stale data.

**Implemented (tooling only, no wipe-logic change, since none was needed):** a new read-only,
developer-controlled audit script, `functions/scripts/audit-post-wipe-capacity-state.mjs`, reporting
exact counts for every capacity-affecting collection/field this goal's flow consults (`printRequests`,
`printRequestItems`, `showAllocations`, per-show residual `allocatedQuantity`/`accumulatedPrintMs`/
`activePrintStartedAt`, per-customer residual sequence/count fields, the internal counter document's
existence) plus a hard `[NEEDS MANUAL CONFIRMATION]` marker for the three cache-state questions the
task required reporting on (this script cannot itself observe live browser/Electron process memory,
so it correctly does not guess). **This session cannot execute this script against live
`fresh-prints-dev` data either**, for the identical credential reason as 23.1 — confirmed the script's
mechanics are sound (fails cleanly with the expected authentication error, exit `2`, when run without
credentials).

### 23.5 Required behavior-level tests (added)

- `packages/shared/src/utils/printRequestPerShowCustomerCap.test.ts`: the owner's exact boundary set
  (`0+23=23` allow, `23+2=25` allow, `23+3=26` block, `24+1=25` allow, `24+2=26` block, `25+1=26`
  block) plus a direct proof that summing two separate requests' allocations is not double-counted.
- `functions/src/queuePortalPrintRequestToShow.test.ts` (new): source-presence proof that both
  uniqueness throws are gone, that the retained `existingOnShowQty`/`freshCustomerOnShowQty`
  computations still feed the unchanged quantity-cap math, and that the unrelated
  one-show-per-individual-request structural check remains untouched. Explicitly supplements, not
  substitutes for, the behavior-level boundary tests above (this callable has no existing
  behavior-level test harness of its own to extend).
- `apps/portal/features/print-requests/hooks/useQueuePrintRequestToShow.test.ts` (new): a harness
  mirroring the hook's exact generation/scoping contract, proving a stale (superseded) attempt's
  rejection cannot resurrect a cleared error, that each show is evaluated independently, and that a
  successful submission clears `isSubmitting` with no error.
- `tests/firebase/studioProductionTimer.rules.test.ts` (new, written but **not executable in this
  environment** — see 23.1): reproduces the exact `startShowPrinting` batch write against checked-in
  Rules for owner/admin/helper (allow), customer/inactive-staff (deny), and an unrelated-field
  inclusion (deny).

### 23.6 Required process for this amendment

This amendment's implementation was carried out under the owner's own explicit, specific instruction
(a direct clarifying decision on the exact capacity-boundary product question, obtained via an
in-session question rather than assumed) — unlike Amendments 1-4, which required a Formal Review
*before* any code changed. Because the actual code change here is narrow, mechanical, and fully
specified by the owner's own decision (remove two specific throw blocks; nothing else in the
capacity-cap math changes), and because the show-switch fix and diagnostic tooling are independently
narrow and low-risk, this amendment proceeds to a Formal Review of the completed work (not a
pre-implementation gate) — the reviewer is instructed to verify the change against the owner's
decision exactly as if reviewing a plan, and to flag if anything was implemented beyond what was
decided.

## 24. Amendment 6 — Codex Takeover: Executable Timer Rules Proof and Sanitized Operation Manifest

The takeover investigation found that Amendment 5's timer Rules test was never included in
`npm run test:rules` and its supposedly production-shaped fixture is invalid under the checked-in
Rules: the show uses unsupported `syncStatus: "not_synced"` (the application and Rules use `idle`)
and the catalog allocation omits its required `designId`. Running the timer test directly with the
repository's portable Java 21 runtime reproduced the owner's `permission-denied`, but only in the
three authorized-role cases; the three expected-denial cases passed. This is a failing-before proof
of the test-harness defect, not evidence that the production timer payload or checked-in Rules are
wrong.

### 24.1 Approved investigation correction

1. Correct the fixture to the actual application document shape (`syncStatus: "idle"` and a
   catalog `designId`).
2. Add isolated show-only and allocation-only write assertions so a batch denial identifies the
   exact rejected operation.
3. Add explicit valid and invalid production-status transition cases.
4. Update `npm run test:rules` to execute every Rules test, including the timer test.
5. Add a development-only, sanitized service-layer operation manifest for timer actions. It may
   report project ID, caller role/active state, show ID, operation count/types, path templates,
   changed field names, current/proposed production status, whether allocations are included, and
   Firebase error code. It must not log tokens, email, names, document contents, customer data, or
   secrets.
6. Re-run the complete Rules suite, deployed/local comparison, and post-wipe audit. No Rules,
   Functions, index, migration, or deployment action is permitted.

### 24.2 Decision boundary after corrected proof

- If the valid production-shaped timer operation is denied by checked-in Rules, make only the
  narrowest least-privilege Rules correction and stop at `APPROVE DEV RULES DEPLOY`.
- If it passes and deployed Rules differ, record the exact difference and stop at
  `APPROVE DEV RULES DEPLOY`.
- If it passes and deployed Rules cannot be compared, use the sanitized manifest on the next live
  reproduction to distinguish authentication/profile, legacy document shape, and invalid show
  state; do not guess or weaken Rules.

### 24.3 Required verification

Record Java version, exact commands and exit codes, total/pass/fail counts, per-operation outcomes,
and whether the timer test executed. Run affected Studio tests, Functions build when applicable,
Studio build, lint, and `git diff --check`. A new Implementation Review must focus on this timer
correction before the work can return to owner QA.

## 25. Amendment 7 — Owner Post-Deploy `FAIL`: Missing Callable Deployment and Legacy Allocation Compatibility

Owner Test after the verified Amendment 6 Rules deployment returned `FAIL` in two remaining areas.
All previously passing Portal reconciliation, show-switch, Show Queue live-update, debug, copy, and
elapsed-clock behaviors remain passing and are regression constraints.

### 25.1 Workstream A — ADR-FP-122 callable deployment

Local `queuePortalPrintRequestToShow` source is registered from `functions/src/index.ts`, contains no
per-customer/per-show uniqueness throw, preserves the same-request re-queue checks, and computes both
pre-transaction and in-transaction cumulative customer quantity against the unchanged cap. Existing
tests cover 23+2 and adjacent boundaries; Amendment 7 must add/confirm 22+3 and 22+4 plus separate
request IDs, same-request denial, and no double-counting.

The live 22+3 rejection exactly matches the pre-ADR-FP-122 uniqueness behavior. Prior workflow
records explicitly state no Functions deployment occurred after the local ADR-FP-122 change.
Platform metadata exposes the active callable hash
`d244654790bfc4a62c765731aa474712ba5d5897`, but does not provide a trustworthy local source-hash
comparison. The combined source, workflow, and live evidence is sufficient to prepare only:

`firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev`

No deployment is authorized by this Plan. After tests/build/review, stop at
`APPROVE DEV FUNCTION DEPLOY`.

### 25.2 Workstream B — exact timer operation and legacy allocation diagnosis

Owner evidence reports an atomic batch of three writes, an incomplete show warning, and two
incomplete allocation warnings. Direct source trace establishes:

1. `startShowPrinting` performs one `upcomingShows/{showId}` update followed by one
   `showAllocations/{allocationId}` update for each parsed startable allocation.
2. `listShowAllocations` catches parser failures and excludes incomplete allocations before
   `allocationsToStart`; therefore the two warning documents were not necessarily the two batch
   allocations. The three writes were one show plus two other allocations that passed the client
   parser.
3. The current show lookup uses `getUpcomingShowById`, which throws on an incomplete selected show;
   therefore the separately logged malformed-show warning likely came from the live subscription,
   not necessarily the object used by the timer action.
4. Read-only lookup after QA found the reported show ID `BDCjOi4LOTsGHUKZwjU3` absent and zero
   matching allocations in the current default `fresh-prints-dev` Firestore database. Exact
   historical field shapes are no longer recoverable from live state; the second warning's full ID
   is also unavailable.

The current Rules have a show timer compatibility branch but no allocation timer compatibility
branch. A parsed allocation can still carry an extra legacy field because the parser ignores unknown
fields; the timer changes only `status`, `updatedBy`, and `updatedAt`, but the normal allocation Rule
revalidates the full document and rejects the preserved extra field. Amendment 7 must reproduce this
specific source-backed condition with one show plus two allocations, one carrying a preserved legacy
field. The failing-before test must prove atomic denial; the passing-after test must prove a
least-privilege allocation compatibility branch.

### 25.3 Required correction

1. Expand the service-layer manifest to one sanitized row per actual batch operation, including
   operation index/type, path template, document ID, changed field names, parser status, missing
   required field names, and unexpected legacy field names. Never log field values, PII, document
   bodies, or credentials.
2. Preserve the existing behavior that excludes genuinely incomplete allocations. Do not update or
   silently mark skipped records.
3. Add an allocation compatibility Rule limited to the timer transition
   `pending|queued -> in_progress`, exact diff fields `status`, `updatedBy`, `updatedAt`, active
   staff, valid types, and immutable preservation. It may preserve but never add/change unrelated
   legacy fields.
4. Add exact one-show/two-allocation emulator fixtures covering current schema, preserved allocation
   legacy field, customer/inactive denial, unrelated-field denial, and invalid transition denial.
5. If the exact test disproves this condition, do not change Rules; return to investigation.

Any Rules correction requires a new `APPROVE DEV RULES DEPLOY` checkpoint. Owner QA remains paused
until both the narrow Function deployment and any required Rules deployment complete.

### 25.4 Verification and review

Run all callable/capacity/Portal show-switch tests, the complete Rules suite with Java 21, Functions
build, Portal typecheck/build, Studio build, repository and changed-file lint, and diff check. Record
all non-zero baselines honestly. A new independent Implementation Review must verify both workstreams,
the three-operation manifest, failing-before/passing-after proof, least privilege, bounded reads, and
deployment scope before requesting either deployment approval.

## 26. Amendment 8 — complete timer lifecycle, live Portal progress, and personal show usage

### 26.1 Owner QA disposition and preserved passes

Post-Amendment 7 owner QA is `FAIL`; return to Plan → Review before implementation. The complete
timer lifecycle is not a partial pass: Start appeared to persist, Pause and Resume worked, but Studio
reported `An upcoming show record is incomplete.`, Mark finished returned
`Missing or insufficient permissions.`, and Portal progress did not reconcile until manual refresh.
The diagnostic reported `fresh-prints-dev`, active owner, five timer operations, one malformed
upcoming-show snapshot, and four incomplete allocation warnings. The new attachment contains no
screenshot file or exact identifiers; the only preserved historical ID in the workflow is the prior,
now-absent show `BDCjOi4LOTsGHUKZwjU3`. Amendment 8 must not invent or conflate IDs or claim the
current missing-field names are recovered. Sanitized diagnostics must make the next reproduction
self-contained.

Owner QA Test 2 is `PASS`: ADR-FP-122 multiple separate requests can accumulate to exactly 25.
Regression smoke is `PASS`. Latest Show-switch response was `SHOWN`, not `PASS`; reduced QA must
reconfirm it. Preserve the one-working-request rule, same-request re-queue denial, customer elapsed
clock removal, 200-effective-DPI floor, and all recorded smoke passes.

The owner has explicitly approved a distinct personal-use display:
`Your print spots: {used} of {limit} used` and `{remaining} spots remaining`. This does not replace
show-wide capacity.

### 26.2 Evidence-based root-cause model to prove

1. `useShowProductionTimer.runAction` awaits the Firestore action and then awaits
   `onShowUpdated`, so one catch currently conflates pre-write validation, commit, service
   post-commit read, page refresh, and Finish reconciliation. A committed Start could therefore be
   mislabeled if a later phase fails, but the failing phase is not yet proven. `listUpcomingShows`
   already maps/skips malformed records independently and is not an authorized assumed cause.
   Tests must attribute failure precisely to pre-write, commit, post-commit
   `getUpcomingShowById`, `onShowUpdated`, or reconciliation. Commitment may be claimed only after
   the write promise resolves.
2. Allocation listeners and list loads intentionally skip mapper-invalid allocations. Start and
   Finish can update only mapper-valid records. Warnings for skipped records are not operation rows.
   The current generic action log does not identify action phase or distinguish committed mutation
   from refresh failure.
3. Amendment 7 added only `pending|queued -> in_progress` legacy allocation Rules. Finish changes
   `pending|queued|in_progress -> done` plus `completedAt`, `completedBy`, `updatedBy`, `updatedAt`;
   a mapper-valid document carrying a preserved extra legacy field fails the ordinary full-schema
   Rule. A narrow completion branch is likely required and must be established by failing-before
   emulator evidence.
4. Portal already uses a bounded request-scoped callable poll, but its unchanged-result backoff is
   30 seconds → 60 seconds → 120 seconds. That can leave a mounted queued request visibly stale
   until refresh. Repair this existing mechanism; do not add a Firestore listener or broad scan.
5. `listPortalAllocatableShows` already computes and returns authoritative
   `customerAllocatedQuantity` in its single customer-allocation query, and the modal already uses
   it for eligibility. No Function or N+1 read is needed for the new display.

### 26.3 Workstream A — Studio timer lifecycle and record handling

1. Give Start, Pause, Resume, and Finish separate action identities and sanitized manifests:
   operation count/type/path template, changed fields, current/proposed statuses, parser status,
   missing required field names, legacy extra field names, and Firebase error code. Never log values,
   document bodies, PII, or credentials.
2. Separate mutation success from refresh and reconciliation success in the hook/service contract.
   A committed action must not be presented as uncommitted solely because a later phase failed.
   Preserve a retry path and surface precise refresh/reconciliation warnings independently.
3. Preserve the already-resilient one-shot show list and add regression coverage if absent; do not
   rewrite or claim it as an Amendment 8 repair. The selected show remains strict: an invalid
   selected show must block before a write with an actionable missing-field message. If executable
   evidence identifies another throwing list/read path, fix only that path.
4. Keep genuinely mapper-invalid allocations excluded from writes and status totals. Add a precise
   staff-facing message when no safe affected allocations remain. Mapper-compatible legacy shapes
   remain eligible and preserve unknown fields.
5. Reproduce Finish against actual service payloads. If failing-before confirms Rules denial, add a
   least-privilege compatibility branch limited to active staff,
   `pending|queued|in_progress -> done`, and exactly
   `status`, `completedAt`, `completedBy`, `updatedBy`, `updatedAt`. Require timestamp/string types
   and caller identity; preserve all legacy/identity fields; deny customers, inactive staff,
   unrelated changes, invalid transitions, and legacy-field change/removal. Keep the ordinary path
   from bypassing this narrow transition just as Amendment 7 did for Start.
6. After the atomic Finish batch, request completion reconciliation remains bounded to affected
   request IDs. A reconciliation failure must report distinct partial success and preserve a retry
   path; it cannot relabel the resolved timer batch as uncommitted. Do not put request documents in
   the timer batch unless source evidence proves a need.

### 26.4 Workstream B — bounded live Portal production progress

Keep `getPortalShowPrintProgress` as server authority and repair
`usePortalShowPrintProgress`'s existing request-scoped polling. While visible and nonterminal, poll
at a short bounded interval suitable for production-state reconciliation (target at most 10 seconds
for Queued → Printing and Printing → terminal), with one in-flight request per hook, generation
protection against stale completions, focus/visibility refresh, and cleanup on unmount/terminal
state. Do not add any Firestore listener, all-show/all-allocation query, global poll, corpus reload,
or customer elapsed clock. Tests must execute the production polling controller/hook boundary and
prove mounted transitions without remount.

### 26.5 Workstream C — personal show-spot visibility

Use existing authoritative `PortalAllocatableShow.customerAllocatedQuantity` plus the already-loaded
limit `L`. Render selected-show personal usage separately from ShowPicker's show-wide capacity:

```text
Your print spots: {used} of {limit} used
{remaining} spots remaining
```

Clamp remaining at zero. Show 0/25, 22/25, and 25/25 correctly. On show switch, derive only from the
currently selected show. During the existing post-submit capacity animation, include the successful
queued quantity in the personal display; on reopen, the existing callable refresh is authoritative.
Add stale-result protection so Show A cannot overwrite Show B. Preserve the exact exhausted-cap
submission copy and never imply the whole show is full. No callable/type change or Function
deployment is planned because the server response already contains the required value.

### 26.6 Required tests and verification

Behavior tests must cover:

- current and mapper-compatible legacy Start/Pause/Resume/Finish;
- the post-commit refresh-failure case without false action failure;
- strict selected-show invalid-record block and resilient unrelated-show list mapping;
- mapper-invalid allocation exclusion and actionable no-safe-allocation error;
- failing-before and passing-after legacy Finish Rules fixture;
- active staff success; customer/inactive/unrelated/invalid/legacy mutation denials;
- Portal Queued → Printing → terminal reconciliation without remount, stale-response rejection,
  visibility/focus behavior, single in-flight poll, and cleanup;
- personal 0/25, 22/25, 25/25, post-success +3, independent Show A/B counts, stale Show A defense,
  distinct show-wide/personal copy, no N+1, exact-25 allow, over-25 and same-request denial.

Run focused tests, TypeScript 5.9.3 version, complete Rules suite with Java 21, Functions build only if
Functions change, Portal typecheck/build, Studio build, changed-file lint, repository lint, and diff
check. Record the known Studio build (29 errors) and repository lint (41 findings) baselines without
weakening checks. A new independent Formal Review is required before implementation and a new
independent Implementation Review after verification. If Rules change, stop at a new exact
`APPROVE DEV RULES DEPLOY` checkpoint. Do not redeploy unchanged Amendment 7 surfaces, start owner
QA early, sign off, or start queued goals.

## 27. Amendment 9 — Finish reconciliation, unified mounted progress, and bounded historical-show visibility

### 27.1 Owner QA disposition and preserved passes

Post-Amendment 8 owner QA is `FAIL`; return to Plan → Formal Review before implementation. This is
the next sequential amendment (**Amendment 9**); the next independent Implementation Review is
**Implementation Review 10**.

Preserve the owner-confirmed passes: Studio Start/Pause/Resume and advancing timer; Portal top
`LIVE PRINTING` / `RUNNING` refresh; exact personal-use copy; multiple requests accumulating to
exactly 25 while above-25, same-request re-queue, and one-working-request rules remain enforced;
show switching; all prior smoke; customer elapsed-clock removal; and the 200-effective-DPI floor.

Owner-confirmed failures:

1. Finish commits the show/allocation state but reports
   `Printing finished, but 1 request update(s) need retry.`
2. While detail remains mounted, the top live indicator updates but the rail remains Queued. After
   Finish, live wording falls back to Queued; route remount then shows correct persisted Printed.
3. A just-finished show disappears from the Portal calendar. Owner decision: finished/historical
   shows remain visible, clearly terminal, disabled, non-selectable, and never allocatable.

Generic malformed/incomplete show/allocation warnings remain unresolved evidence. Do not suppress or
assume them causal. Record exact missing operational field names and whether each warning document
participates in the selected Finish operation.

### 27.2 Workstream A — exact Finish and retry reconciliation

#### Proven current atomicity and operation manifest

`markShowPrintingFinished` reads one selected show and one show-scoped allocation query, then commits
one atomic client batch in this order:

1. update `upcomingShows/{upcomingShowId}` fields `productionStatus`, `accumulatedPrintMs`,
   `activePrintStartedAt`, `printPausedAt`, `printFinishedAt`, `printFinishedBy`, `updatedBy`,
   `updatedAt`;
2. update each mapper-valid finishable `showAllocations/{showAllocationId}` fields `status`,
   `completedAt`, `completedBy`, `updatedBy`, `updatedAt`.

Only after that batch resolves does it reconcile each deduplicated affected `printRequestId`
separately. The visible Finished show plus retry warning therefore means the atomic show/allocation
batch resolved and exactly one downstream request reconciliation rejected; it is not a partially
committed timer batch.

Each request reconciliation reads the request, its items, and its request-scoped allocations, then
calls `printRequestService.updatePrintRequest(..., {status: "completed"})` only when non-canceled
printed quantity covers requested quantity. That service strictly maps the request, directly updates
it, then reads/maps it again. The exact failure may therefore be request mapper rejection,
item/allocation read or mapper rejection, eligibility, request Rules denial (including a preserved
legacy field), mutation failure, or post-write read/map failure. Prove the exact phase before choosing
Rules, compatibility, migration, or staff remediation.

#### Required correction

1. Produce a sanitized per-request reconciliation result: phase (`request_read`, `item_read`,
   `allocation_read`, `eligibility`, `request_write`, `post_write_read`), parser status, missing field
   names, legacy extra field names, current/proposed status, whether a write was required, Firebase
   error code, success/failure, and retry eligibility. Never expose request/customer/artwork content,
   notes, document bodies, tokens, or credentials.
2. Render only non-PII failure class/count to staff. Detailed manifests remain development-only.
   Structurally invalid records require actionable remediation, not a generic transient retry.
3. Mapper compatibility is allowed only when a missing field is unnecessary to production semantics
   and an established safe fallback exists. Mapper-invalid allocations stay outside writes/totals and
   can never be silently marked complete.
4. No migration is authorized. If required data has no safe fallback, stop with a bounded dry-run
   migration or staff-remediation proposal requiring separate review/approval.
5. A narrow legacy print-request completion Rules branch is conditional on an exact failing-before
   emulator fixture proving the real completion payload is denied solely by a mapper-compatible
   preserved legacy field. It must use the exact observed source status, allow only `status`,
   `updatedBy`, `updatedAt` unless the manifest proves another field, require active staff/caller
   identity/timestamp types, preserve immutable/legacy fields, and exclude the transition from the
   ordinary full-schema branch. Do not guess.
6. Avoid the completion-only post-write read or classify it separately so a committed request update
   is never retried as uncommitted.
7. Retry retains only exact failed request IDs in memory, retries only those, is idempotent, never
   regresses `completed|archived`, removes successful IDs, and becomes a no-op after success.
   Permanently invalid records are remediation-required rather than endlessly retryable.
8. Keep request documents outside the timer batch absent a new reviewed amendment.

Tests must cover current/exact observed legacy shapes; all affected eligible requests reaching
terminal; one transient request-write failure and exact retry; duplicate retry no-op; terminal
non-regression; committed-write/post-read classification; permanent-invalid remediation; and exact
missing-field classes. If Rules change, retain all 34 current tests and add active owner/admin/helper
success plus customer/inactive, unrelated-field, identity, timestamp, invalid-transition, and
preserved-legacy mutation denials.

### 27.3 Workstream B — one authoritative mounted Portal production stage

#### Proven split authority

`PrintRequestDetailView` computes rail `progressStage` from `listTab`, derived from persisted request
status plus `allocationTotalsByRequestId`. `usePortalShowPrintProgress` polling separately supplies
the same panel's `isLive`, pause state, and waiting label from the live show response. The poll never
updates the rail's `activeStage`. This exactly permits Running + Queued simultaneously. After Finish,
stale list-derived stage still says Queued; remount reloads persisted request/allocation state and
corrects it.

#### Required architecture

1. One pure stage resolver owns top label, status chip, Queued/Printing/Done rail, and detail-local
   terminal presentation.
2. Combine persisted request/allocation base stage with request-scoped live show state using monotonic
   precedence `done > printing > queued`. Live state may advance Queued → Printing → Done, but neither
   stale live nor persisted state may regress Done.
3. Continue the existing `getPortalShowPrintProgress` request-scoped poll and composed gate/controller:
   mounted + visible + effective-nonterminal only, one in flight across timer/focus/visibility/manual,
   invalidation on request switch/disable/terminal/hidden/unmount.
4. No second persisted lifecycle field, Firestore listener, broad query, corpus reload, or permanent
   terminal poll. If tab grouping needs terminal synchronization, patch/reload only the exact request;
   the rail fix cannot depend on a full-list refresh.
5. Measure developer-test latency; preserve the existing 5–10-second target and absent customer clock.

Behavior tests must execute Queued → Printing → Done without remount; chip/rail agreement in one
state update; terminal non-regression; remount parity; focus/visibility coalescing; request-switch
stale success/error rejection; hidden/terminal/unmount cleanup; no overlap; and no elapsed clock.

### 27.4 Workstream C — restore bounded historical shows as display-only calendar entries

Git history shows the bounded historical calendar was introduced in commit `36f4531c` (2026-07-12):
query from the start of current month minus two months and return past scheduled shows in that window
as non-allocatable calendar entries. `60993c1b` extended cutoff display; `0317a6d` made returned
closed/completed days inspectable. These primitives still exist.

Current filtering keeps allocatable future, cutoff-closed future, and past scheduled shows. It omits
a terminal `completed|fully_printed` show whose scheduled time is still future, even though the
already-lower-bounded query returned it. Finish therefore removes a just-finished future show. No
all-history query is needed.

Required restoration:

1. Within the existing lower-bounded query result, include terminal `completed|fully_printed` shows
   regardless of scheduled time. Keep `canceled|archived` and `isArchived` excluded.
2. Server eligibility remains authoritative: terminal/historical entries have
   `isAllocatable: false`, and the queue callable still rejects them transactionally.
3. Preserve typed `productionStatus` + `isAllocatable`; add a typed display reason only if necessary
   for accessible UI and explicitly review any response-type change.
4. Dates may remain inspectable, but historical slots must not invoke `onSelect`, become `selectedId`,
   run capacity/personal eligibility, or enable submission. Use actual disabled semantics where
   compatible plus visible/accessibly announced terminal wording, not color alone.
5. Default selection must prefer an eligible show and never choose a terminal entry merely because
   it is earlier. Historical-only dates remain inspectable without an Add-to-Show destination.
6. Reuse the current two-month history window and query; no all-history scan, N+1 request, or new
   historical personal-usage read.
7. Preserve open/full/cutoff behavior and personal/show-wide distinction; historical entries cannot
   carry stale selection errors.

Tests cover open future selectable; full/cutoff existing policy; just-finished future visible-disabled;
past visible-disabled; canceled/archived omitted; historical day inspectable; historical slot
keyboard/click non-selection; no historical submission/capacity validation; eligible default
selection; and unchanged bounded window.

### 27.5 Files, deployment gates, verification, and reduced QA

Likely files: Studio `upcomingShowService.ts`, `useShowProductionTimer.ts`,
`UpcomingShowsPage.tsx`, production diagnostics/tests, and possibly completion-only
`printRequestService.ts`; conditional `firestore.rules`/Rules tests. Portal/shared:
`PrintRequestDetailView.tsx`, `PortalPrintRequestProgressPanel.tsx`,
`usePortalShowPrintProgress.ts`, `portalPrintProgressStage.ts`, tests,
`functions/src/listPortalAllocatableShows.ts`, its tests, optional shared response type,
`PortalQueueToShowModal.tsx`, and `@fresh-prints/show-picker` view model/component/tests.

Changing `listPortalAllocatableShows` requires, after verification and Implementation Review 10, a
separate checkpoint for exactly:

`APPROVE DEV FUNCTION DEPLOY`

`firebase deploy --only functions:listPortalAllocatableShows --project fresh-prints-dev`

If and only if Rules change after failing-before proof, stop separately at:

`APPROVE DEV RULES DEPLOY`

`firebase deploy --only firestore:rules --project fresh-prints-dev`

Do not combine approvals, redeploy unchanged surfaces, migrate data, start QA early, or deploy
production.

Run focused Finish/retry, mounted stage/polling, Function historical-response, show-picker
accessibility/selection, exact-25/personal-use regressions, and full Rules tests when applicable;
then TypeScript version, Portal typecheck/build, Studio build, repository and changed-file lint,
Functions build when changed, and diff check. Record commands, exit codes, counts, Java, measured
latency, and changed-line intersections without weakening known baselines.

Independent Formal Review is required before implementation. Independent Implementation Review 10
must verify exact failed request phase/fields, compatibility/remediation choice, retry idempotency,
one stage authority, mounted monotonic transitions, bounded historical response, true historical
non-selection, preserved personal/exact-25 behavior, and deployment selectors.

Reduced owner QA after reviewed implementation and required dev deployments:

1. Start/Pause/Resume/Finish; normal valid Finish completes every affected request without retry.
2. Keep Portal detail mounted; chip and rail move together Queued → Printing → Done without refresh.
3. Finished show remains visible, clearly terminal, disabled, and impossible to select/submit while
   eligible shows remain unchanged.
4. Brief preserved smoke: personal usage, exact-25, show-switch clearing, clamp, Show Queue live
   update, removed-item persistence, Request Again, debug panel, no customer clock, and 200 DPI.

Do not sign off, start queued goals, or take production action before owner QA.

### 27.6 Formal Review constraints incorporated

Amendment 9 Formal Review verdict is `APPROVED_WITH_CHANGES`; its constraints are binding:

- reconciliation results explicitly distinguish no-write, remediation-required, pre-write failure,
  rejected write, committed write, and committed-write/post-read failure. A committed ID is never
  left retryable because a later read failed; retry scope resets on show/action-session change and
  never expands to unrelated requests;
- Firestore Rules remain unchanged unless the exact observed request-completion payload first fails
  in the emulator solely due to mapper-compatible legacy fields;
- the Portal composed detail session retains a per-request monotonic stage watermark
  (`done > printing > queued`), resets only on request identity change, drives every mounted detail
  indicator in one render, and stops polling on the effective terminal watermark;
- calendar date inspection and allocation destination selection are separate. Historical-only dates
  may reveal slots, but terminal/historical slots never call destination `onSelect`, never become
  `selectedId`, never run capacity/personal validation, and never enable submission. Automatic
  selection considers eligible options only;
- the Function retains exactly the existing lower-bound query
  (`scheduledStartAt >= start of current month minus two months`), adds no second show query/N+1, and
  receives its own deployment approval separate from any conditional Rules approval;
- Implementation Review 10 must require behavior-level composed-boundary evidence, not primarily
  regex/source-presence assertions.

## 28. Amendment 10 — Finish retry resolution, actionable record diagnostics, and read-only historical inspection

### 28.1 Owner QA disposition and preserved passes

Post-Amendment 9 owner QA is `FAIL`; return to Plan → independent Formal Review before
implementation. This is the next sequential amendment (**Amendment 10**); the next independent
Implementation Review is **Implementation Review 11**.

Preserve the owner-confirmed passes: Studio Start/Pause/Resume and visible Finished state; mounted
Portal Queued → Printing → terminal synchronization without refresh; personal-use copy; cumulative
exact-25 behavior and all ADR-FP-122 constraints; bounded historical visibility; and the full
regression smoke including customer-clock removal and the 200-effective-DPI floor.

Remaining failures and clarified behavior:

1. Finish leaves one transient request reconciliation ID and Studio shows
   `1 request update(s) still need retry.`
2. `Retry request updates` invokes no visible pending/success/failure lifecycle and the unresolved
   count remains, so the owner cannot determine whether an attempt occurred.
3. malformed-show and incomplete-allocation warnings continue during the lifecycle and must be
   causally classified rather than suppressed.
4. Amendment 9's fully disabled historical slot behavior is superseded. Historical/terminal shows
   must be focusable and selectable for **inspection**, while remaining impossible allocation
   destinations.

Amendment 9's `listPortalAllocatableShows` revision
`listportalallocatableshows-00018-fuj` remains active with 100% latest traffic. Do not redeploy it
unless Amendment 10 changes the exported Function.

### 28.2 Proven Finish phases and exact unresolved operation

The selected-show Finish path has three boundaries:

| Phase | Operation/path | Changed fields | Atomic/retry behavior |
|---|---|---|---|
| Show | batch update `upcomingShows/{upcomingShowId}` | `productionStatus`, `accumulatedPrintMs`, `activePrintStartedAt`, `printPausedAt`, `printFinishedAt`, `printFinishedBy`, `updatedBy`, `updatedAt` | atomic with allocation writes; never repeated by request retry |
| Allocations | batch update each mapper-valid `showAllocations/{showAllocationId}` | `status`, `completedAt`, `completedBy`, `updatedBy`, `updatedAt` | atomic with show write; never repeated by request retry |
| Request reconciliation | independent `updateDoc printRequests/{printRequestId}` after request/item/allocation reads | exactly `status: completed`, `updatedBy`, `updatedAt` | outside batch; exact failed IDs are independently retryable |

No Finish code updates `queueTab`, print-request items, notifications, analytics, or other
denormalized metadata. The owner-visible retry count therefore means the intended
`printRequests/{id}` completion transition did not commit for one request. Portal still reaches
terminal because its mounted authority advances from terminal show/allocation state, independently
of the request document's `status`.

The retry handler does retain the exact failed request IDs and calls
`retryShowCompletionReconciliation`. It does not clear the IDs before the async call. The apparent
no-op is a presentation/diagnostic defect: the button label never changes while
`isActionPending`, result-level failures are returned rather than thrown, and the hook collapses a
repeated failed result back to the same warning without surfacing the phase, intended fields,
Firebase code, attempt count, or changed unresolved count. Do not describe the exact denial cause
(Rules, mapper, invalid record, or another Firebase rejection) until the already-structured
development manifest from the real retry attempt supplies it.

### 28.3 Workstream A — resolve the request completion failure and retry lifecycle

1. Preserve the separate post-commit request reconciliation; never rerun the show/allocation batch.
2. Add a retry-session controller/view model with states `idle`, `retrying`, `succeeded`,
   `partial_failure`, and `failed`; track attempt count and exact unresolved transient IDs.
3. While retrying, disable repeat clicks and show visible `Retrying…` copy. On success, remove the
   warning/button and show bounded success feedback. On partial/full failure, retain only unresolved
   IDs and show a safe actionable message that distinguishes transient failure from remediation.
4. Emit a development-only sanitized retry manifest: attempt count, unresolved count, opaque request
   ID, intended path template `printRequests/{printRequestId}`, intended fields
   `status|updatedBy|updatedAt`, current/proposed status, phase, parser/missing/legacy-extra field
   classes, Firebase code, per-request outcome/commitment/retry eligibility, and final unresolved
   count. Never log names, email, artwork, notes, bodies, credentials, or tokens.
5. Use the real live manifest to choose the correction:
   - mapper/display-safe legacy shape: narrow compatibility only with an established safe default;
   - genuine missing production field: actionable staff remediation; no migration is authorized;
   - exact valid write denied by Rules: only then propose the narrowest Rules branch with a
     failing-before emulator fixture and a separate Rules checkpoint;
   - wrong service/payload: correct only the proven operation.
6. If the request is already `completed|archived`, reconciliation is a successful no-write and the
   ID is removed. A second retry after success is a no-op.
7. Retry state is scoped to the selected show/action session, does not resurrect after resolution or
   remount, and cannot expand to unrelated request IDs.
8. Prove no notification/analytics/item/queue-tab duplicate can occur because retry calls only the
   completion reconciliation service.

The implementation may first improve diagnostic/UI behavior if the exact live denial cause remains
unavailable locally. It must not guess a Rules relaxation or migration. If final resolution needs a
new Rules/Function surface, stop at the corresponding reviewed checkpoint before owner QA.

### 28.4 Workstream B — classify and deduplicate incomplete-record warnings

1. Trace each selected-show and allocation warning to its source query/listener and record field
   names only: missing/invalid required fields, legacy extras, Finish-required fields, display-only
   fields, safe defaults, and whether the record participates in the selected Finish.
2. Reuse the production diagnostics already shared by Finish. Mapper-compatible records accepted
   through an approved path must not be called malformed/incomplete.
3. Genuine invalid records that affect Finish must block before the atomic write with one actionable
   staff message. Unrelated invalid records remain excluded without blocking the selected show.
4. Add a request/session-scoped warning deduper keyed by document path + diagnostic field class so
   listener emissions/renders do not repeatedly log the same warning. A changed diagnostic may log
   once again.
5. Development logs contain opaque IDs and field names only; customer/document values remain
   prohibited.
6. No migration is authorized. A bounded dry-run migration proposal requires a later amendment and
   explicit dev-only approval.

### 28.5 Workstream C — separate historical inspection from allocation selection

The current root cause is one overloaded `isSelectable`/disabled state. Amendment 9 correctly
prevented terminal rows from becoming allocation destinations, but native `disabled` also prevents
focus, click, and keyboard inspection.

1. Introduce separate typed concepts using repository naming after implementation inspection, e.g.
   `canInspect` and `canAllocate`. Required matrix:

| Show | Inspect | Allocate |
|---|---:|---:|
| open eligible future | yes | yes |
| full future | yes | no |
| completed/fully printed | yes | no |
| bounded past/cutoff | yes | no |
| invalid/omitted | no | no |

2. Maintain separate modal state for `inspectedShowId` and allocation destination ID. Clicking or
   keyboard-activating a historical/full row updates inspection details only and clears/does not set
   the destination.
3. Inspection presents only already-returned safe bounded fields: date/time, terminal/status label,
   show-wide capacity/totals, and customer personal usage when present. Add no N+1 read, listener, or
   new capacity validation call.
4. Inspectable rows remain native focusable buttons, communicate terminal/non-allocatable state, and
   open details through Enter/Space. Do not use `disabled` on an inspectable row; use a distinct
   non-allocatable announcement.
5. Add-to-Show remains unavailable unless the inspected/destination show is authoritatively
   allocatable and all existing fit/capacity checks pass. The submit handler must reject any
   non-allocatable selection even if invoked directly.
6. The queue callable's transactional eligibility is unchanged and remains final defense.
7. Automatic destination selection considers allocatable shows only. Historical-only inspection
   cannot retain a stale eligible destination or stale show error.
8. Preserve the existing two-month lower-bound Function query and Amendment 9 response; do not
   redeploy the unchanged Function if client data already suffices.

### 28.6 Tests, files, gates, and reduced QA

Likely Studio files: `upcomingShowService.ts`, `printRequestService.ts`,
`useShowProductionTimer.ts`, `UpcomingShowsPage.tsx`, reconciliation/diagnostic utilities, warning
sources and adjacent tests; conditional `firestore.rules` and Rules tests only after exact proof.
Portal/shared files: `PortalQueueToShowModal.tsx`, its show-loading/queue hook and tests,
`@fresh-prints/show-picker` types/component/selection controller/tests, and existing bounded Function
tests only if response behavior changes.

Behavior tests must cover:

- all-success Finish; one failed completion retained; visible retry pending; success clears;
  partial/full failure; mapped error; second retry no-op; remount non-resurrection; terminal
  non-regression; Portal remains terminal; no duplicate side effects;
- compatible legacy records without false warnings; one actionable warning for genuine invalid show
  or allocation; dedupe across repeated emissions; sanitized field-only output;
- open/full/finished/past inspection matrix; pointer and keyboard historical inspection; read-only
  details; personal usage when present; destination clearing; disabled/absent Add action; direct
  submit guard; zero historical validation/submission calls; unchanged open behavior; bounded query.

Run the full requested focused suites, Rules suite, Portal typecheck/build, Studio build, repository
lint, changed-file lint, Functions build only if Functions change, and diff check. Record exact
commands/counts/exits and known baselines without suppressions.

Independent Formal Review is required before implementation. Independent Implementation Review 11
is required after verification. A changed Function requires a narrow
`APPROVE DEV FUNCTION DEPLOY`; a proven Rules change requires a separate
`APPROVE DEV RULES DEPLOY`. Client-only changes require full client restart but no Firebase deploy.
No production action, migration, queued-goal work, or signoff is authorized.

Reduced owner QA after approved implementation and any required deployments:

1. Finish leaves zero normal unresolved updates; controlled retry visibly progresses and resolves or
   explains the exact safe failure class.
2. Click and keyboard-open a finished show for read-only details; Add remains unavailable and no
   submission occurs.
3. Brief preserved smoke: mounted progress, personal usage, exact-25, show switching, clamp, live
   queue update, removed-item persistence, Request Again, debug panel, absent customer clock, and
   200-DPI floor.

### 28.7 Formal Review constraints incorporated

Amendment 10 Formal Review verdict is `APPROVED_WITH_CHANGES`; its constraints are binding:

- retry stays post-commit and uses only the transient in-memory unresolved IDs from that action
  session; it never repeats or expands into show/allocation/item/queue-tab/notification/analytics
  work;
- retry state is derived from structured per-request outcomes. It enters `retrying` synchronously,
  disables repeat activation, increments once, atomically replaces scope with returned transient
  failures, treats already-terminal as success, separates remediation, and invalidates on show/action
  switch. Zero unresolved is the only success;
- the real dev retry manifest must precede any compatibility, Rules, or data correction. No Rules
  change without an exact failing-before valid three-field update; no migration or silent repair;
- warnings use one participation-aware diagnostic vocabulary. A selected-show invalid allocation
  that could change Finish writes/math blocks before the batch; unrelated invalid records remain
  non-blocking. Deduplication is mounted-session scoped by path plus normalized field class;
- picker types and state separate `canInspect`/`canAllocate`, `inspectedId`, and allocation
  destination. Historical/full/cutoff rows remain focusable native buttons with accessible read-only
  wording; activation clears stale destination/error state and never validates or submits;
- submit and acknowledgment handlers independently re-resolve the current DTO and require
  `isAllocatable === true` plus existing fit gates; the unchanged callable remains final authority;
- preserve the existing bounded response/query and add no listener, per-show lookup, validation
  request, or N+1 read. Do not redeploy the unchanged Function;
- executable composed controller/component tests are required for retry states/invalidation,
  participation-aware warning blocking/dedupe, pointer/keyboard inspection, direct submit defense,
  and all preserved regressions. Implementation Review 11 must verify them.

## 29. Amendment 11 — Owner Runtime QA `FAIL` (Fifth Pass): Cross-Field Assignment Diagnostic, Show-Selection-Loss Root Cause, and Historical Default Inspection

### 29.1 Owner QA disposition

Post-Amendment 10/Implementation Review 12 owner QA is `FAIL`. Production lifecycle, mounted Portal
progress (Queued -> Printing -> Done/Printed without refresh, no fallback to Queued, customer elapsed
clock absent), and bounded historical-show inspection all pass and must not regress. Three items
remain:

1. One post-Finish `printRequests/{id}` completion write remains unresolved, and the owner does not
   understand its purpose since Portal progress is already correct.
2. The Retry control appears completely inert - no `Retrying...`, no success, no failure, no count
   change, no explanation.
3. Historical-show inspection requires an extra click before details appear, and its copy/personal-
   usage display incorrectly implies remaining capacity on a show that can no longer accept requests.

### 29.2 Workstream A - is `printRequests.status = "completed"` still required?

**Answered from an exhaustive repository-wide audit of every reader/writer, not assumed.**
`"completed"` is a fully valid, current member of the shared `PrintRequestStatus` union
(`packages/shared/src/types/printRequest/printRequest.enums.ts`) - not a legacy/dead value. It is
genuinely load-bearing for multiple current production readers, distinct from the Portal
progress UI (which correctly derives its terminal state from the show's `productionStatus`/
allocations, not this field, and needs no change):

- `isPrintRequestFullyPrinted()` (`packages/shared/src/utils/printRequestQueueState.ts`) treats
  `status === "completed"` as an unconditional short-circuit, gating two real Studio behaviors:
  exclusion from the "add request to show" picker (`UpcomingShowsPage.tsx`) and locking the
  print-request detail panel from further edits (`PrintRequestsPage.tsx`).
- `PrintRequestsPage.tsx`'s queue-lock logic does a direct, unmediated `status !== "completed"`
  check.
- `derivePrintRequestListTab()` (`packages/shared/src/utils/printRequestListGrouping.ts`) has an
  explicit `status === "completed"` branch that force-sets the persisted `queueTab` mirror to
  `"printed"`, independent of allocation totals - `queueTab` is what Studio's Print Requests list
  actually filters/queries by, so this write is load-bearing for that list, not merely cosmetic.
- Deletion/archival eligibility (`functions/src/lib/deletionEligibility.ts`,
  `functions/src/deleteEligiblePrintRequest.ts`) and the idle-upload full-size purge Cloud Function
  (`functions/src/purgeIdleCustomerUploadFullSize.ts`) all classify `"completed"` as explicitly
  non-"working," changing real owner-facing delete/archive routing and real Storage-purge
  eligibility.
- `docs/architecture/DATA_MODEL.md` documents these `status` transitions (including -> `completed`)
  as intentional, current product behavior - distinct from, and in addition to, the allocation-
  derived queue/print tab it separately documents.

**Decision Branch B applies: the write is required.** No removal of the write or its retry UI is
authorized by this amendment. The fix must identify and correct the actual live failure, not delete
the mechanism.

### 29.3 Root cause - the live write failure is evidence-gated on a genuine diagnostic gap, not yet a proven Rules defect

**Confirmed from source, precisely.** Firestore Rules' `printRequestRequiredFieldsValid` (checked
against the FULL resulting document on every `updateDoc`, including this 3-field partial update,
since Firestore merges before Rules evaluate) requires, via
`isValidPrintRequestAssignment`/`isValidPrintRequestOriginAssignment`
(`firestore.rules`), that a non-internal print request have **exactly one** of `customerId` /
`guestCustomerId` present and non-empty, and that `requestOrigin` (when present) agree with
`isInternal` and which of those two fields is set. **Neither of this codebase's two client-side
diagnostic functions checks this invariant today:**
`diagnosePrintRequestForCompletion` (`apps/studio/.../utils/printRequestCompletionDiagnostics.ts`,
called by `getPrintRequestForShowReconciliation` before the write is attempted) only checks basic
field presence/type and a legacy-extra-field name list; `mapPrintRequestData`
(`apps/studio/.../services/printRequestService.ts`) has the same gap and additionally never reads
`guestCustomerId` from the raw document at all. **A live document could therefore pass both of this
codebase's own "compatible" checks and still be denied by Rules on this exact write**, and neither
function currently has any way to detect, report, or rule out that specific failure mode. This is a
real, precisely-identified gap - not a confirmed root cause, since this session cannot execute the
live write against the actual document. Per the Plan's standing evidence-first constraint, this
amendment closes the gap in the diagnostic (so the NEXT live retry attempt's manifest can prove or
rule out this exact hypothesis) rather than guessing a Rules relaxation.

**Required correction (evidence-improving, not a guessed fix):**
1. Extend `diagnosePrintRequestForCompletion` to independently evaluate the exact same cross-field
   assignment invariant Rules enforces (mirrored client-side, read-only diagnostic - not a
   permission or behavior change): given `isInternal`, `customerId`, `guestCustomerId`,
   `requestOrigin`, determine whether the assignment is valid per the Rules' own logic, and if not,
   report which named condition failed (e.g. "both customerId and guestCustomerId present",
   "neither customerId nor guestCustomerId present", "requestOrigin/isInternal mismatch") as a
   new diagnostic field, sanitized (field-name/condition-name only, never the actual ID values).
2. Thread this new diagnostic field through `getPrintRequestForShowReconciliation`'s remediation
   path and the retry manifest, so if the next live retry attempt reveals this exact condition, it
   is immediately actionable (staff remediation of the specific print-request document) without a
   sixth diagnostic round.
3. Do not change `firestore.rules`. Do not add a compatibility default. Do not migrate any document.
   If the next live retry attempt's manifest proves this hypothesis, the correction is staff
   remediation of that one document's assignment fields (an operational fix, not a code change) or,
   if a systemic legacy-data pattern is found across many documents, a separately-approved bounded
   migration proposal - neither is authorized by this amendment.
4. This closes 29.1 item 1's "the owner does not understand what this write does" complaint
   directly: the amendment's response documents the write's actual required readers (29.2) so this
   is answered from evidence, independent of whether the specific denial cause is ever found.

### 29.4 Root cause - the Retry control appears inert because the finished show silently falls out of the visible tab

**Confirmed from source, precisely - this is not a click-handler defect.** `UpcomingShowsPage.tsx`
buckets shows into `"upcoming"` / `"past"` tabs via `filterShowsByScheduleTab`/`getShowScheduleTab`
(`packages/shared/src/utils/showScheduleGrouping.ts`), which classifies **purely by scheduled start
time versus now** - completely independent of `productionStatus`. When Finish completes and the
page's `onShowUpdated` refresh (`reloadUpcomingShows`/`reloadAllocations`) re-runs, if the just-
finished show's `scheduledStartAt` has by then passed relative to "now" (an ordinary, expected
situation for a live production run that started earlier), the show's schedule-tab classification
can flip from `"upcoming"` to `"past"` between the moment Finish is clicked and the moment the
refresh resolves. `UpcomingShowsPage.tsx`'s own effect
(`resolveVisibleShowSelection(visibleShows, selectedShowId)`, keyed on `visibleShows`) then finds the
just-finished show is no longer present in the active tab's list and silently reassigns
`selectedShowId` to a different show (or `null`) via `resolveVisibleShowSelection`
(`packages/shared/src/utils/showScheduleGrouping.ts`), which only preserves the current selection if
it's still present in `visibleShows`, otherwise falling back to the first show in the list. This
changes `selectedShow`, which changes `show?.id` passed into `useShowProductionTimer`, which fires
that hook's existing per-show-id reset effect - **silently wiping the just-set retry
warning/button/state within the same tick the owner was looking at it**, with no click involved. This
exactly explains "the button appears to do nothing" - the timer panel the owner was looking at (and
its warning/Retry button) is swapped out for a different show's (or an empty) panel, not because the
click failed, but because the underlying selection changed out from under it.

**Required correction:**
1. `UpcomingShowsPage.tsx`'s active-tab/selection-resolution logic must not silently abandon the
   just-acted-upon show purely because its schedule-tab classification changed as a side effect of
   time passing during a Finish action. When the show that was just Finished (i.e., the show
   `productionTimer` most recently acted on) is the one that would otherwise be dropped from the
   active tab's visible list, either (a) keep it selected regardless of tab reclassification for the
   remainder of this mounted session until the owner explicitly navigates away, or (b) auto-switch
   the active tab to wherever that show now lives, so the owner's view of it - and its retry
   warning/button - is preserved. Prefer whichever the existing `activeScheduleTab`/
   `selectedShowId` state model supports most narrowly; do not introduce a third selection-authority
   concept.
2. This must not resurrect a stale selection for a show the owner has genuinely navigated away from
   by their own action (tab switch, explicit different-show click) - the fix is specifically for the
   automatic, refresh-triggered reclassification case, not a general "always keep whatever was
   selected" change.
3. Add a regression test proving that finishing a show whose scheduled time has passed by the time
   the post-Finish refresh resolves does not silently change `selectedShowId`/lose the retry
   warning state.

### 29.5 Workstream C - invalid production record correlation

**Confirmed by direct trace: the two "excluded invalid production record" warning call sites
(`upcomingShowService.ts`, both inside `getOrCreateShowAllocationsSubscription` and
`getOrCreateUpcomingShowSubscription`) are structurally scoped only to `showAllocations` and
`upcomingShows` documents respectively - never `printRequests` documents.** The unresolved
request-completion write concerns a `printRequests/{printRequestId}` document, read via a completely
separate path (`getPrintRequestForShowReconciliation`/`printRequestService.ts`) that does not share
this warning mechanism at all. **There is no direct correlation by construction** - these warnings
cannot be reporting on the same document as the unresolved request, though they may concern stale
allocation/show data for the *same show* unrelated to the specific request. To make this provable
rather than merely argued, the warning payload must include the collection name (already implicit in
the `documentPath` prefix, e.g. `showAllocations/{id}` vs `upcomingShows/{id}`) so a future reader can
confirm this at a glance; no code change is required here since `documentPath` already encodes the
collection - this amendment records the finding and requires no further action beyond the diagnostic
extension in 29.3, which covers the `printRequests` side directly.

### 29.6 Workstream D - historical-show default inspection and copy corrections

**Confirmed from source.** `ShowTimeSlotOption` (`packages/show-picker/src/ShowPicker.tsx`) already
renders the entire card as one native `<button>` - the owner's "must click the progress bar"
description reflects where their eye landed, not a genuinely narrower click target; no separate
nested click handler exists. The actual gap: `ShowPicker.tsx`'s `handleSelectDate` calls
`resolveShowPickerSelection(slots)`, which only ever resolves an **allocatable** destination
(`getDefaultShowPickerOptionId` without `allowInspectOnly`) - when a date has exactly one historical
(non-allocatable) show, selecting that date renders the card but never calls `onInspect`, leaving the
read-only detail panel empty until an explicit second click.

**Required correction:**
1. When a selected date's shows contain no allocatable option (i.e. `resolveShowPickerSelection`
   would otherwise clear the destination) and exactly one show exists for that date, automatically
   inspect that show (call the same path `onInspect` uses) instead of leaving the panel empty. Use
   `getDefaultShowPickerOptionId(..., allowInspectOnly: true)` semantics, already present in
   `getDefaultShowPickerOptionId.ts`, rather than inventing new selection logic.
2. When a date has more than one show and no allocatable destination among them, do not guess - do
   not auto-inspect any of them; each remains individually clickable/keyboard-activatable as today.
3. Do not change the full-card click/keyboard activation mechanism itself (it is already correct,
   whole-card, native-button behavior) - this is a selection-resolution default only.
4. Replace the customer-facing copy exactly. **Two distinct call sites carry this string and both
   are in scope** (confirmed by this amendment's Formal Review, which found a second location not
   in the original draft):
   - `PortalQueueToShowModal.tsx`'s rendered callout: from
     "Read-only show. This show is not available for adding." to
     "This show has already been printed, so no new print requests can be added." — add, when the
     current UI has room: "You can still review your print activity for this show."
   - `packages/show-picker/src/ShowPicker.tsx`'s `ShowTimeSlotOption` `aria-description` attribute
     (currently "Read-only show. Not available for adding.", assistive-tech-rendered and therefore
     also customer-facing): replace with equivalent non-"read-only" wording consistent with the
     corrected copy above (e.g. "This show has already been printed. Not available for adding.").
   - do not use the words "read-only" in either customer-facing string (internal code/comments may
     keep the term).
5. `buildPortalPersonalShowUsage`/`resolveSelectedPortalPersonalShowUsage`
   (`apps/portal/features/print-requests/utils/portalPersonalShowUsage.ts`) must accept whether the
   inspected show is allocatable and, when it is not, omit `remainingLabel` from the returned object
   (or return it as `undefined`) rather than always including it - `PortalQueueToShowModal.tsx`'s
   render must not display the remaining-spots line for a non-allocatable (historical/full/past)
   show, while continuing to show it for open allocatable shows. Keep `usedLabel` in both cases.
6. Historical inspection continues to never set the allocation destination, never call capacity
   validation, and never call the queue service - unchanged from Amendment 10's already-approved and
   reviewed behavior; this amendment only changes the copy and the personal-usage display.

### 29.7 Required behavior-level tests

- A new test proving the extended `diagnosePrintRequestForCompletion` correctly flags each of the
  three named assignment-invariant failure conditions (both IDs present, neither present,
  `requestOrigin`/`isInternal` mismatch) and correctly passes a genuinely valid document, matching
  the exact Rules logic being mirrored.
- A new regression test proving that a show whose scheduled time passes between Finish and the
  post-Finish refresh does not lose its selection/retry-warning state, while a genuine explicit
  navigation away still changes the selection normally.
- Extend the show-picker composed tests to prove: a date with exactly one non-allocatable show
  auto-inspects it; a date with multiple non-allocatable shows does not auto-inspect any of them;
  open-show default-selection behavior is unchanged.
- A new test proving the corrected customer-facing copy string renders exactly, and the old
  "Read-only show" string no longer appears anywhere in customer-facing render output.
- A new test proving `resolveSelectedPortalPersonalShowUsage` omits `remainingLabel` for a
  non-allocatable show and includes it for an allocatable one, and that
  `PortalQueueToShowModal.tsx`'s render only displays the remaining-spots line when present.
- Re-run all existing regression suites from every prior amendment on this goal to confirm the
  production lifecycle, mounted Portal progress, ADR-FP-122 cumulative-25 behavior, and bounded
  historical visibility all remain passing.

### 29.8 Required process for this amendment

This amendment requires its own focused independent Formal Review before any code changes - the
reviewer must independently verify the Workstream A/B/C evidence (not merely accept this amendment's
narrative), confirm the diagnostic extension in 29.3 does not itself change any write behavior or
weaken Rules, and confirm the show-selection-loss fix in 29.4 does not reintroduce a stale-selection
regression. If approved (with or without changes) and no new unresolved product decision is created,
Implement proceeds under the owner's standing authorization for this reopened goal. This remains
client-only unless live evidence from a future retry attempt proves a genuine Rules defect, which
would require its own further amendment and a separate `APPROVE DEV RULES DEPLOY` checkpoint - not
authorized here. A new independent Implementation Review is required after verification, and must not
defer to Implementation Review 12.

## 30. Amendment 12 - Owner Runtime QA `FAIL` (Sixth Pass): Reconciliation Retry Persistence and Historical Capacity-Banner Suppression

### 30.1 Owner QA disposition

Post-Amendment 11/Implementation Review 13 owner QA is `FAIL`. Full production lifecycle (Start/
Pause/Resume/Finish, mounted Portal progress without refresh, customer elapsed clock absent) and
historical inspection (auto-appear, corrected copy, used-count/hidden-remaining, disabled Add,
inspectable) both pass and must not regress. Two items remain, one blocking and one display-only per
the owner's own annotation:

1. **Blocking:** the post-Finish reconciliation Retry control still appears inert (no `Retrying...`,
   no success, no failure, no count change), and a new regression: navigating away from Show Queue
   and back removes the warning and Retry button entirely, even when the underlying requests are
   still genuinely unresolved.
2. **Display-only:** historical/completed shows can still show the capacity-exhausted banner
   ("You've used all 25 of your print spots on this show...") that should only ever render for an
   open show the customer is actively evaluating as an allocation destination.

### 30.2 Workstream A/B - Retry button root cause, traced to the actual rendered path (not assumed)

Traced end-to-end through the real production call path: `UpcomingShowsPage.tsx:1175-1191` (rendered
button/warning JSX) -> `useShowProductionTimer.ts` (`retryReconciliation`, `actionWarning`,
`canRetryReconciliation`, `failedReconciliationRequestIds` state) -> `upcomingShowService
.retryShowCompletionReconciliation` (`upcomingShowService.ts:1629-1649`) -> `markPrintRequestCompletedIfFullyPrinted`
-> `reconcileCompletedPrintRequest` -> `printRequestService.markPrintRequestCompletedForShowReconciliation`
(the real `updateDoc printRequests/{id}` write). The service call chain is confirmed real, not dead
code, and not the defect.

**Two independent, compounding defects found, both in `useShowProductionTimer.ts`:**

1. **Silent early-return on stale/empty scope (lines 212-214).** `retryReconciliation` begins with
   `if (!user || !show || !session || failedReconciliationRequestIds.length === 0) return;` - if
   `failedReconciliationRequestIds` is empty at click time for any reason (including the remount
   defect below, or a remediation-only outcome that never populated retryable IDs), the click
   produces **zero observable effect**: no state change, no error, no dev log, no network call. This
   is the exact mechanism behind "the button appears completely inert" - the click is received and
   the handler is entered, but it exits before doing anything observable, and there is currently no
   distinct UI state for "button visible but nothing to retry" versus "button visible and a retry is
   possible."
2. **Ephemeral-only warning state, unconditionally reset on every `show?.id` change (lines 69-77).**
   `actionWarning`, `canRetryReconciliation`, `failedReconciliationRequestIds`, `remediationRequestIds`,
   `retryStatus`, and `retryAttemptCount` are all plain `useState`, populated **only** as a one-time
   echo of whatever a single prior Finish/Retry call happened to return
   (`runAction`'s `markFinished` branch, lines 177-188). There is no mechanism anywhere that
   reconstructs this state from actual Firestore truth on mount or remount. The `useEffect` at lines
   69-77 unconditionally blanks all of it whenever `show?.id` changes - which is exactly what happens
   when the owner navigates away from Show Queue and back (the hook is either remounted or `show`
   transitions through a different id and back). This confirms the owner's own listed hypothesis
   precisely: **the warning is only ephemeral component state, never reconstructed from the real
   unresolved request state** - so navigating away and back doesn't mean the requests got resolved,
   it means the UI forgot to check.

**Correction, evidence-based, not guessed:**

- Add a bounded, show-scoped reconstruction effect: on mount and whenever `show?.id` changes to a
  *finished* show (`productionStatus === "completed"`), call the existing, already-bounded
  `upcomingShowService.listShowAllocations(caller, show.id)` (already used elsewhere in this file's
  surrounding feature, `upcomingShowService.ts:829`) to get this show's own non-canceled allocations,
  derive their distinct `printRequestId`s (a small, show-scoped set - never an unbounded scan of all
  print requests), and re-run the same reconciliation-status classification
  (`getPrintRequestForShowReconciliation` + `resolveShowReconciliationRetryOutcome`) against exactly
  those IDs to determine the true current unresolved/remediation state. This must correctly produce
  **both** directions: a genuinely-still-unresolved show must show the warning/Retry button again
  after remount (not stay silently hidden), and an already-resolved show must not resurrect a stale
  warning. Route this reconstruction through the existing `ShowProductionRetrySession` the same way
  a normal retry settlement is (`isStillAuthoritative` before applying), so a stale reconstruction
  response arriving after a further show switch is discarded exactly like a stale retry settlement is
  today.
- Distinguish, in the Retry UI contract, three states instead of one binary warning/no-warning:
  retryable (>0 unresolved, retry-eligible), remediation-only (0 unresolved, >0 remediation - not
  retryable by definition, per Amendment 10/`resolveShowReconciliationRetryOutcome`'s existing
  contract), and none (fully resolved - no warning at all). The remediation-only case must render a
  distinct, non-actionable message rather than either a silently-absent warning or an inert button
  with nothing to click.
- Add the required dev-only sanitized click-trace log at the top of `retryReconciliation`, entered
  unconditionally on every activation attempt (including the early-return path), with the schema:
  `[useShowProductionTimer] request reconciliation retry activation` carrying `showIdHash`,
  `renderedRetryableCount`, `renderedRemediationCount`, `handlerEntered`, `sessionAcquired`,
  `serviceInvoked`, `serviceSettled`, `settlementAuthoritative`, `resultKind`,
  `remainingRetryableCount`, `remainingRemediationCount`, `errorCode` - no request contents or
  customer-identifying values. This is additive to (not a replacement for) the existing
  `[useShowProductionTimer] request reconciliation retry result` log from Amendment 11, and closes
  the gap where a silent early return currently produces no diagnostic trace at all.

### 30.3 Workstream D - live failure classification (evidence-gated, as in every prior amendment)

Whether the specific live denial the owner saw was a Rules-eligibility defect, a malformed request
document, a service-payload defect, or transient is not resolvable from source review alone and
remains evidence-gated pending a live reproduction, exactly as in Amendments 8-11. The new click-trace
log in 30.2 is the mechanism that will let the next live Retry attempt report a structured,
sanitized classification (`relationshipInvariant`, `missingFields`, `wrongTypedFields`,
`requestOriginClass`, `rulesEligibilityClass`, `writeOutcome`) instead of another round of diagnostic
extension. No Rules or Function change is proposed in this amendment; none is justified by source
review alone.

### 30.4 Workstream E - historical capacity-banner suppression, root cause

Traced through `PortalQueueToShowModal.tsx`'s actual render path. The modal's own state machine
(`effectiveSelectedId`/`effectiveInspectedId`/`effectiveFit`, lines 227-268) already correctly nulls
`selectedShowId` (and therefore `effectiveFit`, guarded at line 240) whenever a historical/
non-allocatable show is inspected via every traced interaction path
(`ShowPicker`'s per-option activation at `ShowPicker.tsx:503-507`, only calling the destination-select
callback when `canAllocate` is true; the modal's own `onInspect`/`onSelect`/`onClearSelection`
handlers, `PortalQueueToShowModal.tsx:489-519`; and the auto-inspect resolution in
`resolveShowPickerSelection`/`ShowPicker.tsx:353-390`). The existing per-submission generation-counter
protection in `useQueuePrintRequestToShow.ts` (`clearError`/`generationRef`) also already correctly
scopes and discards a stale submit error on show switch, and is invoked from every inspect/select
handler.

**The actual defect is one layer up, in `usePortalAllocatableShows.ts`:** the allocatable-shows list
is served from a module-level, cross-mount session cache (`sessionCachedShows`, up to a 60-second TTL,
`usePortalAllocatableShows.ts:11-14,66-83`) with a silent background refresh. A show whose
`isAllocatable` has genuinely changed to `false` server-side (e.g., it was just completed/printed)
can still read as allocatable from this stale cache for up to that window, or until the silent
background reload resolves. Because the default-selection effect
(`PortalQueueToShowModal.tsx:206-224,336-349`) and `inspectedShow?.isAllocatable === false` gate
(line 524) both trust this cached list at face value, a genuinely-historical show can still compute a
real (not merely cosmetic) `effectiveFit` against stale capacity numbers and render the
capacity-exhausted banner - this is a display defect in the sense the owner's annotation describes
(the underlying allocation/completion state itself is correct; only the customer-facing capacity
banner is fooled by a stale read), not a re-opening of the capacity/Rules logic itself.

**Correction (revised after independent Formal Review - see 30.6a):** the first draft of this fix
proposed invalidating the cache when the modal enters historical inspection via `onInspect`. That
trigger only fires on the branch where the cache already correctly reports `isAllocatable === false`
- it is a no-op against the actual failing case, which is the opposite: the cache stale-reports
`isAllocatable === true` for a show that has since become historical, so the modal never takes the
inspection branch at all and instead auto-selects the show as a normal allocation destination
(`PortalQueueToShowModal.tsx:206-224,336-349`).

The corrected fix targets the real exposure window directly: the interval between the modal opening
against a possibly-stale cached list and the existing silent background reload
(`usePortalAllocatableShows.ts`'s `reload({ silent: true })`, already fired unconditionally on every
enable per lines 66-83) resolving at least once. Concretely: `usePortalAllocatableShows` exposes a new
`hasConfirmedFreshness` flag - `false` from the moment a cache-warm mount starts until the in-flight
background `reload` (silent or not) for *this* enable has settled at least once, `true` thereafter.
`PortalQueueToShowModal.tsx`'s `canConfirmFull` (line 271-278) must additionally require
`hasConfirmedFreshness` before allowing a submission to proceed, and the capacity-exhausted banner
(`isBlocked && effectiveFit`, line 551) must not render until the same flag is true for the currently
selected show - both already have `isLoading`/`isLoadingAllocations` gates to extend, not new gates to
invent. Once the first reload resolves, `shows`/`isAllocatable`/`effectiveFit` are live-current for the
rest of the modal's open lifetime (the existing cache is only ever consulted again for the *next* cold
open), so this closes the window without discarding the cache's benefit for the common case (open-show
browsing after the first confirmation is unaffected), and without weakening the real, correct
capacity-exhausted banner for a genuinely open, currently-evaluated show that has truly exhausted the
customer's personal or show-wide limit - that banner still renders, only slightly deferred until the
freshness check confirms it's not stale.

### 30.5 Required tests (production-used logic, not isolated pure helpers alone)

- A composed harness test (mirroring this repo's no-DOM-rendering convention, driving the actual
  `retryReconciliation` closure and `ShowProductionRetrySession` together, not a reimplemented stand-in)
  proving: (a) a click with zero retryable IDs produces the new inert-click log entry and no state
  mutation, distinguishing it from a genuine retryable click; (b) a remount/`show?.id`-change for a
  still-genuinely-unresolved show re-populates the warning/Retry button from the bounded
  reconstruction check, not leaving it silently blank; (c) the same remount for an already-resolved
  show produces no warning at all, never a resurrected stale one; (d) a stale reconstruction response
  arriving after a further show switch is discarded via `isStillAuthoritative`, exactly like a stale
  retry settlement; (e) a bounded reconstruction read in flight when the user clicks Retry (and the
  reverse ordering) does not double-write or produce a lost update - both paths are idempotent status
  transitions gated on real allocation state, but this must be proven, not assumed (Formal Review
  finding).
- A test proving the three-state Retry UI contract (retryable / remediation-only / none) renders the
  correct copy/control combination for each, using the actual `resolveShowReconciliationRetryOutcome`
  contract, not a re-branched duplicate.
- A test proving the new click-trace log fires on every activation attempt including the early-return
  path, with the exact required field set and no request-content/customer-identifying values.
- A composed test proving `hasConfirmedFreshness` starts `false` on a cache-warm mount and becomes
  `true` only once the background reload for that enable has settled; a test proving
  `canConfirmFull`/the capacity banner cannot compute/render against `effectiveFit` while
  `hasConfirmedFreshness` is `false` for the selected show; and a test proving that once freshness is
  confirmed, a genuinely open, capacity-exhausted show still renders its (correct) banner and
  submission is still correctly blocked - unaffected by this change.
- Full regression re-run of every existing suite across all eleven prior amendments on this goal,
  confirming production lifecycle, mounted Portal progress, cumulative-25 (ADR-FP-122), personal
  usage wording, show switching, typed clamp, Show Queue live updates, removed-item persistence,
  Request Again, Firebase Debug availability, and the 200-effective-DPI floor all remain unchanged.

### 30.6 Required process for this amendment

This amendment requires its own focused independent Formal Review before any code changes - the
reviewer must independently verify the two compounding root causes in 30.2 against current source
(not accept this narrative on trust), confirm the bounded reconstruction design in 30.2 does not
become an unbounded scan and correctly routes through `ShowProductionRetrySession`, and confirm the
30.4 correction does not weaken the genuine open-show capacity-exhausted banner or bypass any existing
capacity/Rules logic. This remains a client-only change unless a future live Retry reproduction (30.3)
proves a genuine Rules or Function defect, which would require its own further amendment and separate
`APPROVE DEV FUNCTION DEPLOY`/`APPROVE DEV RULES DEPLOY` checkpoints - not authorized here, and never
combined into one approval. A new independent Implementation Review (14) is required after
verification, and must not defer to Implementation Review 13 or any earlier review.

### 30.6a Formal Review round 1 finding and correction

An independent Formal Review agent (dispatched before implementation, per this workflow's mandatory
gate) confirmed both Workstream A/B root causes and the corresponding design against current source
without qualification, and confirmed no Rules/Function change is proposed and no existing generation
guard is weakened. It found the first draft's Workstream E correction (an `onInspect`-triggered cache
invalidation) was a no-op against the actual failure path, since that trigger only fires on the branch
that was already correct. 30.4 above reflects the corrected design (a `hasConfirmedFreshness` gate on
`canConfirmFull`/the capacity banner, closing the real stale-auto-select window) produced in response
to that finding, along with an added concurrency test requirement for Workstream A/B's reconstruction
effect. Verdict on the corrected design: **approved to proceed to implementation** - Workstream A/B
was approved as originally specified and required no changes; Workstream E's corrected design in 30.4
directly addresses the reviewer's finding and does not require a further review round before
implementation, but must be independently re-verified (not merely re-asserted) by Implementation
Review 14.

## 31. Amendment 13 - Owner Runtime QA `FAIL` (Seventh Pass): False-Positive Post-Finish Retry Warning from a `serverTimestamp()` Read-Your-Own-Write Race

### 31.1 Owner QA disposition

Post-Amendment 12/Implementation Review 14 owner QA: Test 1 (`FAIL`), Test 2 (`PASS`), Test 3
(`PASS`). Historical capacity messaging and the full regression smoke suite both pass and must not
regress. The remaining item: immediately after Finish, Studio displays "Printing finished, but 1
request update(s) need retry." with an inert-feeling Retry button, no visible Firebase error, and the
warning disappears (correctly, per Amendment 12's reconstruction effect) once the owner navigates away
and back - because by that point the underlying request is, and was always about to be, genuinely
resolved. The owner's own evidence points precisely at the right place: **the immediate Finish result
and the bounded post-navigation reconstruction check disagree about the same, unchanged persisted
state**, which is only possible if one of the two reads is not authoritative at the moment it runs.

### 31.2 Workstream A/B/D - tracing the disagreement to its exact source, not assumed

Traced end-to-end through actual current source, not guessed:

- `upcomingShowService.markShowPrintingFinished` (`upcomingShowService.ts`, post-Finish reconciliation
  loop) commits a `writeBatch` that sets `updatedAt: serverTimestamp()` on every allocation being
  finished (among other fields), then **immediately** (same async function, no intervening yield other
  than the awaited `batch.commit()`) calls `markPrintRequestCompletedIfFullyPrinted` for every affected
  print request, which reads that same `showAllocations` collection back via a fresh
  `getDocs` in `listShowAllocationsForPrintRequestForReconciliation`.
- `mapFirestoreTimestamp` (`apps/studio/src/renderer/src/features/firebase/utils/firestoreTimestamp.ts`)
  is documented, in its own comment, to return `undefined` for "null, missing, **or pending writes**" -
  a `serverTimestamp()` sentinel is not guaranteed to have resolved to a concrete `Timestamp` in the
  very next standalone read performed by the same client immediately after the write that set it.
- `mapShowAllocationData` (`upcomingShowService.ts`) throws `"A show allocation record is incomplete."`
  whenever `updatedAt === undefined` on that allocation - which a just-finished allocation can
  transiently be, for exactly the reason above.
- `listShowAllocationsForPrintRequestForReconciliation`'s per-document `catch` (`upcomingShowService.ts`)
  converts that throw into a `ShowCompletionReconciliationRemediationError`, which propagates up through
  `reconcileCompletedPrintRequest`'s `readAllocations` phase (`showCompletionReconciliation.ts`) and
  excludes that allocation's quantity from the printed-quantity sum for this one, single, immediate
  read - potentially causing the eligibility check or the write itself to reflect a transient,
  not-yet-settled view of state, exactly once, at the worst possible moment (immediately post-commit).
- By the time of a route-remount (Amendment 12's reconstruction effect, itself just another bounded
  call to the same `listShowAllocationsForPrintRequestForReconciliation`/`retryShowCompletionReconciliation`
  pair), enough wall-clock time has passed for the `serverTimestamp()` sentinel to have resolved, so the
  identical bounded check now reads cleanly and correctly finds nothing unresolved - this is exactly why
  navigation "fixes" the display: it isn't a coincidence or an unrelated effect, it's simply a second,
  later, now-settled read of the same unchanged truth.
- **Workstream E correlation, confirmed and not assumed:** the console's separate "excluded invalid
  production record" warning is emitted by `getOrCreateShowAllocationsSubscription`'s live `onSnapshot`
  listener (`upcomingShowService.ts`), reading the exact same `showAllocations` document through the
  exact same `mapShowAllocationData`/`updatedAt`-resolution path, via a different call site than the
  reconciliation service. It is the same transient race manifesting through the live-subscription path
  rather than an unrelated defect, and self-heals on the listener's next emission once the server
  acknowledgment for the same write arrives (already deduplicated via
  `productionDiagnosticWarningDeduper`) - no separate fix is required for it beyond the correction
  below, which removes the root transient condition for the reconciliation path specifically.

### 31.3 Correction - a single bounded re-verification pass, not a broader redesign

`markShowPrintingFinished`'s post-commit reconciliation (`upcomingShowService.ts`) now performs a
second, bounded re-check limited to exactly the print-request IDs the first pass classified as
`"failed"` (never remediation-only IDs, which are not transient by construction - a genuine
cross-field assignment invariant failure or a permanently malformed document will fail identically on
a re-check and must continue to be reported, never silently hidden). This re-check calls the exact
same, already-proven `markPrintRequestCompletedIfFullyPrinted` function used everywhere else in this
reconciliation flow - no new read mechanism, no unbounded scan, no broader production-timer redesign.
A request that is genuinely still unresolved (a real transient failure, a real permission denial, a
real malformed document) fails this re-check too and is reported to the owner exactly as before,
correctly, with an actionable Retry button. A request that was only ever caught in the
`serverTimestamp()` resolution window now correctly reports as resolved on the immediate result,
matching what the owner already sees is true in both Studio and Portal, and matching what the
Amendment 12 reconstruction effect already independently confirms after navigation.

This directly satisfies the required invariant: the same persisted Firestore state must produce the
same reconciliation UI, whether that UI is shown immediately after Finish or after navigating away and
back. Navigation must never be what fixes a displayed result - and after this correction, it no longer
is; both paths call through to the same authoritative, bounded check and agree.

### 31.4 Retry UI - no change to the three-state contract, now driven by correct input

Amendment 12's `reconciliationRetryUiState` contract (`retryable` / `remediation_only` / `none`) and
its wiring into `UpcomingShowsPage.tsx` are unchanged and remain correct - the defect was never in that
classification or its rendering, only in the truthfulness of the count fed into it at Finish-time. With
31.3's correction, a false-positive "1 request update(s) need retry" no longer occurs; a genuine
retryable failure still renders the Retry button exactly as designed, and a genuine remediation-only
result still renders its distinct message with no button.

### 31.5 Required tests (production-used logic, not isolated pure helpers alone)

- A composed test (driving the actual `markShowPrintingFinished` reconciliation sequence, mirroring
  this repo's no-DOM-rendering convention) proving: (a) a first-pass failure that resolves cleanly on
  the bounded re-check produces a final result with zero failed requests and no warning; (b) a
  first-pass failure that fails identically on the re-check (a genuinely still-unresolved request)
  is reported exactly as before, unchanged, with its Retry button intact; (c) a first-pass
  remediation-only classification is never re-checked and is reported unchanged (remediation is not
  transient by construction); (d) a first-pass mix of one resolving-on-recheck ID and one
  genuinely-still-failing ID produces a final result containing only the genuinely-failing ID.
- A test proving the re-check calls `markPrintRequestCompletedIfFullyPrinted` only for the exact IDs
  the first pass reported failed - never the full `affectedPrintRequestIds` set, never an unbounded
  scan.
- A test proving `classifyCommittedShowTimerPhase` reports `"committed"` (no warning) for a result
  whose final (post-re-check) `failedRequestCount`/`remediationRequestCount` are both zero, using the
  exact same function the hook already calls - not a re-derived duplicate.
- Full regression re-run of every existing suite across all twelve prior amendments on this goal,
  confirming production lifecycle, mounted Portal progress, cumulative-25 (ADR-FP-122), personal usage
  wording, show switching, typed clamp, Show Queue live updates, removed-item persistence, Request
  Again, Firebase Debug availability, the 200-effective-DPI floor, the Amendment 12 reconstruction
  effect, and the Amendment 12 historical capacity-banner freshness gate all remain unchanged.

### 31.6 Required process for this amendment

This amendment requires its own focused independent Formal Review before any code changes - the
reviewer must independently verify the `serverTimestamp()` read-your-own-write race against current
source (not accept this narrative on trust), confirm the bounded re-check is scoped to exactly the
first pass's failed IDs (never remediation IDs, never an unbounded set), and confirm it introduces no
new unbounded read, no weakened failure detection for a genuinely unresolved request, and no change to
the Retry UI contract itself. This remains a client-only change; no Rules or Function file is touched.
A new independent Implementation Review (15) is required after verification, and must not defer to
Implementation Review 14 or any earlier review.

## 32. Amendment 14 - Final Owner-Authorized Attempt: Committed-State Post-Finish Verification

### 32.1 Owner QA result and final-stop constraint

Owner QA v15 returned `FAIL` on Test 1 only: immediately after a production run reached Finished,
Studio still displayed `Printing finished, but 1 request update(s) need retry.` and an enabled
`Retry request updates` control. The same live run otherwise completed correctly: Studio was
Finished, Portal became Printed dynamically, no Firebase error appeared, and navigating away and
back removed the warning. Tests 2 and 3 remain `PASS`.

This is the **final bounded remediation attempt authorized by the owner**. No Amendment 15 may be
created unless the owner explicitly requests it. If the final live owner test still shows the warning
while persisted state and staff/customer workflows remain correct, stop engineering work and
recommend the owner's specified `PASS WITH NOTES`.

### 32.2 Proven Amendment 13 gap

Amendment 13 correctly identified a pending `serverTimestamp()` read-your-own-write window, but its
second pass repeated the same non-authoritative read path:

- Finish awaits `batch.commit()`, then calls `markPrintRequestCompletedIfFullyPrinted`.
- That method reads the request through `printRequestService.getPrintRequestForShowReconciliation`
  and allocations through `listShowAllocationsForPrintRequestForReconciliation`.
- Current service reads use ordinary Firestore `getDoc`/`getDocs`. They do not call
  `waitForPendingWrites`, `getDocFromServer`, or `getDocsFromServer`, and they do not inspect snapshot
  `fromCache`/`hasPendingWrites` metadata.
- Amendment 13 calls the same method a second time immediately. No delay, write-settlement gate,
  server-source selection, cache bypass, or in-flight distinction exists.
- There is no application service cache or promise deduplication on this exact reconciliation path;
  the defect is Firestore latency-compensated local state, not a module cache.
- The recheck merge is synchronous and authoritative within `markShowPrintingFinished`; no parallel
  first-pass promise remains capable of settling later. A stale-result overwrite is therefore not
  the current source defect, but generation/session protection in the hook must remain intact.
- Route remount runs the reconciliation later, after Firestore's local pending timestamp state has
  settled, explaining why it reconstructs the correct result.

### 32.3 Bounded design

Add a service-owned committed-state verification mode for exactly the failed request IDs:

1. Preserve the existing first pass and its classifications. Treat retryable `failed` results as
   provisional. Also treat exactly one mapper shape as provisional: `allocation_read`
   `needs_remediation` with only `updatedAt` missing, because production wraps the pending
   `serverTimestamp()` mapper rejection as remediation rather than failure. No other remediation
   result enters verification.
2. Treat the awaited Finish `batch.commit()` as backend-acknowledged. `waitForPendingWrites` was
   evaluated and is unnecessary for this batch; it must not be presented as evidence that the
   commit remained pending.
3. Perform exactly one verification pass for those IDs using server-backed reads for the exact
   request document, its item subcollection, and its allocation query. Do not reuse the ordinary
   local/cache read path.
4. Reuse `reconcileCompletedPrintRequest` and its existing complete/retryable/remediation
   classification. A terminal request is complete without another write; a genuinely unfinished
   request remains retryable; malformed committed data remains remediation-only.
5. Merge results by request ID exactly once. The committed verification result is final for this
   Finish action. No polling, timer, route reload, collection-wide scan, or render-driven read is
   permitted.
6. Retry-button reconciliation must likewise verify committed state after its one service invocation
   so its final message matches remount truth.

Firebase SDK calls remain in services, never hooks/components. No Rule, Function, schema, migration,
capacity, historical, Portal-progress, timer-state, or UX redesign is authorized.

### 32.4 Read-source comparison

| Phase | Read method | Cache involved | Metadata/source | Timestamp | Final classification |
|---|---|---|---|---|---|
| Immediate first pass | ordinary `getDoc`/`getDocs` | Firestore local latency compensation may apply | source not forced; metadata not checked | may contain pending sentinel | provisional |
| Amendment 13 recheck | same ordinary `getDoc`/`getDocs` immediately | same client/local state may apply again | source not forced; metadata not checked | may still be pending | incorrectly treated as final |
| Route remount | same ordinary reads, later | local state has normally settled | source not forced | observed settled in owner QA | correct |
| Amendment 14 verification | server-backed exact reads after awaited commit | application cache bypassed; server required | server | settled committed values | authoritative final |

### 32.5 Diagnostics

Retain one development-only, sanitized, bounded diagnostic record per verification lifecycle with:
`postFinishVerification`, hashed show identifier, candidate request count, attempt number,
`readSource`, `fromCache`, `hasPendingWrites`, `timestampSettled`, initial classification, verified
classification, and whether a warning will render. Do not include raw document IDs, customer data,
request/allocation bodies, credentials, or tokens. Remove noisy investigation-only logging before
signoff.

### 32.6 Tests

Add focused tests proving:

- pending local server timestamps fail provisionally but settled server reads produce complete and no
  warning;
- committed verification bypasses a stale local/cache result for only the failed IDs;
- an older/provisional settlement cannot overwrite verified completion;
- a genuinely unfinished committed request remains retryable and navigation-equivalent;
- committed malformed state remains remediation-only with no Retry button;
- complete and unresolved results remain consistent after navigation;
- exact-ID scope and a single verification lifecycle, with no polling/listener/unbounded query;
- existing Start/Pause/Resume/Finish, Portal progress, historical messaging/capacity, usage, exact 25,
  show switching, clamp, live allocation, removed-item persistence, reductions, Add to Show, queued
  tracker, Request Again, Firebase Debug, elapsed-clock absence, and DPI-floor regressions remain
  passing.

### 32.7 Gates and deployment

Amendment 14 requires an independent Formal Review before application code changes and independent
Implementation Review 16 after testing. This is expected to remain Studio-client-only. No deployment
is authorized or required. The active goal remains at owner Test after review; do not sign off until
the owner sends final `PASS` or `PASS WITH NOTES`, and do not begin any queued goal.

## 33. Amendment 15 - Owner-Reopened Final Narrow Correction: Retry-Session Phase Release

### 33.1 Authorization and runtime evidence

The owner explicitly reopens the prior final-stop rule for one evidence-backed correction only.
Owner QA v16 confirms all persisted and customer/staff lifecycle behavior remains correct, but the
visible Retry control is inert. The production diagnostic is:

```text
handlerEntered: true
sessionAcquired: false
serviceInvoked: false
serviceSettled: false
settlementAuthoritative: false
renderedRetryableCount: 1
renderedRemediationCount: 0
remainingRetryableCount: 1
remainingRemediationCount: 0
resultKind: null
errorCode: null
```

This amendment is limited to retry-session lifecycle and truthful Retry eligibility. No additional
amendment is authorized if final live QA still fails.

### 33.2 Proven root cause

`ShowProductionRetrySession.acquire()` currently returns false for exactly three conditions:
unmounted session, selected-show mismatch, or `isRetryInFlight === true`. The owner diagnostic has a
mounted, rendered current-show handler with one retryable ID. Current source proves the remaining
condition is the shared retry lock held by the completed-show reconstruction effect:

1. `runAction("finish")` calls `beginTimerAction()`.
2. `beginTimerAction()` only increments generation and clears `isRetryInFlight`; it does **not**
   represent a timer action as active and returns no token that Finish later releases.
3. The live show subscription can render `productionStatus: completed` while the Finish promise is
   still performing reconciliation, committed verification, result application, and refresh.
4. The completed-show reconstruction effect runs on that render and calls the same
   `session.acquire(showId)` used by explicit Retry.
5. Because the session has no timer-action or verification phase, reconstruction acquisition
   succeeds and sets the one ambiguous `isRetryInFlight` Boolean.
6. Finish later applies its verified retryable result and renders an enabled-looking Retry button.
   Rendering checks React `isActionPending`, while acquisition checks the separate session Boolean;
   these are different authorities.
7. The owner clicks while reconstruction still owns the lock, so `acquire()` returns false and the
   service is never invoked.
8. Navigation cancels/recreates the hook/session and later reconstruction sees settled persisted
   state, explaining both lock release and warning disappearance.

No CSS, pointer, Firebase, service-write, or event-wiring defect is involved.

### 33.3 Current lifecycle inventory

| Moment | Current session condition |
|---|---|
| Before Finish | mounted, selected show tracked, retry Boolean normally false |
| `beginTimerAction()` | generation invalidated; no active timer-action phase recorded |
| Finish mutation/reconciliation/verification | session incorrectly appears idle |
| Live show becomes completed | reconstruction may acquire shared retry Boolean |
| Finish result applied | retryable IDs can render while reconstruction owns Boolean |
| Retry click | current show/mounted pass; `isRetryInFlight` fails acquisition |
| Navigation | old session disposed/cancelled; new session reconstructs settled truth |

### 33.4 Required production phase model

Replace the ambiguous Boolean contract with one production-owned phase:

```text
idle
timer_action
post_finish_verification
retry_available
explicit_retry
disposed
```

The session owns generation, selected show, active operation, acquisition, settlement authority, and
the single derived `canStartRetry(showId)`. React rendering must use that same capability that
explicit acquisition uses; the component must not duplicate the state machine.

### 33.5 Corrected Finish and reconstruction lifecycle

- Finish synchronously begins a timer-action token before any state update or await.
- Finish transitions that token to post-Finish verification while its service performs the bounded
  final classification.
- The completed-show reconstruction effect must not acquire during either Finish phase.
- Finish applies its final classification only while its token remains authoritative.
- A guaranteed `finally` releases the Finish token, transitioning to `retry_available` only when
  verified retryable IDs exist, otherwise `idle` (remediation stays non-actionable).
- An enabled Retry button may render only when `canStartRetry(showId)` is true.
- If retryable state exists while Finish/verification is still active, render
  `Finalizing request updates…` with no enabled control.
- Reconstruction uses an explicit non-user operation/token and releases in `finally`; it cannot
  leave an enabled control whose acquisition it blocks.

### 33.6 Explicit Retry lifecycle

- `acquireRetry(showId)` synchronously transitions `retry_available` to `explicit_retry` and returns
  a generation token.
- Duplicate same-frame activation fails synchronously.
- The hook sets `Retrying…` before awaiting exactly one service call.
- Success, partial failure, remediation, and rejection are applied only while the token is
  authoritative.
- Release occurs in one guaranteed `finally`, including rejected and stale settlements.
- A rejected retry with verified IDs returns to `retry_available`; success returns to `idle`;
  remediation returns to non-actionable idle/remediation UI.
- Show switch and unmount invalidate/dispose all older tokens.

### 33.7 Diagnostics

Add one development-only sanitized transition event:
`[useShowProductionTimer] retry session state transition`, containing only show hash, previous/next
phase, generation, active operation kind, retryable/remediation counts, `canStartRetry`, acquisition
result, release reason, and stale-discard flag. Never log raw IDs or document data.

### 33.8 Tests and scope

Production-used session/controller tests must cover all ten owner-specified cases: Finish cannot be
retried while active; Finish releases before Retry becomes enabled; the exact
`renderedRetryableCount=1` owner case acquires and invokes once; provisional verification renders
finalizing rather than an enabled button; genuine Retry success; remediation-only; duplicate
activation; rejection releases and permits another attempt; show-switch and unmount discard stale
settlements; navigation reconstructs the same persisted truth.

Expected application files are limited to:

- `useShowProductionTimer.ts`
- `showProductionRetrySession.ts`
- `showProductionRetrySession.test.ts`
- composed hook/controller tests
- `UpcomingShowsPage.tsx` only if required to render the production-owned capability/finalizing state

`upcomingShowService.ts`, Rules, Functions, Portal, historical, capacity, timer persistence, and
reconciliation read design are unchanged. This remains Studio-client-only with no deployment.

### 33.9 Gates

Amendment 15 requires an independent Formal Review before application edits and independent
Implementation Review 17 after verification. The goal remains open at final owner QA afterward.

### 33.10 Binding Formal-Review correction — React Strict Mode is the proven primary rejection

The first Formal Review verdict was `REJECTED` because Section 33.2 incorrectly presented
reconstruction lock ownership as proven. The reviewer inspected Studio's real root and established a
more direct cause:

- `apps/studio/src/main.tsx` renders under `React.StrictMode`.
- the hook creates one session in a persistent ref;
- its mount effect has no setup action, while cleanup calls permanent `markUnmounted()`;
- React 18 development Strict Mode performs setup → cleanup → setup while preserving that ref;
- the probe cleanup permanently leaves `isUnmounted === true`;
- every later `acquire()` therefore returns false before checking show ownership or retry flight.

This exactly matches the owner diagnostic. Reconstruction contention remains a plausible secondary
race but is **not** the proven v16 rejection reason and must be re-evaluated only after mounted
lifecycle is corrected.

Navigation currently clears the warning because ephemeral React state resets. The new hook instance
is subjected to the same Strict Mode probe and its reconstruction acquisition can also fail as
unmounted; therefore warning disappearance did not prove settled persisted truth.

### 33.11 Corrected Strict-Mode-safe phase contract

The session phase model is:

```text
idle
timer_action
post_finish_verification
reconstruction
retry_available
explicit_retry
disposed
```

Required transitions:

- effect setup calls `markMounted()`; this reactivates a session disposed by the immediately
  preceding Strict Mode probe cleanup;
- effect cleanup calls `markUnmounted()` and invalidates the current generation/token;
- a true final unmount has no later setup, so the session remains disposed and stale settlement is
  permanently blocked;
- selected-show changes invalidate the generation and return a mounted session to `idle`;
- Finish owns one token through timer action and post-Finish verification, releasing in `finally`;
- reconstruction owns its own explicit phase/token and releases in `finally`;
- explicit Retry can acquire only from `retry_available`;
- release transitions to `retry_available` only when verified retryable scope remains, otherwise
  `idle`;
- remediation is never retry-available.

`RetrySessionAcquireResult` must include a sanitized reason:
`acquired`, `unmounted`, `show_mismatch`, or `phase_busy`. Diagnostics and tests use this reason
instead of inferring the failed predicate from a Boolean.

### 33.12 Shared capability and render synchronization

The session exposes `canStartRetry(showId)` and both page eligibility and `acquireRetry(showId)` use
the same internal predicate. The hook publishes a small session-view revision/phase after every
transition so React re-renders from the authoritative capability; components do not duplicate phase
logic.

If verified retryable IDs exist while phase is timer action, post-Finish verification, or
reconstruction, the hook exposes `finalizing` and the page renders `Finalizing request updates…`
without an enabled control. Only `retry_available` renders the enabled Retry button.

### 33.13 Corrected required tests

In addition to the Section 33.8 cases, production-used tests must prove:

1. Strict Mode setup → cleanup → setup ends mounted and permits current-show acquisition;
2. true final cleanup invalidates a token and blocks settlement/acquisition;
3. acquisition returns each exact rejection reason;
4. the owner case reaches `acquired` and one service invocation;
5. reconstruction cannot compete with Finish/verification;
6. remount reconstruction actually invokes its bounded service and restores a genuine unresolved
   usable Retry state;
7. completed remount invokes reconstruction and produces no warning;
8. every operation releases through success, rejection, early return, stale settlement, show
   switch, and unmount;
9. page enabled state is driven by the same `canStartRetry` predicate as acquisition.

This correction supersedes the causal claims in Sections 33.2–33.3 where they conflict. No
application implementation begins until independent Formal Review re-review approves this corrected
plan.
## 34. Amendment 16 — Confirmed request-completion Rules denial

### 34.1 Authorization, owner QA result, and bounded scope

Owner QA v17 is `FAIL` on one newly proven backend result:

`1 request update(s) still need retry. Failed during request_write (permission-denied).`

Amendment 15 remains approved and successful at its intended purpose: Retry acquires, renders
`Retrying…`, invokes the exact reconciliation service once, and reports its authoritative result.
The show, terminal allocations, mounted Portal Printed progress, historical behavior, cumulative-25
capacity behavior, and all previously passing lifecycle work remain preserved.

This new runtime evidence authorizes **Amendment 16** only. It is limited to the exact
`printRequests/{printRequestId}` completion update, its full-document Rules predicate, safe structural
diagnostics, and the narrowest payload/Rules correction proven by a failing-before emulator fixture.
The next independent Implementation Review is **Implementation Review 18**. No queued goal,
migration, Function, production action, or deployment is authorized by this Plan.

### 34.2 Proven production payload and Rules path

Current production source constructs this exact `updateDoc` payload in
`printRequestService.markPrintRequestCompletedForShowReconciliation`:

```text
status: "completed"
updatedBy: caller.id
updatedAt: serverTimestamp()
```

`assertNoUndefinedFirestoreFields` runs before the write. There is no document spread, field removal,
batch, set/merge, or unrelated key in this operation. Studio permission gating remains
`permissionService.canManagePrintRequests(caller)`.

The Firestore write matches `/printRequests/{printRequestId}` and enters the staff update branch:

```text
isStaff()
printRequestRequiredFieldsValid(request.resource.data)
createdBy unchanged
createdAt unchanged
updatedBy == request.auth.uid
```

`isStaff()` requires an authenticated active `owner|admin|helper`. Because this is an `updateDoc`,
`request.resource.data` is the complete post-merge document, not the three-field patch.
`printRequestRequiredFieldsValid()` applies an exact whole-document `data.keys().hasOnly(...)`
allowlist and then validates assignment/origin, types, statuses, and timestamps.

### 34.3 Primary evidence-backed hypothesis requiring failing-before proof

The exact whole-document allowlist currently omits `queueTab`. This is inconsistent with the
current persisted model and backend maintenance:

- shared `PrintRequest` includes optional persisted `queueTab`;
- Studio list queries filter/count by `queueTab`;
- `backfillPrintRequestQueueTab` writes it to existing request documents;
- `onPrintRequestQueueTabInputsWritten` maintains it after request/item/allocation changes;
- permanent project decisions identify `printRequests.queueTab` and its maintenance triggers as
  active architecture.

Therefore any otherwise-valid request containing current `queueTab` appears to fail
`printRequestRequiredFieldsValid(request.resource.data)` before the exact three-field completion
patch can be authorized. The completion diagnostics also currently misclassify `queueTab` as a
legacy extra because their `KNOWN_FIELDS` set omits the same current field.

This is not yet permission to edit Rules. First add the narrowest emulator fixture matching an active
Portal/customer request with a valid current `queueTab`, and prove:

1. active owner + exact completion patch is denied under current checked-in Rules;
2. removing only `queueTab` from the otherwise identical fixture makes the patch succeed;
3. active staff/identity/status/assignment/timestamp predicates otherwise pass;
4. customer, signed-out, inactive staff, invalid transitions, wrong `updatedBy`, unrelated changes,
   ownership/origin changes, and malformed mixed assignment remain denied.

If that A/B fixture does not reproduce the denial, stop and investigate deployed-Rules drift,
authenticated identity, and the remaining whole-document fields before changing Rules.

### 34.4 Decision and least-privilege correction contract

When the A/B emulator proof confirms only the current `queueTab` field breaks the allowlist, use the
Rules branch:

- add only `queueTab` to the existing print-request whole-document allowlist;
- validate it through an exact enum helper for `working|queued|printing|printed`;
- require `queueTab` unchanged in this client completion update, so the maintenance trigger remains
  its sole writer;
- retain active `owner|admin|helper`, exact authenticated `updatedBy`, immutable `createdBy` and
  `createdAt`, valid status/timestamps, and all customer/guest/origin invariants;
- do not add a broad staff bypass or tolerate arbitrary legacy fields.

Current-schema and live-shaped fixtures must pass only for the exact `active|editing` (as supported
by actual reconciliation eligibility) to `completed` completion operation. Completed regression,
invalid current status, unrelated field changes, ownership/origin mutation, `queueTab` mutation,
wrong identity, invalid timestamp, customer, signed-out, and inactive staff must remain denied.
Preserved unknown legacy fields remain denied unless separate evidence proves a specific approved
compatibility need; no migration or data repair is in this amendment.

When the fixture instead proves the three-field service payload or identity is wrong, leave Rules
unchanged and correct only the service boundary. When the live-shaped request violates assignment or
origin invariants, classify it remediation-only and do not weaken Rules.

### 34.5 Diagnostics and excluded-record warnings

Extend the completion structural diagnostic only as needed to classify current `queueTab` correctly
and report safe predicate classes: current/proposed status, queue-tab enum validity, request-origin
class, customer/guest presence Booleans, parser compatibility, legacy field names, timestamp
validity, exact changed/removed keys, caller role/active status, and opaque hashes/counts. Never log
raw customer IDs, names, emails, request contents, tokens, credentials, or whole documents.

Allocation `excluded invalid production record` warnings remain a separate parser/read concern.
Connect them to this denial only if the exact selected-show relationship and affected request hash
match; otherwise preserve and deduplicate them without suppression.

### 34.6 Tests, review, and deployment gate

After independent Formal Review approval, add the failing-before fixture first and record its exact
denial. Required Rules coverage includes active owner/admin/helper per current staff policy,
customer/signed-out/inactive denial, valid and invalid current status, no completed regression,
exact changed keys, immutable ownership/origin/customer/guest fields, valid assignment combinations,
wrong `updatedBy`, invalid `updatedAt`, current-schema request, current `queueTab`, unchanged approved
field behavior, and denial of `queueTab` or unknown-legacy-field mutation.

Add/retain service and production-controller tests proving the payload is exactly three fields,
server timestamp and authenticated UID are used, permission denial maps safely, success clears exact
scope, one invocation/duplicate exclusion/stale settlement behavior remains, remediation has no
Retry, and completed request/tab/lock consumers remain correct.

Run the complete requested Rules, focused, regression, Portal, Studio, lint, and diff-check matrix.
Record Java and TypeScript versions, exact exits/counts, changed-line findings, and the known
non-zero Studio/lint baseline honestly. No Function build is required unless a Function unexpectedly
changes.

Independent Formal Review is required before implementation. Independent Implementation Review 18
is required after implementation and verification. If `firestore.rules` changes and Review 18
approves, stop at the exact human checkpoint:

`APPROVE DEV RULES DEPLOY`

That approval authorizes only:

`firebase deploy --only firestore:rules --project fresh-prints-dev`

Do not deploy automatically, do not combine deployments, do not ask for owner QA until the approved
dev Rules release is deployed and verified, and do not sign off the managed goal.

### 34.7 Binding Formal-Review corrections

Amendment 16 Formal Review verdict is `APPROVED_WITH_CHANGES`; the following are binding.

The failing-before proof must use one otherwise-identical request fixture in a four-way matrix:

| Fixture | `queueTab` | `showQueueBiddingAcknowledgment` |
|---|---:|---:|
| minimal control | absent | absent |
| queue-tab isolation | valid | absent |
| acknowledgment isolation | absent | valid |
| live Portal-queued shape | valid | valid |

Current source proves `showQueueBiddingAcknowledgment` is also a current persisted request field,
written by `queuePortalPrintRequestToShow` and documented in the shared model/data model, but omitted
from both the Rules `hasOnly` schema and completion diagnostics. The acknowledgment fixture must use
the exact nested shape (`accepted == true`, valid timestamp, and non-empty actor/version/show
strings). Only omissions independently denied by the current emulator may be corrected.

When confirmed, both fields remain optional for older requests, exactly validated when present, and
immutable to client updates. The completion diagnostic must treat them as current known fields,
validate their structural enums/types without logging values, and continue identifying genuinely
unknown field names as legacy.

The general staff update path must remain available for established non-completion edits. A named,
unambiguous completion-transition predicate must apply whenever proposed status is `completed`:
previous status is exactly `active|editing`; affected keys are exactly limited to
`status|updatedBy|updatedAt`; `updatedBy` equals the authenticated active staff UID; the resolved
timestamp is valid; and every other field—including assignment, origin, ownership, `queueTab`, and
acknowledgment—is unchanged and schema-valid. The pre-existing general branch must explicitly exclude
transitions into `completed`, preventing precedence from bypassing this predicate.

Tests must cover both valid completion source statuses; deny `draft|completed|archived -> completed`,
invalid status, completion plus unrelated mutation, current-field mutation, malformed assignment,
creation/identity/timestamp violations, customer/signed-out/inactive actors, and unknown legacy
fields; prove active owner/admin/helper according to current policy; and preserve a representative
non-completion detail edit. The Rules report must record failing-before and passing-after results for
each factorial row and the exact single field varied. Service/controller evidence remains separate
and must prove exact payload, safe permission-denial classification, one invocation, duplicate/stale
protection, success clearing, and remediation behavior.
