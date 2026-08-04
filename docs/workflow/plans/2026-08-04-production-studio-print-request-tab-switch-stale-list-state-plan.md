# Plan: Studio Print Request Tab-Switch Stale List State

Date: 2026-08-04
Branch: `fix/studio-print-request-tab-switch-stale-list-state` (created from `origin/production` at
`e1e83ae5db447f996490e2edab8578717a068d9a`, confirmed matching local `production` exactly before
branching)
Scope: **Plan phase only.** No application source code was modified to produce this document.
Implementation is out of scope until this Plan and its independent Formal Review are both approved
and the owner issues the approval phrase in §10.

## 0. Pre-flight verification

```
git status --porcelain                                                  -> (empty; clean)
git rev-parse production                                                 -> e1e83ae5db447f996490e2edab8578717a068d9a
git rev-parse origin/production                                          -> e1e83ae5db447f996490e2edab8578717a068d9a
git log -1 --format="%H %s" e1e83ae5db447f996490e2edab8578717a068d9a      -> "Merge PR #38: fix Studio request tab containment and artwork background"
```

Confirmed clean, confirmed local/remote parity, confirmed the named commit is genuinely the PR #38
merge on `production`. Branch created fresh via `git checkout -b
fix/studio-print-request-tab-switch-stale-list-state origin/production` — not reused from either
prior remediation branch, both of which are now merged and gone from active development.

## 1. Reported symptom (owner QA, dev environment, post-PR #37 and PR #38)

Owner confirms PR #37 (deep-link resolution) and PR #38 (Working-tab containment via
`ensureRequestsLoaded`'s `queueTab` guard, plus artwork background) both **PASS** for every scenario
already tested, including Refresh and route-remount recovery. One narrower reproduction remains:
manually clicking the Working tab immediately after Queued is loaded (no deep link, no direct-ID
fetch involved) still transiently shows the queued request under Working, with Working's exact count
already correctly reading `0`. Refresh or navigating away and back both correct it.

## 2. Root cause: CONFIRMED — not a merge-guard gap, a render-timing gap

