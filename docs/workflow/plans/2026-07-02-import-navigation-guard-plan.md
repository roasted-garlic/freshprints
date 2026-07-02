# Plan — Import Navigation Guard (Cancel/Confirm Before Leaving)

- **Date:** 2026-07-02
- **Goal slug:** `import-navigation-guard`
- **Status:** approved — FreshForge review complete (`docs/workflow/reviews/2026-07-02-import-navigation-guard-plan-review.md`, verdict: Approved with modifications, both incorporated below); ready for implementation
- **Phase alignment:** Phase 3 Import System hardening / Studio reliability maintenance. User has
  explicitly approved prioritizing this ahead of `print-request-query-index-hardening` because this
  addresses a safety bug in the live Imports workflow (uploads currently cannot be cancelled once
  in flight, and no confirmation exists before navigation/close can silently abandon an active
  upload).

## Problem

The Imports screen (`ImportsPage.tsx`) has no protection against leaving mid-upload:

1. **In-app navigation** (clicking another sidebar link) unmounts `ImportsPage` with zero warning,
   even while a batch or single upload is actively in flight.
2. **Closing the Electron window/app** has no guard at all — `electron/main.ts`'s only `close`
   handler persists window bounds and does not intercept/confirm.
3. Cancelling an **in-flight** upload is currently impossible: both `useBatchImport.cancelImport`
   and `useSinglePngImport.cancelImport` explicitly no-op (batch) or disable the cancel button
   (single) once `phase === "uploading"`, because the underlying Firebase Storage calls use
   `uploadBytes` — a one-shot `Promise` with no abort/cancel handle, unlike `uploadBytesResumable`
   which returns an abortable `UploadTask`.
4. Leaving **before** upload starts (phases `selecting`/`discovering`/`ready-to-upload`) already
   cancels cleanly via existing `cancelImport` logic — this part is not broken.

User decisions (confirmed via AskUserQuestion):

- Make in-flight uploads actually abortable (switch `uploadBytes` → `uploadBytesResumable` for the
  import upload path), not just block/no-op cancel during upload.
- In-app navigation away from Imports during an active upload: block with a confirm dialog.
- Closing the Electron window/app during an active upload: block with a confirm dialog.

## Scope

### 1. Abortable uploads (`importUploadService.ts`)

- Switch `uploadOriginalPng` from `uploadBytes` to `uploadBytesResumable`, returning (or accepting)
  an `AbortController`-like cancel handle. Firebase's `UploadTask` has a native `.cancel()` — use
  that directly rather than wrapping in `AbortController`.
- Thread a cancel handle from `importUploadService.uploadOriginalPng` up through
  `importOrchestrationService` → `importBatchOrchestrationService.runBatchUpload` and
  `useSinglePngImport`'s upload call, so each hook can hold a ref to the in-flight `UploadTask`(s)
  and call `.cancel()` on confirmed leave.
