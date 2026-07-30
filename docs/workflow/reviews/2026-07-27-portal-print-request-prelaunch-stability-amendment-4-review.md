# Portal Print Request Pre-Launch Stability — Amendment 4 (Section 22) Formal Review

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent context, focused on Section 22 only)
- **Scope:** Plan Section 22 (Amendment 4) — Fix 1 revised (22.1/22.2), Fix 2 disposition (22.3), Fix 3
  extended (22.4/22.5). Did not defer to any of the four prior Implementation Reviews on this goal,
  each of which was subsequently proven incomplete by live owner QA.

---

## 1. Verdict

**`approved_with_changes`**

---

## 2. Item-card typed over-cap (22.1/22.2)

**CONFIRMED**, both mechanisms, via independent line-level re-derivation against current source.

**Second-channel timing hazard:** confirmed exact — `useWorkingCurrentRequestItems.ts:272-277`
(`patchWorkingItems` never touches any timestamp field), `usePrintRequestDetail.ts:213-265` (cart-sync
effect unconditionally rebuilds `items` on every `workingItems` change), `usePrintRequestDetail.ts:319-327`
(clamp bypass), `PrintRequestDetailView.tsx:477-528` (cards render from the hook's own `items`, not
`workingItems` directly), `itemPropSyncGuard.ts:47` (the `>=` comparison). All citations verified
accurate.

**Re-entrancy hazard (the more serious, durable-defect-producing mechanism) — CONFIRMED:**
`PortalPrintRequestItemCard.tsx:338-421`'s `saveDraft`: `saveInFlightRef`/`saveQueuedRef` are booleans
only, never a queued value. Line 386, `currentQuantityInput: quantityInput`, closes over the state value
captured when this specific `saveDraft` invocation was created (a `useCallback` dependency, line 421),
not a live ref. `resolveSavedDraftReconciliation` and the subsequent `setQuantityInput` (lines 389-391)
are both blind to any newer edit issued since this invocation started, and unconditionally overwrite it.
Confirmed this can produce a **durable**, not merely transient, stuck value: if the user's actual final
keystroke sequence lands a value coincidentally at the moment a superseded save's completion overwrites
`quantityInput`, no further save is in flight or queued to correct it.

**Test-coverage gap — CONFIRMED.** `usePrintRequestDetail.behavior.test.ts`'s `CardHarness` (lines
365-410) and `driveCardEdit` (417-431) are single-threaded — no code path in this file changes the
card's quantity input between dispatching a save and that save resolving. The cited
`usePrintRequestDetail.behavior.test.ts:462` assertion only proves an older-timestamped prop doesn't
regress an already-correct state; it does not model the re-entrancy race at all.

