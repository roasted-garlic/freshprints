# Test Report: print-runs-foundation

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Plan | `docs/workflow/plans/2026-07-04-print-runs-foundation-plan.md` |
| Phase | implement |

## Scope implemented

First priority (Upcoming Shows foundation):

- Shared `UpcomingShow` type/enums (`shared/types/upcomingShow/`)
- `upcomingShows` Firestore collection constant/accessor
- `/show-queue` repointed to a real Upcoming Shows list/detail page (legacy disabled placeholder removed)
- `upcomingShowService` (staff-only; upsert by `source + whatnotShowId`, never by date)
- `viewUpcomingShows` / `manageUpcomingShows` permissions

Second priority (Print Runs foundation):

- Shared `PrintRun` / `PrintRunItem` types/enums (`shared/types/printRun/`)
- `printRuns` / `printRunItems` Firestore collection constants/accessors
- `printRunService` (staff-only; show-link creation with title/schedule snapshot capture)
- `/print-runs` list/detail page; sidebar now shows both Upcoming Shows and Print Runs
- `viewPrintRuns` / `managePrintRuns` permissions

Third priority (lightweight request attachment, included — fit cleanly):

- `printRunService.attachPrintRequestItem()` creates one snapshot-plus-reference `printRunItem`
  per included `printRequestItem`; never mutates `printRequestItems`, `printRequests`, or `designs`
- Minimal attach UI in the Print Runs page (select request, select item, attach)

