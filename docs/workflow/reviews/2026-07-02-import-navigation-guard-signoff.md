# Signoff — Import Navigation Guard

- **Date:** 2026-07-02 (revised after four post-implementation bug fixes from user manual testing)
- **Goal slug:** `import-navigation-guard`
- **Status:** PASS — signed off after automated verification and completed manual UI checklist
- **Plan:** `docs/workflow/plans/2026-07-02-import-navigation-guard-plan.md`
- **Plan review:** `docs/workflow/reviews/2026-07-02-import-navigation-guard-plan-review.md`
- **Test report:** `docs/workflow/reviews/2026-07-02-import-navigation-guard-test-report.md`

## Post-implementation bug fix #1

The user's first manual test (navigate away mid-upload → confirm → try to start a new batch import)
surfaced a real bug: a stale main-process batch-session error
(`"Finish or cancel the active batch import before starting another batch import."`) because the
Sidebar's confirm handler cancelled the upload and navigated away in the same tick, before the async
`finishBatchJob` cleanup had actually run. Fixed by making the cancel-handler contract
(`UploadActivityContext.requestCancelActiveUpload`/`registerCancelHandler`) async end-to-end, so
`Sidebar`'s nav-confirm and the Electron close-confirm both now wait for the real upload
cancellation and main-process session cleanup to finish before navigating/closing.

## Post-implementation bug fix #2

The user reported the *same* stale session error still occurring, in a scenario fix #1 did not
cover: selecting files for a batch import and navigating away **before ever clicking Upload**. Root
cause: `isUploadActive` was only ever set `true` during `phase === "uploading"` — during
selection/discovery/ready-to-upload, it stayed `false`, so the Sidebar guard never intercepted the
click at all and the user navigated away with zero warning, orphaning the main-process session
immediately. Fixed by driving `isUploadActive`/the registered cancel handler off the full set of
"active" phases (matching the phase set `ImportsPage.tsx` already used to define "blocking" for the
mutual-exclusion banner), registering each hook's real `cancelImport` (which already correctly
branches per phase) rather than a narrower upload-only handler, for both `useBatchImport` and
`useSinglePngImport`.

## Post-implementation bug fix #3

The user reported the in-app nav confirm dialog appeared non-interactive/invisible on the first
click, only becoming usable after leaving and returning. Root cause: `Sidebar.tsx` rendered its own
`ConfirmLeaveDialog` nested inside the sidebar's `<aside>` element, which has `overflow` +
`isolation: isolate` CSS — clipping a `position: fixed` dialog nested inside it to the sidebar's own
box instead of the viewport. Fixed by centralizing dialog ownership: added
`requestLeaveConfirmation(): Promise<boolean>` to `UploadActivityContext`; `UploadActivityProvider`
now owns and renders both confirm dialogs (leave-via-nav and quit-via-close) at the app-shell level,
outside any scroll/stacking-context container; `Sidebar.tsx` no longer renders its own dialog at
all — it just calls the context method and navigates if confirmed.

## Post-implementation bug fix #4

