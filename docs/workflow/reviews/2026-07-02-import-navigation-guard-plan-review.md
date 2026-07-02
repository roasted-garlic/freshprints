# Import Navigation Guard — Plan Review

## Document status

| Field | Value |
| --- | --- |
| **Reviewed artifact** | `docs/workflow/plans/2026-07-02-import-navigation-guard-plan.md` |
| **Review type** | Architecture, security, scope, and risk review (pre-implementation) |
| **Review date** | 2026-07-02 |
| **Reviewer** | AI-assisted FreshForge review |
| **Implementation status** | Not started — review only |

**Reference documents/code reviewed:**

- `docs/workflow/plans/2026-07-02-import-navigation-guard-plan.md`
- `docs/project/DECISIONS.md` (ADR-FP-008 — Fresh Prints Studio naming)
- `src/renderer/src/features/imports/hooks/useBatchImport.ts`
- `src/renderer/src/features/imports/services/importUploadService.ts`
- `src/renderer/src/features/imports/services/importOrchestrationService.ts`
- `src/renderer/src/features/imports/services/importBatchOrchestrationService.ts`
- `src/renderer/src/features/imports/utils/runWithConcurrency.ts`
- `src/renderer/src/routes/AppRoutes.tsx`
- `src/renderer/src/shared/components/Sidebar.tsx`
- `src/renderer/src/features/ai-review/components/AiReviewUnsavedDialog.tsx`
- `electron/main.ts`, `electron/preload.ts`, `electron/ipc/app/appIpcChannels.ts`,
  `electron/ipc/app/appIpcHandlers.ts`

---

## 1. Overview

The plan adds a guard against silently abandoning an active PNG import upload: makes the primary
original-PNG upload abortable (`uploadBytes` → `uploadBytesResumable`), intercepts in-app
navigation away from `/imports` at the sidebar level, and intercepts Electron window close via a
new IPC round-trip — both surfaces confirming via a shared dialog before cancelling.

**Overall assessment:** The plan correctly scopes a real, narrow safety gap and makes sound
architectural choices (no router migration, shared context in a neutral location, reuse of an
existing dialog pattern). One clarification is needed on how per-file cancellation interacts with
the existing derivative pipeline sequencing, and a few smaller gaps should be resolved before
implementation.

**Recommendation:** **Approved with modifications.** None block the overall approach.

---

## 2. Scope Review

### 2.1 Scope correctness — Pass

The plan targets exactly the reported gap (no cancel/confirm before leaving mid-upload) without
pulling in unrelated work. It correctly declines to migrate React Router to a data router just to
get `useBlocker` — verified against `AppRoutes.tsx`: the route tree uses plain `<Routes>`/`<Route>`
wrapped in `AuthBootstrapGate`/`ProtectedRoute`, and a data-router migration would touch every
route. The sidebar-click-intercept approach is a proportionate alternative.

### 2.2 Scope creep — None material

No AI pipeline changes, no derivative-upload abort support (explicitly excluded), no macOS
`before-quit`/dock quit handling, no Firestore/Storage rollback of already-imported files. All
consistent with a narrow reliability fix.

### 2.3 Gap — per-file cancel timing vs. derivative pipeline sequencing

**Finding:** `importOrchestrationService.importValidatedPngFile` (the function each batch file
actually runs through) is not just "upload the PNG" — its real sequence per file is:

```txt
uploadOriginalPng (abortable per this plan)
  → designService.createDesign (Firestore write)
  → importDerivativeService.runImportDerivativePipeline (thumbnail/preview upload — NOT abortable per this plan)
```

The plan's cancel handle only wraps `uploadOriginalPng`. That is the right call — derivative
uploads are explicitly and correctly out of scope — but the plan should say explicitly what happens
when a cancel is requested for the file that is **currently** past `uploadOriginalPng` and into
`createDesign`/derivative pipeline: that file cannot be interrupted and will run to its normal
success/failure conclusion (consistent with "partial success preserved"), and only cancels cleanly
the *original PNG upload step itself* plus any *not-yet-started* files in the batch queue. As
written, "stop whichever files are actively uploading via `.cancel()`" could be misread to mean the
whole per-file pipeline is interruptible, which it will not be for a file already past the original
upload step.

**Recommended addition:** Add one sentence to Scope §1 clarifying that cancel only interrupts a
file's `uploadOriginalPng` call; a file that has already advanced to `createDesign`/derivative
pipeline when cancel is requested will complete normally (design created, `imported`, possibly with
derivatives) rather than being interrupted mid-pipeline.

### 2.4 Scope verdict

**Properly scoped**, with one clarifying sentence recommended (non-blocking).

---

## 3. Architecture Review

### 3.1 Shared context placement — Pass

Verified `Sidebar.tsx` is a genuinely shared component (used by `AuthenticatedLayout`, not
Imports-specific) and does not currently import anything from `features/imports/`. Placing the new
`UploadActivityContext` at `shared/context/` rather than `features/imports/context/` is correct
per this codebase's feature-based organization and matches the user's explicit correction. No
existing `shared/context/` directory exists yet — confirmed this will be a new directory, which is
fine (mirrors `shared/components/`, `shared/utils/` conventions already present).

### 3.2 Dialog promotion — Pass with one open verification item

`AiReviewUnsavedDialog.tsx` is a small, prop-driven component (`title`/`copy`/`confirmLabel`/
`onCancel`/`onConfirm`) with no AI-Review-specific logic inside it — safe to promote verbatim.
Confirmed its two current call sites are both in `AiReviewPage.tsx`. The plan's verification
section already requires a regression check that AI Review's copy/behavior stays identical after
the rename — appropriate, since the component is being relocated and renamed, and any accidental
default-prop change would silently alter AI Review's existing "Discard unsaved edits?" dialog.