Not implemented (per plan's explicit boundary): live Whatnot fetch/parsing, scheduled Function sync,
manual-refresh callable, Pensacola export, any deploy.

## Automated verification

- `npx tsx --test src/renderer/src/features/upcoming-shows/utils/upcomingShowUpsert.test.ts src/renderer/src/features/print-runs/utils/printRunShowSnapshot.test.ts` — PASS, 8/8
- `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts src/renderer/src/features/print-requests/utils/printRequestOrigin.test.ts` — PASS, 32/32 (regression check, no changes)
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS, existing pre-existing circular manual-chunk warning only
- `git diff --check` — PASS, standard Windows LF/CRLF warnings only

## Targeted test coverage delivered

- Local show upsert matches by `source + whatnotShowId` (`upcomingShowUpsert.test.ts`)
- Same `whatnotShowId` with a different source does not match (no cross-source collision)
- Whitespace-only key differences do not create duplicate matches
- No match found → caller creates a new record instead of an incorrect update
- Update payload for an existing match exposes only upstream fields (`title`, `whatnotUrl`,
  `scheduledStartAt`) — never local-only fields (`status`, `notes`, `isArchived`)
- Show-linked print run snapshot capture: `whatnotShowId`, `showTitleSnapshot`,
  `scheduledStartAtSnapshot` (`printRunShowSnapshot.test.ts`)
- Snapshot at run-creation time stays distinct from a later schedule change on the source show
- Snapshot omits title/schedule fields cleanly when the source show has none set

Not covered by unit tests (require a live/emulated Firestore and were verified by code review
instead): `upcomingShowService`/`printRunService` Firestore read/write behavior, permission gating,
and Firestore rules validation. `designs.status` is never referenced anywhere in
`src/renderer/src/features/print-runs/` or `src/renderer/src/features/upcoming-shows/` (verified by
source grep), and `attachPrintRequestItem()` only creates a new `printRunItems` document — it does
not call `updateDoc`/`setDoc` against `printRequestItems`, `printRequests`, or `designs`.

## Manual QA — FAIL (2026-07-05)

Manual QA was run and **failed**. Observed issues:

1. `Track a Whatnot show` modal required manually typing the Whatnot show ID instead of parsing it
   from a pasted Whatnot URL.
2. The Whatnot URL input was not first in the modal.
3. No dynamic parsed-show-ID display under the modal title.
4. No date/time selector in the manual add flow at all.
5. After saving a show, it did not appear in the Upcoming Shows list even though the Firestore
   document existed — root cause confirmed: `upcomingShowService.listUpcomingShows()` queried with
   `orderBy("scheduledStartAt", "asc")`, and Firestore's `orderBy` excludes documents missing that
   field. Since the manual-add form had no date/time input, every manually created show was silently
   excluded from the list query.
6. Because shows never appeared in the list, a Print Run could not be attached to a show through the UI.
7. Broader product feedback: Show Queue and Print Runs should not be two separate workflows for this
   business, since a Whatnot show has at most one associated production run. Keeping them as separate
   collections/pages created redundant navigation and confusion.

See the corrected implementation below, and `docs/project/DECISIONS.md` ADR-FP-049 for the model
rework this failure triggered.

## Not performed (as of the failed QA pass)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, secrets, Portal behavior, Custom Requests, or design lifecycle
status change was performed.

---

# Correction: combined Show Queue / Print Run model (2026-07-05)

## Scope implemented

- Removed the split `printRuns` / `printRunItems` collections, `printRunService`, the `/print-runs`
  feature folder, and their permissions (`viewPrintRuns`/`managePrintRuns`). `/print-runs` now redirects
  to `/show-queue`; the sidebar shows one `Show Queue` entry.
- `UpcomingShow` is now the single combined show/print-run entity: added `productionStatus`
  (separate from the existing Whatnot schedule `status`), `maxTotalQuantity`, `maxQuantityOverridden`,
  and denormalized `allocatedQuantity`.
- New `showAllocations` collection (`shared/types/showAllocation/`) replacing `printRunItems`:
  snapshot-plus-reference allocation of a `printRequestItem`'s quantity to a show, supporting the same
  item being allocated across multiple shows when a request is split for capacity.
- `shared/utils/whatnotShowUrl.ts`: parses a stable Whatnot show ID from a pasted `/live/<uuid>` URL.
- Rewrote the "Track a Whatnot show" modal: URL input first, parsed show ID shown read-only under the
  title, required scheduled date/time picker, no manual ID entry.
- Fixed the list bug: `upcomingShowService.listUpcomingShows()` now reads the full collection and sorts
  client-side via `sortUpcomingShowsForDisplay()` (missing schedules last) instead of a Firestore
  `orderBy("scheduledStartAt")` query, which was silently excluding schedule-less documents.
- Show detail page: capacity bar/summary, `Set max quantity` (danger-confirmed override when lowering
  below current allocation), `+ Add Print Request` (secondary path), allocation list with remove.
- Print Requests page: `Add to Show` primary action opens `AddToShowModal`, listing shows with
  date/time and remaining capacity, offering a danger override when the full request would exceed a
  show's remaining capacity; a derived queue-state badge
  (`not_queued`/`partially_queued`/`queued`/`partially_printed`/`printed`) computed live from
  allocations via `derivePrintRequestQueueState()` — no persisted status field added.
- Updated local (undeployed) `firestore.rules`/`firestore.indexes.json` for `upcomingShows`'s new
  fields and the new `showAllocations` collection; removed the `printRuns`/`printRunItems` rules/index
  entries entirely.

## Automated verification (2026-07-05)

- `npx tsx --test shared/utils/whatnotShowUrl.test.ts shared/utils/showCapacity.test.ts shared/utils/printRequestQueueState.test.ts shared/utils/showAllocationSplitScenario.test.ts src/renderer/src/features/upcoming-shows/utils/upcomingShowUpsert.test.ts src/renderer/src/features/upcoming-shows/utils/upcomingShowListSort.test.ts` — PASS, 33/33
- `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts src/renderer/src/features/print-requests/utils/printRequestOrigin.test.ts` — PASS, 32/32 (regression check, no changes)
- Combined total: 65/65 tests passing
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS, pre-existing circular manual-chunk warning only
- `git diff --check` — PASS, standard Windows LF/CRLF warnings only

## Targeted test coverage delivered (correction)

- `whatnotShowUrl.test.ts` (9 tests): parses standard/no-query URLs, trims whitespace, normalizes
  case, rejects blank/non-Whatnot/malformed URLs and `/live/` paths without a valid UUID
- `upcomingShowListSort.test.ts` (4 tests): a show missing `scheduledStartAt` is still included
  (direct regression test for the list bug), ascending schedule sort, missing-schedule shows sorted
  last, stable ID tie-break
- `showCapacity.test.ts` (4 tests) + `showAllocationSplitScenario.test.ts` (1 test): capacity
  assessment (no cap / under / full / over-capacity-via-override), and a full split scenario (a
  quantity-10 item splitting into 6 allocated to Show A and 4 to Show B)
- `printRequestQueueState.test.ts` (6 tests): `not_queued`/`partially_queued`/`queued`/
  `partially_printed`/`printed` derivation purely from allocation totals, no persisted field
- `upcomingShowUpsert.test.ts` (5 tests, updated for new required fields): unchanged
  source+whatnotShowId matching behavior from the original implementation

Verified via source grep that no file under `src/renderer/src/features/upcoming-shows/` (which now
owns all Phase 7 logic) references `designs.status` or the designs collection. `showAllocations` writes
only ever create/update `showAllocations` documents and update `upcomingShows.allocatedQuantity`; they
never call `updateDoc`/`setDoc` against `printRequestItems`, `printRequests`, or `designs`.

## Manual QA — FAIL (2026-07-05, second pass)

A second manual QA pass on the combined Show Queue model passed the core model but failed on UI/flow
polish. Observed issues (see the corrected implementation below):

1. Add to Show modal show cards were hard to read in dark theme (flat background matching the modal panel).
2. Add to Show modal emphasized the show title instead of date/time and capacity.
3. Show Queue `+ Add Print Request` required picking one request item and a quantity at a time instead
   of attaching the whole Print Request.
4. Removing a Print Request from a show fired immediately with no confirmation step.
5. No settings affordance existed for a default show capacity.
6. Print Requests and Show Queue pages carried unnecessary intro/header copy ("How it works" card,
   "STAFF QUEUE" / page name / description rail header).
7. `Add to Show` was buried in the request detail actions row rather than in a prominent upper action area.
8. `Add to Show` had no disabled state tied to whether the request had any items.
9. Show Detail status pills stacked vertically instead of aligning horizontally.
10. Request Detail used a top-right chevron toggle instead of an explicit bottom-right `Edit` button.
11. The Whatnot show URL opened via a plain `<a target="_blank">`, with no control over which monitor
    the link opened on.

## Correction: Show Queue / Add to Show polish (2026-07-05)

### Scope implemented

1. **Dark-theme readability** — `AddToShowModal` and the Show Queue `+ Add Print Request` picker now
   use `--color-bg-tertiary` cards against the `--color-bg-secondary` modal panel, with a stronger
   `--color-border-strong` border and an `--color-accent-primary-soft` selected state, giving clear
   contrast in both themes.
2. **Calendar-style/date-grouped selector** — new `groupShowsByDate()` util (`shared/`-adjacent,
   `src/renderer/src/features/upcoming-shows/utils/groupShowsByDate.ts`) groups shows by local calendar
   day; `AddToShowModal` renders a compact `.show-date-picker` of date-grouped option chips showing
   time, remaining/max capacity, and a production-status badge. Show title is not displayed in the
   picker; date/time and capacity are the primary information.
3. **Whole-request attach** — Show Queue's `+ Add Print Request` modal now selects a Print Request only
   (via `usePrintRequestDetails`), shows design count / total quantity / remaining show capacity, and
   allocates every item in the request in one action, reusing the existing split/override capacity
   logic. No per-item dropdown remains.
4. **Two-step confirm removal** — Show Queue detail now groups allocations by Print Request
   (`groupAllocationsByRequest()`) and removing a request uses the same Remove → Cancel/Confirm
   two-button pattern already used in `PrintRequestItemCard.tsx`, removing all of that request's
   allocations from the show in one action.
5. **Settings cog / default capacity** — new `showQueueSettingsService` (direct client read/write to
   `settings/showQueue`, matching the simpler pattern already used for per-show capacity, not the AI
   Enrichment callable-function pattern) and `useShowQueueSettings` hook. A cog icon next to `Add show`
   opens a settings modal with a "Default max quantity for new shows" field. `upcomingShowService.
   upsertUpcomingShow()` now reads this default and applies it only when creating a new show; existing
   shows are never retroactively changed, and per-show override via "Set max quantity" still works.
6. **Header/intro copy removed** — the Print Requests "How it works" card and the "Staff queue / Print
   Requests / Named request lists..." rail header block are gone; the Show Queue rail header block and
   shell-header description are gone too. Both pages are visibly more compact.
7. **Add to Show moved up** — the vacated "How it works" card area on the Print Requests page now hosts
   the `Add to Show` primary action, disabled via `requestItems.length === 0` with a `title` tooltip
   explaining why when disabled.
8. **Horizontal pills** — Show Detail's status/production/sync badges moved out of the flex-wrap
   `print-requests-detail-badges` row into a dedicated `.show-detail-pill-row` (`flex-wrap: wrap`) so
   they align horizontally and wrap cleanly instead of stacking.
9. **Bottom-right Edit button** — Request Detail's top-right chevron toggle was removed; collapsed state
   now shows a bottom-right `Edit` button, and expanded state shows `Cancel`/`Save request detail`
   bottom-right. Existing manual-save behavior and permissions are unchanged.
10. **Same-monitor external links** — new IPC channel `fresh-prints:app:open-external-link`
    (`electron/ipc/app/appIpcChannels.ts`), handler in `appIpcHandlers.ts` calling
    `openExternalLinkOnSameDisplay()` (`electron/ipc/app/externalLinkWindow.ts`), which opens a new
    sandboxed, no-node-integration `BrowserWindow` positioned on the display matching the app's current
    `BrowserWindow` bounds (`screen.getDisplayMatching`), reusing the existing `getFallbackDevToolsBounds`-
    style clamping logic already in the codebase. Preload exposes `window.freshPrints.app.
    openExternalLink(url)`. A shared `isSafeExternalLinkUrl()` validator (`shared/utils/
    externalLinkSafety.ts`) allows only `http:`/`https:` and is enforced on both the renderer
    (`desktopAppService.openExternalLink`) and main-process sides. The Whatnot show URL in Show Detail
    now calls this instead of a plain `<a target="_blank">`.
    **Documented limitation:** this guarantees same-monitor placement only because the link opens in an
    in-app Electron window, not the user's actual default OS browser — Electron's `shell.openExternal`
    hands off to the OS default browser, which owns its own window placement and cannot be positioned
    by the app. This tradeoff was discussed and approved before implementation.

### Automated verification (2026-07-05, correction)

- `npx tsx --test shared/utils/whatnotShowUrl.test.ts shared/utils/showCapacity.test.ts shared/utils/printRequestQueueState.test.ts shared/utils/showAllocationSplitScenario.test.ts shared/utils/externalLinkSafety.test.ts src/renderer/src/features/upcoming-shows/utils/upcomingShowUpsert.test.ts src/renderer/src/features/upcoming-shows/utils/upcomingShowListSort.test.ts src/renderer/src/features/upcoming-shows/utils/groupShowsByDate.test.ts src/renderer/src/features/upcoming-shows/utils/groupAllocationsByRequest.test.ts` — PASS, 46/46
- `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts src/renderer/src/features/print-requests/utils/printRequestOrigin.test.ts` — PASS, 32/32 (regression check)
- Combined total: 78/78 tests passing
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main process, and preload all build cleanly with the new IPC code), pre-existing circular manual-chunk warning only
- `git diff --check` — PASS, standard Windows LF/CRLF warnings only

