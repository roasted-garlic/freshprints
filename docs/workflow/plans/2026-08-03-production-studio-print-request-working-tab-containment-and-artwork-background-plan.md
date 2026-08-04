# Plan: Studio Print Request Working-Tab Containment and Artwork Background

Date: 2026-08-03
Branch: `fix/studio-print-request-working-tab-and-artwork-background` (created from `origin/production`
at `2d2697d022a551fc33bfc1815843e5fa7cfdfa3a`, confirmed matching local `production` exactly before
branching)
Scope: **Plan phase only.** No application source code was modified to produce this document.
Implementation is out of scope until this Plan and its independent Formal Review are both approved
and the owner issues the approval phrase in §9.

## 0. Pre-flight verification

```
git status --porcelain                                                  -> (empty; clean)
git rev-parse production                                                 -> 2d2697d022a551fc33bfc1815843e5fa7cfdfa3a
git rev-parse origin/production                                          -> 2d2697d022a551fc33bfc1815843e5fa7cfdfa3a
git merge-base --is-ancestor 2d2697d0... origin/production                -> IS ANCESTOR (identical, it IS origin/production HEAD)
git log -1 --format="%H %s" 2d2697d022a551fc33bfc1815843e5fa7cfdfa3a       -> "Merge PR #37: fix Studio print request deep-link tab integrity"
```

Confirmed clean, confirmed local/remote parity, confirmed the named commit is genuinely the PR #37
merge on `production`. Branch created via `git checkout -b
fix/studio-print-request-working-tab-and-artwork-background origin/production`.

## 1. Reported symptoms (owner smoke test, dev environment, post-PR#37)

Two independently reproduced defects on the exact same Studio Print Requests page, discovered while
smoke-testing the fix just merged in PR #37:

- **Defect A:** after the Show Queue deep link correctly opens the Queued tab (PR #37's fix
  verified working), manually clicking the Working tab still shows the queued request
  (`roasted_garlic-CR001`) as a card in the Working list, even though Working's exact count reads 0.
- **Defect B:** the same request's Yellowstone National Park design item renders on Studio's default
  light artwork background instead of the design's saved dark/tan `artworkBackgroundHex`, which
  Portal correctly displays.

Both are traced independently below, per explicit instruction not to assume a shared root cause —
and, confirmed by investigation, they do **not** share a root cause: Defect A is a state-merge gap in
`usePrintRequests.ts`; Defect B is a missing prop pass in `PrintRequestItemCard.tsx`. They happen to
be visible on the same page and the same reproduction request only because that request is both
queued (triggering Defect A) and has a catalog design item with a saved background (triggering
Defect B).

## 2. Investigation A: Print Requests page list containment

### 2.1 Confirmed: PR #37 did not — and structurally could not — cover this path

PR #37's entire fix surface was `apps/studio/src/renderer/src/features/upcoming-shows/` (Show
Queue's own page, hook, and merge utility: `UpcomingShowsPage.tsx`, `useShowQueuePrintRequests.ts`,
`showQueuePrintRequestSources.ts`). Re-confirmed via `git diff origin/production..HEAD` at the time
(now merged): zero files under `apps/studio/src/renderer/src/features/print-requests/` were touched.
`PrintRequestsPage.tsx` uses its own, completely separate `usePrintRequests(activeListTab)` hook
instance (`apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`) —
confirmed by direct read that this file's `ensureRequestsLoaded`/`mergePrintRequestsById` merge path
is **structurally identical to the pre-PR#37 defect already fixed in `showQueuePrintRequestSources.ts`**,
but was never itself patched, because the two Implementation Reviews for PR #37 were correctly scoped
only to the Show Queue files named in their own review documents. This confirms the task brief's
hypothesis exactly: the two hooks (`usePrintRequests` used directly by `PrintRequestsPage.tsx`, and
the three `usePrintRequests` instances wrapped by `useShowQueuePrintRequests` for Show Queue) are
genuinely separate React state, not shared — PR #37 fixed one call site's consumption pattern, not
the shared hook itself.

### 2.2 Root cause (Defect A): CONFIRMED

**File:** `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts:236-262`
(`ensureRequestsLoaded`) and `:53-62` (`mergePrintRequestsById`).

```ts
export function mergePrintRequestsById(
  current: PrintRequest[],
  additions: PrintRequest[],
): PrintRequest[] {
  const byId = new Map(current.map((request) => [request.id, request]));
  for (const request of additions) {
    byId.set(request.id, request);
  }
  return [...byId.values()];
}
```