**Note for implementation:** the component's CSS class names (`ai-review-unsaved-dialog`,
`ai-review-unsaved-dialog-header`, `ai-review-unsaved-dialog-copy`) are AI-Review-scoped. When
promoted to `shared/components/ConfirmLeaveDialog.tsx`, these class names should be renamed to
something feature-neutral (e.g. `confirm-leave-dialog`) and the corresponding CSS moved out of
whatever AI-Review-scoped stylesheet currently defines them into a shared stylesheet — otherwise
the "shared" component silently depends on AI Review's CSS bundle loading first, which is a latent
ordering bug the plan doesn't currently mention. This is implementation detail, not a plan-blocking
issue, but should be called out in Step 1 kickoff.

### 3.3 Electron close-guard round-trip — Pass with sequencing note

The plan's design (renderer pushes `isUploadActive` to main via `ipcMain.handle`, main mirrors it
into a module-level flag, `close` handler checks the flag synchronously) is sound and avoids the
complexity of an async round-trip inside the `close` event itself. Confirmed against
`electron/main.ts:178` (`win.on('close', () => saveWindowState(...))`) that today's handler is
synchronous and side-effect-only — changing it to conditionally call `event.preventDefault()` is a
minimal, well-contained change.

**Confirmed correct:** the plan explicitly requires `saveWindowState` to keep firing before the
upload-active check runs, preserving today's window-bounds-persistence behavior regardless of
whether the close is later blocked. This addresses the most likely regression risk in touching this
handler.

### 3.4 Batch concurrency cancel signal — Pass

`runWithConcurrency` (referenced, not modified in this plan beyond adding a cancel check) processes
`includedValidatedEntries` — confirmed in `importBatchOrchestrationService.ts:179-232` that this is
already a discrete task list independent of any AbortController; wiring a "should I still start the
next task" check into the concurrency runner before each task begins is a clean, additive change
that doesn't require restructuring the orchestration loop.

### 3.5 Architecture verdict

**Pass**, with one non-blocking CSS-ownership note for Step 1 kickoff.

---

## 4. Security / Data-Integrity Review

### 4.1 IPC channel additions — Pass

Following the existing `appIpcChannels.ts`/`appIpcHandlers.ts` allowlist pattern (verified: channel
constants + `isAllowedAppIpcChannel` guard, `ipcMain.handle` registration) is the correct, minimal
approach — no new class of IPC surface is introduced beyond what the app already does for
`OPEN_DEV_TOOLS`.

### 4.2 No new trust boundary — Pass

The new channels carry only a boolean-ish "upload active" signal and a "confirm close" trigger — no
file paths, bytes, or credentials cross the boundary. No new attack surface of consequence.

### 4.3 Partial-success data integrity — Pass

Confirmed against `importBatchOrchestrationService.ts` that partial success (some designs imported,
others skipped/failed) is already normal, expected behavior in this codebase (`buildBatchSummary`
explicitly tracks `successfulImports`/`failedImports`/`skippedFiles` as first-class outcomes). The
plan's decision to preserve already-uploaded designs on cancel is consistent with existing
semantics, not a new risk.

### 4.4 Security verdict

**Pass** — no material security concerns.

---

## 5. Risk Assessment

### Medium

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Cancel-timing ambiguity (§2.3) | Staff may expect "cancel" to stop a file that has already progressed past original upload into derivative processing; it won't, and the dialog copy doesn't say so | Add the one-sentence clarification in §2.3; consider whether dialog body copy needs a phrase like "files already uploading may finish" — recommend keeping approved wording as-is unless user wants to revisit, since this is a rare edge case (cancel usually lands during a queued or not-yet-dispatched file, not mid-per-file-pipeline) |
| CSS ownership on dialog promotion (§3.2) | If class names/styles aren't moved to a shared stylesheet, `ConfirmLeaveDialog` could render unstyled when used from the Imports feature (which doesn't load AI Review's CSS) | Call out explicitly in Step 1 kickoff decisions |

### Low

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `electron/main.ts` stale `appName` ("Fresh Prints Desktop" vs. official "Fresh Prints Studio") | Cosmetic only; already flagged in the plan as out-of-scope | No action required this phase |
| New `shared/context/` directory has no prior precedent in this repo | None — first use of the pattern is fine, just noting for future consistency | No action required |

---

## 6. Required Modifications

### Modification 1 — Clarify per-file cancel timing (recommended, non-blocking)

Add one sentence to Scope §1 stating that cancel only interrupts a file's `uploadOriginalPng` call;
a file already past that step when cancel is requested completes its normal
`createDesign`/derivative pipeline sequence rather than being interrupted mid-flight. This matches
existing partial-success semantics and just needs to be stated explicitly so implementation and
manual QA share the same expectation.

### Modification 2 — CSS ownership on dialog promotion (recommended, non-blocking)

When promoting `AiReviewUnsavedDialog` to `shared/components/ConfirmLeaveDialog.tsx`, move its
associated CSS classes out of any AI-Review-scoped stylesheet into a shared stylesheet, and rename
the classes to be feature-neutral. Call this out explicitly as a Step 1 kickoff decision so it isn't
missed during implementation.

---

## 7. Recommendation

### Approved with modifications

The plan is well-scoped, respects the codebase's feature-based architecture (correct shared-context
placement per the user's explicit correction), avoids an unnecessary router migration, and reuses
existing patterns (dialog component, IPC channel allowlist) rather than inventing new ones. Both
modifications above are minor clarifications, not architectural changes — **implementation may
proceed** once they are incorporated into the plan document (or recorded as Step 1 kickoff
decisions).

**Do not begin implementation until this review is acknowledged and the two modifications are
addressed.**

---

*Review complete. No application files were modified. No code was written.*
