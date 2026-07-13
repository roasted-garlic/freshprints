# Architecture Decision Records — Fresh Prints

> Log significant technical and process decisions. Newest first.

---

### ADR-FP-077: Soft-quality warning for aggressive import upscales

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | accepted |

**Context**

Import upscales any PNG under 15″ @ 300 DPI (4500px wide) to that headroom floor after trim. Large files are left alone. Tiny sources (2–4″) still receive the full 15″ pixel stretch, which invents detail and can look soft if printed large.

**Decision**

1. Keep `IMPORT_UPSCALE_TARGET_WIDTH_INCHES = 15` (headroom unchanged).
2. When upscale scale factor (targetWidth / sourceWidth) is **≥ 3**, emit an additional import warning `IMAGE_UPSCALED_SOFT_QUALITY` advising that large prints may look soft and smaller prints are preferred.
3. Do **not** reject or cap upscale; request defaults remain 10″ preferred.

**Consequences**

- Mild upscales (e.g. 10″→15″ ≈ 1.5×) keep only the existing `IMAGE_UPSCALED` message.
- Aggressive upscales (e.g. 4″→15″ ≈ 3.75×) show both the headroom upscale note and the soft-quality warning.

---

### ADR-FP-076: Portal Persistent Current Request (cart-style UX)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Status | accepted |

**Context**

Portal customers previously entered Design Library selection mode to add designs, and uploaded artwork via a modal on the request detail page. Product needs a familiar shopping-style flow without ecommerce checkout, while preserving one working request (ADR-FP-071) and request-artwork uploads (ADR-FP-073).

**Decision**

1. Authenticated Portal customers always experience a **Current Request** (virtual empty when no Firestore `draft`/`editing` request exists). Working request documents are created **lazily** on the first persistent action.
2. Catalog Discover / Design Library support **direct-add** without selection mode. Re-adding a catalog design increments the **primary** variant (earliest catalog-backed item by `createdAt`, then `id`). Size duplicates remain independent lines.
3. Header exposes **Upload Artwork** and a **Current Request** basket (badge = total print quantity). Drawer is summary-only; **Review Request** is the detail page for resize, duplicate-for-size, DPI, and **Add Request to Show**.
4. Request artwork lives at **`/requests/artwork`** (printing / Current Request only). Future image donations are a separate product path and must not share this route or lifecycle.
5. Studio request-selection mode is unchanged. Legacy Portal `?mode=request-selection` may remain temporarily for compatibility until cleanup after manual verification.

**Consequences**

- Portal chrome and catalog cards share one working-item load owner via `PortalPrintRequestProvider`.
- Terminology avoids checkout/order/payment language.
- Selection-mode code is not deleted until direct-add manual QA passes.

---

### ADR-FP-075: Print Request items require ≥ 200 effective DPI to save

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Status | accepted |

**Context**

Standard Print Request sizing previously allowed saves down to 72 effective DPI (with warnings from 72–299). During r7 Portal DPI UX review, the owner decided that quality below 200 DPI should not be persisted on requests.

**Decision**

1. `MIN_PRINT_REQUEST_EFFECTIVE_DPI = 200` is the hard save floor for standard Print Request item sizes (Portal and Studio).
2. 200–299 DPI may still save with a soft warning; 300+ saves without warning.
3. Catalog **import** may still accept assets down to the import floor (`MIN_ACCEPTABLE_EFFECTIVE_DPI = 72`); that does not authorize sub-200 request sizes.
4. Initial requested size (`resolveInitialPrintRequestItemSize`) also clamps so defaults stay at or above 200 DPI when possible.

**Consequences**

- Enlarging a request item past the 200 DPI point blocks autosave until the size is reduced.
- Extreme aspect ratios may initialize smaller than the previous 22″-only clamp when needed to keep ≥ 200 DPI.

---

### ADR-FP-074: Customer upload library permission is optional (visible to staff)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Status | accepted |

**Context**

Customers confirm ownership and whether Fresh Prints may use artwork in the Design Library. Forcing library permission blocked attach UX; staff still need a clear signal when a customer declined.

**Decision**

1. Ownership confirmation remains **required** to attach uploads to a print request.
2. Design Library permission is **optional**, **checked by default** in Portal UI, and persisted as `catalogUseAcknowledged` (true/false) with terms `customer-upload-terms-v2`.
3. Staff **may still** Send to AI Review / promote when `catalogUseAcknowledged === false`.
4. Studio Customer Uploads intake must **surface declines** clearly so staff can decide.

**Consequences**

- Promote callables require ownership only (not library permission).
- Product/policy follow-up may later tighten promote rules; visibility is mandatory now.

---

### ADR-FP-073: Customer-provided request artwork (separate from catalog designs and Phase 9)

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Status | accepted |

**Context**

Portal customers need to print their own transparent artwork on the existing one-working-request flow. Catalog `designs` are staff-approved library assets. Phase 9 `customRequests` is a separate Q&A / Etsy / optional design-fee workflow. These must not be conflated.

**Decision**

1. Persist customer artwork as **`customerUploads`** (+ optional **`customerUploadBatches`**), not as `designs`, until staff explicitly promotes.
2. **Request-use** and **catalog intake** are independent lifecycles (`technicalStatus` vs `catalogReviewStatus`). Request/production statuses stay on print request / show entities — never on `designs.status`.
3. Print request items gain a source model: `catalog_design` | `customer_upload` (legacy docs without `sourceType` = catalog). Sub-phase A adds additive optional fields; Sub-phase D makes `designId` optional for upload-backed items and updates show/gang/export resolvers.
4. Trusted processing boundary: authorized Storage source upload → finalize callable (server validation/normalize/derivatives). Client preflight is non-authoritative.
5. Staff **Send to AI Review** promotes idempotently to a `designs` doc (`status: imported`) + existing `catalog-enrich-v21` enqueue; **Do not add to catalog** excludes without deleting request assets. Default click does not auto-AI before staff action.
6. Storage layout under `/customer-uploads/{uid}/…` with separate **source** and **production** objects. Rules enforce path/owner/size/type; lifecycle validation lives in finalize callables (Sub-phase B).
7. This feature is **Phase 8 fast-follow request artwork**. It is **not** Phase 9 `customRequests` / Custom Request Q&A. Reusing the `/customer-uploads/` prefix does not pull Phase 9 into scope.

**Consequences**

- Implementation is split (A contracts → B trusted backend+rules → C Portal UI → D production compatibility → E Studio intake → F AI → G wipe/hardening).
- Popularity `requestCount` must not increment for customer-upload-only items.
- Confirmation wording and rules/Functions deploys remain human checkpoints.

---

### ADR-FP-070: Local gang sheet generate/cache (not Firebase Storage)

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | accepted |

**Context**

Staff need sheet count and lengths before saving files. A ~200-image show produced ~4 sheets / ~677MB. Uploading those PNGs to Firebase Storage (even temporarily) would fill quotas and add latency on the production machine that already runs Studio.

**Decision**

1. **Generate Gang Sheet** composites PNGs into an Electron `userData` cache keyed by show id + content fingerprint.
2. UI previews sheet count, lengths, and filenames (length included in the filename); staff can download one sheet or export all via native save dialogs.
3. After a successful generate, the primary action is **Export gang sheets** (copy from cache).
4. Do **not** persist generated gang sheet PNGs in Firebase Storage or Firestore.
5. Clear cache when the show is past, on regenerate, when the fingerprint no longer matches allocations/settings, or when Test Data Reset wipes print requests / show-queue attachments / upcoming shows (clears the entire local `gang-sheet-cache` folder on this computer).

**Consequences**

- Disk use is local to the production PC; fingerprinting prevents exporting stale sheets after queue edits.
- Cross-machine sharing of generated sheets is out of scope unless revisited later.

---

### ADR-FP-069: Staff inbox Done state in Firestore (per user)

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | accepted |

**Context**

Staff inbox Open items are derived from Firestore, but Done/ack state lived in `localStorage`. That broke multi-device sync, left Done history after Test Data wipe, and suppressed `show_queue_full` alerts after wipe+refill on the same show id.

**Decision**

1. Persist acks in `staffInboxAcks` with deterministic doc ids `{userId}__{encodedItemId}`.
2. Scope is **per staff user** (sync across that user’s devices; not team-shared Done).
3. Staff may only read/create/delete own docs; no client updates.
4. Operational wipe deletes `staffInboxAcks` when wiping print requests, show-queue attachments, or upcoming shows.
5. One-time migrate existing localStorage acks into Firestore for the signed-in user, then clear the local key.

**Consequences**

- Done survives app restart and syncs across machines for the same staff account.
- Wipe clears Done server-side; rules deploy required before client writes succeed.
- Team-shared Done remains out of scope.

---

### ADR-FP-068: Admin Test Data Reset page for allowlisted operational wipes

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | accepted |

**Context**

Scratch QA of print requests → show queue required manual Firebase Console deletes and sequence resets. Catalog and accounts must stay intact.

**Decision**

1. Dedicated Studio page `/test-data-reset` (sidebar **Test Data Reset**), visible only for owner/admin when the client Firebase project is allowlisted (`fresh-prints-dev`).
2. Callable `wipeOperationalTestData` with selectable targets and presets, including **print-request reset (keep shows)** and optional **designs** wipe.
3. **Designs** wipe requires **print requests** in the same run, an extra catalog confirm modal (`acknowledgeDesignCatalogWipe`), then the typed phrase. Deletes `designs` docs plus Storage `originals/`, `thumbnails/`, `previews/`.
4. Server enforces owner/admin + project allowlist + typed confirm phrase `WIPE TEST DATA`.
5. Sequences reset to **1** (not 0). Accounts, categories, tags, and settings are never wiped by this tool.
6. When shows are **kept** but allocations are cleared, each show’s `allocatedQuantity` is zeroed, print
   timer fields are cleared, and `productionStatus` values `full` / `printing` / `fully_printed` /
   `completed` are reset to **`open`** (`archived` / `canceled` unchanged).

**Consequences**

- Faster scratch loops without Console surgery.
- Must deploy the callable to `fresh-prints-dev` before the page works.
- Never add production project IDs to the allowlist without a new approved plan.

---

### ADR-FP-067: Portal browse “Add to request” enters selection mode after immediate persist

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | accepted |

**Context**

Portal catalog browse and design details were read-only. Customers could only start/continue requests from the top bar or request detail “Add designs,” so the Design Library did not feel requestable. Multi-request continue dumped to the Working tab with no design-scoped picker.

**Decision**

1. **Add to request** CTAs on design details (eyebrow row, right-aligned) and browse design cards.
2. **Immediate persist** the design at quantity 1 via `savePrintRequestDesignSelections` (dedupe-safe), then navigate to existing selection mode for that request.
3. Branch on continuable (`draft`/`editing`) count: **0** create → add → selection; **1** add to that request → selection; **2+** `PortalPickContinuableRequestModal` (pick only — no start new; see ADR-FP-071).
4. Design-level CTA skips the generic “Start a new print request?” confirm; top-bar/FAB keep it **only when no continuable request exists**.
5. If the design is already on the target request, do not duplicate; still enter selection mode.

**Consequences**

- Browse and details become request entry points without new callables or rules.
- Selection mode remains the place to adjust quantities and add more designs.

---

### ADR-FP-072: Portal Design Library discovery sections (lightweight)

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Status | accepted |

**Context**

The Portal catalog was a flat searchable grid. Customers needed curated discovery without Phase 10 analytics.

**Decision**

1. Three sections: **New This Week** (`createdAt` last 7 days), **Popular** (lifetime `requestCount`), **Recently Requested** (`lastRequestedAt` then `requestCount`), plus up to **3 popular category** rails (summed `requestCount`, min 3 designs).
2. **Discover** landing is `/catalog`; full **Design Library** is `/catalog/library`. **View All** uses `?discover=` or `?category=` on the library route.
3. Ranking helpers live in shared `catalogDiscoveryRanking.ts`; Phase 10 may replace only `rankRecentlyRequested`.
4. `printRequestItems` **onCreate** Cloud Function increments `requestCount` / `lastRequestedAt` (Portal + Studio). Studio client increment removed to avoid double-count.
5. Do **not** add `favoriteCount` now — optional fields can land later without migration.
6. Remove Design Library **My requests** header button (nav covers requests).

**Consequences**

- Deploy `onPrintRequestItemCreated` required for accurate Popular / Recently Requested after Portal adds.
- No rolling analytics collections in this phase.
- Signed off 2026-07-11 (`approved_with_notes`).

---

### ADR-FP-071: One working print request per portal customer

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Status | accepted |

**Context**

Customers could create multiple `draft`/`editing` requests via Portal UI (“Start new”) and `createPortalPrintRequest`, which made Working-tab clutter and split unfinished carts.

**Decision**

1. A portal customer may have **at most one** continuable print request (`draft` or `editing`) at a time.
2. **`createPortalPrintRequest`** rejects with `failed-precondition` when any such request already exists (transactional query).
3. Portal Start/FAB/catalog actions **continue** the existing request when one exists; they never offer “Start new” beside an open draft.
4. Queued (`active`) / printing / printed requests do not block creating a new request after the current working request is queued.

**Consequences**

- UI and callable must stay aligned; deploy function + `customerId`+`status` index with the release.
- Customers who already have multiple drafts can still open/pick among them but cannot create another until they are down to zero continuable.

---

### ADR-FP-066: Portal customer self-queue via callables

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Status | accepted |

**Context**

Portal customers build print requests but could not queue them to Whatnot shows. `upcomingShows` read and `showAllocations` write are staff-only in Firestore rules. `@fresh-prints/show-picker` was ready from ADR-FP-065.

**Decision**

1. Customers queue via callables `listPortalAllocatableShows` and `queuePortalPrintRequestToShow` (Admin SDK) — no client-side allocation writes.
2. **Single show, full request** — all items allocated at full quantity; no split or capacity override.
3. Block re-queue when any non-canceled allocation exists.
4. Show schedule filters (`filterShowsAvailableForAllocation`, etc.) live in `@fresh-prints/shared` (`showScheduleGrouping.ts`).
5. UI: `PortalQueueToShowModal` on request detail with `ShowPicker`.

**Consequences**

- `draft`/`editing` → `active` can now happen from Portal when customer queues (not staff-only).
- Functions deploy required before live QA.

---

### ADR-FP-065: Shared `@fresh-prints/show-picker` package for Studio and Portal

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Status | accepted |

**Context**

Staff pick an upcoming show when allocating print requests (`Add to Show`). A vertical date-grouped list does not scale as the schedule grows. Portal will eventually need the same picker when customers select a show at request submission.

**Decision**

1. Calendar grid math lives in `@fresh-prints/shared` (`showCalendarGrid.ts`).
2. React UI lives in `@fresh-prints/show-picker` — domain-agnostic `ShowPickerOption` props, CSS via design tokens.
3. Studio maps `UpcomingShow` + capacity to options; Portal will do the same when that flow ships.
4. No third-party calendar library.

**Consequences**

- Portal adds `@fresh-prints/show-picker` dependency; **Portal wiring shipped 2026-07-08** (ADR-FP-066).
- Both apps must define `--color-*` theme tokens (already required by STYLE_GUIDE).

---

### ADR-FP-064: Show Queue production timer (Option B) drives customer print progress

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Status | accepted |

**Context**

Customer Portal progress tracking needed a real **Printing** state. Gang sheet builder Slice 4 (timer on
`gangSheets`) was deferred. Export alone must not start the timer because staff may export files long
before the press runs.

**Decision**

1. **Show Queue detail** owns **Start printing / Pause / Resume / Mark finished** and the elapsed timer on
   `upcomingShows` (`accumulatedPrintMs`, `activePrintStartedAt`, etc.).
2. **Export** (zip or gang sheet PNG) remains file-only — no allocation status writes.
3. **Start** sets show `productionStatus → printing` and active allocations `pending`/`queued` →
   `in_progress`.
4. **Mark finished** sets allocations → `done` and reconciles print requests to `completed` when fully
   done.
5. Portal and Studio derive **Working / Queued / Printing / Printed** from allocation totals (including
   `totalInProgressQuantity`).

**Consequences**

- Gang sheet timer remains out of scope until/unless gang sheet builder is revived.
- Firestore rules must allow new `upcomingShows` timer fields (deploy required before live use).

---