### Targeted test coverage delivered (correction)

- `groupShowsByDate.test.ts` (4 tests): groups shows on the same local calendar day, orders groups
  ascending, sorts missing-schedule shows last, empty-input handling
- `groupAllocationsByRequest.test.ts` (3 tests): groups multi-item allocations from one request,
  keeps different requests separate, empty-input handling
- `externalLinkSafety.test.ts` (6 tests): allows `http`/`https`, rejects `javascript:`, `file:`, custom
  app schemes, and malformed input
- Existing `showCapacity.test.ts`, `showAllocationSplitScenario.test.ts`, `printRequestQueueState.test.ts`,
  and `whatnotShowUrl.test.ts` re-verified unchanged (no regressions from this correction)

Not independently unit-tested (require a live/emulated Firestore, browser DOM, or Electron main-process
runtime, and were verified by code review/manual reasoning instead): `showQueueSettingsService`
read/write behavior, `upsertUpcomingShow()` applying the default capacity only at create time and never
retroactively (verified by reading the code path and by the existing `buildUpcomingShowUpdateFields`
test proving capacity fields are excluded from the update path), the whole-request allocation loop's
Firestore writes, the double-confirm UI interaction, and `openExternalLinkOnSameDisplay()`'s Electron
`BrowserWindow`/`screen` interaction (protocol validation itself is covered by `isSafeExternalLinkUrl`,
which the main-process code reuses directly).

### Manual QA (correction)

Not yet run — pending a fresh authenticated Studio session. See the plan's manual QA checklist,
extended to also verify: dark-theme readability of the Add to Show and Add Print Request pickers, the
date-grouped selector, whole-request attach (not per-item), two-step confirm removal, the settings cog
and default-capacity behavior on new vs. existing shows, removal of intro/header copy, `Add to Show`
disabled/enabled state tied to request items, horizontal pill alignment, the bottom-right `Edit` button,
and that clicking the Whatnot show URL opens a window on the same monitor as the app.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image mutation was performed.

---

## Manual QA — FAIL (2026-07-05, third pass)

Manual QA of the polished Show Queue / Print Requests workflow surfaced 11 further issues:

1. Settings cog placement (below Add Show instead of beside it)
2. Add to Show button not full-width in the request action area
3. Add to Show modal quantity copy unclear ("8 total item quantity across 4 items")
4. No Working/Queued/Printed tabs on the Print Requests list
5. Queued requests remained freely editable and still showed `DRAFT`
6. No status transition to reflect a request being queued/printed
7. Show date/time displays included seconds
8. No Upcoming/Past tabs on the Show Queue list
9. "Parsed show ID" label instead of "Show ID"
10. No real split-allocation flow — staff could not choose which designs/quantities went to which show
11. Removing a Print Request from a show did not recompute/decrease the show's `allocatedQuantity`

## Correction: Split allocation, capacity accuracy, and lifecycle polish (2026-07-05)

### Scope implemented

- `shared/utils/printRequestSplitAllocation.ts`: per-item remaining-quantity tracking across a
  multi-show split session (`applySplitSelectionToLineItems`, `getTotalRemainingQuantity`,
  `isSplitAllocationComplete`)
- `AddToShowModal.tsx` rewritten with a full split flow: pick a show, "Add all N remaining prints" when
  it fits, or "Choose designs for this show" to assign specific per-design quantities when it doesn't,
  repeatable across multiple shows, plus a danger override to force the full remainder onto one show;
  added optional `fixedShowId`/`designTitleById` props so the Show Queue detail's `+ Add Print Request`
  reuses the same component instead of a separate simplified flow
- `upcomingShowService.removeShowAllocationsForRequest()`: deletes every non-canceled allocation for a
  `printRequestId` on a show in one operation
- `upcomingShowService.recalculateShowAllocatedQuantity()`: recomputes and persists `allocatedQuantity`
  from the show's current non-canceled allocations; called by both `removeShowAllocation()` and
  `removeShowAllocationsForRequest()` so the total can never drift
