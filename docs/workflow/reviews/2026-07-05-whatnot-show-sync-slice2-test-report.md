# Test Report: whatnot-show-sync — Slice 2 (staff-assisted Electron browser import)

**Date:** 2026-07-05
**Scope:** Staff-assisted Electron browser import pivot, per explicit user approval. Replaces the
Cloud-Function-scraping design (blocked at slice 1 by Cloudflare, see
`docs/workflow/reviews/2026-07-05-whatnot-show-sync-slice1-test-report.md`). No scheduled Function, no
callable Function, no server-side fetch, no headless browser, no third-party proxy, no new dependency,
no Firebase deploy.

## 1. Files changed

**New:**
- `shared/utils/whatnotShowImportCandidate.ts` + `.test.ts` — DOM-candidate parsing, relative date/time resolution
- `shared/utils/whatnotShowImportPlan.ts` + `.test.ts` — create/update/unchanged/needs_review classification
- `shared/utils/whatnotAssistedImportReminder.ts` + `.test.ts` — reminder-due logic
- `shared/types/whatnotImport/whatnotImport.types.ts` — IPC contract types
- `electron/ipc/whatnotImport/whatnotImportWindow.ts` — BrowserWindow + `executeJavaScript()` extraction
- `electron/ipc/whatnotImport/whatnotImportIpcChannels.ts` — channel allowlist
- `electron/ipc/whatnotImport/whatnotImportIpcHandlers.ts` — `ipcMain.handle` registrations
- `src/renderer/src/features/upcoming-shows/hooks/useWhatnotShowImport.ts` — import flow state/orchestration

**Modified:**
- `electron/main.ts` — registers the new IPC handler set
- `electron/preload.ts` — exposes `window.freshPrints.whatnotImport.{openImportWindow,extractShowCandidates,closeImportWindow}`
- `shared/types/import/importIpc.types.ts` — `FreshPrintsPreloadApi` includes `whatnotImport`
- `src/renderer/src/shared/services/desktopAppService.ts` — adds `whatnotImportDesktopService`
- `shared/types/upcomingShow/upcomingShow.types.ts` — adds `sourceBaseUrlSnapshot?`, `lastSeenInAssistedImportAt?`
- `src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts` — reads/writes the two new fields
- `src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts` — adds `whatnotShowBaseUrl`, `lastWhatnotAssistedImport*` fields and `recordWhatnotAssistedImportResult()`
- `src/renderer/src/features/upcoming-shows/hooks/useShowQueueSettings.ts` — plumbs the new settings fields/method
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` — "Import Whatnot shows" header action, base URL settings field, reminder banner, import preview modal
- `src/renderer/src/styles/components/show-queue.css` — reminder banner styling
- `firestore.rules` — extends `upcomingShows` and `settings/showQueue` field allowlists
- `docs/workflow/plans/2026-07-05-whatnot-show-sync-plan.md` — Section 7B pivot, superseded-section markers, revised Required Output

## 2. Plan updates for the pivot

Added Section 7B documenting the full pivot rationale and design (why a real BrowserWindow sidesteps
Cloudflare where a bare `fetch()` cannot), the new data model, the new Firestore rules shape, and the
reminder/nudge design. Marked Sections 8–11, 13, 15, 17–18, and 26 as superseded with pointers back to
7B. Rewrote the "Required output" section to reflect what was actually implemented instead of the
original Cloud-Function slice plan.

## 3. Abandoned Cloud Function/server-fetch code removed

**None needed.** Repo-wide search confirmed slice 1 never introduced any Cloud Function, server-fetch,
or scraper code — it was contained entirely to `shared/utils/whatnotShowBaseUrl.ts` and a throwaway,
non-committed verification script (already deleted). Nothing under `functions/src/` referenced Whatnot
at any point. No cleanup was required.

## 4. Base URL validator

Kept `shared/utils/whatnotShowBaseUrl.ts` and its 14-test suite exactly as-is (not modified). It remains
the single validator used in three places: the Show Queue settings form, `showQueueSettingsService`
before every write, and `openWhatnotImportWindow()` in the Electron main process before ever opening a
window — the import window can never be pointed at an arbitrary URL, only the strictly-validated
`https://www.whatnot.com/user/<username>/shows` shape.

## 5. Electron BrowserWindow / import IPC behavior

