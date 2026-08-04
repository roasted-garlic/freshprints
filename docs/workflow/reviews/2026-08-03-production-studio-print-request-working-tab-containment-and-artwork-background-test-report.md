# Test Report: Studio Print Request Working-Tab Containment and Artwork Background

Date: 2026-08-03
Branch: `fix/studio-print-request-working-tab-and-artwork-background`
Plan: `docs/workflow/plans/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-plan.md`
Formal Review: `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-review.md`
(verdict: **APPROVED WITH ONE REQUIRED AMENDMENT** — the lightbox call site)
Implementation authorized via: `APPROVE STUDIO PRINT REQUEST WORKING-TAB CONTAINMENT AND ARTWORK BACKGROUND IMPLEMENTATION`

## What changed

### Defect A fix — Working-tab list contamination

`apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.ts` (new file):
extracted `mergePrintRequestsById` out of `usePrintRequests.ts` into its own file (required because
`usePrintRequests.ts` transitively imports Firebase/`import.meta.env`-dependent modules that cannot
be imported under this repo's plain `node:test` runner — mirrors the existing
`reconcileDeletedOrArchivedRequest.ts` convention). The function now takes a third `activeTab`
parameter and skips admitting an addition whose own `queueTab` disagrees with it, admitting
unconditionally only when `queueTab` is absent (pre-backfill legacy fallback) — the same guard shape
already reviewed and shipped for `mergeShowQueuePrintRequestSources`.

`apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`: imports the
extracted function; `ensureRequestsLoaded`'s merge now passes `activeTabRef.current` (a ref kept in
sync with the `activeTab` prop via a `useEffect`) rather than the closed-over `activeTab` parameter.
This distinction is required, not cosmetic: `ensureRequestsLoaded` is async, and if the closed-over
`activeTab` value were used instead, a request fetched while Queued was active would still pass the
guard when the merge finally resolves after the user has switched to Working, because the guard would
be comparing the request's `queueTab` against the *stale* tab it was fetched for, not the tab actually
active at merge time. Verified this distinction empirically (see Verification below) before
committing to the ref-based approach.

### Defect B fix — artwork background, both call sites

`apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.ts`
(new file): a small named function forwarding `design?.artworkBackgroundHex`, following this
directory's established "extracted, directly-testable pure function" convention. Deliberately does
**not** duplicate `resolveArtworkBackgroundHex`'s fallback/validation logic — that already lives in,
and is already tested by, `packages/shared/src/constants/design/artworkBackground.constants.ts`, and
is already applied downstream by `DesignThumbnailPanel`/`DesignPreviewLightbox`.

`apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`: computes
`artworkBackgroundHex` once via the new resolver and passes it to **both** existing render call
sites — the inline `<DesignThumbnailPanel>` (the original reported symptom) and the
`<DesignPreviewLightbox>` (the Formal Review's required amendment, a second, independent consumer of
the same design's background inside the same file that was also silently wrong). No other prop, no
DPI/size/quantity logic, and no lightbox open/close wiring was touched.

## Verification results

| Check | Result |
|---|---|
| `mergePrintRequestsById.test.ts` (new, 7 tests) | **7/7 pass** |
| `resolvePrintRequestItemArtworkBackground.test.ts` (new, 5 tests) | **5/5 pass** |
| Regression proof: reverted `mergePrintRequestsById.ts` to the pre-fix (no-guard) logic, re-ran its test file | **4/7 fail**, confirming genuine discriminating power; restored the fix, re-ran, **7/7 pass** again |
| `reconcileDeletedOrArchivedRequest.test.ts`, `printRequestRoutes.test.ts` (unchanged, re-run as regression checks) | pass (29 tests total across all 4 relevant files) |
| Repo lint (`npm run lint`) | exit 0, 0 warnings |
| Studio typecheck (`tsc --noEmit`, after generating the build-time packaged-config file) | exit 0 |
| Studio production build (`tsc && vite build` for renderer, main, and preload — the non-packaging portion of `apps/studio`'s `build` script; `electron-builder` packaging was not run, since this narrow fix has no packaging-relevant change and no installer was requested) | exit 0, all three bundles built successfully; pre-existing chunk-size/dynamic-import warnings unrelated to this change |
| `git diff --check` | exit 0 (only a benign CRLF-normalization warning) |

## New test coverage added

**`mergePrintRequestsById.test.ts`** (7 tests):
- Admits an addition whose `queueTab` matches the active tab.
- Rejects an addition whose `queueTab` disagrees (the exact reported Working-tab contamination
  scenario).
- Admits an addition with no `queueTab` (legacy fallback).
- All four `queueTab` values (`working`, `queued`, `printing`, `printed`) exercised against every
  other active tab in a matrix — directly satisfies the acceptance criterion "Working, Queued,
  Printing, and Printed each reject requests belonging to another queueTab."
- Preserves already-present entries untouched by a mismatched addition.
- Overwrites an existing entry when the addition matches (fresher data wins for the correct tab).
- Does not let a moved-to-another-tab request's stale re-fetch resurrect/refresh it in its old tab.

**`resolvePrintRequestItemArtworkBackground.test.ts`** (5 tests):
- Returns the design's saved `artworkBackgroundHex` when set.
- Returns each design's own value independently (no cross-design leakage).
- Returns `undefined` when unset, deliberately not duplicating the established fallback.
- Returns `undefined` for a customer-upload item (no `design`).
- Passes a malformed value through unchanged, confirming fallback/validation is correctly deferred
  to the already-tested `resolveArtworkBackgroundHex`, not reimplemented here.

## Files changed

- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.test.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.test.ts` (new)
- This Test Report (new).

No Cloud Function, Firestore Rule/index, or Portal file was changed, matching the Plan's explicit
scope boundary. `usePrintRequestAllocationTotals`'s full-collection-scan pattern (a separate,
previously flagged finding from the PR #37 remediation) was not modified.

## Manual/owner verification still required

This environment cannot launch the packaged Electron app or a live Firebase-connected dev session.
The owner should re-run the exact originally-reported scenario against `fresh-prints-dev`:

1. Reuse or recreate `roasted_garlic-CR001` (or an equivalent queued request with a catalog design
   item that has a saved `artworkBackgroundHex`).
2. In Studio Show Queue, click the attached request link — confirm it opens directly on Queued (per
   PR #37, unaffected by this change).
3. Manually click the Working tab — confirm the queued request does **not** appear as a card, and
   the empty state renders when Working's count and page are both 0.
4. Switch back to Queued — confirm exactly one copy of the request appears (no duplication).
5. Compare the Yellowstone item's artwork preview mat color in Studio against the same design's
   saved background as shown in Portal — confirm they now match.
6. Click the item's thumbnail to open the lightbox — confirm the lightbox background also matches
   (the Formal Review's required amendment).
7. Confirm a request/design with no saved background still renders on the existing default.

## Human checkpoint carried forward

The stable `1.0.0` release draft remains unpublished pending this fix's owner verification, per the
checkpoint recorded in the Plan (§9) and both Formal Reviews in this remediation chain.

## Confirmation

No Firestore Rules, indexes, Cloud Functions, or production/dev deployment action was performed in
this pass. All changes are local, uncommitted Studio renderer source and test files on
`fix/studio-print-request-working-tab-and-artwork-background`, not yet pushed.