- `removeShowAllocation()`/`removeShowAllocationsForRequest()` now block removal when the show's
  `productionStatus` is `printing`, `fully_printed`, `completed`, or `archived`
  (`shared/utils/showQueueEditability.ts`'s `canRemoveRequestFromShow()`)
- `upcomingShowService.allocatePrintRequestItem()` transitions the Print Request `draft` → `active` on
  first allocation; `markPrintRequestCompletedIfFullyPrinted()` transitions to `completed` once every
  requested unit has been allocated and printed, called from `updateShowAllocationStatus()`
- `shared/utils/printRequestListGrouping.ts`'s `derivePrintRequestListTab()`: derives Working/Queued/
  Printed from allocation totals + status, no new persisted field
- `PrintRequestsPage.tsx`: Working/Queued/Printed tab bar, `usePrintRequestAllocationTotals` hook
  (loads all allocations once, groups totals by request), queued requests render items/detail
  read-only (`PrintRequestItemCard`'s new `readOnly` prop) with a "remove from Show Queue to edit" hint
  instead of the Edit button, `Add to Show` disabled while already queued
- `UpcomingShowsPage.tsx`: Upcoming/Past tab bar (`groupShowsByUpcomingPast.ts`'s `getShowScheduleTab`/
  `filterShowsByScheduleTab`), settings cog moved into the shell header's `actions` row (left of
  `Add show`), Remove button hidden entirely once a show is production-locked, `Parsed show ID` →
  `Show ID`
- `shared/utils/showDateTimeDisplay.ts`: `formatShowDateTimeLabel`/`formatShowTimeOnlyLabel` — no
  seconds — used by `upcomingShowDisplay.ts` and the Add to Show picker
- `shared/utils/printRequestSummaryCopy.ts`: `formatPrintRequestAllocationSummary()` — "Request has N
  designs with a total qty of M prints." with correct singular/plural
- `print-requests.css`: `.print-requests-page-actions .button { flex: 1 1 auto; }` for full-width
  Add to Show; `show-queue.css`: new classes for the split-flow UI and tab bar

### Files changed

- `shared/utils/printRequestSplitAllocation.ts` (new) + test
- `shared/utils/printRequestListGrouping.ts` (new) + test
- `shared/utils/showQueueEditability.ts` (new) + test
- `shared/utils/printRequestSummaryCopy.ts` (new) + test
- `shared/utils/showDateTimeDisplay.ts` (new) + test
- `src/renderer/src/features/upcoming-shows/utils/groupShowsByUpcomingPast.ts` (new) + test
- `src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts` (removal recalculation,
  production-status removal guard, status transitions, `listAllShowAllocations`)
- `src/renderer/src/features/print-requests/hooks/usePrintRequestAllocationTotals.ts` (new)
- `src/renderer/src/features/print-requests/components/AddToShowModal.tsx` (rewritten: split flow)
- `src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` (`readOnly` prop)
- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (tabs, queue lock, full-width
  Add to Show)
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` (tabs, settings cog placement,
  Show ID label, reuse `AddToShowModal` with `fixedShowId`, removal guard)
- `src/renderer/src/features/upcoming-shows/utils/upcomingShowDisplay.ts` (no-seconds formatting)
- `src/renderer/src/styles/components/print-requests.css`, `show-queue.css`

### Verification (correction)

- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **340/340 tests passing** (21 new: 5
  `printRequestListGrouping`, 2 `showQueueEditability`, 3 `printRequestSummaryCopy`, 2
  `showDateTimeDisplay`, 4 `printRequestSplitAllocation`, 4 `getShowScheduleTab`, 1
  `filterShowsByScheduleTab`; all pre-existing suites re-verified with no regressions)
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS (one `react-hooks/exhaustive-deps` warning found and fixed during this pass)
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session covering: settings cog placement,
Upcoming/Past show tabs, no-seconds date/time display, `Show ID` label, Working/Queued/Printed request
tabs, full-width Add to Show, the split-flow modal (design/quantity choice for a partially-fitting
show, remainder to a second show, and the danger override), removal updating a show's allocated
quantity and remaining capacity immediately, removal blocked once a show is printing/printed/completed/
archived, and that a queued request's items/detail become read-only until removed.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image mutation was performed. No Firestore rules or
index changes were required for this correction (`printRequests.status` already allowed `active`/
`completed`; `showAllocations` deletes were already staff-allowed).

---

## Manual QA — FAIL (2026-07-05, fourth pass)

Manual QA of the split-allocation/lifecycle correction surfaced 3 further issues:

1. Add to Show modal always used "remaining"/"still need a show" wording and an extra "Add all N
   remaining prints" button, even for a request that fully fit its first selected show and had never
   been split — confusing since nothing had actually been split or partially added yet.
2. After adding a Print Request to a show (moving it from `Working` to `Queued`), the right-side
   detail panel kept showing that request while the `Working` tab was still selected, even though it
   had moved out of that tab.
3. After removing a queued Print Request from a show, it displayed `Active`, which is indistinguishable
   from a request that was still queued — no way to tell "was queued, now back for revision" from
   "currently queued."

## Correction: Add to Show wording, tab/detail selection sync, and `editing` status (2026-07-05)

### Scope implemented

- `shared/utils/printRequestSplitAllocation.ts`'s new `shouldShowRemainingWording(committedLegCount)`:
  false until at least one show leg has been committed in the current Add to Show session
- `AddToShowModal.tsx`: the "N prints still need a show" line, the "Add remaining N prints to this
  show" button, and the split-decision copy now all gate on `shouldShowRemainingWording(legs.length)`
  instead of always rendering; a new `canConfirmFullFitDirectly` flag lets the footer's normal
  "Add to show" button commit the whole remainder directly when the selected show fits it, without
  requiring a separate secondary button click first
- `shared/utils/printRequestTabSelection.ts`'s new `resolveSelectedRequestIdForTab()`: keeps the
  current selection if it's still in the active tab's visible ids, otherwise falls back to that tab's
  first request, or `null` if the tab is empty
- `PrintRequestsPage.tsx`: a new effect re-resolves the selected request whenever `activeListTab` or
  the tab's visible requests change, so the detail panel can never keep showing a request that moved to
  a different tab; the URL-deep-link effect now also switches `activeListTab` to match the linked
  request's actual tab before applying the selection, so a direct link doesn't get immediately
  overridden by the sync effect
- `PrintRequestStatus` gained `"editing"` (shared enum `shared/types/printRequest/printRequest.enums.ts`,
  `firestore.rules`'s `isValidPrintRequestStatus`, `getStatusBadgeVariant` in `PrintRequestsPage.tsx`,
  `printRequestListGrouping.ts`'s status union)
- `upcomingShowService.allocatePrintRequestItem()`: the draft-clearing check now treats `draft` OR
  `editing` as "not yet active," transitioning either to `active` on allocation
- `upcomingShowService.markPrintRequestEditingIfNoActiveAllocations()` (new): transitions `active` →
  `editing` once a request has zero active (non-canceled) allocations left anywhere; called from both
  `removeShowAllocation()` and `removeShowAllocationsForRequest()` after the allocation delete +
  capacity recalculation

### Files changed

- `shared/utils/printRequestSplitAllocation.ts` (added `shouldShowRemainingWording`) + test
- `shared/utils/printRequestTabSelection.ts` (new) + test
- `shared/utils/printRequestListGrouping.ts` (status union widened) + test update
- `shared/types/printRequest/printRequest.enums.ts` (`editing` added to `PrintRequestStatus`)
- `firestore.rules` (`isValidPrintRequestStatus` allows `editing`)
- `src/renderer/src/features/print-requests/components/AddToShowModal.tsx` (wording gate, direct
  full-fit confirm)
- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (tab/selection sync effect,
  URL deep-link tab resolution, `editing` badge variant)
- `src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts` (`editing` transitions)
- `docs/architecture/DATA_MODEL.md`, `docs/WORKFLOWS.md`, `docs/project/DECISIONS.md` (ADR-FP-052),
  `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **348/348 tests passing** (8 new: 5
  `resolveSelectedRequestIdForTab`, 1 `derivePrintRequestListTab` editing case, 2
  `shouldShowRemainingWording`; all pre-existing suites re-verified with no regressions)
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session covering: full-fit Add to Show flow showing
only the plain summary with the normal footer button enabled, split flow still showing "remaining"
wording only after a leg is committed, the Working/Queued/Printed tab and detail panel staying in sync
after adding/removing a request from a show, a de-queued request displaying `Editing` and being
editable again, and a re-queued `Editing` request displaying `Active` plus the derived `Queued` badge
(never `Draft`).

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image mutation was performed.

### Rules deploy checkpoint

`firestore.rules`'s `isValidPrintRequestStatus` now allows `"editing"` as a valid `printRequests.status`
value. This is a **local, undeployed rules change**. Until `firebase deploy --only firestore:rules
--project fresh-prints-dev` (or the appropriate target project) runs, a live Firestore project will
reject any write of `status: "editing"` from this code, even though the client now sends it — this
must be deployed before the `editing` status can be verified end-to-end in a live environment. No
Firestore index changes were needed (single-document field addition, not a new query shape).

---

## Manual QA — FAIL (2026-07-05, fifth pass)

Manual QA of the wording/selection-sync/editing-status correction found the split-allocation flow
functionally closer, but flagged UX issues:

1. The design/quantity chooser was plain text rows with bare quantity inputs — no thumbnails, no
   visual sense of "choosing" designs, no strong running total.
2. The Add to Show modal was narrow and became tall quickly.
3. Show options were stacked square cards, wasting space.
4. The split warning copy was too wordy and repeated the override explanation already given by the
   override checkbox.

## Correction: Visual split picker and modal layout polish (2026-07-05)

### Scope implemented

- New `SplitDesignPickerModal.tsx`: opened from "Choose designs for this show," shows each remaining
  design as a card with a full, uncropped thumbnail (`DesignThumbnailPanel`, `imageFit="contain"`,
  same pattern as `PrintRequestItemCard`), title, `sizeLabel` if set, requested/remaining quantity, and
  a quantity input; a live totals strip ("Selected for this show," "Show capacity," "Remaining after
  this show," "Request total") recomputes on every change; exceeding the show's remaining capacity
  shows an inline warning and disables confirm
- `shared/utils/printRequestSplitAllocation.ts`: added `calculateSplitSelectionTotal()` (sums a
  quantities map, ignoring negative entries defensively), `clampSplitItemQuantity()` (clamps to
  [0, itemRemainingQuantity], floors fractional input, treats non-finite input as 0), and
  `formatSplitNeededWarning()` (simplified, override-free warning copy)
- `AddToShowModal.tsx`: replaced the inline plain-row split form with `SplitDesignPickerModal`;
  widened to `modal-panel-lg` (was `modal-panel-md`); prop renamed `designTitleById?: Map<string,
  string>` → `designById?: Map<string, Design>` so the picker can resolve thumbnails, not just titles;
  removed now-unused `getItemLabel`/`startSplitForShow`/`splitQuantities`/`splitSelectedTotal`/
  `splitExceedsCapacity` state and logic (superseded by the picker's own local state)
- `PrintRequestsPage.tsx`: updated the `AddToShowModal` call site to pass `designById` (already
  computed for `PrintRequestItemCard`) instead of the now-removed `designTitleById` memo
- `show-queue.css`: `show-date-picker-option` changed from a `flex-direction: column` square card to a
  full-width horizontal list row; `show-date-picker-options` changed from `flex-wrap: wrap` to a
  vertical stack; added `.split-picker-*` classes for the picker's totals strip and design cards

### Files changed

- `shared/utils/printRequestSplitAllocation.ts` (added 3 functions) + test additions
- `src/renderer/src/features/print-requests/components/SplitDesignPickerModal.tsx` (new)
- `src/renderer/src/features/print-requests/components/AddToShowModal.tsx` (widened, picker
  integration, `designById` prop)
- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (`designById` call-site
  update, removed unused `designTitleById` memo)
- `src/renderer/src/styles/components/show-queue.css` (compact list-row show cards, split-picker CSS)
- `docs/WORKFLOWS.md`, `docs/project/DECISIONS.md` (ADR-FP-053), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **357/357 tests passing** (9 new in
  `printRequestSplitAllocation.test.ts`: 3 `calculateSplitSelectionTotal`, 4 `clampSplitItemQuantity`,
  2 `formatSplitNeededWarning`; all pre-existing suites re-verified with no regressions)
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session covering: the Add to Show modal's width and
compact show list rows, the simplified split warning copy (no override mention), the visual picker's
full uncropped thumbnails and live running totals, choosing specific designs/quantities for the first
show and assigning the remainder to another show, canceling the picker without creating partial
allocations, and that full-fit requests still skip the picker entirely.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round (this was a UI-only
correction); the `editing` status rules-deploy checkpoint from the prior round remains outstanding and
unrelated to this change.

## Manual QA — FAIL (2026-07-05, sixth pass)

1. Split picker totals strip wording confusing: "Show capacity / 25 remaining" and "Remaining after
   this show" don't make clear what "remaining" refers to (before vs. after the current selection).
2. "Request total" in the totals strip is redundant with the plain-language summary shown one step
   earlier in `AddToShowModal`.
3. Design card wording "Requested 25, 25 remaining" is ambiguous about whether "remaining" is
   per-design or per-request.
4. Split picker quantity inputs look like unstyled native browser number inputs, inconsistent with the
   rest of the app (e.g. the Print Request item card's quantity stepper).
5. Requested confirmation that the `OPEN` production-status pill's color is not driven by the quantity
   currently being entered in the picker.

## Correction: Split picker wording, capacity display, and input styling (2026-07-05)

### Scope implemented

- `SplitDesignPickerModal.tsx` totals strip relabeled and reduced from 4 to 3 values: "Selected for
  this show" (unchanged), "Show capacity" → **"Available on this show"** (now computed live as
  `showRemainingCapacity - selectedTotal`, i.e. what's left *after* the current selection, not before
  it), "Remaining after this show" → **"Remaining for another show"** (same underlying calculation:
  request total minus selected). "Request total" removed from the strip entirely.
- Design card copy replaced `"Requested {quantity}, {remaining} remaining"` with three separate lines:
  `"{quantity} requested"`, `"{alreadyAssigned} already assigned"` (rendered only when
  `alreadyAssigned > 0`, i.e. once a prior split leg already touched that item), and
  `"{remainingQuantity} available to place"`. The `"Add to this show"` input label was already correct
  and is unchanged.
- Quantity input restyled: added `className="print-requests-number-input"` (the existing global class
  that removes native WebKit spinner arrows, already used by `PrintRequestItemCard`'s quantity
  stepper) plus new CSS on `.split-picker-card-input input[type="number"]` giving it the same
  background/border/radius/focus-ring treatment as the item card's stepper input
  (`--color-bg-secondary`, `--color-border`, `--radius-md`, `--color-accent-primary` focus ring) —
  no new input component was introduced.
- Investigated the `OPEN` pill: `getShowProductionStatusBadgeVariant()` derives the badge `variant`
  solely from `show.productionStatus`; the picker's in-progress quantity selection never feeds into
  that function or its call site. Over-capacity coloring is a *separate* concern — a
  `.show-date-picker-option-badge.is-over-capacity` modifier class driven by a different,
  capacity-only `wouldExceed` boolean computed in `AddToShowModal`. No code change was required; this
  is now documented in ADR-FP-054 so future QA can confirm without re-deriving it from scratch.
- No pure-util or test changes were needed — `calculateSplitSelectionTotal()` and
  `clampSplitItemQuantity()` are unchanged; this round was copy and CSS only.

### Files changed

- `src/renderer/src/features/print-requests/components/SplitDesignPickerModal.tsx` (totals strip
  relabeled/reduced to 3 values, live "available on this show" calculation, design card wording,
  styled quantity input)
- `src/renderer/src/styles/components/show-queue.css` (`.split-picker-card-input input[type="number"]`
  box/focus styling)
- `docs/WORKFLOWS.md`, `docs/project/DECISIONS.md` (ADR-FP-054), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test shared/utils/printRequestSplitAllocation.test.ts shared/utils/showCapacity.test.ts` —
  **23/23 passing**, unchanged (no logic changed this round)
- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **357/357 tests passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session covering the relabeled totals strip, the
live "available on this show" figure, the clarified design card wording, the restyled quantity inputs
(no native spinners, app-consistent styling), and confirming the `OPEN` pill's color still tracks only
production status while adding quantities in the picker.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round.

## Manual QA — FAIL (2026-07-05, seventh pass)

1. Split picker quantity inputs load pre-filled (e.g. `25` and `0`) instead of blank, making it feel
   like the app already chose the split quantities rather than staff choosing them.

## Correction: Split picker quantity inputs start blank (2026-07-05)

### Scope implemented

- `SplitDesignPickerModal.tsx`: replaced the pre-seeding `useState<SplitPickerQuantities>` initializer
  (which greedily assigned each design up to the show's remaining capacity on open) with a plain
  `useState<Record<string, string>>({})` holding raw input text, empty by default. A derived
  `quantities` value (`useMemo`) parses each raw string into the numeric `SplitPickerQuantities` map
  used everywhere else — blank/whitespace-only parses to `0`, anything else is clamped via the
  existing `clampSplitItemQuantity()`.
- `updateQuantity()` now stores `""` directly when the input is cleared (rather than coercing to `0`
  and re-rendering a `0`), so the field stays visually blank; non-blank input is parsed/clamped as
  before.
- The input's `value` reads from the raw string map and gained `placeholder="0"`.
- No change to the confirm button's disabled condition or to `AddToShowModal`'s existing
  `quantity > 0` filter when staging the leg — both already required a positive quantity to proceed,
  so blank inputs were already incapable of creating allocations; this correction fixes the *visual*
  pre-filled-value bug at its source.

### Files changed

- `src/renderer/src/features/print-requests/components/SplitDesignPickerModal.tsx`
- `docs/project/DECISIONS.md` (ADR-FP-055), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test shared/utils/printRequestSplitAllocation.test.ts shared/utils/showCapacity.test.ts` —
  **23/23 passing**, unchanged (no pure-util logic changed this round)
- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **357/357 tests passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session confirming the picker opens with blank
quantity inputs, the totals strip starts at `0 prints` selected / full show capacity available / full
remaining request quantity, typing updates totals live, clearing a field returns it to blank, the
assign button stays disabled until a positive quantity is entered, and split allocation and
cancel-safety are unaffected.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round.

## Manual QA — FAIL (2026-07-05, eighth pass)

1. Staged split allocation summary in the Add to Show modal shows only the show's time (e.g.
   `8:00 PM: 25 prints`), not its date, making it unclear which show a leg was assigned to once a
   split spans shows on different dates.

## Correction: Staged split allocation labels show date and time (2026-07-05)

### Scope implemented

- `AddToShowModal.tsx`'s `getShowLabel()` now calls `formatShowDateTimeLabel()` (already used
  elsewhere for Show Queue/Show Detail date+time display, and already covered by an existing
  "does not include seconds" test) instead of `formatShowTimeOnlyLabel()`. The show-date-picker's
  compact time-only badges are untouched — `formatShowTimeOnlyLabel` is still imported and used there.
- No new formatter, pure-util change, or test was needed; this reused an existing, already-tested
  helper in one additional call site.

### Files changed

- `src/renderer/src/features/print-requests/components/AddToShowModal.tsx`
- `docs/project/DECISIONS.md` (ADR-FP-056), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test shared/utils/showDateTimeDisplay.test.ts shared/utils/printRequestSplitAllocation.test.ts shared/utils/showCapacity.test.ts` —
  **25/25 passing**, unchanged (no logic changed this round)
- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **357/357 tests passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session confirming staged split allocation
summaries show both date and time (no seconds), the split flow and Undo still work, remaining quantity
still calculates correctly, and no allocation is committed until the full Add to Show flow is
confirmed.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round.

## Manual QA — FAIL (2026-07-05, ninth pass)

1. Split warning copy only described the split path ("The remainder will need to be added to another
   show. Choose the prints to be added to this show."), leaving staff unaware they could instead just
   pick a different show above for the full request.
2. The warning text, "Choose designs for this show" button, and staff override checkbox looked
   visually loose and unpolished — the button in particular did not look aligned or sized consistently
   with the rest of the modal.

## Correction: Split warning copy and decision-area layout polish (2026-07-05)

### Scope implemented

- `shared/utils/printRequestSplitAllocation.ts`'s `formatSplitNeededWarning()` copy changed to "Only N
  of M prints can be added to this show. You can choose which prints to add here and place the rest on
  another show, or select a different show for the full request." — explains both the split path and
  the pick-a-different-show path, still without mentioning override (the checkbox below already
  explains that). Updated the matching test in `printRequestSplitAllocation.test.ts` to the new exact
  wording.
- `AddToShowModal.tsx`: the warning paragraph now uses a new `show-allocation-decision-message` class
  instead of the generic `print-requests-modal-hint`; the override `<label>` now uses a new
  `show-allocation-decision-override` class with its text wrapped in a `<span>` for cleaner
  checkbox/text alignment when wrapping.
- `show-queue.css`: `.show-allocation-decision` gained the same bordered-callout treatment already
  used for `.split-picker-totals` (`--color-bg-tertiary` background, `--color-border` border,
  `--radius-lg` radius, `--space-4` padding, `--space-3` internal gap) so the warning, button, and
  checkbox read as one deliberate decision area. `.show-allocation-decision-actions .button` is now
  `width: 100%` so "Choose designs for this show" spans the callout as its clear primary action.
  `.show-allocation-decision-override` gets a top border/padding to separate it from the button above,
  plus flex layout with `align-items: flex-start` so a wrapping checkbox label stays aligned with the
  checkbox.
- No logic, allocation, capacity, or override behavior changed — full-fit requests still skip this
  callout entirely (`needsDecision` is unchanged), and the override button/handler are untouched.

### Files changed

- `shared/utils/printRequestSplitAllocation.ts` (warning copy) + matching test update
- `src/renderer/src/features/print-requests/components/AddToShowModal.tsx` (class names, JSX structure
  for the override label)
- `src/renderer/src/styles/components/show-queue.css` (bordered callout, full-width action button,
  override row separation)
- `docs/WORKFLOWS.md`, `docs/project/DECISIONS.md` (ADR-FP-057), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test shared/utils/printRequestSplitAllocation.test.ts shared/utils/showCapacity.test.ts` —
  **23/23 passing** (1 test updated for new copy, rest unchanged)
- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **357/357 tests passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session confirming the new warning copy explains
both paths, the decision area reads as one clean bordered callout, the action button is full-width and
visually consistent with the app, the override checkbox aligns cleanly, full-fit requests still skip
this section entirely, and split allocation/override still work.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round.

## Manual QA — FAIL (2026-07-05, tenth pass)

1. Split picker design cards show `{quantity} requested` and `{remaining} available to place`; staff
   misread "available to place" as the quantity available on the currently selected show, when it
   actually means the design's own remaining (unassigned) request quantity.

## Correction: Split picker design card copy simplified (2026-07-05)

### Scope implemented

- `SplitDesignPickerModal.tsx`: removed the `{entry.remainingQuantity} available to place` line from
  each design card entirely. Cards now show only `{entry.item.quantity} requested` and, when
  `alreadyAssigned > 0` (a prior split leg already touched that item), `{alreadyAssigned} already
  assigned`. No other card content changed — thumbnail, title, size label, and the "Add to this show"
  quantity input (still clamped to `entry.remainingQuantity` via `max`) are unchanged.
- No pure-util, logic, or test changes were needed — this was a JSX copy removal only.

### Files changed

- `src/renderer/src/features/print-requests/components/SplitDesignPickerModal.tsx`
- `docs/WORKFLOWS.md`, `docs/project/DECISIONS.md` (ADR-FP-058), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test shared/utils/printRequestSplitAllocation.test.ts shared/utils/showCapacity.test.ts` —
  **23/23 passing**, unchanged (no logic changed this round)
- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **357/357 tests passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session confirming design cards no longer show
"available to place," still clearly show the requested quantity, the quantity input still works
correctly, the totals strip still shows selected/available/remaining-for-another-show, and split
allocation still works.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round.

## Manual QA — FAIL (2026-07-05, eleventh pass)

1. On the `Queued` tab, the selected request's `Add to Show` button renders disabled with a "This
   request is already queued to a show." tooltip. Since every request on that tab is queue-locked by
   definition, the button serves no purpose and just adds visual noise.

## Correction: `Add to Show` hidden while queue-locked (2026-07-05)

### Scope implemented

- `PrintRequestsPage.tsx`: the `Add to Show` action row's render condition changed from
  `visibleSelectedRequest ? ... : null` to `visibleSelectedRequest && !isSelectedRequestQueueLocked ?
  ... : null`. The button's `disabled`/`title` props were simplified back to only the
  `requestItems.length === 0` empty-request case, since the queue-locked case is now handled by not
  rendering the action row at all.
- `isSelectedRequestQueueLocked` itself is unchanged (`totalAllocatedQuantity > 0` for a non-`completed`
  request), so the button correctly reappears once a request is fully removed from its show(s) and
  transitions to `editing` (zero active allocations) — it does not disappear permanently for a request
  that was ever queued.

### Files changed

- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `docs/project/DECISIONS.md` (ADR-FP-059), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **357/357 tests passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session confirming the `Add to Show` button no
longer appears on the `Queued` tab, still appears (enabled/disabled as appropriate) on `Working` and
for `editing` requests, and reappears correctly after a request is fully removed from its show(s).

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round.

## Manual QA — FAIL (2026-07-05, twelfth pass)

1. Show Detail's capacity progress bar and text ("200 allocated", "0 remaining of 200") don't clearly
   communicate that a show is full.
2. The Add to Show modal's show option pill shows `OPEN` even when the show is at or over capacity
   (`0 / 200 left`), which is confusing.
3. Staff cannot tell at a glance whether a show is empty, getting full, full, or over capacity.

## Correction: Capacity progress bars and derived status pill (2026-07-05)

### Scope implemented

- New `shared/utils/showCapacityDisplay.ts`: `getShowCapacityPercent()` (percent used, uncapped when
  no max), `getCapacityFillLevel()` (green `low` &lt;70%, yellow `medium` 70–89%, red `high` 90–99%,
  red `critical` &ge;100%), `formatCapacityUsedLabel()` ("N of M used" / "No max set"),
  `formatSpotsRemainingLabel()` ("N spots left" / "Full" / "N over max" / "No limit"), and
  `getDerivedShowStatusDisplay(productionStatus, capacity)` — the single source of truth for the status
  pill, prioritizing `printing`/`fully_printed`/`completed`/`archived`/`canceled` over a
  capacity-derived `OVER MAX`/`FULL`/`OPEN` fallback when `productionStatus` is `open`.
- `UpcomingShowsPage.tsx`: the sidebar show card and Show Detail pill row now use
  `getDerivedShowStatusDisplay()` instead of the old static production-status badge; the Capacity card
  gained a `show-capacity-card` wrapper class toggling `.is-full`/`.is-over-capacity`, the progress bar
  now colors via `getCapacityFillLevel()`, and the summary text uses `formatCapacityUsedLabel()`/
  `formatSpotsRemainingLabel()`.
- `AddToShowModal.tsx`: each show option card in the date-grouped list now renders a colored progress
  bar, "N of M used &middot; N spots left" text, a derived status pill, and `.is-full`/
  `.is-over-capacity` whole-card styling; the old always-static production-status badge and ambiguous
  "N / M left" text were removed.
- `upcomingShowDisplay.ts`: removed the now-fully-superseded `getShowProductionStatusBadgeVariant()`
  and its now-unused `ShowProductionStatus` import.
- `show-queue.css`: added `.show-capacity-bar-fill.is-low/.is-medium/.is-high/.is-critical`,
  `.show-capacity-card.is-full/.is-over-capacity`, `.print-requests-request-card.is-full/
  .is-over-capacity`, `.show-date-picker-option.is-full/.is-over-capacity`, and a new
  `.show-date-picker-option-bar-track/-fill` progress bar for show option cards, all using existing
  `--color-success`/`--color-warning`/`--color-danger` design tokens (dark-theme aware, no new colors
  introduced).
- No write path, allocation logic, override logic, or split logic changed. The existing `"full"` value
  in the `ShowProductionStatus` enum is intentionally never written to by this correction — Full/Over
  Max is computed live at render time from `allocatedQuantity` vs. `maxTotalQuantity`, so every
  existing show displays correctly after a refresh with no migration, backfill, or delete/re-add.

### Files changed

- `shared/utils/showCapacityDisplay.ts` (new) + test file (new)
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `src/renderer/src/features/upcoming-shows/utils/upcomingShowDisplay.ts` (removed dead function)
- `src/renderer/src/features/print-requests/components/AddToShowModal.tsx`
- `src/renderer/src/styles/components/show-queue.css`
- `docs/WORKFLOWS.md`, `docs/project/DECISIONS.md` (ADR-FP-060), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test shared/utils/showCapacityDisplay.test.ts shared/utils/showCapacity.test.ts shared/utils/printRequestSplitAllocation.test.ts` —
  **46/46 passing** (23 new in `showCapacityDisplay.test.ts`)
- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **380/380 tests passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session confirming: green progress bar under 70%
used, yellow 70–89%, red 90%+; a full show at 200/200 shows `FULL` with a distinct card treatment; an
over-capacity show shows `OVER MAX` with a stronger danger treatment; Add to Show show cards no longer
show a full show as simply `OPEN`; capacity text reads clearly ("200 of 200 used", "0 spots left");
existing shows show correct capacity color/status after a plain refresh with no delete/re-add;
Printing/Completed statuses remain distinct from capacity status; split allocation, override, and
full-fit Add to Show all still work; and no `designs.status` change occurred.

### Firestore rules/index checkpoint

No Firestore rules or index changes were made or are needed for this correction — capacity status is
fully derived from existing `allocatedQuantity`/`maxTotalQuantity`/`productionStatus` fields already
readable under current rules. Nothing pending deploy from this round.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round.

## Manual QA — FAIL (2026-07-05, thirteenth pass)

1. Adding an 8-print request to an already-full show shows "Only 0 of 8 prints can be added to this
   show..." plus a "Choose designs for this show" button that opens a picker with zero capacity to
   place anything into. The only valid action for a fully-full show should be the staff override.

## Correction: Full-show decision path skips the split picker (2026-07-05)

### Scope implemented

- `AddToShowModal.tsx`: added `isSelectedShowFull`, true when `planAllocationSplit()`'s
  `fittingQuantity` is `0` and there is a nonzero remainder to place (i.e. the show can accept none of
  the remaining request). When true, the decision area shows plain copy ("This show is full. You can
  select a different show for the full request, or use the staff override below to add it anyway.")
  instead of `formatSplitNeededWarning()`, and the "Choose designs for this show" button is not
  rendered at all — only the existing staff override checkbox + "Add with override" button remain. A
  show with partial remaining capacity continues to use the normal split-decision path unchanged.
- No change was needed to the footer's plain "Add to show" button — `canConfirmFullFitDirectly`
  already requires `!needsDecision`, and `needsDecision` is true whenever a show doesn't fully fit, so
  a full show already could not be committed via that button.
- No pure-util or test changes were needed — `planAllocationSplit()` already returns
  `fittingQuantity: 0` for a full/over-capacity show; this correction only branches JSX on that
  existing value.

### Files changed

- `src/renderer/src/features/print-requests/components/AddToShowModal.tsx`
- `docs/project/DECISIONS.md` (ADR-FP-061), `docs/project/ROADMAP.md`

### Verification (correction)

- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **380/380 tests passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

### Manual QA (pending)

Not yet run — pending a fresh authenticated Studio session confirming that selecting an already-full
show no longer shows the split warning or "Choose designs for this show" button, only override copy
and the override checkbox/button; that a partially-full show still shows the normal split-decision
path; and that override still successfully adds the full remainder to a full show.

### Not performed (correction)

No Firebase deploy, Functions deploy, Firestore rules deploy, Firestore index deploy, migration,
backfill, live Whatnot fetch/scraping, scheduled Function, manual scrape callable, secrets, Portal
behavior, Custom Requests, ecommerce, shipping, or image/thumbnail/preview/catalog-dimension mutation
was performed. No Firestore rules or index changes were needed this round.
