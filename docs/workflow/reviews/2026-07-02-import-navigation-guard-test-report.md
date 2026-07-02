# Test Report — Import Navigation Guard

- **Date:** 2026-07-02 (updated after four post-implementation bug fixes — see notes below)
- **Goal slug:** `import-navigation-guard`
- **Plan:** `docs/workflow/plans/2026-07-02-import-navigation-guard-plan.md`
- **Plan review:** `docs/workflow/reviews/2026-07-02-import-navigation-guard-plan-review.md`

## Post-implementation bug fix #1

User manual testing found that navigating away mid-upload via the Sidebar confirm dialog left the
main-process batch import session active, causing a stale "Finish or cancel the active batch import
before starting another batch import" error on the next batch attempt. Root cause: the confirm
handler cancelled the upload and navigated away in the same tick, without waiting for the async
cancel-and-cleanup (`finishBatchJob`) to actually finish before the component unmounted. Fixed by
making the cancel-handler contract async end-to-end (`UploadActivityContext`, `Sidebar`'s
`confirmPendingNav`, `UploadActivityProvider`'s `confirmPendingClose`) so navigation/window-close
only proceeds after the real `finishBatchJob`/`releaseSinglePngImportSession` cleanup has completed.

## Post-implementation bug fix #2

The same error still occurred in a scenario fix #1 did not cover: selecting files for a batch (or
single) import and navigating away **before ever clicking Upload**. Root cause: `isUploadActive`
was only ever set `true` during `phase === "uploading"`, so the Sidebar guard never intercepted the
click at all during selection/discovery/ready-to-upload — the user navigated away with zero warning
and the main-process session was orphaned immediately. Fixed by driving `isUploadActive` and the
registered cancel handler off the full set of "active" phases (matching the phase set
`ImportsPage.tsx` already used to define "blocking"), and registering each hook's real `cancelImport`
function (which already correctly branches per phase) instead of a narrower upload-only handler.

## Post-implementation bug fix #3

User reported the in-app nav confirm dialog appeared non-interactive/invisible on the first click,
only becoming visible/usable after navigating away and back. Root cause: `Sidebar.tsx` rendered its
own `ConfirmLeaveDialog` instance nested inside the `<aside className="sidebar">` element, which has
`overflow` + `isolation: isolate` CSS — this clips/contains a `position: fixed` dialog nested inside
it to the sidebar's own box instead of the viewport, rather than letting it render as a true
full-screen overlay. Fixed by centralizing dialog ownership in `UploadActivityProvider` (added
`requestLeaveConfirmation(): Promise<boolean>` to the context) so there is a single dialog instance
rendered at the app-shell level, outside any scroll/stacking-context container; `Sidebar.tsx` no
longer renders its own dialog at all, just calls the context method and navigates if confirmed.

## Post-implementation bug fix #4

The dialog still only appeared after leaving and returning. The actual root cause was an inverted
guard condition in `Sidebar.handleNavLinkClick`: it early-returned when `location.pathname ===
"/imports"` — the only place an import session can be active — so the first navigation was never
intercepted, and the dialog only fired on the *next* click because the hooks' upload-activity
effects lacked unmount cleanup, leaving `isUploadActive` stale-`true` after `ImportsPage`
unmounted. Fixed the condition (intercept when active and the destination differs from the current
route), added unmount cleanup to both hooks' effects, and added a `.confirm-leave-dialog
.modal-actions` flex/gap rule in `modals.css` — the bare `modal-actions` class had no CSS rule
anywhere, so the dialog buttons rendered with no spacing (this also improves AI Review's dialogs,
which share the component; copy/behavior unchanged).

See the `.cursor/workflow/state.md` decision log for full technical detail on all four fixes. All
checks below were re-run after fix #4.

## Automated checks

| Check | Result |
|---|---|
| `UploadCancelToken` unit tests (new) | 6/6 passed |
| `npx tsc --noEmit` (root, includes `electron/`) | passed |
| `npm run lint` (root) | passed |
| `npm run build` (root, incl. Vite renderer, Electron main/preload, and `electron-builder` packaging) | passed |
| `git diff --check` | passed (only pre-existing benign LF/CRLF warnings) |

(`functions/src/ai` regression check — 152/152 passed — was run once before the bug fix; not
re-run after, since the fix touched only renderer/Electron files unrelated to that suite.)

## Test coverage scope decision

This repo has no existing React component/hook tests and no React Testing Library or jsdom
dependency — every existing test is a plain `node:test` unit test against pure functions. Per user
decision, automated coverage in this phase is scoped to the genuinely pure, unit-testable logic
(`UploadCancelToken`), matching the existing convention. The React-layer wiring (`useBatchImport`'s
cancel plumbing, `useSinglePngImport`'s cancel plumbing, `Sidebar`'s nav-intercept,
`UploadActivityProvider`'s Electron IPC bridging) is covered by the manual verification steps below
instead of new automated tests, which was already the plan's intended verification path for this
layer and does not introduce new test tooling.

## Manual verification (human checkpoint — completed)

User completed the running-app checklist on 2026-07-02 and confirmed all looks well:

1. **Regression-critical (fix #3 scenario, the user's exact report):** in-app nav confirm dialog is
   immediately visible and interactive on the first click — not only after navigating away and back.
2. **Regression-critical (fix #2 scenario, the user's exact report):** batch import selected but not
   uploaded still triggers the confirm dialog before leaving, and a new batch import starts cleanly
   afterward with no stale active-session error.
3. Single PNG selected/validated but not uploaded behaves the same way, including clean fresh-start
   behavior afterward.
4. Active batch upload triggers the in-app nav guard, confirm/cancel behave correctly, and partial
   success is preserved.
5. **Regression-critical (fix #1 scenario):** a new batch import starts cleanly after confirming
   cancel mid-upload, with no stale active-session error.
6. "Keep uploading" keeps the user on Imports and leaves the selection/upload uninterrupted.
7. Electron window-close guard works during active upload and pre-upload selection/discovery, with
   clean relaunch and fresh import behavior afterward.
8. Window position/size remains remembered after close attempts.
9. AI Review's design-switch and rerun-to-processing confirmation dialogs still render with the
   expected copy/behavior after the shared `ConfirmLeaveDialog` promotion.

## Scope confirmation

Matches the approved, reviewed plan: abortable original-PNG upload only (no thumbnail/preview
derivative abort support), no React Router data-router migration, batch cancel stops in-flight
uploads and prevents not-yet-started queued uploads from starting, partial success preserved
(already-completed uploads/design records stay imported), existing window-bounds-save behavior
preserved, shared `ConfirmLeaveDialog` reused for both guard surfaces, AI Review's existing
unsaved-dialog behavior unchanged after promotion. No Firebase deploy, secrets, data migration, or
new dependencies.