- `openWhatnotImportWindow(rawBaseUrl, ownerWindow)` (`electron/ipc/whatnotImport/whatnotImportWindow.ts`)
  validates the URL via `parseWhatnotShowBaseUrl()`, closes any previously-open import window, and opens
  a new `BrowserWindow` positioned on the same display as the app (mirroring `externalLinkWindow.ts`),
  with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and **no preload script** —
  identical security posture to the existing external-link window.
- `extractWhatnotShowCandidates()` runs a small, self-contained script via
  `webContents.executeJavaScript()` **inside the import window's own page context** (the Whatnot page
  itself, not a preload-injected API) that queries `a[href*="/live/"]` anchors and returns a plain,
  structured-clonable `{href, title, dateText}[]` array. Runs once, only on staff's explicit click —
  never automatically, never on a timer.
- `closeWhatnotImportWindow()` closes the window if open; called on cancel and after a successful import.
- Three new IPC channels (`fresh-prints:whatnot-import:open-window`, `:extract-candidates`,
  `:close-window`), each allowlisted in `whatnotImportIpcChannels.ts` and validated in the preload
  bridge before `ipcRenderer.invoke` is ever called, matching every other IPC domain in this codebase.

## 6. Show Queue UI changes

- New header action **"Import Whatnot shows"** (staff-only, alongside the existing Settings action).
- Show Queue **settings modal** gained a **"Whatnot show base URL"** text field, pre-filled with the
  saved value or the hardcoded default, validated live via `parseWhatnotShowBaseUrl()`, with the Save
  button disabled on an invalid value.
- New **import preview modal**: opens the Whatnot page in-app, shows a "let it load, then click here"
  prompt, then (on scan) a checklist of candidates with per-row Create/Update/Unchanged/Needs review
  badges — needs-review rows are shown but their checkbox is disabled (cannot be force-imported).
  Cancel closes the window and discards everything; Confirm writes only the checked, non-`needs_review`
  rows.

## 7. Reminder behavior

A banner reading "Reminder: open Whatnot and import visible shows for today." appears above the Show
Queue list whenever `isAssistedImportReminderDue()` (`shared/utils/whatnotAssistedImportReminder.ts`)
returns true — i.e. no assisted import has ever succeeded, or the last one was 24+ hours ago — gated to
staff who can manage the Show Queue. It includes its own "Import Whatnot shows" button. This is a pure
render-time check against the loaded settings document; no background timer, no OS notification.

## 8. Parser / candidate extraction approach

`parseWhatnotShowImportCandidate()` (`shared/utils/whatnotShowImportCandidate.ts`) takes one raw
`{href, title, dateText}` triple plus an injected `now`, reuses the existing `parseWhatnotShowUrl()` for
ID extraction (no duplicated regex), and resolves `dateText` via `resolveWhatnotShowDateText()`, which
handles three shapes: `"Today H:MM AM/PM"`, `"<Weekday> H:MM AM/PM"` (next occurrence, correctly handling
a same-day-of-week case as "next week" not "today"), and `"<Weekday>, <Month> <Day>, H:MM AM/PM"`
(explicit date, with year-rollover for implied-past dates). Anything unrecognized — either the ID or the
date — comes back as `status: "needs_review"` with the raw text preserved, never guessed or dropped
silently.

## 9. Preview / confirmation behavior

`planWhatnotShowImport()` (`shared/utils/whatnotShowImportPlan.ts`) classifies each parsed candidate
against the already-loaded `existingShows` list by `whatnotShowId` only (never date/time/title) into
`create` / `update` / `unchanged` / `needs_review`. The renderer hook (`useWhatnotShowImport.ts`) surfaces
this as a checklist; staff can uncheck any row (needs-review rows are always excluded); nothing is
written to Firestore until "Confirm import" is clicked. Canceling at any stage closes the window and
discards all candidates with zero writes.

## 10. Upsert behavior

Confirmed rows call the existing `upcomingShowService.upsertUpcomingShow()` — the same method the manual
"Add Show" flow already uses — with `fromAssistedImport: true` and `sourceBaseUrlSnapshot` set to the
base URL that produced the candidate. This reuses 100% of the existing match-by-`source+whatnotShowId`
upsert contract: on match, only `title`/`whatnotUrl`/`scheduledStartAt`/`sourceBaseUrlSnapshot`/
`lastSeenAt`/`lastSeenInAssistedImportAt` are touched; on no match, a new record is created with the
existing default field set. No new upsert logic was written — the assisted import is just a new caller
of the pre-existing, already-tested upsert method.

## 11. Local planning fields and allocations preserved

