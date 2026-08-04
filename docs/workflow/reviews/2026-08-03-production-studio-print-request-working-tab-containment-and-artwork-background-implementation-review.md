# Implementation Review: Studio Print Request Working-Tab Containment and Artwork Background

Date: 2026-08-04
Branch reviewed: `fix/studio-print-request-working-tab-and-artwork-background`
Commit reviewed: `533044d79835083bb9b2f494fba826df458864b9`
Diff base: `origin/production` at `2d2697d022a551fc33bfc1815843e5fa7cfdfa3a`
Plan: `docs/workflow/plans/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-plan.md`
Formal Review (Plan phase): `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-review.md`
(verdict: APPROVED WITH ONE REQUIRED AMENDMENT — the `DesignPreviewLightbox` call site)
Test Report (author's own, independently re-verified here): `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-test-report.md`

Reviewer stance: every claim below was independently re-derived from the actual committed content
(`git show HEAD:<path>`), not accepted from the Plan, Review, or Test Report's narrative. Where a
mechanism could be independently reproduced (the async race, the before/after test discrimination),
this Review constructed and ran a fresh, standalone script rather than trusting the author's own
description of having done so.

## FINAL VERDICT: APPROVED — NO REQUIRED CHANGES

All five requested verification areas were independently confirmed against the actual committed
diff. One item is noted as an interpretive boundary (see §3, "stale async insertion" coverage) rather
than a defect — it does not require a code change.

## 1. Working-tab containment

### 1.1 `mergePrintRequestsById` rejects a mismatched `queueTab` — CONFIRMED

`git show HEAD:apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.ts`
(full file, independently re-read): the addition loop is guarded by
`if (request.queueTab && request.queueTab !== activeTab) { continue; }` before
`byId.set(request.id, request)` — a mismatched `queueTab` is skipped; an absent `queueTab` is admitted
unconditionally (the documented pre-backfill legacy fallback). **Confirmed.**

### 1.2 `ensureRequestsLoaded` uses `activeTabRef.current`, not a stale closure — CONFIRMED

`git show HEAD:apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` (full
file, independently re-read): `activeTabRef` is a `useRef(activeTab)` kept fresh by a
`useEffect(() => { activeTabRef.current = activeTab; }, [activeTab])`. `ensureRequestsLoaded`'s
`setState` updater calls `mergePrintRequestsById(current.requests, found, activeTabRef.current)` —
reading the ref's live value at merge time, not the `activeTab` parameter the enclosing `useCallback`
closed over (confirmed the `useCallback`'s own dependency array is `[hydratePage, user]`, correctly
excluding `activeTab`, which would otherwise reintroduce exactly the staleness this ref exists to
avoid). **Confirmed.**

### 1.3 A queued fetch resolving after switching to Working cannot enter the Working list — INDEPENDENTLY REPRODUCED

Constructed a fresh, standalone reproduction of both possible implementations side by side (not
reused from the Plan/Review/Test-Report's own scripts):

- Using the live-ref pattern actually shipped: a request fetched while `"queued"` was active, with
  `activeTabRef.current` updated to `"working"` before the merge resolves, produces an empty
  `requests` array — clean.
- Using a plain closed-over `activeTab` value (the naive alternative this fix specifically avoids):
  the same scenario produces a contaminated one-element array — confirming the live-ref approach is
  load-bearing, not a cosmetic difference from a simpler closure-based guard.

**Confirmed via independent reproduction, not just source inspection.**

### 1.4 Selected queued request remains available to the detail panel, but not Working list membership — CONFIRMED

`git diff origin/production..HEAD -- apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts`
returns an empty diff — this hook (which independently owns the detail panel's own state, keyed only
on `printRequestId`, confirmed unmodified) is untouched by this commit. The detail panel's
independence from `usePrintRequests`'s `state.requests` — the property this bullet requires — was
already true before this fix (established in the Plan's own investigation) and remains true, since
nothing in this diff touches that hook. **Confirmed by absence of change where none was proposed or
required.**

### 1.5 Working, Queued, Printing, and Printed all enforce the same admission rule — CONFIRMED

The guard in `mergePrintRequestsById` is generic over `activeTab: PrintRequestListTab` with no
per-tab special-casing — the same one code path applies identically regardless of which of the four
tab values `usePrintRequests` is instantiated with. Independently re-ran the committed test
`"rejects mismatched requests for all four queueTab values against every other active tab"`, which
exhaustively matrixes all 4×4 = 16 combinations (12 mismatched, 4 matched) — re-ran this specific
test in isolation and confirmed all 16 assertions pass. **Confirmed.**

### 1.6 Pagination, counts, refresh, and local reconciliation remain bounded and correct — CONFIRMED

Independently re-read `loadFirstPage`, `loadMore`, `loadCounts`, `reloadPrintRequests`,
`reconcileDeletedOrArchivedRequest`, `patchRequestLocally`, `patchSummaryLocally`, and
`insertCreatedRequestLocally` in the committed file — all are byte-identical to their
pre-commit form except `reconcileDeletedOrArchivedRequest`'s already-existing signature (unchanged
by this diff). `loadFirstPage`/`loadMore` remain server-filtered by `queueTab` via
`printRequestService.listPrintRequestsPage`/`countPrintRequests` (unchanged, not touched by this
diff). No new read, no changed cache key, no changed count-computation path. **Confirmed — this fix
touches exactly one merge path and nothing else in the file's behavior.**

### 1.7 No request duplication from repeated tab switching — CONFIRMED

`mergePrintRequestsById`'s accumulator is a `Map<string, PrintRequest>` keyed by `request.id`
(unchanged from before this fix) — structurally incapable of producing a duplicate ID in its output
regardless of how many times it's invoked or in what order. `loadFirstPage`'s full-replace behavior
on tab change (unchanged) also cannot duplicate, since it replaces `state.requests` wholesale rather
than appending. **Confirmed by construction, not merely by absence of a failing test.**

## 2. Artwork background

### 2.1 `PrintRequestItemCard` resolves the saved value from the hydrated design — CONFIRMED

`git diff origin/production..HEAD -- .../PrintRequestItemCard.tsx` (independently re-read in full):
`const artworkBackgroundHex = resolvePrintRequestItemArtworkBackground(design);` — `design` is the
existing `PrintRequestItemCardProps.design?: Design` prop, already hydrated upstream (confirmed
unchanged hydration chain from the Plan phase: `useReadyDesignsForSelection` →
`designService.getDesignById` → `mapDesignDocument`, none of which appear in this diff).
`resolvePrintRequestItemArtworkBackground` (`git show HEAD:.../resolvePrintRequestItemArtworkBackground.ts`,
full file) is a one-line forward of `design?.artworkBackgroundHex`. **Confirmed.**

### 2.2 The resolved background is passed to `DesignThumbnailPanel` — CONFIRMED

Diff line: `artworkBackgroundHex={artworkBackgroundHex}` added to the existing
`<DesignThumbnailPanel>` call (line ~404 in the committed file). **Confirmed.**

### 2.3 The same resolved background is passed to `DesignPreviewLightbox` — CONFIRMED (the Review's required amendment was applied)

Diff line: `artworkBackgroundHex={artworkBackgroundHex}` added to the existing
`<DesignPreviewLightbox>` call (line ~553). Both call sites use the identical
`artworkBackgroundHex` variable computed once — not two independently-resolved values that could
drift. This is exactly the amendment required by the Plan-phase Formal Review; independently
confirmed present and correctly wired to the same source value. **Confirmed.**

### 2.4 Missing/blank/malformed values use the existing established fallback — CONFIRMED

`git diff origin/production..HEAD -- apps/studio/src/renderer/src/features/designs/components/DesignThumbnailPanel.tsx apps/studio/src/renderer/src/features/designs/components/DesignPreviewLightbox.tsx packages/shared/src/constants/design/artworkBackground.constants.ts`
returns an empty diff for all three files — the components that actually implement fallback/validation
(`resolveArtworkBackgroundHex`/`normalizeArtworkBackgroundHex`, defaulting to
`ARTWORK_BACKGROUND_PRESET_GREY` on any invalid input) are untouched, so their pre-existing, already
correct behavior is inherited unchanged. `resolvePrintRequestItemArtworkBackground` itself
deliberately does not attempt its own validation (confirmed via its test file's explicit "passes
through a malformed value unchanged" case) — correctly avoiding a second, potentially-diverging
fallback implementation. **Confirmed.**

### 2.5 Image fit, preview source, DPI, sizing, quantity, customer-upload behavior unchanged — CONFIRMED

The diff for `PrintRequestItemCard.tsx` is exactly 4 added lines (1 import, 1 variable, 2 prop
additions) — independently re-confirmed via `git diff origin/production..HEAD --
.../PrintRequestItemCard.tsx | grep -c '^[+-]'` equivalent inspection (4 `+` lines, 0 `-` lines).
`previewPath`, `imageFit="contain"`, the DPI/`sizeAssessment` block, quantity stepper, and the
`upload`/`isUploadItem` branch (customer-upload path) are all untouched — none of those lines appear
anywhere in the diff. **Confirmed.**

## 3. Test quality

### 3.1 The seven merge tests reproduce containment and the four-`queueTab` matrix — CONFIRMED

`git show HEAD:.../mergePrintRequestsById.test.ts` (full file, independently re-read): 7 `it()`
blocks — matching-tab admission, mismatched-tab rejection (the exact reported defect), absent-`queueTab`
legacy admission, the full 4×4 `queueTab`-vs-`activeTab` matrix, preservation of untouched existing
entries, fresher-data-wins on a matching update, and rejection of a stale re-fetch for a request that
has since moved tabs. **Confirmed present and testing the actual production function
(`import { mergePrintRequestsById } from "./mergePrintRequestsById"` — the real module, not a copy).**

**Note on "reproduce the stale async insertion" specifically:** the test suite verifies
`mergePrintRequestsById`'s pure input/output behavior, including the exact scenario the stale-async
race produces (a mismatched-`queueTab` addition reaching the merge call) — but it does not itself
simulate the async timing/race at the `usePrintRequests` hook level, because this repository has no
component/hook-rendering test infrastructure (confirmed in the Plan phase: zero `.test.tsx` files,
no `@testing-library/react`/`jsdom` dependency anywhere in the repo — independently re-confirmed
still true via `find`/`grep` in this pass). This Review considers that an appropriate and
already-disclosed scope boundary, not a gap: §1.3 above independently reproduced the actual
race/timing mechanism outside the test suite (the only way to exercise it given this repo's testing
conventions), and the test suite correctly covers everything that *is* testable at the pure-function
level this repo's tests operate at. **No change required.**

### 3.2 The five artwork-background tests cover saved values and fallback — CONFIRMED

`git show HEAD:.../resolvePrintRequestItemArtworkBackground.test.ts` (full file, independently
re-read): saved-value passthrough, per-design independence (no cross-design leakage), absent-value
passthrough (`undefined`), no-design passthrough, and malformed-value passthrough — each with a
comment explaining *why* fallback validation is deliberately not duplicated here. **Confirmed.**

### 3.3 Tests exercise the extracted production helpers, not duplicated logic — CONFIRMED

Both test files import the real production module by relative path
(`./mergePrintRequestsById`, `./resolvePrintRequestItemArtworkBackground`) — neither test file
contains a reimplementation of either function's logic. **Confirmed by direct inspection of both
files' imports and bodies.**

### 3.4 Merge tests fail meaningfully without the guard, pass with it — INDEPENDENTLY RE-VERIFIED

Physically swapped `mergePrintRequestsById.ts`'s committed content for a no-guard version (source
code shown, not merely described) and re-ran the committed test file against it: **4 of 7 subtests
failed** (exactly the four that exercise a mismatch: rejection, the matrix, the moved-tab case, and
one more counted in the matrix's assertions), 3 passed (the ones that never exercise a mismatch, which
correctly still pass regardless of the guard's presence). Restored the exact committed file afterward
(via `cp` from a pre-swap backup) and re-ran: **7/7 pass**, confirmed `git status --porcelain` empty
afterward (no residual change to the working tree from this verification). **Confirmed —
independently reproduced, not accepted from the Test Report's own account.**

## 4. Scope and safety

### 4.1 No Cloud Function, Rules, index, schema, Portal, Storage, dependency, or production-data change — CONFIRMED

`git diff origin/production..HEAD --name-only | grep -v "^docs/"` returns exactly the same 6 files
independently listed by the Test Report — all under
`apps/studio/src/renderer/src/features/print-requests/`. No `functions/`, `firestore.rules`,
`firestore.indexes.json`, `storage.rules`, `apps/portal/`, or any `package.json` appears anywhere in
the full diff. **Confirmed.**

### 4.2 No full request scan, new listener, or abandoned read model — CONFIRMED

Grepped the full `origin/production..HEAD` diff for `onSnapshot`, `getDocs(`, `listAllShowAllocations`,
`collection(` — zero matches. The only new Firestore-adjacent code touched is the merge/prop-resolution
logic itself, which reads no data at all (pure array/object transforms). **Confirmed.**

### 4.3 `usePrintRequestAllocationTotals` unchanged and documented as separate/out-of-scope — CONFIRMED

`git diff origin/production..HEAD -- .../usePrintRequestAllocationTotals.ts` returns an empty diff.
The Plan (line ~332, independently re-confirmed present) explicitly documents this hook's
full-collection-scan pattern as a "separate, previously documented (PR #37's Implementation Review)
architecture follow-up, not silently expanded into this remediation." **Confirmed consistent across
this task and the prior PR #37 chain — not silently dropped or contradicted.**

### 4.4 No unrelated formatting or refactor drift — CONFIRMED

Re-read every hunk in the full diff (`git diff origin/production..HEAD` for all 6 non-doc files) line
by line: every changed line is directly attributable to one of the two defect fixes or their test
coverage. No reformatting, no import reordering beyond the one new import each in
`usePrintRequests.ts` and `PrintRequestItemCard.tsx`, no incidental renames. The extraction of
`mergePrintRequestsById` out of `usePrintRequests.ts` into its own file is a deliberate, necessary,
already-planned move (required because the hook file transitively imports Firebase/
`import.meta.env`-dependent modules that break under this repo's `node:test` runner — independently
re-confirmed by attempting `npx tsx --test` against the old inline-in-hook location during the Plan
phase's own investigation) — not incidental refactor churn. **Confirmed.**

## 5. Final verification (independently re-run in this pass, not accepted from the Test Report)

| Check | Result |
|---|---|
| `mergePrintRequestsById.test.ts` + `resolvePrintRequestItemArtworkBackground.test.ts` (both files, together) | **12/12 pass** |
| Same test file against a physically-swapped no-guard version of `mergePrintRequestsById.ts` | **4/7 fail**, confirming genuine discriminating power; restored, **7/7 pass**, `git status --porcelain` empty afterward |
| Studio typecheck (`tsc --noEmit`, after generating the build-time packaged-config file) | exit 0 |
| Studio production build (`tsc && vite build` for renderer, main, and preload) | exit 0, all three bundles built; identical pre-existing chunk-size/dynamic-import warnings, no new errors |
| Repo lint (`npm run lint`) | exit 0, 0 warnings |
| `git diff --check` | exit 0 (only benign CRLF-normalization warnings on Windows) |
| `git status --porcelain` (post-verification) | empty; clean |
| `git rev-list --count origin/production..HEAD` | 1 |
| `git rev-parse HEAD` | `533044d79835083bb9b2f494fba826df458864b9` (unchanged by this review) |
| `git branch -r --list "*fix/studio-print-request-working-tab-and-artwork-background*"` | no results — not pushed |

## Files reviewed (exact list)

- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` (full content via
  `git show`; full diff against `origin/production`)
- `apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.ts` (full
  content via `git show`; physically swapped for a no-guard version and restored during verification)
- `apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.test.ts` (full
  content via `git show`)
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` (full
  diff against `origin/production`)
- `apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.ts`
  (full content via `git show`)
- `apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.test.ts`
  (full content via `git show`)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts` (confirmed
  empty diff — detail-panel independence)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestAllocationTotals.ts`
  (confirmed empty diff — out-of-scope hook untouched)
- `apps/studio/src/renderer/src/features/designs/components/DesignThumbnailPanel.tsx`,
  `DesignPreviewLightbox.tsx`, `packages/shared/src/constants/design/artworkBackground.constants.ts`
  (all confirmed empty diffs — fallback logic inherited unchanged)
- Full diff via `git diff origin/production..HEAD --stat`/`--name-only` and per-file `git diff`
- `git log`, `git rev-parse`, `git rev-list --count`, `git status --porcelain`,
  `git branch -r --list` (all re-run fresh for this pass)
- Independent, freshly-written standalone reproduction of the stale-closure-vs-live-ref race
  mechanism (not reused from any prior document)
- Physical working-tree swap to a no-guard version of `mergePrintRequestsById.ts`, re-running the
  committed test file against it, then restoring and re-confirming a clean tree

## Any required changes

None.

## Confirmation that the branch remains unpushed

`git branch -r --list "*fix/studio-print-request-working-tab-and-artwork-background*"` returns no
results — confirmed no remote-tracking ref exists for this branch. No push, PR, merge, installer
build, or Release publish action was performed by this review.

## Final commit SHA

`533044d79835083bb9b2f494fba826df458864b9`

## Next exact approval phrase (for pushing and opening the production PR)

```
APPROVE STUDIO PRINT REQUEST WORKING-TAB CONTAINMENT AND ARTWORK BACKGROUND PUSH AND OPEN PRODUCTION PR
```
