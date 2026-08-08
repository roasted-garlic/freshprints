# Amendment Plan: Owner QA Amendment 1 (PR #40)

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Branch | `fix/post-launch-catalog-and-processing-stability` (existing, PR #40 — no new branch/PR) |
| Priority | **Urgent** — Workstream 1 is the highest-priority defect in this amendment |
| Method | Three parallel read-only source investigations (one per workstream) plus direct inspection of live `fresh-prints-dev` Function logs for the ready-boundary publisher defect |

---

## 1. Owner-confirmed reproduction (accepted as fact, not re-litigated)

Per the governing instruction, the following is treated as confirmed and is not re-proven in this
Plan: designs were imported, AI-processed, manually approved in Needs Review, and reached
`status: "ready"` — and never appeared in Studio Design Library, across repeated attempts, waiting,
refresh, navigation, and full Studio restart.

---

## 2. Root cause — Workstream 1: ready designs missing from Studio Design Library

### 2a. Confirmed reason (Studio-side)

`DesignLibraryPage.tsx:212` sets `usingGeneratedCatalog = !includeArchived` — Studio's **normal**
(non-archived) Design Library browse is gated entirely off this flag. When `true`,
`getDesignLibraryFirestoreLoadPolicy` (`designLibraryFirestoreLoadPolicy.ts:8-18`) returns
`loadReadyDesignPage: false`, which disables `useDesigns` (the bounded, cursor-paginated, already
cache-correct Firestore hook) for the primary design list entirely. The **only** way Firestore data
ever reaches the normal browse view is `useGeneratedReadyDesigns`'s own internal
`usedFirestoreFallback`, which only activates when the generated asset **fetch itself throws**
(`useGeneratedReadyDesigns.ts:98-144`, `loadGeneratedReadyDesignsWithVerifiedFallback`).

**A successfully-fetched but stale generated snapshot never triggers fallback.** This precisely
matches the owner's reproduction: the generated `studio/ready-index.json` asset fetch succeeds (no
error, no fallback activation) but simply does not yet contain the newly-approved design IDs,
because — see §2c below — the publication that would have added them to that asset never actually
completed. The design is invisible not because of a bug in the fetch/parse/render path, but because
the **entire visibility decision is delegated to one asset that had no reason to ever update**.

### 2b. Confirmed: was the generated snapshot loading successfully but stale?

**Yes.** Live inspection of `fresh-prints-dev` Function logs (`firebase functions:log --project
fresh-prints-dev`, 500-line window spanning this session) shows **zero errors of any kind** from
`onPortalCatalogSnapshotSourceWritten`, `rebuildCatalogSnapshots`, or any related function. If the
generated fetch itself were failing, Studio's own fallback path would have activated and the owner
would have seen bounded Firestore results (possibly stale in a different, self-correcting way, but
not indefinitely empty). The absence of any generated-fetch error, combined with the confirmed
publisher stall (§2c), means the fetch succeeds and returns a manifest/index that is real, valid, and
simply outdated.

### 2c. Ready-boundary publisher root cause (Portal-facing defect, independently confirmed)

Live log inspection of `fresh-prints-dev` reveals a serious, previously-undetected defect in the
persistent debounce-coalescing claim shipped in the prior pass (commit `eeec2e2`):

- `LEASE_MS = 10 * 60_000` (10 minutes) and `DEBOUNCE_MS = 15_000` (15 seconds)
  (`publishCatalogSnapshots.ts:55,59`).
- The prior Implementation Review correction set the debounce claim's expiry to
  `DEBOUNCE_MS + LEASE_MS` — **15 seconds plus 10 minutes, i.e. just over 10 minutes total**
  (`publishCatalogSnapshots.ts:857-861`).
