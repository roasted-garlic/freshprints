# Owner QA Amendment 7 — AI queue observer resubscription loop (Plan)

**Branch:** `fix/post-launch-catalog-and-processing-stability` (existing, no new branch/PR, no merge)
**Updates:** PR #40

## Confirmed root cause (source-traced, matches the owner's trace exactly)

`useAiReviewInbox.ts`'s background-queue observer subscription effect
([useAiReviewInbox.ts:433-511](../../../apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts#L433-L511))
has dependency array:

```ts
}, [applyDesignPatch, designs, filters.tab, options, reloadDesigns, selectedDesignId]);
```

Two of these six dependencies change identity on *every* render, not just on a real
mount/tab-switch edge:

1. **`options`** — the caller (`AiReviewPage.tsx:64-68`) passes a brand-new object literal
   (containing a brand-new `onQueueChanged: () => void tabCounts.reloadCounts()` arrow function)
   on every render of `AiReviewPage`. `useAiReviewInbox` never destructures/memoizes this before
   using it in a dependency array, so any render of the *parent* forces this effect's identity to
   change even if nothing the hook itself controls changed.
2. **`designs`** — a `useMemo` derived from `rawDesigns` (`useAiReviewInbox.ts:127-157`), and
   `rawDesigns` is a new array reference from `useDesigns` every time its internal `setState`
   fires (on every `loadDesigns` resolution *and* every `applyDesignPatch` call). Since the
   observer's own patch handler calls `applyDesignPatch` synchronously
   (`useAiReviewInbox.ts:488`), **the observer's own successful reconciliation is what changes its
   own dependency**, guaranteeing the effect tears down and re-runs immediately after handling the
   very event it just handled.

`applyDesignPatch` and `reloadDesigns` (from `useDesigns.ts:227,246`) are already correctly
`useCallback`-stable given their own dependency arrays — they are not part of the loop.

### Confirmed feedback sequence

1. Effect subscribes (`observer.subscribed`), closing over the current `designs`/`selectedDesignId`.
2. Background pump completes a design; the closed-over observer fires, reconciles via
   `reconcileBackgroundAiQueueEvent`, and calls `applyDesignPatch`.
3. `applyDesignPatch` triggers `useDesigns`' `setState`, producing a new `rawDesigns` reference →
   new `designs` memo reference.
4. React re-renders `AiReviewPage`, producing a new `options` object literal.
5. Both changes fire the observer effect's cleanup (unsubscribe) and re-run (resubscribe), emitting
   `observer.subscribed` again and re-registering a *new* closure over the just-updated `designs`.
6. Because `subscribeToBackgroundAiQueue`'s `observers` is a plain `Set`
   (`importAiBackgroundQueue.ts:57`), there is a brief window where the old and new observer could
   both be registered, and every subsequent pump event re-triggers the same cycle for the next
   design — matching the trace's back-to-back `load.accepted → load.start → observer.subscribed`
   pattern and the ~344→584 request-ID climb in 5.5s.
7. Separately, `useDesigns` request IDs also climb because `useAiReviewInbox.ts:403-414`'s
   `liveDesign`-subscription-triggered `reloadDesigns()` and the mount reconciliation effect both
   call the *same* `reloadDesigns`, and — critically — **this loop is not actually a `reloadDesigns`
   storm at all**: `reloadDesigns` is called only where it always was (observer fallback, live-design
   backend-completion, mount-once). The request-ID climb the owner saw is dominated by
   resubscription noise inflating the trace buffer with `observer.subscribed`/`render.derived_state`
   events between real loads, not a genuine `useDesigns` reload-per-render bug. (Confirmed: no new
   `void reloadDesigns()` call site exists anywhere in the successful-patch branch —
   `useAiReviewInbox.ts:465-497` returns immediately after `applyDesignPatch` +
   `options?.onQueueChanged?.()`, never reaching the fallback `reloadDesigns()` at line 508.)
   **Correction from independent review:** `options?.onQueueChanged?.()` is called only from
   inside the observer's per-event callback (lines 489 and 509) — never from the subscribe/
   unsubscribe effect body itself — so resubscription churn does NOT multiply `reloadCounts()` call
   volume; each real pump event still triggers exactly one `onQueueChanged()` call regardless of how
   many times the effect happened to resubscribe in between. The genuine, substantiated cost of the
   resubscription churn is: (a) effect teardown/setup overhead on every state replacement, and
   (b) trace-buffer volume (`observer.subscribed` re-emitted on every replacement instead of once
   per activation), not an inflated `reloadCounts()`/Firestore-read count. The fix's value is
   removing (a) and (b); it does not additionally reduce `onQueueChanged` frequency, which was
   already correctly bounded to one call per real terminal event.

Also confirmed: Amendment 5's mount/tab-switch-only reconciliation effect
(`useAiReviewInbox.ts:525-549`) is correctly gated — its dependency array is `[filters.tab]` only,
with an explicit `eslint-disable` comment, and it is **not** implicated in the loop. It runs only on
a genuine tab-activation edge, not on every render.

## Correction

1. **Stabilize `options` at the call site inside the hook.** Introduce `optionsRef`, assigned
   directly in the hook body during render — `optionsRef.current = options;` as a plain statement,
   not inside a `useEffect` — mirroring the existing `listQueryKeyRef.current = listQueryKey`
   (`useDesigns.ts:76`) and `designsMirrorRef.current = state.designs` (`useDesigns.ts:71`)
   pattern already used in this codebase for exactly this purpose (never `useAiProcessingQueue`'s
   variant, which updates its `designsRef` inside a `useEffect` — that variant is not safe enough
   here since a synchronous read within the same render/microtask must never observe a stale
   value). Effects that need to call `options?.onQueueChanged?.()` read
   `optionsRef.current?.onQueueChanged?.()` instead, so no effect needs `options` in its
   dependency array at all.

2. **Remove `designs` and `selectedDesignId` from the observer subscription effect's dependency
   array**, and read both from refs inside the observer callback instead
   (`designsRef`/`selectedDesignIdRef`, each assigned directly in the hook body during render —
   `designsRef.current = designs;` / `selectedDesignIdRef.current = selectedDesignId;` — same
   render-time-assignment rule as `optionsRef` above, mirroring the existing `designsMirrorRef`
   pattern already used in `useDesigns.ts` for exactly this purpose). The subscription effect's
   only remaining dependency is `filters.tab` (plus the now-stable `applyDesignPatch`/
   `reloadDesigns`), so it subscribes once per Processing-tab mount/activation edge, never per
   state update.

3. Keep `subscribeToBackgroundAiQueue`'s single-`Set` semantics unchanged (out of scope — background
   queue behavior must not change) — the fix is entirely about *how often* this hook subscribes,
   not the queue's own subscription primitive.

4. No change to `reconcileBackgroundAiQueueEvent`, `applyDesignPatch`'s reconciliation semantics, or
   the Amendment 5 timeout override — all preserved verbatim.

5. Trace noise: `observer.subscribed` already only fires once per effect run (not per render) — once
   the resubscription bug is fixed, this event naturally drops from "near every state replacement"
   to "once per tab activation," which is most of the required trace-cleanup win. Additionally,
   coalesce `render.derived_state` further is unnecessary — it is already signature-gated
   (`useAiReviewInbox.ts:261-264`) and only fires on genuine derived-state change; no further change
   needed there. No new debounce/timer introduced.

## Explicit non-goals (per task)

No polling, no full designs listener, no per-design listener, no concurrency change, no backend
change. `reloadDesigns` remains for genuine failure/live-design-backend-completion paths only,
unchanged in when it's called — only the *cause* of spurious resubscription is removed.

## Required tests

This repository has no `@testing-library/react`/`renderHook`/jsdom test runner configured (verified:
zero existing usages anywhere in `apps/studio`) — every existing test in this managed goal's history
follows a pure-function-extraction + source-grep-assertion convention instead (e.g.
`derivePrintRequestsListLoading.test.ts`, `backgroundAiQueueReconciliation.test.ts`, and this
Amendment's own §22 IPC transport tests). This fix follows the same convention:

1. **Extract the reconciliation decision as a pure, directly-testable unit.** Reuse the existing
   `reconcileBackgroundAiQueueEvent` (already pure, already tested) unchanged — it already proves
   items 6-11 (patch-vs-fallback decision, advance-index computation) at the unit level. No new
   pure-logic extraction is needed here since the bug is entirely in effect *wiring* (dependency
   identity), not in reconciliation *decisions*.
2. **New test file** `useAiReviewInbox.observerSubscription.test.ts` — source-grep assertions
   proving the wiring fix directly against the shipped file (the same technique already used for
   the Amendment 6 follow-up's cross-window proof):
   - The background-queue observer subscription effect's dependency array does not contain
     `designs`, `selectedDesignId`, or `options` (regex against the effect's own `}, [...]);` line).
   - The same effect's dependency array does contain `filters.tab` and the two stable `useDesigns`
     callbacks.
   - The observer callback body reads `designsRef.current`/`selectedDesignIdRef.current` (not the
     bare `designs`/`selectedDesignId` closure variables) when computing the reconciliation.
   - `optionsRef.current?.onQueueChanged?.()` is used inside the effect instead of
     `options?.onQueueChanged?.()`.
   - `designsRef`/`selectedDesignIdRef`/`optionsRef` are each updated unconditionally on every
     render (assignment outside any effect/condition), so they never go stale.
   - The mount/tab-switch-only reconciliation effect (Amendment 5) is confirmed unchanged
     (dependency array still exactly `[filters.tab]`) — proving this fix did not touch it.
   - `reconcileBackgroundAiQueueEvent`, `applyDesignPatch`'s own semantics, and the Amendment 5
     200-second callable timeout constant are all confirmed byte-identical via `git diff` showing no
     hunks in `backgroundAiQueueReconciliation.ts`, `useDesigns.ts`'s patch logic, or
     `aiEnrichmentCallableErrorMessage.ts`.
3. **Existing `backgroundAiQueueReconciliation.test.ts`** (17 tests) already proves the
   `3 → 2 → 1 → 0` count sequence and `A → B → C → none` selection-advance logic at the pure-function
   level (patch decision + pendingAdvanceIndex for each of three sequential completions) — rerun
   unmodified to confirm zero regression from this wiring change.
4. **Trace-noise proof**: a source-grep assertion that `observer.subscribed` is only emitted once
   per effect body (already true, unchanged) combined with the dependency-array assertions above is
   the proof that it now fires once per tab activation rather than once per state replacement — no
   new trace-shape test is needed beyond confirming the dependency array itself, since the emission
   site was never the bug.

## Verification

Focused hook/queue tests, Studio typecheck, Studio 3-target build, `npm run lint`, `git diff --check`.
No Firebase/Functions/Rules/index/IAM/migration/secret/production action.

## Files expected to change

- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` (stabilize observer
  effect dependencies via refs)
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.observerSubscription.test.ts` (new)
- Docs: Test Report §23, Implementation Review addendum, `state.md`, `CURRENT-STATE.md`