### ADR-FP-063: Phase 7 Studio MVP complete; Gang Sheet Builder post-MVP; Whatnot scheduled sync not planned for Studio

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Status | accepted |

**Context**

After Show Queue production-file export signoff, three follow-up items were discussed: Gang Sheet
Builder manual canvas, Firestore rules deploy for gang sheet settings, live Whatnot scheduled sync,
and Phase 8 Portal.

**Decision**

1. **Gang Sheet Builder (manual canvas)** is a post-MVP *want*, not a Studio MVP need. Auto-nested gang
   sheet PNG export already covers production file output. Defer builder work until after Portal and
   other higher priorities.
2. **Live Whatnot scheduled/hourly sync** is **not planned** for Fresh Prints Studio. Electron is not
   always-on; staff-assisted import remains the workflow. Revisit only if a future always-on hosted
   service (e.g. Portal backend) needs automated show-list sync — not a default Phase 8 scope item.
3. **Phase 8 Fresh Prints Portal** is the next major milestone after deploying outstanding Firestore
   rules to the target Firebase project(s).

**Consequences**

- ROADMAP and handoff docs treat Phase 7 Studio MVP as complete.
- Gang Sheet Builder plans remain archived/backlog, not active workflow goals.
- Phase 8 planning may proceed once rules deploy is confirmed.

---

### ADR-FP-062: Print Requests page derives status/queue-state from the stable allocation-totals map everywhere; show-queue link pills and multi-show-aware removal added

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Final polish pass before signoff, bundling several small fixes and one feature addition into the
Print Requests page:

1. **"Not queued" renamed "Working."** `getPrintRequestQueueStateBadgeLabel()` now returns `"Working"`
   for the `not_queued` state, matching the tab name it corresponds to.