The dialog still only appeared after leaving and returning. Actual root cause: an inverted guard
condition in `Sidebar.handleNavLinkClick` early-returned when the user was on `/imports` — the only
place an import session can be active — so the first navigation was never intercepted, and stale
`isUploadActive` state (the hooks' upload-activity effects had no unmount cleanup) made the dialog
fire on the *next* click instead. Fixed the condition (intercept when active and the destination
differs from the current route), added unmount cleanup to both hooks, and added a
`.confirm-leave-dialog .modal-actions` flex/gap rule to `modals.css` for button spacing (the bare
`modal-actions` class previously had no CSS rule anywhere; this also improves AI Review's dialogs,
which share the component — copy/behavior unchanged).

See `.cursor/workflow/state.md`'s decision log for full technical detail on all four fixes. The
rest of this signoff reflects the state *after* all four fixes.

## What changed

- **Abortable original-PNG upload:** `importUploadService.uploadOriginalPng` switched from the
  one-shot `uploadBytes` to `uploadBytesResumable`, accepting an optional `UploadCancelToken` and
  calling `.cancel()` on the underlying `UploadTask` when the token is cancelled. New
  `features/imports/utils/uploadCancelToken.ts` (`UploadCancelToken` class, 6/6 unit tests passing)
  tracks cancellation state and any currently in-flight task(s) so a single token can span an
  entire batch.
- **Cancel threaded through orchestration:** `importOrchestrationService.importValidatedPngFile`
  and `.uploadValidatedPng` (single import), and `importBatchOrchestrationService.runBatchUpload`
  (batch import) now accept/pass an optional `cancelToken`. Batch orchestration checks
  `cancelToken.isCancelled` before starting each not-yet-dispatched file, skipping it with a
  `"Batch import was canceled before this file's upload started."` result instead of beginning its
  upload. A file already past its own `uploadOriginalPng` call when cancel is requested completes
  its normal `createDesign`/derivative-pipeline sequence rather than being interrupted mid-flight
  (explicit, documented plan decision — matches existing partial-success semantics).
- **Hook-level cancel fixed:** `useBatchImport.cancelImport` and `useSinglePngImport.cancelImport`
  now call `.cancel()` on the active `UploadCancelToken` when `phase === "uploading"` instead of
  no-op/warning (batch) or silently resetting state while the upload kept running in the background
  (single). The single-import "Cancel Upload" button's `disabled={isUploading}` gate was removed
  from `ImportsPage.tsx` since cancel now works during upload.
- **Shared upload-activity signal:** new `shared/context/uploadActivityContext.ts` +
  `UploadActivityProvider.tsx` + `shared/hooks/useUploadActivity.ts`, mounted in `AppShell.tsx`
  (wrapping both `Sidebar` and the routed page content) — deliberately placed under `shared/`, not
  `features/imports/`, since `Sidebar` is a shared component. `useBatchImport`/`useSinglePngImport`
  each run a `useEffect` on their phase that registers `isUploadActive` and their own real
  `cancelImport` function into this context for the *entire* active lifecycle (selection through
  upload — see bug fix #2), not just during the upload phase.
- **In-app navigation guard:** `Sidebar.tsx` intercepts `NavLink` clicks when `isUploadActive` is
  true and the destination isn't `/imports`, calling `preventDefault()` and
  `UploadActivityContext.requestLeaveConfirmation()`, then navigating via `useNavigate` only if the
  user confirms. The confirm dialog itself (shared `ConfirmLeaveDialog`, "Leave and cancel upload?"
  / "Leave and cancel" / "Keep uploading") is rendered once by `UploadActivityProvider` at the
  app-shell level — not by `Sidebar` — so it is never visually clipped by the sidebar's own
  scroll/stacking-context container (see bug fix #3).
- **Electron close guard:** new IPC channels (`SET_UPLOAD_ACTIVE`, `CONFIRM_CLOSE`, main→renderer
  `CONFIRM_CLOSE_REQUESTED` event) following the existing `appIpcChannels.ts`/`appIpcHandlers.ts`
  allowlist pattern. `electron/main.ts`'s `close` handler now calls `saveWindowState` first
  (unconditionally, preserving existing window-bounds-persistence behavior), then checks a
  main-process-mirrored upload-active flag (`electron/ipc/app/uploadActivityState.ts`) and, if set,
  calls `event.preventDefault()` and asks the renderer to confirm via the same
  `ConfirmLeaveDialog` ("Quit and cancel upload?" / "Quit and cancel" / "Keep uploading", rendered
  by `UploadActivityProvider`). Confirming calls a new `confirmClose` IPC method that closes the
  window from the main process.
- **Dialog promoted:** `AiReviewUnsavedDialog.tsx` deleted; replaced by
  `shared/components/ConfirmLeaveDialog.tsx` (same prop shape, plus a new optional `cancelLabel`
  prop defaulting to "Keep editing" so AI Review's existing copy/behavior is unchanged). Its CSS
  classes were renamed from `ai-review-unsaved-dialog*` to `confirm-leave-dialog*` and moved from
  `ai-review.css` into the shared `modals.css`. `AiReviewPage.tsx`'s two call sites updated to the
  new import.

## Verification

- 6/6 `UploadCancelToken` unit tests passed (re-verified after all four fixes).
- `npx tsc --noEmit` (root, covers `electron/` via the root tsconfig) passed (re-verified after all four fixes).
- `npm run lint` (root) passed (re-verified after all four fixes).
- `npm run build` (root — Vite renderer build, Electron main/preload build, and full
  `electron-builder` NSIS packaging) passed (re-verified after all four fixes).
- `git diff --check` passed (only pre-existing benign LF/CRLF warnings) (re-verified after all four fixes).
- 152/152 `functions/src/ai` unit tests passed (unrelated regression check, run once before the
  fixes — not re-run after, since all four fixes touched only renderer/Electron files).
- User completed the manual UI checklist on 2026-07-02 and confirmed all looks well: in-app nav
  guard for batch/single import, Electron close guard, stale-session regression checks,
  window-bounds-save regression, and AI Review dialog parity.

## Scope boundaries (confirmed intact)

No abort support added for `designDerivativeStorageService.uploadDerivativeWebp` (thumbnail/preview
uploads — explicitly out of scope). No React Router data-router migration. No rollback of
already-uploaded files/designs on batch cancel (partial success preserved). No Firebase deploy,
secrets, data migration, or new dependencies. AI Review's existing unsaved-dialog behavior
unchanged after the `ConfirmLeaveDialog` promotion (same default copy/labels, only the location and
component name changed, plus the new `cancelLabel` prop is additive and defaults to the original
"Keep editing" text).

## Manual verification

Completed by user on 2026-07-02. The checklist covered:

1. In-app nav guard during batch and single import active phases.
2. Pre-upload selection/discovery leave-confirmation flows.
3. Mid-upload cancel-confirmation flows and fresh-import stale-session regressions.
4. "Keep uploading" stay-on-page behavior.
5. Electron window-close guard during active upload and pre-upload phases.
6. Window-bounds-save regression.
7. AI Review dialog parity after the `ConfirmLeaveDialog` promotion.

## Next recommended step

Commit and push the signed-off changes. Firebase Functions deploy is not required for this phase
(renderer + Electron main process change only) — no production deploy step applies here. The
previously-recommended `print-request-query-index-hardening` task remains next in the roadmap unless
the user selects otherwise.