**Clamp-bypass reachability — CONFIRMED real and independently reachable, with one correction:**
`usePortalWorkingRequestLimitState.ts:65-82`/`90` confirmed: while `limit`/`isLimitReady` are being
(re)established, `isReady` is `false`, freezing the banner — consistent with the owner's "banner
doesn't update" observation. **Correction:** `subscribeToAuthState` (`authService.ts:232-233`) is backed
by Firebase's `onAuthStateChanged`, not `onIdTokenChanged` — a routine silent ID-token refresh is not
guaranteed to re-invoke this callback, so citing "token refresh" as the confirmed trigger overstates the
evidence. The defect itself remains real and sufficient to require the fix regardless: the
`limit === null` window is trivially reachable at ordinary mount timing (an edit fired before the limit
subscription's first emission arrives), independent of what specifically causes `firebaseUser`'s
reference to change. Implement/commit text must describe the reachability condition as "before the
limit subscription's first emission," not "on token refresh."

**22.2 remediation assessed as coherent, narrowly scoped**, does not touch
`clampItemQuantityToWorkingRequestMax` or any callable/transaction, and does not reintroduce anything
Amendments 1-3 fixed (`applyServerQuantityPatch`/`shouldApplyReloadedItems`/`itemPropSyncGuard.ts`'s own
comparison logic all remain untouched by the proposal).

---

## 3. Show Queue (22.4/22.5)

**CONFIRMED as a genuinely new, distinct gap** — not a regression of Fix 3, not previously covered.
`useShowAllocations.ts` (79 lines, read in full) confirmed still a real, live, ref-counted, per-show
`onSnapshot` subscription exactly as Amendment 3 shipped it — not disputed. `UpcomingShowsPage.tsx:421`
confirmed `useShowAllocations(selectedShowId)` supplies only the allocation list.
`UpcomingShowsPage.tsx:742-744` confirmed `capacity` is derived from `selectedShow.allocatedQuantity`.
`useUpcomingShows.ts` (57 lines, read in full) confirmed a pure one-shot `getDocs`-backed fetch with no
live listener anywhere. `upcomingShowService.ts:887` confirmed exact:
`allocatedQuantity: show.allocatedQuantity + requestedQuantity` written directly onto the
`upcomingShows/{upcomingShowId}` document when a Portal allocation is added. No existing subscription
anywhere in `UpcomingShowsPage.tsx` covers the selected show's own document.

**22.5 remediation assessed as sound**: `createSharedFirestoreSubscription.ts` is generic enough to wrap
a single-document `onSnapshot` exactly as it already wraps the per-show allocation query; scoping
restricted to `selectedShowId` only preserves the project's no-unbounded-read constraint; a
single-document `onSnapshot` requires no new Firestore index; patch-by-id-in-place avoids re-rendering
unrelated show cards.

---

## 4. Studio timer (22.3)

**CONFIRMED, no new discrepancy**, via direct read of `startShowPrinting`'s batch write
(`upcomingShowService.ts:959-1018`) against `upcomingShowRequiredFieldsValid`/
`showAllocationRequiredFieldsValid`/`showAllocationSourceIdentityUnchanged`
(`firestore.rules:634-696`, `710+`, `1003`, `1078-1091`, `1283-1295`). This is a legitimate fifth clean
pass with the same result as the prior four. The standing diagnosis (deployed Rules drift, or a live
document carrying an out-of-allowlist field) remains the only remaining explanation and is correctly
gated behind the owner's live comparison, not a further guessed Rules edit.

---

## 5. Blocking findings

None.

## 6. Non-blocking findings (resolved directly in the Plan)

1. Section 22.1's "on every `firebaseUser` reference change, e.g. a token refresh" overstates the
   confirmed trigger — corrected in Plan Section 22.1 to describe the reachability condition as
   occurring at ordinary mount/reconnect timing, before the limit subscription's first emission, without
   asserting "token refresh" as a demonstrated cause.
2. Section 22.1's citation grouping (`usePrintRequestDetail.ts:352-392` covering the generation-guard
   through the return statement, with the clamp computation itself separately and correctly cited at
   319-327 elsewhere in the same paragraph) is imprecise grouping, not a wrong citation — no Plan change
   required.

---

## 7. Answer to the required key question

**Does this close the owner's actual reported symptoms, or is it another plausible-but-incomplete
fix?** Better-founded than Amendments 1-3, but not risk-free, and the residual risk is qualitatively
different this time. Unlike the prior three amendments (each fixing a single, cleanly-isolated code
path, each disproven by a *different* live-only interaction its own tests didn't model), this amendment
explains why the exact same repro Amendment 3 already targeted still fails — and the re-entrancy
mechanism traced above produces a durable stuck-value outcome via an ordinary interaction pattern (two
edits close enough together to overlap a network round trip), not an exotic scenario. What remains
genuinely unverifiable from source alone: whether the owner's actual keystroke timing reliably falls
into the hazardous window (only live re-QA can confirm this); the Show Queue fix's real-world
cross-client listener latency under production network conditions; and the Studio timer, which remains
entirely gated on the owner's own live Rules comparison and is not touched by this pass at all.

**Recommendation:** Implement should proceed on Fix 1 (revised) and Fix 3 (extended) per the owner's
standing authorization for this reopened goal. Fix 2 remains gated behind the live Rules comparison.
The next Implementation Review must explicitly note that the required overlapping-save test passing is
necessary but not sufficient evidence of a full fix — live owner QA remains the actual closing gate on
this goal, exactly as it has been for every prior amendment.