```ts
const ensureRequestsLoaded = useCallback(
  async (printRequestIds: string[]) => {
    ...
    const found = await printRequestService.getPrintRequestsByIds(user, exactIds);
    ...
    setState((current) => ({
      ...current,
      requests: mergePrintRequestsById(current.requests, found),
      ...
    }));
  },
  [hydratePage, user],
);
```

`mergePrintRequestsById` performs an unconditional ID-keyed merge with **no `queueTab` check
whatsoever** — the exact same defect shape independently found and fixed in
`showQueuePrintRequestSources.ts`'s `mergeShowQueuePrintRequestSources` during the PR #37 remediation,
but never applied here.

**Exact reproduction mechanism, traced end to end:**

1. `PrintRequestsPage.tsx:269-273` calls `ensureRequestLoaded(selectedRequestId)` in a `useEffect`
   whenever `selectedRequestId` (from the `requestId` URL param) is set — this is what correctly
   hydrates a deep-linked request that isn't on the current tab's loaded page (Wave C hydration
   remediation, 2026-07-25, per its own comment).
2. `ensureRequestsLoaded` is `async`: it awaits `getPrintRequestsByIds` (a direct Firestore read) and
   `hydratePage` (two more reads) before calling `setState`.
3. This is a genuine, real-world-reachable race: if the user switches tabs (Queued → Working) while
   this promise chain is still in flight — very plausible immediately after a deep link resolves,
   since the fetch is not instantaneous — `activeTab` (the hook's own argument, sourced from
   `PrintRequestsPage.tsx`'s `activeListTab`) changes to `"working"` and `loadFirstPage` correctly
   replaces `state.requests` with Working's true (empty, in this repro) page **before**
   `ensureRequestsLoaded`'s promise resolves.
4. When `ensureRequestsLoaded`'s `setState` callback finally runs, it reads whatever `current.requests`
   is **at that moment** — now Working's (correctly empty) page — and unconditionally merges the
   stale-fetched queued request into it via `mergePrintRequestsById`, with no tab check. The queued
   request is now permanently present in `state.requests` while `activeTab === "working"`, until the
   next full `reloadPrintRequests()`/remount.
5. `resolveCanonicalPrintRequestsRoute` (`printRequestRoutes.ts:83-120`, unchanged and already
   correct) then sees a non-empty `eligibleRequestIds` for Working (because of the contamination) and
   selects the contaminated request as Working's "first eligible" row — explaining why the owner's
   screenshot shows the request selected/visible in Working's list with the detail panel still
   correctly reporting "Queued" (the detail panel is fed by a **completely separate**
   `usePrintRequestDetails` hook, confirmed in §2.3, which is unaffected by this contamination).
6. `countsByTab.working` remains 0 throughout, because tab counts come from a separate, correctly
   server-computed `getCountFromServer` call (`loadCounts` in `usePrintRequests.ts:70-84`) that is
   never touched by this local-state contamination — this is exactly why Working's count reads 0 while
   its list shows one card, the specific inconsistency the task asked the Plan to explain.

This also explains why manually clicking the Working tab button reproduces it reliably in the
owner's report even without an explicit race being visible to the user: the effect ordering inside
React's commit/effect cycle after a `navigate()` call is not something the UI author needs to time
deliberately — the `ensureRequestLoaded` effect and the tab-driven `loadFirstPage` effect are two
independent, uncoordinated async operations racing on the same `setState` target, and the merge
step has no defense against losing that race.

### 2.3 Confirmed: detail-panel selection is already correctly independent of list membership

**File:** `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts`
(full file read). This hook has its own `useState`, is keyed only on `printRequestId`, and has zero
references to `usePrintRequests`'s `state.requests`. `PrintRequestsPage.tsx` reads
`visibleSelectedRequest` from `usePrintRequestDetails`'s own `printRequest`/`loadedRequestId`, not
from `usePrintRequests`'s `requests` array. **No change is required here** — Required Plan Decision 2
(below) is already satisfied by the existing architecture; the fix must not couple these two hooks
any more tightly than they already are today.

### 2.4 Confirmed: every other mutation/reconciliation path in `usePrintRequests.ts` is already safe

- `loadFirstPage`/`loadMore` (`printRequestQueryPlanning.ts:85-86`, confirmed): the underlying
  `listPrintRequestsPage` query is server-filtered by `where("queueTab", "==", activeTab)` — cannot
  return a mismatched-tab request.
- `insertCreatedRequestLocally` (`usePrintRequests.ts:305-317`): already explicitly guarded by
  `if (activeTab !== "working") { return; }` before inserting — correct, matches the "new request is
  always Working" invariant, no change needed.
- `patchRequestLocally`/`patchSummaryLocally` (`usePrintRequests.ts:282-299`): both operate via
  `.map()`/object-spread on **already-present** entries only — cannot insert a new ID, cannot
  reintroduce a removed one.
- `reconcileDeletedOrArchivedRequest`/`reconcileDeletedOrArchivedRequestInState`
  (`reconcileDeletedOrArchivedRequest.ts`, full file read): only `.filter()`s or `.map()`s existing
  entries by ID — cannot insert a new one either.

**Conclusion: `ensureRequestsLoaded`'s merge call is the single, sole injection point requiring a
fix.** No other function in this file needs modification.

## 3. Investigation B: Artwork background

### 3.1 Field storage and mapping — confirmed intact end-to-end

- `designs.artworkBackgroundHex` (`#rrggbb`, optional) — ADR-FP-109 ("per-design artwork
  backgrounds") and ADR-FP-114 ("AI analysis canvas uses design artwork background when set"),
  `docs/project/DECISIONS.md:967-982` and `:737-761`. Fallback is display grey `#e5e7eb`
  (`ARTWORK_BACKGROUND_PRESET_GREY`) when absent or invalid.
- Type: `apps/studio/src/renderer/src/features/designs/types/design.types.ts:24` — `Design.
  artworkBackgroundHex?: string`, present at the top level, not behind a nested/optional slim
  projection.
- Mapper: `apps/studio/src/renderer/src/features/designs/services/designService.ts:300-301`
  (`mapDesignDocument`) — copies the raw Firestore field through unchanged (`typeof
  data.artworkBackgroundHex === "string" ? data.artworkBackgroundHex : undefined`), used by
  `getDesignById` (`:707`), which is the exact function `useReadyDesignsForSelection.ts:49` calls per
  design ID.
- Hydration path used by the Print Requests page:
  `PrintRequestsPage.tsx` → `useReadyDesignsForSelection(selectedDesignIds)` → `designService.
  getDesignById` (full `Design` object, not a slim shape) → `designById` map (`PrintRequestsPage.
  tsx:513-516`) → passed as the `design` prop into `PrintRequestItemCard`
  (`PrintRequestsPage.tsx:1384`).

**Confirmed: the field is present, correctly typed, and correctly hydrated at every step up to and
including the `design` prop `PrintRequestItemCard` already receives.** Nothing upstream needs to
change.

### 3.2 Root cause (Defect B): CONFIRMED — a missing prop pass, not a missing field

**File:** `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx:400-409`

```tsx
<DesignThumbnailPanel
  alt={`${title} preview`}
  catalogPath={previewPath}
  className="print-requests-item-card-thumbnail"
  fallbackLabel="Preview unavailable"
  imageFit="contain"
  interactive={Boolean(previewUrl)}
  loadingLabel="Loading preview"
  onImageClick={() => setIsLightboxOpen(true)}
/>
```

`DesignThumbnailPanel` (`apps/studio/src/renderer/src/features/designs/components/
DesignThumbnailPanel.tsx:8-21,38,47-51`) **already accepts** an `artworkBackgroundHex?: string` prop,
already imports and calls the shared `resolveArtworkBackgroundHex` utility (which already provides
the exact required fallback behavior: malformed/absent → safe default grey, never a crash), and
already applies it via a CSS custom property (`--color-artwork-preview-bg`) consumed by existing
styling — this is precisely the "established correct Studio component" the task asks to reuse.
`PrintRequestItemCard.tsx` simply never passes `artworkBackgroundHex={design?.artworkBackgroundHex}`
in its call. This is confirmed by direct comparison against
`apps/studio/src/renderer/src/features/designs/components/DesignSelectionCard.tsx:44-46,133`, an
existing, already-correct sibling component that passes
`artworkBackgroundHex={design.artworkBackgroundHex}` to the same `DesignThumbnailPanel` for the same
purpose (the Design Library's request-selection picker).

**No change of any kind is required to:** `Design`'s type, `mapDesignDocument`, `getDesignById`,
`useReadyDesignsForSelection`, `DesignThumbnailPanel` itself, or
`resolveArtworkBackgroundHex`/`normalizeArtworkBackgroundHex`/`ARTWORK_BACKGROUND_PRESET_GREY`
(`packages/shared/src/constants/design/artworkBackground.constants.ts`, full file read) — all already
correct and already exercise the exact fallback behavior this task's acceptance criteria require.

### 3.3 Confirmed: customer-upload items are unaffected and correctly out of scope

`StudioCustomerUploadSummary` (`customerUploadReadService.ts:10-27`, confirmed) has no
`artworkBackgroundHex`-equivalent field — customer-upload artwork has never had this concept, so
`PrintRequestItemCard.tsx`'s `upload` branch (rendering when `item.customerUploadId` is set) legitimately
continues to render on the existing default background. This matches the task's explicit
scope note ("unless it already uses the same established field" — it doesn't) and requires no change.

## 4. Required Plan Decisions

1. **Authoritative collection for each visible tab list:** unchanged — the server-paginated,
   `queueTab`-filtered `listPrintRequestsPage` query (`printRequestQueryPlanning.ts`) remains the sole
   source for a tab's page. The only change is closing the one gap where a second, independent write
   path (`ensureRequestsLoaded`'s merge) could inject a mismatched-tab row into the same in-memory
   array that path also feeds.
2. **Direct selected-request state vs. list membership:** already correctly separated
   (`usePrintRequestDetails` vs. `usePrintRequests`, confirmed §2.3) — no architectural change
   required. The fix is scoped entirely to preventing `usePrintRequests`'s own `state.requests` from
   being contaminated by its own `ensureRequestsLoaded` path; it does not touch the relationship
   between the two hooks.
3. **Every place a `queueTab` membership guard must be applied:** exactly one —
   `ensureRequestsLoaded`'s merge into `state.requests` inside `usePrintRequests.ts`. Confirmed (§2.4)
   that `loadFirstPage`/`loadMore` (server-filtered), `insertCreatedRequestLocally` (already
   explicitly guarded), `patchRequestLocally`/`patchSummaryLocally` (existing-entry-only), and
   `reconcileDeletedOrArchivedRequest` (existing-entry-only) all require no change.
4. **Manual tab switching and the selected detail panel:** unchanged — this Plan does not alter
   `PrintRequestsPage.tsx`'s existing behavior of clearing `requestId` from the URL on a cross-tab
   click (`selectionStillInTab` logic, `PrintRequestsPage.tsx:963-972`, already correct and untouched
   by this Plan). The detail panel's own independent hydration via `usePrintRequestDetails` is
   unaffected by whichever tab is active.
5. **Refresh, back, forward navigation:** unaffected — `usePrintRequests`'s `useEffect`s already
   re-run `loadFirstPage` on `activeTab` change (covers back/forward through `useSearchParams`) and
   on explicit `reloadPrintRequests()` (covers Refresh); the fix only changes what
   `ensureRequestsLoaded` is permitted to merge, not any navigation/reload trigger.
6. **Local mutations moving a request between tabs without duplicate cards:** the recommended fix
   (§6) rejects a request whose `queueTab` disagrees with `activeTab` from being merged into
   `state.requests` at all, rather than moving it — since the correct tab's own hook instance will
   independently load it via its own paged query or its own `ensureRequestsLoaded` call when that
   tab becomes active. This mirrors the exact precedent already reviewed and approved for Show Queue
   (`mergeShowQueuePrintRequestSources`'s tab-vs-`queueTab` guard).
7. **Missing/invalid legacy `queueTab`:** the recommended fix admits a request when `queueTab` is
   absent, matching the field's own documented fallback behavior and the identical precedent already
   approved for the Show Queue fix — this is not a broad query, it is a permissive default for the
   one legacy case where no better classification exists.
8. **Artwork background: absent during hydration or ignored during rendering?** Confirmed ignored
   during rendering (§3.2) — the field is present and correctly hydrated at every step; only the
   final render call omits the prop.
9. **Existing correct artwork-background rendering pattern to reuse:**
   `DesignThumbnailPanel`'s existing `artworkBackgroundHex` prop plus
   `resolveArtworkBackgroundHex`, exactly as already used by
   `DesignSelectionCard.tsx` (and `DesignCard.tsx`).
10. **Fallback behavior for missing/blank/malformed/unsupported background values:** already fully
    implemented and tested behavior of `resolveArtworkBackgroundHex`/`normalizeArtworkBackgroundHex`
    (`artworkBackground.constants.ts`, existing test file
    `artworkBackground.constants.test.ts` — not modified by this Plan) — passing
    `design?.artworkBackgroundHex` straight through (as `DesignSelectionCard.tsx` already does)
    inherits this fallback automatically; no new fallback logic needs to be written.
11. **Both defects are Studio renderer/service concerns requiring no production Firebase change:**
    confirmed. Defect A is entirely client-side React state management inside
    `usePrintRequests.ts`. Defect B is entirely a missing prop in a Studio renderer component. Neither
    touches Firestore Rules, indexes, Cloud Functions, document schema, or any Storage object.

## 5. In scope for implementation (once approved)

- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` — add a
  `queueTab`-vs-`activeTab` admission guard to the merge performed inside `ensureRequestsLoaded`
  (either by extending `mergePrintRequestsById`'s signature to accept the active tab and filter
  accordingly, or by filtering `found` before the existing `mergePrintRequestsById` call — exact
  shape to be finalized during implementation, consistent with keeping `mergePrintRequestsById` a
  pure, directly-testable function per the existing pattern).
- A new or extended test file for `usePrintRequests.ts`'s merge logic (no test file currently exists
  for this hook; `mergePrintRequestsById` is already exported specifically to be unit-testable,
  following the same convention as `reconcileDeletedOrArchivedRequest.ts`'s own test file).
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` — add
  `artworkBackgroundHex={design?.artworkBackgroundHex}` to the existing `<DesignThumbnailPanel ... />`
  call, matching `DesignSelectionCard.tsx`'s established pattern exactly.
- Given this repository has no React component test infrastructure anywhere (confirmed: no
  `.test.tsx` files, no `@testing-library/react`/`jsdom` dependency in any `package.json`), Defect B's
  regression coverage cannot be a rendered-component test. The Test phase must instead add a small,
  focused unit test asserting the specific prop value `PrintRequestItemCard` would pass to
  `DesignThumbnailPanel` for a given `design` input — likely by extracting the current inline
  `design?.artworkBackgroundHex` expression into a tiny, named, directly-testable helper (e.g.
  colocated in `PrintRequestItemCard.tsx` or a new small utils file under
  `print-requests/utils/`), rather than attempting to introduce component-rendering test
  infrastructure into the repository as a side effect of this narrow bug fix.

## 6. Recommended fix shape (for the Formal Review and eventual Implementation, not applied in this Plan)

**Defect A:** extend `mergePrintRequestsById`'s signature to `(current, additions, activeTab)` and
skip an addition whose `queueTab` is present and disagrees with `activeTab` — mirroring
`mergeShowQueuePrintRequestSources`'s already-reviewed-and-approved guard
(`if (request.queueTab && request.queueTab !== activeTab) { continue; }`), admitting a `queueTab`-less
request unconditionally (legacy fallback). Update the one call site in `ensureRequestsLoaded` to pass
`activeTab`. This keeps `mergePrintRequestsById` a pure, directly unit-testable function, consistent
with the existing `reconcileDeletedOrArchivedRequest.ts` pattern in the same directory.

**Defect B:** add the single prop `artworkBackgroundHex={design?.artworkBackgroundHex}` to
`PrintRequestItemCard.tsx`'s existing `<DesignThumbnailPanel ... />` call. No other line in that
component needs to change — `previewPath`, `imageFit`, DPI badge, quantity, and lightbox wiring are
all already correct and must remain untouched.

## 7. Explicitly out of scope

- `usePrintRequestAllocationTotals`'s pre-existing full-collection scan — a separate, previously
  documented (PR #37's Implementation Review) architecture follow-up, not silently expanded into this
  remediation.
- `queueTab` maintenance triggers (`functions/src/onPrintRequestQueueTabInputsWritten.ts`) — untouched,
  not implicated by either defect.
- Firestore Rules, indexes, or any Cloud Function.
- Any Portal file — Portal already correctly displays the design's `artworkBackgroundHex`
  (per the owner's own reproduction, Portal is the reference-correct rendering); this Plan does not
  touch Portal.
- The catalog design schema, or copying `artworkBackgroundHex` onto `PrintRequestItem` documents —
  investigation confirmed the field is already correctly reachable via the existing design-hydration
  path; no snapshot/copy is needed or proposed.
- Any image, transparency, derivative, or Storage object change.
- DPI/size calculation changes.
- Show Queue capacity/allocation behavior — already fixed correctly in PR #37, untouched here.
- Publishing the `v1.0.0` draft Release or building another stable installer.
- Any unrelated Print Request UI polish.

## 8. Test Planning

**Repository test harness (confirmed via direct inspection, not assumed):** `node:test` run via
`npx tsx --test <file>` — no `npm test` script exists (per prior-session memory, reconfirmed by the
absence of a `test` script in `apps/studio/package.json` and root `package.json`). No React
component-rendering test infrastructure exists anywhere in this repository.

Planned test additions (to be written and run during the Test phase, not this Plan phase):

1. A new test file for `usePrintRequests.ts`'s exported `mergePrintRequestsById` (extended
   signature): a request with `queueTab: "queued"` is rejected when `activeTab` is `"working"`; the
   same request is admitted when `activeTab` is `"queued"`; a request with no `queueTab` is admitted
   regardless of `activeTab` (legacy fallback); all four `queueTab` values (`working`, `queued`,
   `printing`, `printed`) are exercised against a mismatched `activeTab` to confirm none can leak into
   another tab's array — directly satisfying the acceptance criteria's "Working, Queued, Printing,
   and Printed each reject requests belonging to another queueTab."
2. A focused reproduction test proving the exact pre-fix contamination scenario fails without the fix
   and passes with it — following the same before/after verification discipline used for the PR #37
   follow-up fix (physically confirmed failing against the old logic, passing against the new).
3. A small unit test for whatever prop-resolution helper Defect B's implementation extracts,
   asserting: a design with a saved `artworkBackgroundHex` produces that exact value; a design with no
   saved value or `undefined` design produces `undefined` (letting `DesignThumbnailPanel`'s own
   existing fallback apply, not duplicating that logic); a customer-upload item (no `design`) is
   unaffected.
4. Confirm no additional broad Firestore read is introduced — a source-level check (as already done in
   this Plan's investigation) that the fix touches only local array/object filtering, no new query.

**Commands (to be verified against package scripts before use in the Test phase, not assumed to
pass here):**

- Focused new/updated test files via `npx tsx --test <file>`
- Studio typecheck (`cd apps/studio && npx tsc --noEmit`, after generating the build-time
  `packagedBuildConfig.ts` per the existing documented workaround)
- `npm run build:studio` (per this task's instruction; note the existing `apps/studio/package.json`
  `build` script is `node scripts/generate-packaged-build-config.mjs && tsc && vite build &&
  electron-builder` — to be re-confirmed at the root `package.json` level during the Test phase before
  claiming a pass)
- `npm run lint`
- `git diff --check`

No command above has been run during this Plan phase; this Plan does not claim any test result.

## 9. Human Checkpoints

- Plan and independent Formal Review approval required before implementation (this pass).
- Owner manual QA required after implementation, repeating the exact reported Portal → Show Queue →
  Print Requests reproduction path (create/reuse `roasted_garlic-CR001`-equivalent request, add to
  the August 19 show, deep-link into Queued, manually click Working, confirm empty state; visually
  compare the Yellowstone item's artwork mat in Studio against Portal).
- Production PR merge requires separate approval (per the existing PR #37 precedent).
- A new stable Studio build requires its own separate release checkpoint.
- The existing `v1.0.0` draft Release remains unpublished until this remediation is verified and
  owner-approved — carried forward from the prior task, reaffirmed here since this is a second,
  independent defect found during smoke-testing the same draft.
- No production Firebase resource may be modified without separate explicit approval — not
  implicated by either defect's fix, per §4 item 11.
- **No new human checkpoint was discovered by this investigation** beyond what the task brief already
  listed — both defects are confirmed Studio-only, client-side fixes with no backend, schema, Rules,
  index, or migration implication.

## 10. Required Output (summary for this pass)

1. **Plan path:** `docs/workflow/plans/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-plan.md` (this file).
2. **Confirmed root causes, kept separate:**
   - Defect A: `usePrintRequests.ts`'s `ensureRequestsLoaded` merges a directly-fetched request into
     `state.requests` via `mergePrintRequestsById` with no `queueTab`-vs-`activeTab` check — a race
     between this async merge and a tab switch's `loadFirstPage` replace can leave a mismatched-tab
     request permanently in the array until the next full reload. Structurally identical to (but
     never covered by) the defect already fixed in `showQueuePrintRequestSources.ts` for Show Queue.
   - Defect B: `PrintRequestItemCard.tsx` never passes `artworkBackgroundHex` to its existing
     `<DesignThumbnailPanel>` call, even though the field is correctly hydrated all the way to the
     `design` prop it already receives, and the receiving component already fully supports it
     (matching the exact pattern `DesignSelectionCard.tsx` already uses correctly).
3. **Exact source and test files expected to change:**
   - `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`
   - A new test file for that hook's merge logic (path to be finalized in Implementation; likely
     `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.test.ts`)
   - `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
   - A new or colocated test file for Defect B's prop-resolution helper (exact path to be finalized in
     Implementation, dependent on whether the fix stays fully inline or extracts a small named
     helper)
4. **No application source code was modified** — confirmed via `git status --porcelain` (empty)
   immediately before writing this Plan and again immediately before writing the Formal Review.
5. **Formal Review path and verdict:** see companion document,
   `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-review.md`.
6. **New human checkpoint:** none beyond what the task brief already specified (§9).
7. **Exact approval phrase required to begin implementation:**
   `APPROVE STUDIO PRINT REQUEST WORKING-TAB CONTAINMENT AND ARTWORK BACKGROUND IMPLEMENTATION`

## Investigation reads performed for this Plan (complete list)

- `docs/project/DECISIONS.md` — ADR-FP-109, ADR-FP-114 (full sections read); ADR-FP-121 (already read
  in a prior session pass, re-confirmed unaffected)
- `docs/project/ROADMAP.md` (already read in full in a prior session pass this same day; re-confirmed
  no print-request tab-routing or artwork-background-specific entry beyond what DECISIONS.md and
  source already established)
- `docs/standards/CODING_STANDARDS.md` — Layer Responsibilities section (components/hooks/services
  boundaries)
- `docs/workflow/plans/2026-08-03-production-studio-print-request-deep-link-tab-integrity-plan.md`
  (already in context from the prior task this same session)
- `docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-review.md`
  (already in context)
- `docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-implementation-review.md`
  (already in context, both the initial and follow-up review passes)
- `.cursor/workflow/state.md` — too large to read in full (6235 lines, exceeds tool size limits, as
  previously noted); tail section and targeted greps for this task's slug confirmed no existing entry
  yet (expected, since this is a new task) and no conflicting in-flight state
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (full file,
  already read in the prior task this session; re-confirmed relevant sections)
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.ts` (full file)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` (full file)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts` (full file)
- `apps/studio/src/renderer/src/features/print-requests/utils/reconcileDeletedOrArchivedRequest.ts`
  (full file)
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` (targeted:
  `getPrintRequestsByIds`)
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts` (targeted:
  `queueTab` query-filter construction)
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` (full
  file)
- `apps/studio/src/renderer/src/features/print-requests/hooks/useReadyDesignsForSelection.ts` (full
  file)
- `apps/studio/src/renderer/src/features/designs/types/design.types.ts` (targeted:
  `artworkBackgroundHex` field and surrounding doc comment)
- `apps/studio/src/renderer/src/features/designs/services/designService.ts` (targeted:
  `mapDesignDocument`, `getDesignById`)
- `apps/studio/src/renderer/src/features/designs/components/DesignThumbnailPanel.tsx` (full file)
- `apps/studio/src/renderer/src/features/designs/components/DesignSelectionCard.tsx` (targeted:
  `artworkBackgroundHex` usage, confirmed as the correct reference pattern)
- `packages/shared/src/constants/design/artworkBackground.constants.ts` (full file)
- `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadReadService.ts`
  (targeted: `StudioCustomerUploadSummary` shape, confirmed no background-equivalent field)
- Recently-changed Show Queue files re-confirmed as not incorrectly reused as the fix location:
  `UpcomingShowsPage.tsx`, `useShowQueuePrintRequests.ts`, `showQueuePrintRequestSources.ts`,
  `showQueuePrintRequestSources.test.ts` (all already in context from the prior task this session;
  confirmed via `grep`/`git diff` this Plan's proposed changes touch none of them)
- Full repository search confirming no `.test.tsx` file or `@testing-library/react`/`jsdom` dependency
  exists anywhere (informs the Test Planning section's approach to Defect B's regression coverage)

## Confirmation

No application source code was modified during this Plan phase. Only this Plan document and its
companion Formal Review were created. Working tree confirmed clean via `git status --porcelain`
immediately before writing both documents.