2. **Removed a second async-staleness flash source.** Following the same pattern as
   `isSelectedRequestQueueLocked` (ADR-FP-059's fix), the detail panel's queue-state pill now also
   derives from the stable `allocationTotalsByRequestId` map instead of the per-selection
   `totalAllocatedQuantity`/`totalPrintedQuantity` state, which briefly reset while
   `reloadAllocationSummary()` was in flight for a newly selected card — this caused the pill to flash
   from correct-state to "Working" and back when clicking between cards on the Queued tab. This made
   the old state/effect fully dead, so it (and its now-unused `upcomingShowService`/
   `isPrintedAllocationStatus` imports) were removed.
3. **`onAdded` now reloads the request and list, not just totals.** Allocating/removing from a show can
   flip the print request's persisted `status` (e.g. `editing` -> `active` on re-add), but
   `reloadAllAllocationData()` previously only reloaded allocation totals — so the detail panel kept
   showing a stale `editing` pill even after a successful re-add. It now also calls
   `reloadPrintRequest()` and `reloadPrintRequests()`.
4. **Internal card subtitle shows notes instead of "Internal."** The word "Internal" in the sidebar
   card subtitle was redundant with the origin pill already shown above it; internal requests now show
   `request.notes?.trim() || "No notes"` there instead. Customer requests are unaffected.
5. **Show-queue link pills + multi-show-aware removal.** The Queued tab's detail panel now shows one
   compact pill per show the request is queued to (`{qty} qty · {date/time}` plus an external-link
   icon, `title` attribute for the full show name on hover), linking to `/show-queue?showId=...`. A
   "Remove from show queue" action (two-step confirm, wording pluralized when the request spans
   multiple shows) removes every allocation across all its shows via
   `removeShowAllocationsForRequest()` per show, then switches the active tab to `Working` — the
   existing tab-selection-sync effect keeps the same request selected. Gated by the same
   `canRemoveRequestFromShow()` production-status check already used on the Show Detail page. New pure
   util `shared/utils/groupAllocationsByShow.ts` (mirrors the existing `groupAllocationsByRequest`)
   groups one request's allocations by show.

**Why**

These were the last round of manual-QA-adjacent polish items raised before signoff: a label mismatch
with the tab name, two instances of the same async-staleness flash bug pattern, a redundant subtitle
word, and a genuinely missing capability (no way to see or leave a show from the Print Requests page
without navigating to Show Queue and finding the request there manually).

**Consequences**

- No Firestore rules or index changes were needed for any of these.
- The pill/removal UI intentionally reuses the same production-status removal gate and two-step
  confirm pattern as the Show Detail page, rather than introducing a new confirm UX.

---

### ADR-FP-061: A show with zero remaining capacity skips the split-decision path entirely — override is the only way to add to it

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A thirteenth Show Queue manual QA correction: when staff selected an already-full show (zero remaining
capacity) for an 8-print request, `AddToShowModal` showed "Only 0 of 8 prints can be added to this
show..." plus a "Choose designs for this show" button that opened `SplitDesignPickerModal` with nothing
to actually place — there is no capacity to split into. Added `isSelectedShowFull` (true when
`planAllocationSplit()`'s `fittingQuantity` is `0` and there is a nonzero remainder to place). When
true, the decision area now shows plain copy ("This show is full. You can select a different show for
the full request, or use the staff override below to add it anyway.") and hides the
"Choose designs for this show" button entirely — the **only** action available for a full show is the
existing staff override checkbox + "Add with override" button, which forces the whole remainder onto
the show anyway. Showing a *different* show that still has some room continues to use the normal
split-decision path (warning + "Choose designs" + override) unchanged.

**Why**

Splitting requires a show that can accept *part* of the request; a show with 0 remaining capacity can
accept none of it, so offering a picker there was actively misleading — it looked like staff could
place some prints when none would fit.

**Consequences**

- No pure-util changes were needed — `planAllocationSplit()` already returns `fittingQuantity: 0` for
  a full/over-capacity show; this correction only branches the JSX on that existing value.
- The footer's plain "Add to show" button was already correctly inert for a full show
  (`canConfirmFullFitDirectly` requires `!needsDecision`, and `needsDecision` is true whenever
  capacity doesn't fully fit) — no change was needed there.

---

### ADR-FP-060: Capacity progress bars and a derived Open/Full/Over Max status are added to Show Detail and Add to Show, computed live rather than persisted

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A twelfth Show Queue manual QA correction, adding clear at-a-glance capacity indicators without any
data model or migration change:

1. **New shared util `shared/utils/showCapacityDisplay.ts`.** Built on top of the existing
   `assessShowCapacity()` (`isFull`/`isOverCapacity`/`remainingQuantity`), adds: `getShowCapacityPercent()`
   (percent used, can exceed 100 for over-capacity shows, `undefined` when uncapped),
   `getCapacityFillLevel()` (green/yellow/red/red thresholds: `low` &lt;70%, `medium` 70–89%, `high`
   90–99%, `critical` &ge;100%), `formatCapacityUsedLabel()` ("N of M used" / "No max set", replacing
   the old ambiguous "N remaining of M"), `formatSpotsRemainingLabel()` ("N spots left" / "Full" /
   "N over max" / "No limit", replacing "N / M left"), and `getDerivedShowStatusDisplay()` — the single
   function that decides the status pill shown to staff.
2. **Status pill priority is entirely derived, never persisted.** `getDerivedShowStatusDisplay()`
   checks `productionStatus` first (`printing` &rarr; `PRINTING`, `fully_printed` &rarr; `FULLY PRINTED`,
   `completed` &rarr; `COMPLETED`, `archived` &rarr; `ARCHIVED`, `canceled` &rarr; `CANCELED`) and only
   falls through to capacity-derived `OVER MAX` / `FULL` / `OPEN` when `productionStatus` is `open`.
   The existing `"full"` value in the `ShowProductionStatus` enum is deliberately never written to by
   this correction — Full/Over Max is always computed live from `allocatedQuantity` vs.
   `maxTotalQuantity` at render time, so **every existing show displays correctly immediately after a
   code refresh, with no migration/backfill and no need to delete/re-add shows**.
3. **Progress bars added in two places.** The Show Queue detail Capacity card
   (`UpcomingShowsPage.tsx`) and each show option card in the Add to Show / split-picker's date-grouped
   list (`AddToShowModal.tsx`) both render a `show-capacity-bar-fill`/`show-date-picker-option-bar-fill`
   colored by `getCapacityFillLevel()`.
4. **Whole-area visual state for Full/Over Max, not just the bar.** Per the explicit requirement that
   staff not have to read carefully: the sidebar show card (`print-requests-request-card`), the Show
   Detail capacity card (`show-capacity-card`), and each Add to Show option card
   (`show-date-picker-option`) all gain `.is-full` (warning-tinted background/border) and
   `.is-over-capacity` (danger-tinted background/border) modifier classes alongside the bar color and
   pill.
5. **Removed now-dead `getShowProductionStatusBadgeVariant()`** (`upcomingShowDisplay.ts`) — fully
   superseded by `getDerivedShowStatusDisplay()`, which every call site now uses instead.

**Why**

Staff could not tell at a glance whether a show had room, was close to full, or was already full/over
capacity — the existing `0 / 200 left` text plus an always-`OPEN` pill actively misled staff into
thinking a full show could still take a full-fit request.

**Consequences**

- No Firestore rules or index changes were needed or made — this is a pure UI-derived display feature.
- No write path changed; `allocatePrintRequestItem()`, override, and split logic are untouched.
- Because Full/Over Max is derived, a show's pill can silently change between renders as
  `allocatedQuantity` changes (e.g. after a removal) without any explicit status-transition code —
  this is intentional and mirrors how the existing capacity numbers already worked.

---

### ADR-FP-059: `Add to Show` action is hidden (not disabled) while the selected request is queue-locked

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

An eleventh Show Queue manual QA correction: the Print Requests page's `Add to Show` action showed a
disabled button (with a "This request is already queued to a show." tooltip) whenever the selected
request was queue-locked — most visibly on the `Queued` tab, where every visible request is locked by
definition, so the button served no purpose and just added visual noise. Changed the render condition
from `visibleSelectedRequest ? ... : null` to `visibleSelectedRequest && !isSelectedRequestQueueLocked
? ... : null`, so the action row (and its now-unreachable disabled/tooltip branch) doesn't render at
all while locked. `isSelectedRequestQueueLocked` is unchanged (`totalAllocatedQuantity > 0` for a
non-`completed` request), so once a request is fully removed from its show(s) and transitions to
`editing` (zero active allocations), the button correctly reappears on the `Working` tab.

**Why**

On the `Queued` tab specifically, every request is queue-locked, so a permanently-disabled button
provided no information and cluttered the page's primary action area.

**Consequences**

- No logic, allocation, or lock-state change — only the button's render condition changed. The
  `requestItems.length === 0` empty-request tooltip still applies once the button is visible (i.e. on
  `Working`/`editing` requests with no items yet).

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A tenth Show Queue manual QA correction: each `SplitDesignPickerModal` design card showed a
`{remainingQuantity} available to place` line alongside `{quantity} requested`, which staff read as
"how many can go on the currently selected show" rather than its actual meaning (the design's own
unassigned request quantity, independent of the selected show's capacity). Removed that line entirely
— the card now shows only `{quantity} requested` and, when a prior split leg already assigned some of
this item, `{alreadyAssigned} already assigned`. The picker's totals strip above the card list already
covers show capacity and remaining-for-another-show, so no replacement line was needed. No change to
the quantity input's `max={entry.remainingQuantity}` clamp — the per-design limit is still enforced,
just no longer restated in ambiguous wording on the card.

**Why**

Staff misread "available to place" as show-capacity-relative rather than request-relative, and the
totals strip introduced in ADR-FP-054 already communicates capacity information, making the line
redundant as well as confusing.

**Consequences**

- No pure-util, logic, or test changes were needed — this was a JSX copy removal only;
  `calculateSplitSelectionTotal()` and `clampSplitItemQuantity()` are unchanged.

---

### ADR-FP-057: Split warning explains both the split and pick-a-different-show paths; the decision area becomes one bordered callout

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A ninth Show Queue manual QA correction, addressing both the split-needed warning's copy and the
visual looseness of the surrounding decision area in `AddToShowModal`:

1. **Warning copy explains both paths.** `formatSplitNeededWarning()` now reads "Only N of M prints
   can be added to this show. You can choose which prints to add here and place the rest on another
   show, or select a different show for the full request." — replacing wording that only described
   the split path ("The remainder will need to be added to another show. Choose the prints to be
   added to this show."), which left staff unaware they could simply pick a different show above
   instead of splitting. Still says nothing about override, since the checkbox directly below already
   explains that option.
2. **Decision area becomes one bordered callout.** `.show-allocation-decision` gained the same
   card-like treatment already used for `.split-picker-totals` (`--color-bg-tertiary` background,
   `--color-border` border, `--radius-lg` radius, `--space-4` padding) so the warning text, "Choose
   designs for this show" button, and override checkbox read as one deliberate decision area instead
   of three loosely stacked elements.
3. **Button spans the callout width.** `.show-allocation-decision-actions .button` is now
   `width: 100%`, so "Choose designs for this show" reads as the callout's primary action rather than
   an arbitrarily-sized secondary button.
4. **Override row visually separated.** The override `<label>` (renamed `.show-allocation-decision-override`)
   gained a top border and top padding to separate it from the button above, plus flex/`align-items:
   flex-start` layout so a wrapping checkbox label stays aligned with the checkbox rather than
   centering awkwardly.

**Why**

Manual QA reported that the old warning made it sound like splitting was the only option, and that the
warning/button/checkbox stack looked visually loose and unpolished next to the rest of the modal.

**Consequences**

- No pure-util changes were needed beyond the one string change in `formatSplitNeededWarning()`; its
  existing test was updated to match the new copy.
- No logic, allocation, capacity, or override behavior changed — this was copy and CSS/JSX structure
  only.

---

### ADR-FP-056: Staged split allocation labels show show date and time, not time only

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

An eighth Show Queue manual QA correction: the staged-leg summary in `AddToShowModal` (e.g.
`8:00 PM: 25 prints`) showed only the show's time via `formatShowTimeOnlyLabel()`, leaving staff unable
to tell which show a leg was assigned to once multiple shows on different dates are involved in a
split. `getShowLabel()` now calls the existing `formatShowDateTimeLabel()` (already used for Show
Queue/Show Detail's full date+time display, and already covered by a "does not include seconds" test)
instead — no new formatter was added. The show-date-picker's compact time-only badges are unaffected;
`formatShowTimeOnlyLabel` is still used there.

**Why**

Once a request is split across more than one show, a bare time label is ambiguous about *which day's*
show received a given leg, especially across multiple Upcoming shows scheduled at the same time on
different dates.

**Consequences**

- No pure-util or test changes were needed — this reused an existing, already-tested formatter in one
  additional call site.

---

### ADR-FP-055: Split picker quantity inputs start blank instead of pre-filled

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A seventh Show Queue manual QA correction: `SplitDesignPickerModal`'s quantity inputs previously
pre-filled on open (each design auto-assigned up to the show's remaining capacity via a greedy
budget-consuming loop in the `useState` initializer), which made it look like the app had already
chosen the split for staff. Quantities now start empty:

1. State changed from `SplitPickerQuantities` (a `Record<string, number>`) to a plain
   `Record<string, string>` of raw input text, initialized to `{}` (no pre-seeding loop). A derived
   `quantities` value (still `SplitPickerQuantities`, computed via `useMemo`) parses each raw string,
   treating blank/whitespace-only as `0` and otherwise clamping through the existing
   `clampSplitItemQuantity()` — all downstream calculations (`calculateSplitSelectionTotal`, the
   totals strip, `exceedsShowCapacity`, `onConfirm`) consume this derived numeric map unchanged.
2. `updateQuantity()` now special-cases an empty/whitespace input by storing `""` directly (so
   clearing a field returns it to blank rather than snapping to `0`); any non-blank input is still
   parsed and clamped to that design's own remaining quantity as before.
3. The input's `value` now reads from the raw string map (`quantityInputs[id] ?? ""`) instead of the
   numeric map, and gained a `placeholder="0"` so an empty box still visually reads as zero without
   holding an actual `0` value.
4. No change was needed to the confirm button's disabled state (`selectedTotal === 0 ||
   exceedsShowCapacity`) or to `AddToShowModal.handleConfirmPickerSelection`'s existing filter of
   `quantity > 0` entries — both already treat "nothing entered" as "nothing to assign," so blank
   inputs already couldn't create allocations even before this fix targeted the initial-value bug.

**Why**

Manual QA reported that opening the picker with quantities already filled in (e.g. `25` and `0`) felt
like the app had made the split decision on staff's behalf, when the intent is for staff to choose.

**Consequences**

- No pure-util changes were needed — `calculateSplitSelectionTotal()` and `clampSplitItemQuantity()`
  are unchanged; this was purely a component-state representation change (number map to string map
  plus a derived numeric map).
- The totals strip and "Available on this show" / "Remaining for another show" figures now correctly
  start at their true pre-selection values (`0` selected, full show capacity available, full
  unallocated request quantity remaining) since nothing is pre-assigned.

---

### ADR-FP-054: Split picker totals/labels clarified ("Available on this show," "Remaining for another show"); quantity inputs use app styling; production-status pill confirmed independent of selection

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A sixth Show Queue manual QA correction, addressing wording confusion and input styling in the
`SplitDesignPickerModal` introduced by ADR-FP-053 — no new logic, just clearer copy and reused styling:

1. **Totals strip relabeled and reduced to 3 values.** "Show capacity" → **"Available on this show"**,
   now computed live as `showRemainingCapacity - selectedTotal` so it reflects what's left *after* the
   currently-entered quantities, not the show's capacity before the picker opened. "Remaining after this
   show" → **"Remaining for another show"** (same calculation as before: request total minus selected).
   "Request total" was dropped from the strip entirely — it duplicated the plain-language summary
   ("Request has N designs with a total qty of M prints") already shown one step earlier in
   `AddToShowModal`.
2. **Design card wording clarified.** `"Requested 25, 25 remaining"` was replaced with three separate
   lines: `"{quantity} requested"`, `"{alreadyAssigned} already assigned"` (only shown when non-zero —
   i.e. once a prior split leg touched that item), and `"{remainingQuantity} available to place"`. The
   quantity input's label ("Add to this show") was unchanged, since it already matched the required
   wording.
3. **Quantity inputs restyled to match the app.** The picker's `<input type="number">` now reuses the
   existing global `.print-requests-number-input` class (already used by `PrintRequestItemCard`'s
   quantity stepper) for spinner removal, plus new box styling (`--color-bg-secondary` background,
   `--color-border` border, `--radius-md`, focus ring via `--color-accent-primary`) matching the item
   card's stepper input — no new input component or styling system was introduced.
4. **Production-status pill confirmed independent of capacity/selection.** Investigated
   `getShowProductionStatusBadgeVariant()` and the `show-date-picker-option-badge` styling: the badge's
   `variant` prop is derived solely from `show.productionStatus` (never from capacity or the in-progress
   picker selection), and the separate `.is-over-capacity` modifier class recolors the badge only when a
   *different, capacity-driven* boolean (`wouldExceed`) is true — the two concerns were already
   architecturally separate before this round. No code change was needed here; this ADR documents the
   confirmation so a future QA pass doesn't re-flag it without checking the actual derivation first.

**Why**

Manual QA found the totals strip's original labels ("Show capacity: 25 remaining," "Remaining after
this show") ambiguous about what "remaining" referred to (before vs. after the current selection), the
design card's "25 remaining" wording didn't make clear whether that was per-design or per-request, and
the quantity inputs looked like unstyled native browser controls next to the rest of the app's inputs.

**Consequences**

- No pure-util or test changes were required — `calculateSplitSelectionTotal()` and
  `clampSplitItemQuantity()` are unchanged; only JSX copy, one inline live-capacity calculation, and CSS
  changed.
- The totals strip's grid (`split-picker-totals`) now renders 3 columns instead of 4; `auto-fit` grid
  sizing means no explicit column-count change was needed in CSS.
- Future picker copy changes should keep "available on this show" scoped to *after the current
  selection* — if a "before selection" capacity figure is ever needed again, it should get its own,
  differently-labeled field rather than overloading this one.

---

### ADR-FP-053: Split allocation uses a dedicated visual picker modal with thumbnails and live totals; Add to Show widens to `modal-panel-lg` with compact list-row show options

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Three fixes from the fifth Show Queue manual QA correction, all focused on the split-allocation UX
being too plain and the Add to Show modal running out of room:

1. **Dedicated visual picker.** The plain text rows with bare quantity inputs (`show-allocation-split-form`)
   are replaced by a new `SplitDesignPickerModal` component: each remaining design renders as a card with
   a full, uncropped thumbnail (`DesignThumbnailPanel` with `imageFit="contain"`, the same contained-fit
   pattern already used in `PrintRequestItemCard`), title, requested/remaining quantity, and a quantity
   input. A live totals strip shows "Selected for this show," "Show capacity," "Remaining after this
   show," and "Request total," all recomputed on every keystroke via `calculateSplitSelectionTotal()`.
   Per-design quantity is clamped to that design's own remaining quantity via `clampSplitItemQuantity()`
   (negative/fractional/non-finite input all resolve to a safe value); exceeding the show's overall
   remaining capacity shows an inline warning and disables the confirm button rather than silently
   overfilling — staff must lower quantities or use the danger override on the previous step instead.
   The picker holds its selections in local component state only; confirming stages them as one
   `AllocationLeg` in `AddToShowModal`, and canceling discards that state entirely, so no partial
   allocation is ever written to Firestore from either action.
2. **Wider, more space-efficient Add to Show modal.** Both `AddToShowModal` and the new
   `SplitDesignPickerModal` use the existing `modal-panel-lg` class (42rem, already defined for Design
   Library) instead of `modal-panel-md` (34rem) — no new CSS width tier or dependency was needed.
3. **Compact list-row show options.** `show-date-picker-option` changed from a `flex-direction: column`
   square card (`min-width: 8.5rem`) to a full-width horizontal row (date/time, capacity, and the
   production-status badge in one line), and `show-date-picker-options` changed from `flex-wrap: wrap`
   to a single vertical stack — matching the plan's explicit instruction that show title should not be
   emphasized and that date/time plus capacity are what matters here.
4. **Simplified, non-repetitive split warning.** The old wording ("N of M prints fit in this show's
   capacity. Choose which designs/quantities go here, or override to add everything anyway.") mentioned
   override redundantly, since the override checkbox directly below already explains that option. New
   copy via `shared/utils/printRequestSplitAllocation.ts`'s `formatSplitNeededWarning()`: "Only N of M
   prints can be added to this show. The remainder will need to be added to another show. Choose the
   prints to be added to this show." — no mention of override at all.

**Why**

Manual QA reported that the split flow, while functionally correct, didn't feel like a real design
picker (no thumbnails, no visual sense of "choosing" designs) and that the modal ran out of vertical
space quickly with square show cards. The warning copy's repeated override mention was flagged as
noise once the override checkbox was already self-explanatory.

**Consequences**

- Positive: staff can visually recognize which design they're allocating by thumbnail, not just by
  title text, matching how designs are already presented everywhere else in Print Requests.
- Positive: the Add to Show modal comfortably fits several show options, a split warning, capacity
  info, and the picker entry point without excessive scrolling.
- Positive: canceling the visual picker is provably safe — its state is local to the component and is
  discarded on unmount/cancel, never touching `showAllocations` or any other collection.
- Neutral: `AddToShowModal`'s `designTitleById?: Map<string,string>` prop was replaced with
  `designById?: Map<string, Design>` so the picker can also resolve thumbnail paths, not just titles;
  the one call site that didn't pass it (`UpcomingShowsPage`'s `+ Add Print Request` flow) continues to
  fall back to `item.sizeLabel`/a truncated item id, same as before.
- Neutral: no new dependency was added — thumbnails reuse the existing `DesignThumbnailPanel` component
  and derivative-URL resolution; no calendar/date-picker library was introduced.

---

### ADR-FP-052: Add-to-Show wording only mentions "remaining" once a split is underway; a new `editing` status distinguishes a de-queued request from a never-queued draft

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Three fixes from the fourth Show Queue manual QA correction:

1. **Add to Show wording only mentions "remaining" once a split is actually underway.** The modal
   previously always spoke in "N prints still need a show" / "Add all N remaining prints" terms, even
   for a request that fully fits its first selected show and has never been split. That is now gated
   by `shared/utils/printRequestSplitAllocation.ts`'s `shouldShowRemainingWording(legs.length)`: with
   zero committed legs, the modal shows only the plain summary ("Request has 2 designs with a total
   qty of 100 prints") and the footer's normal "Add to show" button commits the whole request directly.
   Once at least one leg has been committed (a split has genuinely started), "remaining" wording and
   the secondary "Add remaining N prints to this show" button reappear, matching the plan's example
   ("4 prints still need a show").
2. **Tab/detail selection is kept in sync with the active tab.** Adding a request to a show (moving it
   from `Working` to `Queued`) previously left the right-hand detail panel showing that same request
   even though `Working` was still the active tab and no longer contained it. `shared/utils/
   printRequestTabSelection.ts`'s `resolveSelectedRequestIdForTab()` is now run in an effect keyed off
   `activeListTab`/the tab's visible request ids: if the current selection isn't in the active tab, it
   falls back to that tab's first request, or clears to `null` (empty/select-a-request state) if the
   tab has none.
3. **New persisted `editing` status distinguishes "de-queued for revision" from "never queued."** A
   request that was queued and then fully removed from every show it was on previously fell back to
   `active`, which looked identical to a request that had just been queued. `PrintRequestStatus` gained
   `"editing"` (shared enum, Firestore rules, badge variant, list-grouping type). `upcomingShowService.
   markPrintRequestEditingIfNoActiveAllocations()` transitions `active` → `editing` once a request has
   zero active allocations left anywhere, called from both `removeShowAllocation()` and
   `removeShowAllocationsForRequest()`. `allocatePrintRequestItem()`'s existing draft-clearing check was
   widened to treat `draft` OR `editing` as "not yet active," transitioning either to `active` on the
   next allocation — so a re-queued `editing` request becomes `active` (shown with the derived `Queued`
   badge), never reverting to `draft`. This is a status-field addition, not a new field: queue/tab
   grouping is still derived entirely from `showAllocations` via `derivePrintRequestListTab()`, per the
   explicit instruction not to add a separate `printQueueStatus` field.

**Why**

Manual QA reported the "remaining" wording as actively confusing for the common case (a request that
just fits), the stale detail panel as looking like a data bug even though the underlying tab/allocation
data was correct, and `active` as failing to distinguish "currently queued" from "was queued, now being
revised" — both looked the same to staff, with no way to tell from the badge whether a request was safe
to treat as in-flight production planning or as work-in-progress.

**Consequences**

- Positive: the Add to Show modal's language matches its actual state — no split-flow vocabulary
  appears until a split has actually happened.
- Positive: the Print Requests detail panel can no longer show a request that isn't part of the active
  tab; switching tabs or having a request move tabs always keeps the two in sync.
- Positive: staff can tell at a glance whether a request is fresh (`Draft`), currently queued
  (`Active` + derived `Queued` badge), previously queued and now back for edits (`Editing`), or done
  (`Completed`), without reading allocation records directly.
- Neutral: `PrintRequestStatus`'s Firestore rules validator (`isValidPrintRequestStatus`) now allows
  `"editing"`; this is a **rules change that has not been deployed**. Until
  `firebase deploy --only firestore:rules` runs against the target project, any client attempt to write
  `status: "editing"` will be rejected by the deployed (older) rules even though local code sends it —
  this is a required deploy checkpoint before the `editing` behavior can be verified end-to-end in a
  live environment, not just locally against the emulator/no-backend paths.
- Neutral: no new Firestore index was needed — this is a single-document field addition, not a new
  query shape.

---

### ADR-FP-051: Split allocation is staff-directed; allocated quantity is always recomputed, never incrementally adjusted; queue state gates editing via a status transition, not a new field

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Three implementation choices from the third Show Queue manual QA correction:

1. **Staff-directed split allocation.** When a Print Request doesn't fully fit a selected show's
   remaining capacity, the Add to Show flow now lets staff choose exactly which designs/quantities go
   to that show (`shared/utils/printRequestSplitAllocation.ts` tracks per-item remaining quantity
   across the session), see the computed remainder, and pick another show (or repeat) until the
   request is fully allocated or they cancel. The prior behavior only warned about the split without
   letting staff choose designs/quantities; auto-splitting without staff control was explicitly
   rejected. A danger override can still force the full remaining quantity onto one show.
2. **Recompute, don't decrement, `allocatedQuantity`.** Removing a Print Request from a show now
   deletes every non-canceled `showAllocations` record for that `printRequestId` on that show in one
   service operation (`removeShowAllocationsForRequest`), then recomputes the show's
   `allocatedQuantity` by summing the remaining allocations (`recalculateShowAllocatedQuantity`),
   rather than subtracting a remembered total. Manual QA found the prior per-allocation subtract path
   left the show's allocated total stale after removal. Recomputing from source data is the only way
   to guarantee the denormalized total can't drift.
3. **Status transition instead of a new persisted queue field.** A Print Request moves `draft` →
   `active` on its first show allocation, and to `completed` once every unit of its requested quantity
   has been allocated and printed (`markPrintRequestCompletedIfFullyPrinted`). The Working/Queued/
   Printed list tabs and the queued-request edit lock are still derived live from `showAllocations`
   totals (`derivePrintRequestListTab`, `canRemoveRequestFromShow`) — no new `printQueueStatus` field
   was added, per the explicit instruction to avoid a second field that needs to stay in sync unless
   absolutely necessary. The existing `status` field only needed two additional transitions to stop
   showing `DRAFT` on a queued request; that was judged sufficient without a new field.

**Why**

Manual QA specifically called out that (a) staff had no way to control which designs/quantities went
to which show when a request didn't fit, (b) the show's allocated total visibly failed to decrease
after removing a request, and (c) queued requests still displayed `DRAFT`, which reads as "not yet
committed" when it is in fact already queued for production. Each fix targets the reported defect
directly rather than introducing new persisted state where deriving from existing data is sufficient.

**Consequences**

- Positive: Staff have full control over which designs/quantities land on which show during a split,
  matching the required example (204 total, 200 to Show A, 4 to Show B, or override).
- Positive: A show's `allocatedQuantity` can never drift from its underlying allocation records,
  because every add/remove path now recomputes it from source rather than adjusting a running total.
- Positive: Removing a queued request from a show is blocked once that show's `productionStatus` is
  `printing`, `fully_printed`, `completed`, or `archived` — an admin correction is required beyond
  that point instead of silently breaking in-progress production records.
- Neutral: `printRequests.status` now has two additional automatic transitions (to `active` on first
  allocation, to `completed` on full print completion) driven by `upcomingShowService`, not just by
  direct staff edits on the Print Requests page.
- Neutral: No Firestore rules or index changes were required — `status` already allowed `active`/
  `completed`, and `showAllocations` deletes were already staff-allowed.

---

### ADR-FP-050: Same-monitor external links use an in-app window; default show capacity is a direct-write setting

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Two implementation choices from the Show Queue UI/flow polish pass:

1. **Same-monitor external links.** Electron's `shell.openExternal` hands off entirely to the OS
   default browser, which owns its own window placement — Electron cannot position it. To guarantee
   the Whatnot show URL (and any future external link) opens on the same monitor as the app, links now
   open in a new in-app `BrowserWindow` positioned via `screen.getDisplayMatching()` against the app's
   current window bounds, rather than the user's actual default browser. This window is sandboxed,
   has no Node integration, and only ever loads a URL passed through a shared `isSafeExternalLinkUrl()`
   validator (`shared/utils/externalLinkSafety.ts`) that allows only `http:`/`https:` — enforced on
   both the renderer and main-process sides via a new `fresh-prints:app:open-external-link` IPC
   channel, following the existing app IPC channel/handler/preload pattern.
2. **Default show capacity setting.** A new "default max quantity for new shows" setting is stored at
   `settings/showQueue` and read/written directly by the client SDK (staff-only via Firestore rules),
   the same simpler pattern already used for per-show `setShowMaxQuantity`, rather than the AI
   Enrichment settings pattern (realtime `onSnapshot` plus a Cloud Function callable for writes). The
   default is applied only when `upcomingShowService.upsertUpcomingShow()` creates a brand-new show;
   existing shows are never retroactively changed, and staff can still override any individual show's
   capacity afterward.

**Why**

Same-monitor placement was an explicit product requirement, and the only way to guarantee it is
controlling the window ourselves — the tradeoff (an in-app window instead of the user's real default
browser, with no extensions/saved logins from their normal profile) was discussed and approved before
implementation. For the settings doc, a direct client write keeps the implementation proportional to
the feature: a single staff-configurable number doesn't need server-side validation parity with the
AI Enrichment settings, and avoids adding a new Cloud Function/deploy surface for a simple default.

**Consequences**

- Positive: Same-monitor placement for external links is now guaranteed rather than best-effort.
- Positive: New shows can start with sensible default capacity without staff re-entering it every time,
  while remaining fully overridable per show.
- Neutral: External links opened from Studio use an embedded window, not the user's actual default
  browser — no browser extensions, saved passwords, or existing sessions carry over. This is a known,
  accepted limitation, not a bug.
- Neutral: A new Firestore rules block (`settings/showQueue`) was added locally but not deployed; a
  human-approved `firebase deploy --only firestore:rules` is required before this setting is usable
  against a live Firebase project.

---

### ADR-FP-049: A Whatnot show is the print run — combine Show Queue and Print Runs into one entity

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Manual QA of ADR-FP-048's split `upcomingShows` / `printRuns` / `printRunItems` model failed on
2026-07-05 for two classes of reasons: (1) UI bugs — the "Track a Whatnot show" modal required typing
a Whatnot show ID by hand instead of parsing it from a pasted URL, had no date/time selector, and a
Firestore `orderBy("scheduledStartAt")` query silently excluded any show missing that field, so saved
shows never appeared in the list and could not be attached to a run; (2) a product-model mismatch —
the business will never have more than one print run per Whatnot show, so tracking them as two
separate collections with two separate pages (`/show-queue` and `/print-runs`) created redundant
navigation with no benefit.

The corrected model treats **a Whatnot show as its own print run**:

- `upcomingShows` becomes the single combined entity for both schedule tracking and production
  planning. The standalone `printRuns` and `printRunItems` collections are removed; `/print-runs`
  redirects to `/show-queue`, and the sidebar shows one `Show Queue` entry.
- `UpcomingShow` gains `productionStatus` (`open`/`full`/`printing`/`fully_printed`/`completed`/
  `archived`/`canceled`) as a field **separate from** the existing `status` (Whatnot schedule/source
  health: `scheduled`/`live`/`canceled`/`missing_upstream`/etc.) — sync health must never be mixed
  with production completion, per explicit product direction.
- `UpcomingShow` gains staff-editable capacity: `maxTotalQuantity` (optional, undefined = no cap),
  `allocatedQuantity` (denormalized sum of active allocations), and `maxQuantityOverridden` (set when
  staff use the danger override to lower the max below current allocation or exceed it on allocate).
- A new `showAllocations` collection (replacing `printRunItems`) allocates some or all of a
  `printRequestItem`'s quantity to a show. The same item may have multiple allocation records across
  different shows, so a Print Request can be **split across shows** when a single show's capacity
  isn't enough — this replaces an earlier one-run-per-item assumption that no longer matches the
  product workflow. Allocation never mutates `printRequestItems`, `printRequests`, or `designs`.
- The manual "Track a Whatnot show" modal now requires a Whatnot URL first (show ID parsed and
  displayed read-only, never typed), and a scheduled date/time is required to save. The show list now
  reads the full collection and sorts **client-side** by `scheduledStartAt` (missing schedules last)
  instead of a Firestore `orderBy`, so a record missing that field is still visible — the direct fix
  for the list bug, kept as a defensive measure even though the date/time field is now required.
- Print Requests do not gain a persisted queue/print status field. `derivePrintRequestQueueState()`
  (`not_queued`/`partially_queued`/`queued`/`partially_printed`/`printed`) is computed live from a
  request's show allocations every time it's displayed, per explicit product direction to avoid a
  second status field that every allocation mutation would have to keep in sync.
- `Add to Show` is the primary action, placed on the Print Request detail page (one button that
  allocates all of a request's items to a chosen show at once, offering a staff danger override when
  the request would exceed the show's remaining capacity). `+ Add Print Request` on the show detail
  page is a secondary, request-picker-first path to the same allocation logic.

**Why**

The user's manual QA explicitly identified both the UI defects and the product-model mismatch, and
supplied the corrected business rule directly: "We will never have more than one print run for a show,
so keeping separate Upcoming Shows and Print Runs creates redundant work and confusion." Given this is
a dev-only environment with no production data to preserve, the cleanest fix was to reshape the Phase 7
data model rather than bridge the two collections together.

**Consequences**

- Positive: One show record is now the single place staff manage both schedule and production for a
  Whatnot show — no more cross-referencing two pages for what is conceptually one thing.
- Positive: A Print Request can be split across shows via independent allocation records without any
  change to `printRequestItems`, `printRequests`, or `designs`.
- Positive: The list-bug root cause (Firestore `orderBy` excluding schedule-less documents) is fixed
  structurally (client-side sort) as well as by the new required date/time field, so it can't recur
  even if a future write path omits the schedule.
- Neutral: `printRuns`/`printRunItems` collections, their Firestore rules/index entries, and the
  `/print-runs` feature folder were deleted outright (dev-only data, never deployed) rather than
  migrated; `/print-runs` remains as a redirect to `/show-queue` for link compatibility.
- Neutral: Local Firestore rules/index definitions were updated for `upcomingShows` (new fields) and
  `showAllocations` (new collection) but were not deployed; a human-approved
  `firebase deploy --only firestore:rules` / `--only firestore:indexes` is required before this phase
  is usable against a live Firebase project.
- Neutral: Live Whatnot fetch/sync, an hourly scheduled Function, a manual scrape button, and an
  auto-update toggle remain unimplemented and unapproved; shows are still populated manually.

---

### ADR-FP-048: Phase 7 foundation splits Upcoming Shows (schedule) from Print Runs (production)

> **Superseded 2026-07-05 by ADR-FP-049.** Manual QA failed and the split model was replaced by a
> single combined `upcomingShows` entity. This entry is kept for history only.

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Decision**

Phase 7 introduces three new collections instead of reusing the legacy `showQueues`/`showQueueItems`
model, which is now removed:

- `upcomingShows` — local Studio metadata for Whatnot-backed shows, matched and updated by stable
  `source + whatnotShowId`, never by date/time (show dates/times can move upstream). Schedule state
  (`status`, `syncStatus`, `syncError`, `lastSyncedAt`, `lastSeenAt`) lives only here. Records are
  never auto-deleted; a show missing upstream is marked `missing_upstream` instead.
- `printRuns` — Studio production-planning batches. A run may optionally link to one `upcomingShow`
  and captures that show's title/schedule as a point-in-time snapshot at creation time, so a later
  Whatnot schedule change never rewrites already-captured planning context. One `upcomingShow` may
  have zero, one, or many linked `printRuns`.
- `printRunItems` — production items attached to a run, created as a snapshot-plus-reference from an
  existing `printRequestItem`. Production status (`pending`/`queued`/`in_progress`/`printed`/`done`/
  `canceled`) lives only here.

The `/show-queue` route is repointed from the disabled legacy placeholder to a real Upcoming Shows
page; `/print-runs` is a new Print Runs route. Both appear in the sidebar. Live Whatnot fetch/sync,
an official Whatnot API assumption, a scheduled Cloud Function, and a manual-refresh callable are
explicitly out of scope for this foundation slice — show records are created/updated manually by
staff through the same upsert path a future sync would use.

**Why**

The legacy `showQueues`/`showQueueItems` model conflated show scheduling with production status and
was never implemented with real data. Whatnot show dates/times are mutable, so keying local records
by date would silently duplicate records on every reschedule; a stable external ID is required.
Separating schedule ownership (`upcomingShows`) from production ownership (`printRunItems`) keeps the
existing Phase 6 rule that `designs.status` never receives a production write, and keeps a future
sync implementation additive rather than a rework of the production model.

**Consequences**

- Positive: Rescheduling a Whatnot show updates one local record instead of creating duplicates.
- Positive: Print Runs keep accurate historical show context even after later schedule changes,
  via the creation-time snapshot.
- Positive: Attaching a Print Request item to a run never mutates `printRequestItems`, `printRequests`,
  or `designs` — Phase 6 Print Request behavior is unaffected.
- Neutral: Local Firestore rules/index definitions were added for the three new collections but were
  not deployed; a human-approved `firebase deploy --only firestore:rules` / `--only firestore:indexes`
  is required before this phase is usable against a live Firebase project.
- Neutral: No live Whatnot integration exists yet; Upcoming Shows are populated manually until a sync
  method is separately reviewed and approved.

---

### ADR-FP-047: Print Request item preview polish separates display DPI from save eligibility

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Decision**

Print Request item cards show contained thumbnails in the existing item-card footprint and reuse the
existing design preview lightbox for enlarged previews. The preview uses `design.previewPath` when
available and falls back to `design.thumbnailPath`.

Requested-size DPI feedback is calculated whenever source pixel dimensions and requested inch
dimensions are valid. The 22-inch standard Print Request maximum is applied after DPI calculation,
so oversized requested dimensions still display the accurate DPI and quality label while remaining
blocked from autosave with the existing Custom Request guidance.

**Why**

Staff need to inspect the full artwork from a request item without cropped previews. Staff also
need accurate print-quality feedback while correcting oversized requested dimensions; displaying
`0 DPI` solely because a size exceeds 22 inches hides useful information.

**Consequences**

- Positive: Item cards show full artwork without changing the card footprint.
- Positive: Staff can open a larger preview without mutating images or design records.
- Positive: Oversized requested sizes still block standard item saves while showing accurate DPI.
- Neutral: No data model, Firestore rules, index, deploy, migration, backfill, or image-generation
  change is required.

---

### ADR-FP-046: Print Request item creation initializes standard requested size separately from catalog dimensions

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Decision**

Approved catalog designs can be added to standard Print Requests even when their catalog/default
print dimensions exceed the 22-inch standard request cap. New `printRequestItems` initialize their
requested size separately from the catalog design dimensions:

- If the design/default width is greater than 10 inches, initialize requested width to 10 inches
  when that keeps both requested sides at or below 22 inches.
- If the design/default width is already below 10 inches, keep that smaller requested width when
  valid.
- Calculate requested height proportionally from the design pixel aspect ratio.
- For extreme aspect ratios, reduce the initialized width just enough so neither requested side
  exceeds 22 inches.

The 22-inch rule remains enforced for persisted standard Print Request item dimensions. Edit and
autosave validation still blocks requested sizes above 22 inches and below 200 DPI. Catalog design
dimensions are not mutated, and original images, thumbnails, and previews are not resized,
resampled, compressed, or regenerated. Duplicate item creation preserves the source item's explicit
requested size instead of reinitializing.

**Why**

The previous selection path inherited `design.printWidthInches` / `printHeightInches` as requested
item dimensions. That incorrectly blocked approved catalog designs such as a 30 x 35 inch design
before a Print Request item could be created. Catalog/default dimensions and requested Print Request
item dimensions are different product concepts and must stay separate.

**Consequences**

- Positive: Staff can add oversized catalog designs to standard Print Requests and get a usable
  requested size, for example about 10 x 11.67 inches for a 30 x 35 design.
- Positive: No Firestore rules exception or deploy checkpoint is needed because new requested item
  dimensions remain within the existing 22-inch cap.
- Tradeoff: Extreme aspect-ratio designs may initialize below 10 inches wide so the proportional
  requested size remains valid for standard Print Requests.

---

### ADR-FP-045: Print Request origin is explicit metadata, not name inference

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Decision**

Print Requests store explicit origin metadata on `requestOrigin`:

- `studio_internal` for internal requests created in Fresh Prints Studio.
- `studio_customer` for staff-created customer requests in Fresh Prints Studio.
- `portal_customer` reserved for future Fresh Prints Portal-created customer requests.

Request origin must not be inferred from request names. Customer request names remain
sequence-based, such as `sarahsmith-CR001`, and internal request names remain `baseName-IR###`.

Existing Print Requests without `requestOrigin` remain readable with no migration or backfill.
Studio display badges use compatibility fallback rules:

- `studio_internal` -> `Internal`
- `studio_customer` -> `Staff Created`
- `portal_customer` -> `Customer Submitted`
- missing origin + `isInternal === true` -> `Internal`
- missing origin + `customerId` exists -> `Staff Created`
- otherwise -> `Legacy`

No origin filters, Firestore indexes, Portal behavior, customer Auth, Portal login,
customer-created request workflow, migration, or backfill are part of this Phase 6 follow-up.

**Why**

Studio and future Portal need to distinguish internal lists, staff-created customer lists, and
future customer-submitted Portal lists at a glance. Names are display identifiers and may evolve;
origin is product metadata and must be stored separately for future authorization and workflow
clarity.

**Consequences**

- Positive: Future Portal work can rely on a clear origin field instead of fragile name parsing.
- Positive: Existing records remain readable without data migration.
- Tradeoff: Firestore rules must be deployed separately before dev/manual QA can write the new
  field against Firebase.

---

### ADR-FP-044: Business-context framing in the catalog prompt (v21) — judge by subject, not visual style

| Field | Value |
|-------|-------|
| Date | 2026-07-02 |
| Status | accepted |

**Decision**

1. Added a business-context paragraph to the start of `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`
   (`shared/constants/aiEnrichment.constants.ts`), placed before the existing `Return:` field
   instructions so it frames every subsequent judgment (title, description, category, tags):

   > You are cataloging a DTF (direct-to-film) transfer design for an apparel print shop. These
   > designs are printed onto shirts and similar garments. Judge the category, title, and tags by
   > what the design is fundamentally about: its main subject, message, joke, buyer intent,
   > occasion, role, or theme. Do not choose categories or tags only because of visual style, font
   > choice, color palette, or decorative imagery. For example, lashes, lipstick, heels, or elegant
   > script do not make a design Luxury & Fashion Inspired unless beauty, fashion, glam, or luxury
   > is truly the subject. School supplies do not make a design School & Education unless school,
   > teaching, students, or education is truly the subject. Religious-looking decoration does not
   > make a design Faith & Inspirational unless faith, prayer, scripture, or inspiration is truly
   > the subject.

2. Bumped `CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-v21` and
   `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-dev-v21`
   (`catalogTitleRules.ts`), following the established convention that any catalog-prompt content
   change bumps the version (v18/v19/v20 all did the same).
3. This is a prompt-content-only change. No changes were made to
   `catalogThemeCategoryResolver.ts` (category scoring/priority-boost logic),
   `catalogTagResolver.ts` (tag matching/last-resort suggestion gating), the tag reranker
   (`catalogTagRerankProvider.ts`), suggestion authoring
   (`catalogSuggestedTagAuthorProvider.ts`), or any category/tag data — all confirmed unaffected
   and explicitly out of scope for this phase.
4. Added a new regression test
   (`src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`)
   asserting the business-context paragraph is present, mentions DTF/apparel/shirts, names the
   subject/message/buyer-intent judgment criteria, and appears before the `Return:` field block —
   guarding against this framing silently regressing in a future prompt edit, since no prior test
   covered prompt prose content at all.

**Why**

Real-world report: a design reading "Lashes longer than my Patience" — a sarcastic joke
illustrated with eyelash line art in elegant script — was AI-categorized as `Luxury & Fashion
Inspired`, titled in part "Beauty Makeup Cosmetics" (an invented phrase not present in the design),
and tagged with a weak `fashion` tag alongside the correct `funny`. Root cause, confirmed by code
inspection: the shipped default prompt (v20) gave the model zero business context — it opened with
only "Analyze the provided image and return only valid JSON," no framing of what business this is
for or what these designs are used for. With nothing anchoring it to buyer intent, the model
free-associated from visual similarity (script font, lash/beauty-adjacent imagery) toward
fashion/beauty concepts instead of judging what the design was actually about (a joke).

This is not a category-resolution bug: per ADR-FP-039/041, `resolveThemeCategory` trusts an exact
match between the model's raw category answer and an approved category name directly, with no
second-guessing — `Luxury & Fashion Inspired` is a real approved category name, so the model's
(wrong) answer passed through exactly as designed. The fallback token-overlap/priority-boost
scorer, which has buyer-intent priority families for family/faith/teacher themes, never got a
chance to run, and even if it had, there is no humor/sarcasm priority family that would have
caught this case. Fixing this in the resolver would mean adding an ever-growing list of
category-specific server-side overrides; fixing it in the prompt gives the model itself better
judgment up front, which generalizes to categories/cases not yet observed.

The wording is deliberately broader than the single reported case: rather than a fashion/luxury-
only fix, it states one general principle (subject/message/buyer intent over visual style/
decoration) and illustrates it with three worked examples spanning three different categories
(fashion/luxury, school/education, faith/inspirational) that are all plausible instances of the
same underlying confusion — style-adjacent decoration mistaken for subject matter. This was an
explicit design choice over enumerating every possible category confusion: a good general
principle should generalize better than a growing list of special cases, and keeps the prompt
compact (a few dozen extra tokens, similar in scale to the `{{approved_category_names}}` addition
in ADR-FP-041, not the ~4.4x cost of full tag-name injection that stays gated).

**Alternatives considered**

- *Resolver-side humor/sarcasm priority family* (mirroring `FAMILY_PRIORITY`/`FAITH_PRIORITY`/
  `TEACHER_PRIORITY` in `catalogThemeCategoryResolver.ts`) — deferred, not rejected. Flagged as a
  future-expansion option if the prompt-level fix alone doesn't sufficiently address this class of
  error after real-world use. The user's immediate ask was specifically about improving the
  model's own judgment, not adding another server-side override layer.
- *Category-field-only instruction change* (leave the opening framing alone, only tighten the
  `category:` field's own instructions) — rejected: the reported miscategorization affected title
  and tags too (invented "Beauty Makeup Cosmetics," weak "fashion" tag), not just category, so a
  category-only fix would have left the same root cause free to affect other fields.
- *Renaming/narrowing "Luxury & Fashion Inspired" itself* — out of scope; that is Tag/Category
  Management data curation, not an AI-prompt concern, and flagged separately for a future review of
  whether the category name itself (the word "Inspired") invites over-eager matching.

---

### ADR-FP-043: Suggested new tags are a last resort; AI-authored suggestion quality when they fire

| Field | Value |
|-------|-------|
| Date | 2026-07-02 |
| Status | accepted |

**Decision**

1. Added a server-side "last-resort" gate, `isSuggestedTagsLastResort` (`catalogTagResolver.ts`),
   that decides *whether* `suggestedNewTags` generation is allowed at all for a design — not just
   how many suggestions fit in the remaining room under the 8-tag cap (the pre-existing
   `remainingSuggestionRoom` check, which still applies once the gate passes). Rule: suggestions
   are eligible when 0-2 approved tags matched, or when exactly 3 matched but all three were weak
   (per-token-fallback-only, never an exact name/alias match) **and** at least 2 raw candidates
   went completely unmatched. Suggestions never fire with 3 approved matches that include at least
   one strong match, and never fire with 4 or more approved matches at all, regardless of match
   quality or how much room remains under the cap. A design with 5+ solid approved tags now ships
   with exactly those tags — no padding to 8 with weak suggestions.
2. `resolveAiCatalogTags` now tracks match strength internally (a tag's recorded match reason
   upgrades from weak to strong if a later candidate confirms it via exact/alias match, and never
   downgrades) and exposes it as `allMatchesAreWeak` on its result, alongside the existing
   `unmatchedCandidateCount`. The gate is evaluated live during resolution — since the AI's own
   `suggestedNewTags` reconciliation loop can still promote entries into `approvedResult` via
   alias/context matching, which can only make the gate more restrictive as it runs.
3. Added a new optional text-only second call, the "suggestion author," that runs only when the
   last-resort gate fired and produces AI-authored `preferredWhen` text and real aliases for each
   candidate — replacing the previous single generic template
   (`Use when "X" is a primary searchable subject...`) with per-design, per-concept detail matching
   the quality of hand-written approved tags. The model may also decline to author a candidate
   entirely (simply omitting it from its output) — a further reduction beyond the gate itself.
4. The suggestion-author call reuses the `ai-tag-rerank-second-call` phase's established pattern
   (text-only, `fetchVisionWithRetry`, tolerant JSON parsing, strict server-side validation) and,
   when both the tag reranker and suggestion author are enabled and both triggers fire for the same
   design, **shares one physical Gemini call** with the reranker rather than making two requests —
   the reranker prompt already carries the exact context (first response, matched/shortlisted
   approved tags) the author needs. When the reranker is off or not triggered, the suggestion
   author runs as its own standalone call so suggestion quality never depends on an unrelated
   setting. Controlled by a new independent owner/admin setting, `suggestionAuthorMode:
   "off" | "auto" | "always"` (shipped default `off`), separate from `tagRerankMode` — the two
   optional calls solve different problems (thin overall coverage vs. borderline individual
   matches) and can be enabled independently.
5. The author's calibration reference — up to 4 real approved tags shown so the model matches
   existing style/specificity — is selected deterministically, never randomly: relevant-and-
   high-quality tags first (token overlap with matched tags/candidates, 2+ aliases, non-generic
   `preferredWhen`), then remaining relevant tags, then remaining high-quality tags to fill any
   leftover slots, with alphabetical tie-breaking for stable, testable output. Each example is
   reduced to name + up to 3 aliases + `preferredWhen` only — never the full approved tag database.
6. Server-side validation (`validateAuthoredSuggestions`, shared by both call paths) rejects any
   authored name outside the original candidate list, enforces existing length/character rules,
   caps aliases at 5 and `preferredWhen` at 300 characters. On any failure — network error, invalid
   JSON, or the call being disabled — suggestions still generate via the pre-existing
   server-templated fallback for the same last-resort-gated candidates; suggestions are never
   silently dropped once the last-resort gate has already decided they're needed, since that is
   exactly the case where staff need *something* to review even if imperfect.
7. New `DesignAiSuggestions` fields (all optional, no migration), mirroring the tag reranker's
   tracking pattern with a distinct name prefix: `suggestionAuthorStatus: "skipped" | "succeeded" |
   "failed"`, `suggestionAuthorFailureReason`, `suggestionAuthorPromptTokens`,
   `suggestionAuthorCompletionTokens`, `suggestionAuthorEstimatedCostUsd`,
   `suggestionAuthorPromptVersion` (`catalog-suggested-tag-author-v1`). When the merged call path
   runs, the combined request's cost/tokens are recorded on both `tagRerank*` and
   `suggestionAuthor*` fields for display purposes — this is not a per-call billing split, just
   ensuring the true combined total is visible regardless of which field a UI reads.
8. Playground support is explicitly deferred to a fast-follow phase, since the tag reranker's own
   Playground pattern (ADR-FP-042 item 6) is still pending manual signoff at the time of this
   decision. This phase is verified via unit tests plus a manual AI Review smoke test instead.

**Why**

Two related problems, both reported directly by staff after real-world use of the tag reranker
(ADR-FP-042): first, suggestions fired too often — a design with 5+ good approved matches would
still get padded with 3-5 weak suggested-new-tags just because room remained under the 8-tag cap,
even though the design was already well-tagged and didn't need more. Second, when suggestions did
fire, their quality was poor — a single fixed-template sentence with no design-specific reasoning,
falling well short of the detailed, hand-curated `preferredWhen`/alias quality staff maintain for
real approved tags in Tag Management. Suggestions should be a genuine last resort (only when the
approved tag library truly can't describe the design), and when they are needed, they should look
like something a human would actually write, since staff are the ones who will read and act on
them. Sharing a physical call with the reranker when both fire keeps the added cost proportional —
this is exactly the thin-coverage case where fewer designs qualify by design, so aggregate cost
impact should be lower than the reranker's own `auto` mode, not higher.

**Alternatives considered**

- *Always require the tag reranker to be on for suggestion authoring* (fold into `tagRerankMode`
  rather than a distinct setting) — rejected: a shop that keeps the reranker off entirely (e.g.
  satisfied with server-side matching quality) should still get well-written suggestions when
  coverage is thin; the two calls solve different problems and should be independently toggleable.
- *Random calibration example selection* — rejected: makes output and tests harder to compare run
  to run, with no real quality benefit over a deterministic relevance/quality-ranked selection.
- *An explicit `worthSuggesting: boolean` field on each authored suggestion* — considered, then
  simplified to "omit the candidate from the output array" for the same effect with a smaller
  output schema and less validation surface.

---

### ADR-FP-042: Optional text-only Gemini tag reranker second call, settings-controlled, off by default

| Field | Value |
|-------|-------|
| Date | 2026-07-02 |
| Status | accepted |

**Decision**

1. Added an optional second, text-only Gemini call — the "tag reranker" — that runs after the
   existing single vision call and after the existing server-side approved-tag matching
   (`catalogTagResolver.ts`). It receives the first call's JSON response (title/description/
   category/tags), the pre-rerank resolved category name, and a compact `approvedTagCandidates`
   shortlist (matched approved tags plus nearby matches for unmatched raw candidates, capped at
   ~30 entries) built deterministically by an extension to `resolveAiCatalogTags`. It never
   receives the image and never receives the full approved tag database.
2. Controlled by a new owner/admin setting, `tagRerankMode: "off" | "auto" | "always"`, persisted
   on the same `settings/aiEnrichment` document `updateAiEnrichmentSettings` already writes.
   **Shipped default is `off`.** `auto` runs the second call only when the server-side matcher's
   own output shows signs of ambiguity (`unmatchedCandidateCount >= 3`, fewer than 5 of 8 tag
   slots filled, or 2+ `suggestedNewTags` generated) — a set of cheap, deterministic heuristics
   computed from data the resolver already produces, so the decision to run the reranker costs
   nothing extra. `always` runs it on every design and is intended as a temporary comparison/
   testing mode, not a standing production setting.
3. The reranker's `tags` output is validated strictly server-side: any tag not present in
   `approvedTagCandidates` is discarded individually (a response with some valid and some invalid
   tags is not rejected wholesale — the valid subset is kept). If zero valid tags survive, or the
   call fails/returns invalid JSON/empty output, the pipeline falls back to the tags
   `resolveAiCatalogTags` already resolved and continues unaffected. The reranker can never invent
   a persisted final tag and can never override category resolution.
4. The reranker's `uncoveredConcepts` output (concepts it flagged as important but not covered by
   the shortlist) is fed back into the existing server-side `suggestedNewTags` generation path as
   additional unmatched-candidate input — subject to the same single-word-safe-reduction/rejection
   normalization as any other candidate (ADR-FP-039 review note 4). It is never written directly as
   a persisted final tag.
5. Because category resolution (`resolveThemeCategory`) uses matched tags as a scoring signal, and
   the reranker can change the final tag set, category resolution now runs twice on a design that
   triggers the reranker: once before (best-effort, to give the reranker a resolved category name
   for its own prompt context) and once after (final, using the post-rerank tag set). Both calls
   are pure/deterministic/free — this adds no cost, only a small control-flow change scoped
   entirely to the reranked path. A design where the reranker does not run (`off`, or `auto` not
   triggered) gets exactly one category resolution call, identical to pre-existing behavior.
6. New Cloud Function callable `testAiEnrichmentTagRerank`, gated by the same owner/admin
   authorization check as the existing `testAiEnrichmentPlayground`/`updateAiEnrichmentSettings`
   (never weaker). Added to the Settings AI Playground UI as a "Run tag rerank" button available
   after a valid first-call vision result, so staff can compare first-call tags, the shortlist
   sent, the reranker's output, any discarded tags, and the second call's token/cost estimate
   before ever enabling `auto` in production. Does not write to `designs` and does not persist the
   uploaded image, matching the existing Playground's guarantees.
7. New `DesignAiSuggestions` fields (all optional, no migration): `tagRerankStatus: "skipped" |
   "succeeded" | "failed"`, `tagRerankFailureReason`, `tagRerankPromptTokens`,
   `tagRerankCompletionTokens`, `tagRerankEstimatedCostUsd`, `tagRerankPromptVersion`
   (`catalog-tag-rerank-v1`), `tagRerankUncoveredConcepts`. A tri-state status (rather than a
   single boolean) distinguishes "mode was off / heuristic didn't fire" from "ran and failed" from
   "ran and succeeded," which a single `tagRerankRan` boolean could not.

**Why**

Staff reported the v20 pipeline surfaces too many `suggestedNewTags` — the deterministic
server-side matcher is good at exact/alias/token string matching but has no way to judge buyer
intent, so phrase-y or ambiguous raw candidates (e.g. "mom life", "rock on", "messy bun") often go
unmatched even when a genuinely relevant approved tag exists. Rather than re-injecting the full
approved tag database into the first call (measured ~4.4x cost per ADR-FP-041) or hoping a bigger
first prompt fixes it, this narrows the problem the AI is asked to solve: the server does what it's
good at (deterministic matching, scoring, shortlist-building), and a second, small, text-only call
does what the server can't (judgment over a short, well-scoped list) using the first call's own
analysis as context. Defaulting to `off` and shipping Playground support in the same phase lets the
team validate real cost/quality tradeoffs on real designs before committing to `auto` in
production, rather than silently doubling AI cost the day this deploys.

**Consequences**

Positive: A concrete, testable path to better tag coverage on designs the server-side matcher
struggles with, without paying full-tag-database injection cost on every design. Server remains
authoritative over final persisted tags at every step. Existing `off`-mode behavior for the whole
pipeline is provably unchanged (the reranker code path is only entered when `shouldRunTagRerank`
returns `true`, which is `false` unconditionally for `off`).

Tradeoff: `auto`-mode heuristic thresholds (3+ unmatched, <5 resolved tags, 2+ suggestions) are a
reasonable starting point derived directly from the reported symptom, not yet empirically tuned —
expect adjustment once real `auto`-mode usage data comes in. Reranked designs pay real added
latency (a second network round trip) even though the dollar cost is small, which matters most for
the `always` mode's aggregate impact on the AI Processing queue if left on longer than intended as
a testing mode. Firebase Functions deploy (to actually enable `testAiEnrichmentTagRerank` and the
new settings field in production) remains a separate human checkpoint, not performed as part of
this change.

---

### ADR-FP-041: Approved category names in prompt (v20); trust exact AI category matches; remove hardcoded tag synonym rewriting

| Field | Value |
|-------|-------|
| Date | 2026-07-01 |
| Status | accepted |

**Decision**

1. Added approved category **names only** (no descriptions, aliases, or preferred-when text) to
   the default AI Processing prompt template via the existing `{{approved_category_names}}`
   placeholder, which is now a required placeholder alongside `{{excluded_tags}}`. Bumped the
   catalog enrichment prompt version from `catalog-enrich-v19` to `catalog-enrich-v20`
   (`catalog-enrich-dev-v20` for the development provider).
2. Measured per-image vision cost via Settings AI Playground before deciding scope:
   - Baseline (v19, no taxonomy in prompt): ~$0.000128/image (~$128 per 1M images).
   - + approved category names only: ~$0.000129/image (~$129 per 1M images, +0.8%).
   - + approved category names **and** approved tag names: ~$0.000565/image (~$565 per 1M
     images, +341% / ~4.4x baseline).
   Approved tag names, aliases, descriptions, and preferred-when text remain **not injected** into
   the prompt as a result — that stays gated behind a real before/after accuracy comparison run
   through Settings AI Playground before ever being reconsidered.
3. `catalogThemeCategoryResolver.ts` (`resolveThemeCategory`) now checks for an exact match (case
   and punctuation tolerant, via the same `normalizeForAliasMatch` normalization already used for
   tag alias matching) between the model's raw category candidate and an approved category name
   before running the token-overlap/priority-boost fallback scorer. When the model copies one of
   the approved names it was shown, that choice is trusted directly. The fallback scorer (family/
   faith/teacher priority boosts, style-only and bare-quote exclusions — unchanged from
   ADR-FP-039) now only runs when there is no exact match: typos, paraphrases, or a legacy
   owner-edited prompt template that omits the category list.
4. Removed `TAG_ALIASES` and `TAG_COMPANIONS` from `catalogTitleRules.ts`. These previously
   force-rewrote the model's tag word choice during normalization
   (`comedic`/`comedy`/`humor`/`humorous`/`joke`/`jokes` → `funny`; `sarcastic`/`sassy`/`snarky`/
   `witty` silently gained an appended `funny` tag the model never returned). Tag normalization now
   only tokenizes, lowercases, dedupes, and applies exclusion/generic-word filtering — it no longer
   changes which word the model chose.
5. The `funny`/`comedic`/`sarcastic`/etc. relationship is intended to move to real tag aliases on
   the approved `funny` tag (via the existing Tag Management alias-editing UI), so the existing
   approved-tag alias-match path in `catalogTagResolver.ts` handles the canonicalization the same
   way it does for every other tag, without a code deploy. This is a manual data change performed
   by an owner in the Tag Management UI, not an automated write in this change.

**Why**

The user wanted AI category/tag judgment trusted more and hardcoded server heuristics trusted
less, but only where the cost was justified by measured evidence. Category names are cheap
(~0.8% cost increase) and category accuracy was the most visible problem (the ADR-FP-039 resolver
could — and, per its own code comment, was designed to — override an AI category guess the model
never even saw the real options for). Full tag-name injection is not cheap (~4.4x) and its
accuracy benefit had not yet been measured against that cost, so it stays out of scope until a
real test justifies it. Separately, the hardcoded `funny` synonym rewrite was flagged as exactly
the kind of server logic that silently overrides explicit AI word choice rather than validating
it — replacing it with tag aliases keeps the same practical outcome (searchable under `funny`)
while making the mapping owner-editable data instead of a code constant, and stops the server from
producing a tag (the `TAG_COMPANIONS` appended `funny`) the model never returned.

**Consequences**

Positive: Category resolution now defers to an explicit, well-informed AI answer instead of
second-guessing it with a heuristic scorer; the scorer still exists as a safety net for
off-list/legacy cases. Tag normalization no longer silently changes AI word choice. Per-image cost
increases negligibly (~0.8%).

Tradeoff: Until the `funny` tag's aliases are seeded in Tag Management, `comedic`/`sarcastic`/
`sassy`/`snarky`/`witty`/etc. tag candidates will surface as their own literal single-word tags
(or `suggestedNewTags`) instead of automatically folding into `funny`, unless/until an owner adds
those as aliases. Tag-name injection (and any resulting accuracy improvement) remains unmeasured
and unimplemented pending a dedicated before/after test.

---

### ADR-FP-040: Remove OpenAI; Google (Gemini) is the only AI provider

| Field | Value |
|-------|-------|
| Date | 2026-07-01 |
| Status | accepted |

**Decision**

Fresh Prints will no longer use OpenAI models for AI Processing or the Settings AI Playground.
Google (Gemini) is now the only vision model provider.

1. Removed the OpenAI Chat Completions branch from `resolveProviderTarget`/
   `resolveAiEnrichmentProvider`; both always resolve to the Gemini (or `development` heuristic
   fallback) provider. Renamed the shared HTTP client files that both providers previously used
   (`openAiVisionEnrichmentProvider.ts` → `geminiVisionEnrichmentProvider.ts`,
   `openAiVisionCompletion.ts` → `visionCompletion.ts`, `openAiRetry.ts` →
   `visionRequestRetry.ts`) and their exported symbols/error codes to provider-neutral or
   Gemini-specific names (e.g. `openai_empty_output` → `vision_empty_output`).
2. Removed `openAiApiKeySecret` (`OPENAI_API_KEY`) from Cloud Function code
   (`functions/src/lib/secrets.ts`, `enqueueAiEnrichment.ts`, `testAiEnrichmentPlayground.ts`,
   `aiEnrichmentPipeline.ts`, `aiEnrichmentPlayground.ts`). The GCP Secret Manager secret itself
   was not deleted as part of this change — only code stopped referencing it.
3. Removed the "reasoning effort" concept end-to-end (Settings AI Enrichment section, AI
   Processing Settings modal, AI Review re-run flow, `updateAiEnrichmentSettings` request/response,
   Firestore `settings/aiEnrichment.reasoningEffort`, and all related shared constants/types).
   Reasoning effort was an OpenAI-only Chat Completions parameter; Gemini's OpenAI-compatible
   endpoint never supported it (`supportsReasoningEffort` was already `false` for Gemini), so it
   became entirely dead surface area once OpenAI was removed.
4. Removed OpenAI model IDs (`gpt-5.4-nano-2026-03-17`, `gpt-5.4-mini-2026-03-17`) and their
   pricing entries from `shared/constants/aiEnrichment.constants.ts`; `AllowedVisionModelId` and
   `AiEnrichmentProviderId` are now Gemini/`development`-only.
5. Deleted the unused `AiReviewRerunModal.tsx` component (already dead/unimported code that only
   referenced the removed OpenAI model/reasoning-effort options).
6. Bumped the catalog enrichment prompt version from `catalog-enrich-openai-v18` to
   `catalog-enrich-v19` (name no longer references a specific provider).
7. Replaced remaining "OpenAI" references visible in the app UI (Settings AI Enrichment
   description, AI Review "cannot be cancelled" hint) with "Google AI" or neutral phrasing.
8. Existing Firestore designs processed before this change may still have
   `aiSuggestions.provider === "openai"` stored; no migration/backfill was performed. The type
   was narrowed to no longer allow producing/selecting `"openai"` going forward, but
   `DesignAiSuggestions.provider` remains a plain `string` field, so old records continue to
   display without breaking.

**Why**

Product decision to standardize on a single AI provider (Google/Gemini) going forward and remove
the OpenAI-specific code paths, secrets, and UI options that are no longer used.

**Consequences**

Positive: Simpler provider resolution (no branching), no dead reasoning-effort UI/config, smaller
secret surface area (`GEMINI_API_KEY` only), and app-visible copy accurately reflects the only
provider in use.

Tradeoff: Any future request to reintroduce a second provider (or restore OpenAI) would need to
reintroduce the removed abstraction layer rather than just flipping a flag. This was accepted
since there was no near-term plan to support multiple providers.

---

### ADR-FP-039: Lean vision-only prompt with server-side taxonomy resolution (catalog prompt v18)

| Field | Value |
|-------|-------|
| Date | 2026-07-01 |
| Status | accepted |

**Supersedes:** ADR-FP-038's prompt-size direction (injecting the full approved category and tag
lists into every AI Processing call). Keeps ADR-FP-037's global approved tag library, tag resolver,
and `suggestedNewTags` architecture, and ADR-FP-035/036's single-call, playground-style request
pattern (no `response_format: json_object`, tolerant server-side JSON extraction) fully intact.

**Decision**

1. Replace the ADR-FP-038 taxonomy-aware prompt with a small, fixed-size, vision-only prompt.
   Bump prompt version to `catalog-enrich-openai-v18` (dev `catalog-enrich-dev-v18`). The model
   receives no approved category list and no approved tag list; it returns only `title`,
   `description`, a freeform `category` theme candidate, and up to 12 tag candidates (phrases
   allowed).
2. Move all approved-taxonomy resolution to deterministic server-side code that runs after the
   model call:
   - Tag resolution continues to use the existing `catalogTagResolver.resolveAiCatalogTags`
     (unchanged architecture from ADR-FP-037) — approved name/alias matching, phrase tolerance,
     and `suggestedNewTags` generation for unmatched candidates.
   - A new `catalogThemeCategoryResolver.resolveThemeCategory` replaces the previous exact-match
     `resolveLeanCatalogCategory`. It scores every approved category using token overlap against
     its name and description versus the raw model category candidate, title, description,
     visible text, and the tags already matched by the tag resolver — with priority boosts for
     buyer-intent theme families (family/parenting/motherhood/fatherhood, faith/religious,
     teacher/school/education) that can outweigh a raw candidate naming an unrelated category
     (e.g. the model returning `"Humorous Quotes"` for a motherhood/skeleton design). Generic
     art-style tokens (skeleton, cartoon, mascot, illustrated character) do not by themselves
     count toward a pop-culture/character category, and a bare "quote" token does not by itself
     count toward a humor/quotes category without a co-occurring humor signal.
   - Category resolution runs after tag resolution in the pipeline so the resolved approved tags
     feed the category scoring signal.
3. The raw model category candidate is never trusted or persisted directly. It is carried as a
   transient `DesignAiAnalysis.rawCategory` signal (deleted before the Firestore write, same
   pattern as the existing transient `rawTags`). When no approved category clears the minimum
   confidence threshold, `aiSuggestions.categoryId`/`categoryName` are left undefined — staff sets
   the category manually in AI Review, the same fallback UX as before.
4. Server-generated `suggestedNewTags` names are guaranteed safe single-word reusable tags. An
   unmatched multi-word candidate (e.g. "messy bun") is reduced to a clean single-word name with
   the original phrase retained as an alias, or dropped entirely if no safe reduction exists —
   never persisted with a suggested tag `name` containing a space.
5. `AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS` shrinks to `{{excluded_tags}}` only. Owner-edited
   Settings prompt templates that still contain the retired `{{approved_categories}}`/
   `{{approved_tags}}` placeholders continue to build and substitute correctly (the formatting
   helpers are kept, not removed) so a template saved before this change keeps working.

**Why**

Reported AI Processing input token cost scaled with the size of the approved category/tag
libraries because the full taxonomy was re-sent on every call. A small fixed-size prompt removes
that scaling entirely, and the app's existing tag resolver architecture (ADR-FP-037) already
proved this pattern works well for tags — this extends the same approach to categories.

**Consequences**

Positive: AI Processing input tokens no longer scale with taxonomy library size. Category
assignment becomes deterministic, unit-testable, and immune to prompt-injection-style category
guesses, since it only ever picks from the approved category list.

Tradeoff: Category resolution is a real behavior change from "trust the model's exact-match
candidate" to "score all approved categories using local signals." Mitigated by explicit unit
tests for the priority-family scenarios and by preserving the existing "leave undefined, staff
sets it in AI Review" fallback when no category scores confidently.

---

### ADR-FP-038: AI Processing approved taxonomy prompt context

| Field | Value |
|-------|-------|
| Date | 2026-06-30 |
| Status | accepted |

**Decision**

1. Keep the ADR-FP-036 single-call, playground-style AI Processing request path and prompt version
   `catalog-enrich-openai-v17`.
2. Expand the saved Settings prompt placeholders before the OpenAI call:
   `{{approved_categories}}` becomes active category names with descriptions,
   `{{approved_tags}}` becomes approved tag names with aliases and preferred-when guidance, and
   `{{excluded_tags}}` becomes the effective exclusion list.
3. Require the prompt contract to choose one approved category and approved tag names first.
4. Allow AI to return `suggestedNewTags` only when no approved tag name or alias is relevant
   enough. Each suggested tag must include `name`, `aliases`, `preferredWhen`, and `reason`.
5. Keep backend normalization as the final guard: approved tag names and aliases resolve to
   `aiSuggestions.tags`; invalid suggestions or suggestions that duplicate approved names/aliases
   are rejected before staff review.

**Consequences**

Positive: AI can use the same category descriptions, aliases, and preferred-when guidance staff use
without creating approved tags automatically.

Tradeoff: Prompt size now scales with the approved taxonomy library. If latency or token pressure
returns, the next phase should add retrieval or taxonomy chunking instead of weakening validation.

---

### ADR-FP-037: Global approved tag library

| Field | Value |
|-------|-------|
| Date | 2026-06-30 |
| Status | accepted |

**Decision**

1. Add a global `tags` Firestore collection for approved tag definitions with `name`, `aliases`,
   `preferredWhen`, `status`, and audit fields.
2. Keep design documents unchanged: `designs.tags` remains `string[]`; no tag migration or
   backfill is part of this phase.
3. Tags are not owned by categories. Category records do not contain tag lists or `categoryHints`.
4. Tag Management lives in Design Library. Owner/admin may create, edit, and archive tags;
   owner-only bulk import accepts strict flat JSON only.
5. Cloud Functions normalize AI tag output against approved tag names and aliases. Matched values
   persist to `aiSuggestions.tags`; unmatched values persist to `aiSuggestions.suggestedNewTags`.
6. AI never creates approved tag documents automatically. Owner/admin may approve suggested-new-tags
   from AI Review.

**Consequences**

Positive: AI and staff tagging share one approved vocabulary without changing existing design tag
storage or category behavior.

Tradeoff: Legacy/freeform design tags remain searchable/filterable alongside approved tags until a
future explicitly approved migration/backfill phase.

---

### ADR-FP-036: Settings prompt template + Processing reset re-run

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Keep the AI Playground unchanged as a one-off testing tool.
2. Extend `settings/aiEnrichment` with an owner/admin-editable AI Processing `promptTemplate`.
   The saved template must contain `{{approved_categories}}`, `{{approved_tags}}`, and
   `{{excluded_tags}}`; the server replaces them with approved taxonomy context and the effective
   base + Settings exclusion list immediately before the OpenAI call.
3. Narrow live AI Processing output from ADR-FP-035's five-field v17 shape to four catalog fields:
   `description`, `category`, `title`, and `tags`.
4. Reduce live AI Processing tags from 10 to 8 and keep server-side single-word, lowercase,
   dedupe, generic-word, and exclusion filtering after parsing.
5. Add a Processing-tab settings control beside Auto advance for on-the-fly model and reasoning
   overrides. Manual processing uses the current override or Settings default. Auto advance
   snapshots the resolved model/reasoning when the run starts.
6. Change Needs Review and Rejected **Re-run AI Suggestions** to reset the design back to Processing
   instead of running AI in place. The reset clears prior AI output and waits for staff to start the
   next Processing run.

**Why**

The playground-proven request pattern is strongest when the production path stays equally simple:
one image call, a short prompt, explicit model/reasoning, tolerant JSON extraction, no forced
`response_format`, and no extra quality/OCR/model-escalation round trips. Staff still reviews every
result before catalog publish.

**Consequences**

Positive: AI Processing prompt tuning can happen from Settings without changing code; staff can pick
stronger or cheaper model/reasoning combinations per processing session; review tabs are simpler and
no longer host a live re-run overlay/session path.

Tradeoff: historical suggestions may still contain older `confidence` or `aiAnalysis.visibleText`
data, but new live AI Processing writes only the catalog suggestion fields needed for review plus
provider/model/prompt metadata.

---

### ADR-FP-035: Playground-style single-call AI Processing (catalog prompt v17)

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Superseded note:** ADR-FP-036 keeps the ADR-FP-035 single-call request pattern but narrows the live
output contract from five fields to four (`description`, `category`, `title`, `tags`) and caps tags
at 8.

**Decision**

1. Rebuild live AI Processing around the lightweight Settings AI Playground request shape: one
   server-side OpenAI call, a short instruction-only prompt, and tolerant server-side JSON parsing.
2. Remove forced `response_format: { type: "json_object" }` from the catalog AI Processing call.
   The model returns JSON from instructions alone; the server extracts the first JSON object
   (handles fenced/prose-wrapped output).
3. Replace the heavy v16 structured contract (15 keys + consistency rules) with a 5-field contract:
   `visibleText`, `description`, `title`, `tags`, `confidence`. Bump prompt version to
   `catalog-enrich-openai-v17` (dev `catalog-enrich-dev-v17`).
4. Keep one normal OpenAI call on success. No empty-output retry, no quality retry. Keep only the
   reasoning-effort 400 fallback and the 429/5xx network retry.
5. Enforce tag rules server-side after parsing: single words, lowercase, dedupe, drop generic
   words, apply tag exclusions (also injected into the prompt), cap at 10
   (`OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS`).
6. Clamp `confidence` to 0–1; default to 0.7 only when the model omits/garbles it
   (`OPENAI_SIMPLE_ENRICHMENT_DEFAULT_CONFIDENCE`). Store on `aiSuggestions.confidence`.
7. Store visible text on the existing `aiAnalysis.visibleText` field (no new persisted field).
   `aiSuggestions` keeps title/description/tags/confidence/provider/model/promptVersion/generatedAt.
8. Resolve category deterministically via the existing `resolveCatalogCategory` (no extra model
   call); leave category undefined when nothing matches and let staff set it in AI Review.
9. Keep model allowlist, reasoning-effort default (`medium`), token cap (2500),
   client/server timeouts, `detail: "high"`, model override, and staff review all unchanged.

**Why**

At equal model + `medium` effort, the playground returns quickly and reliably while AI Processing
hit `OpenAI returned no visible output (reason: length)` on complex designs. Root cause: the heavy
structured-output requirement plus `response_format` exhausted the 2500-token budget during
reasoning before any JSON was emitted. Shrinking the output and dropping `response_format` fixes the
error at its source without changing effort, model, cap, or timeouts.

**Consequences**

Positive: AI Processing now mirrors the playground — one fast call, no `length` errors expected for
typical runs, simpler parsing. Supersedes ADR-FP-034 item 6 (prompt version) and the v16 prompt on
the live path.
Tradeoff: AI no longer returns rich analysis fields (theme/style/audience/colorPalette) or
prompt-driven category matching; these were not rendered by AI Review. The v16 prompt/parser/retry
modules remain in the repo as tested utilities for back-compat and can be removed in a later cleanup.

---

### ADR-FP-034: Saved reasoning effort + Settings AI playground + compact rerun menu

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Extend `settings/aiEnrichment` with a saved `reasoningEffort` field.
2. Allow only `none`, `minimal`, `low`, `medium`, and `high`; set `medium` as the default.
3. Keep validation server-side and retry once with `low` only when the current OpenAI request path rejects the selected effort.
4. Add an owner/admin-only Settings AI playground callable for one-off text + image testing without writing to `designs` or mutating saved settings.
5. Replace the visible AI Review rerun model selector with a compact `Re-run AI` action menu while preserving the existing one-off override contract.
6. Preserve `catalog-enrich-openai-v16`, default model `gpt-5.4-nano-2026-03-17`, lowest-cost option `gpt-5-nano-2025-08-07`, stronger option `gpt-5.4-mini-2026-03-17`, and server-side `detail: "high"` image behavior.

**Consequences**

Positive: Staff now have controlled reasoning tuning, a safe server-side playground for maintenance testing, and a less cluttered AI Review rerun UI.
Tradeoff: AI enrichment configuration now spans saved settings, a compatibility fallback path, and a second callable surface, so docs and targeted tests need to stay aligned.

---

### ADR-FP-033: GPT-5.4 Mini allowlist and one-off AI Review override

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Add `gpt-5.4-mini-2026-03-17` to the server allowlist and `/settings` model options.
2. Keep `gpt-5.4-nano-2026-03-17` as the default and recommended high-volume model.
3. Keep `gpt-5-nano-2025-08-07` as the lowest-cost selectable option.
4. Allow AI Review re-runs to send a one-off `visionModelIdOverride` without mutating global saved settings.
5. Validate overrides server-side, persist the resolved model on `aiSuggestions.model`, and clear transient queue metadata after the run.
6. Preserve prompt target `catalog-enrich-openai-v16` and server-side `detail: "high"` image behavior.

**Consequences**

Positive: Staff can choose a stronger model for selective manual re-runs without changing the team default or exposing model control to the client beyond allowed ids.
Tradeoff: AI Review rerun flow now spans renderer UI, callable validation, and pipeline cleanup, so regression coverage must stay in place.

---

### ADR-FP-032: GPT-5.4 Nano as default high-volume vision model

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Promote `gpt-5.4-nano-2026-03-17` to the default OpenAI vision model when no saved override exists.
2. Keep `gpt-5-nano-2025-08-07` available as the lowest-cost selectable option.
3. Do not add `gpt-5.4-mini` until an exact supported snapshot ID is verified in repo-controlled configuration/docs.
4. Keep the existing server-side Chat Completions pipeline and add `detail: "high"` on the image input for more predictable catalog-analysis fidelity.
5. Preserve the current prompt target from repo state: `catalog-enrich-openai-v16`.

**Consequences**

Positive: Better default cost/accuracy balance for high-volume catalog enrichment while preserving the cheaper manual option.
Tradeoff: Existing saved settings remain respected, so teams may still see older models until they switch settings intentionally.

---

### ADR-FP-031: Catalog enrichment prompt v16 observed-image-first contract

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Keep the existing OpenAI Chat Completions transport, retries, and queue behavior unchanged.
2. Upgrade the prompt contract to an observed-image-first structure: read text first, identify visible subject/style/colors second, derive catalog metadata third.
3. Explicitly separate observed image facts from inferred catalog metadata inside the prompt wording.
4. Tighten anti-hallucination guidance: do not invent unreadable text; omit or lower confidence when uncertain.
5. Bump prompt version to `catalog-enrich-openai-v16` for stored auditability in `aiSuggestions.promptVersion`.

**Consequences**

Positive: Clearer alignment with current vision-analysis best practices while preserving the stable server pipeline.
Tradeoff: Output distribution may shift on future AI runs, so prompt version tracking remains required for QA comparisons.

---

### ADR-FP-030: Phase 6 Print Request foundation, request counters, and deferred indexes

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Context**
The Phase 6 Print Requests foundation is implemented ahead of stale roadmap text. The implementation creates request lists, request items, guest customers, and a Design Library request-selection mode. `printRequestService.addPrintRequestItem` increments `designs.requestCount` and `designs.lastRequestedAt`; Firestore rules exist for Phase 6 collections, but `firestore.indexes.json` does not yet include Print Request indexes.

**Decision**

1. Treat `requestCount` and `lastRequestedAt` as lightweight request reference metadata allowed in Phase 6.
2. These fields are analytics-adjacent but do not change design lifecycle status, do not imply printing, and do not implement Phase 10 dashboards.
3. Production state remains on `printRequestItems` and future `printRunItems`, never on `designs.status`.
4. Keep current broad collection reads for the Phase 6 foundation only; add server-side Print Request queries and indexes as a hardening follow-up before large request volume.
5. No Phase 7, Portal, ecommerce, shipping, payment, Whatnot, or analytics dashboard work is introduced by this decision.

**Consequences**
Positive: Staff can see request popularity metadata as requests are built without polluting catalog lifecycle status.
Tradeoff: Broad reads are acceptable for the foundation but must be revisited for scale.
Follow-up: Add targeted tests for `printRequestService` and server-side indexed request queries.

---

### ADR-FP-045: Username-based Print Request naming and standard item sizing

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Context**
Standard Print Requests need stable request names that do not depend on loaded request lists, and
staff need to request the same catalog design in multiple sizes without moving into Print Runs,
Portal, or Custom Requests.

**Decision**

1. Customer records use unique normalized usernames reserved through `customerUsernames/{username}`.
2. Customer request names are generated in Firestore transactions as `username-CR001`; internal request names use `baseName-IR001`.
3. Customer counters live on `customers/{customerId}.nextPrintRequestSequence`; the internal counter lives at `counters/printRequests`.
4. Standard Print Request items support requested width/height in inches, locked aspect ratio, live DPI feedback, and duplicate same-design rows.
5. Standard item saves are blocked above 22 inches on either axis or below 200 DPI; 200-299 DPI warns, and 300+ DPI saves without warning.
6. Standard Print Request item UI hides item notes and production status controls, preserving persisted fields for compatibility and future production workflows.
7. No Portal, Print Runs, Custom Requests, Remove Background, Upscale, payment, shipping, migration, backfill, or design lifecycle status changes are introduced by this decision.

**Consequences**
Positive: Request naming is transaction-safe and duplicate same-design size rows are first-class standard Print Request items.
Tradeoff: Firestore rules must be deployed separately before dev/manual QA can pass against Firebase if the local rules changes are not already active.

---

### ADR-FP-046: Print Request item autosave, stable item ordering, and generated name locks

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Context**
Print Request QA found that item edits were noisy, browser number spinners looked out of place,
duplicate/edit refreshes were disruptive, and generated request names/status should not be edited
from the standard detail page.

**Decision**

1. Quantity, requested width, and requested height edits autosave through a subtle bottom-right
   indicator.
2. Normal autosaves do not use item save buttons or success alerts; failures show `Save failed`
   with a retry action.
3. Request status and customer request names remain locked on the standard Print Request detail page.
4. Internal request base names may be edited only when the request has a usable locked sequence;
   the generated request-name preview updates while staff type, but the persisted display name is
   re-derived from `internalBaseName` and `requestSequenceNumber` only when staff manually save the
   Request Detail section.
5. Request item reads remain scoped by `printRequestId`; display ordering is client-side by
   `sortOrder`, then `createdAt`, then document ID so legacy items without `sortOrder` remain visible.
6. No Firestore `sortOrder` index is introduced unless a future implementation moves item ordering
   server-side.

**Consequences**
Positive: Normal item editing is quieter and stable, duplicate rows can appear without a full
detail reload, and generated naming cannot be accidentally broken from the page UI or saved before
staff explicitly saves Request Detail changes.
Tradeoff: Local Firestore rules must allow the new metadata fields before dev/manual QA can pass
against Firebase; any rules deploy remains a separate human checkpoint.

---

### ADR-FP-029: Catalog enrichment prompt v15 + validation hardening

| Field | Value |
|-------|-------|
| Date | 2026-06-26 |
| Status | accepted |

**Decision**

1. **Prompt v15:** Cleaner system/user prompts with explicit JSON field formats; `visibleTextColor` requested as array in prompt.
2. **Parse layer:** `catalogEnrichmentResponse.ts` coerces messy model output (string arrays, string booleans, confidence clamping).
3. **Consistency:** `artworkContainsText` synced from `visibleText`; `textOnlyArtwork` corrected when illustration indicators present.
4. **Category:** `resolveCatalogCategory` exact match then keyword remap; omit when confidence low; retry before remap on first pass.
5. **Retry:** Unified `shouldRetryCatalogEnrichment` (max one quality retry at `reasoning_effort: low`) plus existing empty-output cap retry.
6. **Storage:** `visibleTextColor` array collapsed to existing enum (`black` \| `white` \| `mixed` \| `unknown`).
7. **Reasoning:** First pass stays `minimal`; optional bump to `low` deferred pending latency measurement.

---

### ADR-FP-028: Dual-arc OCR validation + Re-run overlay stepper

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Superseded note:** ADR-FP-036 supersedes the Needs Review in-place re-run behavior. Tag exclusions
remain, but current AI Processing replaces `{{excluded_tags}}` inside the Settings prompt template
and review-tab re-runs now reset the design back to Processing.

**Decision**

1. **Prompt v14:** Dual-arc OCR examples, homophone guardrails, character-by-character user prompt reinforcement.
2. **Server validation:** `isImplausibleVisibleText` flags merged/gibberish/homophone drift; one-shot retry with `reasoning_effort: low`; description `/` phrase fallback before `visible_text_low_quality` log.
3. **Re-run overlay:** `isRerunInProgress` forces queued/waiting stepper (step 1 active) until Firestore stages update — mirrors Processing optimistic enqueue.

---

### ADR-FP-027: Rejected tab actions navigate to target inbox tab

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** **Reopen for Review** on Rejected navigates to Needs Review with the same `designId` selected. **Re-run AI Suggestions** on Rejected navigates to Processing with the same design selected. Handoff uses `pendingCrossTabSelectionRef` so tab-change effects do not reset selection to the first queue item.

---

### ADR-FP-026: AI catalog descriptions required with server synthesis fallback

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** Prompt v13 requires non-empty descriptions. Server `resolveCatalogDescription` rejects placeholders (`-`, `—`, `N/A`, etc.) and empty post-sanitize strings, synthesizing copy from visible text, subject/style, title, or a generic fallback. Pipeline re-checks before `markAiSuccess`. Event `catalog.enrich.description_fallback` logged when synthesis runs.

---

### ADR-FP-025: AI processing latency — minimal reasoning default + timing logs

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Reasoning effort:** Primary `minimal` on Processing path (reverts ADR-FP-023 default for speed). Use `low` only on empty-output retry (4000-token cap) or when model rejects `minimal`.
2. **Timing logs:** Pipeline phases log `durationMs`, `totalPipelineMs`, and `loggedAtMs`; OpenAI requests log `openai.request.started` and `openai.completion.usage` with `durationMs` and token breakdown.
3. **Runtime cache:** Settings and active categories cached in function instance memory (60s TTL); cleared on settings update.
4. **Client UX:** Optimistic "Queuing AI processing…" stepper before Firestore `queued` stage.
5. **Deferred:** `minInstances` and callable→pipeline direct invoke require human approval for production.

**Tradeoff:** Faster median runs; OCR on arched text may rely on retry path more often. Monitor `openai.empty_content` with `willRetry: true`.

---

### ADR-FP-024: Black/White Text title suffix — text-only designs only

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** Append `Black Text` or `White Text` to catalog titles only when `textOnlyArtwork === true` and ink is single-color black/white. Server strips suffix when not text-only (fail-closed). Prompt v15 adds `textOnlyArtwork` field.

---

### ADR-FP-023: Prompt v11 OCR quality + reasoning effort low + re-run overlay

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Prompt v11:** Multi-segment `visibleText`; description sentence 1 joins all phrases with ` / ` before art copy; category must match theme.
2. **Reasoning effort:** Primary `low` (was `minimal`) for better OCR on arched text — slightly higher cost per run; 4000-token empty-output retry unchanged.
3. **Monitoring:** Log `catalog.enrich.description_text_mismatch` when description sentence 1 lacks overlap with `visibleText[0]` (warning only).
4. **Re-run UX:** Needs Review overlay on preview with stepper; Processing tab unchanged.

---

### ADR-FP-021: Settings-managed tag exclusions + Needs Review re-run AI

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Tag exclusions:** `BASE_AI_TAG_EXCLUSIONS` (code, non-removable) merged with `settings/aiEnrichment.additionalTagExclusions` (owner/admin). Effective list injected per pipeline run into prompt and `normalizeAiTags`.
2. **Re-run AI:** Needs Review **Re-run AI** button calls `enqueueAiEnrichment` with `rerunFromReview: true` — in-place regeneration, no Processing queue navigation. Staff may trigger; unsaved draft requires confirm.

---

### ADR-FP-020: Analysis canvas omitted from catalog copy; AI tag exclusion list v1

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
Vision AI receives designs composited on neutral grey analysis canvas (`prepareAiAnalysisImage`). Models described "gray background" in catalog copy. Skeleton/skull art produced morbid tags (`death`, `skull`) unsuitable for apparel search.

**Decision**

1. Prompt **v9** instructs models to ignore analysis canvas in description, `colorPalette`, and tags.
2. Server post-processing: `sanitizeCatalogDescription`, `filterBackgroundColorsFromPalette`.
3. Maintainable **`AI_TAG_EXCLUSIONS`** in `aiTagExclusions.ts` — injected into prompt and filtered in `normalizeAiTags` (exact token match).
4. Titles/descriptions may still mention skull when accurate; **tags** must avoid exclusion list.

**Consequences**  
Functions redeploy required. Exclusion list changes require code deploy until future settings UI.

---

### ADR-FP-019: GPT-5 nano reasoning token budget for vision enrichment

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
GPT-5 nano snapshots are reasoning models. `max_completion_tokens: 600` counted hidden reasoning tokens; HTTP 200 responses often had empty `message.content` while gpt-4o-mini worked with `max_tokens: 550`.

**Decision**

1. Vision requests: `reasoning_effort: "minimal"` (fallback `"low"` if unsupported), `OPENAI_VISION_MAX_COMPLETION_TOKENS = 2500`.
2. One-shot retry at 4000 tokens when `finish_reason: length` and reasoning tokens ≥ 90% of cap.
3. Empty content: log `openai.empty_content` with usage/reasoning breakdown; user-safe error; `openai_empty_output` or `openai_token_budget_exhausted`.
4. Keep dated nano allowlist and Settings model switch — do not revert to gpt-4o-mini in this phase.

**Consequences**  
Higher per-request token cap vs prior 600; lower reasoning waste vs default effort. Functions redeploy required.

---

### ADR-FP-018: Configurable dated OpenAI vision model snapshots

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
Staff need to A/B test speed vs accuracy between two dated nano snapshots without code deploys.

**Decision**

1. Team setting in Firestore `settings/aiEnrichment.visionModelId` with server allowlist: **`gpt-5.4-nano-2026-03-17`** (default), **`gpt-5-nano-2025-08-07`** (lowest-cost alternate).
2. Owner/admin changes model in **Settings** (`/settings`) via callable `updateAiEnrichmentSettings`; invalid values rejected or fall back to default on read.
3. **AI Processing** shows read-only active model label for all staff; per-design `aiSuggestions.model` records the model used.
4. No model switch on Processing action bar; no API keys in settings.

**Consequences**  
Functions + Firestore rules deploy required. Helpers see active model on AI Processing but cannot change it.

---

### ADR-FP-017: GPT-5 Chat Completions params + per-design retry only

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
After switching to `gpt-5.4-nano`, OpenAI returned HTTP 400 because Chat Completions for GPT-5 family reject `max_tokens` (requires `max_completion_tokens`). Error bodies were discarded, showing only "status 400" in UI. Sequential one-at-a-time queue made bulk **Retry All Failed** redundant.

**Decision**

1. Use **`max_completion_tokens: 600`** (not `max_tokens`) in vision enrichment requests; minimal payload (`model`, `messages`, `response_format`).
2. Parse OpenAI `error.message` on failure; persist in `aiSuggestions.errorMessage`; map HTTP 400 to `openai_invalid_request`.
3. Remove **Retry All Failed** from Processing tab; keep **Retry AI Processing** for the selected failed design only.

**Consequences**  
Functions redeploy required. Operators see actionable OpenAI errors when requests fail.

---

### ADR-FP-016: OpenAI vision model gpt-5.4-nano for catalog enrichment

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**  
High-volume catalog AI processing (~1024×1024 preview WebP). Staff pricing analysis: `gpt-5.4-nano` is ~5× cheaper per image than `gpt-4o-mini` for this workload; `gpt-5.4-mini` remains a higher-quality fallback for a future escalation tier.

**Decision**

1. Default production vision model: **`gpt-5.4-nano`** (`OPENAI_VISION_MODEL_ID` in `functions/src/ai/aiEnrichmentConfig.ts`).
2. Keep prompt **`catalog-enrich-openai-v8`** unless QA shows regression.
3. **No auto-escalation** to mini in this phase — manual ADR if quality gaps require it.

**Consequences**  
Functions redeploy required. Compare Needs Review output vs prior `gpt-4o-mini` runs on diverse designs before production signoff.

---

### ADR-FP-015: Single-word AI catalog tags only

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |

**Decision:** AI enrichment persists **single-word** lowercase catalog tags only (5–12 per design). `normalizeAiTags` tokenizes provider output, drops stopwords, and does **not** inject visible-text phrases. Prompt `catalog-enrich-openai-v8`. Staff may add multi-word tags manually at approve time within existing 40-character limits.

---

### ADR-FP-014: Staff-controlled sequential AI processing queue

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Product owner + architecture/security review |

**Context**  
Bulk import auto-enqueued every design, spawning up to 10 concurrent Cloud Function instances and causing OpenAI **429** rate limits. Processing tab filled with failures before staff could review.

**Decision**

1. **No auto-enqueue on import** — after derivatives, designs remain `aiReviewStatus: pending` with no `aiProcessingStage` until staff acts.
2. **Processing tab queue controls** — **Auto advance** (sessionStorage): **Start AI** / **Pause AI** runs sequential queue; OFF shows **Process image with AI** for one-at-a-time manual stepping.
3. **Retry UX** — **Retry AI Processing** for the selected failed design only (bulk **Retry All Failed** removed in ADR-FP-017).
4. **Concurrency** — `AI_ENRICHMENT_MAX_INSTANCES = 1` for manual-queue era; OpenAI retry (2× backoff) unchanged.

**Consequences**  
Staff must open AI Processing after batch import. Throughput is slower but reliable; 429 storms avoided in normal use.

---

### ADR-FP-013: Batch import 500 PNG cap + discovery summary clarity

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** `MAX_BATCH_FILES = 500`, `MAX_ZIP_ENTRIES = 2000`. Discovery summary exposes `processed`, `skippedByLimit`, and ZIP skip reasons (`zipsSkippedByLimit` vs `zipsSkippedOther`). Design library list limit (100) unchanged — document only.

---

### ADR-FP-012: ZIP import limit 2.1 GB (Google Drive parts)

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** `MAX_ZIP_SIZE_BYTES = floor(2.1 × 1024³)` for Select ZIP, folder ZIP discovery, and nested ZIP extraction. Supports staff workflows that download large Drive folders as ~2 GB ZIP parts. `MAX_EXTRACTED_BYTES` (10 GB) unchanged.

---

### ADR-FP-011: AI title rules v7 and batch enrichment concurrency

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |
| Deciders | Product owner + architecture review |

**Context**  
Production QA: text-only designs titled `"Text"` despite correct descriptions; 61-design batch left Processing tab with PENDING/FAILED mix.

**Decision**

1. **Prompt v7** (`catalog-enrich-openai-v7`): OCR-first; forbid generic titles when readable text exists; `visibleText[0]` is primary phrase.
2. **Server-side `resolveCatalogTitle`**: reject generic tokens; prefer `visibleText`; description quoted-text fallback; 6-word cap for long slogans.
3. **Pipeline concurrency**: `maxInstances: 10` (one OpenAI request per design); not full serialization — staff observe queue drain in Processing tab.
4. **Retries**: 2 automatic retries with exponential backoff on OpenAI 429/5xx.
5. **Stale recovery**: re-enqueue when active `aiProcessingStage` unchanged >10 minutes.
6. **UX**: batch import surfaces enqueue failures; Processing tab **Retry All Failed** (owner/admin).

**Consequences**  
- Positive: Meaningful text-only titles; fewer silent enqueue failures; self-throttling on rate limits  
- Trade-off: Higher concurrent OpenAI usage during large batches; requires functions deploy  

---

### ADR-FP-010: Raised batch import size limits (PNG, ZIP, extract)

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Product owner (managed phase) |

**Context**  
Staff hit the 200 MB ZIP cap and needed headroom for large print PNGs during batch import (Select Images, Select ZIP, Select folder).

**Decision**

| Constant | Value |
|----------|-------|
| `MAX_SINGLE_PNG_SIZE_BYTES` | 150 MB |
| `MAX_ZIP_SIZE_BYTES` | 1 GB |
| `MAX_EXTRACTED_BYTES` | 10 GB (explicit; exceeds derived `min(100×PNG, 2.5×ZIP)` = 2.5 GB) |

ZIP extraction continues entry-by-entry (streamed); cumulative extract budget is the guard. `MAX_BATCH_FILES`, `MAX_FOLDER_ZIPS`, and `MAX_NESTED_ZIP_DEPTH` unchanged. Error messages use `shared/utils/importLimitMessages.ts`. `storage.rules` must be deployed to Firebase before uploads above the prior 50 MB cap succeed in production.

**Consequences**  
- Positive: Real-world archives import without silent folder ZIP skips at 200 MB  
- Trade-off: Higher peak renderer memory (~300 MB with `UPLOAD_CONCURRENCY=2`); larger temp extract disk use up to 10 GB per ZIP job  
- Security: Zip-slip, compression ratio, and entry count limits unchanged  

---

### ADR-FP-009: Fresh Prints Studio three-workspace model and AI Review Inbox

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Architecture review (Phase 5 refinement) |

**Context**  
Phase 4 separated Design Library (approved catalog) from operational import workflow. Phase 5 architecture needed final simplification before implementation: queue naming, automatic AI, review drafts, confidence routing, and approval UX.

**Decision**

1. **Three workspaces:** Imports (`/imports`), AI Review (`/ai-review`), Design Library (`/designs`) — each with a single responsibility and no overlap.
2. **AI Review is the Inbox:** Every imported design lands in AI Review until approved or rejected. Design Library never shows imported or rejected designs.
3. **Automatic AI:** After import + derivatives, enqueue AI enrichment without manual "Generate AI" for new imports.
4. **Queue tabs:** **Processing** (UI) maps to `aiReviewStatus: pending`; **Needs Review**; **Rejected** (retain terminology — designs not deleted).
5. **No Firestore review drafts:** Approval Mode uses temporary form state; Approve persists to catalog fields via `catalogApprovalService`.
6. **Confidence informational only:** No auto-routing or auto-publish based on confidence scores.
7. **AI version tracking from day one:** `provider`, `model`, `promptVersion`, `generatedAt` on `aiSuggestions`.

**Consequences**  
- Positive: Simpler schema; predictable queue flow; faster review UX; maintainable Phase 5 implementation  
- Trade-off: Form state lost on hard refresh unless optional sessionStorage (5E)  
- References: `docs/workflow/plans/phase-5-ai-review-architecture-plan.md`, `docs/workflow/reviews/phase-5-ai-review-architecture-review.md`

**Clarification (2026-07-12 — Customer Uploads)**  
ADR-FP-009’s three workspaces remain the **design catalog lifecycle**. **Customer Uploads** (`/customer-uploads`) is an **operational intake queue** for Portal request artwork (similar in role to Print Requests), not a fourth design-lifecycle workspace. Staff may **hand off** eligible uploads to AI Processing via promote; Imports remains the staff local-file import path.
---

### ADR-FP-008: Official application naming — Fresh Prints Studio and Fresh Prints Portal

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team |

**Context**  
ADR-FP-007 established two applications and no native mobile, but documentation used inconsistent terms (Desktop Admin App, Customer Web Portal, Customer Website, etc.).

**Decision**  
Official product names:

1. **Fresh Prints Studio** — Electron desktop; staff only (owner, admin, helper).
2. **Fresh Prints Portal** — mobile-first responsive web; customers only.

Fresh Prints Portal is the permanent mobile solution. Optional PWA install is still the Portal, not a third app. All future roadmap planning assumes only these two applications unless a future ADR changes this.

**Consequences**  
- Positive: Stable vocabulary; clear staff vs customer branding  
- Follow-ups: Active docs updated; historical signoffs unchanged; code routes/folders not renamed by this ADR  
- Full record: `docs/architecture/ADR-Application-Platform-Strategy.md`

---

### ADR-FP-007: Two-application platform (no native mobile)

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted (naming superseded by ADR-FP-008) |
| Deciders | Project team |

**Context**  
Documentation referenced a future standalone mobile application alongside staff desktop and customer web surfaces.

**Decision**  
Fresh Prints consists of **two applications only**. No native iOS, Android, React Native, Flutter, Xamarin, or MAUI application. Responsive web is the permanent mobile strategy.

Official names: see **ADR-FP-008** (Fresh Prints Studio, Fresh Prints Portal).

**Consequences**  
- Positive: Clear scope; shared Firebase backend; no duplicate mobile codebase  
- References: `docs/architecture/ADR-Application-Platform-Strategy.md`, ADR-FP-006

---

### ADR-FP-006: Business model and workflow realignment

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team (manual workflow review) |

**Context**  
Phase 4A and earlier roadmap docs conflated design catalog lifecycle with production queue status, treated customer requests as order-like workflows, and positioned AI review filters in Design Library. Manual review clarified Fresh Prints is a design catalog and print planning system — not ecommerce, shipping, fulfillment, or order payment.

**Decision**  
1. **Design Library** = approved catalog browse only (search, category, tags, archived toggle).  
2. **AI Review** = import enrichment queue (Phase 5); sidebar + import navigation in Phase 4 cleanup.  
3. **Print Request / Print Run** = production planning on items, not designs (Phases 6–7).  
4. **Custom Request** = separate Q&A + Etsy referral + optional design fee (Phase 9).  
5. **Fresh Prints Portal** = mobile-first responsive web only; `role: customer` does not access Fresh Prints Studio (Phase 8).  
6. Renumber roadmap phases 4–10 per `docs/workflow/reviews/roadmap-realignment-review.md`.

**Resolved (2026-06-24 cleanup planning):** OD-5 Design Library defaults to `ready` only — **yes**. OD-6 AI Review as dedicated sidebar — **yes**.

**Consequences**  
- Positive: Clear entity boundaries; Phase 4A search/filter mostly reusable  
- Follow-ups: Phase 4 cleanup (remove status/AI filters from library); Phase 5–10 plans per new sequence  
- References: `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md`

---

### ADR-FP-005: AppForge documentation structure

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team |

**Context**  
Fresh Prints adopted the AppForge workflow starter. Documentation needed a stable layout separating project docs from workflow artifacts.

**Decision**  
Use `docs/project/`, `docs/architecture/`, `docs/standards/`, `docs/intake/`, and `docs/workflow/{plans,reviews,setup}/`. Keep `docs/AI_RULES.md` and `docs/WORKFLOWS.md` at docs root.

**Consequences**  
- Positive: Managed phase, intake, and bootstrap workflows align with AppForge  
- Follow-ups: Historical phase docs may retain old paths (acceptable as archive)

---

### ADR-FP-004: Import derivatives in Electron main process

| Field | Value |
|-------|-------|
| Date | 2026-06-20 |
| Status | accepted |
| Deciders | Phase 3C signoff |

**Context**  
Thumbnail/preview generation requires native image processing (`sharp`). Renderer must not perform filesystem or native processing.

**Decision**  
Generate WebP derivatives in `electron/` main process; upload via renderer Firebase services.

**Consequences**  
- Positive: Layer boundaries preserved  
- Negative: Native module build complexity on Windows dev machines

---

### ADR-FP-003: Firebase as sole backend

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` early foundation |
| Status | accepted |

**Decision**  
Use Firebase Auth, Firestore, Storage, and Cloud Functions as the only production backend. No separate REST API for core operations.

---

### ADR-FP-002: Feature-based renderer organization

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` Phase 1 |
| Status | accepted |

**Decision**  
Organize React code under `src/renderer/src/features/{domain}/` with `components/`, `hooks/`, `services/`, `types/`, `pages/`.

---

### ADR-FP-001: Electron + Vite desktop admin first

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` project start |
| Status | accepted (product naming superseded by ADR-FP-008) |

**Decision**  
Build the operational staff application as Electron desktop first (**now: Fresh Prints Studio**); customer surface as responsive web (**now: Fresh Prints Portal**), sharing Firebase and `shared/` types.

---

## Historical Note

AppForge starter template ADRs (ADR-001 through ADR-004 in prior template) described the **AppForge development repository**, not Fresh Prints product decisions. They are not applicable to this target project and were removed during intake.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-05 | ADR-FP-062: Status/queue-state derives from stable allocation totals everywhere; show-queue link pills and multi-show-aware removal added; Phase 7 signed off |
| 2026-07-05 | ADR-FP-061: A full show (0 remaining capacity) skips the split-decision/picker path; only staff override can add to it |
| 2026-07-05 | ADR-FP-060: Capacity progress bars and derived Open/Full/Over Max status on Show Detail and Add to Show, computed live (no migration) |
| 2026-07-05 | ADR-FP-059: `Add to Show` action hidden (not disabled) while the selected request is queue-locked |
| 2026-07-05 | ADR-FP-058: Split picker design cards drop the ambiguous "available to place" line |
| 2026-07-05 | ADR-FP-057: Split warning explains both split and pick-a-different-show paths; decision area becomes one bordered callout with full-width action button |
| 2026-07-05 | ADR-FP-056: Staged split allocation labels show show date and time, not time only |
| 2026-07-05 | ADR-FP-055: Split picker quantity inputs start blank instead of pre-filled |
| 2026-07-05 | ADR-FP-054: Split picker totals relabeled ("Available on this show," "Remaining for another show"); design card wording clarified; quantity inputs restyled to match app; status pill confirmed independent of selection |
| 2026-07-05 | ADR-FP-053: Visual thumbnail-based split picker with live totals; wider Add to Show modal; compact list-row show options; simplified split warning copy |
| 2026-07-05 | ADR-FP-052: Add-to-Show wording gated on an active split; new `editing` status for de-queued requests; tab/detail selection kept in sync |
| 2026-07-05 | ADR-FP-051: Staff-directed split allocation; recompute (not decrement) allocated quantity; status transition instead of a new queue field |
| 2026-07-05 | ADR-FP-050: Same-monitor external links use an in-app window; default show capacity is a direct-write setting |
| 2026-07-05 | ADR-FP-049: A Whatnot show is the print run — combine Show Queue and Print Runs into one entity |
| 2026-07-04 | ADR-FP-048: Phase 7 foundation splits Upcoming Shows (schedule) from Print Runs (production) (superseded) |
| 2026-07-04 | ADR-FP-047: Print Request item preview polish separates display DPI from save eligibility |
| 2026-07-04 | ADR-FP-046: Print Request item creation initializes standard requested size separately from catalog dimensions |
| 2026-07-04 | ADR-FP-045: Print Request origin is explicit metadata, not name inference |
| 2026-06-30 | ADR-FP-038: AI Processing approved taxonomy prompt context |
| 2026-06-24 | ADR-FP-009: Three-workspace model; AI Review Inbox; no persisted review drafts; confidence informational only |
| 2026-06-24 | ADR-FP-008: Fresh Prints Studio + Fresh Prints Portal naming |
| 2026-06-24 | Fresh Prints ADRs added; AppForge starter ADRs removed |