This is a **structurally different defect** from both defects PR #38 fixed. PR #38's fix
(`mergePrintRequestsById`'s `queueTab` admission guard) only governs what `ensureRequestsLoaded`
merges into `state.requests` — it says nothing about `state.requests` more generally, and this
reproduction does not involve `ensureRequestsLoaded` at all: no deep link, no direct-ID fetch, no
`selectedRequestId` (confirmed below). The bug is in `usePrintRequests.ts`'s ordinary tab-driven
`loadFirstPage()` path, and in `PrintRequestsPage.tsx`'s render logic trusting that path to have
already updated by the time a new `activeTab` value is rendered.

### 2.1 Confirmed: clicking Working clears `selectedRequestId`, ruling out `ensureRequestsLoaded`

`apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx:952-973` (tab
button `onClick`): `selectionStillInTab` is `tab === activeListTab && ...` — `false` when clicking
Working while on Queued — so `commitPrintRequestsRoute` is called with `requestId: undefined`.
`getPrintRequestsPath` (`printRequestRoutes.ts:57-69`, unchanged, re-confirmed) omits the `requestId`
query param entirely when `undefined`. The URL genuinely loses `requestId` on this navigation, so
`selectedRequestIdParam` → `null` on the next render, and the
`useEffect(() => { if (selectedRequestId) { void ensureRequestLoaded(...) } }, [...])`
(`PrintRequestsPage.tsx:269-273`) does not re-fire for the queued request. **Confirmed: this
reproduction is independent of PR #38's fix and independent of `ensureRequestsLoaded` entirely.**

### 2.2 Confirmed: `usePrintRequests`'s internal state does not reset synchronously when `activeTab` changes

`apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` — `activeTab` is a
plain function argument, not a `key` forcing remount, and `usePrintRequestsPage.tsx`'s single call
site (`usePrintRequests(activeListTab)`, line 265) is one continuous hook instance across every tab
switch. The only mechanism that resets `state` for a new tab is:

```ts
const loadFirstPage = useCallback(async (options?) => { ... }, [activeTab, hydratePage, loadCounts, user]);

useEffect(() => {
  cursorRef.current = undefined;
  void loadFirstPage();
}, [loadFirstPage]);
```

`loadFirstPage`'s identity changes when `activeTab` changes (correctly), which re-triggers this
`useEffect` — but **effects run after React commits and paints the render that changed `activeTab`**,
and `loadFirstPage` is itself `async`: its very first `setState` call (the one that flips
`isLoading: true`) does not execute until the effect body actually runs, which is strictly after the
triggering render has already been painted. There is no synchronous reset of `state.requests` or
`state.isLoading` when `activeTab` changes — both remain exactly whatever they were for the
**previous** tab until the effect's async chain gets around to updating them.

### 2.3 Confirmed: the transitional render is genuinely visible, not merely computed

`PrintRequestsPage.tsx:887`: `const isLoading = isRequestsLoading || isReadyDesignsLoading;` gates
the rendered list (`:1032-1046`): a spinner shows only while `isLoading` is `true`; otherwise
`visibleRequests` renders directly. On the render where `activeListTab` first becomes `"working"`
but before `loadFirstPage`'s effect has run, `usePrintRequests("working")` still returns the **exact
same `state` object** it returned on the prior render for Queued — `isLoading: false`,
`requests: [queuedRequest]` — because nothing has reset it yet. React commits and paints this render
(there is no `Suspense` boundary, no synchronous state reset, nothing preventing the paint). The user
sees the Working tab highlighted, `isLoading` false, and the stale Queued request rendered as a card,
for a duration bounded only by how long it takes the browser to schedule the effect, `loadFirstPage`
to call `setState` for the first time, and React to re-render — typically sub-second but not
imperceptible, and directly reproducible on every manual tab click, consistent with the owner's
100%-reproducible report.

### 2.4 Confirmed: `countsByTab.working` is already correct throughout, explaining the exact-count-vs-stale-list mismatch

`usePrintRequests.ts:31,43,70-84,131,151`: `countsByTab` is a single map covering all four tabs,
populated by `loadCounts()` (parallel `getCountFromServer` queries for `COUNTABLE_TABS`, unchanged),
computed as part of the **same** `loadFirstPage()` call as the page fetch — but once computed for the
current session, it reflects the true database state for every tab, not just the active one, and
persists across tab switches since nothing resets it to a per-tab-unknown value on tab change. This
is why the owner observes "Working count is already `0`" simultaneously with a stale visible Working
card: `countsByTab.working` was already correct from an earlier load, while `state.requests` (the
tab-scoped list) has not yet caught up to the new `activeTab`. **These are two different pieces of
state within the same hook with two different staleness windows — `countsByTab` has none (once
loaded, it is globally accurate until the next explicit reload); `requests`/`isLoading` have exactly
the one-render (or longer, network-bound) window described above.**

### 2.5 Explicit classification (per the task's required distinction)

- **Not** "stale display during a legitimate short loading state" — during a legitimate loading
  state, `isLoading` is `true` and the spinner correctly masks the list; this defect is precisely the
  window *before* `isLoading` becomes `true`, where nothing masks the stale list at all.
- **Not** "skipped page reload" — `loadFirstPage()` unconditionally runs on every `activeTab` change
  (confirmed via the unconditional `useEffect` and the absence of any skip/cache-hit-return-early
  logic in `loadFirstPage` itself); the query is never skipped.
- **Not** "wrong cache-key reuse" — `loadPrintRequestsPageCached`'s cache key
  (`list:${activeTab}:page-1`, `printRequestsPageReadCache.ts`, re-confirmed unchanged) is correctly
  tab-scoped; a Working cache hit cannot return Queued data.
- **Confirmed: "state replacement occurring too late"** — `loadFirstPage`'s replacement of
  `state.requests` happens only after two full async round-trips (`loadCounts`/`listPrintRequestsPage`
  in `Promise.all`, then `hydratePage`), and even the *first* `setState` (flipping `isLoading: true`)
  is deferred past the triggering render's paint because it lives inside a `useEffect`'s async
  callback.
- **Confirmed: "missing render-time containment"** — `PrintRequestsPage.tsx`'s `activeTabRequests`
  (`:543-546`) filters only by `status !== "archived"`; it has never filtered by
  `request.queueTab === activeListTab` at render time. The page's own governing comment at
  `:538-542` ("`requests` already IS the current tab's bounded, server-filtered page... no
  client-side re-derivation/grouping across tabs is needed or possible anymore") states an invariant
  that is only true once `usePrintRequests`'s async reset has completed — it is false during the
  transitional render this Plan diagnoses. (This exact comment was independently flagged as
  confirmatory evidence, not the defect itself, during the prior PR #38 Formal Review — this Plan
  extends that observation to its actual consequence: the page never enforces the invariant it
  assumes.)

### 2.6 Why Refresh and route remount both correct it

- **Page-level Refresh** (`handleRefresh` → `reloadPrintRequests({ silent: true })`, unchanged):
  called while `activeTab` is already stable at `"working"` — there is no tab-change transition
  involved, so there is no window where stale data from a *different* tab could render. The refresh
  fully replaces `state.requests` with fresh Working data once it resolves; until then, the **already
  Working-scoped** (and by then, presumably still-stale-Queued, only if this reproduction were
  triggered without a refresh first — but in the reported sequence, the user is already looking at
  the stale card before clicking Refresh) `requests` array is what's shown, and after resolution it
  is replaced with the correct, freshly-queried, `queueTab`-filtered Working page.
- **Route remount** (navigating away and back): unmounting `PrintRequestsPage` destroys the
  `usePrintRequests` hook instance entirely; remounting creates a **brand-new** instance whose
  `state` starts at `initialState` (`isLoading: true`, `requests: []`) — the spinner shows correctly
  from the very first render, and there is no stale-tab window because there is no "previous tab's
  data" carried over into a fresh instance.

Both recovery paths work for the same underlying reason: neither involves the specific
`usePrintRequests(activeListTab)` **argument change without an instance reset** that this defect
requires.

## 3. Answers to the twelve required investigation checks

1. **Does `state.requests` still contain the previous tab's page immediately after `activeTab`
   changes?** Yes — confirmed in §2.2/§2.3; nothing resets it synchronously.
2. **Does `loadFirstPage("working")` replace the list only after an async query completes?** Yes —
   confirmed in §2.2; the replacement `setState` is the final statement in the `try` block, after two
   awaited async steps.
3. **Does the old list remain rendered while the new tab is loading?** Yes, for the render(s) before
   `isLoading` flips to `true` — confirmed in §2.3. Once `isLoading` is `true`, the spinner correctly
   masks it (this part already works).
4. **Is the Working query skipped because a loaded/cache flag incorrectly says the tab is current?**
   No — confirmed in §2.5; the query always runs, nothing is skipped.
5. **Do tab state and list state update in separate React commits?** Yes — `activeListTab` (derived
   from the URL via `useSearchParams()`) updates in the render triggered by `navigate()`; `requests`/
   `isLoading` (inside `usePrintRequests`) update in a later render triggered by the `useEffect`'s
   eventual `setState` call — these are necessarily separate commits, confirmed by React's effect
   timing model (effects always run after their triggering commit).
6. **Does the page render raw `state.requests` without a final `queueTab === activeTab` containment
   filter?** Yes — confirmed in §2.5; `activeTabRequests` only filters by `status`.
7. **Do the selected request and visible tab list still share storage unnecessarily?** No — confirmed
   unrelated to this reproduction in §2.1; `usePrintRequestDetails` (the detail panel's state) remains
   fully independent of `usePrintRequests`'s `state.requests`, unchanged by PR #38 and unaffected by
   this defect.
8. **Is the previous tab's page being reused as a temporary placeholder?** Effectively yes, though not
   intentionally — it is not reused *by design* as a placeholder; it is simply *not yet replaced*,
   which renders identically to a placeholder from the user's perspective but is not a deliberate
   loading-state mechanism.
9. **Does a failed, cancelled, deduplicated, or superseded request leave the old list intact?** Not
   applicable to this specific reproduction — no request fails/cancels here; the fetch succeeds
   normally, just after a visible delay during which nothing masks the stale data. (The `generation`
   guard already correctly handles genuinely superseded/cancelled async responses for a different
   scenario — rapid repeated switching, see item 11 — and remains correct/unmodified.)
10. **Why do Refresh and route remount correct the state?** Answered in full in §2.6.
11. **Can repeated rapid tab switching produce the same or worse stale-list behavior?** Yes, and
    potentially compounds: each click re-triggers `loadFirstPage` for a new `activeTab`, incrementing
    `requestGenerationRef`; the existing generation guard correctly ensures only the **last**
    triggered fetch's response is ever applied to `state` (confirmed via `if (generation !==
    requestGenerationRef.current) { return; }` at each await point) — so rapid switching cannot cause
    two competing fetches to race incorrectly against each other, but it does **not** shrink the
    transitional stale-list window; if anything, each click resets a fresh transitional window, so
    switching tabs faster than a page can load could keep the visible list "one tab behind" the
    highlighted tab indefinitely during continuous rapid clicking. This is the same root cause, not a
    separate one — the fix in §6 addresses both the single-switch and rapid-switch cases identically.
12. **Do Working, Queued, Printing, and Printed all have the same weakness?** Yes — `usePrintRequests`
    is fully generic over `PrintRequestListTab`; nothing in `loadFirstPage`, `activeTabRequests`, or
    the containment logic is Working-specific. The defect is reproducible switching into or out of any
    of the four tabs, in any direction.

## 4. Required Plan Decisions

1. **Should the visible list clear immediately when `activeTab` changes?** Recommended: yes, but via
   the state-timing fix in Decision 3/item 2 below (resetting `isLoading`/clearing tab-mismatched
   `requests` synchronously in response to the `activeTab` change), not via a separate, independent
   "clear on click" side effect in `PrintRequestsPage.tsx` — keeping the fix inside `usePrintRequests`
   preserves the existing layer boundary (the hook owns its own state machine; the page only
   consumes it) and avoids a second, parallel place that could drift out of sync with the hook's own
   logic.
2. **Should each tab maintain isolated cached page state?** Recommended: no new per-tab cache beyond
   what `printRequestsPageReadCache.ts` already provides (already correctly tab-keyed, already
   TTL-bounded, unaffected by this defect) — introducing a second, hook-level per-tab state cache
   would be a materially larger architecture change than this defect requires, and risks its own new
   staleness class. The existing single-`state` model is sufficient once the timing gap is closed.
3. **Should render-time filtering by authoritative `queueTab` exist as a final safety boundary?**
   Recommended: **yes**, as a defense-in-depth addition to `PrintRequestsPage.tsx`'s
   `activeTabRequests` — filtering out any request whose own `queueTab` disagrees with
   `activeListTab` (admitting a request with no `queueTab` unconditionally, matching the same
   legacy-fallback precedent already used in `mergePrintRequestsById` and
   `mergeShowQueuePrintRequestSources`). This does not, by itself, fix the root cause (the
   `isLoading` timing gap must still be closed — see Decision 4/8 below, since without it the page
   would render an *empty* list correctly but would still fail to show a loading spinner during the
   transitional window, which is itself confusing/incorrect UX, not merely a display of wrong data).
   Recommended as a **required second layer**, not a substitute for the primary fix, consistent with
   this remediation chain's established pattern of defense-in-depth (the same reasoning already
   applied across PR #37 and PR #38).
4. **What should appear while a new tab's page is loading?** Recommended: the existing loading
   spinner (`isLoading` → `<LoadingSpinner label="Loading print requests" />`) — already implemented,
   already correct once `isLoading` becomes `true` at the right time. Never the prior tab's cached
   results, and never a cross-tab result. The fix must make `isLoading` become `true` synchronously
   (or as close to synchronously as React allows) at the same moment `activeTab` changes, not
   asynchronously after the effect gets around to it.
5. **How does selected-request detail state remain available without entering the visible list?**
   Unchanged — already correctly independent per §2.1/item 7 above (`usePrintRequestDetails`). No
   Plan change proposed here.
6. **How are stale async responses ignored when their requested tab is no longer active?** Already
   correctly handled by the existing `requestGenerationRef` guard (confirmed in item 11) — no change
   needed to that mechanism itself. The fix in Decision 3/8 is about the *display* gap before any
   response (stale or fresh) arrives, not about which response wins once one does arrive.
7. **Are request-generation IDs, abort tokens, or tab keys needed?** The generation-ID mechanism
   already exists and already works correctly for its purpose (superseding stale responses). What is
   additionally needed is a way for `usePrintRequests` to know, **synchronously, on the same render
   where `activeTab` changes**, that its currently-held `state` no longer corresponds to the new
   `activeTab` — this is most directly achieved by comparing the incoming `activeTab` argument against
   a ref recording which tab the current `state` actually represents, and deriving `isLoading`
   (or a `requests` value) accordingly at render time rather than only via a subsequent effect. See §6
   for the concrete recommended shape.
8. **How does page-level Refresh differ from normal tab switching today?** Refresh
   (`reloadPrintRequests`) never changes `activeTab` — it always operates on the currently-stable tab,
   so it never exhibits this defect's transitional-render window (confirmed in §2.6). This asymmetry
   is exactly why Refresh "happens to work" today, and is not something the fix needs to preserve
   specially — once the transitional window itself is closed, Refresh's behavior is unaffected either
   way.
9. **How does route remount reset state today?** Fully — a fresh `usePrintRequests` instance always
   starts at `initialState` (`isLoading: true`, empty `requests`), confirmed in §2.6. Unaffected by
   this fix; remains the correct behavior for an actual remount.
10. **How does the fix preserve pagination and bounded read behavior?** The recommended fix (§6) does
    not alter `loadFirstPage`, `loadMore`, `printRequestQueryPlanning.ts`'s query construction, or any
    Firestore call — it only changes when/how the hook's already-correct data is exposed to the
    render tree during the tab-switch transition. No new read, no new listener, no changed query
    shape.

## 5. In scope for implementation (once approved)

- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` — close the
  render-timing gap so `isLoading` (and/or `requests`) correctly reflects "this state does not yet
  belong to the current `activeTab`" on the very render where `activeTab` changes, not only after the
  subsequent effect resolves.
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` —
  add a render-time `request.queueTab === activeListTab` (or absent) containment filter to
  `activeTabRequests` as the defense-in-depth second layer (Decision 3).
- New or extended focused tests for both the hook-level timing fix and the page-level containment
  filter — exact file paths to be finalized during Implementation, following this codebase's
  established convention of extracting pure, directly-testable logic into `utils/` files colocated
  with existing precedent (`mergePrintRequestsById.ts`, `reconcileDeletedOrArchivedRequest.ts`).

## 6. Recommended fix shape (for the Formal Review and eventual Implementation, not applied in this Plan)

Track which tab the hook's current `state` actually represents via a ref (e.g. `loadedTabRef`),
updated only inside `loadFirstPage`'s successful replacement (and the `!user`/permission-denied early
return, which also fully resets `state`). Derive an effective `isLoading` for consumers as
`state.isLoading || loadedTabRef.current !== activeTab` — true whenever the argument-level `activeTab`
has changed since the last completed load, **even before the effect has had a chance to run**, since
this comparison only depends on values already available synchronously during render (the `activeTab`
argument and the ref's current value), not on any new state or effect. This closes the timing gap
directly at its source without requiring `state.requests` to be eagerly cleared (avoiding an extra
render/flicker) and without needing a `key`-based remount (which would defeat the existing
across-tab-switch cache/generation infrastructure). Combined with the `PrintRequestsPage.tsx`
render-time containment filter (Decision 3), this provides both a primary fix (the list is masked by
a spinner for the exact correct duration) and a defense-in-depth guarantee (even if some future code
path reintroduced a timing gap, a mismatched-`queueTab` row could never render under the wrong tab
label).

This shape is offered as the Plan's recommendation for the Formal Review to evaluate — the Formal
Review may propose an equally-valid alternative (e.g. eagerly clearing `state.requests` synchronously
via a render-phase `useMemo`/derived-state pattern instead of a ref) as long as it satisfies the same
constraints: no new Firestore read, no new listener, no `key`-based remount, and no regression to the
existing `requestGenerationRef` stale-response guard.

## 7. Explicitly out of scope

- Deep-link resolution (`resolveShowQueuePrintRequestLinkTab`, PR #37) — already passing, untouched.
- Artwork background (`resolvePrintRequestItemArtworkBackground`, PR #38) — already passing,
  untouched.
- `usePrintRequestAllocationTotals`'s pre-existing full-collection scan — a separate, previously
  documented, still-unaddressed architecture follow-up, not silently expanded into this remediation.
- Show Queue's own merge logic (`showQueuePrintRequestSources.ts`, PR #37) — untouched.
- Any Firestore document, Rules, index, Cloud Function, or schema change.
- `queueTab` trigger/status semantics — untouched.
- Pagination size or exact-count query construction — untouched.
- Any real-time listener — none introduced.
- General Print Requests UI redesign — none proposed.
- The stable installer, GitHub Release, production Firebase, or domain cutover — none touched.

## 8. Acceptance criteria mapping (confirming feasibility, not yet implementing)

Every acceptance criterion in the task brief is achievable via the §6 recommended fix shape without
further architectural change:

- Immediate list correctness on tab click: achieved by the synchronous `loadedTabRef` comparison.
- Working count `0` matching an empty visible list: already true for the count; the fix makes the
  list correctly show empty during the same window instead of stale.
- No Refresh/navigation required: the fix removes the underlying timing gap those actions currently
  route around.
- No duplication across repeated switches: `mergePrintRequestsById`'s `Map`-keyed accumulator
  (PR #38, unchanged) and `loadFirstPage`'s full-replace behavior (unchanged) both remain
  duplicate-free; nothing in this fix changes how entries are merged, only when `isLoading` reports
  readiness.
- Rapid switching across all four tabs: covered by item 11's analysis — the existing generation guard
  already prevents an incorrect final state; the timing fix ensures every intermediate render during
  rapid switching is masked by a spinner rather than showing a foreign tab's data.
- Late async responses (both a tab's own late response and a late direct-ID fetch) cannot enter a
  mismatched list: the former is already handled by the generation guard (unchanged); the latter is
  already handled by PR #38's `mergePrintRequestsById` guard (unchanged) — this Plan adds a
  render-time filter as a third, independent layer, not a replacement for either.
- Exact counts, pagination/Load More, Refresh, route navigation, detail panel behavior, and artwork
  background: all confirmed unaffected/unchanged by the recommended fix shape (§6), since it touches
  only `isLoading` derivation and one additional render-time filter predicate.

## 9. Test Planning

**Repository test harness (re-confirmed, not assumed):** `node:test` via `npx tsx --test <file>` — no
`npm test` script exists at either the root or `apps/studio` `package.json`. No React
component-rendering test infrastructure exists anywhere in this repository (re-confirmed via `find`
for `.test.tsx` files and `grep` for `@testing-library/react`/`jsdom` across every `package.json` —
both previously established in the PR #38 Plan/Review and re-checked as still true for this pass).

Planned test additions (to be written and run during the Test phase, not this Plan phase):

1. A new test for the extracted `isLoading`-derivation logic (e.g. a small pure function taking
   `state.isLoading`, `loadedTabRef`'s current value, and the live `activeTab`, returning the
   effective loading boolean) — covering: Queued loaded then `activeTab` changes to Working before
   Working resolves (effective loading must be `true`); Working's own genuine loading state (already
   `state.isLoading: true`) remains `true`; once `loadedTabRal.current === activeTab` and
   `state.isLoading` is `false`, effective loading is correctly `false`.
2. A focused test proving a stale Queued response resolving after Working became active cannot mark
   the effective state as loaded for Working (extending the existing generation-guard test coverage
   conceptually, verified against the new derivation function specifically).
3. Extension of `activeTabRequests`'s equivalent logic (if extracted into a testable helper, following
   the `mergePrintRequestsById`/`resolvePrintRequestItemArtworkBackground` precedent) to cover: a
   `queueTab`-matching request is kept; a mismatched one is rejected; an absent `queueTab` is kept
   (legacy fallback) — mirroring the exact test shape already used and already reviewed for
   `mergePrintRequestsById.test.ts`.
4. Rapid-switching simulation at the pure-function level: repeated calls simulating out-of-order
   resolution across all four tabs, confirming the derivation never reports "loaded" for a tab whose
   most recent request has not yet completed.
5. Re-run of all existing PR #37/PR #38 focused tests
   (`mergePrintRequestsById.test.ts`, `resolvePrintRequestItemArtworkBackground.test.ts`,
   `reconcileDeletedOrArchivedRequest.test.ts`, `printRequestRoutes.test.ts`) to confirm no
   regression.

**Commands (to be verified against package scripts before use in the Test phase, not assumed to pass
here):**

- Focused new/updated test files via `npx tsx --test <file>`
- Studio typecheck (`cd apps/studio && npx tsc --noEmit`, after generating the build-time
  `packagedBuildConfig.ts` per the existing documented workaround)
- Studio production build (`tsc && vite build` for renderer/main/preload — the non-packaging portion
  of `apps/studio`'s `build` script, matching the precedent already used and disclosed in PR #38's Test
  Report)
- `npm run lint`
- `git diff --check`

No command above has been run during this Plan phase; this Plan does not claim any test result.

## 10. Human Checkpoints

- Plan and independent Formal Review approval required before implementation (this pass).
- Owner manual QA required after implementation, repeating the exact reported reproduction: open the
  attached queued request from Show Queue, confirm Queued opens automatically, click Working, confirm
  the list is immediately correct with no stale card and no Refresh/navigation needed.
- Push and production PR require separate approval (per the PR #37/PR #38 precedent).
- Production merge requires separate approval.
- A new stable Studio build and GitHub Release publication remain separately gated.
- The existing `v1.0.0` draft Release remains unpublished until this remediation is verified and
  owner-approved.
- **No new human checkpoint was discovered by this investigation** beyond what the task brief already
  listed — the confirmed root cause is a client-side React state-timing gap with no backend, schema,
  Rules, index, or migration implication.

## 11. Required Output (summary for this pass)

1. **Plan path:** `docs/workflow/plans/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-plan.md` (this file).
2. **Confirmed root cause:** `usePrintRequests.ts`'s tab-driven `loadFirstPage()` reset is entirely
   asynchronous (triggered by a `useEffect` that runs only after the render where `activeTab` changed
   has already committed and painted), so there is a genuine, user-visible transitional render where
   the hook still returns the **previous** tab's `requests` and `isLoading: false`, under the
   **new** `activeTab`'s label — because nothing in the hook or the page synchronously signals "this
   state is stale for the tab now being requested." `PrintRequestsPage.tsx` compounds this by never
   applying a render-time `queueTab === activeListTab` containment filter, fully trusting the hook's
   internal state to already be tab-pure at all times (an invariant that is false during exactly this
   window). This is a distinct defect from both PR #37 (deep-link tab resolution) and PR #38
   (`ensureRequestsLoaded`'s merge-time `queueTab` guard) — neither of those code paths is involved in
   this reproduction.
3. **Why Refresh and route remount correct it:** Refresh never changes `activeTab`, so it never
   triggers the transitional window this defect requires; it operates on an already-stable tab and
   simply replaces `state.requests` once its own fetch resolves. Route remount destroys and recreates
   the `usePrintRequests` hook instance entirely, so there is no "previous tab's data" to display
   stale — a fresh instance starts at `initialState` with `isLoading: true` from its very first
   render.
4. **Exact source and test files expected to change:**
   - `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`
   - `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
   - New test file(s) for the extracted timing-derivation and/or containment-filter logic (exact
     path(s) to be finalized in Implementation, following the established
     `utils/`-extraction convention)
5. **No application source code was modified** — confirmed via `git status --porcelain` (empty)
   immediately before writing this Plan and again immediately before writing the Formal Review.
6. **Formal Review path and verdict:** see companion document,
   `docs/workflow/reviews/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-review.md`.
7. **New human checkpoint:** none beyond what the task brief already specified (§10).
8. **Exact approval phrase required to begin implementation:**
   `APPROVE STUDIO PRINT REQUEST TAB-SWITCH STALE LIST STATE IMPLEMENTATION`

## Investigation reads performed for this Plan (complete list)

- `.cursor/workflow/state.md` — tail section re-read; too large to read in full (confirmed again this
  pass); no conflicting in-flight state found, no existing entry for this remediation slug (expected).
- `docs/project/ROADMAP.md` (already read in full earlier this session; not re-read in full this
  pass — no new print-request tab-timing-specific entry expected or found via targeted grep).
- `docs/architecture/ARCHITECTURE.md`, `docs/standards/CODING_STANDARDS.md` (Layer Responsibilities
  section already read in full earlier this session; re-confirmed this fix stays within the
  Hooks/Components layers with no Firebase-call changes, consistent with those standards).
- `docs/standards/DEPLOYMENT.md` (already read in full in a prior session pass; no
  deployment-relevant content applies to this client-side-only fix).
- `docs/project/DECISIONS.md` (ADR-FP-109, ADR-FP-114, ADR-FP-121 already read in full earlier this
  session; re-confirmed no additional ADR governs tab-switch render timing specifically).
- `docs/workflow/plans/2026-08-03-production-studio-print-request-deep-link-tab-integrity-plan.md`
  (already in context from earlier this session).
- `docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-implementation-review.md`
  (already in context).
- `docs/workflow/plans/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-plan.md`
  (already in context).
- `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-implementation-review.md`
  (already in context).
- `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-test-report.md`
  (already in context).
- `references/project-chatgpt-handoff/12-decisions-and-constraints.md` (read in full this pass — 85
  lines; no tab-switch-specific decision found; confirms the general platform/layer constraints this
  Plan already respects).
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (targeted
  re-reads this pass: lines 199-273, 213-245, 538-597, 950-985, 1030-1088 — the tab-button handler,
  route-commit logic, list-derivation chain, and render block; full file already read in earlier
  session passes).
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` (re-read in full
  this pass, confirmed identical to the PR #38 post-merge committed state via `git diff` against
  `e1e83ae5db447f996490e2edab8578717a068d9a`).
- `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.ts` (re-read in
  full this pass — `getPrintRequestsPath`, `shouldReplacePrintRequestsPath`,
  `resolveCanonicalPrintRequestsRoute`).
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestsPageReadCache.ts`
  (already read in full earlier this session; re-confirmed unaffected).
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts` (already
  read in full earlier this session; re-confirmed still independent and unaffected).
- `apps/studio/src/renderer/src/features/print-requests/utils/mergePrintRequestsById.ts` and its test
  file (already read in full earlier this session as part of implementing PR #38; re-confirmed this
  defect does not involve this code path, per §2.1).

## Confirmation

No application source code was modified during this Plan phase. Only this Plan document and its
companion Formal Review will be created. Working tree confirmed clean via `git status --porcelain`
immediately before writing this Plan.