- `runWithConcurrency` (batch orchestration) needs a way to register/track multiple concurrent
  `UploadTask`s so a bulk cancel can (a) stop whichever files are actively uploading via `.cancel()`
  and (b) prevent any not-yet-started queued files in the batch from beginning at all — a cancel
  signal/flag checked by the concurrency runner before starting each new file's upload, not just an
  abort of in-flight tasks. Already-completed file uploads and their created design records are not
  retroactively undone (matches existing partial-completion behavior — a batch cancel mid-flight
  already leaves some designs imported and some not, per today's per-file orchestration); this is a
  deliberate, confirmed decision, not an oversight.
- `designDerivativeStorageService.uploadDerivativeWebp` (thumbnail/preview generation, separate
  from the raw PNG upload) is **out of scope** — only the primary import PNG upload gets abort
  support in this phase, since that's the long-running step users would want to interrupt.
- Update `useBatchImport.cancelImport` and `useSinglePngImport.cancelImport` to call `.cancel()` on
  any tracked in-flight `UploadTask`(s) when `phase === "uploading"`, instead of no-op/disabled.
  Firebase resolves a cancelled `UploadTask`'s promise with a `storage/canceled` error, which
  `getStorageUploadErrorMessage` in `importUploadService.ts` already maps to a user-facing message
  — reuse that path rather than inventing new error handling.
- **Cancel timing clarification:** cancel only interrupts a file's `uploadOriginalPng` call itself.
  `importOrchestrationService.importValidatedPngFile`'s real per-file sequence is
  `uploadOriginalPng → designService.createDesign → importDerivativeService.runImportDerivativePipeline`
  (derivative upload, out of scope per above). A file that has already progressed past
  `uploadOriginalPng` into `createDesign`/derivative pipeline when cancel is requested is **not**
  interrupted mid-flight — it completes its normal sequence (design created, `imported`, possibly
  with derivatives) rather than being torn down partway. Cancel reliably stops: (a) a file whose
  original-PNG upload is still in flight, and (b) any file in the batch queue that has not yet
  started. This matches existing partial-success semantics and is called out explicitly so
  implementation and manual QA share the same expectation.

### 2. In-app navigation guard (leaving `/imports` mid-upload)

- Do **not** migrate `react-router-dom` from the declarative `<Routes>` router to a data router
  (`createBrowserRouter`/`RouterProvider`) just to get `useBlocker` — that touches every route,
  `AuthBootstrapGate`, `ProtectedRoute`, and all `Navigate` redirects, which is a much larger blast
  radius than this feature needs.
- Instead, intercept navigation at the **sidebar link level**: `Sidebar.tsx`'s `NavLink` entries
  gain an `onClick` handler that, when an upload is active (new shared state, see below), calls
  `event.preventDefault()` and shows a confirm dialog instead of navigating immediately. Confirming
  cancels the upload (via the new abort support) and then performs the navigation programmatically
  (`useNavigate`).
- "Upload is active" state needs to be readable from `Sidebar.tsx`, which is a shared component and
  must not depend on an Imports feature module. Add the provider at
  `src/renderer/src/shared/context/UploadActivityContext.tsx` (neutral shared location, not
  `features/imports/`), exposing `{ isUploadActive, requestCancelActiveUpload }`, mounted near
  `AuthenticatedLayout` so it's available to both `Sidebar` and the Imports route. `useBatchImport`/
  `useSinglePngImport` register into it while `phase === "uploading"`; `Sidebar.tsx` reads it to
  decide whether to intercept a click. This is new shared state, not a router-level change —
  smaller and more contained.
- Promote `AiReviewUnsavedDialog` to a shared, generically-named component
  (`shared/components/ConfirmLeaveDialog.tsx`, keeping the same `title`/`copy`/`confirmLabel`/
  `onCancel`/`onConfirm` prop shape), update the two existing AI Review call sites
  (`AiReviewPage.tsx`) to the new shared name/location, and use it for both the in-app nav confirm
  and the window-close confirm in this phase — e.g. "Leave and cancel upload?" / "An import is
  currently uploading. Leaving this page will cancel it." Avoids a cross-feature import from
  `imports` into `ai-review` and sets up the component for future reuse.
- **CSS ownership on promotion:** the component's current CSS classes
  (`ai-review-unsaved-dialog`/`-header`/`-copy`) live in an AI-Review-scoped stylesheet. When
  promoted, rename these to feature-neutral class names (e.g. `confirm-leave-dialog`/`-header`/
  `-copy`) and move the corresponding styles into a shared stylesheet — otherwise the "shared"
  component would silently depend on AI Review's CSS bundle loading first, breaking when rendered
  from the Imports feature (which does not load AI Review's stylesheet). Lock this as a Step 1
  kickoff decision.

### 3. Electron window/app close guard

- `electron/main.ts`: change `win.on('close', ...)` to a listener that can call
  `event.preventDefault()`. Add a new IPC channel (following the existing `appIpcChannels.ts` /
  `appIpcHandlers.ts` pattern) for the renderer to push "upload active" state to main
  (`ipcMain.handle` renderer→main push whenever `isUploadActive` changes, mirroring it into a
  module-level flag in main), so the `close` handler can synchronously check that flag without a
  round-trip (main can't `await` a renderer response from inside a synchronous-feeling close flow
  without extra complexity, and Electron's `close` event supports `preventDefault()` + async
  follow-up).
- The existing `saveWindowState(win)` call in the `close` handler must keep firing on every close
  attempt exactly as it does today (bounds/maximized state persisted), regardless of whether the
  close is later blocked/confirmed — window-position persistence is unrelated to the upload guard
  and must not regress. Save state first, then evaluate the upload-active guard.
- On close attempt while the flag is set: `event.preventDefault()`, then `webContents.send(...)` a
  "confirm-close" event to the renderer, which shows the same confirm dialog. If the user confirms,
  the renderer calls a new IPC method telling main to proceed, main clears the flag and calls
  `browserWindow.destroy()` (or re-triggers `close` after clearing the guard) to actually close.
  If the user cancels, nothing further happens — window stays open.
- `window-all-closed`/`before-quit` behavior for multi-step quit (macOS Cmd+Q) is out of scope for
  this phase — only the single-window `close` event is guarded, matching this app's actual
  deployment (single window, `saveWindowState` already only handles `win`, not app-level quit).

## Explicitly out of scope

- No changes to `designDerivativeStorageService.uploadDerivativeWebp` (thumbnail/preview uploads).
- No React Router data-router migration.
- No changes to macOS `before-quit`/dock-based quit flows beyond the single window `close` handler.
- No retroactive rollback of already-uploaded files in a partially-completed batch cancel — matches
  existing partial-failure behavior elsewhere in the batch import flow.
- No Firebase deploy, secrets, or data migration (this is a renderer + Electron main process
  change only).

## Files expected to change

- `src/renderer/src/features/imports/services/importUploadService.ts` — `uploadBytes` →
  `uploadBytesResumable`, expose cancel handle.
- `src/renderer/src/features/imports/services/importOrchestrationService.ts`,
  `importBatchOrchestrationService.ts` — thread cancel handle(s) through.
- `src/renderer/src/features/imports/hooks/useBatchImport.ts`,
  `useSinglePngImport.ts` — call `.cancel()` on confirmed leave instead of no-op/disabled cancel.
- New: `src/renderer/src/shared/context/UploadActivityContext.tsx` — shared "is an upload active"
  signal readable outside the Imports route tree (deliberately not under `features/imports/`, since
  `Sidebar.tsx` is a shared component and must not depend on an Imports feature module).
- `src/renderer/src/shared/components/Sidebar.tsx` — intercept nav clicks when upload active.
- `src/renderer/src/routes/AuthenticatedLayout.tsx` (or wherever is most appropriate) — mount the
  new activity provider so it's available to both `Sidebar` and the Imports route.
- `src/renderer/src/features/ai-review/components/AiReviewUnsavedDialog.tsx` → moved to
  `src/renderer/src/shared/components/ConfirmLeaveDialog.tsx`; `AiReviewPage.tsx` call sites updated
  to the new import.
- `electron/main.ts` — close handler becomes interceptable.
- New: `electron/ipc/app/` — new IPC channel(s) for renderer→main upload-active flag + confirm-close
  round trip, following the existing `appIpcChannels.ts`/`appIpcHandlers.ts` pattern.
- `electron/preload.ts` — expose the new channel(s) to the renderer.
- Tests: unit tests for the new upload-cancel plumbing (mocking `uploadBytesResumable`/`UploadTask`),
  and for the activity-context/sidebar-intercept logic.

## Decisions confirmed with user

1. `AiReviewUnsavedDialog` is promoted to a shared `ConfirmLeaveDialog` component; AI Review's
   existing call sites are updated to use it, keeping the same copy/behavior.
2. Batch cancel keeps partial success: already-uploaded files stay imported; only the in-flight and
   not-yet-started files are stopped/skipped. No rollback of already-written Firestore docs or
   Storage objects.

## Confirmed dialog wording

**In-app navigation dialog** (`ConfirmLeaveDialog` shown by the sidebar nav-intercept):
- Title: `Leave and cancel upload?`
- Body: `An import is currently uploading. Leaving this page will cancel the upload.`
- Confirm button: `Leave and cancel`
- Cancel button: `Keep uploading`

**Electron close dialog** (`ConfirmLeaveDialog` shown on window-close attempt):
- Title: `Quit and cancel upload?`
- Body: `An import is currently uploading. Quitting Fresh Prints Studio will cancel the upload.`
- Confirm button: `Quit and cancel`
- Cancel button: `Keep uploading`

"Fresh Prints Studio" is the official product name per ADR-FP-008. Note: `electron/main.ts`'s
`appName` constant is still the stale pre-rename `"Fresh Prints Desktop"` (window title/app name) —
unrelated to this plan's scope and not changed here, but flagged as a separate stale-naming cleanup
candidate for a future phase if desired.

## Verification plan

- Unit tests covering: `uploadOriginalPng` cancel path (mocked `UploadTask`), batch cancel-mid-flight
  behavior (both stopping in-flight uploads and preventing not-yet-started queued ones from
  starting), activity-context state transitions, sidebar nav-intercept logic.
- Regression check: AI Review's two existing `ConfirmLeaveDialog` (formerly `AiReviewUnsavedDialog`)
  call sites in `AiReviewPage.tsx` must render identical copy/behavior after the promotion/rename —
  no functional change to AI Review's unsaved-edit-switching or rerun-confirmation flows.
- Manual verification (human checkpoint): start a batch/single upload, click away in-app → confirm
  dialog appears → confirm cancels upload (including any queued-but-not-started files) and
  navigates; already-uploaded files/designs in that batch remain imported; repeat and click "keep
  editing" → stays on Imports page, upload continues uninterrupted. Then repeat both cases for
  closing the Electron window, and confirm window position/size is still remembered on next launch
  (window bounds save regression check).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` (incl. Electron packaging), `git diff --check`.
- No Firebase Functions deploy needed (renderer/Electron-only change).