Confirmed by inspection of `upcomingShowService.upsertUpcomingShow()` (unchanged in this slice beyond the
two new additive fields): `status`, `productionStatus`, `notes`, `maxTotalQuantity`,
`maxQuantityOverridden`, `allocatedQuantity`, and `isArchived` are never included in the update payload
this method builds, so an assisted-import-triggered update cannot touch any of them. `showAllocations`
are never read or written by any code path added in this slice.

## 12. Tests added/updated

- `shared/utils/whatnotShowImportCandidate.test.ts` — 11 tests: relative/explicit date-time resolution
  (including week-boundary and year-rollover edge cases), emoji/special-character title preservation,
  needs-review classification for both unresolvable IDs and unresolvable dates, batch mapping.
- `shared/utils/whatnotShowImportPlan.test.ts` — 5 tests: create/update/unchanged/needs_review
  classification, empty-list handling.
- `shared/utils/whatnotAssistedImportReminder.test.ts` — 3 tests: never-imported, recently-imported,
  due-again-after-a-day (including the exact-24-hour boundary).
- No new test framework introduced; all use `node:test`, matching every existing test in this repo.
- No fixture-based Electron/`executeJavaScript()` integration test was added — the extraction script runs
  inside a real Chromium renderer process and is not meaningfully unit-testable without a running
  Electron instance; its logic is intentionally minimal (a DOM query + text extraction) specifically so
  the substantive, testable logic (candidate parsing, classification, reminder timing) lives in
  plain-function `shared/utils/` modules instead.

## 13. Verification

- `npx tsx --test shared/utils/whatnotAssistedImportReminder.test.ts shared/utils/whatnotShowImportCandidate.test.ts shared/utils/whatnotShowImportPlan.test.ts shared/utils/whatnotShowBaseUrl.test.ts shared/utils/whatnotShowUrl.test.ts` — **42/42 passing**
- Full suite: `npx tsx --test $(all *.test.ts under shared/ and src/)` — **416/416 passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS (0 warnings, `--max-warnings 0`)
- `npx vite build` — PASS for renderer, Electron main, and preload; only the pre-existing circular
  manual-chunk warning
- `git diff --check` — PASS, only pre-existing CRLF warnings on files this slice did not introduce

## 14. Firestore rules changes

- `upcomingShowRequiredFieldsValid()` — added `sourceBaseUrlSnapshot` (optional string) and
  `lastSeenInAssistedImportAt` (optional timestamp) to the `hasOnly([...])` allowlist and validation.
- `showQueueSettingsFieldsValid()` — added `whatnotShowBaseUrl` (optional string),
  `lastWhatnotAssistedImportAt` (optional timestamp), `lastWhatnotAssistedImportStatus` (optional,
  `"succeeded" | "failed"` via new `isValidWhatnotAssistedImportStatus()`), `lastWhatnotAssistedImportSummary`
  (optional map), `lastWhatnotAssistedImportError` (optional string) to its allowlist.
- No client-vs-service-account distinction was needed (unlike the original Cloud-Function design) —
  every write in this slice is an ordinary `isStaff()` + `canManageUpcomingShows()`-gated client write
  attributed to the confirming staff member's UID, identical in shape to the pre-existing manual
  "Add Show" path.

## 15. Deploy command needed later

Rules changes are **local only, not deployed**, per plan scope. When ready:

```
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Note: this is in addition to, not a replacement for, the still-outstanding `print-runs-foundation` rules
deploy checkpoint recorded in `docs/workflow/reviews/2026-07-05-print-runs-foundation-signoff.md`.

## 16. Manual QA status

**Not performed as part of this slice** — manual QA against a real, loaded Whatnot page requires a human
in a real desktop app session (per the plan's own manual QA checklist), which is outside what this
implementation pass can execute. Recommended before signoff: run the 22-point manual QA checklist in the
approval request (open Show Queue, save/reject base URLs, open the import window, let it load, scan,
confirm preview fields, cancel-without-writing, re-run idempotently, verify capacity/allocations survive,
verify the reminder clears after a successful import).

## 17. Confirmation of what was NOT done

No deploy of any kind, no scheduled Cloud Function, no callable scraping Cloud Function, no server-side
fetch scraper, no third-party proxy, no headless browser, no new npm dependency, no secrets, no
migration, no backfill, no Portal, no Custom Requests, no ecommerce, no shipping, no gang-sheet export,
no image mutation, no `designs.status` write. The only external network activity connected to this
feature was the single, already-reported slice 1 verification fetch — this slice performed **zero**
network requests of its own (all logic runs client-side against an already-open, human-navigated
browser window).
