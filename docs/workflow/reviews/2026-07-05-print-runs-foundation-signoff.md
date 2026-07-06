# Signoff: print-runs-foundation

**Date:** 2026-07-05
**Result:** PASS
**Approved by:** User, in this session

## Summary

`print-runs-foundation` (Phase 7 — Show Queue) is signed off PASS after thirteen QA-driven correction
rounds. `/show-queue` is the single combined Whatnot-show / print-run workflow; `/print-runs` redirects
to it. `upcomingShows` and `showAllocations` are the canonical Firestore collections for this feature —
the earlier split `printRuns`/`printRunItems` model was removed during the initial correction and no
longer exists anywhere in the codebase.

## Manual QA result

User-run authenticated manual QA passed in a dev Studio session, covering (per the user's report):
Show Queue combined workflow and `/print-runs` redirect; Add Show / Whatnot URL parsing / `Show ID`
label / date-time picker / save-and-list / duplicate-ID update-in-place; Upcoming/Past tabs; no-seconds
date/time display; default and per-show capacity settings; capacity progress bars and full/over-max
whole-card states; Open/Full/Printing/Completed display priority; Add to Show full-fit and split flows;
visual split picker with uncropped thumbnails and live totals; remainder-to-another-show; staff
override; removal updating allocated totals/capacity and returning a request to Working as `editing`;
re-queuing an `editing` request showing active/queued (never `draft`); Working/Queued/Printed tabs;
fixed stale detail-selection; queued-request edit lock; no `designs.status` writes; unaffected Print
Request sizing/autosave/preview, CR/IR naming, origin badges, and Design Library selection; same-monitor
external link window; and that no live Whatnot fetch/scrape is active.

## Automated verification (final)

- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx tsx --test $(find shared src -name "*.test.ts")` — **383/383 passing**
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

Targeted suites re-verified clean throughout the correction passes: Show Queue / Show Allocation /
Add to Show / capacity / capacity-display / split-allocation / print-request queue-state / tab-selection
tests. Full history of each round's targeted + full-suite results is in
`docs/workflow/reviews/2026-07-04-print-runs-foundation-test-report.md`.

## Files changed (cumulative, this phase)

**New shared types/utils (+ tests):**
`shared/types/upcomingShow/`, `shared/types/showAllocation/`,
`shared/utils/whatnotShowUrl.ts`, `showCapacity.ts`, `showCapacityDisplay.ts`,
`showDateTimeDisplay.ts`, `showQueueEditability.ts`, `printRequestQueueState.ts`,
`printRequestListGrouping.ts`, `printRequestSummaryCopy.ts`, `printRequestSplitAllocation.ts`,
`printRequestTabSelection.ts`, `groupAllocationsByShow.ts`, `externalLinkSafety.ts` (each with a
matching `.test.ts`), plus `showAllocationSplitScenario.test.ts`.

**Renderer — Show Queue:** `src/renderer/src/features/upcoming-shows/` (pages, hooks, services,
utils, components — new feature folder), `src/renderer/src/styles/components/show-queue.css` (new).

**Renderer — Print Requests:** `PrintRequestsPage.tsx`, `PrintRequestItemCard.tsx`,
`components/AddToShowModal.tsx` (new), `components/SplitDesignPickerModal.tsx` (new),
`hooks/usePrintRequestAllocationTotals.ts` (new), `utils/printRequestQueueBadge.ts` (new),
`styles/components/print-requests.css`.

**Electron / shared plumbing:** `electron/ipc/app/appIpcChannels.ts`, `appIpcHandlers.ts`,
`externalLinkWindow.ts` (new), `electron/preload.ts`, `shared/types/app/appIpc.types.ts` (same-monitor
external link window support).

**Routing / removed legacy:** `src/renderer/src/routes/AppRoutes.tsx` (`/print-runs` redirect),
`src/renderer/src/features/show-queue/pages/ShowQueuePage.tsx` deleted (superseded by
`upcoming-shows`).

**Firestore:** `firestore.rules`, `firestore.indexes.json` — local, undeployed changes for
`upcomingShows`, `showAllocations`, `settings/showQueue`, and the `editing` `printRequests.status`
value.

**Docs/workflow:** `docs/architecture/DATA_MODEL.md`, `docs/WORKFLOWS.md`, `docs/project/ROADMAP.md`,
`docs/project/DECISIONS.md` (ADR-FP-048 through ADR-FP-061), `.cursor/workflow/state.md`,
`project-chatgpt-handoff/CURRENT-STATE.md`, `docs/workflow/plans/2026-07-04-print-runs-foundation-plan.md`,
`docs/workflow/reviews/2026-07-04-print-runs-foundation-test-report.md`, this signoff.

**Unrelated pre-existing modifications** (present before this phase began, confirmed untouched by it):
`docs/architecture/DATA_MODEL.md`'s other sections, `aiReviewInboxSelection.ts`,
`CategoryManagementModal.tsx`, `categoryService.ts`, `ImportPngPreview.tsx`,
`BatchImportFileList.tsx`, `permissionService.ts`, `permission.types.ts`, `AddUserModal.tsx`,
`UserManagementPage.tsx`, `GlobalSearchField.tsx`, `Sidebar.tsx`, `desktopAppService.ts`,
`shellHeader.types.ts`, `globals.css`, `firestoreCollections.ts`, `firestoreCollectionService.ts`.

## Collections / model confirmation

- `upcomingShows` and `showAllocations` are the canonical, sole collections for this feature.
- The original split `printRuns`/`printRunItems` model and the legacy `/show-queue` (old) feature
  folder were removed during the first correction round; no trace remains in the codebase.
- Production status (`open`/`full`/`printing`/`fully_printed`/`completed`/`archived`/`canceled`) lives
  only on `upcomingShows.productionStatus`; the UI's displayed Full/Over Max state is derived live from
  capacity and never persisted as `full` — no migration was ever required for that display feature.
- No write path in this phase ever touched `designs.status`.

## Not performed

No production deploy, Functions deploy, Hosting deploy, Storage rules deploy, migration, backfill,
live Whatnot fetch/scrape, scheduled Function, secrets, Portal, Custom Request, ecommerce, shipping,
gang-sheet export, image mutation, thumbnail regeneration, preview regeneration, or catalog dimension
change was performed at any point in this phase.

## Firestore rules/index deploy status

**Not deployed.** Local (uncommitted-to-prod) `firestore.rules`/`firestore.indexes.json` changes for
`upcomingShows`, `showAllocations`, `settings/showQueue`, and the `editing` `printRequests.status`
value have been written and verified via the app's own logic, but never deployed in this engagement.

**Follow-up checkpoint (separate future approval required):**
```
firebase deploy --only firestore:rules --project fresh-prints-dev
```
Until this runs, the `editing` status write and any Show Queue rule-dependent write will fail against
the live `fresh-prints-dev` Firestore project's rules, even though local rules and app logic already
support them.

## Remaining follow-ups

- Deploy dev Firestore rules (above) before relying on `editing` status or Show Queue rules live.
- Live Whatnot fetch/sync, scheduled Cloud Function sync, and a manual refresh callable remain
  **Planned**, not implemented — still explicitly out of scope until a separately approved phase.
- Download-originals/batch export for gang sheets and Pensacola file export remain Planned.