- **None of the three `onDocumentWritten` triggers** (`onCategorySnapshotSourceWritten`,
  `onTagSnapshotSourceWritten`, `onPortalCatalogSnapshotSourceWritten`) sets an explicit
  `timeoutSeconds`. Cloud Functions v2 Firestore triggers default to a **60-second** timeout — this
  was independently confirmed against this exact project's own deploy metadata during the prior
  pass (`rebuildCatalogSnapshots`'s deploy log literally recorded `"timeoutSeconds":60"`).
- The waiter invocation's own logic is: sleep `DEBOUNCE_MS` (15s), then call
  `runPublicationCatchUpLoop` → `publishKind` → a **full unbounded collection scan** of `designs`
  (all `ready`) + `categories` + `tags`, followed by potentially dozens of Storage writes (per-tag,
  per-category, per-search-shard, per-card-bucket, per-recent-page, per-category-page assets, per
  `publishPortal`'s own fan-out — `publishCatalogSnapshots.ts:554-640`). This easily can, and on the
  real dev-scale catalog (~1,122 tags per the Wave C Plan's own measurement) plausibly does, exceed
  the remaining ~45 seconds left in the 60-second function timeout.
- **When the function is killed by its own timeout, the `finally { await
  releaseDebounceClaimIfOwned(...) }` block never runs** — Cloud Functions terminates the container
  on timeout; Node.js `finally` blocks do not get a grace period to complete pending async work
  after a hard kill. The debounce claim is left active, pointing at a dead invocation, for up to its
  full ~10-minute expiry.
- **Direct log evidence:** in a 500-line, ~2-minute window of real `fresh-prints-dev` traffic
  (2026-08-04T21:09:47Z–21:11:57Z), **18 scheduling events all show
  `"outcome":"joined-existing-debounce-window"` and zero show
  `"outcome":"claimed-debounce-waiter"`** anywhere in the same window, and **zero
  `catalog-snapshot-publication` events** (the log emitted only on an actual publish attempt,
  success or failure) appear at all. Every incoming design write during this window found an
  already-active claim and deferred to it — but no invocation in view ever actually became that
  waiter or logged a publish attempt, consistent with the claim having been left by an earlier,
  now-dead invocation whose timeout silently swallowed the release.

This is the confirmed root cause of "Portal still requires publication [and] the confirmed ready
transitions did not produce usable updated generated assets": **once the claim gets stuck (via a
single timed-out waiter), every subsequent design write across the whole catalog — including every
one of the owner's approvals — silently joins the dead claim and never triggers a real publish,
for up to ~10 minutes at a time, and if writes keep arriving inside that window, the claim can be
perpetually renewed by nothing (the stuck claim's own expiry is fixed at its original claim time,
not extended by new joiners — so it does eventually expire and a fresh waiter can claim again), but
a sufficiently active session (like an import+approval batch) can repeatedly relaunch the same
failure mode if each fresh waiter also times out under the same collection-scan cost.**

This is a genuine regression introduced by the Implementation Review's own "fix" in the prior pass —
extending the claim duration to `DEBOUNCE_MS + LEASE_MS` without also verifying the function's
timeout could actually accommodate a full sleep+publish cycle was the missing check. The original,
narrower `DEBOUNCE_MS`-only claim (before that correction) would have expired quickly on a timeout
and let a new invocation retry sooner — trading tighter coalescing for faster self-healing. The
correction traded that away without compensating.

**Not a classifier defect, not a stale-deploy defef, not an event-shape mismatch:** independently
re-confirmed via `firebase functions:list --project fresh-prints-dev` that all three trigger
functions and `rebuildCatalogSnapshots` are on the current deployed revision (matching the commit
`eeec2e2` source), and via the classifier's own already-passing unit tests
(`portalCatalogChangeClassifier.test.ts`) that a `ready`-boundary crossing correctly classifies as
`index-filter`. The defect is specifically in the *coalescing claim's failure-recovery story*, not in
whether a rebuild gets scheduled in the first place.

### 2d. Architecture correction required

Two independent fixes, both required:

1. **Studio primary source correction (owner-mandated architecture change).** Make the existing,
   proven, bounded `useDesigns` (`designService.listDesignsPage`, already `createdAt desc`,
   already cursor-paginated, already 15-second-TTL cached with confirmed invalidation on approval —
   see §2e) the **authoritative primary source** for Studio's normal ready-design browse, replacing
   `useGeneratedReadyDesigns` as the gate. The generated ready-index becomes a secondary,
   best-effort optimization layered on top (see Selected Architecture, §5), not the sole authority.
2. **Ready-boundary publisher self-healing correction (Portal-facing, still required since Portal
   has no equivalent Firestore fallback).** Shrink the debounce claim's effective liability window so
   a killed waiter cannot strand the claim for anywhere near 10 minutes, and/or raise the trigger
   functions' `timeoutSeconds` to a value that comfortably exceeds the real sleep+publish duration so
   a hard kill becomes rare rather than a routine occurrence on any catalog of real size. Both changes
   are made together (see §6) since either alone is a partial mitigation.

### 2e. Confirmed: existing Firestore cache is already approval-correct

`catalogApprovalService.approveDesignForCatalog` → `designService.applyCatalogApprovalUpdate`
already calls `invalidateDesignReadCaches(designId)` on successful write
(`designService.ts:1132`), which clears the 15-second-TTL `designPageCache` and `designCountCache`
(`designService.ts:58-71,122-129`). This means the moment `useDesigns` is wired in as primary, a
newly-approved design is visible on the very next `listDesignsPage` call with **no additional cache
work required** — the existing invalidation was already correct and unused for this surface.

### 2f. Confirmed: this does not reintroduce the original Wave C read-cost problem

Per `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md`'s own Studio
generated-catalog amendment section (lines ~906-1045, read in full for this Plan): the *design list*
read itself was **never** the cost problem Wave C's Studio amendment targeted — the amendment's own
verified read inventory states the pre-amendment design-page read was "≤101 docs" per cold entry,
already bounded, already cached. What the generated-catalog switch actually removed was the
**taxonomy** reads (~1,122 tags + ≤200 categories on every cold entry) — which this Amendment does
**not** touch; `useGeneratedDesignLibraryTaxonomy` remains the taxonomy source for normal browse,
completely unchanged, per explicit scope. Reverting only the design-list source back to bounded
Firestore reads exactly what Wave C's own analysis already established was inexpensive, while
preserving 100% of Wave C's actual cost win (the taxonomy reads).

---

## 3. Root cause — Workstream 2: AI Processing stale controller state

### 3a. Confirmed: two independent, compounding bugs

**Bug 1 — Processing/Needs-Review count never reconciles after a manual single-image "Process"
run.** `useAiProcessingQueue.ts`'s options interface (`:39-49`) has no `onQueueChanged`-equivalent
callback at all. `processSelectedDesign` (`:404-461`) and `runAutoQueueLoop` (`:264-361`) both call
only `reloadDesigns()` (the design-list refetch) via `refreshDesignList()` — never anything that
reaches `useAiReviewTabCounts.reloadCounts()`. Contrast with `useAiReviewInbox.ts`'s own four inbox
actions (`runInboxAction:656`, `executeRerunToProcessing:521`,
`runRejectedTabNavigationAction:688`, `retryProcessingSelected:777`), which all correctly call
`options?.onQueueChanged?.()`. The manual "Process image with AI" button
(`AiReviewPage.tsx:203`) calls `inbox.processingQueue.processSelectedDesign()` directly — a code
path that was never wired to the count-reload callback in the first place, in this pass or the prior
one. This is the root cause of "Processing count remains stale" for the manual single-image flow —
it is not a race or a stale read, it is a genuinely missing wire.

**Bug 2 — "Start AI" stays disabled after successful completion when the completed design was the
last one awaiting in the Processing tab.** `canProcessSelected`
(`useAiProcessingQueue.ts:126-132`) requires a truthy `selectedDesign`, independently derived at
`useAiProcessingQueue.ts:121-124` as `designs.find((d) => d.id === selectedDesignId)`. After a
successful completion, `applyDesignPatch` sets `aiReviewStatus: "needs_review"`
(`enqueueResultPatch.ts:51-53`), which immediately drops the design from `useAiReviewInbox`'s
tab-filtered `designs` array (`aiReviewInboxEligibility.ts:6-14` requires
`aiReviewStatus === "pending"` for the `processing` tab). `processSelectedDesign`'s
post-completion advance logic (`:425-432`) only calls `advanceSelectionToIndex` when
`resolveAdvanceIndexAfterProcessing` returns a **non-negative** index. When the completed design was
the only/last one awaiting, that function correctly returns `-1`
(`aiProcessingQueueSelection.ts:16-23`), no reselection happens, and `selectedDesignId` is left
pointing at a design ID that no longer exists in the (now-filtered) `designs` array —
`useAiProcessingQueue`'s own `selectedDesign` collapses to `null`, and `canProcessSelected` becomes
permanently `false` until something re-populates `selectedDesignId` with a valid ID. Route
navigation fixes it because it fully remounts `useAiReviewInbox`, which re-runs its default-selection
effect (`applySelection(designs[0] ?? null)`); nothing in the live-running hook instance performs
this same reselection when `selectedDesign` collapses to `null` mid-session outside of a tab change.

**`runAutoQueueLoop` has the identical Bug 2 shape** at its natural loop-exit
(`useAiProcessingQueue.ts:283-296` `break` when `findNextAwaitingIndex` returns `-1`) — no
reselection occurs there either.

### 3b. Why the prior pass's fix (commit `eeec2e2`) was insufficient

The prior fix corrected `executeRerunToProcessing` (the "send back to Processing from Needs
Review/Rejected" rerun flow) to call `reloadDesigns()` before navigation and to treat
`reason: "already_terminal"` as a benign no-op instead of a hard error. **Neither `processSelectedDesign`
nor `runAutoQueueLoop` — the actual manual "Process image with AI" and auto-advance-queue code
paths — were touched by that fix.** The owner's confirmed reproduction (reprocess → completes →
Needs Review → stale count → Start AI disabled → fixed only by navigation) is the manual/auto-queue
flow, not the rerun-from-inbox flow the prior fix addressed. This is confirmed directly by the
existing regression test `aiProcessingReconciliation.test.ts`, which only asserts ordering inside
`executeRerunToProcessing` and never touches `useAiProcessingQueue.ts` at all.

---

## 4. Root cause — Workstream 3: large Studio import picker-provenance failure

### 4a. Confirmed exact error location

The literal string `"Use a PNG file only after selecting it with the file picker."` is thrown from
three call sites, all gated by the identical check `!isRegisteredImportFilePath(...)`:
`validateReadPngFileBytesRequest.ts:61` (string-payload branch), `validateReadPngFileBytesRequest.ts:87`
(object-payload branch), and `importIpcHandlers.ts:52` (`validateFilePathInput`, used by
`VALIDATE_SELECTED_PNG`/`GET_SELECTED_PNG_PREVIEW`). Given the owner's reported failure point
(after validation/trim/normalization already succeeded and displayed), the firing site is
`validateReadPngFileBytesRequest.ts:84-89`, reached at upload time via the `READ_SELECTED_PNG_BYTES`
IPC channel.

### 4b. Confirmed mechanism: a single global, non-session-scoped provenance slot

`importFileSession.ts` tracks picker-approved paths in two **module-level, process-global,
unscoped `Set<string>`** — `allowedValidationPaths` and `validatedImportPaths`. Critically,
`registerImportFilePath` (called once per successful picker selection,
`selectSinglePngFile.ts:32`) **unconditionally calls `clearImportFileSession()` first** — every
new registration wipes any prior registration and validation state, with no session ID, generation
counter, per-window scoping, or TTL involved anywhere. `isRegisteredImportFilePath` /
`isValidatedImportFilePath` check bare Set membership only.

### 4c. Confirmed: not a time-based expiry, not a multi-window race

Direct source inspection (not assumption) confirmed: no `setTimeout`/TTL/expiry logic exists
anywhere in `apps/studio/electron/ipc/import/*` or the renderer import feature; no second caller of
`registerImportFilePath`/`SELECT_SINGLE_PNG` exists in current committed code (single button, single
window, guarded by `isBusy` for the entire select→validate→upload lifecycle); `path.normalize` is
applied consistently at every register/check site, ruling out a path-format mismatch.

### 4d. Confirmed structural vulnerability that scales with file size/processing time

`readSelectedPngFileBytes.ts:13` (the upload-time byte-read handler) calls `await
validatePngFile(filePath)` a **second, fully redundant time** — a full re-stat, re-read of the
entire file, and (when the `consumeCorrectedImportBytes` cache misses) a second `sharp` trim pass —
on top of the identical validation already performed during `VALIDATE_SELECTED_PNG`. For a small PNG
this doubling is imperceptible (milliseconds); for a 159 MB / 10800×10800 image, this doubles one of
the single most expensive operations in the entire import pipeline, materially extending the window
during which the single global provenance slot remains vulnerable to being silently wiped by any
intervening event. No second picker call was found as a live, currently-reachable trigger in the
committed renderer code, but the underlying design — one global slot with no generation/session
identity, unconditionally cleared on every new registration — is a genuine, confirmed structural
defect regardless of the exact triggering sequence, and one that becomes far easier to hit the
longer any single import's validate-to-upload window stretches, which scales directly with file
size. This matches the specific, reproducible owner evidence (a 159 MB file failing where ordinary
imports do not) far better than any alternative (time-based expiry, which does not exist in the code
at all).

---

## 5. Selected architecture — Workstream 1 Studio hybrid

**Primary source: bounded Firestore (`useDesigns` / `designService.listDesignsPage`).**
- `status == "ready"`, `sortField: "createdAt"`, `sortDirection: "desc"` — already the corrected
  default from the prior pass's Workstream B fix.
- Deterministic tie-breaker: already implemented in `sortDesignsForListQuery.ts`/
  `compareDesignsForListSort` (`right.id.localeCompare(left.id)` on equal timestamps, `desc`
  direction) — reused unchanged, not reinvented.
- Cursor pagination: already implemented (`DesignListCursor`, `nextCursor`,
  `loadMoreDesigns`) — reused unchanged.
- Bounded page size: already `DEFAULT_LIST_LIMIT = 100` (`designService.ts:55-56`) — unchanged.
- No `loadAll`: `useDesigns(listQuery, { enabled })` is called **without** `loadAll: true` for this
  surface, exactly as archived mode already does today.
- No new realtime listener: `useDesigns` is one-shot-query-based, not `onSnapshot`-based — unchanged.
- No broad taxonomy read: taxonomy stays on `useGeneratedDesignLibraryTaxonomy`, completely untouched.

**Secondary layer: generated ready-index remains, in a strictly best-effort role.**
Per the amendment's explicit instruction, the generated ready-index is **not deleted** — it remains
available as a fallback/optimization for other consumers (request-selection flows, if they
currently benefit from it) but must not gate whether a newly-approved design is visible. Concretely:
`DesignLibraryPage.tsx`'s `usingGeneratedCatalog` gate is removed for the **design list** decision
specifically; `useDesigns` becomes unconditionally enabled (subject to the existing `includeArchived`
split, which stays); `useGeneratedReadyDesigns` is either removed from this page's active render
path or retained in a clearly secondary, opt-in role (exact decision made during Implement, based on
whether any other still-active consumer of the hook exists on this page — to be confirmed via
`[NEEDS REPO CHECK]` during implementation, see §8).

**Immediate approval reconciliation.** With `useDesigns` as primary, the existing `applyDesignPatch`
mechanism already used elsewhere in this hook is the reconciliation primitive: after a successful
approval action, the design's page cache is already invalidated server-cache-side
(`invalidateDesignReadCaches`, confirmed §2e) — Implement will add an explicit `reloadDesigns()`
(or a targeted `applyDesignPatch` insertion for optimistic same-tick visibility, backed by the
authoritative approved record) call from the AI Review approval success path so the Design Library's
own list — if mounted — reflects the change without requiring the user to leave and return.

**Portal:** completely unchanged — remains on `generated/portal-catalog/**` assets. No Portal file
is touched by Workstream 1.

**Generated taxonomy:** completely unchanged — `useGeneratedDesignLibraryTaxonomy` remains active
for normal-browse category/tag filtering.

---

## 6. Ready-boundary publisher correction (exact fix)

1. Explicitly set `timeoutSeconds` on all three affected triggers
   (`onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`,
   `onPortalCatalogSnapshotSourceWritten`) to a value comfortably covering `DEBOUNCE_MS` (15s) plus a
   realistic full-catalog publish duration with margin — **300 seconds (5 minutes)**, well under the
   Cloud Functions v2 event-driven ceiling, and far above any plausible real publish duration for
   this catalog's current scale.
2. **Shrink the debounce claim's own expiry** from `DEBOUNCE_MS + LEASE_MS` (~10m15s) back down to a
   value proportioned to the *sleep* plus a realistic publish margin — not the full 10-minute lease,
   which was only ever meant to bound the **lease's own** contention-retry window, not the debounce
   claim's liability window. Use `DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS` where
   `PUBLISH_ATTEMPT_MARGIN_MS` is a new, smaller, explicit constant (**90 seconds**) — long enough to
   cover one realistic full publish attempt, short enough that a stuck/timed-out waiter self-heals in
   under two minutes instead of over ten. This directly bounds the "designs remain invisible to
   Portal for up to 10 minutes at a time, repeatedly" failure mode down to a much smaller,
   self-recovering window, and combined with fix (1) makes an actual hard-timeout kill rare in the
   first place.
3. No change to the persisted lease (`LEASE_MS`, `publishKind`'s own transactional guard) — that
   remains the correctness boundary for preventing concurrent scans, unaffected by this fix.

This satisfies the instruction not to assume the coalescing code is healthy merely because unit
tests passed — the unit tests correctly modeled the claim/release logic in isolation; the defect is
in the *interaction* between the claim's duration and the deployed function's timeout, which no unit
test could have caught without live log inspection (which this Plan performed).

---

## 7. AI Processing required behavior (Workstream 2 fix)

1. Add an `onQueueChanged?: () => void` option to `useAiProcessingQueueOptions`
   (`useAiProcessingQueue.ts:39-49`); invoke it after a successful `enqueueDesign` completion inside
   both `processSelectedDesign` and `runAutoQueueLoop`, immediately alongside the existing
   `refreshDesignList()`/`reloadDesigns()` call.
2. Thread `options?.onQueueChanged` from `useAiReviewInbox.ts` into the `useAiProcessingQueue(...)`
   call (`:271-294`) — the value is already available in that closure.
3. Fix the post-completion reselection gap in both `processSelectedDesign` (`:425-432`) and
   `runAutoQueueLoop` (loop-exit around `:283-296`): when `resolveAdvanceIndexAfterProcessing`/
   `findNextAwaitingIndex` returns `-1` (no next awaiting design), explicitly clear the stale
   selection (`requestSelectDesign(null)`) rather than leaving `selectedDesignId` dangling on a
   filtered-out design — this restores `canProcessSelected`'s ability to correctly evaluate `false`
   (nothing selected, nothing to process) instead of silently and permanently disabling any future
   selection's eligibility check via a stale `selectedDesign` derivation.
4. No change to `runState`, `isQueueBusy`, or `enqueueingDesignId` clearing — all independently
   confirmed already-correct in the investigation.

---

## 8. Large-import picker provenance required behavior (Workstream 3 fix)

1. Replace the bare `Set<string>` provenance model in `importFileSession.ts` with a
   **session-scoped, generation-stamped** record: `registerImportFilePath` returns a generated
   session token; `isRegisteredImportFilePath`/`isValidatedImportFilePath` accept and verify that
   token alongside the path, so a second, unrelated registration cannot silently invalidate an
   in-flight session's provenance. Exact shape (opaque token vs. monotonic counter) decided during
   Implement based on the smallest change that preserves the existing IPC payload contracts.
2. Remove the redundant second `validatePngFile()` call in `readSelectedPngFileBytes.ts:13` when
   `consumeCorrectedImportBytes` already has a cached, already-validated result for that exact path —
   only fall through to a fresh validate+trim+upscale pass on a genuine cache miss. This halves the
   large-file processing cost in the common case and shrinks the exposure window this whole class of
   defect depends on.
3. Thread the session token through the renderer (`useSinglePngImport.ts`, `importDesktopService.ts`)
   from `SELECT_SINGLE_PNG`'s response through `VALIDATE_SELECTED_PNG` and `READ_SELECTED_PNG_BYTES`.
4. Arbitrary-filesystem-path protection is explicitly preserved: `isUnsafeClientFilePath` remains
   unchanged and is still checked first in every validated path; the fix narrows *identity*
   verification, it does not loosen *authorization*.
5. `[NEEDS REPO CHECK]` during Implement: confirm whether the batch-import session
   (`importBatchSession.ts`, referenced by `validateReadPngFileBytesRequest.ts:6`) has an analogous
   single-slot fragility — out of scope for this Amendment unless the owner's evidence specifically
   implicates batch import (it does not; the evidence is single-file), but must not be broken by this
   fix either.

---

## 9. Controlled publication and Firestore-cost measurement

Per explicit instruction: this coding agent has neither an interactive Electron/Chromium session
(confirmed in the prior pass and re-confirmed unchanged this pass) nor Application Default
Credentials for scripted Admin SDK writes (same prior confirmed limitation). **Live runtime
measurement using three real approvals cannot be performed from this environment.** Source
implementation and automated tests will be completed regardless (per explicit instruction, lack of
interactive access must not block implementing the Studio authoritative bounded path), and a compact
owner QA measurement checklist will be produced in the Test Report instead of a live measurement,
truthfully labeled as not performed.

---

## 10. In scope / preserved passes

Confirmed no change is planned to: tag/category archive cache invalidation, tag restore, Studio/Portal
`createdAt desc` ordering (reused, not altered), generated category/tag taxonomy, archive/management
workflows, the publisher's transactional lease, the persistent debounce **claim mechanism** itself
(only its duration constant changes), last-valid-Portal-snapshot-serving during publication (untouched
by this Amendment), ready-boundary-only scheduling classification (untouched — already correct per
live log evidence, §2c), or the "no publication for ordinary imported/processing status churn"
guarantee (confirmed still correctly enforced by the same log evidence — 7 `"outcome":"skipped"`
`"classification":"operational"` entries observed for status churn in the same window).

---

## 11. Exact files expected to change

**Workstream 1:**
- `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` — remove/rework the
  `usingGeneratedCatalog` gate for the design-list decision; wire `useDesigns` as unconditional
  primary for non-archived browse.
- `apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts` — scope down to
  its remaining secondary role, or confirm removal from this page's active path
  (`[NEEDS REPO CHECK]` — confirmed during Implement whether any other consumer needs it retained).
- `apps/studio/src/renderer/src/features/designs/utils/designLibraryFirestoreLoadPolicy.ts` —
  updated policy reflecting Firestore-primary for normal browse.
- `apps/studio/src/renderer/src/features/designs/services/designService.ts` — no change expected
  (already correct); confirmed via reading, not modified unless Implement finds a gap.
- `apps/studio/src/renderer/src/features/ai-review/services/aiReviewInboxService.ts` /
  `catalogApprovalService.ts` — possible addition of an explicit Design-Library-list reconciliation
  hook/event on approval success, if not already sufficiently covered by the existing 15s cache TTL
  plus manual reload.
- `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` — debounce claim duration constant and
  explicit `timeoutSeconds` on the three trigger exports.

**Workstream 2:**
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts`
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts`

**Workstream 3:**
- `apps/studio/electron/ipc/import/importFileSession.ts`
- `apps/studio/electron/ipc/import/readSelectedPngFileBytes.ts`
- `apps/studio/electron/ipc/import/validateReadPngFileBytesRequest.ts`
- `apps/studio/electron/ipc/import/importIpcHandlers.ts`
- `apps/studio/src/renderer/src/features/imports/services/importDesktopService.ts`
- `apps/studio/src/renderer/src/features/imports/hooks/useSinglePngImport.ts`
- `packages/shared/src/types/import/*` — if a session-token field needs adding to shared IPC types.

Any additional path discovered during Implement will be listed in the Test Report and Implementation
Review, not silently added.

---

## 12. Out of scope (unchanged from the governing instruction)

Production deployment, production installer, Portal App Hosting rollout, Firestore Rules, Storage
Rules, indexes, schema migrations, secret changes, catalog asset deletion, broad snapshot rollback
across Portal, replacing generated taxonomy snapshots, restoring `loadAll`, adding an unbounded
listener, changing catalog approval requirements, changing design lifecycle statuses.

---

## 13. Required Plan output

1. Confirmed reason ready designs never appeared — §2a.
2. Generated snapshot loaded successfully but was stale — confirmed, §2b.
3. Exact current Studio ready-design source — `useGeneratedReadyDesigns` (generated Storage
   snapshot), gated exclusively by `usingGeneratedCatalog`.
4. Exact new Studio ready-design source — `useDesigns`/`designService.listDesignsPage`, bounded
   Firestore, `status == "ready"`, `createdAt desc`.
5. Bounding mechanism — existing cursor pagination + 100-doc page size, reused unchanged.
6. Approval reconciliation — existing `invalidateDesignReadCaches` (already correct) plus an explicit
   `reloadDesigns()`/patch call from the approval success path.
7. Ready-boundary publisher root cause — debounce claim duration (~10m15s) exceeding the trigger
   functions' default 60-second timeout, causing a timed-out waiter to strand the claim without
   releasing it, confirmed via live `fresh-prints-dev` log inspection (§2c).
8. Correction — explicit 300s `timeoutSeconds` on the three triggers + shrink the claim's own expiry
   to `DEBOUNCE_MS + 90s` instead of `DEBOUNCE_MS + LEASE_MS` (§6).
9. Three-approval publication measurement — not performed live (no interactive/ADC access); a
   compact owner QA checklist will be produced instead (§9).
10. See Implementation Review for before/after Studio visibility, Portal behavior, AI reconciliation,
    and picker-provenance results once implemented.

**Approval phrase for the batched Amendment implementation:**
`APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY OWNER QA AMENDMENT 1`

Per the governing FreshForge command (`Continue Workflow`, "do not pause after Plan or Review when
the verdict is approved... and all required changes are resolvable from repository evidence"), this
Plan proceeds directly into an independent Formal Review without waiting for a separate approval
message, since all findings above are grounded in direct repository/log evidence, not open product
questions.
